/* ============================================
   Constants - Centralized Configuration
   ============================================ */

// Time constants (in milliseconds unless specified)
export const TIME = {
    // Progress retention
    PROGRESS_RETENTION_DAYS: 7,
    PROGRESS_RETENTION_MS: 7 * 24 * 60 * 60 * 1000,
    
    // UI delays
    SEARCH_DEBOUNCE_MS: 300,
    TOAST_DURATION_MS: 3500,
    TOAST_FADE_MS: 300,
    
    // Timer thresholds (in seconds)
    TIMER_WARNING_SECONDS: 60,
    TIMER_URGENT_SECONDS: 10,
    
    // Animation delays
    STUDY_MODE_DELAY_MS: 0,
    CELEBRATION_DELAY_MS: 300,
    CONFETTI_BURST_DELAY_MS: 200,
};

// Streak thresholds
export const STREAK = {
    // In-quiz streaks
    NICE: 5,
    ON_FIRE: 10,
    UNSTOPPABLE: 15,
    LEGENDARY: 20,
    
    // Daily streaks
    DAILY_WEEK: 7,
    DAILY_TWO_WEEKS: 14,
    DAILY_MONTH: 30,
    DAILY_HUNDRED: 100,
};

// Score thresholds (percentages)
export const SCORE = {
    PERFECT: 100,
    EXCELLENT: 90,
    GREAT: 80,
    GOOD: 70,
    PASSING: 60,
    POOR: 50,
};

// Quiz limits and thresholds
export const QUIZ = {
    MAX_COMPACT_NAV_QUESTIONS: 20,
    SPEED_DEMON_QUESTIONS: 10,
    SPEED_DEMON_SECONDS: 60,
    MIN_OPTIONS: 2,
    MIN_PAIRS: 2,
    MIN_QUESTIONS: 1,
};

// Animation limits
export const ANIMATION = {
    MAX_PARTICLES: 200,
    CONFETTI_BURST_COUNT: 50,
    CONFETTI_SMALL_BURST: 20,
    FIREWORKS_BURST_COUNT: 40,
    PARTICLE_FPS_LIMIT: 60,
    PARTICLE_DECAY_RATE: 0.02,
};

// Drag and drop
export const DRAG = {
    TOUCH_MOVE_THRESHOLD: 10, // pixels before considering it a drag
};

// XP Rewards
export const XP = {
    CORRECT_ANSWER: 10,
    STREAK_BONUS: 2,
    QUIZ_COMPLETE: 50,
    PERFECT_SCORE: 100,
    DAILY_LOGIN: 25,
    CREATE_QUIZ: 75,
};

// Gem Rewards
export const GEMS = {
    PERFECT_SCORE_BONUS: 25,
    SCORE_90_PLUS: 15,
    SCORE_75_PLUS: 10,
    SCORE_50_PLUS: 5,
    LEVEL_UP_MULTIPLIER: 5, // level * 5
    ACHIEVEMENT_BONUS: 10,
};

// API Configuration
export const API = {
    MAX_RETRIES: 2,
    RETRY_DELAY_MS: 1000,
    REQUEST_TIMEOUT_MS: 30000,
};

// Local Storage Keys
export const STORAGE_KEYS = {
    TOKEN: 'qmp_token',
    USER: 'qmp_user',
    PROFILE: 'qmp_profile',
    ALL_PROGRESS: 'qmp_all_progress',
    PROGRESS_PREFIX: 'qmp_progress_',
    SETTING_PREFIX: 'qmp_setting_',
};

// Tier Colors
export const TIER_COLORS = {
    bronze: '#cd7f32',
    silver: '#c0c0c0',
    gold: '#ffd700',
    platinum: '#e5e4e2',
    diamond: '#b9f2ff',
    legendary: '#ff6b6b',
};

// Badge Colors
export const BADGE_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f97316', '#22c55e', '#14b8a6', '#3b82f6'
];

// Mobile breakpoint
export const MOBILE_BREAKPOINT = 768; // pixels

// Feature Flags (for gradual rollout)
export const FEATURES = {
    TOUCH_SUPPORT: true,
    WEB_WORKERS: false, // Enable when implemented
    OFFLINE_MODE: false, // Enable when service worker ready
    ANALYTICS: true,
};