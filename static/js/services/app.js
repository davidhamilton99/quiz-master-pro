/* Quiz Master Pro - Main Entry Point */

import { getState, setState, subscribe, loadAuth } from './state.js';
import { loadQuizzes, logout } from './services/api.js';
import { ExportService, ImportService, showExportModal, showImportModal } from './services/export.js';
import { showToast } from './utils/toast.js';

// Components
import { renderAuth, setAuthMode, handleAuth } from './components/auth.js';
import { renderLibrary, setSearch, setSort, setCategory, toggleMenu, confirmDelete } from './components/library.js';
import { renderQuiz, startQuiz, selectOpt, checkAnswer, nextQ, prevQ, goToQ, toggleFlag, exitQuiz, submitQuiz, showQuizOptions, launchQuiz, dragStart, dragOver, dragLeave, drop, dragEnd } from './components/quiz.js';
import { renderResults, renderReview, retryQuiz } from './components/results.js';
import { renderCreate, setTitle, setCategory as setCat, setData, toggleHelp, saveQuiz, editQuiz, openVisual, closeVisual, selectQ, addQ, deleteQ, updateQ, updateOpt, addOpt, removeOpt, toggleCorrect, saveVisual } from './components/create.js';

// Router
function render() {
    const state = getState();
    const app = document.getElementById('app');
    if (!app) return;
    
    let html = '';
    switch (state.view) {
        case 'login': html = renderAuth(); break;
        case 'library': html = renderLibrary(); break;
        case 'quiz': html = renderQuiz(); break;
        case 'results': html = renderResults(); break;
        case 'review': html = renderReview(); break;
        case 'create': html = renderCreate(); break;
        default: html = renderAuth();
    }
    
    app.innerHTML = html;
}

subscribe(render);

function navigate(view) {
    if (view === 'library') {
        setState({ view: 'library', currentQuiz: null, visualEditorMode: false });
    } else {
        setState({ view });
    }
}

// Export handlers
async function exportAs(quizId, format) {
    const state = getState();
    const quiz = state.quizzes.find(q => q.id === parseInt(quizId));
    if (quiz) {
        ExportService.exportQuiz(quiz, format);
        document.getElementById('export-modal')?.remove();
    }
}

function showExportModalById(quizId) {
    const state = getState();
    const quiz = state.quizzes.find(q => q.id === parseInt(quizId));
    if (quiz) showExportModal(quiz);
}

async function handleImportFile(file) {
    if (!file) return;
    
    try {
        const data = await ImportService.importFile(file);
        
        // Close modal
        document.getElementById('import-modal')?.remove();
        
        // Pre-fill create form
        setState({
            view: 'create',
            quizTitle: data.title,
            quizData: '',
            quizCategory: data.description,
            parsedQuestions: data.questions,
            visualEditorMode: true,
            currentEditQuestion: 0,
            editingQuizId: null
        });
        
        showToast(`Imported ${data.questions.length} questions`, 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Expose to window
window.app = {
    navigate,
    
    // Auth
    setAuthMode,
    handleAuth,
    logout,
    
    // Library
    setSearch,
    setSort,
    setCategory,
    toggleMenu,
    confirmDelete,
    showExportModal: showExportModalById,
    showImportModal,
    exportAs,
    handleImportFile,
    
    // Quiz
    showQuizOptions,
    launchQuiz,
    selectOpt,
    checkAnswer,
    nextQ,
    prevQ,
    goToQ,
    toggleFlag,
    exitQuiz,
    submitQuiz,
    dragStart,
    dragOver,
    dragLeave,
    drop,
    dragEnd,
    
    // Results
    retryQuiz,
    
    // Create
    editQuiz,
    setTitle,
    setCategory: setCat,
    setData,
    toggleHelp,
    saveQuiz,
    openVisual,
    closeVisual,
    selectQ,
    addQ,
    deleteQ,
    updateQ,
    updateOpt,
    addOpt,
    removeOpt,
    toggleCorrect,
    saveVisual
};

// Keyboard shortcuts
document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    const state = getState();
    if (state.view === 'quiz') {
        switch (e.key) {
            case 'ArrowRight': case 'n': e.preventDefault(); nextQ(); break;
            case 'ArrowLeft': case 'p': e.preventDefault(); prevQ(); break;
            case 'f': e.preventDefault(); toggleFlag(); break;
            case '1': case '2': case '3': case '4': case '5':
                e.preventDefault();
                selectOpt(parseInt(e.key) - 1);
                break;
        }
    }
    
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        document.getElementById('user-menu')?.classList.add('hidden');
    }
});

// Close menus on click outside
document.addEventListener('click', e => {
    const menu = document.getElementById('user-menu');
    if (menu && !menu.classList.contains('hidden') && !e.target.closest('.dropdown')) {
        menu.classList.add('hidden');
    }
});

// Init
async function init() {
    console.log('🚀 Quiz Master Pro starting...');
    
    if (loadAuth()) {
        setState({ view: 'library' });
        await loadQuizzes();
    }
    
    render();
    console.log('✅ Ready!');
}

init();
