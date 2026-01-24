/* Quiz Master Pro - Main Entry Point */
import { getState, setState, subscribe, loadAuth } from './state.js';
import { loadQuizzes, logout } from './services/api.js';
import { ExportService, ImportService, showExportModal, showImportModal } from './services/export.js';
import { showToast } from './utils/toast.js';
import { renderAuth, setAuthMode, handleAuth } from './components/auth.js';
import { renderLibrary, setSearch, setSort, setCategory, toggleMenu, confirmDelete } from './components/library.js';
import { 
    renderQuiz, startQuiz, selectOpt, checkAnswer, nextQ, prevQ, goToQ, 
    toggleFlag, exitQuiz, submitQuiz, showQuizOptions, launchQuiz,
    dragStart, dragOver, dragLeave, drop, dragEnd,
    matchDragStart, matchDragEnd, matchDragOver, matchDragLeave, matchDrop, removeMatch,
    orderDragStart, orderDragOver, orderDragLeave, orderDrop, orderDragEnd,
    selectMatchLeft, selectMatchRight, clearMatches
} from './components/quiz.js';
import { renderResults, renderReview, retryQuiz } from './components/results.js';
import { 
    renderCreate, setTitle, setCat, setData, toggleHelp, saveQuiz, editQuiz, 
    openVisual, closeVisual, selectQ, addQ, deleteQ, updateQ, updateOpt, addOpt, removeOpt, 
    toggleCorrect, saveVisual, setTFAnswer, updatePair, addPair, removePair,
    saveField, changeType, savePair, saveOption
} from './components/create.js';
import * as sounds from './utils/sounds.js';
import * as animations from './utils/animations.js';
import { renderPlayerHUD } from './utils/playerHud.js';
sounds.initAudio();
// Render based on state
function render() {
    const state = getState();
    const app = document.getElementById('app');
    if (!app) return;
    
    const views = { 
        login: renderAuth, 
        library: renderLibrary, 
        quiz: renderQuiz, 
        results: renderResults, 
        review: renderReview, 
        create: renderCreate 
    };
    
    app.innerHTML = (views[state.view] || renderAuth)();
}

subscribe(render);

// Navigation
function navigate(view) { 
    setState(view === 'library' 
        ? { view: 'library', currentQuiz: null, visualEditorMode: false } 
        : { view }
    ); 
}

// Export helpers
function exportAs(id, format) { 
    const q = getState().quizzes.find(x => x.id === parseInt(id)); 
    if (q) { 
        ExportService.export(q, format); 
        document.getElementById('export-modal')?.remove(); 
    } 
}

function showExportById(id) { 
    const q = getState().quizzes.find(x => x.id === parseInt(id)); 
    if (q) showExportModal(q); 
}

async function handleImport(file) {
    if (!file) return;
    try { 
        const data = await ImportService.fromFile(file); 
        document.getElementById('import-modal')?.remove(); 
        setState({ 
            view: 'create', 
            quizTitle: data.title, 
            quizData: '', 
            quizCategory: data.description || '', 
            parsedQuestions: data.questions, 
            visualEditorMode: true, 
            currentEditQuestion: 0, 
            editingQuizId: null 
        }); 
        showToast(`Imported ${data.questions.length} questions`, 'success'); 
    } catch (e) { 
        showToast(e.message || 'Import failed', 'error'); 
    }
}

// Global app object
window.app = { 
    // Navigation
    navigate,
    
    // Auth
    setAuthMode, handleAuth, logout,
    
    // Library
    setSearch, setSort, setCategory, toggleMenu, confirmDelete,
    showExportModal: showExportById, showImportModal, exportAs, handleImport,
    
    // Quiz
    showQuizOptions, launchQuiz, selectOpt, checkAnswer, 
    nextQ, prevQ, goToQ, toggleFlag, exitQuiz, submitQuiz,
    
    // Drag & drop (ordering)
    dragStart, dragOver, dragLeave, drop, dragEnd,
    orderDragStart, orderDragOver, orderDragLeave, orderDrop, orderDragEnd,
    
    // Drag & drop (matching)
    matchDragStart, matchDragEnd, matchDragOver, matchDragLeave, matchDrop, removeMatch,
    selectMatchLeft, selectMatchRight, clearMatches,
    
    // Results
    retryQuiz,
    
    // Create/Edit
    editQuiz, setTitle, setCat, setData, toggleHelp, saveQuiz,
    openVisual, closeVisual, selectQ, addQ, deleteQ, 
    updateQ, updateOpt, addOpt, removeOpt, toggleCorrect, saveVisual,
    setTFAnswer, updatePair, addPair, removePair,
    saveField, changeType, savePair, saveOption
};

// Keyboard shortcuts
document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    const s = getState();
    
    if (s.view === 'quiz') {
        switch (e.key) {
            case 'ArrowRight':
            case 'n':
                e.preventDefault();
                nextQ();
                break;
            case 'ArrowLeft':
            case 'p':
                e.preventDefault();
                prevQ();
                break;
            case 'f':
                e.preventDefault();
                toggleFlag();
                break;
            case '1': case '2': case '3': case '4': case '5':
                e.preventDefault();
                selectOpt(parseInt(e.key) - 1);
                break;
            case 't':
            case 'T':
                e.preventDefault();
                selectOpt(0); // True
                break;
            case 'y':
            case 'Y':
                e.preventDefault();
                selectOpt(1); // False
                break;
        }
    }
    
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        document.getElementById('user-menu')?.classList.add('hidden');
    }
});

// Close dropdown on outside click
document.addEventListener('click', e => {
    const menu = document.getElementById('user-menu');
    if (menu && !menu.classList.contains('hidden') && !e.target.closest('.dropdown')) {
        menu.classList.add('hidden');
    }
});

// Initialize
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
