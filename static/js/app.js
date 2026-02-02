/* Quiz Master Pro - Main Entry Point - FIXED with Export */
import { getState, setState, subscribe, loadAuth, loadProfile, loadSettings } from './state.js';
import { loadQuizzes, logout, createQuiz } from './services/api.js';
import { ExportService, ImportService, showExportModal, showImportModal } from './services/export.js';
import { showToast } from './utils/toast.js';
import { showLoading, hideLoading } from './utils/dom.js';
import { renderAuth, setAuthMode, handleAuth } from './components/auth.js';
import { renderLibrary, setSearch, setSort, setCategory, toggleMenu, confirmDelete } from './components/library.js';
import {
    renderQuiz, startQuiz, selectOption, selectTF, checkMultipleChoiceAnswer, toggleMultiSelect, 
    nextQuestion, prevQuestion, goToQuestion, toggleFlag, exitQuiz, submitQuiz, stopTimer,
    selectMatchLeft, selectMatchRight, unmatchItem, clearAllMatches, 
    moveOrderItem, initQuizHandlers, checkMatchingAnswer, checkOrderingAnswer
} from './components/quiz.js';
import { renderResults, renderReview, retryQuiz, reviewQuiz, setReviewFilter, animateScoreCounter } from './components/results.js';
import {
    renderCreate, setTitle, setCat, setData, toggleHelp, saveQuiz, editQuiz,
    openVisual, closeVisual, selectQ, addQ, deleteQ, updateQ, updateOpt, addOpt,
    toggleCorrect, saveVisual, setTFAnswer, updatePair, addPair, removePair,
    saveField, changeType, savePair, saveOption
} from './components/create.js';

// Import sounds, animations, and playerHUD
import * as sounds from './utils/sounds.js';
import * as animations from './utils/animations.js';
import { renderPlayerHUD, renderLevelUpModal, renderAchievementUnlock } from './utils/playerHud.js';
import { copyCode, showImageModal } from './components/quiz.js';
import { clearImage, previewImage } from './components/create.js';
// Make sounds and animations available globally for quiz.js to use
window.sounds = sounds;
window.animations = animations;

// Initialize audio on first user interaction
sounds.initAudio();

const app = document.getElementById('app');

// ==================== EXPORT/IMPORT HANDLERS ====================

async function exportAs(quizId, format) {
    const state = getState();
    const quiz = state.quizzes.find(q => q.id === quizId);
    if (!quiz) {
        showToast('Quiz not found', 'error');
        return;
    }
    
    try {
        ExportService.export(quiz, format);
        // Close the modal after export
        const modal = document.getElementById('export-modal');
        if (modal) modal.remove();
    } catch (error) {
        console.error('Export failed:', error);
        showToast('Export failed', 'error');
    }
}

async function handleImport(file) {
    if (!file) return;
    
    try {
        showLoading();
        const quizData = await ImportService.fromFile(file);
        
        // Create the quiz
        await createQuiz(quizData);
        
        // Close modal
        const modal = document.getElementById('import-modal');
        if (modal) modal.remove();
        
        hideLoading();
        showToast('Quiz imported successfully!', 'success');
    } catch (error) {
        hideLoading();
        console.error('Import failed:', error);
        showToast('Import failed: ' + error.message, 'error');
    }
}

// ==================== QUIZ OPTIONS MODAL ====================

function showQuizOptions(quizId) {
    const state = getState();
    const quiz = state.quizzes.find(q => q.id === quizId);
    if (!quiz) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Start Quiz</h2>
                <button class="btn btn-ghost btn-icon" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <div class="modal-body">
                <h3 style="margin-bottom: 1rem;">${quiz.title}</h3>
                <p class="text-muted mb-4">${quiz.questions?.length || 0} questions</p>
                
                <div class="form-group">
                    <label class="flex items-center gap-2">
                        <input type="checkbox" id="study-mode-toggle" checked>
                        <span>Study Mode</span>
                    </label>
                    <p class="helper-text">See answers immediately after each question</p>
                </div>
                
                <div class="form-group">
                    <label class="flex items-center gap-2">
                        <input type="checkbox" id="randomize-toggle">
                        <span>Randomize Options</span>
                    </label>
                    <p class="helper-text">Shuffle answer choices to prevent memorizing positions</p>
                </div>
                
                <div class="form-group">
                    <label class="flex items-center gap-2">
                        <input type="checkbox" id="timer-toggle">
                        <span>Enable Timer</span>
                    </label>
                </div>
                
                <div class="form-group" id="timer-options" style="display: none;">
                    <label>Time Limit (minutes)</label>
                    <input type="number" class="input" id="timer-minutes" value="15" min="1" max="180">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="window.app.launchQuiz(${quizId})">Start Quiz</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Toggle timer options visibility
    const timerToggle = modal.querySelector('#timer-toggle');
    const timerOptions = modal.querySelector('#timer-options');
    timerToggle.addEventListener('change', () => {
        timerOptions.style.display = timerToggle.checked ? 'block' : 'none';
    });
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function launchQuiz(quizId) {
    const modal = document.querySelector('.modal-overlay');
    const studyMode = modal?.querySelector('#study-mode-toggle')?.checked ?? true;
    const randomizeOptions = modal?.querySelector('#randomize-toggle')?.checked ?? false;  // NEW
    const timed = modal?.querySelector('#timer-toggle')?.checked ?? false;
    const minutes = parseInt(modal?.querySelector('#timer-minutes')?.value) || 15;
    
    if (modal) modal.remove();
    
    startQuiz(quizId, { studyMode, randomizeOptions, timed, minutes });  // Pass new option
}

// ==================== PENDING REWARDS ====================

function showPendingRewards() {
    const state = getState();
    
    // Show level up modal
    if (state.pendingLevelUp) {
        if (window.sounds) window.sounds.playLevelUp();
        if (window.animations) window.animations.showLevelUpEffect();
        
        const modal = document.createElement('div');
        modal.innerHTML = renderLevelUpModal(state.pendingLevelUp);
        document.body.appendChild(modal.firstElementChild);
        
        setState({ pendingLevelUp: null });
        return; // Show one at a time
    }
    
    // Show achievement modals
    if (state.pendingAchievements && state.pendingAchievements.length > 0) {
        const achievement = state.pendingAchievements[0];
        if (window.sounds) window.sounds.playAchievement();
        if (window.animations) window.animations.showAchievementEffect();
        
        const modal = document.createElement('div');
        modal.innerHTML = renderAchievementUnlock(achievement);
        document.body.appendChild(modal.firstElementChild);
        
        setState({ 
            pendingAchievements: state.pendingAchievements.slice(1)
        });
    }
}

// Make it available globally
window.showPendingRewards = showPendingRewards;

// ==================== RENDER ====================

function render() {
    const state = getState();
    
    let content = '';
    let showHUD = false;
    
    switch (state.view) {
        case 'login':
        case 'register':
            content = renderAuth();
            break;
        case 'library':
            showHUD = true;
            content = renderLibrary();
            break;
        case 'quiz':
            // Quiz has its own streak display, no top HUD needed
            content = renderQuiz();
            
            // Initialize matching/ordering handlers after render
            setTimeout(() => {
                if (window.app.initQuizHandlers) {
                    window.app.initQuizHandlers();
                }
            }, 50);
            break;
        case 'results':
            showHUD = true;
            content = renderResults();
            // Animate score counter after render
            setTimeout(animateScoreCounter, 100);
            break;
        case 'review':
            content = renderReview();
            break;
        case 'create':
            showHUD = true;
            content = renderCreate();
            break;
        default:
            showHUD = true;
            content = renderLibrary();
    }
    
    // Wrap content with HUD if needed
    if (showHUD && state.isAuthenticated) {
        app.innerHTML = renderPlayerHUD() + content;
    } else {
        app.innerHTML = content;
    }
    
    // Check for pending rewards after render
    if (state.pendingLevelUp || (state.pendingAchievements && state.pendingAchievements.length > 0)) {
        setTimeout(showPendingRewards, 500);
    }
}

// Subscribe to state changes
subscribe(render);

// ==================== KEYBOARD SHORTCUTS ====================

document.addEventListener('keydown', (e) => {
    const state = getState();
    if (state.view !== 'quiz') return;
    
    // Don't intercept if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    const q = state.currentQuiz?.questions[state.currentQuestionIndex];
    if (!q) return;
    
    // Number keys 1-9 for options
    if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1;
        if (q.type === 'truefalse') {
            if (e.key === '1') selectTF(true);
            else if (e.key === '2') selectTF(false);
        } else if (q.options && idx < q.options.length) {
            selectOption(idx);
        }
    }
    
    // T/Y for True, F/N for False
    if (q.type === 'truefalse') {
        if (e.key.toLowerCase() === 't' || e.key.toLowerCase() === 'y') selectTF(true);
        if (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'n') selectTF(false);
    }
    
    // Arrow keys for navigation
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (state.currentQuestionIndex < state.currentQuiz.questions.length - 1) {
            nextQuestion();
        }
    }
    if (e.key === 'ArrowLeft') {
        prevQuestion();
    }
    
    // Escape to exit
    if (e.key === 'Escape') {
        exitQuiz();
    }
});

// ==================== GLOBAL APP OBJECT ====================

window.app = {
    // Navigation
    navigate: (view) => setState({ view }),
    
    // Auth
    setAuthMode,
    handleAuth,
    logout: () => { logout(); setState({ view: 'login', isAuthenticated: false }); },
    
    // Library
    setSearch,
    setSort,
    setCategory,
    toggleMenu,
    confirmDelete,
    
    // Export/Import - FIXED
    showExportModal: (quizId) => {
        const state = getState();
        const quiz = state.quizzes.find(q => q.id === quizId);
        if (quiz) showExportModal(quiz);
    },
    showImportModal,
    exportAs,
    handleImport,
    
    // Quiz
    showQuizOptions,
    launchQuiz,
    startQuiz,
    selectOption,
    selectTF,
    checkMultipleChoiceAnswer,
    toggleMultiSelect,
    nextQuestion,
    prevQuestion,
    goToQuestion,
    toggleFlag,
    exitQuiz,
    submitQuiz,
    
    // Matching & Ordering (tap-to-select system)
    selectMatchLeft,
    selectMatchRight,
    unmatchItem,
    clearAllMatches,
    moveOrderItem,
    initQuizHandlers,
    checkMatchingAnswer,
    checkOrderingAnswer,
    
    // Results
    retryQuiz,
    reviewQuiz,
    setReviewFilter,
    
    // Create
    setTitle,
    setCat,
    setData,
    toggleHelp,
    saveQuiz,
    editQuiz,
    openVisual,
    closeVisual,
    selectQ,
    addQ,
    deleteQ,
    updateQ,
    updateOpt,
    addOpt,
    toggleCorrect,
    saveVisual,
    setTFAnswer,
    updatePair,
    addPair,
    removePair,
    saveField,
    changeType,
    savePair,
    saveOption,
    
    // Rewards
    showPendingRewards,
};

// ==================== INITIALIZE ====================

async function init() {
    // Load settings
    loadSettings();
    
    // Try to restore auth session
    if (loadAuth()) {
        loadProfile();
        setState({ view: 'library' });
        try {
            const quizzes = await loadQuizzes();
            setState({ quizzes });
        } catch (e) {
            console.error('Failed to load quizzes:', e);
        }
    } else {
        setState({ view: 'login' });
    }
    
    render();
}

init();