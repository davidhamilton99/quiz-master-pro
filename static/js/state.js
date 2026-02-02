/* State Management - Updated with skipRender support */

let state = {
    // Auth
    isAuthenticated: false,
    user: null,
    authMode: 'login',
    
    // Views
    view: 'login',
    
    // Library
    quizzes: [],
    searchQuery: '',
    sortBy: 'recent',
    filterCategory: '',
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
    quizStreak: 0,
    maxQuizStreak: 0,
    matchingShuffled: {},
    matchingSelectedLeft: null,
    timerEnabled: false,
    timerMinutes: 15,
    timeRemaining: 900,
    quizStartTime: null,
    
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
    
    // Gamification
    xp: 0,
    level: 1,
    gems: 0,
    dailyStreak: 0,
    lastActiveDate: null,
    achievements: [],
    pendingLevelUp: null,
    pendingAchievements: [],
    
    // Settings
    soundEnabled: true,
    animationsEnabled: true,
};

const listeners = [];

export function getState() {
    return state;
}

/**
 * Update state
 * @param {Object} newState - New state values to merge
 * @param {boolean} skipRender - If true, don't trigger re-render (for targeted DOM updates)
 */
export function setState(newState, skipRender = false) {
    state = { ...state, ...newState };
    
    // Only notify listeners (trigger render) if skipRender is false
    if (!skipRender) {
        listeners.forEach(fn => fn(state));
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
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
        setState({ isAuthenticated: true, user: JSON.parse(user), view: 'library' });
        return true;
    }
    return false;
}

export function saveAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setState({ isAuthenticated: true, user });
}

export function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setState({ isAuthenticated: false, user: null, view: 'login' });
}

// ==================== PROFILE/GAMIFICATION ====================

const PROFILE_KEY = 'quizmaster_profile';
const SETTINGS_KEY = 'quizmaster_settings';

export function loadProfile() {
    try {
        const saved = localStorage.getItem(PROFILE_KEY);
        if (saved) {
            const profile = JSON.parse(saved);
            setState({
                xp: profile.xp || 0,
                level: profile.level || 1,
                gems: profile.gems || 0,
                dailyStreak: profile.dailyStreak || 0,
                lastActiveDate: profile.lastActiveDate || null,
                achievements: profile.achievements || [],
            }, true);
        }
    } catch (e) {
        console.error('Failed to load profile:', e);
    }
}

export function saveProfile() {
    const s = getState();
    localStorage.setItem(PROFILE_KEY, JSON.stringify({
        xp: s.xp,
        level: s.level,
        gems: s.gems,
        dailyStreak: s.dailyStreak,
        lastActiveDate: s.lastActiveDate,
        achievements: s.achievements,
    }));
}

export function loadSettings() {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) {
            const settings = JSON.parse(saved);
            setState({
                soundEnabled: settings.soundEnabled ?? true,
                animationsEnabled: settings.animationsEnabled ?? true,
            }, true);
        }
    } catch (e) {
        console.error('Failed to load settings:', e);
    }
}

export function saveSettings() {
    const s = getState();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        soundEnabled: s.soundEnabled,
        animationsEnabled: s.animationsEnabled,
    }));
}

// ==================== LEVEL SYSTEM ====================

const XP_PER_LEVEL = 100;
const LEVEL_MULTIPLIER = 1.5;

export function getLevelInfo(level = null) {
    const s = getState();
    const currentLevel = level || s.level;
    const xpForCurrentLevel = Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_MULTIPLIER, currentLevel - 1));
    const xpForPrevLevel = currentLevel > 1 ? Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_MULTIPLIER, currentLevel - 2)) : 0;
    
    let totalXpForLevel = 0;
    for (let i = 1; i < currentLevel; i++) {
        totalXpForLevel += Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_MULTIPLIER, i - 1));
    }
    
    const xpIntoLevel = s.xp - totalXpForLevel;
    const progress = Math.min(100, Math.round((xpIntoLevel / xpForCurrentLevel) * 100));
    
    return {
        level: currentLevel,
        xp: s.xp,
        xpIntoLevel,
        xpForLevel: xpForCurrentLevel,
        progress,
        title: getLevelTitle(currentLevel),
    };
}

function getLevelTitle(level) {
    if (level >= 50) return 'Quiz Legend';
    if (level >= 40) return 'Grandmaster';
    if (level >= 30) return 'Master';
    if (level >= 20) return 'Expert';
    if (level >= 15) return 'Scholar';
    if (level >= 10) return 'Apprentice';
    if (level >= 5) return 'Learner';
    return 'Novice';
}

function addXP(amount) {
    const s = getState();
    const newXP = s.xp + amount;
    
    // Check for level up
    let newLevel = s.level;
    let totalXpNeeded = 0;
    for (let i = 1; i <= newLevel; i++) {
        totalXpNeeded += Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_MULTIPLIER, i - 1));
    }
    
    while (newXP >= totalXpNeeded) {
        newLevel++;
        totalXpNeeded += Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_MULTIPLIER, newLevel - 1));
    }
    
    const leveledUp = newLevel > s.level;
    
    setState({
        xp: newXP,
        level: newLevel,
        pendingLevelUp: leveledUp ? { oldLevel: s.level, newLevel, title: getLevelTitle(newLevel) } : null,
    }, true);
    
    saveProfile();
    return { xpGained: amount, leveledUp, newLevel };
}

// ==================== QUIZ PROGRESS ====================

const PROGRESS_KEY = 'quizmaster_progress_';

export function saveQuizProgress() {
    const s = getState();
    if (!s.currentQuiz) return;
    
    const progress = {
        questionIndex: s.currentQuestionIndex,
        answers: s.answers,
        flagged: Array.from(s.flaggedQuestions),
        studyMode: s.studyMode,
        randomizeOptions: s.randomizeOptions,
        optionShuffles: s.optionShuffles,
        quizStreak: s.quizStreak,
        maxQuizStreak: s.maxQuizStreak,
        matchingShuffled: s.matchingShuffled,
        timerEnabled: s.timerEnabled,
        timeRemaining: s.timeRemaining,
        savedAt: Date.now(),
    };
    
    localStorage.setItem(PROGRESS_KEY + s.currentQuiz.id, JSON.stringify(progress));
}

export function loadQuizProgress(quizId) {
    try {
        const saved = localStorage.getItem(PROGRESS_KEY + quizId);
        if (saved) {
            const progress = JSON.parse(saved);
            // Only restore if saved within last 24 hours
            if (Date.now() - progress.savedAt < 24 * 60 * 60 * 1000) {
                return progress;
            }
        }
    } catch (e) {
        console.error('Failed to load progress:', e);
    }
    return null;
}

export function clearQuizProgress(quizId) {
    localStorage.removeItem(PROGRESS_KEY + quizId);
}


export function getAllInProgressQuizzes() {
    const progressList = [];
    const s = getState();
    
    // Iterate through all quizzes and check for saved progress
    s.quizzes.forEach(quiz => {
        const progress = loadQuizProgress(quiz.id);
        if (progress) {
            progressList.push({
                quizId: quiz.id,
                questionIndex: progress.questionIndex,
                total: quiz.questions?.length || 0,
                savedAt: progress.savedAt,
            });
        }
    });
    
    return progressList;
}

// ==================== DAILY STREAK ====================

export function updateDailyStreak() {
    const s = getState();
    const today = new Date().toDateString();
    
    if (s.lastActiveDate === today) return; // Already updated today
    
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
}

// ==================== ANSWER RECORDING ====================

export function recordCorrectAnswer() {
    const s = getState();
    const newStreak = s.quizStreak + 1;
    const maxStreak = Math.max(s.maxQuizStreak, newStreak);
    
    // XP rewards
    let xpGain = 10; // Base XP
    if (newStreak >= 10) xpGain += 15;
    else if (newStreak >= 5) xpGain += 10;
    else if (newStreak >= 3) xpGain += 5;
    
    setState({
        quizStreak: newStreak,
        maxQuizStreak: maxStreak,
    }, true);
    
    addXP(xpGain);
}

export function recordWrongAnswer() {
    setState({ quizStreak: 0 }, true);
}

export function recordQuizComplete(correct, total) {
    const s = getState();
    const percentage = Math.round((correct / total) * 100);
    
    // XP rewards
    let xpGain = correct * 5; // 5 XP per correct answer
    if (percentage === 100) xpGain += 50; // Perfect bonus
    else if (percentage >= 90) xpGain += 25;
    else if (percentage >= 75) xpGain += 10;
    
    // Gems
    let gemsGain = 0;
    if (percentage === 100) gemsGain = 10;
    else if (percentage >= 90) gemsGain = 5;
    else if (percentage >= 75) gemsGain = 2;
    
    setState({
        gems: s.gems + gemsGain,
    }, true);
    
    addXP(xpGain);
}