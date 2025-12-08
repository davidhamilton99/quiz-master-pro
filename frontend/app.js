/* ==========================================================================
   QuizForge - Production JavaScript Application
   A professional quiz platform for education
   ========================================================================== */

// ==========================================================================
// SECTION 1: Configuration & State
// ==========================================================================

const API_URL = 'https://davidhamilton.pythonanywhere.com/api';

const state = {
    // Authentication
    view: 'login',
    isAuthenticated: false,
    user: null,
    token: null,
    authMode: 'login',
    
    // Quiz Library
    quizzes: [],
    searchQuery: '',
    sortBy: 'custom',
    categoryFilter: 'all',
    folders: [],
    selectedFolder: 'all',
    customOrder: [],
    
    // Quiz Taking
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
    timeExpired: false,
    
    // Study Mode
    streak: 0,
    maxStreak: 0,
    
    // UI State
    darkMode: localStorage.getItem('darkMode') === 'true',
    showFormatHelp: false,
    
    // Quiz Creation
    quizTitle: '',
    quizData: '',
    quizCategory: '',
    editingQuizId: null,
    visualEditorMode: false,
    parsedQuestions: null,
    currentEditQuestion: 0,
    
    // Drag & Drop
    draggedQuizId: null,
    editorDraggedIndex: null
};

// Initialize dark mode
if (state.darkMode) {
    document.documentElement.classList.add('dark');
}

// ==========================================================================
// SECTION 2: Utility Functions
// ==========================================================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / 86400000);
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getRandomColor() {
    const colors = ['#0d9488', '#059669', '#0284c7', '#7c3aed', '#db2777', '#d97706'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function highlightText(text, query) {
    if (!query) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const regex = new RegExp(`(${escapeHtml(query)})`, 'gi');
    return escaped.replace(regex, '<span class="search-highlight">$1</span>');
}

// ==========================================================================
// SECTION 3: UI Feedback (Loading, Toasts, Dialogs)
// ==========================================================================

let loadingCount = 0;

function showLoading() {
    loadingCount++;
    if (loadingCount === 1) {
        const spinner = document.createElement('div');
        spinner.id = 'loading-spinner';
        spinner.className = 'spinner-overlay';
        spinner.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(spinner);
    }
}

function hideLoading() {
    loadingCount = Math.max(0, loadingCount - 1);
    if (loadingCount === 0) {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) spinner.remove();
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const id = 'toast-' + Date.now();
    toast.id = id;
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span style="flex: 1">${message}</span>
        <button class="toast-close" onclick="dismissToast('${id}')">×</button>
    `;
    
    container.appendChild(toast);
    setTimeout(() => dismissToast(id), 4000);
}

function dismissToast(id) {
    const toast = document.getElementById(id);
    if (toast) {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }
}

function showConfirmDialog(options) {
    return new Promise((resolve) => {
        const {
            title = 'Confirm Action',
            message = 'Are you sure?',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            type = 'warning'
        } = options;
        
        const icons = { warning: '⚠️', danger: '🗑️' };
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay confirm-modal';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-body" style="text-align: center; padding: 2rem">
                    <div class="confirm-icon ${type}">
                        ${icons[type] || icons.warning}
                    </div>
                    <h2 style="margin-bottom: 0.5rem">${title}</h2>
                    <p class="text-muted">${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost flex-1" onclick="this.closest('.modal-overlay').remove()">
                        ${cancelText}
                    </button>
                    <button class="btn ${type === 'danger' ? 'btn-danger' : 'btn-accent'} flex-1" id="confirm-btn">
                        ${confirmText}
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('confirm-btn').onclick = () => {
            modal.remove();
            resolve(true);
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(false);
            }
        };
    });
}

function showConfetti() {
    const colors = ['#0d9488', '#059669', '#0284c7', '#7c3aed', '#db2777', '#d97706', '#fbbf24', '#22c55e'];
    const confettiCount = 80;
    
    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.top = '-10px';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = (Math.random() * 10 + 5) + 'px';
            confetti.style.height = (Math.random() * 10 + 5) + 'px';
            confetti.style.animationDelay = Math.random() * 0.3 + 's';
            confetti.style.animationDuration = (Math.random() * 1 + 2) + 's';
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 4000);
        }, i * 20);
    }
    
    // Celebration emoji
    const celebration = document.createElement('div');
    celebration.style.cssText = `
        position: fixed;
        top: 20%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        font-size: 4rem;
        z-index: 10000;
        animation: celebrationPop 0.6s ease forwards;
        pointer-events: none;
    `;
    celebration.textContent = '🎉';
    document.body.appendChild(celebration);
    setTimeout(() => celebration.remove(), 1000);
}

// ==========================================================================
// SECTION 4: API & Authentication
// ==========================================================================

async function apiCall(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
    
    try {
        const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    } catch (e) {
        console.error('API Error:', e);
        throw e;
    }
}

async function login(username, password) {
    try {
        showLoading();
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        state.token = data.token;
        state.user = data.user;
        state.isAuthenticated = true;
        saveAuth();
        state.view = 'library';
        
        await loadQuizzes();
        hideLoading();
        showToast(`Welcome back, ${data.user.username}!`, 'success');
        render();
    } catch (e) {
        hideLoading();
        showToast(e.message || 'Login failed', 'error');
    }
}

async function register(username, password) {
    try {
        showLoading();
        const data = await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                username,
                password,
                email: `${username}@quiz.local`
            })
        });
        
        state.token = data.token;
        state.user = data.user;
        state.isAuthenticated = true;
        saveAuth();
        state.view = 'library';
        
        await loadQuizzes();
        hideLoading();
        showToast('Account created!', 'success');
        render();
    } catch (e) {
        hideLoading();
        showToast(e.message || 'Registration failed', 'error');
    }
}

function logout() {
    state.token = null;
    state.user = null;
    state.isAuthenticated = false;
    state.view = 'login';
    state.quizzes = [];
    clearQuizProgress();
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    showToast('Logged out', 'info');
    render();
}

function saveAuth() {
    if (state.token && state.user) {
        localStorage.setItem('authToken', state.token);
        localStorage.setItem('authUser', JSON.stringify(state.user));
    }
}

function loadAuth() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('authUser');
    
    if (token && user) {
        state.token = token;
        state.user = JSON.parse(user);
        state.isAuthenticated = true;
        return true;
    }
    return false;
}

function toggleDarkMode() {
    state.darkMode = !state.darkMode;
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', state.darkMode);
    render();
}

// ==========================================================================
// SECTION 5: Data Management
// ==========================================================================

async function loadQuizzes() {
    try {
        const data = await apiCall('/quizzes');
        state.quizzes = (data.quizzes || data).map(q => {
            if (q.attempt_count > 0) {
                q.attempts = [{
                    percentage: q.best_score || 0,
                    score: 0,
                    total: q.questions?.length || 0,
                    created_at: q.last_modified
                }];
            } else {
                q.attempts = [];
            }
            return q;
        });
        
        loadFolders();
        loadCustomOrder();
        validateAndCleanData();
    } catch (e) {
        console.error('Failed to load quizzes:', e);
    }
}

function loadFolders() {
    try {
        const folders = localStorage.getItem('quiz-folders');
        state.folders = folders ? JSON.parse(folders) : [];
    } catch (e) {
        state.folders = [];
    }
}

function saveFolders() {
    localStorage.setItem('quiz-folders', JSON.stringify(state.folders));
}

function loadCustomOrder() {
    try {
        const order = localStorage.getItem('quiz-custom-order');
        state.customOrder = order ? JSON.parse(order) : [];
        
        // Add new quizzes not in order
        state.quizzes.forEach(q => {
            if (!state.customOrder.includes(q.id)) {
                state.customOrder.push(q.id);
            }
        });
        
        // Remove deleted quizzes
        state.customOrder = state.customOrder.filter(id =>
            state.quizzes.some(q => q.id === id)
        );
    } catch (e) {
        state.customOrder = state.quizzes.map(q => q.id);
    }
}

function saveCustomOrder() {
    localStorage.setItem('quiz-custom-order', JSON.stringify(state.customOrder));
}

function validateAndCleanData() {
    const quizIds = new Set(state.quizzes.map(q => q.id));
    
    // Clean folder quiz IDs
    state.folders.forEach(f => {
        const before = f.quizIds.length;
        f.quizIds = f.quizIds.filter(id => quizIds.has(id));
        if (before !== f.quizIds.length) saveFolders();
    });
    
    // Clean custom order
    const before = state.customOrder.length;
    state.customOrder = state.customOrder.filter(id => quizIds.has(id));
    if (before !== state.customOrder.length) saveCustomOrder();
    
    // Clean quiz progress
    const allProgress = loadQuizProgress();
    Object.keys(allProgress).forEach(qid => {
        if (!quizIds.has(parseInt(qid))) {
            clearQuizProgress(parseInt(qid));
        }
    });
}

// ==========================================================================
// SECTION 6: Quiz Creation State Persistence
// ==========================================================================

function saveCreationState() {
    if (state.view === 'create') {
        const creationState = {
            quizTitle: state.quizTitle,
            quizData: state.quizData,
            quizCategory: state.quizCategory,
            editingQuizId: state.editingQuizId,
            visualEditorMode: state.visualEditorMode,
            parsedQuestions: state.parsedQuestions,
            currentEditQuestion: state.currentEditQuestion,
            timestamp: Date.now()
        };
        localStorage.setItem('quiz-creation-state', JSON.stringify(creationState));
    }
}

function loadCreationState() {
    try {
        const stored = localStorage.getItem('quiz-creation-state');
        if (!stored) return false;
        
        const creationState = JSON.parse(stored);
        
        // Check if less than 24 hours old
        const hoursSince = (Date.now() - creationState.timestamp) / (1000 * 60 * 60);
        if (hoursSince > 24) {
            localStorage.removeItem('quiz-creation-state');
            return false;
        }
        
        // Restore state
        state.quizTitle = creationState.quizTitle || '';
        state.quizData = creationState.quizData || '';
        state.quizCategory = creationState.quizCategory || '';
        state.editingQuizId = creationState.editingQuizId;
        state.visualEditorMode = creationState.visualEditorMode || false;
        state.parsedQuestions = creationState.parsedQuestions || null;
        state.currentEditQuestion = creationState.currentEditQuestion || 0;
        
        return true;
    } catch (e) {
        console.error('Failed to load creation state:', e);
        return false;
    }
}

function clearCreationState() {
    localStorage.removeItem('quiz-creation-state');
}

// ==========================================================================
// SECTION 7: Quiz Progress Persistence
// ==========================================================================

function saveQuizProgress() {
    if (!state.currentQuiz) return;
    
    const progress = {
        quizId: state.currentQuiz.id,
        quizTitle: state.currentQuiz.title,
        questions: state.currentQuiz.questions,
        currentQuestionIndex: state.currentQuestionIndex,
        answers: state.answers,
        studyMode: state.studyMode,
        showAnswer: state.showAnswer,
        flaggedQuestions: Array.from(state.flaggedQuestions),
        timerEnabled: state.timerEnabled,
        timerMinutes: state.timerMinutes,
        timeRemaining: state.timeRemaining || 0,
        startTime: state.startTime || Date.now(),
        streak: state.streak || 0,
        maxStreak: state.maxStreak || 0,
        savedAt: Date.now()
    };
    
    try {
        const stored = localStorage.getItem('quiz-progress-all');
        const allProgress = stored ? JSON.parse(stored) : {};
        allProgress[state.currentQuiz.id] = progress;
        
        // Clean up old progress (older than 7 days)
        Object.keys(allProgress).forEach(qid => {
            const daysSince = (Date.now() - (allProgress[qid].startTime || Date.now())) / (1000 * 60 * 60 * 24);
            if (daysSince > 7) delete allProgress[qid];
        });
        
        localStorage.setItem('quiz-progress-all', JSON.stringify(allProgress));
    } catch (e) {
        console.error('Failed to save quiz progress:', e);
    }
}

function loadQuizProgress(quizId = null) {
    try {
        const stored = localStorage.getItem('quiz-progress-all');
        if (!stored) return quizId ? null : {};
        
        const allProgress = JSON.parse(stored);
        
        if (quizId) {
            const progress = allProgress[quizId];
            if (!progress) return null;
            
            // Validate essential data
            if (!progress.quizId || !progress.questions || !Array.isArray(progress.questions) || progress.questions.length === 0) {
                delete allProgress[quizId];
                localStorage.setItem('quiz-progress-all', JSON.stringify(allProgress));
                return null;
            }
            
            // Check expiry (7 days)
            const daysSince = (Date.now() - (progress.startTime || Date.now())) / (1000 * 60 * 60 * 24);
            if (daysSince > 7) {
                delete allProgress[quizId];
                localStorage.setItem('quiz-progress-all', JSON.stringify(allProgress));
                return null;
            }
            
            return progress;
        }
        
        // Return all valid progress
        const validProgress = {};
        Object.entries(allProgress).forEach(([qid, progress]) => {
            if (progress && progress.quizId && progress.questions && Array.isArray(progress.questions) && progress.questions.length > 0) {
                const daysSince = (Date.now() - (progress.startTime || Date.now())) / (1000 * 60 * 60 * 24);
                if (daysSince <= 7) validProgress[qid] = progress;
            }
        });
        
        return validProgress;
    } catch (e) {
        console.error('Failed to load quiz progress:', e);
        localStorage.removeItem('quiz-progress-all');
        return quizId ? null : {};
    }
}

function getAllInProgressQuizzes() {
    const allProgress = loadQuizProgress();
    if (!allProgress || typeof allProgress !== 'object') return [];
    
    return Object.values(allProgress)
        .filter(p => p && p.quizId && p.questions && Array.isArray(p.questions) && p.questions.length > 0)
        .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

function clearQuizProgress(quizId = null) {
    try {
        const stored = localStorage.getItem('quiz-progress-all');
        if (!stored) return;
        
        const allProgress = JSON.parse(stored);
        
        if (quizId) {
            delete allProgress[quizId];
        } else if (state.currentQuiz) {
            delete allProgress[state.currentQuiz.id];
        }
        
        localStorage.setItem('quiz-progress-all', JSON.stringify(allProgress));
    } catch (e) {
        console.error('Failed to clear quiz progress:', e);
    }
}

// ==========================================================================
// SECTION 8: Statistics & Filtering
// ==========================================================================

function getUserStats() {
    const totalQuizzes = state.quizzes.length;
    const totalQuestions = state.quizzes.reduce((sum, q) => sum + (q.questions?.length || 0), 0);
    
    let totalAttempts = 0;
    let totalScore = 0;
    let attemptCount = 0;
    
    state.quizzes.forEach(q => {
        if (q.attempt_count && q.attempt_count > 0) {
            totalAttempts += q.attempt_count;
            if (q.avg_score != null) {
                totalScore += q.avg_score * q.attempt_count;
                attemptCount += q.attempt_count;
            }
        }
    });
    
    return {
        totalQuizzes,
        totalQuestions,
        totalAttempts,
        avgScore: attemptCount > 0 ? Math.round(totalScore / attemptCount) : 0
    };
}

function getQuizStats(quiz) {
    if (!quiz.attempt_count || quiz.attempt_count === 0) return null;
    return {
        attemptCount: quiz.attempt_count,
        best: Math.round(quiz.best_score || 0),
        latest: Math.round(quiz.avg_score || 0)
    };
}

function getCategories() {
    const categories = new Set();
    state.quizzes.forEach(q => {
        if (q.description) categories.add(q.description);
    });
    return Array.from(categories).sort();
}

function getFilteredQuizzes() {
    let filtered = [...state.quizzes];
    
    // Filter by folder
    if (state.selectedFolder !== 'all') {
        const folder = state.folders.find(f => f.id == state.selectedFolder);
        if (folder) filtered = filtered.filter(q => folder.quizIds.includes(q.id));
    }
    
    // Filter by search
    if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter(q =>
            q.title.toLowerCase().includes(query) ||
            (q.description && q.description.toLowerCase().includes(query))
        );
    }
    
    // Filter by category
    if (state.categoryFilter !== 'all') {
        filtered = filtered.filter(q => q.description === state.categoryFilter);
    }
    
    // Sort
    if (state.sortBy === 'recent') {
        filtered.sort((a, b) => new Date(b.last_modified || b.created_at) - new Date(a.last_modified || a.created_at));
    } else if (state.sortBy === 'alpha') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (state.sortBy === 'custom') {
        filtered.sort((a, b) => state.customOrder.indexOf(a.id) - state.customOrder.indexOf(b.id));
    }
    
    return filtered;
}

// ==========================================================================
// SECTION 9: Quiz Taking Logic
// ==========================================================================

async function startQuiz(id, opts = {}) {
    try {
        // Check for existing progress first
        if (!opts.forceNew) {
            const existingProgress = loadQuizProgress(id);
            if (existingProgress) {
                showResumePrompt(existingProgress);
                return;
            }
        }
        
        showLoading();
        const data = await apiCall(`/quizzes/${id}`);
        const quizData = data.quiz || data;
        let questions = quizData.questions;
        
        if (opts.shuffleQuestions) {
            questions = shuffleArray(questions);
        }
        
        state.currentQuiz = { id, title: quizData.title, questions };
        state.currentQuestionIndex = 0;
        state.answers = questions.map(q =>
            q.type === 'ordering' ? shuffleArray(q.options.map((_, i) => i)) : null
        );
        state.studyMode = opts.studyMode || false;
        state.timerEnabled = opts.timerEnabled || false;
        state.timerMinutes = opts.timerMinutes || 15;
        state.timeRemaining = state.timerMinutes * 60;
        state.showAnswer = false;
        state.streak = 0;
        state.maxStreak = 0;
        state.flaggedQuestions = new Set();
        state.timeExpired = false;
        state.startTime = Date.now();
        
        if (state.timerEnabled && !state.studyMode) {
            startTimer();
        }
        
        state.view = 'quiz';
        hideLoading();
        render();
    } catch (e) {
        hideLoading();
        showToast('Failed to load quiz', 'error');
    }
}

function resumeQuiz(progress) {
    state.currentQuiz = {
        id: progress.quizId,
        title: progress.quizTitle,
        questions: progress.questions
    };
    state.currentQuestionIndex = progress.currentQuestionIndex;
    state.answers = progress.answers;
    state.studyMode = progress.studyMode;
    state.showAnswer = progress.showAnswer;
    state.flaggedQuestions = new Set(progress.flaggedQuestions || []);
    state.timerEnabled = progress.timerEnabled;
    state.timerMinutes = progress.timerMinutes || 15;
    state.timeRemaining = progress.timeRemaining || 0;
    state.startTime = progress.startTime;
    state.streak = progress.streak || 0;
    state.maxStreak = progress.maxStreak || 0;
    
    if (state.timerEnabled && state.timeRemaining > 0) {
        startTimer();
    } else if (state.timerEnabled && state.timeRemaining <= 0) {
        state.timeExpired = true;
    }
    
    state.view = 'quiz';
    render();
}

function showResumePrompt(progress) {
    const timeSinceStart = Date.now() - (progress.startTime || Date.now());
    const minutes = Math.floor(timeSinceStart / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    let timeAgo = 'just now';
    if (days > 0) timeAgo = `${days} day${days > 1 ? 's' : ''} ago`;
    else if (hours > 0) timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`;
    else if (minutes > 0) timeAgo = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const answeredCount = progress.answers.filter(a => a != null && (Array.isArray(a) ? a.length > 0 : true)).length;
    const totalQuestions = progress.questions.length;
    const progressPct = Math.round((answeredCount / totalQuestions) * 100);
    
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="modal-overlay" style="z-index:300">
            <div class="modal">
                <div class="modal-header">
                    <h2>📝 Resume Quiz?</h2>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom:1.5rem">
                        <h3 style="margin-bottom:0.25rem">${escapeHtml(progress.quizTitle)}</h3>
                        <p class="text-sm text-muted">
                            Question ${progress.currentQuestionIndex + 1} of ${totalQuestions} • ${timeAgo}
                        </p>
                    </div>
                    
                    <div style="margin-bottom:1.5rem">
                        <div class="flex justify-between items-center" style="margin-bottom:0.5rem">
                            <span class="text-sm text-muted">Progress</span>
                            <span class="text-sm font-semibold">${progressPct}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width:${progressPct}%"></div>
                        </div>
                    </div>
                    
                    <div class="flex gap-md" style="margin-bottom:1rem">
                        <div class="stat-card flex-1" style="text-align:center;padding:1rem">
                            <div class="stat-value" style="font-size:2rem">${answeredCount}</div>
                            <div class="stat-label">Answered</div>
                        </div>
                        <div class="stat-card flex-1" style="text-align:center;padding:1rem">
                            <div class="stat-value" style="font-size:2rem">${totalQuestions - answeredCount}</div>
                            <div class="stat-label">Remaining</div>
                        </div>
                    </div>
                    
                    ${progress.timerEnabled ? `
                        <div class="card" style="padding:1rem;background:var(--info-light);margin-bottom:1rem">
                            <div class="flex items-center gap-sm">
                                <span>⏱️</span>
                                <span class="text-sm">
                                    <strong>Timer:</strong> ${Math.floor(progress.timeRemaining / 60)}:${(progress.timeRemaining % 60).toString().padStart(2, '0')} remaining
                                </span>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${progress.studyMode ? `
                        <div class="badge badge-primary" style="width:100%;justify-content:center;padding:0.5rem">
                            📖 Study Mode
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost flex-1" onclick="discardProgress(${progress.quizId})">
                        🗑️ Start Over
                    </button>
                    <button class="btn btn-accent flex-1" onclick="continueQuiz(${progress.quizId})">
                        ▶️ Continue
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal.firstElementChild);
}

function continueQuiz(quizId) {
    const progress = loadQuizProgress(quizId);
    if (!progress) {
        showToast('Progress not found', 'error');
        document.querySelector('.modal-overlay')?.remove();
        render();
        return;
    }
    resumeQuiz(progress);
    document.querySelector('.modal-overlay')?.remove();
    showToast('Quiz resumed', 'success');
}

function discardProgress(quizId) {
    clearQuizProgress(quizId);
    document.querySelector('.modal-overlay')?.remove();
    showToast('Progress cleared', 'info');
    render();
}

function showQuizOptions(id) {
    const quiz = state.quizzes.find(q => q.id === id);
    if (!quiz) return;
    
    const hasProgress = loadQuizProgress(id) !== null;
    
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="modal-overlay" onclick="if(event.target===this)this.remove()">
            <div class="modal">
                <div class="modal-header">
                    <h2>${hasProgress ? '⚠️ Resume or Start Over?' : '🚀 Start Quiz'}</h2>
                    <button class="btn btn-icon btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <h3 style="margin-bottom:0.25rem">${escapeHtml(quiz.title)}</h3>
                    <p class="text-sm text-muted" style="margin-bottom:2rem">${quiz.questions?.length || 0} questions</p>
                    
                    ${hasProgress ? `
                        <div class="card" style="padding:1rem;background:var(--primary-glow);margin-bottom:1.5rem;border:2px solid var(--primary)">
                            <p class="text-sm font-semibold" style="margin-bottom:0.25rem">📝 You have progress saved</p>
                            <p class="text-xs text-muted">You can continue where you left off or start fresh</p>
                        </div>
                    ` : ''}
                    
                    <div class="flex flex-col gap-md">
                        <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer">
                            <input type="checkbox" id="optShuffle" class="checkbox">
                            <span>Shuffle questions</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer">
                            <input type="checkbox" id="optTimer" class="checkbox" onchange="document.getElementById('timerSettings').style.display=this.checked?'block':'none'">
                            <span>Enable timer</span>
                        </label>
                        <div id="timerSettings" style="display:none;padding-left:2rem">
                            <label class="input-label">Minutes</label>
                            <input type="number" id="optMinutes" class="input" value="15" min="1" max="180" style="width:100px">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost flex-1" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    ${hasProgress ? `
                        <button class="btn btn-ghost flex-1" onclick="startQuizFresh(${id},false)">🔄 Start Fresh</button>
                        <button class="btn btn-accent flex-1" onclick="continueQuiz(${id})">▶️ Continue</button>
                    ` : `
                        <button class="btn btn-primary flex-1" onclick="startQuizFromModal(${id},false)">Quiz</button>
                        <button class="btn btn-accent flex-1" onclick="startQuizFromModal(${id},true)">📖 Study</button>
                    `}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal.firstElementChild);
}

function startQuizFromModal(id, study) {
    const shuffle = document.getElementById('optShuffle')?.checked;
    const timer = document.getElementById('optTimer')?.checked;
    const minutes = parseInt(document.getElementById('optMinutes')?.value) || 15;
    document.querySelector('.modal-overlay')?.remove();
    startQuiz(id, {
        studyMode: study,
        shuffleQuestions: shuffle,
        timerEnabled: timer && !study,
        timerMinutes: minutes,
        forceNew: false
    });
}

function startQuizFresh(id, study) {
    clearQuizProgress(id);
    const shuffle = document.getElementById('optShuffle')?.checked;
    const timer = document.getElementById('optTimer')?.checked;
    const minutes = parseInt(document.getElementById('optMinutes')?.value) || 15;
    document.querySelector('.modal-overlay')?.remove();
    startQuiz(id, {
        studyMode: study,
        shuffleQuestions: shuffle,
        timerEnabled: timer && !study,
        timerMinutes: minutes,
        forceNew: true
    });
}

function showQuizPreview(quizId) {
    showLoading();
    apiCall(`/quizzes/${quizId}`).then(data => {
        hideLoading();
        const quiz = data.quiz || data;
        const preview = quiz.questions.slice(0, 3);
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h2>📝 ${escapeHtml(quiz.title)}</h2>
                    <button class="btn btn-icon btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <p class="text-muted" style="margin-bottom: 1.5rem">
                        ${quiz.questions.length} questions • ${quiz.description || 'No category'}
                    </p>
                    <h3 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 1rem">
                        Preview (first 3 questions)
                    </h3>
                    ${preview.map((q, i) => `
                        <div class="preview-question">
                            <div style="display: flex; align-items: start">
                                <span class="preview-question-number">${i + 1}</span>
                                <span style="flex: 1">${escapeHtml(q.question)}</span>
                            </div>
                            ${q.options ? `
                                <div class="preview-options">
                                    ${q.options.map((opt, j) => `${String.fromCharCode(65 + j)}. ${escapeHtml(opt)}`).join('<br>')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                    ${quiz.questions.length > 3 ? `<p class="text-sm text-muted" style="text-align: center">... and ${quiz.questions.length - 3} more questions</p>` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost flex-1" onclick="this.closest('.modal-overlay').remove()">Close</button>
                    <button class="btn btn-accent flex-1" onclick="this.closest('.modal-overlay').remove(); showQuizOptions(${quizId})">Start Quiz</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }).catch(e => {
        hideLoading();
        showToast('Failed to load preview', 'error');
    });
}

// ==========================================================================
// SECTION 10: Quiz Navigation & Answers
// ==========================================================================

function selectAnswer(index) {
    const question = state.currentQuiz.questions[state.currentQuestionIndex];
    
    if (question.type === 'choice') {
        if (question.correct.length > 1) {
            // Multi-select
            let current = state.answers[state.currentQuestionIndex] || [];
            if (current.includes(index)) {
                current = current.filter(i => i !== index);
            } else {
                current = [...current, index];
            }
            state.answers[state.currentQuestionIndex] = current;
        } else {
            // Single select
            state.answers[state.currentQuestionIndex] = [index];
            
            if (state.studyMode) {
                checkStudyAnswer();
            }
        }
    }
    
    saveQuizProgress();
    render();
}

function checkStudyAnswer() {
    const question = state.currentQuiz.questions[state.currentQuestionIndex];
    const userAnswer = state.answers[state.currentQuestionIndex] || [];
    
    let isCorrect = false;
    if (question.type === 'choice') {
        const userSet = new Set(userAnswer);
        const correctSet = new Set(question.correct);
        isCorrect = userSet.size === correctSet.size && [...userSet].every(a => correctSet.has(a));
    } else if (question.type === 'ordering') {
        isCorrect = JSON.stringify(userAnswer) === JSON.stringify(question.correct);
    }
    
    if (isCorrect) {
        state.streak++;
        if (state.streak > state.maxStreak) state.maxStreak = state.streak;
    } else {
        state.streak = 0;
    }
    
    state.showAnswer = true;
    saveQuizProgress();
}

function nextQuestion() {
    if (state.studyMode && !state.showAnswer) {
        checkStudyAnswer();
        render();
        return;
    }
    
    if (state.currentQuestionIndex < state.currentQuiz.questions.length - 1) {
        state.currentQuestionIndex++;
        state.showAnswer = false;
        saveQuizProgress();
        render();
    }
}

function prevQuestion() {
    if (state.currentQuestionIndex > 0) {
        state.currentQuestionIndex--;
        state.showAnswer = false;
        saveQuizProgress();
        render();
    }
}

function toggleFlag() {
    const idx = state.currentQuestionIndex;
    if (state.flaggedQuestions.has(idx)) {
        state.flaggedQuestions.delete(idx);
    } else {
        state.flaggedQuestions.add(idx);
    }
    saveQuizProgress();
    render();
}

function calculateScore() {
    let score = 0;
    state.currentQuiz.questions.forEach((q, i) => {
        const userAnswer = state.answers[i] || [];
        if (q.type === 'choice') {
            const userSet = new Set(userAnswer);
            const correctSet = new Set(q.correct);
            if (userSet.size === correctSet.size && [...userSet].every(a => correctSet.has(a))) {
                score++;
            }
        } else if (q.type === 'ordering') {
            if (JSON.stringify(userAnswer) === JSON.stringify(q.correct)) {
                score++;
            }
        }
    });
    return score;
}

async function submitQuiz() {
    stopTimer();
    const score = calculateScore();
    const total = state.currentQuiz.questions.length;
    const pct = Math.round((score / total) * 100);
    
    try {
        await apiCall(`/quizzes/${state.currentQuiz.id}/attempts`, {
            method: 'POST',
            body: JSON.stringify({
                score,
                total,
                percentage: pct,
                answers: state.answers,
                study_mode: state.studyMode,
                timed: state.timerEnabled,
                max_streak: state.maxStreak,
                time_taken: state.timerEnabled ? (state.timerMinutes * 60 - state.timeRemaining) : null
            })
        });
    } catch (e) {
        showToast('Failed to save results', 'error');
    }
    
    clearQuizProgress();
    state.view = 'results';
    render();
    
    if (pct === 100) {
        setTimeout(() => showConfetti(), 100);
    }
}

function saveAndExitQuiz() {
    saveQuizProgress();
    stopTimer();
    showToast('Progress saved!', 'success');
    state.view = 'library';
    state.currentQuiz = null;
    render();
}

// ==========================================================================
// SECTION 11: Timer
// ==========================================================================

function startTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    
    state.timerInterval = setInterval(() => {
        state.timeRemaining--;
        updateTimerDisplay();
        
        if (state.timeRemaining <= 0) {
            stopTimer();
            state.timeExpired = true;
            showToast('Time\'s up!', 'warning');
            submitQuiz();
        }
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

function updateTimerDisplay() {
    const el = document.getElementById('timer');
    if (el) {
        const minutes = Math.floor(state.timeRemaining / 60);
        const seconds = state.timeRemaining % 60;
        el.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (state.timeRemaining <= 60) {
            el.classList.add('timer-urgent', 'timer-pulse');
        } else {
            el.classList.remove('timer-urgent', 'timer-pulse');
        }
    }
}

// ==========================================================================
// SECTION 12: Drag & Drop for Ordering Questions
// ==========================================================================

function handleDragStart(e, index) {
    e.dataTransfer.effectAllowed = 'move';
    e.target.classList.add('dragging');
    state.draggedIndex = index;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const item = e.target.closest('.draggable-item');
    if (item && !item.classList.contains('dragging')) {
        item.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const item = e.target.closest('.draggable-item');
    if (item) item.classList.remove('drag-over');
}

function handleDrop(e, targetIndex) {
    e.preventDefault();
    const item = e.target.closest('.draggable-item');
    if (item) item.classList.remove('drag-over');
    
    if (state.draggedIndex !== null && state.draggedIndex !== targetIndex) {
        const answers = [...state.answers[state.currentQuestionIndex]];
        const draggedItem = answers[state.draggedIndex];
        answers.splice(state.draggedIndex, 1);
        answers.splice(targetIndex, 0, draggedItem);
        state.answers[state.currentQuestionIndex] = answers;
        saveQuizProgress();
        render();
    }
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.draggable-item.drag-over').forEach(el =>
        el.classList.remove('drag-over')
    );
    state.draggedIndex = null;
}

// ==========================================================================
// SECTION 13: Quiz Card Drag & Drop (Library Reordering)
// ==========================================================================

function handleQuizDragStart(e, quizId) {
    state.draggedQuizId = quizId;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleQuizDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const card = e.target.closest('.quiz-card');
    if (card && !card.classList.contains('dragging')) {
        card.classList.add('drag-over');
    }
}

function handleQuizDragLeave(e) {
    const card = e.target.closest('.quiz-card');
    if (card) card.classList.remove('drag-over');
}

function handleQuizDrop(e, targetQuizId) {
    e.preventDefault();
    const card = e.target.closest('.quiz-card');
    if (card) card.classList.remove('drag-over');
    
    if (state.draggedQuizId !== null && state.draggedQuizId !== targetQuizId) {
        const fromIndex = state.customOrder.indexOf(state.draggedQuizId);
        const toIndex = state.customOrder.indexOf(targetQuizId);
        if (fromIndex !== -1 && toIndex !== -1) {
            state.customOrder.splice(fromIndex, 1);
            state.customOrder.splice(toIndex, 0, state.draggedQuizId);
            saveCustomOrder();
            state.sortBy = 'custom';
            render();
        }
    }
}

function handleQuizDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.quiz-card.drag-over').forEach(el =>
        el.classList.remove('drag-over')
    );
    state.draggedQuizId = null;
}

// ==========================================================================
// SECTION 14: Quiz CRUD Operations
// ==========================================================================

async function deleteQuiz(id) {
    const confirmed = await showConfirmDialog({
        title: 'Delete Quiz?',
        message: 'This action cannot be undone. All quiz data and attempts will be permanently deleted.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
    });
    
    if (!confirmed) return;
    
    try {
        showLoading();
        await apiCall(`/quizzes/${id}`, { method: 'DELETE' });
        
        // Clean up folders
        state.folders.forEach(f => {
            const idx = f.quizIds.indexOf(id);
            if (idx > -1) f.quizIds.splice(idx, 1);
        });
        saveFolders();
        
        // Clean up custom order
        const idx = state.customOrder.indexOf(id);
        if (idx > -1) state.customOrder.splice(idx, 1);
        saveCustomOrder();
        
        clearQuizProgress(id);
        await loadQuizzes();
        hideLoading();
        showToast('Quiz deleted successfully', 'success');
        render();
    } catch (e) {
        hideLoading();
        showToast('Failed to delete quiz', 'error');
    }
}

function editQuiz(id) {
    const quiz = state.quizzes.find(q => q.id === id);
    if (!quiz) return;
    
    state.editingQuizId = id;
    state.quizTitle = quiz.title;
    state.quizCategory = quiz.description || '';
    state.parsedQuestions = JSON.parse(JSON.stringify(quiz.questions));
    state.currentEditQuestion = 0;
    state.visualEditorMode = true;
    state.view = 'create';
    render();
}

async function saveQuiz() {
    if (!state.quizTitle.trim()) {
        showToast('Please enter a quiz title', 'error');
        return;
    }
    
    let questions;
    
    if (state.visualEditorMode && state.parsedQuestions) {
        // Validate visual editor questions
        const invalid = state.parsedQuestions.some(q => 
            !q.question.trim() || 
            q.options.length < 2 || 
            q.options.some(o => !o.trim()) ||
            (q.type === 'choice' && q.correct.length === 0)
        );
        
        if (invalid) {
            showToast('Please complete all questions with at least 2 options and correct answers', 'error');
            return;
        }
        
        questions = state.parsedQuestions;
    } else {
        // Parse from text
        questions = parseQuizText(state.quizData);
        if (questions.length === 0) {
            showToast('Please add at least one valid question', 'error');
            return;
        }
    }
    
    try {
        showLoading();
        
        const quizData = {
            title: state.quizTitle.trim(),
            questions,
            description: state.quizCategory.trim() || null,
            color: getRandomColor(),
            is_public: false
        };
        
        if (state.editingQuizId) {
            await apiCall(`/quizzes/${state.editingQuizId}`, {
                method: 'PUT',
                body: JSON.stringify(quizData)
            });
            showToast('Quiz updated!', 'success');
        } else {
            await apiCall('/quizzes', {
                method: 'POST',
                body: JSON.stringify(quizData)
            });
            showToast('Quiz created!', 'success');
        }
        
        await loadQuizzes();
        
        // Reset state
        state.view = 'library';
        state.editingQuizId = null;
        state.quizTitle = '';
        state.quizData = '';
        state.quizCategory = '';
        state.visualEditorMode = false;
        state.parsedQuestions = null;
        clearCreationState();
        
        hideLoading();
        render();
    } catch (e) {
        hideLoading();
        console.error('Save quiz error:', e);
        showToast(e.message || 'Failed to save quiz', 'error');
    }
}

function parseQuizText(text) {
    const questions = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    let current = null;
    
    for (const line of lines) {
        // New question
        const questionMatch = line.match(/^(\d+)\.\s*(.+)/);
        if (questionMatch) {
            if (current && current.question && current.options.length > 0) {
                questions.push(current);
            }
            
            const questionText = questionMatch[2].trim();
            const isOrdering = questionText.toLowerCase().startsWith('[order]');
            
            current = {
                question: isOrdering ? questionText.replace(/^\[order\]\s*/i, '').trim() : questionText,
                type: isOrdering ? 'ordering' : 'choice',
                options: [],
                correct: []
            };
            continue;
        }
        
        // Option line
        const optionMatch = line.match(/^([A-Za-z]|\d+)[.)]\s*(.+)/);
        if (optionMatch && current) {
            let optionText = optionMatch[2].trim();
            const isCorrect = optionText.includes('*') || 
                              optionText.toLowerCase().includes('[correct]');
            
            optionText = optionText
                .replace(/\s*\*\s*/g, '')
                .replace(/\s*\[correct\]\s*/gi, '')
                .trim();
            
            if (current.type === 'ordering') {
                current.correct.push(current.options.length);
            } else if (isCorrect) {
                current.correct.push(current.options.length);
            }
            
            current.options.push(optionText);
        }
    }
    
    // Push last question
    if (current && current.question && current.options.length > 0) {
        questions.push(current);
    }
    
    return questions;
}

// ==========================================================================
// SECTION 15: Folder Management
// ==========================================================================

function createFolder() {
    const name = prompt('Folder name:');
    if (!name?.trim()) return;
    
    state.folders.push({
        id: Date.now(),
        name: name.trim(),
        quizIds: [],
        color: getRandomColor()
    });
    saveFolders();
    showToast('Folder created', 'success');
    render();
}

async function deleteFolder(id) {
    const folder = state.folders.find(f => f.id === id);
    const confirmed = await showConfirmDialog({
        title: 'Delete Folder?',
        message: `Delete "${folder?.name}"? Quizzes inside will not be deleted.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'warning'
    });
    
    if (!confirmed) return;
    
    state.folders = state.folders.filter(f => f.id !== id);
    if (state.selectedFolder == id) state.selectedFolder = 'all';
    saveFolders();
    showToast('Folder deleted', 'success');
    render();
}

function addToFolder(quizId, folderId) {
    const folder = state.folders.find(f => f.id === folderId);
    if (!folder) return;
    
    if (folder.quizIds.includes(quizId)) {
        showToast('Already in folder', 'info');
        return;
    }
    
    folder.quizIds.push(quizId);
    saveFolders();
    showToast(`Added to ${folder.name}`, 'success');
    render();
}

function removeFromFolder(quizId, folderId) {
    const folder = state.folders.find(f => f.id === folderId);
    if (!folder) return;
    
    const idx = folder.quizIds.indexOf(quizId);
    if (idx > -1) {
        folder.quizIds.splice(idx, 1);
        saveFolders();
        showToast(`Removed from ${folder.name}`, 'success');
        render();
    }
}

// ==========================================================================
// SECTION 16: Import/Export
// ==========================================================================

function exportQuiz(id) {
    const quiz = state.quizzes.find(q => q.id === id);
    if (!quiz) return;
    
    const data = {
        title: quiz.title,
        description: quiz.description,
        questions: quiz.questions
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz.title.replace(/[^a-z0-9]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Quiz exported', 'success');
}

function importQuizFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            showLoading();
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!data.title || !data.questions || !Array.isArray(data.questions)) {
                throw new Error('Invalid quiz format');
            }
            
            await apiCall('/quizzes', {
                method: 'POST',
                body: JSON.stringify({
                    title: data.title,
                    questions: data.questions,
                    description: data.description || null,
                    color: getRandomColor(),
                    is_public: false
                })
            });
            
            await loadQuizzes();
            hideLoading();
            showToast('Quiz imported!', 'success');
            render();
        } catch (e) {
            hideLoading();
            showToast('Failed to import quiz', 'error');
        }
    };
    
    input.click();
}

function showQuizletImport() {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="modal-overlay" onclick="if(event.target===this)this.remove()">
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h2>📥 Import from Quizlet</h2>
                    <button class="btn btn-icon btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <p class="text-sm text-muted" style="margin-bottom:1rem">
                        Copy your Quizlet set and paste below. Use Tab-separated format (Term → Definition)
                    </p>
                    <div style="margin-bottom:1rem">
                        <label class="input-label">Quiz Title</label>
                        <input type="text" id="quizletTitle" class="input" placeholder="My Quiz">
                    </div>
                    <div style="margin-bottom:1rem">
                        <label class="input-label">Category (optional)</label>
                        <input type="text" id="quizletCategory" class="input" placeholder="e.g., Biology">
                    </div>
                    <div>
                        <label class="input-label">Quizlet Data</label>
                        <textarea id="quizletData" class="input" rows="8" placeholder="Term&#9;Definition&#10;Term 2&#9;Definition 2"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="btn btn-accent" onclick="processQuizletImport()">Import</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal.firstElementChild);
}

async function processQuizletImport() {
    const title = document.getElementById('quizletTitle')?.value.trim();
    const category = document.getElementById('quizletCategory')?.value.trim();
    const data = document.getElementById('quizletData')?.value.trim();
    
    if (!title || !data) {
        showToast('Please provide a title and data', 'error');
        return;
    }
    
    const lines = data.split('\n').filter(l => l.trim());
    const terms = lines.map(l => {
        const parts = l.split('\t');
        if (parts.length >= 2) {
            return { term: parts[0].trim(), def: parts[1].trim() };
        }
        return null;
    }).filter(t => t);
    
    if (terms.length === 0) {
        showToast('No valid terms found', 'error');
        return;
    }
    
    // Generate questions
    const questions = terms.map(t => {
        const wrong = terms
            .filter(other => other !== t)
            .map(o => o.def)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
        
        const opts = shuffleArray([t.def, ...wrong]);
        const correctIdx = opts.indexOf(t.def);
        
        return {
            question: `What is: ${t.term}?`,
            type: 'choice',
            options: opts,
            correct: [correctIdx],
            explanation: t.def
        };
    });
    
    try {
        showLoading();
        await apiCall('/quizzes', {
            method: 'POST',
            body: JSON.stringify({
                title,
                questions,
                description: category || null,
                color: getRandomColor(),
                is_public: false
            })
        });
        
        await loadQuizzes();
        document.querySelector('.modal-overlay').remove();
        hideLoading();
        showToast(`Created ${questions.length} questions!`, 'success');
        render();
    } catch (e) {
        hideLoading();
        showToast('Failed to import', 'error');
    }
}


// ==========================================================================
// SECTION 17: Visual Editor Functions
// ==========================================================================

function initVisualEditor() {
    if (!state.parsedQuestions) {
        if (state.quizData.trim()) {
            state.parsedQuestions = parseQuizText(state.quizData);
        }
        
        if (!state.parsedQuestions || state.parsedQuestions.length === 0) {
            state.parsedQuestions = [{
                question: '',
                type: 'choice',
                options: ['', ''],
                correct: [],
                code: null,
                image: null,
                explanation: null
            }];
        }
    }
    
    state.currentEditQuestion = 0;
    state.visualEditorMode = true;
}

function addNewQuestion() {
    state.parsedQuestions.push({
        question: '',
        type: 'choice',
        options: ['', ''],
        correct: [],
        code: null,
        image: null,
        explanation: null
    });
    state.currentEditQuestion = state.parsedQuestions.length - 1;
    render();
}

function deleteQuestion(index) {
    if (state.parsedQuestions.length === 1) {
        showToast('Cannot delete the last question', 'warning');
        return;
    }
    
    state.parsedQuestions.splice(index, 1);
    
    if (state.currentEditQuestion >= state.parsedQuestions.length) {
        state.currentEditQuestion = state.parsedQuestions.length - 1;
    }
    
    render();
}

function switchQuestion(index) {
    state.currentEditQuestion = index;
    render();
}

function updateQuestionField(field, value) {
    const q = state.parsedQuestions[state.currentEditQuestion];
    q[field] = value;
    saveCreationState();
}

function updateQuestionType(newType) {
    const q = state.parsedQuestions[state.currentEditQuestion];
    const oldType = q.type;
    
    if (!q._previousCorrect) {
        q._previousCorrect = { choice: [], ordering: [] };
    }
    
    q._previousCorrect[oldType] = [...q.correct];
    q.type = newType;
    
    if (q._previousCorrect[newType] && q._previousCorrect[newType].length > 0) {
        q.correct = [...q._previousCorrect[newType]];
    } else {
        if (newType === 'ordering') {
            q.correct = q.options.map((_, i) => i);
        } else {
            q.correct = [];
        }
    }
    
    render();
}

function toggleCorrectOption(index) {
    const q = state.parsedQuestions[state.currentEditQuestion];
    const idx = q.correct.indexOf(index);
    
    if (idx > -1) {
        q.correct.splice(idx, 1);
    } else {
        q.correct.push(index);
    }
    
    render();
}

function updateOption(index, value) {
    const q = state.parsedQuestions[state.currentEditQuestion];
    q.options[index] = value;
    saveCreationState();
}

function addOption() {
    const q = state.parsedQuestions[state.currentEditQuestion];
    q.options.push('');
    render();
}

function removeOption(index) {
    const q = state.parsedQuestions[state.currentEditQuestion];
    if (q.options.length <= 2) {
        showToast('Need at least 2 options', 'warning');
        return;
    }
    q.options.splice(index, 1);
    q.correct = q.correct.filter(i => i !== index).map(i => i > index ? i - 1 : i);
    render();
}

function handleImageUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be under 5MB', 'error');
            return;
        }
        
        try {
            showLoading();
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            
            updateQuestionField('image', base64);
            hideLoading();
            showToast('Image uploaded!', 'success');
            render();
        } catch (err) {
            hideLoading();
            showToast('Failed to upload image', 'error');
        }
    };
    
    input.click();
}

function removeImage() {
    updateQuestionField('image', null);
    showToast('Image removed', 'info');
    render();
}

// Editor drag & drop for ordering
function handleEditorDragStart(e, index) {
    state.editorDraggedIndex = index;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleEditorDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const item = e.target.closest('.option-editor');
    if (item && !item.classList.contains('dragging')) {
        item.classList.add('drag-over');
    }
}

function handleEditorDragLeave(e) {
    const item = e.target.closest('.option-editor');
    if (item) item.classList.remove('drag-over');
}

function handleEditorDrop(e, targetIndex) {
    e.preventDefault();
    const item = e.target.closest('.option-editor');
    if (item) item.classList.remove('drag-over');
    
    if (state.editorDraggedIndex !== null && state.editorDraggedIndex !== targetIndex) {
        const q = state.parsedQuestions[state.currentEditQuestion];
        const dragged = q.options[state.editorDraggedIndex];
        q.options.splice(state.editorDraggedIndex, 1);
        q.options.splice(targetIndex, 0, dragged);
        
        // Update correct indices for ordering type
        if (q.type === 'ordering') {
            q.correct = q.options.map((_, i) => i);
        }
        
        render();
    }
}

function handleEditorDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.option-editor.drag-over').forEach(el =>
        el.classList.remove('drag-over')
    );
    state.editorDraggedIndex = null;
}

// ==========================================================================
// SECTION 18: Keyboard Shortcuts
// ==========================================================================

const shortcuts = {
    'n': { action: () => nextQuestion(), context: 'quiz', description: 'Next question' },
    'p': { action: () => prevQuestion(), context: 'quiz', description: 'Previous question' },
    ' ': { action: (e) => { e.preventDefault(); if (state.view === 'quiz') document.querySelector('.option-btn')?.click(); }, context: 'quiz', description: 'Select option' },
    'Enter': { action: (e) => { e.preventDefault(); if (state.view === 'quiz') nextQuestion(); }, context: 'quiz', description: 'Next/Submit' },
    'f': { action: () => toggleFlag(), context: 'quiz', description: 'Flag question' },
    '?': { action: () => showKeyboardShortcuts(), context: 'all', description: 'Show shortcuts' },
    'Escape': { action: () => document.querySelector('.modal-overlay')?.remove(), context: 'all', description: 'Close modal' }
};

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    const shortcut = shortcuts[e.key];
    if (shortcut && (shortcut.context === 'all' || shortcut.context === state.view)) {
        shortcut.action(e);
    }
});

function showKeyboardShortcuts() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>⌨️ Keyboard Shortcuts</h2>
                <button class="btn btn-icon btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <div class="modal-body">
                <div class="shortcut-list">
                    <div class="shortcut-item">
                        <span>Next question</span>
                        <div class="shortcut-keys">
                            <kbd class="keyboard-hint">N</kbd>
                            <span class="text-muted">or</span>
                            <kbd class="keyboard-hint">Enter</kbd>
                        </div>
                    </div>
                    <div class="shortcut-item">
                        <span>Previous question</span>
                        <kbd class="keyboard-hint">P</kbd>
                    </div>
                    <div class="shortcut-item">
                        <span>Select option</span>
                        <kbd class="keyboard-hint">Space</kbd>
                    </div>
                    <div class="shortcut-item">
                        <span>Flag question</span>
                        <kbd class="keyboard-hint">F</kbd>
                    </div>
                    <div class="shortcut-item">
                        <span>Close modal</span>
                        <kbd class="keyboard-hint">Esc</kbd>
                    </div>
                    <div class="shortcut-item">
                        <span>Show this help</span>
                        <kbd class="keyboard-hint">?</kbd>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}


// ==========================================================================
// SECTION 19: Render Functions
// ==========================================================================

function render() {
    let html = '';
    
    if (!state.isAuthenticated) {
        html = renderAuth();
    } else {
        switch (state.view) {
            case 'library': html = renderLibrary(); break;
            case 'create': html = renderCreate(); break;
            case 'quiz': html = renderQuiz(); break;
            case 'results': html = renderResults(); break;
            case 'review': html = renderReview(); break;
            default: html = renderLibrary();
        }
    }
    
    document.getElementById('app').innerHTML = html;
    bindEvents();
    
    if (state.isAuthenticated && state.view === 'create') {
        saveCreationState();
    }
}

function renderAuth() {
    const isLogin = state.authMode === 'login';
    
    return `
        <div class="auth-page">
            <div class="auth-card">
                <div class="auth-logo">
                    <div class="logo-mark">⚡</div>
                    <span style="font-family:var(--font-display);font-size:1.5rem;font-weight:700">QuizForge</span>
                </div>
                
                <h2 class="auth-title">${isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                <p class="auth-subtitle">${isLogin ? 'Sign in to continue learning' : 'Start your learning journey'}</p>
                
                <form id="authForm" class="flex flex-col gap-md">
                    <div>
                        <label class="input-label">Username</label>
                        <input type="text" id="authUsername" class="input" placeholder="Enter username" required autocomplete="username">
                    </div>
                    <div>
                        <label class="input-label">Password</label>
                        <input type="password" id="authPassword" class="input" placeholder="Enter password" required autocomplete="${isLogin ? 'current-password' : 'new-password'}">
                    </div>
                    <button type="submit" class="btn btn-accent btn-lg" style="width:100%;margin-top:0.5rem">
                        ${isLogin ? 'Sign In' : 'Create Account'}
                    </button>
                </form>
                
                <div class="auth-divider">or</div>
                
                <button onclick="state.authMode='${isLogin ? 'register' : 'login'}';render()" class="btn btn-ghost" style="width:100%">
                    ${isLogin ? 'Create new account' : 'Sign in to existing account'}
                </button>
            </div>
        </div>
    `;
}

function renderLibrary() {
    const stats = getUserStats();
    const categories = getCategories();
    const inProgress = getAllInProgressQuizzes();
    
    return `
        <nav class="navbar">
            <div class="container">
                <div class="navbar-inner">
                    <a href="#" class="logo" onclick="state.view='library';render();return false;">
                        <div class="logo-mark">⚡</div>
                        <span>QuizForge</span>
                    </a>
                    
                    <div class="flex items-center gap-md">
                        <button onclick="toggleDarkMode()" class="btn btn-icon btn-ghost" title="Toggle dark mode">
                            ${state.darkMode ? '☀️' : '🌙'}
                        </button>
                        
                        <div class="dropdown user-menu">
                            <button class="user-menu-btn" onclick="this.parentElement.classList.toggle('open')">
                                <div class="user-avatar">${state.user?.username?.charAt(0).toUpperCase() || 'U'}</div>
                                <span class="text-sm font-medium">${state.user?.username || 'User'}</span>
                                <span style="font-size:0.75rem">▼</span>
                            </button>
                            <div class="dropdown-menu">
                                <button class="dropdown-item" onclick="showKeyboardShortcuts()">⌨️ Shortcuts</button>
                                <div class="dropdown-divider"></div>
                                <button class="dropdown-item danger" onclick="logout()">🚪 Sign Out</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
        
        <main style="padding:2rem 0 4rem">
            <div class="container">
                <!-- Welcome & Stats -->
                <div style="margin-bottom:2rem">
                    <h1 style="margin-bottom:0.5rem">Welcome back, ${escapeHtml(state.user?.username || 'Student')}!</h1>
                    <p class="text-muted">Keep up the great work on your learning journey.</p>
                </div>
                
                <!-- Stats Cards -->
                <div class="grid grid-4 gap-md" style="margin-bottom:2rem">
                    <div class="stat-card accent">
                        <div class="stat-value">${stats.totalQuizzes}</div>
                        <div class="stat-label">Total Quizzes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalQuestions}</div>
                        <div class="stat-label">Questions</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalAttempts}</div>
                        <div class="stat-label">Attempts</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.avgScore}%</div>
                        <div class="stat-label">Avg Score</div>
                    </div>
                </div>
                
                ${inProgress.length > 0 ? `
                    <!-- In Progress Section -->
                    <div class="card" style="padding:1.5rem;margin-bottom:2rem;background:var(--primary-glow);border-color:var(--primary)">
                        <h3 style="margin-bottom:1rem">📝 Continue Where You Left Off</h3>
                        <div class="flex flex-wrap gap-md">
                            ${inProgress.slice(0, 3).map(p => {
                                const pct = Math.round((p.answers.filter(a => a != null).length / p.questions.length) * 100);
                                return `
                                    <button onclick="continueQuiz(${p.quizId})" class="card" style="padding:1rem;cursor:pointer;flex:1;min-width:200px">
                                        <p class="font-semibold" style="margin-bottom:0.25rem">${escapeHtml(p.quizTitle)}</p>
                                        <p class="text-xs text-muted" style="margin-bottom:0.5rem">
                                            Q${p.currentQuestionIndex + 1} of ${p.questions.length}
                                        </p>
                                        <div class="progress-bar" style="height:4px">
                                            <div class="progress-fill" style="width:${pct}%"></div>
                                        </div>
                                    </button>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Toolbar -->
                <div class="flex flex-wrap items-center gap-md" style="margin-bottom:1.5rem">
                    <div class="search-wrapper" style="flex:1;min-width:200px;max-width:400px">
                        <span class="search-icon">🔍</span>
                        <input type="text" id="quiz-search" class="input search-input" placeholder="Search quizzes..." value="${escapeHtml(state.searchQuery)}">
                    </div>
                    
                    <div class="flex gap-sm flex-wrap">
                        <select class="input" style="width:auto;padding:0.5rem 1rem" onchange="state.sortBy=this.value;render()">
                            <option value="custom" ${state.sortBy === 'custom' ? 'selected' : ''}>Custom Order</option>
                            <option value="recent" ${state.sortBy === 'recent' ? 'selected' : ''}>Most Recent</option>
                            <option value="alpha" ${state.sortBy === 'alpha' ? 'selected' : ''}>Alphabetical</option>
                        </select>
                        
                        ${categories.length > 0 ? `
                            <select class="input" style="width:auto;padding:0.5rem 1rem" onchange="state.categoryFilter=this.value;render()">
                                <option value="all">All Categories</option>
                                ${categories.map(c => `<option value="${escapeHtml(c)}" ${state.categoryFilter === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
                            </select>
                        ` : ''}
                    </div>
                    
                    <div class="flex gap-sm" style="margin-left:auto">
                        <div class="dropdown">
                            <button class="btn btn-ghost" onclick="this.parentElement.classList.toggle('open')">
                                📥 Import ▼
                            </button>
                            <div class="dropdown-menu">
                                <button class="dropdown-item" onclick="importQuizFile();this.closest('.dropdown').classList.remove('open')">📄 From JSON</button>
                                <button class="dropdown-item" onclick="showQuizletImport();this.closest('.dropdown').classList.remove('open')">📚 From Quizlet</button>
                            </div>
                        </div>
                        <button onclick="state.view='create';state.editingQuizId=null;state.quizTitle='';state.quizData='';state.quizCategory='';state.parsedQuestions=null;state.visualEditorMode=false;render()" class="btn btn-accent">
                            ✨ New Quiz
                        </button>
                    </div>
                </div>
                
                <!-- Folders -->
                <div class="flex flex-wrap items-center gap-sm" style="margin-bottom:1.5rem">
                    <button onclick="state.selectedFolder='all';render()" class="btn ${state.selectedFolder === 'all' ? 'btn-accent' : 'btn-ghost'} btn-sm">
                        📚 All
                    </button>
                    ${state.folders.map(f => `
                        <div class="folder-btn">
                            <button onclick="state.selectedFolder=${f.id};render()" class="btn ${state.selectedFolder == f.id ? 'btn-accent' : 'btn-ghost'} btn-sm">
                                📁 ${escapeHtml(f.name)} (${f.quizIds.length})
                            </button>
                            <button onclick="event.stopPropagation();deleteFolder(${f.id})" class="folder-delete">✕</button>
                        </div>
                    `).join('')}
                    <button onclick="createFolder()" class="btn btn-ghost btn-sm">+ Folder</button>
                </div>
                
                <!-- Quiz Grid -->
                <div id="quiz-grid"></div>
            </div>
        </main>
    `;
}

function renderQuizGrid() {
    const gridContainer = document.getElementById('quiz-grid');
    if (!gridContainer) return;
    
    const filtered = getFilteredQuizzes();
    
    if (filtered.length > 0) {
        gridContainer.className = 'grid grid-3 gap-lg';
        gridContainer.innerHTML = filtered.map(q => {
            const stats = getQuizStats(q);
            const isDraggable = state.sortBy === 'custom' && !state.searchQuery && state.categoryFilter === 'all';
            const progress = loadQuizProgress(q.id);
            
            return `
                <div class="quiz-card ${isDraggable ? 'draggable' : ''}"
                    onclick="showQuizOptions(${q.id})"
                    ${isDraggable ? `
                        draggable="true"
                        ondragstart="handleQuizDragStart(event, ${q.id})"
                        ondragover="handleQuizDragOver(event)"
                        ondragleave="handleQuizDragLeave(event)"
                        ondrop="handleQuizDrop(event, ${q.id})"
                        ondragend="handleQuizDragEnd(event)"
                    ` : ''}>
                    
                    ${progress ? `
                        <div class="quiz-card-progress">
                            <div class="quiz-card-progress-fill" style="width:${Math.round((progress.answers.filter(a => a != null).length / progress.questions.length) * 100)}%"></div>
                        </div>
                    ` : ''}
                    
                    ${isDraggable ? '<span class="drag-handle">⋮⋮</span>' : ''}
                    
                    <div class="quiz-card-actions">
                        <div class="dropdown">
                            <button class="btn btn-icon btn-ghost btn-sm" onclick="event.stopPropagation();this.parentElement.classList.toggle('open')">⋯</button>
                            <div class="dropdown-menu">
                                <button class="dropdown-item" onclick="event.stopPropagation();showQuizPreview(${q.id});this.closest('.dropdown').classList.remove('open')">👁️ Preview</button>
                                <button class="dropdown-item" onclick="event.stopPropagation();editQuiz(${q.id});this.closest('.dropdown').classList.remove('open')">✏️ Edit</button>
                                <button class="dropdown-item" onclick="event.stopPropagation();exportQuiz(${q.id});this.closest('.dropdown').classList.remove('open')">📤 Export</button>
                                ${state.folders.length > 0 ? `
                                    <div class="dropdown-divider"></div>
                                    ${state.folders.map(f => `
                                        <button class="dropdown-item" onclick="event.stopPropagation();addToFolder(${q.id},${f.id});this.closest('.dropdown').classList.remove('open')">
                                            📁 Add to ${escapeHtml(f.name)}
                                        </button>
                                    `).join('')}
                                ` : ''}
                                <div class="dropdown-divider"></div>
                                <button class="dropdown-item danger" onclick="event.stopPropagation();deleteQuiz(${q.id});this.closest('.dropdown').classList.remove('open')">🗑️ Delete</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="quiz-card-header">
                        <div class="quiz-card-icon" style="background:${q.color || 'var(--primary-glow)'};color:${q.color ? 'white' : 'var(--primary)'}">
                            📝
                        </div>
                        <div class="quiz-card-content">
                            <h3 class="quiz-card-title">${state.searchQuery ? highlightText(q.title, state.searchQuery) : escapeHtml(q.title)}</h3>
                            <p class="quiz-card-meta">
                                ${q.questions?.length || 0} questions${q.description ? ` • ${escapeHtml(q.description)}` : ''}
                            </p>
                        </div>
                    </div>
                    
                    <div class="quiz-card-stats">
                        ${stats ? `
                            <div class="quiz-card-stat">
                                <span>🏆</span>
                                <span>${stats.best}% best</span>
                            </div>
                            <div class="quiz-card-stat">
                                <span>📊</span>
                                <span>${stats.attemptCount} attempt${stats.attemptCount !== 1 ? 's' : ''}</span>
                            </div>
                        ` : `
                            <div class="quiz-card-stat">
                                <span class="text-muted">Not attempted yet</span>
                            </div>
                        `}
                        <div class="quiz-card-stat" style="margin-left:auto">
                            <span>${formatDate(q.last_modified || q.created_at)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        gridContainer.className = '';
        gridContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📚</div>
                <h3 class="empty-state-title">
                    ${state.searchQuery ? 'No matches found' : state.selectedFolder !== 'all' ? 'Folder is empty' : 'No quizzes yet'}
                </h3>
                <p class="empty-state-desc">
                    ${state.searchQuery ? 'Try a different search term' : 'Create your first quiz to get started!'}
                </p>
                ${!state.searchQuery ? `
                    <button onclick="state.view='create';state.editingQuizId=null;render()" class="btn btn-accent">
                        ✨ Create Quiz
                    </button>
                ` : ''}
            </div>
        `;
    }
}

function renderCreate() {
    const isEditing = state.editingQuizId !== null;
    
    // Visual editor mode
    if (state.visualEditorMode && state.visualEditorQuestions) {
        const q = state.visualEditorQuestions[state.currentEditorQuestion] || state.visualEditorQuestions[0];
        const qIndex = state.currentEditorQuestion || 0;
        
        return `
            <nav class="navbar">
                <div class="container">
                    <div class="navbar-inner">
                        <a href="#" class="logo" onclick="state.view='library';render();return false;">
                            <div class="logo-mark">⚡</div>
                            <span>QuizForge</span>
                        </a>
                        <div class="flex items-center gap-md">
                            <button onclick="toggleDarkMode()" class="btn btn-icon btn-ghost">${state.darkMode ? '☀️' : '🌙'}</button>
                        </div>
                    </div>
                </div>
            </nav>
            
            <div class="visual-editor">
                <aside class="editor-sidebar">
                    <div style="padding:1rem;border-bottom:1px solid var(--border)">
                        <input type="text" id="quiz-title" class="input" placeholder="Quiz title..." value="${escapeHtml(state.quizTitle || '')}" style="font-weight:600">
                    </div>
                    <div style="padding:0.5rem 0;flex:1;overflow-y:auto">
                        ${state.visualEditorQuestions.map((vq, i) => `
                            <div class="editor-question-item ${i === qIndex ? 'active' : ''}" onclick="switchQuestion(${i})">
                                <span style="font-size:0.75rem;color:var(--text-muted);min-width:24px">Q${i + 1}</span>
                                <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(vq.text?.substring(0, 30) || 'New question')}${vq.text?.length > 30 ? '...' : ''}</span>
                                ${state.visualEditorQuestions.length > 1 ? `
                                    <button onclick="event.stopPropagation();deleteQuestion(${i})" class="btn btn-icon btn-ghost btn-sm" style="opacity:0.5">✕</button>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                    <div style="padding:1rem;border-top:1px solid var(--border)">
                        <button onclick="addNewQuestion()" class="btn btn-ghost" style="width:100%">+ Add Question</button>
                    </div>
                </aside>
                
                <main class="editor-main">
                    <div class="editor-card">
                        <div class="editor-section">
                            <label class="text-sm font-medium text-muted">Question Type</label>
                            <div class="editor-tabs">
                                <button onclick="updateQuestionType('choice')" class="editor-tab ${q.type === 'choice' ? 'active' : ''}">Multiple Choice</button>
                                <button onclick="updateQuestionType('multi')" class="editor-tab ${q.type === 'multi' ? 'active' : ''}">Multi-Select</button>
                                <button onclick="updateQuestionType('order')" class="editor-tab ${q.type === 'order' ? 'active' : ''}">Ordering</button>
                            </div>
                        </div>
                        
                        <div class="editor-section">
                            <label class="text-sm font-medium text-muted">Question Text</label>
                            <textarea id="question-text" class="input" rows="3" placeholder="Enter your question..." oninput="updateQuestionField('text', this.value)">${escapeHtml(q.text || '')}</textarea>
                        </div>
                        
                        ${q.image ? `
                            <div class="editor-section">
                                <label class="text-sm font-medium text-muted">Image</label>
                                <div style="position:relative;max-width:300px">
                                    <img src="${q.image}" style="width:100%;border-radius:var(--radius-md)">
                                    <button onclick="removeImage()" class="btn btn-icon btn-ghost" style="position:absolute;top:0.5rem;right:0.5rem;background:rgba(0,0,0,0.5);color:white">✕</button>
                                </div>
                            </div>
                        ` : `
                            <div class="editor-section">
                                <label class="text-sm font-medium text-muted">Image (optional)</label>
                                <div class="image-upload" onclick="document.getElementById('image-input').click()">
                                    <input type="file" id="image-input" accept="image/*" style="display:none" onchange="handleImageUpload(event)">
                                    <span style="font-size:2rem;opacity:0.5">🖼️</span>
                                    <span class="text-muted">Click to upload image</span>
                                </div>
                            </div>
                        `}
                        
                        ${q.code ? `
                            <div class="editor-section">
                                <label class="text-sm font-medium text-muted">Code Block</label>
                                <div class="code-editor">
                                    <div class="code-editor-header">
                                        <span style="font-size:0.75rem;opacity:0.7">Code</span>
                                        <button onclick="updateQuestionField('code', '')" class="btn btn-icon btn-ghost btn-sm">✕</button>
                                    </div>
                                    <textarea class="code-editor-content" rows="4" oninput="updateQuestionField('code', this.value)">${escapeHtml(q.code)}</textarea>
                                </div>
                            </div>
                        ` : `
                            <div class="editor-section">
                                <button onclick="updateQuestionField('code', '// Your code here')" class="btn btn-ghost btn-sm">+ Add code block</button>
                            </div>
                        `}
                        
                        <div class="editor-section">
                            <label class="text-sm font-medium text-muted">
                                ${q.type === 'order' ? 'Items (drag to set correct order)' : q.type === 'multi' ? 'Options (click ✓ for correct answers)' : 'Options (click ✓ for correct answer)'}
                            </label>
                            <div class="option-editor">
                                ${(q.options || []).map((opt, i) => `
                                    <div class="option-editor-item ${q.type === 'order' ? 'order' : ''}"
                                        ${q.type === 'order' ? `draggable="true" ondragstart="handleEditorDragStart(event, ${i})" ondragover="handleEditorDragOver(event)" ondragleave="handleEditorDragLeave(event)" ondrop="handleEditorDrop(event, ${i})" ondragend="handleEditorDragEnd(event)"` : ''}>
                                        ${q.type === 'order' ? '<span class="drag-handle">⋮⋮</span>' : `
                                            <button onclick="toggleCorrectOption(${i})" class="option-correct-btn ${
                                                q.type === 'multi' 
                                                    ? ((q.correct || []).includes(i) ? 'active' : '')
                                                    : (q.correct === i ? 'active' : '')
                                            }">✓</button>
                                        `}
                                        <input type="text" class="input" value="${escapeHtml(opt)}" oninput="updateOption(${i}, this.value)" placeholder="Option ${i + 1}">
                                        ${(q.options || []).length > 2 ? `
                                            <button onclick="removeOption(${i})" class="btn btn-icon btn-ghost btn-sm">✕</button>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                            ${(q.options || []).length < 8 ? `
                                <button onclick="addOption()" class="btn btn-ghost btn-sm" style="margin-top:0.5rem">+ Add Option</button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="flex justify-between" style="margin-top:1.5rem">
                        <button onclick="state.view='library';clearCreationState();render()" class="btn btn-ghost">Cancel</button>
                        <div class="flex gap-sm">
                            <button onclick="state.visualEditorMode=false;render()" class="btn btn-secondary">Switch to Text</button>
                            <button onclick="saveQuiz()" class="btn btn-accent">${isEditing ? 'Save Changes' : 'Create Quiz'}</button>
                        </div>
                    </div>
                </main>
            </div>
        `;
    }
    
    // Text editor mode
    return `
        <nav class="navbar">
            <div class="container">
                <div class="navbar-inner">
                    <a href="#" class="logo" onclick="state.view='library';render();return false;">
                        <div class="logo-mark">⚡</div>
                        <span>QuizForge</span>
                    </a>
                    <div class="flex items-center gap-md">
                        <button onclick="toggleDarkMode()" class="btn btn-icon btn-ghost">${state.darkMode ? '☀️' : '🌙'}</button>
                    </div>
                </div>
            </div>
        </nav>
        
        <main style="padding:2rem 0 4rem">
            <div class="container narrow">
                <h1 style="margin-bottom:1.5rem">${isEditing ? 'Edit Quiz' : 'Create New Quiz'}</h1>
                
                <div class="card" style="padding:1.5rem">
                    <div class="editor-section">
                        <label class="text-sm font-medium text-muted">Quiz Title</label>
                        <input type="text" id="quiz-title" class="input" placeholder="e.g., Chapter 5 Review" value="${escapeHtml(state.quizTitle || '')}">
                    </div>
                    
                    <div class="editor-section">
                        <label class="text-sm font-medium text-muted">Category (optional)</label>
                        <input type="text" id="quiz-category" class="input" placeholder="e.g., History, Science" value="${escapeHtml(state.quizCategory || '')}">
                    </div>
                    
                    <div class="editor-section">
                        <div class="flex justify-between items-center" style="margin-bottom:0.5rem">
                            <label class="text-sm font-medium text-muted">Questions</label>
                            <a href="#" onclick="event.preventDefault();document.getElementById('format-help').classList.toggle('hidden')" class="text-sm text-primary">Format help</a>
                        </div>
                        
                        <div id="format-help" class="hidden card" style="padding:1rem;margin-bottom:1rem;background:var(--surface-elevated);font-size:0.875rem">
                            <p style="margin-bottom:0.75rem"><strong>Text Format:</strong></p>
                            <pre style="background:var(--surface);padding:0.75rem;border-radius:var(--radius-sm);overflow-x:auto;margin-bottom:1rem">Question text?
*Correct answer
Wrong answer 1
Wrong answer 2

[order] Put these in order:
First item
Second item
Third item</pre>
                            <p class="text-muted">Use * to mark correct answers. For multi-select, mark multiple with *. For ordering, use [order] prefix.</p>
                        </div>
                        
                        <textarea id="quiz-data" class="input" rows="15" placeholder="Enter questions in text format or switch to visual editor..." style="font-family:var(--font-mono);font-size:0.875rem">${escapeHtml(state.quizData || '')}</textarea>
                    </div>
                    
                    <div class="flex justify-between" style="margin-top:1.5rem">
                        <button onclick="state.view='library';clearCreationState();render()" class="btn btn-ghost">Cancel</button>
                        <div class="flex gap-sm">
                            <button onclick="initVisualEditor()" class="btn btn-secondary">Visual Editor</button>
                            <button onclick="saveQuiz()" class="btn btn-accent">${isEditing ? 'Save Changes' : 'Create Quiz'}</button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    `;
}

function renderQuiz() {
    const quiz = state.quizzes.find(q => q.id === state.currentQuizId);
    if (!quiz || !state.currentQuestions) return renderLibrary();
    
    const q = state.currentQuestions[state.currentQuestionIndex];
    if (!q) return renderLibrary();
    
    const total = state.currentQuestions.length;
    const current = state.currentQuestionIndex + 1;
    const answered = state.answers.filter(a => a != null).length;
    const flagged = state.flaggedQuestions || [];
    
    return `
        <nav class="navbar">
            <div class="container">
                <div class="navbar-inner">
                    <a href="#" class="logo" onclick="saveAndExitQuiz();return false;">
                        <div class="logo-mark">⚡</div>
                        <span>QuizForge</span>
                    </a>
                    <div class="flex items-center gap-md">
                        ${state.timerEnabled && !state.studyMode ? `
                            <div class="timer ${state.timeRemaining <= 60 ? 'urgent' : ''}">
                                ⏱️ ${Math.floor(state.timeRemaining / 60)}:${(state.timeRemaining % 60).toString().padStart(2, '0')}
                            </div>
                        ` : ''}
                        ${state.studyMode ? `
                            <div class="badge badge-accent">
                                🔥 Streak: ${state.currentStreak || 0}
                            </div>
                        ` : ''}
                        <button onclick="saveAndExitQuiz()" class="btn btn-ghost btn-sm">Save & Exit</button>
                    </div>
                </div>
            </div>
        </nav>
        
        <main style="padding:2rem 0 4rem">
            <div class="container narrow">
                <!-- Progress Header -->
                <div class="flex items-center justify-between" style="margin-bottom:1rem">
                    <h2 style="font-size:1.125rem;font-weight:500">${escapeHtml(quiz.title)}</h2>
                    <span class="text-muted text-sm">${answered}/${total} answered</span>
                </div>
                
                <div class="progress-bar" style="margin-bottom:2rem">
                    <div class="progress-fill" style="width:${(current / total) * 100}%"></div>
                </div>
                
                <!-- Question Numbers -->
                <div class="question-numbers">
                    ${state.currentQuestions.map((_, i) => `
                        <button onclick="state.currentQuestionIndex=${i};render()" 
                            class="question-number ${i === state.currentQuestionIndex ? 'active' : ''} ${state.answers[i] != null ? 'answered' : ''} ${flagged.includes(i) ? 'flagged' : ''}">
                            ${i + 1}
                        </button>
                    `).join('')}
                </div>
                
                <!-- Question Card -->
                <div class="card" style="padding:2rem;margin-bottom:1.5rem">
                    <div class="flex items-center gap-sm" style="margin-bottom:1rem">
                        <span class="badge">${q.type === 'order' ? 'Ordering' : q.type === 'multi' ? 'Multi-Select' : 'Multiple Choice'}</span>
                        <span class="text-muted text-sm">Question ${current} of ${total}</span>
                        <button onclick="state.flaggedQuestions=state.flaggedQuestions||[];if(state.flaggedQuestions.includes(${state.currentQuestionIndex})){state.flaggedQuestions=state.flaggedQuestions.filter(i=>i!==${state.currentQuestionIndex})}else{state.flaggedQuestions.push(${state.currentQuestionIndex})};render()" 
                            class="btn btn-ghost btn-sm" style="margin-left:auto" title="Flag for review">
                            ${flagged.includes(state.currentQuestionIndex) ? '🚩' : '⚑'}
                        </button>
                    </div>
                    
                    <h3 style="font-size:1.25rem;line-height:1.5;margin-bottom:1.5rem">${escapeHtml(q.text)}</h3>
                    
                    ${q.image ? `<img src="${q.image}" style="max-width:100%;border-radius:var(--radius-md);margin-bottom:1.5rem">` : ''}
                    ${q.code ? `<pre class="code-block" style="margin-bottom:1.5rem">${escapeHtml(q.code)}</pre>` : ''}
                    
                    ${q.type === 'order' ? renderOrderingOptions(q) : renderChoiceOptions(q)}
                    
                    ${state.studyMode && state.showFeedback ? renderFeedback(q) : ''}
                </div>
                
                <!-- Navigation -->
                <div class="flex justify-between items-center">
                    <button onclick="prevQuestion()" class="btn btn-ghost" ${state.currentQuestionIndex === 0 ? 'disabled' : ''}>
                        ← Previous
                    </button>
                    
                    <div class="flex gap-sm">
                        ${state.studyMode && !state.showFeedback && state.answers[state.currentQuestionIndex] != null ? `
                            <button onclick="checkStudyAnswer()" class="btn btn-accent">Check Answer</button>
                        ` : ''}
                        
                        ${state.currentQuestionIndex < total - 1 ? `
                            <button onclick="nextQuestion()" class="btn btn-primary">Next →</button>
                        ` : `
                            <button onclick="submitQuiz()" class="btn btn-accent">Submit Quiz</button>
                        `}
                    </div>
                </div>
                
                <div class="text-center text-muted text-sm" style="margin-top:1rem">
                    <span class="keyboard-hint">N</span> Next
                    <span class="keyboard-hint" style="margin-left:1rem">P</span> Previous
                    <span class="keyboard-hint" style="margin-left:1rem">F</span> Flag
                    <span class="keyboard-hint" style="margin-left:1rem">?</span> Help
                </div>
            </div>
        </main>
    `;
}

function renderChoiceOptions(q) {
    const currentAnswer = state.answers[state.currentQuestionIndex];
    const isMulti = q.type === 'multi';
    const showCorrect = state.studyMode && state.showFeedback;
    
    return `
        <div class="quiz-options">
            ${q.shuffledOptions.map((opt, i) => {
                const originalIndex = q.options.indexOf(opt);
                const isSelected = isMulti 
                    ? (currentAnswer || []).includes(originalIndex)
                    : currentAnswer === originalIndex;
                const isCorrect = isMulti 
                    ? (q.correct || []).includes(originalIndex)
                    : q.correct === originalIndex;
                
                let className = 'quiz-option';
                if (isSelected) className += ' selected';
                if (showCorrect && isCorrect) className += ' correct';
                if (showCorrect && isSelected && !isCorrect) className += ' incorrect';
                
                return `
                    <button onclick="selectAnswer(${originalIndex})" class="${className}" ${showCorrect ? 'disabled' : ''}>
                        <span class="quiz-option-marker">${isMulti ? (isSelected ? '☑' : '☐') : (isSelected ? '●' : '○')}</span>
                        <span>${escapeHtml(opt)}</span>
                    </button>
                `;
            }).join('')}
        </div>
    `;
}

function renderOrderingOptions(q) {
    const currentOrder = state.answers[state.currentQuestionIndex] || [...Array(q.options.length).keys()];
    const showCorrect = state.studyMode && state.showFeedback;
    
    return `
        <div class="ordering-list">
            ${currentOrder.map((optIndex, pos) => {
                const isCorrect = showCorrect && optIndex === pos;
                const isIncorrect = showCorrect && optIndex !== pos;
                
                return `
                    <div class="ordering-item ${isCorrect ? 'correct' : ''} ${isIncorrect ? 'incorrect' : ''}"
                        draggable="${!showCorrect}"
                        ondragstart="handleDragStart(event, ${pos})"
                        ondragover="handleDragOver(event)"
                        ondragleave="handleDragLeave(event)"
                        ondrop="handleDrop(event, ${pos})"
                        ondragend="handleDragEnd(event)">
                        <span class="ordering-handle">⋮⋮</span>
                        <span class="ordering-number">${pos + 1}</span>
                        <span style="flex:1">${escapeHtml(q.options[optIndex])}</span>
                        ${showCorrect ? `<span>${isCorrect ? '✓' : '✗'}</span>` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderFeedback(q) {
    const currentAnswer = state.answers[state.currentQuestionIndex];
    let isCorrect = false;
    
    if (q.type === 'order') {
        const order = currentAnswer || [];
        isCorrect = order.every((val, idx) => val === idx);
    } else if (q.type === 'multi') {
        const selected = currentAnswer || [];
        const correct = q.correct || [];
        isCorrect = selected.length === correct.length && selected.every(i => correct.includes(i));
    } else {
        isCorrect = currentAnswer === q.correct;
    }
    
    return `
        <div class="feedback-banner ${isCorrect ? 'correct' : 'incorrect'}">
            <span style="font-size:1.5rem">${isCorrect ? '✓' : '✗'}</span>
            <span>${isCorrect ? 'Correct!' : 'Incorrect'}</span>
        </div>
    `;
}

function renderResults() {
    const quiz = state.quizzes.find(q => q.id === state.currentQuizId);
    if (!quiz) return renderLibrary();
    
    const score = state.lastScore || { correct: 0, total: 0, percentage: 0 };
    const isPerfect = score.percentage === 100;
    
    return `
        <nav class="navbar">
            <div class="container">
                <div class="navbar-inner">
                    <a href="#" class="logo" onclick="state.view='library';render();return false;">
                        <div class="logo-mark">⚡</div>
                        <span>QuizForge</span>
                    </a>
                </div>
            </div>
        </nav>
        
        <main style="padding:4rem 0">
            <div class="container narrow" style="text-align:center">
                <div class="results-score">
                    <div class="results-circle ${isPerfect ? 'perfect' : score.percentage >= 70 ? 'good' : 'needs-work'}">
                        <span class="results-percentage">${score.percentage}%</span>
                        <span class="results-fraction">${score.correct}/${score.total}</span>
                    </div>
                </div>
                
                <h1 style="margin-bottom:0.5rem">
                    ${isPerfect ? '🎉 Perfect Score!' : score.percentage >= 70 ? '👏 Great Job!' : '💪 Keep Practicing!'}
                </h1>
                <p class="text-muted" style="margin-bottom:2rem">
                    ${escapeHtml(quiz.title)}
                </p>
                
                ${state.studyMode && state.maxStreak > 0 ? `
                    <div class="card" style="padding:1rem;margin-bottom:2rem;display:inline-block">
                        <span style="font-size:1.5rem">🔥</span>
                        <span class="font-semibold">Best Streak: ${state.maxStreak}</span>
                    </div>
                ` : ''}
                
                ${state.timerEnabled && state.timeTaken ? `
                    <div class="card" style="padding:1rem;margin-bottom:2rem;display:inline-block">
                        <span style="font-size:1.5rem">⏱️</span>
                        <span class="font-semibold">Time: ${Math.floor(state.timeTaken / 60)}:${(state.timeTaken % 60).toString().padStart(2, '0')}</span>
                    </div>
                ` : ''}
                
                <div class="flex flex-wrap justify-center gap-md">
                    <button onclick="state.view='review';render()" class="btn btn-secondary">
                        📝 Review Answers
                    </button>
                    <button onclick="startQuiz(${quiz.id})" class="btn btn-primary">
                        🔄 Try Again
                    </button>
                    <button onclick="state.view='library';render()" class="btn btn-accent">
                        📚 Back to Library
                    </button>
                </div>
            </div>
        </main>
    `;
}

function renderReview() {
    const quiz = state.quizzes.find(q => q.id === state.currentQuizId);
    if (!quiz || !state.currentQuestions) return renderLibrary();
    
    return `
        <nav class="navbar">
            <div class="container">
                <div class="navbar-inner">
                    <a href="#" class="logo" onclick="state.view='library';render();return false;">
                        <div class="logo-mark">⚡</div>
                        <span>QuizForge</span>
                    </a>
                    <div class="flex items-center gap-md">
                        <button onclick="state.view='results';render()" class="btn btn-ghost btn-sm">← Back to Results</button>
                    </div>
                </div>
            </div>
        </nav>
        
        <main style="padding:2rem 0 4rem">
            <div class="container narrow">
                <h1 style="margin-bottom:0.5rem">Review: ${escapeHtml(quiz.title)}</h1>
                <p class="text-muted" style="margin-bottom:2rem">See which questions you got right and wrong</p>
                
                ${state.currentQuestions.map((q, i) => {
                    const userAnswer = state.answers[i];
                    let isCorrect = false;
                    
                    if (q.type === 'order') {
                        const order = userAnswer || [];
                        isCorrect = order.every((val, idx) => val === idx);
                    } else if (q.type === 'multi') {
                        const selected = userAnswer || [];
                        const correct = q.correct || [];
                        isCorrect = selected.length === correct.length && selected.every(x => correct.includes(x));
                    } else {
                        isCorrect = userAnswer === q.correct;
                    }
                    
                    return `
                        <div class="review-card ${isCorrect ? 'correct' : 'incorrect'}">
                            <div class="review-header">
                                <span class="review-number">Q${i + 1}</span>
                                <span class="review-status ${isCorrect ? 'correct' : 'incorrect'}">${isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>
                            </div>
                            
                            <p style="font-weight:500;margin-bottom:1rem">${escapeHtml(q.text)}</p>
                            
                            ${q.image ? `<img src="${q.image}" style="max-width:100%;border-radius:var(--radius-md);margin-bottom:1rem">` : ''}
                            ${q.code ? `<pre class="code-block" style="margin-bottom:1rem">${escapeHtml(q.code)}</pre>` : ''}
                            
                            ${renderReviewOptions(q, userAnswer)}
                        </div>
                    `;
                }).join('')}
                
                <div class="flex justify-center gap-md" style="margin-top:2rem">
                    <button onclick="state.view='results';render()" class="btn btn-secondary">Back to Results</button>
                    <button onclick="state.view='library';render()" class="btn btn-accent">Back to Library</button>
                </div>
            </div>
        </main>
    `;
}

function renderReviewOptions(q, userAnswer) {
    if (q.type === 'order') {
        const order = userAnswer || [...Array(q.options.length).keys()];
        return `
            <div class="review-options">
                <p class="text-sm text-muted" style="margin-bottom:0.5rem">Your order vs correct order:</p>
                ${order.map((optIdx, pos) => {
                    const isCorrect = optIdx === pos;
                    return `
                        <div class="review-option ${isCorrect ? 'correct' : 'incorrect'}">
                            <span>${pos + 1}.</span>
                            <span style="flex:1">${escapeHtml(q.options[optIdx])}</span>
                            ${!isCorrect ? `<span class="text-sm text-muted">(should be: ${escapeHtml(q.options[pos])})</span>` : ''}
                            <span>${isCorrect ? '✓' : '✗'}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    const isMulti = q.type === 'multi';
    const selectedIndices = isMulti ? (userAnswer || []) : (userAnswer != null ? [userAnswer] : []);
    const correctIndices = isMulti ? (q.correct || []) : [q.correct];
    
    return `
        <div class="review-options">
            ${q.options.map((opt, i) => {
                const isSelected = selectedIndices.includes(i);
                const isCorrect = correctIndices.includes(i);
                
                let className = 'review-option';
                if (isCorrect) className += ' correct';
                if (isSelected && !isCorrect) className += ' incorrect';
                
                return `
                    <div class="${className}">
                        <span>${isMulti ? (isSelected ? '☑' : '☐') : (isSelected ? '●' : '○')}</span>
                        <span style="flex:1">${escapeHtml(opt)}</span>
                        ${isCorrect ? '<span>✓ Correct</span>' : ''}
                        ${isSelected && !isCorrect ? '<span>✗ Your answer</span>' : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}


// ============================================================
// Section 20: Event Binding & Initialization
// ============================================================

function bindEvents() {
    // Search input
    const searchInput = document.getElementById('quiz-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value;
            renderQuizGrid();
        });
    }
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

function handleKeyboard(e) {
    // Don't trigger shortcuts when typing in inputs
    if (e.target.matches('input, textarea, select')) return;
    
    const key = e.key.toLowerCase();
    
    if (state.view === 'quiz') {
        switch (key) {
            case 'n':
            case 'arrowright':
                nextQuestion();
                break;
            case 'p':
            case 'arrowleft':
                prevQuestion();
                break;
            case 'f':
                // Toggle flag
                state.flaggedQuestions = state.flaggedQuestions || [];
                if (state.flaggedQuestions.includes(state.currentQuestionIndex)) {
                    state.flaggedQuestions = state.flaggedQuestions.filter(i => i !== state.currentQuestionIndex);
                } else {
                    state.flaggedQuestions.push(state.currentQuestionIndex);
                }
                render();
                break;
            case '?':
                showKeyboardShortcuts();
                break;
            case 'enter':
                if (state.studyMode && !state.showFeedback && state.answers[state.currentQuestionIndex] != null) {
                    checkStudyAnswer();
                } else if (state.showFeedback) {
                    nextQuestion();
                }
                break;
            case ' ':
                e.preventDefault();
                // Select first unselected option
                const q = state.currentQuestions[state.currentQuestionIndex];
                if (q && q.type !== 'order') {
                    const nextOption = q.options.findIndex((_, i) => state.answers[state.currentQuestionIndex] !== i);
                    if (nextOption >= 0) selectAnswer(nextOption);
                }
                break;
            case 'escape':
                saveAndExitQuiz();
                break;
        }
    } else if (key === '?' && state.view === 'library') {
        showKeyboardShortcuts();
    } else if (key === 'escape') {
        // Close any open modals
        const modal = document.querySelector('.modal');
        if (modal) modal.remove();
    }
}

// Initialize application
async function init() {
    // Load saved auth
    loadAuth();
    
    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
        state.darkMode = savedDarkMode === 'true';
        if (state.darkMode) document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    // If logged in, load data
    if (state.token && state.user) {
        await loadQuizzes();
        loadFolders();
        loadCustomOrder();
        
        // Check for saved creation state
        const savedCreation = loadCreationState();
        if (savedCreation) {
            state.quizTitle = savedCreation.title || '';
            state.quizData = savedCreation.data || '';
            state.quizCategory = savedCreation.category || '';
            if (savedCreation.visualMode) {
                state.visualEditorMode = true;
                state.visualEditorQuestions = savedCreation.questions;
            }
        }
    }
    
    render();
    bindEvents();
}

// Start the app
init();