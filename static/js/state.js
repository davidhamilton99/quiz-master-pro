/* ============================================
   QUIZ MASTER PRO - State Management
   Centralized state with subscription pattern
   ============================================ */

// Initial state
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
    folders: [],
    selectedFolder: 'all',
    
    // Quiz taking
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
    timerInterval: null,
    
    // Stats
    streak: 0,
    maxStreak: 0,
    
    // UI
    darkMode: true,
    loading: false,
    
    // Create/Edit
    quizTitle: '',
    quizData: '',
    quizCategory: '',
    editingQuizId: null,
    visualEditorMode: false,
    parsedQuestions: null,
    currentEditQuestion: 0,
    
    // Multiplayer
    multiplayer: {
        active: false,
        isHost: false,
        sessionCode: null,
        players: {},
        phase: 'lobby'
    }
};

// Create reactive state
let state = { ...initialState };
const listeners = new Set();

// State getter
export function getState() {
    return state;
}

// State setter - triggers re-render
export function setState(updates) {
    if (typeof updates === 'function') {
        state = { ...state, ...updates(state) };
    } else {
        state = { ...state, ...updates };
    }
    notifyListeners();
}

// Subscribe to state changes
export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// Notify all listeners
function notifyListeners() {
    listeners.forEach(listener => listener(state));
}

// Reset state (for logout)
export function resetState() {
    state = { 
        ...initialState,
        darkMode: state.darkMode // Preserve theme preference
    };
    notifyListeners();
}

// Persist auth to localStorage
export function saveAuth() {
    if (state.token && state.user) {
        localStorage.setItem('qmp_token', state.token);
        localStorage.setItem('qmp_user', JSON.stringify(state.user));
    }
}

// Load auth from localStorage
export function loadAuth() {
    const token = localStorage.getItem('qmp_token');
    const user = localStorage.getItem('qmp_user');
    
    if (token && user) {
        setState({
            token,
            user: JSON.parse(user),
            isAuthenticated: true
        });
        return true;
    }
    return false;
}

// Clear auth
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
        questionIndex: state.currentQuestionIndex,
        answers: state.answers,
        flagged: Array.from(state.flaggedQuestions),
        studyMode: state.studyMode,
        timeRemaining: state.timeRemaining,
        timestamp: Date.now()
    };
    
    localStorage.setItem(`qmp_progress_${state.currentQuiz.id}`, JSON.stringify(progress));
}

export function loadQuizProgress(quizId) {
    const data = localStorage.getItem(`qmp_progress_${quizId}`);
    if (!data) return null;
    
    const progress = JSON.parse(data);
    // Expire after 24 hours
    if (Date.now() - progress.timestamp > 24 * 60 * 60 * 1000) {
        clearQuizProgress(quizId);
        return null;
    }
    
    return progress;
}

export function clearQuizProgress(quizId) {
    if (quizId) {
        localStorage.removeItem(`qmp_progress_${quizId}`);
    } else if (state.currentQuiz) {
        localStorage.removeItem(`qmp_progress_${state.currentQuiz.id}`);
    }
}

// Folders persistence
export function saveFolders() {
    localStorage.setItem('qmp_folders', JSON.stringify(state.folders));
}

export function loadFolders() {
    const data = localStorage.getItem('qmp_folders');
    if (data) {
        setState({ folders: JSON.parse(data) });
    }
}

export default {
    getState,
    setState,
    subscribe,
    resetState,
    saveAuth,
    loadAuth,
    clearAuth,
    saveQuizProgress,
    loadQuizProgress,
    clearQuizProgress,
    saveFolders,
    loadFolders
};
