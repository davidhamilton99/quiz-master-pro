/* State Management */
const initialState = {
    view: 'login', isAuthenticated: false, user: null, token: null, authMode: 'login',
    quizzes: [], searchQuery: '', sortBy: 'recent', categoryFilter: 'all',
    currentQuiz: null, currentQuestionIndex: 0, answers: [], studyMode: false, showAnswer: false,
    flaggedQuestions: new Set(), timerEnabled: false, timerMinutes: 15, timeRemaining: 0,
    streak: 0, maxStreak: 0, loading: false,
    quizTitle: '', quizData: '', quizCategory: '', editingQuizId: null,
    visualEditorMode: false, parsedQuestions: null, currentEditQuestion: 0, showFormatHelp: false
};

let state = { ...initialState };
const listeners = new Set();

export function getState() { return state; }
export function setState(updates) {
    state = { ...state, ...(typeof updates === 'function' ? updates(state) : updates) };
    listeners.forEach(fn => fn(state));
}
export function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function resetState() { state = { ...initialState }; listeners.forEach(fn => fn(state)); }

export function saveAuth() {
    if (state.token && state.user) {
        localStorage.setItem('qmp_token', state.token);
        localStorage.setItem('qmp_user', JSON.stringify(state.user));
    }
}
export function loadAuth() {
    const token = localStorage.getItem('qmp_token');
    const user = localStorage.getItem('qmp_user');
    if (token && user) { setState({ token, user: JSON.parse(user), isAuthenticated: true }); return true; }
    return false;
}
export function clearAuth() {
    localStorage.removeItem('qmp_token');
    localStorage.removeItem('qmp_user');
    resetState();
    setState({ view: 'login' });
}

// Quiz progress
export function saveQuizProgress() {
    if (!state.currentQuiz) return;
    const progress = {
        quizId: state.currentQuiz.id, quizTitle: state.currentQuiz.title,
        questionIndex: state.currentQuestionIndex, answers: state.answers,
        flagged: Array.from(state.flaggedQuestions), studyMode: state.studyMode,
        timerEnabled: state.timerEnabled, timeRemaining: state.timeRemaining,
        streak: state.streak, maxStreak: state.maxStreak, timestamp: Date.now()
    };
    localStorage.setItem(`qmp_progress_${state.currentQuiz.id}`, JSON.stringify(progress));
    updateProgressList(progress);
}
export function loadQuizProgress(quizId) {
    const data = localStorage.getItem(`qmp_progress_${quizId}`);
    if (!data) return null;
    const progress = JSON.parse(data);
    if (Date.now() - progress.timestamp > 7 * 24 * 60 * 60 * 1000) { clearQuizProgress(quizId); return null; }
    return progress;
}
export function clearQuizProgress(quizId) {
    localStorage.removeItem(`qmp_progress_${quizId}`);
    const list = getProgressList().filter(p => p.quizId !== quizId);
    localStorage.setItem('qmp_progress_list', JSON.stringify(list));
}
export function getProgressList() {
    try { return JSON.parse(localStorage.getItem('qmp_progress_list') || '[]'); } catch { return []; }
}
function updateProgressList(progress) {
    const list = getProgressList().filter(p => p.quizId !== progress.quizId);
    list.push({ quizId: progress.quizId, quizTitle: progress.quizTitle, questionIndex: progress.questionIndex, timestamp: progress.timestamp });
    localStorage.setItem('qmp_progress_list', JSON.stringify(list));
}
