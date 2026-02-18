/* State Management - v2.0 with Database Sync */

const API_BASE = '/api';

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
    categoryFilter: 'all',
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
    
    // Gamification / Profile (synced to server)
    xp: 0,
    level: 1,
    gems: 0,
    dailyStreak: 0,
    lastActiveDate: null,
    achievements: [],
    pendingLevelUp: null,
    pendingAchievements: [],
    totalAnswered: 0,
    totalCorrect: 0,
    quizzesCompleted: 0,
    perfectScores: 0,
    
    // Settings
    soundEnabled: true,
    animationsEnabled: true,
    
    // Sync status
    profileLoaded: false,
    syncPending: false,
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
            xp: state.xp,
            level: state.level,
            gems: state.gems,
            dailyStreak: state.dailyStreak,
            achievements: state.achievements,
            totalAnswered: state.totalAnswered,
            totalCorrect: state.totalCorrect,
            quizzesCompleted: state.quizzesCompleted,
            perfectScores: state.perfectScores,
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

// ==================== API HELPERS ====================

function getAuthToken() {
    return localStorage.getItem('token');
}

async function apiCall(endpoint, options = {}) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
    };
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
    }
    
    return response.json();
}

// ==================== AUTH ====================

export function loadAuth() {
    try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (token && userStr) {
            const user = JSON.parse(userStr);
            setState({ isAuthenticated: true, user, view: 'library' }, true);
            return true;
        }
    } catch (e) {
        console.error('Failed to load auth from localStorage:', e);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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
    setState({ isAuthenticated: false, user: null, view: 'landing', profileLoaded: false });
}

export function logout() {
    clearAuth();
}

// ==================== PROFILE/GAMIFICATION (SERVER SYNC) ====================

/**
 * Load profile from server
 */
export async function loadProfile() {
    try {
        const data = await apiCall('/profile');
        
        if (data.profile) {
            const p = data.profile;
            setState({
                xp: p.xp || 0,
                level: p.level || 1,
                gems: p.gems || 0,
                dailyStreak: p.daily_streak || 0,
                lastActiveDate: p.last_active_date || null,
                achievements: p.achievements || [],
                totalAnswered: p.total_answered || 0,
                totalCorrect: p.total_correct || 0,
                quizzesCompleted: p.quizzes_completed || 0,
                perfectScores: p.perfect_scores || 0,
                soundEnabled: p.settings?.soundEnabled ?? true,
                animationsEnabled: p.settings?.animationsEnabled ?? true,
                profileLoaded: true,
            }, true);
        }
        
        if (data.user) {
            setState({ user: data.user }, true);
        }
    } catch (e) {
        console.error('Failed to load profile from server:', e);
        // Fall back to local storage if server fails
        loadProfileFromLocalStorage();
    }
}

/**
 * Save profile to server (debounced)
 */
export function saveProfile() {
    // Clear previous timeout
    clearTimeout(syncTimeout);
    
    // Debounce - save after 1 second of no changes
    syncTimeout = setTimeout(async () => {
        try {
            const s = getState();
            await apiCall('/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    xp: s.xp,
                    level: s.level,
                    gems: s.gems,
                    daily_streak: s.dailyStreak,
                    last_active_date: s.lastActiveDate,
                    achievements: s.achievements,
                    total_answered: s.totalAnswered,
                    total_correct: s.totalCorrect,
                    quizzes_completed: s.quizzesCompleted,
                    perfect_scores: s.perfectScores,
                    settings: {
                        soundEnabled: s.soundEnabled,
                        animationsEnabled: s.animationsEnabled,
                    },
                }),
            });
            console.log('Profile synced to server');
        } catch (e) {
            console.error('Failed to sync profile to server:', e);
            // Save to localStorage as backup
            saveProfileToLocalStorage();
        }
    }, 1000);
    
    // Also save to localStorage immediately as backup
    saveProfileToLocalStorage();
}

// Fallback localStorage functions
const PROFILE_KEY = 'quizmaster_profile';

function loadProfileFromLocalStorage() {
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
                totalAnswered: profile.totalAnswered || 0,
                totalCorrect: profile.totalCorrect || 0,
                quizzesCompleted: profile.quizzesCompleted || 0,
                perfectScores: profile.perfectScores || 0,
                profileLoaded: true,
            }, true);
        }
    } catch (e) {
        console.error('Failed to load profile from localStorage:', e);
    }
}

function saveProfileToLocalStorage() {
    const s = getState();
    localStorage.setItem(PROFILE_KEY, JSON.stringify({
        xp: s.xp,
        level: s.level,
        gems: s.gems,
        dailyStreak: s.dailyStreak,
        lastActiveDate: s.lastActiveDate,
        achievements: s.achievements,
        totalAnswered: s.totalAnswered,
        totalCorrect: s.totalCorrect,
        quizzesCompleted: s.quizzesCompleted,
        perfectScores: s.perfectScores,
    }));
}

export function getProfile() {
    const s = getState();
    return {
        xp: s.xp,
        level: s.level,
        gems: s.gems,
        dailyStreak: s.dailyStreak,
        achievements: s.achievements,
        totalAnswered: s.totalAnswered,
        totalCorrect: s.totalCorrect,
        quizzesCompleted: s.quizzesCompleted,
        perfectScores: s.perfectScores,
    };
}

export function getPlayerHudData() {
    const s = getState();
    return {
        profile: getProfile(),
        levelInfo: getLevelInfo(),
    };
}

// Settings
const SETTINGS_KEY = 'quizmaster_settings';

export function loadSettings() {
    // Settings are loaded as part of profile now
    // This function exists for backward compatibility
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
    // Also sync to server with profile
    saveProfile();
}

// ==================== LEVEL SYSTEM ====================

const XP_PER_LEVEL = 100;
const LEVEL_MULTIPLIER = 1.5;

const TIER_THRESHOLDS = [1, 5, 10, 15, 20, 30, 40, 50];
const TIER_NAMES = ['Novice', 'Learner', 'Apprentice', 'Scholar', 'Expert', 'Master', 'Grandmaster', 'Legend'];
const TIER_COLORS = ['#9ca3af', '#60a5fa', '#34d399', '#a78bfa', '#f472b6', '#fbbf24', '#f97316', '#ef4444'];

export function getTierFromLevel(level) {
    for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
        if (level >= TIER_THRESHOLDS[i]) return i;
    }
    return 0;
}

export function getTierName(levelOrTier) {
    if (levelOrTier >= 0 && levelOrTier <= 7) {
        return TIER_NAMES[levelOrTier] || 'Novice';
    }
    const tier = getTierFromLevel(levelOrTier);
    return TIER_NAMES[tier] || 'Novice';
}

export function getTierColor(levelOrTier) {
    if (levelOrTier >= 0 && levelOrTier <= 7) {
        return TIER_COLORS[levelOrTier] || TIER_COLORS[0];
    }
    const tier = getTierFromLevel(levelOrTier);
    return TIER_COLORS[tier] || TIER_COLORS[0];
}

export function getXpForLevel(level) {
    if (level <= 1) return 0;
    let total = 0;
    for (let i = 1; i < level; i++) {
        total += Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_MULTIPLIER, i - 1));
    }
    return total;
}

export function getXpToNextLevel(level) {
    return Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_MULTIPLIER, level - 1));
}

export function calculateLevelFromXP(xp) {
    let level = 1;
    let xpNeeded = XP_PER_LEVEL;
    let totalXpNeeded = 0;
    
    while (totalXpNeeded + xpNeeded <= xp) {
        totalXpNeeded += xpNeeded;
        level++;
        xpNeeded = Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_MULTIPLIER, level - 1));
    }
    
    return level;
}

export function getLevelInfo() {
    const s = getState();
    const level = s.level || 1;
    const xp = s.xp || 0;
    
    const xpForCurrentLevel = getXpForLevel(level);
    const xpToNext = getXpToNextLevel(level);
    const xpInLevel = xp - xpForCurrentLevel;
    const progress = Math.min(100, Math.floor((xpInLevel / xpToNext) * 100));
    
    return {
        level,
        xp,
        xpInLevel,
        xpToNext,
        progress,
        tier: getTierFromLevel(level),
        tierName: getTierName(level),
        tierColor: getTierColor(level),
    };
}

export function getLevelTitle(level) {
    return getTierName(level);
}

function addXP(amount) {
    if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) {
        return { xpGained: 0, leveledUp: false, newLevel: getState().level };
    }
    
    const s = getState();
    const currentXP = (typeof s.xp === 'number' && isFinite(s.xp)) ? s.xp : 0;
    const currentLevel = (typeof s.level === 'number' && isFinite(s.level)) ? s.level : 1;
    
    const newXP = Math.min(currentXP + amount, 1000000000);
    const newLevel = calculateLevelFromXP(newXP);
    const leveledUp = newLevel > currentLevel;
    
    setState({
        xp: newXP,
        level: newLevel,
        pendingLevelUp: leveledUp ? { oldLevel: currentLevel, newLevel, title: getLevelTitle(newLevel) } : null,
    }, true);
    
    saveProfile();
    return { xpGained: amount, leveledUp, newLevel };
}

// ==================== ACHIEVEMENTS ====================

const ACHIEVEMENTS = {
    first_quiz: { id: 'first_quiz', name: 'First Steps', description: 'Complete your first quiz', icon: '🎯', xp: 50, gems: 5 },
    perfect_score: { id: 'perfect_score', name: 'Perfectionist', description: 'Get 100% on a quiz', icon: '💯', xp: 100, gems: 10 },
    streak_5: { id: 'streak_5', name: 'On Fire', description: 'Get 5 correct answers in a row', icon: '🔥', xp: 75, gems: 5 },
    streak_10: { id: 'streak_10', name: 'Unstoppable', description: 'Get 10 correct answers in a row', icon: '⚡', xp: 150, gems: 10 },
    daily_streak_7: { id: 'daily_streak_7', name: 'Dedicated', description: 'Maintain a 7-day streak', icon: '📅', xp: 200, gems: 20 },
    quizzes_10: { id: 'quizzes_10', name: 'Quiz Enthusiast', description: 'Complete 10 quizzes', icon: '📚', xp: 100, gems: 10 },
    quizzes_50: { id: 'quizzes_50', name: 'Quiz Master', description: 'Complete 50 quizzes', icon: '🏆', xp: 500, gems: 50 },
    level_10: { id: 'level_10', name: 'Rising Star', description: 'Reach level 10', icon: '⭐', xp: 0, gems: 25 },
    level_25: { id: 'level_25', name: 'Expert', description: 'Reach level 25', icon: '🌟', xp: 0, gems: 50 },
};

export function getUnlockedAchievements() {
    const s = getState();
    return s.achievements || [];
}

export function unlockAchievement(achievementId) {
    const s = getState();
    if (s.achievements.includes(achievementId)) return false;
    
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) return false;
    
    const newAchievements = [...s.achievements, achievementId];
    
    const currentXP = (typeof s.xp === 'number' && isFinite(s.xp)) ? s.xp : 0;
    const currentGems = (typeof s.gems === 'number' && isFinite(s.gems)) ? s.gems : 0;
    const newXP = achievement.xp ? Math.min(currentXP + achievement.xp, 1000000000) : currentXP;
    const newGems = achievement.gems ? currentGems + achievement.gems : currentGems;
    const newLevel = calculateLevelFromXP(newXP);
    
    const pending = [...(s.pendingAchievements || []), {
        ...achievement,
        xp: achievement.xp || 0,
        gems: achievement.gems || 0,
    }];
    
    setState({ 
        achievements: newAchievements,
        pendingAchievements: pending,
        xp: newXP,
        gems: newGems,
        level: newLevel,
    }, true);
    
    saveProfile();
    return true;
}

export function checkAchievements() {
    const s = getState();
    
    if (s.quizzesCompleted >= 1) unlockAchievement('first_quiz');
    if (s.quizzesCompleted >= 10) unlockAchievement('quizzes_10');
    if (s.quizzesCompleted >= 50) unlockAchievement('quizzes_50');
    if (s.maxQuizStreak >= 5) unlockAchievement('streak_5');
    if (s.maxQuizStreak >= 10) unlockAchievement('streak_10');
    if (s.dailyStreak >= 7) unlockAchievement('daily_streak_7');
    if (s.level >= 10) unlockAchievement('level_10');
    if (s.level >= 25) unlockAchievement('level_25');
    if (s.perfectScores >= 1) unlockAchievement('perfect_score');
}

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
        quiz_streak: s.quizStreak,
        max_quiz_streak: s.maxQuizStreak,
        timer_enabled: s.timerEnabled,
        time_remaining: s.timeRemaining,
    };
    
    try {
        await apiCall(`/progress/${s.currentQuiz.id}`, {
            method: 'PUT',
            body: JSON.stringify(progressData),
        });
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
        const data = await apiCall(`/progress/${quizId}`);
        if (data.progress) {
            const p = data.progress;
            return {
                questionIndex: p.question_index,
                answers: p.answers || [],
                flagged: p.flagged || [],
                studyMode: p.study_mode,
                randomizeOptions: p.randomize_options,
                optionShuffles: p.option_shuffles || {},
                quizStreak: p.quiz_streak || 0,
                maxQuizStreak: p.max_quiz_streak || 0,
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
        await apiCall(`/progress/${quizId}`, { method: 'DELETE' });
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
        const data = await apiCall('/progress');
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
    const newStreak = s.quizStreak + 1;
    const maxStreak = Math.max(s.maxQuizStreak, newStreak);
    
    let xpGain = 10;
    if (newStreak >= 10) xpGain += 15;
    else if (newStreak >= 5) xpGain += 10;
    else if (newStreak >= 3) xpGain += 5;
    
    setState({
        quizStreak: newStreak,
        maxQuizStreak: maxStreak,
        totalAnswered: s.totalAnswered + 1,
        totalCorrect: s.totalCorrect + 1,
    }, true);
    
    addXP(xpGain);
    checkAchievements();
}

export function recordWrongAnswer() {
    const s = getState();
    setState({ 
        quizStreak: 0,
        totalAnswered: s.totalAnswered + 1,
    }, true);
}

export function recordQuizComplete(correct, total) {
    const s = getState();
    const percentage = Math.round((correct / total) * 100);
    const isPerfect = correct === total;
    
    let xpGain = correct * 5;
    if (isPerfect) xpGain += 50;
    else if (percentage >= 90) xpGain += 25;
    else if (percentage >= 75) xpGain += 10;
    
    let gemsGain = 0;
    if (isPerfect) gemsGain = 10;
    else if (percentage >= 90) gemsGain = 5;
    else if (percentage >= 75) gemsGain = 2;
    
    setState({
        gems: s.gems + gemsGain,
        quizzesCompleted: s.quizzesCompleted + 1,
        perfectScores: isPerfect ? s.perfectScores + 1 : s.perfectScores,
    }, true);
    
    addXP(xpGain);
    checkAchievements();
}