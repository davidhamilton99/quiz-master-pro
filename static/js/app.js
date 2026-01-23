/* Quiz Master Pro - Main */
import { getState, setState, subscribe, loadAuth } from './state.js';
import { loadQuizzes, logout } from './services/api.js';
import { ExportService, ImportService, showExportModal, showImportModal } from './services/export.js';
import { showToast } from './utils/toast.js';
import { renderAuth, setAuthMode, handleAuth } from './components/auth.js';
import { renderLibrary, setSearch, setSort, setCategory, toggleMenu, confirmDelete } from './components/library.js';
import { renderQuiz, startQuiz, selectOpt, checkAnswer, nextQ, prevQ, goToQ, toggleFlag, exitQuiz, submitQuiz, showQuizOptions, launchQuiz, dragStart, dragOver, dragLeave, drop, dragEnd, selectMatchLeft, selectMatchRight, clearMatches } from './components/quiz.js';
import { renderResults, renderReview, retryQuiz } from './components/results.js';
import { renderCreate, setTitle, setCat, setData, toggleHelp, saveQuiz, editQuiz, openVisual, closeVisual, selectQ, addQ, deleteQ, updateQ, updateOpt, addOpt, removeOpt, toggleCorrect, saveVisual, setTFAnswer, updatePair, addPair, removePair } from './components/create.js';

function render() {
    const state = getState(), app = document.getElementById('app');
    if (!app) return;
    const views = { login: renderAuth, library: renderLibrary, quiz: renderQuiz, results: renderResults, review: renderReview, create: renderCreate };
    app.innerHTML = (views[state.view] || renderAuth)();
}
subscribe(render);

function navigate(view) { setState(view === 'library' ? { view: 'library', currentQuiz: null, visualEditorMode: false } : { view }); }

function exportAs(id, format) { const q = getState().quizzes.find(x => x.id === parseInt(id)); if (q) { ExportService.export(q, format); document.getElementById('export-modal')?.remove(); } }
function showExportById(id) { const q = getState().quizzes.find(x => x.id === parseInt(id)); if (q) showExportModal(q); }
async function handleImport(file) {
    if (!file) return;
    try { const data = await ImportService.fromFile(file); document.getElementById('import-modal')?.remove(); setState({ view: 'create', quizTitle: data.title, quizData: '', quizCategory: data.description || '', parsedQuestions: data.questions, visualEditorMode: true, currentEditQuestion: 0, editingQuizId: null }); showToast(`Imported ${data.questions.length} questions`, 'success'); }
    catch (e) { showToast(e.message, 'error'); }
}

window.app = { 
    navigate, setAuthMode, handleAuth, logout, 
    setSearch, setSort, setCategory, toggleMenu, confirmDelete, 
    showExportModal: showExportById, showImportModal, exportAs, handleImport, 
    showQuizOptions, launchQuiz, selectOpt, checkAnswer, nextQ, prevQ, goToQ, toggleFlag, exitQuiz, submitQuiz, 
    dragStart, dragOver, dragLeave, drop, dragEnd,
    selectMatchLeft, selectMatchRight, clearMatches,
    retryQuiz, editQuiz, setTitle, setCat, setData, toggleHelp, saveQuiz, 
    openVisual, closeVisual, selectQ, addQ, deleteQ, updateQ, updateOpt, addOpt, removeOpt, toggleCorrect, saveVisual,
    setTFAnswer, updatePair, addPair, removePair
};

document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const s = getState();
    if (s.view === 'quiz') { 
        if (e.key === 'ArrowRight' || e.key === 'n') { e.preventDefault(); nextQ(); } 
        else if (e.key === 'ArrowLeft' || e.key === 'p') { e.preventDefault(); prevQ(); } 
        else if (e.key === 'f') { e.preventDefault(); toggleFlag(); } 
        else if ('12345'.includes(e.key)) { e.preventDefault(); selectOpt(parseInt(e.key) - 1); }
        else if (e.key === 't' || e.key === 'T') { e.preventDefault(); selectOpt(0); }
        else if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); selectOpt(1); }
    }
    if (e.key === 'Escape') { document.querySelectorAll('.modal-overlay').forEach(m => m.remove()); document.getElementById('user-menu')?.classList.add('hidden'); }
});
document.addEventListener('click', e => { const m = document.getElementById('user-menu'); if (m && !m.classList.contains('hidden') && !e.target.closest('.dropdown')) m.classList.add('hidden'); });

async function init() { console.log('🚀 Starting...'); if (loadAuth()) { setState({ view: 'library' }); await loadQuizzes(); } render(); console.log('✅ Ready!'); }
init();
