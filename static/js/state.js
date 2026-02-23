/* State Management - v2.0 with Database Sync */

// Import API functions from the single source of truth (Bug #8 fix)
import { 
    apiCall, 
    loadProfile as apiLoadProfile,
    saveProfileToServer,
    getQuizProgress,
    saveQuizProgressToServer,
    clearQuizProgressOnServer,
    getAllProgress,
    registerStateCallbacks
} from './services/api.js';

let state = {
    // Auth
    isAuthenticated: false,
    user: null,
    authMode: 'login',
    authError: null,
    
    // Views
    view: 'landing',
    
    // Library
    quizzes: [],
    searchQuery: '',
    sortBy: 'recent',
    categoryFilter: '',
    openMenuId: null,
    
    // Quiz taking
    currentQuiz: null,
    currentQuestionIndex: 0,
    answers: [],
    flaggedQuestions: new Set(),
    studyMode: true,
    randomizeOptions: false,
    optionShuffles: {},
    showAnswer: false,
    matchingShuffled: {},
    matchingSelectedLeft: null,
    timerEnabled: false,
    timerMinutes: 15,
    timeRemaining: 900,
    quizStartTime: null,
    questionStartTime: null,   // Timestamp when current question was shown
    questionTimes: {},         // {questionIndex: totalMs} per-question time tracking
    
    // Results
    quizResults: null,
    reviewFilter: 'all',
    
    // Create/Edit
    quizTitle: '',
    quizData: '',
    quizCategory: '',
    editingQuizId: null,
    visualEditorMode: false,
    parsedQuestions: null,
    currentEditQuestion: 0,
    showFormatHelp: false,
    
    // Profile stats (synced to server)
    dailyStreak: 0,
    lastActiveDate: null,
    totalAnswered: 0,
    totalCorrect: 0,
    quizzesCompleted: 0,
    
    // Sync status
    profileLoaded: false,
    syncPending: false,
    
    // Cached in-progress quizzes (Bug #1 fix - for synchronous access)
    inProgressQuizzes: [],
};

const listeners = [];

// Debounce timer for profile sync
let syncTimeout = null;

/**
 * Get current state with computed properties
 */
export function getState() {
    return {
        ...state,
        playerProfile: {
            dailyStreak: state.dailyStreak,
            totalAnswered: state.totalAnswered,
            totalCorrect: state.totalCorrect,
            quizzesCompleted: state.quizzesCompleted,
        }
    };
}

/**
 * Update state
 */
export function setState(newState, skipRender = false) {
    state = { ...state, ...newState };
    
    if (!skipRender) {
        listeners.forEach(fn => fn(getState()));
    }
}

export function subscribe(fn) {
    listeners.push(fn);
    return () => {
        const idx = listeners.indexOf(fn);
        if (idx > -1) listeners.splice(idx, 1);
    };
}

// ==================== AUTH ====================

export function loadAuth() {
    try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        // Check for valid data (not null, not "undefined" string, not empty)
        if (token && userStr && userStr !== 'undefined' && userStr !== 'null') {
            const user = JSON.parse(userStr);
            if (user && typeof user === 'object') {
                setState({ isAuthenticated: true, user, token, view: 'library' }, true);
                return true;
            }
        }
    } catch (e) {
        console.error('Failed to load auth from localStorage:', e);
    }
    
    // Clear any corrupted data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return false;
}

// saveAuth is no longer needed - api.js handles saving directly
// Keeping for backward compatibility but it's a no-op now
export function saveAuth(token, user) {
    // Auth is now saved directly in api.js login/register functions
    if (token && user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setState({ isAuthenticated: true, user, token });
    }
}

export function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setState({ isAuthenticated: false, user: null, token: null, view: 'landing', profileLoaded: false });
}

export function logout() {
    clearAuth();
}

// Register callbacks with api.js to avoid circular imports
registerStateCallbacks(setState, clearAuth);

// ==================== PROFILE (SERVER SYNC) ====================

/**
 * Load profile from server
 */
export async function loadProfile() {
    try {
        const data = await apiLoadProfile();
        if (data.profile) {
            const p = data.profile;
            setState({
                dailyStreak: p.daily_streak || 0,
                lastActiveDate: p.last_active_date || null,
                totalAnswered: p.total_answered || 0,
                totalCorrect: p.total_correct || 0,
                quizzesCompleted: p.quizzes_completed || 0,
                profileLoaded: true,
            }, true);
        }
        if (data.user) {
            setState({ user: data.user }, true);
        }
    } catch (e) {
        console.error('Failed to load profile from server:', e);
    }
}

/**
 * Save profile to server (debounced)
 */
export function saveProfile() {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
        try {
            const s = getState();
            await saveProfileToServer({
                daily_streak: s.dailyStreak,
                last_active_date: s.lastActiveDate,
                total_answered: s.totalAnswered,
                total_correct: s.totalCorrect,
                quizzes_completed: s.quizzesCompleted,
            });
        } catch (e) {
            console.error('Failed to sync profile to server:', e);
        }
    }, 1000);
}

// No-op stubs retained for call-site compatibility
export function loadSettings() {}
export function saveSettings() {}
export function getLevelInfo() { return { level: 1, xp: 0, progress: 0 }; }
export function getTierColor() { return '#9ca3af'; }
export function checkAchievements() {}
export function unlockAchievement() {}
export function getUnlockedAchievements() { return []; }

// ==================== QUIZ PROGRESS (SERVER SYNC) ====================

/**
 * Save quiz progress to server
 */
export async function saveQuizProgress() {
    const s = getState();
    if (!s.currentQuiz) return;
    
    const progressData = {
        question_index: s.currentQuestionIndex,
        answers: s.answers,
        flagged: Array.from(s.flaggedQuestions),
        study_mode: s.studyMode,
        randomize_options: s.randomizeOptions,
        option_shuffles: s.optionShuffles,
        timer_enabled: s.timerEnabled,
        time_remaining: s.timeRemaining,
    };
    
    try {
        await saveQuizProgressToServer(s.currentQuiz.id, progressData);
    } catch (e) {
        console.error('Failed to save progress to server:', e);
        // Fallback to localStorage
        localStorage.setItem(`quizmaster_progress_${s.currentQuiz.id}`, JSON.stringify({
            ...progressData,
            savedAt: Date.now(),
        }));
    }
}

/**
 * Load quiz progress from server
 */
export async function loadQuizProgress(quizId) {
    try {
        const data = await getQuizProgress(quizId);
        if (data.progress) {
            const p = data.progress;
            return {
                questionIndex: p.question_index,
                answers: p.answers || [],
                flagged: p.flagged || [],
                studyMode: p.study_mode,
                randomizeOptions: p.randomize_options,
                optionShuffles: p.option_shuffles || {},
                timerEnabled: p.timer_enabled,
                timeRemaining: p.time_remaining,
            };
        }
    } catch (e) {
        console.error('Failed to load progress from server:', e);
        // Fallback to localStorage
        try {
            const saved = localStorage.getItem(`quizmaster_progress_${quizId}`);
            if (saved) {
                const progress = JSON.parse(saved);
                if (Date.now() - progress.savedAt < 24 * 60 * 60 * 1000) {
                    return progress;
                }
            }
        } catch (e2) {
            console.error('Failed to load progress from localStorage:', e2);
        }
    }
    return null;
}

/**
 * Clear quiz progress on server
 */
export async function clearQuizProgress(quizId) {
    try {
        await clearQuizProgressOnServer(quizId);
    } catch (e) {
        console.error('Failed to clear progress on server:', e);
    }
    localStorage.removeItem(`quizmaster_progress_${quizId}`);
}

/**
 * Get all in-progress quizzes
 */
export async function getAllInProgressQuizzes() {
    try {
        const data = await getAllProgress();
        if (data.progress) {
            return data.progress.map(p => ({
                quizId: p.quiz_id,
                quizTitle: p.quiz_title,
                questionIndex: p.question_index,
                total: p.total_questions,
                answeredCount: (p.answers || []).filter(a => a !== undefined && a !== null).length,
            }));
        }
    } catch (e) {
        console.error('Failed to load all progress from server:', e);
    }
    
    // Fallback: check localStorage
    const s = getState();
    const inProgress = [];
    
    if (!s.quizzes || !Array.isArray(s.quizzes)) return inProgress;
    
    for (const quiz of s.quizzes) {
        try {
            const saved = localStorage.getItem(`quizmaster_progress_${quiz.id}`);
            if (saved) {
                const progress = JSON.parse(saved);
                if (Date.now() - progress.savedAt < 24 * 60 * 60 * 1000) {
                    inProgress.push({
                        quizId: quiz.id,
                        quizTitle: quiz.title,
                        questionIndex: progress.question_index || progress.questionIndex || 0,
                        total: quiz.questions?.length || 0,
                        answeredCount: (progress.answers || []).filter(a => a !== undefined).length,
                    });
                }
            }
        } catch (e) {
            // Skip corrupted progress data
        }
    }
    
    return inProgress;
}

/**
 * Load in-progress quizzes and cache them in state (Bug #1 fix)
 * Call this after loadQuizzes() in app init
 */
export async function loadInProgressQuizzes() {
    const progress = await getAllInProgressQuizzes();
    setState({ inProgressQuizzes: progress }, true);
    return progress;
}

/**
 * Get cached in-progress quizzes synchronously (Bug #1 fix)
 * Use this in renderLibrary() instead of getAllInProgressQuizzes()
 */
export function getInProgressQuizzesCached() {
    return getState().inProgressQuizzes || [];
}

// ==================== DAILY STREAK ====================

export function updateDailyStreak() {
    const s = getState();
    const today = new Date().toDateString();
    
    if (s.lastActiveDate === today) return;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    let newStreak = 1;
    if (s.lastActiveDate === yesterdayStr) {
        newStreak = s.dailyStreak + 1;
    }
    
    setState({
        dailyStreak: newStreak,
        lastActiveDate: today,
    }, true);
    
    saveProfile();
    checkAchievements();
}

// ==================== ANSWER RECORDING ====================

export function recordCorrectAnswer() {
    const s = getState();
    setState({
        totalAnswered: s.totalAnswered + 1,
        totalCorrect: s.totalCorrect + 1,
    }, true);
    saveProfile();
}

export function recordWrongAnswer() {
    const s = getState();
    setState({ totalAnswered: s.totalAnswered + 1 }, true);
}

export function recordQuizComplete(correct, total) {
    const s = getState();
    setState({ quizzesCompleted: s.quizzesCompleted + 1 }, true);
    saveProfile();
}