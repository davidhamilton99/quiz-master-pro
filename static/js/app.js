/* Quiz Master Pro - Main Entry Point */
import { getState, setState, subscribe, loadAuth, loadProfile, loadSettings, loadInProgressQuizzes } from './state.js';
import { loadQuizzes, logout, createQuiz, logEvent, getBookmarks, addBookmark, removeBookmark } from './services/api.js';
import { ExportService, ImportService, showExportModal, showImportModal } from './services/export.js';
import { showToast } from './utils/toast.js';
import { showLoading, hideLoading } from './utils/dom.js';
import { icon } from './utils/icons.js';
import { renderAuth, setAuthMode, handleAuth } from './components/auth.js';
import { renderProfile } from './components/profile.js';
import {
    renderLibrary, setSearch, setSearchImmediate, handleSearchInput, clearSearch,
    setSort, setCategory, clearFilters, toggleMenu,
    confirmDelete, setViewMode, openStudyModal, closeStudyModal, toggleCardMenu,
    showShareSettings, setStudyTab
} from './components/library-v3.js';
import { renderHome, resetHomeCache } from './components/home.js';
import { renderCommunity, setCommunityFilter, setCommunitySearch } from './components/community.js';
import { renderReadiness, setReadinessTab, setWorkspaceView, selectReadinessCert, setObjectiveConfidence, toggleObjectiveDomain } from './components/readiness.js';
import {
    renderQuiz, startQuiz, selectOption, selectTF, checkMultipleChoiceAnswer, toggleMultiSelect,
    nextQuestion, prevQuestion, goToQuestion, toggleFlag, exitQuiz, submitQuiz, stopTimer,
    selectMatchLeft, selectMatchRight, unmatchItem, removeMatch, clearAllMatches,
    moveOrderItem, initQuizHandlers, checkMatchingAnswer, checkOrderingAnswer
} from './components/quiz.js';
import { renderResults, renderReview, retryQuiz, reviewQuiz, setReviewFilter, animateScoreCounter } from './components/results.js';
import {
    renderCreate, setTitle, setCat, setData, toggleHelp, saveQuiz, editQuiz,
    openVisual, closeVisual, selectQ, addQ, deleteQ, updateQ, updateOpt, addOpt,
    toggleCorrect, saveVisual, setTFAnswer, updatePair, addPair, removePair,
    saveField, changeType, savePair, saveOption,
    removeOpt, previewImage, clearImage, toggleOptionExplanations, saveOptionExplanation
} from './components/create.js';
import {
    renderStudyGuide, sgHandleFile, sgClearFile, sgGenerate, sgOpen, sgDownload, sgReset, initStudyGuideDragDrop
} from './components/studyGuide.js';

// Flashcards
import {
    renderFlashcards, initFlashcards, fcFlip, fcNext, fcPrev, fcRate,
    fcShuffle, fcRestart, fcStudyMissed, fcGoToCard,
    fcToggleMenu, fcToggleShortcuts, exitFlashcards,
    fcTouchStart, fcTouchMove, fcTouchEnd
} from './components/flashcards.js';

// SRS Review
import { renderSrsReview, initSrsReview, srsFlip, srsRate, exitSrsReview } from './components/srsReview.js';

// Dashboard
import { renderDashboard, loadStudyStats } from './components/dashboard.js';
import { renderCertPicker } from './components/certPicker.js';
import {
    getUserCertifications, enrollCertification, unenrollCertification,
    getCertPerformance, getCertTrends, getWeakQuestions, getCertification,
    getCertifications,
    startSimulation as apiStartSimulation
} from './services/api.js';

// NEW: Landing page and wizard
import { renderLanding, scrollToHowItWorks } from './components/landing.js';
import {
    renderOnboarding, shouldShowOnboarding, startOnboarding,
    completeOnboarding, onboardingNext, onboardingBack, onboardingSkip
} from './components/onboarding.js';
import {
    renderWizard, resetWizard, wizardSetTitle, wizardSetCategory, wizardToggleType,
    wizardToggleCode, wizardSetCount, wizardAdjustCount, wizardNext, wizardBack, wizardCopyPrompt, 
    wizardSetContent, wizardPreviewContent, wizardFinish, exitWizard
} from './components/wizard.js';

// Lightweight animation utils (shake/pulse only - gamification removed)
import { addShakeAnimation, addPulseAnimation, showConfetti, showFireworks, burstCorrect, burstWrong } from './utils/animations.js';
window.animations = { addShakeAnimation, addPulseAnimation, showConfetti, showFireworks, burstCorrect, burstWrong };

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
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Start Quiz</h2>
                <button class="btn btn-ghost btn-icon" onclick="this.closest('.modal-overlay').remove()">${icon('x')}</button>
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
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="window.app.launchQuiz(${quizId})">Start Quiz</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const timerToggle = modal.querySelector('#timer-toggle');
    const timerOptions = modal.querySelector('#timer-options');
    timerToggle.addEventListener('change', () => {
        timerOptions.style.display = timerToggle.checked ? 'block' : 'none';
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function launchQuiz(quizId) {
    const modal = document.querySelector('.modal-overlay');
    const studyMode = modal?.querySelector('#study-mode-toggle')?.checked ?? true;
    const randomizeOptions = modal?.querySelector('#randomize-toggle')?.checked ?? false;
    const timed = modal?.querySelector('#timer-toggle')?.checked ?? false;
    const minutes = parseInt(modal?.querySelector('#timer-minutes')?.value) || 15;
    
    if (modal) modal.remove();
    startQuiz(quizId, { studyMode, randomizeOptions, timed, minutes });
}

// ==================== CREATE OPTIONS MODAL ====================

function showCreateOptions() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Create New Quiz</h2>
                <button class="btn btn-ghost btn-icon" onclick="this.closest('.modal-overlay').remove()">${icon('x')}</button>
            </div>
            <div class="modal-body">
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
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function startWizard() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
    resetWizard();
    setState({ view: 'wizard' });
}

function startManualCreate() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
    setState({ view: 'create', editingQuizId: null, quizTitle: '', quizCategory: '', quizData: '' });
}

// ==================== RENDER ====================

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
                    <button onclick="location.reload()" style="padding:0.5rem 1.5rem;background:#8b5cf6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:1rem;">Reload</button>
                </div>`;
        }
    }
}

function renderInternal() {
    const state = getState();
    let content = '';

    switch (state.view) {
        case 'landing':
            content = renderLanding();
            break;
        case 'login':
        case 'register':
            content = renderAuth();
            break;
        case 'home':
            content = renderHome();
            break;
        case 'profile':
            content = renderProfile();
            break;
        case 'library':
        case 'study':
            content = renderLibrary();
            break;
        case 'readiness':
            content = renderReadiness();
            break;
        case 'community':
            content = renderCommunity();
            break;
        case 'wizard':
            content = renderWizard();
            break;
        case 'quiz':
            content = renderQuiz();
            setTimeout(() => {
                if (window.app.initQuizHandlers) {
                    window.app.initQuizHandlers();
                }
            }, 50);
            break;
        case 'results':
            content = renderResults();
            setTimeout(animateScoreCounter, 100);
            break;
        case 'review':
            content = renderReview();
            break;
        case 'create':
            content = renderCreate();
            break;
        case 'studyGuide':
            content = renderStudyGuide();
            setTimeout(initStudyGuideDragDrop, 50);
            break;
        case 'flashcards':
            content = renderFlashcards();
            break;
        case 'srsReview':
            content = renderSrsReview();
            break;
        case 'dashboard':
            content = renderDashboard();
            break;
        default:
            content = state.isAuthenticated ? renderHome() : renderLanding();
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
    
    if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1;
        if (q.type === 'truefalse') {
            if (e.key === '1') selectTF(true);
            else if (e.key === '2') selectTF(false);
        } else if (q.options && idx < q.options.length) {
            selectOption(idx);
        }
    }
    
    if (q.type === 'truefalse') {
        if (e.key.toLowerCase() === 't' || e.key.toLowerCase() === 'y') selectTF(true);
        if (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'n') selectTF(false);
    }
    
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (state.currentQuestionIndex < state.currentQuiz.questions.length - 1) {
            nextQuestion();
        }
    }
    if (e.key === 'ArrowLeft') {
        prevQuestion();
    }
    
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
    
    // Wizard
    wizardSetTitle,
    wizardSetCategory,
    wizardToggleType,
    wizardToggleCode,
    wizardSetCount,
    wizardAdjustCount,
    wizardNext,
    wizardBack,
    wizardCopyPrompt,
    wizardSetContent,
    wizardPreviewContent,
    wizardFinish,
    exitWizard,
    
    // Export/Import
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
    
    // Matching & Ordering
    selectMatchLeft,
    selectMatchRight,
    unmatchItem,
    removeMatch,
    clearAllMatches,
    moveOrderItem,
    initQuizHandlers,
    checkMatchingAnswer,
    checkOrderingAnswer,
    
    // Results
    retryQuiz,
    reviewQuiz,
    setReviewFilter,
    
    // Create (manual)
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
    removeOpt,
    previewImage,
    clearImage,
    toggleOptionExplanations,
    saveOptionExplanation,

    // Study Guide Builder
    sgHandleFile,
    sgClearFile,
    sgGenerate,
    sgOpen,
    sgDownload,
    sgReset,
    
    // Flashcards v2
    startFlashcards: async (quizId) => {
        const { getQuiz } = await import('./services/api.js');
        const quiz = await getQuiz(quizId);
        initFlashcards(quiz);
    },
    fcFlip,
    fcNext,
    fcPrev,
    fcRate,
    fcShuffle,
    fcRestart,
    fcStudyMissed,
    fcGoToCard,
    fcToggleMenu,
    fcToggleShortcuts,
    exitFlashcards,
    fcTouchStart,
    fcTouchMove,
    fcTouchEnd,
    

    // Onboarding
    onboardingNext,
    onboardingBack,
    onboardingSkip,

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

    // SRS Review
    startSrsReview: () => initSrsReview(),
    srsFlip,
    srsRate,
    exitSrsReview,

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
        const confirmed = await new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal">
                    <div class="modal-header">
                        <h2>Remove Certification</h2>
                        <button class="btn btn-ghost btn-icon" data-action="cancel">${icon('x')}</button>
                    </div>
                    <div class="modal-body">
                        <p>Remove <strong>${certName}</strong> from your dashboard? Your study progress won't be affected.</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-action="cancel">Cancel</button>
                        <button class="btn btn-primary danger" data-action="confirm">Remove</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay || e.target.closest('[data-action="cancel"]')) { overlay.remove(); resolve(false); }
                if (e.target.closest('[data-action="confirm"]')) { overlay.remove(); resolve(true); }
            });
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
            startQuiz(null, {
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
};

// ==================== INITIALIZE ====================

async function init() {
    // Load settings
    loadSettings();
    
    // Try to restore auth session
    if (loadAuth()) {
        loadProfile();
        logEvent('login');
        setState({ view: 'home' });
        try {
            const [quizzes, userCerts, bms] = await Promise.all([
                loadQuizzes(),
                getUserCertifications().catch(() => []),
                getBookmarks().catch(() => []),
            ]);
            setState({
                quizzes,
                userCertifications: userCerts,
                bookmarks: bms,
                bookmarkedQuestions: new Set(bms.map(b => b.question_id)),
            });

            // Bug #1 fix: Load and cache in-progress quizzes
            await loadInProgressQuizzes();
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