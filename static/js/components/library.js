/* State Management - Complete with all required exports */

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
    
    // Gamification / Profile
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
};

const listeners = [];

/**
 * Get current state with computed properties
 */
export function getState() {
    // Add computed playerProfile for playerHud.js compatibility
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
 * @param {Object} newState - New state values to merge
 * @param {boolean} skipRender - If true, don't trigger re-render (for targeted DOM updates)
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
        
        if (token && userStr) {
            const user = JSON.parse(userStr);
            setState({ isAuthenticated: true, user, view: 'library' }, true);
            return true;
        }
    } catch (e) {
        console.error('Failed to load auth from localStorage:', e);
        // Clear corrupted data
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
    setState({ isAuthenticated: false, user: null, view: 'login' });
}

export function logout() {
    clearAuth();
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
                totalAnswered: profile.totalAnswered || 0,
                totalCorrect: profile.totalCorrect || 0,
                quizzesCompleted: profile.quizzesCompleted || 0,
                perfectScores: profile.perfectScores || 0,
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
    // If it's a small number (0-7), treat as tier index
    if (levelOrTier >= 0 && levelOrTier <= 7) {
        return TIER_NAMES[levelOrTier] || 'Novice';
    }
    // Otherwise treat as level
    const tier = getTierFromLevel(levelOrTier);
    return TIER_NAMES[tier] || 'Novice';
}

export function getTierColor(levelOrTier) {
    // If it's a small number (0-7), treat as tier index
    if (levelOrTier >= 0 && levelOrTier <= 7) {
        return TIER_COLORS[levelOrTier] || TIER_COLORS[0];
    }
    // Otherwise treat as level
    const tier = getTierFromLevel(levelOrTier);
    return TIER_COLORS[tier] || TIER_COLORS[0];
}

/**
 * Get level info - compatible with playerHud.js
 * @param {number} xpOrLevel - Can be XP value or null to use current state
 */
export function getLevelInfo(xpOrLevel = null) {
    const s = getState();
    
    // If a large number is passed, treat it as XP and calculate level from it
    // If small number or null, use state values
    let currentXP = s.xp;
    let currentLevel = s.level;
    
    if (xpOrLevel !== null && xpOrLevel > 100) {
        // Passed XP value, calculate level from it
        currentXP = xpOrLevel;
        currentLevel = calculateLevelFromXP(currentXP);
    } else if (xpOrLevel !== null && xpOrLevel <= 100) {
        // Passed a level number
        currentLevel = xpOrLevel;
    }
    
    const xpForCurrentLevel = Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_MULTIPLIER, currentLevel - 1));
    
    // Calculate total XP needed to reach current level
    let totalXpForLevel = 0;
    for (let i = 1; i < currentLevel; i++) {
        totalXpForLevel += Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_MULTIPLIER, i - 1));
    }
    
    const xpIntoLevel = currentXP - totalXpForLevel;
    const progressPercent = Math.min(100, Math.round((xpIntoLevel / xpForCurrentLevel) * 100));
    const progressDecimal = Math.min(1, xpIntoLevel / xpForCurrentLevel);
    const tier = getTierFromLevel(currentLevel);
    
    return {
        level: currentLevel,
        xp: currentXP,
        xpIntoLevel,
        xpInLevel: xpIntoLevel,       // Alias for playerHud.js
        xpForLevel: xpForCurrentLevel,
        xpForNext: xpForCurrentLevel,  // Alias for playerHud.js
        progress: progressDecimal,     // 0-1 for progress bar
        progressPercent,               // 0-100
        tier,
        title: getTierName(currentLevel),
        tierName: getTierName(tier),
        tierColor: getTierColor(tier),
        // Include profile for compatibility
        profile: getProfile(),
    };
}

function calculateLevelFromXP(xp) {
    let level = 1;
    let totalXpNeeded = 0;
    
    while (true) {
        const xpForThisLevel = Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_MULTIPLIER, level - 1));
        if (totalXpNeeded + xpForThisLevel > xp) break;
        totalXpNeeded += xpForThisLevel;
        level++;
    }
    
    return level;
}

function getLevelTitle(level) {
    return getTierName(level);
}

function addXP(amount) {
    const s = getState();
    const newXP = s.xp + amount;
    const newLevel = calculateLevelFromXP(newXP);
    const leveledUp = newLevel > s.level;
    
    setState({
        xp: newXP,
        level: newLevel,
        pendingLevelUp: leveledUp ? { oldLevel: s.level, newLevel, title: getLevelTitle(newLevel) } : null,
    }, true);
    
    saveProfile();
    return { xpGained: amount, leveledUp, newLevel };
}

// ==================== ACHIEVEMENTS ====================

const ACHIEVEMENTS = {
    first_quiz: { id: 'first_quiz', name: 'First Steps', description: 'Complete your first quiz', icon: '🎯' },
    perfect_score: { id: 'perfect_score', name: 'Perfectionist', description: 'Get 100% on a quiz', icon: '💯' },
    streak_5: { id: 'streak_5', name: 'On Fire', description: 'Get 5 correct answers in a row', icon: '🔥' },
    streak_10: { id: 'streak_10', name: 'Unstoppable', description: 'Get 10 correct answers in a row', icon: '⚡' },
    daily_streak_7: { id: 'daily_streak_7', name: 'Dedicated', description: 'Maintain a 7-day streak', icon: '📅' },
    quizzes_10: { id: 'quizzes_10', name: 'Quiz Enthusiast', description: 'Complete 10 quizzes', icon: '📚' },
    quizzes_50: { id: 'quizzes_50', name: 'Quiz Master', description: 'Complete 50 quizzes', icon: '🏆' },
    level_10: { id: 'level_10', name: 'Rising Star', description: 'Reach level 10', icon: '⭐' },
    level_25: { id: 'level_25', name: 'Expert', description: 'Reach level 25', icon: '🌟' },
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
    const pending = [...(s.pendingAchievements || []), achievement];
    
    setState({ 
        achievements: newAchievements,
        pendingAchievements: pending,
    }, true);
    
    saveProfile();
    return true;
}

export function checkAchievements() {
    const s = getState();
    
    // First quiz
    if (s.quizzesCompleted >= 1) unlockAchievement('first_quiz');
    
    // Quiz counts
    if (s.quizzesCompleted >= 10) unlockAchievement('quizzes_10');
    if (s.quizzesCompleted >= 50) unlockAchievement('quizzes_50');
    
    // Streaks
    if (s.maxQuizStreak >= 5) unlockAchievement('streak_5');
    if (s.maxQuizStreak >= 10) unlockAchievement('streak_10');
    
    // Daily streak
    if (s.dailyStreak >= 7) unlockAchievement('daily_streak_7');
    
    // Levels
    if (s.level >= 10) unlockAchievement('level_10');
    if (s.level >= 25) unlockAchievement('level_25');
    
    // Perfect scores
    if (s.perfectScores >= 1) unlockAchievement('perfect_score');
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

/**
 * Get all in-progress quizzes (for library display)
 */
export function getAllInProgressQuizzes() {
    const s = getState();
    const inProgress = [];
    
    if (!s.quizzes || !Array.isArray(s.quizzes)) return inProgress;
    
    for (const quiz of s.quizzes) {
        try {
            const saved = localStorage.getItem(PROGRESS_KEY + quiz.id);
            if (saved) {
                const progress = JSON.parse(saved);
                // Only include if saved within last 24 hours
                if (Date.now() - progress.savedAt < 24 * 60 * 60 * 1000) {
                    inProgress.push({
                        quizId: quiz.id,
                        quizTitle: quiz.title,
                        questionIndex: progress.questionIndex,
                        totalQuestions: quiz.questions?.length || 0,
                        answeredCount: progress.answers?.filter(a => a !== undefined).length || 0,
                        savedAt: progress.savedAt,
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