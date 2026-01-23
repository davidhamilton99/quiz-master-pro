/* ============================================
   State Management - Shared by all modules
   ============================================ */

const initialState = {
    // Auth
    view: 'login',
    isAuthenticated: false,
    user: null,
    token: null,
    authMode: 'login',
    
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
    
    // Timer
    timerEnabled: false,
    timerMinutes: 15,
    timeRemaining: 0,
    
    // Stats
    streak: 0,
    maxStreak: 0,
    
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

export function getState() {
    return state;
}

export function setState(updates) {
    state = { ...state, ...(typeof updates === 'function' ? updates(state) : updates) };
    listeners.forEach(fn => fn(state));
}

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function resetState() {
    state = { ...initialState };
    listeners.forEach(fn => fn(state));
}

// Auth persistence
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

// Quiz progress persistence
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
        streak: state.streak,
        maxStreak: state.maxStreak,
        timestamp: Date.now()
    };
    
    localStorage.setItem(`qmp_progress_${state.currentQuiz.id}`, JSON.stringify(progress));
    
    // Also save to "all in progress" list
    const allProgress = getAllInProgressQuizzes();
    const existing = allProgress.findIndex(p => p.quizId === state.currentQuiz.id);
    if (existing >= 0) {
        allProgress[existing] = { quizId: progress.quizId, quizTitle: progress.quizTitle, timestamp: progress.timestamp, questionIndex: progress.questionIndex, total: state.currentQuiz.questions.length };
    } else {
        allProgress.push({ quizId: progress.quizId, quizTitle: progress.quizTitle, timestamp: progress.timestamp, questionIndex: progress.questionIndex, total: state.currentQuiz.questions.length });
    }
    localStorage.setItem('qmp_all_progress', JSON.stringify(allProgress));
}

export function loadQuizProgress(quizId) {
    const data = localStorage.getItem(`qmp_progress_${quizId}`);
    if (!data) return null;
    
    const progress = JSON.parse(data);
    // Expire after 7 days
    if (Date.now() - progress.timestamp > 7 * 24 * 60 * 60 * 1000) {
        clearQuizProgress(quizId);
        return null;
    }
    return progress;
}

export function clearQuizProgress(quizId) {
    localStorage.removeItem(`qmp_progress_${quizId}`);
    
    // Remove from all progress list
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
