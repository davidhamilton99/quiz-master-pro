/* ============================================
   State Management - SPECTACULAR Edition
   XP, Levels, Achievements, Streaks, Gems
   ============================================ */

// ==================== LEVEL SYSTEM ====================
const LEVELS = [
    { level: 1, xpRequired: 0, title: 'Novice', tier: 'bronze' },
    { level: 2, xpRequired: 100, title: 'Learner', tier: 'bronze' },
    { level: 3, xpRequired: 250, title: 'Student', tier: 'bronze' },
    { level: 4, xpRequired: 500, title: 'Apprentice', tier: 'bronze' },
    { level: 5, xpRequired: 850, title: 'Scholar', tier: 'bronze' },
    { level: 6, xpRequired: 1300, title: 'Adept', tier: 'bronze' },
    { level: 7, xpRequired: 1850, title: 'Expert', tier: 'bronze' },
    { level: 8, xpRequired: 2500, title: 'Specialist', tier: 'bronze' },
    { level: 9, xpRequired: 3300, title: 'Authority', tier: 'bronze' },
    { level: 10, xpRequired: 4200, title: 'Bronze Scholar', tier: 'bronze' },
    { level: 11, xpRequired: 5200, title: 'Thinker', tier: 'silver' },
    { level: 12, xpRequired: 6400, title: 'Analyst', tier: 'silver' },
    { level: 13, xpRequired: 7800, title: 'Researcher', tier: 'silver' },
    { level: 14, xpRequired: 9400, title: 'Intellectual', tier: 'silver' },
    { level: 15, xpRequired: 11200, title: 'Philosopher', tier: 'silver' },
    { level: 16, xpRequired: 13200, title: 'Mentor', tier: 'silver' },
    { level: 17, xpRequired: 15500, title: 'Professor', tier: 'silver' },
    { level: 18, xpRequired: 18000, title: 'Savant', tier: 'silver' },
    { level: 19, xpRequired: 20800, title: 'Virtuoso', tier: 'silver' },
    { level: 20, xpRequired: 24000, title: 'Silver Sage', tier: 'silver' },
    { level: 25, xpRequired: 40000, title: 'Gold Guardian', tier: 'gold' },
    { level: 30, xpRequired: 60000, title: 'Platinum Professor', tier: 'platinum' },
    { level: 40, xpRequired: 100000, title: 'Diamond Master', tier: 'diamond' },
    { level: 50, xpRequired: 150000, title: 'Legendary', tier: 'legendary' },
];

// ==================== ACHIEVEMENTS ====================
const ACHIEVEMENTS = {
    // Learning Milestones
    first_quiz: { id: 'first_quiz', name: 'First Steps', desc: 'Complete your first quiz', icon: '📚', xp: 50, secret: false },
    ten_quizzes: { id: 'ten_quizzes', name: 'Getting Started', desc: 'Complete 10 quizzes', icon: '📖', xp: 100, secret: false },
    fifty_quizzes: { id: 'fifty_quizzes', name: 'Marathon Runner', desc: 'Complete 50 quizzes', icon: '🏃', xp: 250, secret: false },
    hundred_correct: { id: 'hundred_correct', name: 'Century Club', desc: 'Answer 100 questions correctly', icon: '💯', xp: 150, secret: false },
    thousand_correct: { id: 'thousand_correct', name: 'Big Brain', desc: 'Answer 1000 questions correctly', icon: '🧠', xp: 500, secret: false },
    
    // Perfect Scores
    first_perfect: { id: 'first_perfect', name: 'Flawless', desc: 'Get your first perfect score', icon: '⭐', xp: 75, secret: false },
    five_perfect: { id: 'five_perfect', name: 'Perfectionist', desc: 'Get 5 perfect scores', icon: '🌟', xp: 150, secret: false },
    ten_perfect: { id: 'ten_perfect', name: 'Sharpshooter', desc: 'Get 10 perfect scores', icon: '🎯', xp: 300, secret: false },
    
    // Streaks - Daily
    streak_3: { id: 'streak_3', name: 'Spark', desc: '3-day study streak', icon: '🔥', xp: 50, secret: false },
    streak_7: { id: 'streak_7', name: 'On Fire', desc: '7-day study streak', icon: '🔥', xp: 100, secret: false },
    streak_14: { id: 'streak_14', name: 'Blazing', desc: '14-day study streak', icon: '🔥', xp: 200, secret: false },
    streak_30: { id: 'streak_30', name: 'Inferno', desc: '30-day study streak', icon: '🌋', xp: 400, secret: false },
    streak_100: { id: 'streak_100', name: 'Eternal Flame', desc: '100-day study streak', icon: '☀️', xp: 1000, secret: false },
    
    // Streaks - In Quiz
    quiz_streak_10: { id: 'quiz_streak_10', name: 'Hot Streak', desc: '10 correct answers in a row', icon: '⚡', xp: 50, secret: false },
    quiz_streak_20: { id: 'quiz_streak_20', name: 'Unstoppable', desc: '20 correct answers in a row', icon: '💫', xp: 100, secret: false },
    quiz_streak_50: { id: 'quiz_streak_50', name: 'Legendary Run', desc: '50 correct answers in a row', icon: '👑', xp: 300, secret: false },
    
    // Creation
    first_create: { id: 'first_create', name: 'Creator', desc: 'Create your first quiz', icon: '✏️', xp: 50, secret: false },
    five_create: { id: 'five_create', name: 'Author', desc: 'Create 5 quizzes', icon: '📝', xp: 150, secret: false },
    
    // Speed
    speed_demon: { id: 'speed_demon', name: 'Speed Demon', desc: 'Answer 10 questions in under 60 seconds', icon: '⚡', xp: 100, secret: false },
    
    // Levels
    level_10: { id: 'level_10', name: 'Bronze Scholar', desc: 'Reach level 10', icon: '🥉', xp: 200, secret: false },
    level_20: { id: 'level_20', name: 'Silver Sage', desc: 'Reach level 20', icon: '🥈', xp: 400, secret: false },
    level_30: { id: 'level_30', name: 'Gold Guardian', desc: 'Reach level 30', icon: '🥇', xp: 600, secret: false },
    
    // Hidden/Secret
    night_owl: { id: 'night_owl', name: 'Night Owl', desc: 'Study between 2-5 AM', icon: '🦉', xp: 75, secret: true },
    early_bird: { id: 'early_bird', name: 'Early Bird', desc: 'Study before 6 AM', icon: '🐦', xp: 75, secret: true },
    weekend_warrior: { id: 'weekend_warrior', name: 'Weekend Warrior', desc: 'Study on both Saturday and Sunday', icon: '⚔️', xp: 50, secret: true },
};

// ==================== XP REWARDS ====================
const XP_REWARDS = {
    correctAnswer: 10,
    streakBonus: 2, // per streak count
    quizComplete: 50,
    perfectScore: 100,
    dailyLogin: 25,
    createQuiz: 75,
};

// ==================== INITIAL STATE ====================
const initialState = {
    // Auth
    view: 'login',
    isAuthenticated: false,
    user: null,
    token: null,
    authMode: 'login',
    randomizeOptions: false,  // NEW: Add this
    optionShuffles: {},       // NEW: Stores shuffle mapping per question
    // Player Profile
    playerProfile: {
        xp: 0,
        level: 1,
        title: 'Novice',
        tier: 'bronze',
        gems: 0,
        dailyStreak: 0,
        longestDailyStreak: 0,
        lastStudyDate: null,
        totalCorrect: 0,
        totalAnswered: 0,
        quizzesCompleted: 0,
        perfectScores: 0,
        quizzesCreated: 0,
        achievements: [],
        joinDate: null,
        studyHistory: {}, // { 'YYYY-MM-DD': { count: N, xpEarned: N } }
    },
    
    // Pending rewards (to show animations)
    pendingXP: 0,
    pendingAchievements: [],
    pendingLevelUp: null,
    showRewardAnimation: false,
    
    // Library
    quizzes: [],
    searchQuery: '',
    sortBy: 'recent',
    categoryFilter: 'all',
    
    // Quiz
    currentQuiz: null,
    currentQuestionIndex: 0,
    answers: [],
    studyMode: false,
    showAnswer: false,
    flaggedQuestions: new Set(),
    matchingShuffled: {},
    
    // In-quiz stats
    quizStreak: 0,
    maxQuizStreak: 0,
    quizStartTime: null,
    questionTimes: [],
    
    // Timer
    timerEnabled: false,
    timerMinutes: 15,
    timeRemaining: 0,
    
    // Settings
    soundEnabled: true,
    animationsEnabled: true,
    theme: 'dark',
    
    // UI
    loading: false,
    
    // Create
    quizTitle: '',
    quizData: '',
    quizCategory: '',
    editingQuizId: null,
    visualEditorMode: false,
    parsedQuestions: null,
    currentEditQuestion: 0,
    showFormatHelp: false
};

let state = { ...initialState };
const listeners = new Set();

// ==================== CORE STATE FUNCTIONS ====================
export function getState() {
    return state;
}

export function setState(updates) {
    state = { ...state, ...(typeof updates === 'function' ? updates(state) : updates) };
    listeners.forEach(fn => fn(state));
}

// Silent update - does NOT trigger re-render (for DOM-managed updates)
export function setStateSilent(updates) {
    state = { ...state, ...(typeof updates === 'function' ? updates(state) : updates) };
}

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function resetState() {
    state = { ...initialState };
    listeners.forEach(fn => fn(state));
}

// ==================== LEVEL CALCULATIONS ====================
export function getLevelInfo(xp) {
    let currentLevel = LEVELS[0];
    let nextLevel = LEVELS[1];
    
    for (let i = 0; i < LEVELS.length; i++) {
        if (xp >= LEVELS[i].xpRequired) {
            currentLevel = LEVELS[i];
            nextLevel = LEVELS[i + 1] || null;
        } else {
            break;
        }
    }
    
    const xpInCurrentLevel = xp - currentLevel.xpRequired;
    const xpForNextLevel = nextLevel ? nextLevel.xpRequired - currentLevel.xpRequired : 0;
    const progress = nextLevel ? xpInCurrentLevel / xpForNextLevel : 1;
    
    return {
        level: currentLevel.level,
        title: currentLevel.title,
        tier: currentLevel.tier,
        currentXP: xp,
        xpInLevel: xpInCurrentLevel,
        xpForNext: xpForNextLevel,
        progress: Math.min(progress, 1),
        nextLevel: nextLevel
    };
}

export function getTierColor(tier) {
    const colors = {
        bronze: '#cd7f32',
        silver: '#c0c0c0',
        gold: '#ffd700',
        platinum: '#e5e4e2',
        diamond: '#b9f2ff',
        legendary: '#ff6b6b'
    };
    return colors[tier] || colors.bronze;
}

// ==================== XP & REWARDS ====================
export function awardXP(amount, reason = '') {
    const profile = { ...state.playerProfile };
    const oldXP = profile.xp;
    const oldLevel = getLevelInfo(oldXP);
    
    profile.xp += amount;
    
    const newLevel = getLevelInfo(profile.xp);
    
    // Update today's study history
    const today = new Date().toISOString().split('T')[0];
    if (!profile.studyHistory[today]) {
        profile.studyHistory[today] = { count: 0, xpEarned: 0 };
    }
    profile.studyHistory[today].xpEarned += amount;
    
    // Check for level up
    let levelUp = null;
    if (newLevel.level > oldLevel.level) {
        levelUp = newLevel;
        profile.level = newLevel.level;
        profile.title = newLevel.title;
        profile.tier = newLevel.tier;
        
        // Bonus gems for leveling up
        profile.gems += newLevel.level * 5;
        
        // Check level achievements
        checkAchievement('level_10', profile.level >= 10);
        checkAchievement('level_20', profile.level >= 20);
        checkAchievement('level_30', profile.level >= 30);
    }
    
    setState({ 
        playerProfile: profile,
        pendingXP: state.pendingXP + amount,
        pendingLevelUp: levelUp,
        showRewardAnimation: true
    });
    
    saveProfile();
    
    return { xpGained: amount, levelUp, newTotal: profile.xp };
}

export function awardGems(amount) {
    const profile = { ...state.playerProfile };
    profile.gems += amount;
    setState({ playerProfile: profile });
    saveProfile();
}

// ==================== ACHIEVEMENTS ====================
export function checkAchievement(achievementId, condition) {
    if (!condition) return false;
    
    const profile = { ...state.playerProfile };
    if (profile.achievements.includes(achievementId)) return false;
    
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) return false;
    
    // Unlock achievement
    profile.achievements.push(achievementId);
    profile.xp += achievement.xp;
    profile.gems += 10; // Bonus gems for achievements
    
    setState({ 
        playerProfile: profile,
        pendingAchievements: [...state.pendingAchievements, achievement]
    });
    
    saveProfile();
    return true;
}

export function getAchievements() {
    return ACHIEVEMENTS;
}

export function getUnlockedAchievements() {
    return state.playerProfile.achievements.map(id => ACHIEVEMENTS[id]).filter(Boolean);
}

// ==================== STREAKS ====================
export function updateDailyStreak() {
    const profile = { ...state.playerProfile };
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (profile.lastStudyDate === today) {
        // Already studied today
        return profile.dailyStreak;
    }
    
    if (profile.lastStudyDate === yesterday) {
        // Continue streak
        profile.dailyStreak += 1;
    } else if (profile.lastStudyDate !== today) {
        // Streak broken or first time
        profile.dailyStreak = 1;
    }
    
    profile.lastStudyDate = today;
    profile.longestDailyStreak = Math.max(profile.longestDailyStreak, profile.dailyStreak);
    
    // Update study history
    if (!profile.studyHistory[today]) {
        profile.studyHistory[today] = { count: 0, xpEarned: 0 };
    }
    profile.studyHistory[today].count += 1;
    
    // Check streak achievements
    checkAchievement('streak_3', profile.dailyStreak >= 3);
    checkAchievement('streak_7', profile.dailyStreak >= 7);
    checkAchievement('streak_14', profile.dailyStreak >= 14);
    checkAchievement('streak_30', profile.dailyStreak >= 30);
    checkAchievement('streak_100', profile.dailyStreak >= 100);
    
    // Check time-based achievements
    const hour = new Date().getHours();
    checkAchievement('night_owl', hour >= 2 && hour < 5);
    checkAchievement('early_bird', hour < 6);
    
    const day = new Date().getDay();
    if (day === 0 && profile.studyHistory[yesterday]?.count > 0) {
        checkAchievement('weekend_warrior', true);
    }
    
    setState({ playerProfile: profile });
    saveProfile();
    
    return profile.dailyStreak;
}

// ==================== QUIZ STATS ====================
export function recordCorrectAnswer() {
    const profile = { ...state.playerProfile };
    profile.totalCorrect += 1;
    profile.totalAnswered += 1;
    
    const newQuizStreak = state.quizStreak + 1;
    const maxQuizStreak = Math.max(state.maxQuizStreak, newQuizStreak);
    
    // Check quiz streak achievements
    checkAchievement('quiz_streak_10', maxQuizStreak >= 10);
    checkAchievement('quiz_streak_20', maxQuizStreak >= 20);
    checkAchievement('quiz_streak_50', maxQuizStreak >= 50);
    
    // Check total correct achievements
    checkAchievement('hundred_correct', profile.totalCorrect >= 100);
    checkAchievement('thousand_correct', profile.totalCorrect >= 1000);
    
    // Award XP with streak bonus
    const streakBonus = Math.min(newQuizStreak, 10) * XP_REWARDS.streakBonus;
    awardXP(XP_REWARDS.correctAnswer + streakBonus, 'correct_answer');
    
    setState({ 
        playerProfile: profile,
        quizStreak: newQuizStreak,
        maxQuizStreak
    });
    
    saveProfile();
    return { streak: newQuizStreak, xp: XP_REWARDS.correctAnswer + streakBonus };
}

// Silent version - updates state without triggering re-render
export function recordCorrectAnswerSilent() {
    const profile = { ...state.playerProfile };
    profile.totalCorrect += 1;
    profile.totalAnswered += 1;
    
    const newQuizStreak = state.quizStreak + 1;
    const maxQuizStreak = Math.max(state.maxQuizStreak, newQuizStreak);
    
    // Award XP silently (no achievements to avoid re-render)
    const streakBonus = Math.min(newQuizStreak, 10) * XP_REWARDS.streakBonus;
    profile.xp += XP_REWARDS.correctAnswer + streakBonus;
    
    setStateSilent({ 
        playerProfile: profile,
        quizStreak: newQuizStreak,
        maxQuizStreak,
        showAnswer: true
    });
    
    saveProfile();
    return { streak: newQuizStreak, xp: XP_REWARDS.correctAnswer + streakBonus };
}

export function recordWrongAnswer() {
    const profile = { ...state.playerProfile };
    profile.totalAnswered += 1;
    
    setState({ 
        playerProfile: profile,
        quizStreak: 0 // Reset streak on wrong answer
    });
    
    saveProfile();
}

// Silent version - updates state without triggering re-render
export function recordWrongAnswerSilent() {
    const profile = { ...state.playerProfile };
    profile.totalAnswered += 1;
    
    setStateSilent({ 
        playerProfile: profile,
        quizStreak: 0,
        showAnswer: true
    });
    
    saveProfile();
}

export function recordQuizComplete(score, total) {
    const profile = { ...state.playerProfile };
    profile.quizzesCompleted += 1;
    
    const isPerfect = score === total;
    if (isPerfect) {
        profile.perfectScores += 1;
    }
    
    // Check achievements
    checkAchievement('first_quiz', profile.quizzesCompleted >= 1);
    checkAchievement('ten_quizzes', profile.quizzesCompleted >= 10);
    checkAchievement('fifty_quizzes', profile.quizzesCompleted >= 50);
    checkAchievement('first_perfect', profile.perfectScores >= 1);
    checkAchievement('five_perfect', profile.perfectScores >= 5);
    checkAchievement('ten_perfect', profile.perfectScores >= 10);
    
    // Award XP
    awardXP(XP_REWARDS.quizComplete, 'quiz_complete');
    if (isPerfect) {
        awardXP(XP_REWARDS.perfectScore, 'perfect_score');
        awardGems(25); // Bonus gems for perfect
    }
    
    // Award gems based on score
    const percentage = (score / total) * 100;
    if (percentage >= 90) awardGems(15);
    else if (percentage >= 75) awardGems(10);
    else if (percentage >= 50) awardGems(5);
    
    setState({ playerProfile: profile });
    saveProfile();
    
    return { isPerfect, xpEarned: XP_REWARDS.quizComplete + (isPerfect ? XP_REWARDS.perfectScore : 0) };
}

export function recordQuizCreate() {
    const profile = { ...state.playerProfile };
    profile.quizzesCreated += 1;
    
    checkAchievement('first_create', profile.quizzesCreated >= 1);
    checkAchievement('five_create', profile.quizzesCreated >= 5);
    
    awardXP(XP_REWARDS.createQuiz, 'create_quiz');
    
    setState({ playerProfile: profile });
    saveProfile();
}

// ==================== REWARD ANIMATIONS ====================
export function clearPendingRewards() {
    setState({
        pendingXP: 0,
        pendingAchievements: [],
        pendingLevelUp: null,
        showRewardAnimation: false
    });
}

// ==================== PERSISTENCE ====================
export function saveAuth() {
    if (state.token && state.user) {
        localStorage.setItem('qmp_token', state.token);
        localStorage.setItem('qmp_user', JSON.stringify(state.user));
    }
}

export function loadAuth() {
    const token = localStorage.getItem('qmp_token');
    const user = localStorage.getItem('qmp_user');
    if (token && user) {
        setState({ token, user: JSON.parse(user), isAuthenticated: true });
        loadProfile();
        return true;
    }
    return false;
}

export function clearAuth() {
    localStorage.removeItem('qmp_token');
    localStorage.removeItem('qmp_user');
    resetState();
    setState({ view: 'login' });
}

export function saveProfile() {
    localStorage.setItem('qmp_profile', JSON.stringify(state.playerProfile));
}

export function loadProfile() {
    try {
        const saved = localStorage.getItem('qmp_profile');
        if (saved) {
            const profile = JSON.parse(saved);
            // Merge with defaults for any new fields
            const merged = { ...initialState.playerProfile, ...profile };
            setState({ playerProfile: merged });
        } else {
            // Initialize new profile
            const profile = { ...initialState.playerProfile, joinDate: new Date().toISOString() };
            setState({ playerProfile: profile });
            saveProfile();
        }
    } catch (e) {
        console.error('Failed to load profile:', e);
    }
}

// ==================== QUIZ PROGRESS ====================
export function saveQuizProgress() {
    if (!state.currentQuiz) return;
    
    const progress = {
        quizId: state.currentQuiz.id,
        quizTitle: state.currentQuiz.title,
        questionIndex: state.currentQuestionIndex,
        answers: state.answers,
        flagged: Array.from(state.flaggedQuestions),
        studyMode: state.studyMode,
        timerEnabled: state.timerEnabled,
        timeRemaining: state.timeRemaining,
        quizStreak: state.quizStreak,
        maxQuizStreak: state.maxQuizStreak,
        matchingShuffled: state.matchingShuffled,
        randomizeOptions: state.randomizeOptions,   // NEW
        optionShuffles: state.optionShuffles,       // NEW
        timestamp: Date.now()
    };
    
    localStorage.setItem(`qmp_progress_${state.currentQuiz.id}`, JSON.stringify(progress));
    
    const allProgress = getAllInProgressQuizzes();
    const existing = allProgress.findIndex(p => p.quizId === state.currentQuiz.id);
    if (existing >= 0) {
        allProgress[existing] = { 
            quizId: progress.quizId, 
            quizTitle: progress.quizTitle, 
            timestamp: progress.timestamp, 
            questionIndex: progress.questionIndex, 
            total: state.currentQuiz.questions.length 
        };
    } else {
        allProgress.push({ 
            quizId: progress.quizId, 
            quizTitle: progress.quizTitle, 
            timestamp: progress.timestamp, 
            questionIndex: progress.questionIndex, 
            total: state.currentQuiz.questions.length 
        });
    }
    localStorage.setItem('qmp_all_progress', JSON.stringify(allProgress));
}

export function loadQuizProgress(quizId) {
    const data = localStorage.getItem(`qmp_progress_${quizId}`);
    if (!data) return null;
    
    const progress = JSON.parse(data);
    if (Date.now() - progress.timestamp > 7 * 24 * 60 * 60 * 1000) {
        clearQuizProgress(quizId);
        return null;
    }
    return progress;
}

export function clearQuizProgress(quizId) {
    localStorage.removeItem(`qmp_progress_${quizId}`);
    const allProgress = getAllInProgressQuizzes().filter(p => p.quizId !== quizId);
    localStorage.setItem('qmp_all_progress', JSON.stringify(allProgress));
}

export function getAllInProgressQuizzes() {
    try {
        return JSON.parse(localStorage.getItem('qmp_all_progress') || '[]');
    } catch {
        return [];
    }
}

// ==================== SETTINGS ====================
export function setSetting(key, value) {
    setState({ [key]: value });
    localStorage.setItem(`qmp_setting_${key}`, JSON.stringify(value));
}

export function loadSettings() {
    const settings = ['soundEnabled', 'animationsEnabled', 'theme'];
    settings.forEach(key => {
        const saved = localStorage.getItem(`qmp_setting_${key}`);
        if (saved !== null) {
            setState({ [key]: JSON.parse(saved) });
        }
    });
}

// Export constants
export { LEVELS, ACHIEVEMENTS, XP_REWARDS };