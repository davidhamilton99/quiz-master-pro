/* ============================================
   QUIZ MASTER PRO - Main Application
   Entry point and router
   ============================================ */

import { getState, setState, subscribe, loadAuth, loadFolders } from './state.js';
import { loadQuizzes, logout as apiLogout } from './services/api.js';

// Components
import { renderAuth, setAuthMode, handleAuth } from './components/auth.js';
import { renderLibrary, setSearchQuery, setSortBy, setCategoryFilter, toggleUserMenu, confirmDeleteQuiz } from './components/library.js';
import { renderQuiz, startQuiz, selectAnswer, checkStudyAnswer, nextQuestion, prevQuestion, goToQuestion, toggleFlag, exitQuiz, submitQuiz, handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd } from './components/quiz.js';
import { renderResults, renderReview, retryQuiz } from './components/results.js';
import { showQuizOptions, launchQuiz } from './components/quizOptions.js';
import { renderCreate, updateQuizTitle, updateQuizCategory, updateQuizData, toggleFormatHelp, saveQuiz, editQuiz, openVisualEditor, closeVisualEditor, selectEditQuestion, addQuestion, deleteQuestion, updateQuestion, updateOption, addOption, removeOption, toggleCorrect, saveFromVisualEditor } from './components/create.js';

// ========== ROUTER ==========
function render() {
    const state = getState();
    const app = document.getElementById('app');
    
    if (!app) return;
    
    let html = '';
    
    switch (state.view) {
        case 'login':
            html = renderAuth();
            break;
        case 'library':
            html = renderLibrary();
            break;
        case 'quiz':
            html = renderQuiz();
            break;
        case 'results':
            html = renderResults();
            break;
        case 'review':
            html = renderReview();
            break;
        case 'create':
            html = renderCreate();
            break;
        default:
            html = renderAuth();
    }
    
    app.innerHTML = html;
}

// Subscribe to state changes
subscribe(render);

// ========== NAVIGATION ==========
function navigate(view) {
    // Clean up current view if needed
    const state = getState();
    
    if (view === 'library') {
        setState({
            view: 'library',
            currentQuiz: null,
            visualEditorMode: false
        });
    } else if (view === 'results' && !state.currentQuiz) {
        setState({ view: 'library' });
    } else {
        setState({ view });
    }
}

// ========== LOGOUT ==========
function logout() {
    apiLogout();
}

// ========== EXPOSE TO WINDOW ==========
// This allows onclick handlers in HTML to call functions
window.app = {
    // Navigation
    navigate,
    
    // Auth
    setAuthMode,
    handleAuth,
    logout,
    
    // Library
    setSearchQuery,
    setSortBy,
    setCategoryFilter,
    toggleUserMenu,
    confirmDeleteQuiz,
    
    // Quiz options
    showQuizOptions,
    launchQuiz,
    
    // Quiz taking
    startQuiz,
    selectAnswer,
    checkStudyAnswer,
    nextQuestion,
    prevQuestion,
    goToQuestion,
    toggleFlag,
    exitQuiz,
    submitQuiz,
    
    // Drag & drop
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    
    // Results
    retryQuiz,
    
    // Create/Edit
    editQuiz,
    updateQuizTitle,
    updateQuizCategory,
    updateQuizData,
    toggleFormatHelp,
    saveQuiz,
    openVisualEditor,
    closeVisualEditor,
    selectEditQuestion,
    addQuestion,
    deleteQuestion,
    updateQuestion,
    updateOption,
    addOption,
    removeOption,
    toggleCorrect,
    saveFromVisualEditor
};

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener('keydown', (e) => {
    // Skip if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    const state = getState();
    
    if (state.view === 'quiz') {
        switch (e.key) {
            case 'ArrowRight':
            case 'n':
                e.preventDefault();
                nextQuestion();
                break;
            case 'ArrowLeft':
            case 'p':
                e.preventDefault();
                prevQuestion();
                break;
            case 'f':
                e.preventDefault();
                toggleFlag();
                break;
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
                e.preventDefault();
                selectAnswer(parseInt(e.key) - 1);
                break;
        }
    }
    
    if (e.key === 'Escape') {
        // Close any open modals
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        document.getElementById('user-menu')?.classList.add('hidden');
    }
});

// ========== CLICK OUTSIDE HANDLER ==========
document.addEventListener('click', (e) => {
    // Close user menu when clicking outside
    const userMenu = document.getElementById('user-menu');
    if (userMenu && !userMenu.classList.contains('hidden')) {
        if (!e.target.closest('.dropdown')) {
            userMenu.classList.add('hidden');
        }
    }
});

// ========== INITIALIZE ==========
async function init() {
    console.log('🚀 Quiz Master Pro initializing...');
    
    // Load saved auth
    if (loadAuth()) {
        setState({ view: 'library' });
        
        // Load quizzes
        try {
            await loadQuizzes();
            loadFolders();
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }
    
    // Initial render
    render();
    
    console.log('✅ Quiz Master Pro ready!');
}

// Start the app
init();
