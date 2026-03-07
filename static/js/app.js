/* Quiz Master Pro - Main Entry Point */
import { getState, setState, subscribe, loadAuth, loadProfile, loadSettings, loadInProgressQuizzes } from './state.js';
import { loadQuizzes, logout, createQuiz, logEvent, getBookmarks, addBookmark, removeBookmark } from './services/api.js';
import { ExportService, ImportService, showExportModal, showImportModal } from './services/export.js';
import { showToast } from './utils/toast.js';
import { showLoading, hideLoading } from './utils/dom.js';
import { icon } from './utils/icons.js';
import { showModal, confirmModal } from './utils/modal.js';
// ── Static imports (core + frequently-used components) ──
import { renderAuth, setAuthMode, handleAuth } from './components/auth.js';
import { renderProfile } from './components/profile.js';
import {
    renderLibrary, setSearch, setSearchImmediate, handleSearchInput, clearSearch,
    setSort, setCategory, clearFilters, toggleMenu,
    confirmDelete, setViewMode, openStudyModal, closeStudyModal, toggleCardMenu,
    showShareSettings, setStudyTab
} from './components/library-v3.js';
import { renderHome, resetHomeCache } from './components/home.js';
import { renderMissionControl, renderMCNav, resetMissionControl, refreshSession, switchSessionCert, showExamDateModal, saveExamDate } from './components/mission-control.js';
import { renderOnboardingV2, needsImmersiveOnboarding, onboardingSearch, onboardingSelectCert, onboardingSetDate, onboardingSkipDate, onboardingFinish, onboardingSkipAll, resetOnboardingV2 } from './components/onboarding-v2.js';
import { startDomainQuiz as sessionStartDomainQuiz, invalidateSession } from './components/session.js';
import { renderCommunity, setCommunityFilter, setCommunitySearch } from './components/community.js';
import { renderReadiness, setReadinessTab, setWorkspaceView, selectReadinessCert, setObjectiveConfidence, toggleObjectiveDomain } from './components/readiness.js';
import { renderDashboard, loadStudyStats } from './components/dashboard.js';
import { renderCertPicker } from './components/certPicker.js';
import {
    getUserCertifications, enrollCertification, unenrollCertification,
    getCertPerformance, getCertTrends, getWeakQuestions, getCertification,
    getCertifications,
    startSimulation as apiStartSimulation,
    startDiagnostic as apiStartDiagnostic
} from './services/api.js';
import { renderLanding, scrollToHowItWorks } from './components/landing.js';
import {
    renderOnboarding, shouldShowOnboarding, startOnboarding,
    completeOnboarding, onboardingNext, onboardingBack, onboardingSkip
} from './components/onboarding.js';

// ── Lazy-loaded component cache (heavy, infrequently used modules) ──
const _mods = {};
async function loadMod(name) {
    if (_mods[name]) return _mods[name];
    const paths = {
        quiz:       './components/quiz.js',
        results:    './components/results.js',
        create:     './components/create.js',
        wizard:     './components/wizard.js',
        flashcards: './components/flashcards.js',
        srsReview:  './components/srsReview.js',
        studyGuide: './components/studyGuide.js',
    };
    _mods[name] = await import(paths[name]);
    return _mods[name];
}

// Loading placeholder for first-time component loads
const LOADING_HTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:60vh"><div class="spinner"></div></div>';

const app = document.getElementById('app');

// ==================== LAZY CSS LOADER ====================

const _loadedCSS = new Set();
function loadCSS(href) {
    if (_loadedCSS.has(href)) return;
    _loadedCSS.add(href);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
}

const VIEW_CSS = {
    'landing':         '/static/css/landing.css',
    'flashcards':      '/static/css/flashcards.css',
    'library':         '/static/css/library-v3.css',
    'study':           '/static/css/library-v3.css',
    'dashboard':       '/static/css/dashboard.css',
    'mission-control': '/static/css/mission-control.css',
    'readiness':       '/static/css/mission-control.css',
    'cert-picker':     '/static/css/mission-control.css',
    'community':       '/static/css/mission-control.css',
};

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
        const modal = document.getElementById('export-modal');
        if (modal) modal.remove();
    } catch (error) {
        showToast('Export failed', 'error');
    }
}

async function handleImport(file) {
    if (!file) return;
    
    try {
        showLoading();
        const quizData = await ImportService.fromFile(file);
        await createQuiz(quizData);
        
        const modal = document.getElementById('import-modal');
        if (modal) modal.remove();
        
        hideLoading();
        showToast('Quiz imported successfully!', 'success');
    } catch (error) {
        hideLoading();
        showToast('Import failed: ' + error.message, 'error');
    }
}

// ==================== QUIZ OPTIONS MODAL ====================

function showQuizOptions(quizId) {
    const state = getState();
    const quiz = state.quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    showModal({
        title: 'Start Quiz',
        body: `
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
                    <span>Shuffle Choices</span>
                </label>
                <p class="helper-text">Randomize answer order to prevent memorization</p>
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
        `,
        footer: `
            <button class="btn btn-secondary" data-modal-close>Cancel</button>
            <button class="btn btn-primary" onclick="window.app.launchQuiz(${quizId})">Start Quiz</button>
        `,
        onMount(overlay) {
            const timerToggle = overlay.querySelector('#timer-toggle');
            const timerOptions = overlay.querySelector('#timer-options');
            timerToggle.addEventListener('change', () => {
                timerOptions.style.display = timerToggle.checked ? 'block' : 'none';
            });
        },
    });
}

async function launchQuiz(quizId) {
    const modal = document.querySelector('.modal-overlay');
    const studyMode = modal?.querySelector('#study-mode-toggle')?.checked ?? true;
    const randomizeOptions = modal?.querySelector('#randomize-toggle')?.checked ?? false;
    const timed = modal?.querySelector('#timer-toggle')?.checked ?? false;
    const minutes = parseInt(modal?.querySelector('#timer-minutes')?.value) || 15;

    if (modal) modal.remove();
    const m = await loadMod('quiz');
    m.startQuiz(quizId, { studyMode, randomizeOptions, timed, minutes });
}

// ==================== CREATE OPTIONS MODAL ====================

function showCreateOptions() {
    showModal({
        title: 'Create New Quiz',
        body: `
            <p class="text-muted mb-4">How would you like to create your quiz?</p>

            <div class="create-options">
                <button class="create-option" onclick="window.app.startWizard()">
                    <div class="create-option-icon">${icon('bot', 'icon-2xl')}</div>
                    <div class="create-option-content">
                        <h3>AI-Assisted</h3>
                        <p>Get step-by-step help using ChatGPT or Claude to generate questions from your notes</p>
                    </div>
                    <span class="create-option-badge">Recommended</span>
                </button>

                <button class="create-option" onclick="window.app.startManualCreate()">
                    <div class="create-option-icon">${icon('penLine', 'icon-2xl')}</div>
                    <div class="create-option-content">
                        <h3>Manual Entry</h3>
                        <p>Type or paste questions directly using our text format or visual editor</p>
                    </div>
                </button>
            </div>
        `,
    });
}

async function startWizard() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
    const m = await loadMod('wizard');
    m.resetWizard();
    setState({ view: 'wizard' });
}

function startManualCreate() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
    setState({ view: 'create', editingQuizId: null, quizTitle: '', quizCategory: '', quizData: '' });
}

// ==================== RENDER ====================

let _lastView = null;

function render() {
    try {
        renderInternal();
    } catch (err) {
        console.error('Render error:', err);
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:1rem;color:#f8fafc;font-family:sans-serif;">
                    <h2 style="margin:0">Something went wrong</h2>
                    <p style="margin:0;color:#94a3b8;">Please reload the page to continue.</p>
                    <button onclick="location.reload()" style="padding:0.5rem 1.5rem;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:1rem;">Reload</button>
                </div>`;
        }
    }
}

function renderInternal() {
    const state = getState();
    let content = '';
    let wrapInShell = false; // true → wrap in mc-page shell with MC nav

    // Lazy-load CSS for current view
    const cssHref = VIEW_CSS[state.view];
    if (cssHref) loadCSS(cssHref);

    switch (state.view) {
        // ── Unauthenticated views (no shell) ──
        case 'landing':
            content = renderLanding();
            break;
        case 'login':
        case 'register':
            content = renderAuth();
            break;

        // ── Lazy-loaded full-screen views ──
        case 'quiz':
            if (!_mods.quiz) {
                content = LOADING_HTML;
                loadMod('quiz').then(() => render());
                break;
            }
            content = _mods.quiz.renderQuiz();
            setTimeout(() => {
                if (_mods.quiz?.initQuizHandlers) {
                    _mods.quiz.initQuizHandlers();
                }
            }, 50);
            break;
        case 'results':
            if (!_mods.results) { content = LOADING_HTML; loadMod('results').then(() => render()); break; }
            content = _mods.results.renderResults();
            setTimeout(() => _mods.results?.animateScoreCounter?.(), 100);
            break;
        case 'review':
            if (!_mods.results) { content = LOADING_HTML; loadMod('results').then(() => render()); break; }
            content = _mods.results.renderReview();
            break;
        case 'create':
            if (!_mods.create) { content = LOADING_HTML; loadMod('create').then(() => render()); break; }
            content = _mods.create.renderCreate();
            break;
        case 'wizard':
            if (!_mods.wizard) { content = LOADING_HTML; loadMod('wizard').then(() => render()); break; }
            content = _mods.wizard.renderWizard();
            break;
        case 'studyGuide':
            if (!_mods.studyGuide) { content = LOADING_HTML; loadMod('studyGuide').then(() => render()); break; }
            content = _mods.studyGuide.renderStudyGuide();
            setTimeout(() => _mods.studyGuide?.initStudyGuideDragDrop?.(), 50);
            break;
        case 'flashcards':
            if (!_mods.flashcards) { content = LOADING_HTML; loadMod('flashcards').then(() => render()); break; }
            content = _mods.flashcards.renderFlashcards();
            break;
        case 'srsReview':
            if (!_mods.srsReview) { content = LOADING_HTML; loadMod('srsReview').then(() => render()); break; }
            content = _mods.srsReview.renderSrsReview();
            break;
        case 'onboarding-v2':
            content = renderOnboardingV2();
            break;

        // ── Shell views (wrapped in mc-page with hamburger nav) ──
        case 'home':
            content = renderHome();
            wrapInShell = true;
            break;
        case 'mission-control':
            content = renderMissionControl();
            wrapInShell = true;
            break;
        case 'profile':
            content = renderProfile();
            wrapInShell = true;
            break;
        case 'library':
        case 'study':
            content = renderLibrary();
            wrapInShell = true;
            break;
        case 'readiness':
            content = renderReadiness();
            wrapInShell = true;
            break;
        case 'community':
            content = renderCommunity();
            wrapInShell = true;
            break;
        case 'dashboard':
            content = renderDashboard();
            wrapInShell = true;
            break;
        default:
            if (state.isAuthenticated) {
                content = renderMissionControl();
                wrapInShell = true;
            } else {
                content = renderLanding();
            }
    }

    if (wrapInShell) {
        content = `<div class="mc-page">${renderMCNav(state.view)}${content}</div>`;
    }

    // Replay view transition animation on navigation
    const currentView = state.view;
    if (_lastView !== currentView) {
        app.style.animation = 'none';
        app.offsetHeight; // force reflow
        app.style.animation = '';
        _lastView = currentView;
    }

    app.innerHTML = content + renderOnboarding();
}

// Subscribe to state changes
subscribe(render);

// ==================== KEYBOARD SHORTCUTS ====================

document.addEventListener('keydown', (e) => {
    const state = getState();
    if (state.view !== 'quiz') return;
    
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    const q = state.currentQuiz?.questions[state.currentQuestionIndex];
    if (!q) return;
    
    const qm = _mods.quiz;
    if (!qm) return;

    if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1;
        if (q.type === 'truefalse') {
            if (e.key === '1') qm.selectTF(true);
            else if (e.key === '2') qm.selectTF(false);
        } else if (q.options && idx < q.options.length) {
            qm.selectOption(idx);
        }
    }

    if (q.type === 'truefalse') {
        if (e.key.toLowerCase() === 't' || e.key.toLowerCase() === 'y') qm.selectTF(true);
        if (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'n') qm.selectTF(false);
    }

    if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (state.currentQuestionIndex < state.currentQuiz.questions.length - 1) {
            qm.nextQuestion();
        }
    }
    if (e.key === 'ArrowLeft') {
        qm.prevQuestion();
    }

    if (e.key === 'Escape') {
        qm.exitQuiz();
    }
});

// ==================== GLOBAL APP OBJECT ====================

window.app = {
    // Navigation
    navigate: (view) => setState({ view }),

    // Auth
    setAuthMode,
    handleAuth,
    logout: () => { logout(); setState({ view: 'landing', isAuthenticated: false }); },

    // Bookmarks
    toggleBookmark: async (questionId) => {
        const state = getState();
        const set = new Set(state.bookmarkedQuestions);
        if (set.has(questionId)) {
            set.delete(questionId);
            await removeBookmark(questionId).catch(() => {});
            setState({
                bookmarkedQuestions: set,
                bookmarks: state.bookmarks.filter(b => b.question_id !== questionId),
            });
        } else {
            set.add(questionId);
            const result = await addBookmark(questionId).catch(() => ({}));
            setState({
                bookmarkedQuestions: set,
                bookmarks: [...state.bookmarks, { question_id: questionId, id: result?.id }],
            });
        }
    },

    // Password strength meter
    updatePwdStrength: (pw) => {
        const el = document.getElementById('pwd-strength');
        if (!el) return;
        const hasUpper = /[A-Z]/.test(pw);
        const hasNum   = /[0-9]/.test(pw);
        const hasSpec  = /[^A-Za-z0-9]/.test(pw);
        const score    = (pw.length >= 8 ? 1 : 0) + (pw.length >= 12 ? 1 : 0)
                       + (hasUpper ? 1 : 0) + (hasNum ? 1 : 0) + (hasSpec ? 1 : 0);
        el.className = 'pwd-strength ' + (score <= 2 ? 'pwd-weak' : score <= 3 ? 'pwd-ok' : 'pwd-strong');
    },

    // Landing page
    scrollToHowItWorks,

    // Study Hub (was Library)
    setSearch,
    setSearchImmediate,
    handleSearchInput,
    clearSearch,
    setSort,
    setCategory,
    clearFilters,
    toggleMenu,
    confirmDelete,
    setViewMode,
    openStudyModal,
    closeStudyModal,
    toggleCardMenu,
    showShareSettings,
    setStudyTab,

    // Community
    setCommunityFilter,
    setCommunitySearch,
    clearCommunitySearch: () => setCommunitySearch(''),
    copyQuizToLibrary: async (quizId) => {
        const { copyQuizToLibrary, loadQuizzes } = await import('./services/api.js');
        try {
            await copyQuizToLibrary(quizId);
            await loadQuizzes();
            showToast('Quiz copied to your library!', 'success');
        } catch (e) {
            showToast(e.message || 'Failed to copy quiz', 'error');
        }
    },
    studyCommunityQuiz: async (quizId) => {
        const { getQuiz } = await import('./services/api.js');
        try {
            showLoading();
            const quiz = await getQuiz(quizId);
            hideLoading();
            // Store in a separate preview field so it never appears in the user's own library
            setState({ communityQuizPreview: quiz }, true);
            openStudyModal(quiz.id);
        } catch (e) {
            hideLoading();
            showToast('Could not load quiz', 'error');
        }
    },

    // Readiness
    setReadinessTab,
    setWorkspaceView,
    selectReadinessCert,
    setObjectiveConfidence,
    toggleObjectiveDomain,

    // Create options
    showCreateOptions,
    startWizard,
    startManualCreate,
    
    // Wizard (lazy-loaded)
    wizardSetTitle: (...a) => _mods.wizard?.wizardSetTitle?.(...a),
    wizardSetCategory: (...a) => _mods.wizard?.wizardSetCategory?.(...a),
    wizardToggleType: (...a) => _mods.wizard?.wizardToggleType?.(...a),
    wizardToggleCode: (...a) => _mods.wizard?.wizardToggleCode?.(...a),
    wizardSetCount: (...a) => _mods.wizard?.wizardSetCount?.(...a),
    wizardAdjustCount: (...a) => _mods.wizard?.wizardAdjustCount?.(...a),
    wizardNext: (...a) => _mods.wizard?.wizardNext?.(...a),
    wizardBack: (...a) => _mods.wizard?.wizardBack?.(...a),
    wizardSetContent: (...a) => _mods.wizard?.wizardSetContent?.(...a),
    wizardPreviewContent: (...a) => _mods.wizard?.wizardPreviewContent?.(...a),
    wizardCopyPrompt: (...a) => _mods.wizard?.wizardCopyPrompt?.(...a),
    wizardFinish: (...a) => _mods.wizard?.wizardFinish?.(...a),
    exitWizard: (...a) => _mods.wizard?.exitWizard?.(...a),
    
    // Export/Import
    showExportModal: (quizId) => {
        const state = getState();
        const quiz = state.quizzes.find(q => q.id === quizId);
        if (quiz) showExportModal(quiz);
    },
    showImportModal,
    exportAs,
    handleImport,

    // Profile
    showChangePassword: () => showToast('Password change coming soon', 'info'),

    // Quiz (lazy-loaded)
    showQuizOptions,
    launchQuiz,
    startQuiz: (...a) => _mods.quiz?.startQuiz?.(...a),
    selectOption: (...a) => _mods.quiz?.selectOption?.(...a),
    selectTF: (...a) => _mods.quiz?.selectTF?.(...a),
    checkMultipleChoiceAnswer: (...a) => _mods.quiz?.checkMultipleChoiceAnswer?.(...a),
    toggleMultiSelect: (...a) => _mods.quiz?.toggleMultiSelect?.(...a),
    nextQuestion: (...a) => _mods.quiz?.nextQuestion?.(...a),
    prevQuestion: (...a) => _mods.quiz?.prevQuestion?.(...a),
    goToQuestion: (...a) => _mods.quiz?.goToQuestion?.(...a),
    toggleFlag: (...a) => _mods.quiz?.toggleFlag?.(...a),
    exitQuiz: (...a) => _mods.quiz?.exitQuiz?.(...a),
    submitQuiz: (...a) => _mods.quiz?.submitQuiz?.(...a),
    selectMatchLeft: (...a) => _mods.quiz?.selectMatchLeft?.(...a),
    selectMatchRight: (...a) => _mods.quiz?.selectMatchRight?.(...a),
    unmatchItem: (...a) => _mods.quiz?.unmatchItem?.(...a),
    removeMatch: (...a) => _mods.quiz?.removeMatch?.(...a),
    clearAllMatches: (...a) => _mods.quiz?.clearAllMatches?.(...a),
    moveOrderItem: (...a) => _mods.quiz?.moveOrderItem?.(...a),
    initQuizHandlers: (...a) => _mods.quiz?.initQuizHandlers?.(...a),
    checkMatchingAnswer: (...a) => _mods.quiz?.checkMatchingAnswer?.(...a),
    checkOrderingAnswer: (...a) => _mods.quiz?.checkOrderingAnswer?.(...a),

    // Results (lazy-loaded)
    retryQuiz: (...a) => _mods.results?.retryQuiz?.(...a),
    reviewQuiz: (...a) => _mods.results?.reviewQuiz?.(...a),
    setReviewFilter: (...a) => _mods.results?.setReviewFilter?.(...a),

    // Create (lazy-loaded)
    setTitle: (...a) => _mods.create?.setTitle?.(...a),
    setCat: (...a) => _mods.create?.setCat?.(...a),
    setData: (...a) => _mods.create?.setData?.(...a),
    toggleHelp: (...a) => _mods.create?.toggleHelp?.(...a),
    saveQuiz: async (...a) => { const m = await loadMod('create'); m.saveQuiz(...a); },
    editQuiz: async (...a) => { const m = await loadMod('create'); m.editQuiz(...a); },
    openVisual: (...a) => _mods.create?.openVisual?.(...a),
    closeVisual: (...a) => _mods.create?.closeVisual?.(...a),
    selectQ: (...a) => _mods.create?.selectQ?.(...a),
    addQ: (...a) => _mods.create?.addQ?.(...a),
    deleteQ: (...a) => _mods.create?.deleteQ?.(...a),
    updateQ: (...a) => _mods.create?.updateQ?.(...a),
    updateOpt: (...a) => _mods.create?.updateOpt?.(...a),
    addOpt: (...a) => _mods.create?.addOpt?.(...a),
    toggleCorrect: (...a) => _mods.create?.toggleCorrect?.(...a),
    saveVisual: (...a) => _mods.create?.saveVisual?.(...a),
    setTFAnswer: (...a) => _mods.create?.setTFAnswer?.(...a),
    updatePair: (...a) => _mods.create?.updatePair?.(...a),
    addPair: (...a) => _mods.create?.addPair?.(...a),
    removePair: (...a) => _mods.create?.removePair?.(...a),
    saveField: (...a) => _mods.create?.saveField?.(...a),
    changeType: (...a) => _mods.create?.changeType?.(...a),
    savePair: (...a) => _mods.create?.savePair?.(...a),
    saveOption: (...a) => _mods.create?.saveOption?.(...a),
    removeOpt: (...a) => _mods.create?.removeOpt?.(...a),
    previewImage: (...a) => _mods.create?.previewImage?.(...a),
    clearImage: (...a) => _mods.create?.clearImage?.(...a),
    toggleOptionExplanations: (...a) => _mods.create?.toggleOptionExplanations?.(...a),
    saveOptionExplanation: (...a) => _mods.create?.saveOptionExplanation?.(...a),

    // Study Guide (lazy-loaded)
    sgHandleFile: (...a) => _mods.studyGuide?.sgHandleFile?.(...a),
    sgClearFile: (...a) => _mods.studyGuide?.sgClearFile?.(...a),
    sgGenerate: (...a) => _mods.studyGuide?.sgGenerate?.(...a),
    sgOpen: (...a) => _mods.studyGuide?.sgOpen?.(...a),
    sgDownload: (...a) => _mods.studyGuide?.sgDownload?.(...a),
    sgReset: (...a) => _mods.studyGuide?.sgReset?.(...a),

    // Flashcards (lazy-loaded)
    startFlashcards: async (quizId) => {
        const { getQuiz } = await import('./services/api.js');
        const m = await loadMod('flashcards');
        const quiz = await getQuiz(quizId);
        m.initFlashcards(quiz);
    },
    fcFlip: (...a) => _mods.flashcards?.fcFlip?.(...a),
    fcNext: (...a) => _mods.flashcards?.fcNext?.(...a),
    fcPrev: (...a) => _mods.flashcards?.fcPrev?.(...a),
    fcRate: (...a) => _mods.flashcards?.fcRate?.(...a),
    fcShuffle: (...a) => _mods.flashcards?.fcShuffle?.(...a),
    fcRestart: (...a) => _mods.flashcards?.fcRestart?.(...a),
    fcStudyMissed: (...a) => _mods.flashcards?.fcStudyMissed?.(...a),
    fcGoToCard: (...a) => _mods.flashcards?.fcGoToCard?.(...a),
    fcToggleMenu: (...a) => _mods.flashcards?.fcToggleMenu?.(...a),
    fcToggleShortcuts: (...a) => _mods.flashcards?.fcToggleShortcuts?.(...a),
    exitFlashcards: (...a) => _mods.flashcards?.exitFlashcards?.(...a),
    fcTouchStart: (...a) => _mods.flashcards?.fcTouchStart?.(...a),
    fcTouchMove: (...a) => _mods.flashcards?.fcTouchMove?.(...a),
    fcTouchEnd: (...a) => _mods.flashcards?.fcTouchEnd?.(...a),
    

    // Onboarding (legacy)
    onboardingNext,
    onboardingBack,
    onboardingSkip,

    // Immersive Onboarding V2
    onboardingSearch,
    onboardingSelectCert,
    onboardingSetDate,
    onboardingSkipDate,
    onboardingFinish,
    onboardingSkipAll,

    // Mission Control
    refreshSession,
    switchSessionCert,
    showExamDateModal,
    saveExamDate,
    toggleMCMenu: () => {
        const overlay = document.getElementById('mc-menu-overlay');
        if (overlay) overlay.classList.toggle('hidden');
    },
    closeMCMenu: () => {
        const overlay = document.getElementById('mc-menu-overlay');
        if (overlay) overlay.classList.add('hidden');
    },
    startSessionDomainQuiz: async (domainId, count) => {
        try {
            showLoading();
            const quiz = await sessionStartDomainQuiz(domainId, count);
            if (!quiz || !quiz.questions || quiz.questions.length === 0) {
                hideLoading();
                showToast('No questions available for this domain yet.', 'warning');
                return;
            }
            hideLoading();
            const qm = await loadMod('quiz');
            qm.startQuiz(null, {
                studyMode: true,
                randomizeOptions: false,
                timed: false,
                domainQuiz: quiz,
            });
        } catch (e) {
            hideLoading();
            showToast('Failed to start domain quiz: ' + (e.message || ''), 'error');
        }
    },

    // Sample quiz for new users
    trySampleQuiz: async () => {
        const { createSampleQuiz, loadQuizzes: refreshQuizzes } = await import('./services/api.js');
        try {
            showLoading();
            const result = await createSampleQuiz();
            await refreshQuizzes();
            hideLoading();
            showToast('Sample quiz added to your library!', 'success');
            setState({ view: 'study' });
        } catch (e) {
            hideLoading();
            showToast(e.message || 'Failed to create sample quiz', 'error');
        }
    },

    // SRS Review (lazy-loaded)
    startSrsReview: async () => { const m = await loadMod('srsReview'); m.initSrsReview(); },
    srsFlip: (...a) => _mods.srsReview?.srsFlip?.(...a),
    srsRate: (...a) => _mods.srsReview?.srsRate?.(...a),
    exitSrsReview: (...a) => _mods.srsReview?.exitSrsReview?.(...a),

    // Dashboard & Certifications
    showCertPicker: async () => {
        try {
            const certs = await getCertifications();
            setState({ certifications: certs });
        } catch (e) {
            showToast('Failed to load certifications', 'error');
            return;
        }
        const existing = document.getElementById('cert-picker-container');
        if (existing) existing.remove();
        const container = document.createElement('div');
        container.id = 'cert-picker-container';
        container.innerHTML = renderCertPicker();
        document.body.appendChild(container);
    },
    closeCertPicker: () => {
        const container = document.getElementById('cert-picker-container');
        if (container) container.remove();
    },
    filterCerts: (query) => {
        setState({ certFilterQuery: query }, true);
        const container = document.getElementById('cert-picker-container');
        if (container) container.innerHTML = renderCertPicker();
    },
    selectCert: async (certId) => {
        try {
            showLoading();
            const [domains, trends, weakQs] = await Promise.all([
                getCertPerformance(certId),
                getCertTrends(certId),
                getWeakQuestions(certId, 10),
            ]);
            const userCerts = getState().userCertifications || [];
            const activeCert = userCerts.find(c => c.certification_id === certId);
            setState({ activeCertification: activeCert, domainPerformance: domains, certTrends: trends, weakQuestions: weakQs });
            hideLoading();
        } catch (e) {
            hideLoading();
            showToast('Failed to load certification data', 'error');
        }
    },
    loadDashboard: async () => {
        try {
            const userCerts = await getUserCertifications();
            setState({ userCertifications: userCerts, view: 'readiness' });
        } catch (e) {
            showToast('Failed to load certifications', 'error');
            setState({ view: 'readiness' });
        }
    },
    enrollCert: async (certId, targetDate) => {
        try {
            await enrollCertification(certId, targetDate);
            const userCerts = await getUserCertifications();
            setState({ userCertifications: userCerts });
            resetHomeCache();
            showToast('Enrolled in certification!', 'success');
            const modal = document.getElementById('cert-picker-container');
            if (modal) modal.remove();
        } catch (e) {
            showToast('Failed to enroll', 'error');
        }
    },
    selectCertAndScroll: async (certId) => {
        await window.app.selectCert(certId);
        requestAnimationFrame(() => {
            const detail = document.getElementById('dash-detail');
            if (detail) detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    },
    unenrollCert: async (certId, certName) => {
        const confirmed = await confirmModal({
            title: 'Remove Certification',
            message: `Remove <strong>${certName}</strong> from your dashboard? Your study progress won't be affected.`,
            confirmText: 'Remove',
            danger: true,
        });
        if (!confirmed) return;
        try {
            await unenrollCertification(certId);
            const userCerts = await getUserCertifications();
            const state = getState();
            const stillActive = state.activeCertification?.certification_id === certId;
            setState({
                userCertifications: userCerts,
                ...(stillActive ? { activeCertification: null, domainPerformance: [], certTrends: [], weakQuestions: [] } : {}),
            });
            showToast(`Removed ${certName}`, 'success');
        } catch (e) {
            showToast('Failed to remove certification', 'error');
        }
    },
    startSimulation: async (certId) => {
        try {
            showLoading();
            const sim = await apiStartSimulation(certId);
            if (!sim || !sim.questions || sim.questions.length === 0) {
                hideLoading();
                showToast('No questions available for simulation yet. The certification question bank is still being built.', 'warning');
                return;
            }
            const qm = await loadMod('quiz');
            qm.startQuiz(null, {
                studyMode: false,
                timed: true,
                minutes: Math.ceil(sim.time_limit / 60),
                simulation: sim,
            });
            hideLoading();
        } catch (e) {
            hideLoading();
            showToast('Failed to start simulation: ' + e.message, 'error');
        }
    },
    startDiagnostic: async (certId) => {
        try {
            showLoading();
            const sim = await apiStartDiagnostic(certId);
            if (!sim || !sim.questions || sim.questions.length === 0) {
                hideLoading();
                showToast('No questions available for the diagnostic yet. The question bank is still being built.', 'warning');
                return;
            }
            const qm = await loadMod('quiz');
            qm.startQuiz(null, {
                studyMode: false,
                timed: true,
                minutes: Math.ceil(sim.time_limit / 60),
                simulation: sim,
            });
            hideLoading();
        } catch (e) {
            hideLoading();
            showToast('Failed to start diagnostic: ' + e.message, 'error');
        }
    },
};

// ==================== INITIALIZE ====================

async function init() {
    // Load settings
    loadSettings();

    // Try to restore auth session
    if (loadAuth()) {
        loadProfile();
        logEvent('login');
        // Start with mission-control; we'll redirect to onboarding-v2 if needed after data loads
        setState({ view: 'mission-control' });
        try {
            // getUserCertifications failure (timeout, 401, network) must NOT be treated
            // as "user has no certs" — track whether the call succeeded.
            let certLoadOk = true;
            const [quizzes, userCerts, bms] = await Promise.all([
                loadQuizzes(),
                getUserCertifications().catch(() => { certLoadOk = false; return []; }),
                getBookmarks().catch(() => []),
            ]);
            setState({
                quizzes,
                // Only set userCertifications when the call actually succeeded.
                // Leaving it undefined tells the UI "still loading" vs empty = confirmed none.
                ...(certLoadOk && { userCertifications: userCerts }),
                bookmarks: bms,
                bookmarkedQuestions: new Set(bms.map(b => b.question_id)),
            }, true);

            // Bug #1 fix: Load and cache in-progress quizzes
            await loadInProgressQuizzes();

            // Only route to onboarding when we CONFIRMED the user has no certs.
            // If the cert API call failed, stay on mission-control rather than
            // incorrectly wiping the user's session with the onboarding screen.
            if (certLoadOk && needsImmersiveOnboarding()) {
                setState({ view: 'onboarding-v2' });
            } else {
                setState({ view: 'mission-control' });
            }
        } catch (e) {
            showToast('Failed to load quizzes', 'error');
        }
    } else {
        // Not logged in - show landing page
        setState({ view: 'landing' });
    }

    render();
}

init();