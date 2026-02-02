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
    totalAnswered: 0,
    totalCorrect: 0,
    quizzesCompleted: 0,
    perfectScores: 0,
    
    // Settings
    soundEnabled: true,
    animationsEnabled: true,
};

const listeners = [];

export function getState() {
    // Add computed playerProfile property for compatibility with playerHud.js
    return {
        ...state,
        playerProfile: {
            xp: state.xp || 0,
            level: state.level || 1,
            gems: state.gems || 0,
            dailyStreak: state.dailyStreak || 0,
            lastActiveDate: state.lastActiveDate || null,
            achievements: state.achievements || [],
            totalAnswered: state.totalAnswered || 0,
            totalCorrect: state.totalCorrect || 0,
            quizzesCompleted: state.quizzesCompleted || 0,
            perfectScores: state.perfectScores || 0,
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
    try {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        if (token && user) {
            const parsedUser = JSON.parse(user);
            setState({ isAuthenticated: true, user: parsedUser, view: 'library' });
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
    const progressPercent = Math.min(100, Math.round((xpIntoLevel / xpForCurrentLevel) * 100));
    const progressDecimal = Math.min(1, xpIntoLevel / xpForCurrentLevel);
    
    return {
        level: currentLevel,
        xp: s.xp,
        xpInLevel: xpIntoLevel,  // For playerHud.js compatibility
        xpIntoLevel,  // Keep for backward compatibility
        xpForNext: xpForCurrentLevel,  // For playerHud.js compatibility
        xpForLevel: xpForCurrentLevel,  // Keep for backward compatibility
        progress: progressDecimal,  // 0-1 decimal for playerHud.js
        progressPercent: progressPercent,  // 0-100 integer
        title: getLevelTitle(currentLevel),
        tier: getTierFromLevel(currentLevel),  // For playerHud.js compatibility
        profile: {
            xp: s.xp || 0,
            level: s.level || 1,
            gems: s.gems || 0,
            dailyStreak: s.dailyStreak || 0,
            achievements: s.achievements || [],
        },
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

function getTierFromLevel(level) {
    if (level >= 50) return 7; // Legend
    if (level >= 40) return 6; // Grandmaster
    if (level >= 30) return 5; // Master
    if (level >= 20) return 4; // Expert
    if (level >= 15) return 3; // Scholar
    if (level >= 10) return 2; // Apprentice
    if (level >= 5) return 1;  // Learner
    return 0; // Novice
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
// ==================== ACHIEVEMENTS ====================

export function getUnlockedAchievements() {
    const s = getState();
    return s.achievements || [];
}

export function unlockAchievement(achievementId) {
    const s = getState();
    if (!s.achievements.includes(achievementId)) {
        const newAchievements = [...s.achievements, achievementId];
        setState({
            achievements: newAchievements,
            pendingAchievements: [...(s.pendingAchievements || []), achievementId],
        }, true);
        saveProfile();
        return true;
    }
    return false;
}

export function checkAchievements() {
    const s = getState();
    const newAchievements = [];
    
    // First Quiz
    if (!s.achievements.includes('first_quiz') && s.quizzes.length >= 1) {
        unlockAchievement('first_quiz');
        newAchievements.push('first_quiz');
    }
    
    // Perfect Score
    if (!s.achievements.includes('perfect_score')) {
        // This would be checked in quiz results
    }
    
    // Level milestones
    if (!s.achievements.includes('level_5') && s.level >= 5) {
        unlockAchievement('level_5');
        newAchievements.push('level_5');
    }
    if (!s.achievements.includes('level_10') && s.level >= 10) {
        unlockAchievement('level_10');
        newAchievements.push('level_10');
    }
    if (!s.achievements.includes('level_25') && s.level >= 25) {
        unlockAchievement('level_25');
        newAchievements.push('level_25');
    }
    
    // Streak milestones
    if (!s.achievements.includes('streak_7') && s.dailyStreak >= 7) {
        unlockAchievement('streak_7');
        newAchievements.push('streak_7');
    }
    if (!s.achievements.includes('streak_30') && s.dailyStreak >= 30) {
        unlockAchievement('streak_30');
        newAchievements.push('streak_30');
    }
    
    return newAchievements;
}

// ==================== TIER SYSTEM ====================

export function getTierColor(tierOrLevel = null) {
    let currentLevel;
    
    if (tierOrLevel === null) {
        currentLevel = getState().level;
    } else if (tierOrLevel <= 7) {
        // Tier number (0-7), convert to minimum level for that tier
        const tierToLevel = [1, 5, 10, 15, 20, 30, 40, 50];
        currentLevel = tierToLevel[tierOrLevel] || 1;
    } else {
        // Level number
        currentLevel = tierOrLevel;
    }
    
    if (currentLevel >= 50) return '#FFD700'; // Gold - Legend
    if (currentLevel >= 40) return '#E5E4E2'; // Platinum - Grandmaster
    if (currentLevel >= 30) return '#CD7F32'; // Bronze - Master
    if (currentLevel >= 20) return '#C0C0C0'; // Silver - Expert
    if (currentLevel >= 15) return '#8B4513'; // Brown - Scholar
    if (currentLevel >= 10) return '#4169E1'; // Blue - Apprentice
    if (currentLevel >= 5) return '#32CD32';  // Green - Learner
    return '#9CA3AF'; // Gray - Novice
}

export function getTierName(level = null) {
    const currentLevel = level || getState().level;
    return getLevelTitle(currentLevel);
}

// ==================== PROFILE GETTER ====================

export function getProfile() {
    const s = getState();
    return {
        xp: s.xp || 0,
        level: s.level || 1,
        gems: s.gems || 0,
        dailyStreak: s.dailyStreak || 0,
        achievements: s.achievements || [],
    };
}

// ==================== PLAYER HUD DATA ====================

export function getPlayerHudData() {
    const s = getState();
    const levelInfo = getLevelInfo();
    
    return {
        profile: {
            xp: s.xp || 0,
            level: s.level || 1,
            gems: s.gems || 0,
            dailyStreak: s.dailyStreak || 0,
            achievements: s.achievements || [],
        },
        levelInfo: levelInfo,
        tierColor: getTierColor(),
        tierName: getTierName(),
    };
}