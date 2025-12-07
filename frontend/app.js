const API_URL = 'https://davidhamilton.pythonanywhere.com/api';
        
        const state = {
            view: 'login', isAuthenticated: false, user: null, token: null, authMode: 'login',
            quizzes: [], searchQuery: '', sortBy: 'custom', categoryFilter: 'all',
            folders: [], selectedFolder: 'all', customOrder: [],
            currentQuiz: null, currentQuestionIndex: 0, answers: [],
            studyMode: false, showAnswer: false, flaggedQuestions: new Set(),
            timerEnabled: false, timerMinutes: 15, timeRemaining: 0, timerInterval: null, timeExpired: false,
            streak: 0, maxStreak: 0,
            darkMode: localStorage.getItem('darkMode') === 'true',
            showFormatHelp: false, quizTitle: '', quizData: '', quizCategory: '', editingQuizId: null,
            draggedQuizId: null
        };
        
        if (state.darkMode) document.documentElement.classList.add('dark');
        
        function toggleDarkMode() { state.darkMode = !state.darkMode; document.documentElement.classList.toggle('dark'); localStorage.setItem('darkMode', state.darkMode); render(); }
        function showToast(msg, type = 'info') { const c = document.getElementById('toast-container'); const t = document.createElement('div'); t.className = `toast ${type}`; t.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span><span>${msg}</span>`; c.appendChild(t); setTimeout(() => t.remove(), 4000); }
        function formatDate(d) { const dt = new Date(d), now = new Date(), diff = Math.floor((now - dt) / 86400000); if (diff === 0) return 'Today'; if (diff === 1) return 'Yesterday'; if (diff < 7) return `${diff} days ago`; return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
        function getRandomColor() { return ['#d97706','#059669','#0284c7','#7c3aed','#db2777','#dc2626'][Math.floor(Math.random() * 6)]; }
        function shuffleArray(arr) { const s = [...arr]; for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; } return s; }
        function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
        /* ============================================
   QUICK WIN FEATURES - ADD TO BEGINNING OF app.js
   (After the API_URL and state declarations)
   ============================================ */

// ========== 1. LOADING SPINNER ==========
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

// ========== 2. AUTO-SAVE INDICATOR ==========
let saveIndicatorTimeout;

function showSaveIndicator(status = 'saving') {
    clearTimeout(saveIndicatorTimeout);
    
    let indicator = document.getElementById('save-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'save-indicator';
        indicator.className = 'save-indicator';
        document.body.appendChild(indicator);
    }
    
    indicator.className = `save-indicator ${status}`;
    indicator.innerHTML = status === 'saving' 
        ? '<span class="spinner-small"></span><span>Saving...</span>'
        : '<span>✓</span><span>Saved</span>';
    
    if (status === 'saved') {
        saveIndicatorTimeout = setTimeout(() => {
            indicator.classList.add('fade-out');
            setTimeout(() => indicator.remove(), 300);
        }, 2000);
    }
}

// ========== 3. IMPROVED TOAST (Dismissible) ==========
function showToast(msg, type = 'info') {
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
        <span style="flex: 1">${msg}</span>
        <button class="toast-close" onclick="dismissToast('${id}')">×</button>
    `;
    
    container.appendChild(toast);
    
    // Auto-dismiss after 4 seconds
    setTimeout(() => dismissToast(id), 4000);
}

function dismissToast(id) {
    const toast = document.getElementById(id);
    if (toast) {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }
}

// ========== 4. CONFIRMATION DIALOGS ==========
function showConfirmDialog(options) {
    return new Promise((resolve) => {
        const {
            title = 'Confirm Action',
            message = 'Are you sure?',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            type = 'warning' // 'warning' or 'danger'
        } = options;
        
        const icons = {
            warning: '⚠️',
            danger: '🗑️'
        };
        
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
                    <button class="btn ${type === 'danger' ? 'btn-accent' : 'btn-primary'} flex-1" id="confirm-btn">
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

// ========== 5. SEARCH HIGHLIGHTING ==========
function highlightText(text, query) {
    if (!query) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const regex = new RegExp(`(${escapeHtml(query)})`, 'gi');
    return escaped.replace(regex, '<span class="search-highlight">$1</span>');
}

// ========== 6. KEYBOARD SHORTCUTS ==========
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
    // Don't trigger if typing in input/textarea
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
        <div class="modal keyboard-shortcuts-modal">
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

// ========== 7. QUIZ PREVIEW ==========
function showQuizPreview(quizId) {
    showLoading();
    apiCall(`/quizzes/${quizId}`).then(d => {
        hideLoading();
        const quiz = d.quiz || d;
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

// ========== 8. SUCCESS CONFETTI ==========
function showConfetti() {
    const colors = ['#d97706', '#059669', '#0284c7', '#7c3aed', '#db2777', '#dc2626'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 3000);
        }, i * 30);
    }
}

// ========== 9. TIMER PULSE WARNING ==========
// Add to updateTimerDisplay function
function updateTimerDisplay() {
    const el = document.getElementById('timer');
    if (el) {
        const minutes = Math.floor(state.timeRemaining / 60);
        const seconds = state.timeRemaining % 60;
        el.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Add pulse animation when under 60 seconds
        if (state.timeRemaining <= 60) {
            el.classList.add('timer-urgent', 'timer-pulse');
        } else {
            el.classList.remove('timer-urgent', 'timer-pulse');
        }
    }
}

// ========== 10. WRAP API CALLS WITH LOADING ==========
// Update the original apiCall function to show loading
const originalApiCall = apiCall;
async function apiCall(endpoint, options = {}) {
    showLoading();
    try {
        const result = await originalApiCall(endpoint, options);
        hideLoading();
        return result;
    } catch (e) {
        hideLoading();
        throw e;
    }
}

// ========== UPDATE EXISTING FUNCTIONS ==========

// Update deleteQuiz to use confirmation dialog
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
        await apiCall(`/quizzes/${id}`, { method: 'DELETE' });
        
        state.folders.forEach(f => {
            const idx = f.quizIds.indexOf(id);
            if (idx > -1) f.quizIds.splice(idx, 1);
        });
        saveFolders();
        
        const idx = state.customOrder.indexOf(id);
        if (idx > -1) state.customOrder.splice(idx, 1);
        saveCustomOrder();
        
        clearQuizProgress(id);
        
        await loadQuizzes();
        showToast('Quiz deleted successfully', 'success');
        render();
    } catch (e) {
        showToast('Failed to delete quiz', 'error');
    }
}

// Update deleteFolder to use confirmation dialog
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

// Update saveQuizProgress to show save indicator
const originalSaveQuizProgress = saveQuizProgress;
function saveQuizProgress() {
    showSaveIndicator('saving');
    originalSaveQuizProgress();
    setTimeout(() => showSaveIndicator('saved'), 300);
}

// Update submitQuiz to show confetti on perfect score
async function submitQuiz() {
    stopTimer(); 
    const score = calculateScore();
    const total = state.currentQuiz.questions.length;
    const pct = Math.round((score / total) * 100);
    
    // Show confetti for perfect score!
    if (pct === 100) {
        showConfetti();
    }
    
    try { 
        await apiCall(`/quizzes/${state.currentQuiz.id}/attempts`, { 
            method: 'POST', 
            body: JSON.stringify({ 
                score, total, percentage: pct, answers: state.answers, 
                study_mode: state.studyMode, timed: state.timerEnabled, 
                max_streak: state.maxStreak, 
                time_taken: state.timerEnabled ? (state.timerMinutes * 60 - state.timeRemaining) : null 
            }) 
        }); 
    } catch (e) { 
        showToast('Failed to save results', 'error'); 
    }
    
    clearQuizProgress(); // Clear saved progress
    state.view = 'results'; 
    render();
}

// Update renderLibrary to include search highlighting and preview button
// Find the quiz card rendering section and update the title line to:
// <h3 class="quiz-card-title">${state.searchQuery ? highlightText(q.title, state.searchQuery) : escapeHtml(q.title)}</h3>

// Add preview button to quiz card dropdown menu (in renderLibrary):
// <button class="dropdown-item" onclick="event.stopPropagation(); showQuizPreview(${q.id})">👁️ Preview</button>

console.log('✨ Quick Win features loaded!');
        async function apiCall(endpoint, options = {}) {
            const headers = { 'Content-Type': 'application/json', ...options.headers };
            if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
            try {
                const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Request failed');
                return data;
            } catch (e) { console.error('API Error:', e); throw e; }
        }
        
        async function login(u, p) { try { const d = await apiCall('/auth/login', { method: 'POST', body: JSON.stringify({ username: u, password: p }) }); state.token = d.token; state.user = d.user; state.isAuthenticated = true; saveAuth(); state.view = 'library'; await loadQuizzes(); showToast(`Welcome back, ${d.user.username}!`, 'success'); render(); } catch (e) { showToast(e.message || 'Login failed', 'error'); } }
        async function register(u, p) { try { const d = await apiCall('/auth/register', { method: 'POST', body: JSON.stringify({ username: u, password: p, email: `${u}@quiz.local` }) }); state.token = d.token; state.user = d.user; state.isAuthenticated = true; saveAuth(); state.view = 'library'; await loadQuizzes(); showToast('Account created!', 'success'); render(); } catch (e) { showToast(e.message || 'Registration failed', 'error'); } }
        function logout() { 
    state.token = null; 
    state.user = null; 
    state.isAuthenticated = false; 
    state.view = 'login'; 
    state.quizzes = []; 
    clearQuizProgress(); // Clear quiz progress on logout
    localStorage.removeItem('authToken'); 
    localStorage.removeItem('authUser'); 
    showToast('Logged out', 'info'); 
    render(); 
}
        function saveAuth() { if (state.token && state.user) { localStorage.setItem('authToken', state.token); localStorage.setItem('authUser', JSON.stringify(state.user)); } }
        function loadAuth() { const t = localStorage.getItem('authToken'), u = localStorage.getItem('authUser'); if (t && u) { state.token = t; state.user = JSON.parse(u); state.isAuthenticated = true; return true; } return false; }
        
        async function loadQuizzes() { 
    try { 
        const d = await apiCall('/quizzes'); 
        state.quizzes = (d.quizzes || d).map(q => {
            // Backend returns attempt_count, best_score, avg_score
            // Convert to frontend format with attempts array
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
        function loadFolders() { try { const f = localStorage.getItem('quiz-folders'); state.folders = f ? JSON.parse(f) : []; } catch (e) { state.folders = []; } }
        function saveFolders() { localStorage.setItem('quiz-folders', JSON.stringify(state.folders)); }
        function loadCustomOrder() { 
            try { 
                const o = localStorage.getItem('quiz-custom-order'); 
                state.customOrder = o ? JSON.parse(o) : []; 
                // Add any new quizzes not in the order
                state.quizzes.forEach(q => {
                    if (!state.customOrder.includes(q.id)) state.customOrder.push(q.id);
                });
                // Remove deleted quizzes from order
                state.customOrder = state.customOrder.filter(id => state.quizzes.some(q => q.id === id));
            } catch (e) { state.customOrder = state.quizzes.map(q => q.id); } 
        }
        function saveCustomOrder() { localStorage.setItem('quiz-custom-order', JSON.stringify(state.customOrder)); }
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
    
    // Clean quiz progress for deleted quizzes
    const allProgress = loadQuizProgress();
    Object.keys(allProgress).forEach(qid => {
        if (!quizIds.has(parseInt(qid))) {
            clearQuizProgress(parseInt(qid));
        }
    });
}
        function getUserStats() { 
    const tq = state.quizzes.length;
    const tqs = state.quizzes.reduce((s, q) => s + (q.questions?.length || 0), 0); 
    
    let ta = 0, ts = 0, ac = 0; 
    
    // Count all attempts across all quizzes using backend data
    state.quizzes.forEach(q => { 
        // Backend provides attempt_count and avg_score directly
        if (q.attempt_count && q.attempt_count > 0) { 
            ta += q.attempt_count;
            if (q.avg_score != null) {
                ts += q.avg_score * q.attempt_count; // Weight by attempt count
                ac += q.attempt_count;
            }
        }
    }); 
    
    return { 
        totalQuizzes: tq, 
        totalQuestions: tqs, 
        totalAttempts: ta, 
        avgScore: ac > 0 ? Math.round(ts / ac) : 0 
    }; 
}

       function getQuizStats(q) { 
    if (!q.attempt_count || q.attempt_count === 0) return null; 
    return { 
        attemptCount: q.attempt_count, 
        best: Math.round(q.best_score || 0), 
        latest: Math.round(q.avg_score || 0)
    }; 
}
        function getCategories() { const c = new Set(); state.quizzes.forEach(q => { if (q.description) c.add(q.description); }); return Array.from(c).sort(); }
        function getFilteredQuizzes() {
            let f = [...state.quizzes];
            if (state.selectedFolder !== 'all') { const folder = state.folders.find(fo => fo.id == state.selectedFolder); if (folder) f = f.filter(q => folder.quizIds.includes(q.id)); }
            if (state.searchQuery) { const query = state.searchQuery.toLowerCase(); f = f.filter(q => q.title.toLowerCase().includes(query) || (q.description && q.description.toLowerCase().includes(query))); }
            if (state.categoryFilter !== 'all') f = f.filter(q => q.description === state.categoryFilter);
            if (state.sortBy === 'recent') f.sort((a, b) => new Date(b.last_modified || b.created_at) - new Date(a.last_modified || a.created_at));
            else if (state.sortBy === 'alpha') f.sort((a, b) => a.title.localeCompare(b.title));
            else if (state.sortBy === 'custom') f.sort((a, b) => state.customOrder.indexOf(a.id) - state.customOrder.indexOf(b.id));
            return f;
        }
        
        // Quiz card drag and drop
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
                    state.sortBy = 'custom'; // Switch to custom sort when reordering
                    render();
                }
            }
        }
        function handleQuizDragEnd(e) {
            e.target.classList.remove('dragging');
            document.querySelectorAll('.quiz-card.drag-over').forEach(el => el.classList.remove('drag-over'));
            state.draggedQuizId = null;
        }
        
  async function startQuiz(id, opts = {}) {
    try {
        // CHECK FOR EXISTING PROGRESS FIRST
        if (!opts.forceNew) {
            const existingProgress = loadQuizProgress(id);
            if (existingProgress) {
                showResumePrompt(existingProgress);
                return;
            }
        }
        
        const d = await apiCall(`/quizzes/${id}`);
        const qd = d.quiz || d;
        let qs = qd.questions;
        if (opts.shuffleQuestions) qs = shuffleArray(qs);
        
        state.currentQuiz = { id, title: qd.title, questions: qs };
        state.currentQuestionIndex = 0;
        state.answers = qs.map(q => q.type === 'ordering' ? shuffleArray(q.options.map((_, i) => i)) : null);
        state.studyMode = opts.studyMode || false;
        state.timerEnabled = opts.timerEnabled || false;
        state.timerMinutes = opts.timerMinutes || 15;
        state.showAnswer = false;
        state.flaggedQuestions = new Set();
        state.timeExpired = false;
        state.streak = 0;
        state.maxStreak = 0;
        state.startTime = Date.now();
        
        if (state.timerEnabled) {
            state.timeRemaining = state.timerMinutes * 60;
            startTimer();
        }
        
        state.view = 'quiz';
        saveQuizProgress();
        render();
    } catch (e) {
        showToast('Failed to load quiz', 'error');
    }
}
        function startTimer() { stopTimer(); state.timerInterval = setInterval(() => { state.timeRemaining--; updateTimerDisplay(); if (state.timeRemaining <= 0) { state.timeExpired = true; stopTimer(); submitQuiz(); } }, 1000); }
        function stopTimer() { if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; } }
        function updateTimerDisplay() { const el = document.getElementById('timer'); if (el) { el.textContent = `${Math.floor(state.timeRemaining / 60)}:${(state.timeRemaining % 60).toString().padStart(2, '0')}`; if (state.timeRemaining <= 60) el.classList.add('timer-urgent'); } }
        
        function selectAnswer(idx) {
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    if (q.type === 'choice') {
        if (q.correct.length > 1) { const c = state.answers[state.currentQuestionIndex] || []; state.answers[state.currentQuestionIndex] = c.includes(idx) ? c.filter(i => i !== idx) : [...c, idx]; }
        else state.answers[state.currentQuestionIndex] = [idx];
    }
    saveQuizProgress(); // Auto-save
    if (state.studyMode && q.correct.length === 1) checkStudyAnswer();
    render();
}

function checkStudyAnswer() {
    const q = state.currentQuiz.questions[state.currentQuestionIndex], ua = state.answers[state.currentQuestionIndex] || [];
    let correct = false;
    if (q.type === 'choice') { const as = new Set(ua), cs = new Set(q.correct); correct = as.size === cs.size && [...as].every(a => cs.has(a)); }
    else if (q.type === 'ordering') correct = JSON.stringify(ua) === JSON.stringify(q.correct);
    if (correct) { state.streak++; state.maxStreak = Math.max(state.maxStreak, state.streak); } else state.streak = 0;
    state.showAnswer = true;
    saveQuizProgress(); // Auto-save
}

function nextQuestion() { 
    if (state.currentQuestionIndex < state.currentQuiz.questions.length - 1) { 
        state.currentQuestionIndex++; 
        state.showAnswer = false; 
        saveQuizProgress(); // Auto-save
        render(); 
    } 
}

function prevQuestion() { 
    if (state.currentQuestionIndex > 0) { 
        state.currentQuestionIndex--; 
        state.showAnswer = false; 
        saveQuizProgress(); // Auto-save
        render(); 
    } 
}

function toggleFlag() { 
    const i = state.currentQuestionIndex; 
    state.flaggedQuestions.has(i) ? state.flaggedQuestions.delete(i) : state.flaggedQuestions.add(i); 
    saveQuizProgress(); // Auto-save
    render(); 
}
        function calculateScore() { let s = 0; state.currentQuiz.questions.forEach((q, i) => { const ua = state.answers[i]; if (!ua) return; if (q.type === 'choice') { const as = new Set(ua), cs = new Set(q.correct); if (as.size === cs.size && [...as].every(a => cs.has(a))) s++; } else if (q.type === 'ordering' && JSON.stringify(ua) === JSON.stringify(q.correct)) s++; }); return s; }
        
        let draggedIndex = null;
        function handleDragStart(e, i) { draggedIndex = i; e.target.classList.add('dragging'); }
        function handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
        function handleDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
        function handleDrop(e, ti) { 
    e.preventDefault(); 
    e.currentTarget.classList.remove('drag-over'); 
    if (draggedIndex !== null && draggedIndex !== ti) { 
        const a = [...state.answers[state.currentQuestionIndex]]; 
        const [di] = a.splice(draggedIndex, 1); 
        a.splice(ti, 0, di); 
        state.answers[state.currentQuestionIndex] = a; 
        saveQuizProgress(); // Auto-save
        if (state.studyMode) checkStudyAnswer(); 
        render(); 
    } 
}
        function handleDragEnd(e) { e.target.classList.remove('dragging'); draggedIndex = null; }
        
        async function saveQuiz() {
    const title = state.quizTitle.trim();
    const data = state.quizData.trim();
    
    if (!title) { 
        showToast('Please enter a title', 'warning'); 
        return; 
    }
    if (!data) { 
        showToast('Please enter questions', 'warning'); 
        return; 
    }
    
    try {
        const qs = parseQuizData(data);
        if (qs.length === 0) { 
            showToast('Could not parse any questions. Check format.', 'error'); 
            return; 
        }
        
        // Validate each question
        const invalid = qs.find((q, i) => {
            if (q.type === 'choice' && q.correct.length === 0) return true;
            if (q.type === 'ordering' && q.correct.length !== q.options.length) return true;
            if (q.options.length < 2) return true;
            return false;
        });
        
        if (invalid) {
            showToast('Some questions are invalid (need correct answers & 2+ options)', 'error');
            return;
        }
        
        const payload = { 
            title: state.quizTitle, 
            questions: qs, 
            description: state.quizCategory || '', 
            color: getRandomColor(), 
            is_public: false 
        };
        
        if (state.editingQuizId) { 
            await apiCall(`/quizzes/${state.editingQuizId}`, { 
                method: 'PUT', 
                body: JSON.stringify(payload) 
            }); 
            showToast('Quiz updated!', 'success'); 
        } else { 
            await apiCall('/quizzes', { 
                method: 'POST', 
                body: JSON.stringify(payload) 
            }); 
            showToast('Quiz created!', 'success'); 
        }
        
        state.quizTitle = ''; 
        state.quizData = ''; 
        state.quizCategory = ''; 
        state.editingQuizId = null; 
        state.view = 'library'; 
        await loadQuizzes(); 
        render();
    } catch (e) { 
        showToast('Failed to save quiz', 'error'); 
    }
}
async function deleteQuiz(id) { 
    if (!confirm('Delete this quiz?')) return; 
    try { 
        await apiCall(`/quizzes/${id}`, { method: 'DELETE' }); 
        
        // Remove from folders
        state.folders.forEach(f => {
            const idx = f.quizIds.indexOf(id);
            if (idx > -1) f.quizIds.splice(idx, 1);
        });
        saveFolders();
        
        // Remove from custom order
        const idx = state.customOrder.indexOf(id);
        if (idx > -1) state.customOrder.splice(idx, 1);
        saveCustomOrder();
        
        // Clear any saved progress
        clearQuizProgress(id);
        
        await loadQuizzes(); 
        showToast('Deleted', 'success'); 
        render(); 
    } catch (e) { 
        showToast('Failed to delete', 'error'); 
    } 
}
        async function editQuiz(id) {
            try {
                const d = await apiCall(`/quizzes/${id}`); const qd = d.quiz || d;
                const txt = qd.questions.map((q, i) => {
                    let t = `${i + 1}. ${q.type === 'ordering' ? '[order] ' : ''}${q.question}\n`;
                    if (q.code) t += `[code]\n${q.code}\n[/code]\n`;
                    if (q.image) t += `[image: ${q.image}]\n`;
                    if (q.type === 'ordering') q.options.forEach((o, j) => t += `${q.correct[j] + 1}) ${o}\n`);
                    else q.options.forEach((o, j) => t += `${String.fromCharCode(65 + j)}. ${o}${q.correct.includes(j) ? ' *' : ''}\n`);
                    if (q.explanation) t += `[explanation: ${q.explanation}]\n`;
                    return t;
                }).join('\n');
                state.quizTitle = qd.title; state.quizData = txt; state.quizCategory = qd.description || ''; state.editingQuizId = id; state.view = 'create'; render();
            } catch (e) { showToast('Failed to load', 'error'); }
        }
        
        function parseQuizData(data) {
            const lines = data.split('\n').filter(l => l.trim()), questions = [];
            let i = 0;
            while (i < lines.length) {
                let line = lines[i].trim();
                if (line.match(/^\d+\./)) {
                    const isOrder = line.includes('[order]');
                    const qText = line.replace(/^\d+\./, '').replace('[order]', '').trim();
                    let q = { question: qText, type: isOrder ? 'ordering' : 'choice', options: [], correct: [], image: null, explanation: null, code: null };
                    i++;
                    if (i < lines.length && lines[i].trim() === '[code]') { i++; let cl = []; while (i < lines.length && lines[i].trim() !== '[/code]') { cl.push(lines[i]); i++; } if (i < lines.length) { q.code = cl.join('\n'); i++; } }
                    if (i < lines.length && lines[i].trim().match(/^\[image:\s*(.+?)\]/i)) { q.image = lines[i].trim().match(/^\[image:\s*(.+?)\]/i)[1]; i++; }
                    if (isOrder) { while (i < lines.length && lines[i].match(/^\d+\)/)) { const n = parseInt(lines[i].match(/^(\d+)\)/)[1]); q.options.push(lines[i].replace(/^\d+\)/, '').trim()); q.correct.push(n - 1); i++; } }
                    else { while (i < lines.length && lines[i].match(/^[A-Z]\./)) { const ot = lines[i].substring(2).trim(), ha = ot.endsWith('*'); q.options.push(ha ? ot.slice(0, -1).trim() : ot); if (ha) q.correct.push(q.options.length - 1); i++; } }
                    if (i < lines.length && lines[i].trim().match(/^\[explanation:\s*(.+?)\]/i)) { q.explanation = lines[i].trim().match(/^\[explanation:\s*(.+?)\]/i)[1]; i++; }
                    questions.push(q);
                } else i++;
            }
            return questions;
        }
        
        function exportQuizzes() { const d = state.quizzes.map(q => ({ title: q.title, description: q.description, questions: q.questions, color: q.color })); const b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `quiz-export-${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(u); showToast('Exported!', 'success'); }
        
        function showImportModal() {
            const m = document.createElement('div');
            m.innerHTML = `<div class="modal-overlay" onclick="if(event.target===this)this.remove()"><div class="modal"><div class="modal-header"><h2>Import Quizzes</h2><button class="btn btn-icon btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button></div><div class="modal-body"><div style="margin-bottom:1rem"><label class="input-label">Select JSON File</label><input type="file" id="importFile" accept=".json" class="input"></div><div id="importProgress" style="display:none"><div class="progress-bar"><div id="importProgressFill" class="progress-fill" style="width:0%"></div></div><p id="importStatus" class="text-sm text-muted" style="margin-top:0.5rem"></p></div></div><div class="modal-footer"><button class="btn btn-ghost flex-1" onclick="this.closest('.modal-overlay').remove()">Cancel</button><button class="btn btn-accent flex-1" onclick="processImport()">Import</button></div></div></div>`;
            document.body.appendChild(m.firstElementChild);
        }
        async function processImport() {
            const f = document.getElementById('importFile')?.files[0]; if (!f) { showToast('Select a file', 'warning'); return; }
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const qs = JSON.parse(e.target.result); if (!Array.isArray(qs)) throw new Error('Invalid');
                    document.getElementById('importProgress').style.display = 'block';
                    let ok = 0;
                    for (let i = 0; i < qs.length; i++) {
                        const q = qs[i]; document.getElementById('importProgressFill').style.width = ((i + 1) / qs.length * 100) + '%';
                        document.getElementById('importStatus').textContent = `Importing ${i + 1} of ${qs.length}`;
                        try { await apiCall('/quizzes', { method: 'POST', body: JSON.stringify({ title: q.title, questions: q.questions, description: q.description || '', color: q.color || getRandomColor(), is_public: false }) }); ok++; } catch (err) {}
                    }
                    await loadQuizzes(); document.querySelector('.modal-overlay').remove(); showToast(`Imported ${ok} quizzes`, 'success'); render();
                } catch (err) { showToast('Failed to parse', 'error'); }
            };
            reader.readAsText(f);
        }
        
        function showQuizletImport() {
            const m = document.createElement('div');
            m.innerHTML = `<div class="modal-overlay" onclick="if(event.target===this)this.remove()"><div class="modal modal-lg"><div class="modal-header"><h2>Import from Quizlet</h2><button class="btn btn-icon btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button></div><div class="modal-body"><div class="card" style="padding:1rem;margin-bottom:1.5rem;background:var(--accent-glow)"><p class="font-semibold" style="margin-bottom:0.5rem">How to Import</p><ol class="text-sm text-muted" style="padding-left:1.5rem"><li>Open Quizlet set</li><li>Click "..." → Export</li><li>Copy text</li><li>Paste below</li></ol></div><div class="flex gap-md" style="margin-bottom:1rem"><div class="flex-1"><label class="input-label">Title</label><input type="text" id="quizletTitle" class="input" placeholder="Quiz title"></div><div class="flex-1"><label class="input-label">Category</label><input type="text" id="quizletCategory" class="input" placeholder="Category"></div></div><div><label class="input-label">Paste Content</label><textarea id="quizletContent" class="input" rows="8" placeholder="Term[TAB]Definition"></textarea><p class="text-sm text-muted"><span id="termCount">0</span> terms</p></div></div><div class="modal-footer"><button class="btn btn-ghost flex-1" onclick="this.closest('.modal-overlay').remove()">Cancel</button><button class="btn btn-accent flex-1" onclick="processQuizletImport()">Create Quiz</button></div></div></div>`;
            document.body.appendChild(m.firstElementChild);
            document.getElementById('quizletContent').addEventListener('input', e => { document.getElementById('termCount').textContent = e.target.value.split('\n').filter(l => l.trim() && l.includes('\t')).length; });
        }
        async function processQuizletImport() {
            const title = document.getElementById('quizletTitle').value.trim(), cat = document.getElementById('quizletCategory').value.trim(), content = document.getElementById('quizletContent').value;
            if (!title) { showToast('Enter a title', 'warning'); return; }
            const lines = content.split('\n').filter(l => l.trim() && l.includes('\t'));
            if (lines.length < 4) { showToast('Need at least 4 terms', 'warning'); return; }
            const terms = lines.map(l => { const [t, d] = l.split('\t'); return { term: t?.trim(), def: d?.trim() }; }).filter(t => t.term && t.def);
            const qs = terms.map((t, i) => {
                const wrong = terms.filter((_, j) => j !== i).sort(() => Math.random() - 0.5).slice(0, 3).map(w => w.def);
                const opts = shuffleArray([t.def, ...wrong]); const ci = opts.indexOf(t.def);
                return { question: `What is: ${t.term}?`, type: 'choice', options: opts, correct: [ci], explanation: t.def };
            });
            try { await apiCall('/quizzes', { method: 'POST', body: JSON.stringify({ title, questions: qs, description: cat, color: getRandomColor(), is_public: false }) }); await loadQuizzes(); document.querySelector('.modal-overlay').remove(); showToast(`Created ${qs.length} questions!`, 'success'); render(); } catch (e) { showToast('Failed', 'error'); }
        }
        
        function createFolder() { const n = prompt('Folder name:'); if (!n?.trim()) return; state.folders.push({ id: Date.now(), name: n.trim(), quizIds: [], color: getRandomColor() }); saveFolders(); showToast('Created', 'success'); render(); }
function deleteFolder(id) { 
    if (!confirm('Delete folder? Quizzes will not be deleted.')) return; 
    state.folders = state.folders.filter(f => f.id !== id); 
    if (state.selectedFolder == id) state.selectedFolder = 'all'; 
    saveFolders(); 
    showToast('Deleted', 'success'); 
    render(); 
}
       function addToFolder(qid, fid) { 
    const f = state.folders.find(fo => fo.id === fid); 
    if (!f) return;
    if (f.quizIds.includes(qid)) {
        showToast('Already in folder', 'info');
        return;
    }
    f.quizIds.push(qid); 
    saveFolders(); 
    showToast(`Added to ${f.name}`, 'success'); 
    render(); // ADD render to update UI
}
        
        function showQuizOptions(id) {
    const q = state.quizzes.find(qz => qz.id === id);
    if (!q) return;
    
    // Check if there's existing progress
    const hasProgress = loadQuizProgress(id) !== null;
    
    const m = document.createElement('div');
    m.innerHTML = `
        <div class="modal-overlay" onclick="if(event.target===this)this.remove()">
            <div class="modal">
                <div class="modal-header">
                    <h2>${hasProgress ? '⚠️ Resume or Start Over?' : 'Start Quiz'}</h2>
                    <button class="btn btn-icon btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <h3 style="margin-bottom:0.25rem">${escapeHtml(q.title)}</h3>
                    <p class="text-sm text-muted" style="margin-bottom:2rem">${q.questions?.length || 0} questions</p>
                    
                    ${hasProgress ? `
                        <div class="card" style="padding:1rem;background:var(--accent-glow);margin-bottom:1.5rem;border:2px solid var(--accent)">
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
                        <button class="btn btn-accent flex-1" onclick="startQuizFromModal(${id},true)">Study</button>
                    `}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(m.firstElementChild);
}
        function startQuizFromModal(id, study) {
    const sh = document.getElementById('optShuffle')?.checked;
    const tm = document.getElementById('optTimer')?.checked;
    const mn = parseInt(document.getElementById('optMinutes')?.value) || 15;
    document.querySelector('.modal-overlay')?.remove();
    startQuiz(id, {
        studyMode: study,
        shuffleQuestions: sh,
        timerEnabled: tm && !study,
        timerMinutes: mn,
        forceNew: false
    });
}
        function startQuizFresh(id, study) {
    clearQuizProgress(id);
    const sh = document.getElementById('optShuffle')?.checked;
    const tm = document.getElementById('optTimer')?.checked;
    const mn = parseInt(document.getElementById('optMinutes')?.value) || 15;
    document.querySelector('.modal-overlay')?.remove();
    startQuiz(id, {
        studyMode: study,
        shuffleQuestions: sh,
        timerEnabled: tm && !study,
        timerMinutes: mn,
        forceNew: true
    });
}
        function render() {
            let html = '';
            if (!state.isAuthenticated) html = renderAuth();
            else { switch (state.view) { case 'library': html = renderLibrary(); break; case 'create': html = renderCreate(); break; case 'quiz': html = renderQuiz(); break; case 'results': html = renderResults(); break; case 'review': html = renderReview(); break; default: html = renderLibrary(); } }
            document.getElementById('app').innerHTML = html;
            bindEvents();
        }
        
        function bindEvents() {
            if (state.view === 'create' && state.isAuthenticated) {
                setTimeout(() => {
                    const ti = document.getElementById('quizTitle'), ci = document.getElementById('quizCategory'), di = document.getElementById('quizData');
                    if (ti) { ti.value = state.quizTitle; ti.addEventListener('input', e => state.quizTitle = e.target.value); }
                    if (ci) { ci.value = state.quizCategory; ci.addEventListener('input', e => state.quizCategory = e.target.value); }
                    if (di) { di.value = state.quizData; di.addEventListener('input', e => state.quizData = e.target.value); }
                }, 0);
            }
            if (state.view === 'quiz' && state.currentQuiz?.questions[state.currentQuestionIndex]?.type === 'ordering') {
                setTimeout(() => {
                    document.querySelectorAll('.draggable-item').forEach((item, i) => {
                        item.addEventListener('dragstart', e => handleDragStart(e, i));
                        item.addEventListener('dragover', handleDragOver);
                        item.addEventListener('dragleave', handleDragLeave);
                        item.addEventListener('drop', e => handleDrop(e, i));
                        item.addEventListener('dragend', handleDragEnd);
                    });
                }, 0);
            }
            if (state.view === 'quiz' && state.timerEnabled) updateTimerDisplay();
        }
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
            const daysSinceStart = (Date.now() - (allProgress[qid].startTime || Date.now())) / (1000 * 60 * 60 * 24);
            if (daysSinceStart > 7) {
                delete allProgress[qid];
            }
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
        
        // If specific quiz requested, return that
        if (quizId) {
            const progress = allProgress[quizId];
            if (!progress) return null;
            
            // Validate essential data
            if (!progress.quizId || !progress.questions || !Array.isArray(progress.questions) || progress.questions.length === 0) {
                delete allProgress[quizId];
                localStorage.setItem('quiz-progress-all', JSON.stringify(allProgress));
                return null;
            }
            
            // Check if expired (older than 7 days)
            const daysSinceStart = (Date.now() - (progress.startTime || Date.now())) / (1000 * 60 * 60 * 24);
            if (daysSinceStart > 7) {
                delete allProgress[quizId];
                localStorage.setItem('quiz-progress-all', JSON.stringify(allProgress));
                return null;
            }
            
            return progress;
        }
        
        // Otherwise return all valid progress
        const validProgress = {};
        Object.entries(allProgress).forEach(([qid, progress]) => {
            if (progress && progress.quizId && progress.questions && Array.isArray(progress.questions) && progress.questions.length > 0) {
                const daysSinceStart = (Date.now() - (progress.startTime || Date.now())) / (1000 * 60 * 60 * 24);
                if (daysSinceStart <= 7) {
                    validProgress[qid] = progress;
                }
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
    
    // Resume timer if it was active and time remaining
    if (state.timerEnabled && state.timeRemaining > 0) {
        startTimer();
    } else if (state.timerEnabled && state.timeRemaining <= 0) {
        state.timeExpired = true;
    }
    
    state.view = 'quiz';
    render();
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
    
    const m = document.createElement('div');
    m.innerHTML = `
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
                        <div class="badge badge-accent" style="width:100%;justify-content:center;padding:0.5rem">
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
    document.body.appendChild(m.firstElementChild);
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
					
        function renderAuth() {
            const isLogin = state.authMode === 'login';
            return `<div class="auth-page"><div class="auth-card"><div class="auth-logo"><div class="logo-mark">Q</div><span style="font-family:var(--font-display);font-size:1.5rem;font-weight:700">Quiz Master Pro</span></div><h1 class="auth-title">${isLogin ? 'Welcome back' : 'Create account'}</h1><p class="auth-subtitle">${isLogin ? 'Sign in to continue' : 'Start your journey'}</p><form onsubmit="event.preventDefault();${isLogin ? 'handleLogin()' : 'handleRegister()'}"><div style="margin-bottom:1rem"><label class="input-label">Username</label><input type="text" id="username" class="input" placeholder="Username" required></div><div style="margin-bottom:1.5rem"><label class="input-label">Password</label><input type="password" id="password" class="input" placeholder="Password" required></div><button type="submit" class="btn btn-accent btn-lg" style="width:100%">${isLogin ? 'Sign In' : 'Create Account'}</button></form><div class="auth-divider">${isLogin ? 'New here?' : 'Have an account?'}</div><button onclick="state.authMode='${isLogin ? 'register' : 'login'}';render()" class="btn btn-ghost" style="width:100%">${isLogin ? 'Create account' : 'Sign in'}</button></div></div>`;
        }
        function handleLogin() { login(document.getElementById('username').value, document.getElementById('password').value); }
        function handleRegister() { register(document.getElementById('username').value, document.getElementById('password').value); }
        
        function renderLibrary() {
            const stats = getUserStats(), cats = getCategories(), fq = getFilteredQuizzes();
            return `
                <nav class="navbar">
                    <div class="container">
                        <div class="navbar-inner">
                            <a href="#" class="logo" onclick="state.view='library';render()">
                                <div class="logo-mark">Q</div>
                                <span>Quiz Master Pro</span>
                            </a>
                            <div class="flex items-center gap-sm">
                                <button onclick="toggleDarkMode()" class="btn btn-icon btn-ghost">${state.darkMode ? '☀️' : '🌙'}</button>
                                <button onclick="showQuizletImport()" class="btn btn-ghost btn-sm">Quizlet</button>
                                <button onclick="state.view='create';state.editingQuizId=null;state.quizTitle='';state.quizData='';state.quizCategory='';render()" class="btn btn-accent">+ New Quiz</button>
                                <div class="dropdown">
                                    <button onclick="this.parentElement.classList.toggle('open')" class="btn btn-icon btn-ghost">👤</button>
                                    <div class="dropdown-menu">
                                        <div style="padding:0.5rem 1rem;border-bottom:1px solid var(--cream)"><p class="font-semibold">${state.user?.username || 'User'}</p></div>
                                        <button class="dropdown-item" onclick="showImportModal()">📥 Import</button>
                                        <button class="dropdown-item" onclick="exportQuizzes()">📤 Export</button>
                                        <button class="dropdown-item" onclick="createFolder()">📁 New Folder</button>
                                        <button class="dropdown-item danger" onclick="logout()">Sign out</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>
                
                <main style="padding:2rem 0 4rem">
                    <div class="container">
                        <div style="margin-bottom:2rem">
                            <h1 style="margin-bottom:0.25rem">Welcome back${state.user?.username ? ', ' + state.user.username : ''}</h1>
                            <p class="text-muted">Ready to study?</p>
                        </div>
                        
                        <div class="grid grid-4 gap-md" style="margin-bottom:2rem">
                            <div class="stat-card"><div class="stat-value">${stats.totalQuizzes}</div><div class="stat-label">Quizzes</div></div>
                            <div class="stat-card"><div class="stat-value">${stats.totalQuestions}</div><div class="stat-label">Questions</div></div>
                            <div class="stat-card"><div class="stat-value">${stats.totalAttempts}</div><div class="stat-label">Attempts</div></div>
                            <div class="stat-card accent"><div class="stat-value">${stats.avgScore}%</div><div class="stat-label">Avg Score</div></div>
                        </div>
                        
                        ${state.folders.length > 0 ? `
                            <div style="margin-bottom:1.5rem">
                                <div class="flex items-center gap-sm flex-wrap">
                                    <button onclick="state.selectedFolder='all';render()" class="btn ${state.selectedFolder === 'all' ? 'btn-primary' : 'btn-ghost'} btn-sm">All</button>
                                    ${state.folders.map(f => `
                                        <div class="folder-btn">
                                            <button onclick="state.selectedFolder='${f.id}';render()" class="btn btn-sm" style="background:${state.selectedFolder == f.id ? f.color : 'transparent'};color:${state.selectedFolder == f.id ? 'white' : 'var(--ink)'};border:2px solid ${f.color}">
                                                📁 ${escapeHtml(f.name)} (${f.quizIds.length})
                                            </button>
                                            <button onclick="event.stopPropagation();deleteFolder(${f.id})" class="folder-delete">✕</button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        ${(() => {
    const allProgress = getAllInProgressQuizzes();
    if (allProgress.length === 0) return '';
    
    // Show all in-progress quizzes
    return allProgress.map(progress => {
        const quizExists = state.quizzes.some(q => q.id === progress.quizId);
        if (!quizExists) return ''; // Skip deleted quizzes
        
        const answeredCount = progress.answers.filter(a => a != null && (Array.isArray(a) ? a.length > 0 : true)).length;
        const progressPct = Math.round((answeredCount / progress.questions.length) * 100);
        
        const timeSinceStart = Date.now() - (progress.startTime || Date.now());
        const minutes = Math.floor(timeSinceStart / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        let timeAgo = 'just now';
        if (days > 0) timeAgo = `${days} day${days > 1 ? 's' : ''} ago`;
        else if (hours > 0) timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`;
        else if (minutes > 0) timeAgo = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        
        return `
            <div class="card" style="padding:1.5rem;margin-bottom:1rem;background:var(--accent-glow);border:2px solid var(--accent);cursor:pointer" onclick="continueQuiz(${progress.quizId})">
                <div class="flex items-center justify-between gap-md">
                    <div class="flex items-center gap-md flex-1" style="min-width:0">
                        <div style="width:48px;height:48px;background:var(--accent);color:white;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0">▶️</div>
                        <div style="flex:1;min-width:0;overflow:hidden">
                            <h3 style="margin-bottom:0.25rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Resume: ${escapeHtml(progress.quizTitle)}</h3>
                            <p class="text-sm text-muted">${answeredCount}/${progress.questions.length} answered • ${timeAgo}</p>
                        </div>
                    </div>
                    <div style="text-align:right;flex-shrink:0">
                        <div class="badge badge-accent" style="font-size:0.875rem;padding:0.5rem 1rem">${progressPct}%</div>
                        <button onclick="event.stopPropagation();if(confirm('Discard this progress?'))discardProgress(${progress.quizId})" class="btn btn-ghost btn-sm" style="margin-top:0.5rem">🗑️ Discard</button>
                    </div>
                </div>
                <div class="progress-bar" style="margin-top:1rem">
                    <div class="progress-fill" style="width:${progressPct}%"></div>
                </div>
            </div>
        `;
    }).join('');
})()}
                        <div class="flex gap-md items-center flex-wrap" style="margin-bottom:1.5rem">
                            <div class="search-wrapper" style="flex:1;min-width:200px">
                                <span class="search-icon">🔍</span>
                                <input type="text" class="input search-input" placeholder="Search..." value="${state.searchQuery}" oninput="state.searchQuery=this.value;render()">
                            </div>
                            <select class="input" style="width:auto" onchange="state.categoryFilter=this.value;render()">
                                <option value="all">All Categories</option>
                                ${cats.map(c => `<option value="${escapeHtml(c)}" ${state.categoryFilter === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
                            </select>
                            <div class="tabs">
                                <button class="tab ${state.sortBy === 'custom' ? 'active' : ''}" onclick="state.sortBy='custom';render()">Custom</button>
                                <button class="tab ${state.sortBy === 'recent' ? 'active' : ''}" onclick="state.sortBy='recent';render()">Recent</button>
                                <button class="tab ${state.sortBy === 'alpha' ? 'active' : ''}" onclick="state.sortBy='alpha';render()">A-Z</button>
                            </div>
                        </div>
                        
                        ${fq.length > 0 ? `
                            <div class="grid grid-3" id="quiz-grid">
                                ${fq.map(q => {
                                    const qs = getQuizStats(q);
                                    const isDraggable = state.sortBy === 'custom' && !state.searchQuery && state.categoryFilter === 'all';
                                    return `
                                        <div class="quiz-card ${isDraggable ? 'draggable' : ''}" 
                                            ${isDraggable ? `draggable="true" 
                                            ondragstart="handleQuizDragStart(event, ${q.id})"
                                            ondragover="handleQuizDragOver(event)"
                                            ondragleave="handleQuizDragLeave(event)"
                                            ondrop="handleQuizDrop(event, ${q.id})"
                                            ondragend="handleQuizDragEnd(event)"` : ''}
                                            onclick="showQuizOptions(${q.id})" style="position:relative">
                                            ${isDraggable ? '<span class="drag-handle">⋮⋮</span>' : ''}
                                            <div class="flex items-start gap-md" style="margin-bottom:1rem;min-width:0">
                                                <div class="quiz-card-icon" style="background:${q.color || 'var(--cream)'}20;color:${q.color || 'var(--accent)'}">📚</div>
                                                <div style="flex:1;min-width:0;overflow:hidden">
                                                    <h3 class="quiz-card-title">${state.searchQuery ? highlightText(q.title, state.searchQuery) : escapeHtml(q.title)}</h3>
                                                    <p class="quiz-card-meta">${q.description || 'No category'}</p>
                                                </div>
                                                <div class="dropdown" onclick="event.stopPropagation()">
                                                    <button onclick="this.parentElement.classList.toggle('open')" class="btn btn-icon btn-ghost btn-sm">⋮</button>
                                                    <div class="dropdown-menu">
                                                        <button class="dropdown-item" onclick="event.stopPropagation(); showQuizPreview(${q.id})">👁️ Preview</button>
                                                        ${state.folders.map(f => `<button class="dropdown-item" onclick="addToFolder(${q.id},${f.id})">📁 ${escapeHtml(f.name)}</button>`).join('')}
                                                        <button class="dropdown-item danger" onclick="deleteQuiz(${q.id})">🗑️ Delete</button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="quiz-card-stats">
                                                <div class="quiz-card-stat"><span>📝</span><span>${q.questions?.length || 0}</span></div>
                                                ${qs ? `<div class="quiz-card-stat"><span>🏆</span><span>${qs.best}%</span></div>` : `<div class="quiz-card-stat"><span>✨</span><span>New</span></div>`}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            ${state.sortBy === 'custom' && !state.searchQuery && state.categoryFilter === 'all' ? '<p class="text-sm text-muted" style="margin-top:1rem;text-align:center">💡 Drag quizzes to reorder</p>' : ''}
                        ` : `
                            <div class="empty-state">
                                <div class="empty-state-icon">📚</div>
                                <h2 class="empty-state-title">${state.searchQuery || state.categoryFilter !== 'all' ? 'No quizzes found' : 'No quizzes yet'}</h2>
                                <p class="empty-state-desc">${state.searchQuery || state.categoryFilter !== 'all' ? 'Try adjusting your search' : 'Create your first quiz'}</p>
                                ${!state.searchQuery && state.categoryFilter === 'all' ? `<button onclick="state.view='create';render()" class="btn btn-accent">Create Quiz</button>` : ''}
                            </div>
                        `}
                    </div>
                </main>
            `;
        }
        
        function renderCreate() {
            const isEdit = state.editingQuizId !== null;
            return `<nav class="navbar"><div class="container"><div class="navbar-inner"><button onclick="state.view='library';state.editingQuizId=null;state.quizTitle='';state.quizData='';state.quizCategory='';render()" class="btn btn-ghost">← Back</button><h2 style="font-size:1.125rem">${isEdit ? 'Edit Quiz' : 'Create Quiz'}</h2><button onclick="saveQuiz()" class="btn btn-accent">${isEdit ? 'Save' : 'Create'}</button></div></div></nav>
            <main style="padding:2rem 0"><div class="container-narrow"><div class="card" style="padding:2rem"><div style="margin-bottom:1.5rem"><label class="input-label">Title</label><input type="text" id="quizTitle" class="input" placeholder="Quiz title"></div><div style="margin-bottom:1.5rem"><label class="input-label">Category</label><input type="text" id="quizCategory" class="input" placeholder="e.g., Networking"></div><div><div class="flex justify-between items-center" style="margin-bottom:0.5rem"><label class="input-label">Questions</label><button onclick="state.showFormatHelp=!state.showFormatHelp;render()" class="btn btn-ghost btn-sm">${state.showFormatHelp ? 'Hide' : 'Show'} help</button></div>${state.showFormatHelp ? `<div class="card" style="padding:1.5rem;margin-bottom:1rem;background:var(--cream)">
<p class="font-semibold" style="margin-bottom:1.5rem">📝 Question Format Guide</p>

<p class="text-sm font-semibold" style="margin-bottom:0.5rem">Single Choice:</p>
<div class="format-example" style="margin-bottom:1rem">1. What is the capital of France?
A. London
B. Paris *
C. Berlin</div>

<p class="text-sm font-semibold" style="margin-bottom:0.5rem">Multiple Choice (Select All):</p>
<div class="format-example" style="margin-bottom:1rem">2. Which are valid IPv4 classes?
A. Class A *
B. Class B *
C. Class E *
D. Class Z</div>

<p class="text-sm font-semibold" style="margin-bottom:0.5rem">Ordering Questions:</p>
<div class="format-example" style="margin-bottom:1rem">3. [order] Put the OSI layers in order (top to bottom)
1) Application
2) Presentation
3) Session
4) Transport</div>

<p class="text-sm font-semibold" style="margin-bottom:0.5rem">With Code Block:</p>
<div class="format-example" style="margin-bottom:1rem">4. What does this command display?
[code]
show ip route
[/code]
A. Routing table *
B. Interface list
C. ARP cache</div>

<p class="text-sm font-semibold" style="margin-bottom:0.5rem">With Image:</p>
<div class="format-example" style="margin-bottom:1rem">5. What topology is shown in this diagram?
[image: https://example.com/network.png]
A. Star *
B. Ring
C. Mesh</div>

<p class="text-sm font-semibold" style="margin-bottom:0.5rem">With Explanation:</p>
<div class="format-example" style="margin-bottom:1rem">6. What is the default admin distance for OSPF?
A. 90
B. 110 *
C. 120
[explanation: OSPF has an admin distance of 110. EIGRP is 90, RIP is 120.]</div>

<div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--cream)">
<p class="text-sm font-semibold" style="margin-bottom:0.5rem">Quick Reference:</p>
<ul class="text-xs text-muted" style="padding-left:1.25rem;line-height:1.8">
<li><code>*</code> after an option marks it as correct</li>
<li>Multiple <code>*</code> = "select all that apply"</li>
<li><code>[order]</code> after question number = ordering question</li>
<li><code>[code]...[/code]</code> = code block</li>
<li><code>[image: URL]</code> = include an image</li>
<li><code>[explanation: text]</code> = show after answering</li>
</ul>
</div>
</div>` : ''}<textarea id="quizData" class="input" rows="20" placeholder="Enter questions..." style="font-family:monospace;font-size:0.875rem"></textarea></div></div></div></main>`;
        }
        
        function renderQuiz() {
            const q = state.currentQuiz.questions[state.currentQuestionIndex];
            const prog = ((state.currentQuestionIndex + 1) / state.currentQuiz.questions.length) * 100;
            const flagged = state.flaggedQuestions.has(state.currentQuestionIndex);
            const ua = state.answers[state.currentQuestionIndex] || [];
            let isCorrect = false;
            if (state.studyMode && state.showAnswer) {
                if (q.type === 'choice') { const as = new Set(ua), cs = new Set(q.correct); isCorrect = as.size === cs.size && [...as].every(a => cs.has(a)); }
                else if (q.type === 'ordering') isCorrect = JSON.stringify(ua) === JSON.stringify(q.correct);
            }
            
            let optHTML = '';
            if (q.type === 'ordering') {
                const order = state.answers[state.currentQuestionIndex] || q.options.map((_, i) => i);
                optHTML = `<div class="flex flex-col gap-sm">${order.map((oi, pos) => `<div draggable="true" class="draggable-item ${state.studyMode && state.showAnswer ? (q.correct[pos] === oi ? 'correct' : 'incorrect') : ''}" data-position="${pos}"><span class="drag-handle">☰</span><span class="drag-number">${pos + 1}</span><span style="flex:1">${escapeHtml(q.options[oi])}</span></div>`).join('')}</div><p class="text-sm text-muted" style="margin-top:1rem">${state.studyMode && !state.showAnswer ? '💡 Drag to reorder, then click Check Answer' : '💡 Drag to reorder'}</p>`;
            } else {
                optHTML = q.options.map((opt, i) => {
                    const sel = ua.includes(i), corr = q.correct.includes(i);
                    let cls = 'option-btn';
                    if (state.studyMode && state.showAnswer) { if (corr) cls += ' correct'; else if (sel) cls += ' incorrect'; }
                    else if (sel) cls += ' selected';
                    return `<button class="${cls}" onclick="selectAnswer(${i})" ${state.studyMode && state.showAnswer ? 'disabled' : ''}><span class="option-letter">${String.fromCharCode(65 + i)}</span><span style="flex:1">${escapeHtml(opt)}</span>${state.studyMode && state.showAnswer && corr ? '<span class="badge badge-success">✓</span>' : ''}${state.studyMode && state.showAnswer && sel && !corr ? '<span class="badge badge-error">✗</span>' : ''}</button>`;
                }).join('');
            }
            
            return `<div style="min-height:100vh;background:var(--paper)"><header class="quiz-header"><div class="container"><div class="flex justify-between items-center"><div class="flex items-center gap-md"><div class="flex gap-sm">
    <button onclick="saveAndExitQuiz()" class="btn btn-ghost btn-sm">💾 Save & Exit</button>
</div><div><h2 style="font-size:1rem;margin-bottom:2px">${escapeHtml(state.currentQuiz.title)}</h2><p class="text-xs text-muted">${state.studyMode ? '📖 Study' : '🎯 Quiz'}</p></div></div><div class="flex items-center gap-sm">${state.timerEnabled ? `<div class="badge" style="font-family:monospace;font-size:1rem;padding:0.5rem 1rem">⏱️ <span id="timer">${Math.floor(state.timeRemaining / 60)}:${(state.timeRemaining % 60).toString().padStart(2, '0')}</span></div>` : ''}${state.studyMode && state.streak > 0 ? `<div class="streak-badge">🔥 ${state.streak}</div>` : ''}<button onclick="toggleFlag()" class="btn btn-icon ${flagged ? 'btn-accent' : 'btn-ghost'}">${flagged ? '🚩' : '⚑'}</button></div></div></div></header>
            <div class="quiz-progress-section"><div class="container"><div class="flex justify-between items-center" style="margin-bottom:0.5rem"><span class="text-sm text-muted">Question ${state.currentQuestionIndex + 1} of ${state.currentQuiz.questions.length}</span><span class="text-sm font-semibold" style="color:var(--accent)">${Math.round(prog)}%</span></div><div class="progress-bar"><div class="progress-fill" style="width:${prog}%"></div></div></div></div>
            <div class="quiz-content"><div class="container-narrow">${state.studyMode && state.showAnswer ? `<div class="feedback-banner ${isCorrect ? 'correct' : 'incorrect'}" style="margin-bottom:1.5rem"><span style="font-size:1.25rem">${isCorrect ? '✓' : '✗'}</span><span>${isCorrect ? 'Correct!' : 'Incorrect'}</span>${isCorrect && state.streak > 1 ? `<span class="streak-badge" style="margin-left:auto">🔥 ${state.streak}</span>` : ''}</div>` : ''}
            <div class="card" style="padding:2rem;margin-bottom:1.5rem"><div class="flex items-start gap-md" style="margin-bottom:2rem"><div class="question-number">${state.currentQuestionIndex + 1}</div><h2 class="question-text">${escapeHtml(q.question)}</h2></div>${q.code ? `<div class="code-block" style="margin-bottom:1.5rem"><div class="code-header"><div class="code-dot" style="background:#ef4444"></div><div class="code-dot" style="background:#f59e0b"></div><div class="code-dot" style="background:#22c55e"></div><span class="text-xs" style="margin-left:0.5rem;opacity:0.7">Code</span></div><div class="code-body">${escapeHtml(q.code)}</div></div>` : ''}${q.image ? `<img src="${escapeHtml(q.image)}" alt="Question image" style="max-width:100%;max-height:300px;border-radius:var(--radius-md);margin-bottom:1.5rem">` : ''}${q.correct.length > 1 && q.type === 'choice' ? `<div class="badge badge-accent" style="margin-bottom:1rem">Select all that apply (${q.correct.length} answers)</div>` : ''}<div class="flex flex-col gap-sm">${optHTML}</div>${state.studyMode && !state.showAnswer && (q.correct.length > 1 || q.type === 'ordering') ? `<button onclick="checkStudyAnswer();render()" class="btn btn-accent" style="margin-top:1.5rem;width:100%">Check Answer</button>` : ''}${state.studyMode && state.showAnswer && q.explanation ? `<div class="explanation-box" style="margin-top:1.5rem"><p class="font-semibold" style="margin-bottom:0.25rem">💡 Explanation</p><p>${escapeHtml(q.explanation)}</p></div>` : ''}</div></div></div>
            <footer class="quiz-footer"><div class="container"><div class="flex justify-between items-center gap-md"><button onclick="prevQuestion()" class="btn btn-ghost" ${state.currentQuestionIndex === 0 ? 'disabled' : ''}>← Prev</button><div class="flex gap-xs">${Array.from({length: Math.min(state.currentQuiz.questions.length, 10)}, (_, i) => { const idx = state.currentQuiz.questions.length <= 10 ? i : Math.max(0, Math.min(state.currentQuestionIndex - 4, state.currentQuiz.questions.length - 10)) + i; const cur = idx === state.currentQuestionIndex, ans = state.answers[idx] != null, fl = state.flaggedQuestions.has(idx); return `<button onclick="state.currentQuestionIndex=${idx};state.showAnswer=false;render()" class="btn btn-icon btn-sm" style="width:32px;height:32px;font-size:0.75rem;background:${cur ? 'var(--accent)' : ans ? 'var(--cream)' : 'transparent'};color:${cur ? 'white' : 'var(--ink)'};border:${fl ? '2px solid var(--accent)' : '1px solid var(--cream)'}">${idx + 1}</button>`; }).join('')}</div>${state.currentQuestionIndex === state.currentQuiz.questions.length - 1 ? `<button onclick="submitQuiz()" class="btn btn-accent">Submit</button>` : `<button onclick="nextQuestion()" class="btn btn-primary">Next →</button>`}</div></div></footer></div>`;
        }
        function saveAndExitQuiz() {
    saveQuizProgress();
    stopTimer();
    showToast('Progress saved!', 'success');
    state.view = 'library';
    state.currentQuiz = null;
    render();
}
        function renderResults() {
            const score = calculateScore(), total = state.currentQuiz.questions.length, pct = Math.round((score / total) * 100);
            let msg = '', emoji = '';
            if (pct >= 90) { msg = 'Outstanding!'; emoji = '🏆'; }
            else if (pct >= 80) { msg = 'Great job!'; emoji = '🌟'; }
            else if (pct >= 70) { msg = 'Good work!'; emoji = '👍'; }
            else if (pct >= 60) { msg = 'Not bad!'; emoji = '💪'; }
            else { msg = 'Keep practicing!'; emoji = '📚'; }
            
            return `<div style="min-height:100vh;background:var(--paper)"><div class="container-narrow" style="padding:4rem 1.5rem"><div class="results-hero"><div class="results-score"><div class="results-score-value">${pct}%</div><div class="results-score-label">${score} of ${total}</div></div><h1 class="results-message">${emoji} ${msg}</h1><p class="text-muted" style="margin-bottom:2rem">${escapeHtml(state.currentQuiz.title)}</p>${state.maxStreak > 1 ? `<div class="badge badge-accent" style="font-size:1rem;padding:0.5rem 1.5rem;margin-bottom:2rem">🔥 Best streak: ${state.maxStreak}</div>` : ''}</div><div class="grid grid-3 gap-md" style="margin-bottom:2rem"><div class="stat-card" style="text-align:center"><div class="stat-value" style="color:var(--success)">${score}</div><div class="stat-label">Correct</div></div><div class="stat-card" style="text-align:center"><div class="stat-value" style="color:var(--error)">${total - score}</div><div class="stat-label">Incorrect</div></div><div class="stat-card" style="text-align:center"><div class="stat-value">${state.flaggedQuestions.size}</div><div class="stat-label">Flagged</div></div></div><div class="flex flex-col gap-md"><button onclick="state.view='review';render()" class="btn btn-primary btn-lg" style="width:100%">📝 Review Answers</button><button onclick="startQuiz(${state.currentQuiz.id},{studyMode:false})" class="btn btn-accent btn-lg" style="width:100%">🔄 Try Again</button><button onclick="state.view='library';render()" class="btn btn-ghost btn-lg" style="width:100%">← Library</button></div></div></div>`;
        }
        
        function renderReview() {
            const html = state.currentQuiz.questions.map((q, i) => {
                const ua = state.answers[i] || [];
                let correct = false;
                if (q.type === 'choice') { const as = new Set(ua), cs = new Set(q.correct); correct = as.size === cs.size && [...as].every(a => cs.has(a)); }
                else if (q.type === 'ordering') correct = JSON.stringify(ua) === JSON.stringify(q.correct);
                
                return `<div class="card" style="padding:1.5rem;margin-bottom:1rem;${correct ? '' : 'border-left:4px solid var(--error)'}"><div class="flex items-center gap-md" style="margin-bottom:1rem"><span style="font-size:1.5rem">${correct ? '✅' : '❌'}</span><span class="badge ${correct ? 'badge-success' : 'badge-error'}">${correct ? 'Correct' : 'Incorrect'}</span><span class="text-sm text-muted">Q${i + 1}</span></div><h3 style="margin-bottom:1rem">${escapeHtml(q.question)}</h3>${q.code ? `<div class="code-block" style="margin-bottom:1rem"><div class="code-header"><div class="code-dot" style="background:#ef4444"></div><div class="code-dot" style="background:#f59e0b"></div><div class="code-dot" style="background:#22c55e"></div></div><div class="code-body">${escapeHtml(q.code)}</div></div>` : ''}<div class="flex flex-col gap-sm" style="margin-bottom:1rem">${q.type === 'choice' ? q.options.map((opt, j) => { const isU = ua.includes(j), isC = q.correct.includes(j); let cls = 'review-option'; if (isC) cls += ' review-correct'; if (isU && !isC) cls += ' review-incorrect'; let badge = ''; if (isC) badge = '<span class="badge badge-success">Correct</span>'; if (isU && !isC) badge = '<span class="badge badge-error">Your answer</span>'; if (isU && isC) badge = '<span class="badge badge-success">Your answer ✓</span>'; return `<div class="${cls}"><span class="font-semibold">${String.fromCharCode(65 + j)}.</span> ${escapeHtml(opt)} <span style="float:right">${badge}</span></div>`; }).join('') : `<div class="review-option"><p class="text-sm text-muted" style="margin-bottom:0.5rem">Correct order:</p>${q.correct.map((ci, pos) => `<div style="padding:0.25rem 0">${pos + 1}. ${escapeHtml(q.options[ci])} ${ua[pos] === ci ? '✓' : '❌'}</div>`).join('')}</div>`}</div>${q.explanation ? `<div class="explanation-box"><p class="font-semibold" style="margin-bottom:0.25rem">💡 Explanation</p><p>${escapeHtml(q.explanation)}</p></div>` : ''}</div>`;
            }).join('');
            
            return `<nav class="navbar"><div class="container"><div class="navbar-inner"><button onclick="state.view='results';render()" class="btn btn-ghost">← Results</button><h2 style="font-size:1.125rem">Review</h2><div></div></div></div></nav><main style="padding:2rem 0 4rem"><div class="container-narrow">${html}<div class="flex gap-md" style="margin-top:2rem"><button onclick="startQuiz(${state.currentQuiz.id},{studyMode:false})" class="btn btn-accent flex-1">Try Again</button><button onclick="state.view='library';render()" class="btn btn-ghost flex-1">Library</button></div></div></main>`;
        }
        
        // Initialize
if (loadAuth()) { 
    state.view = 'library'; 
    loadQuizzes().then(() => {
        // Check for saved quiz progress - now handles multiple quizzes
        const allProgress = getAllInProgressQuizzes();
        
        // Clean up progress for deleted quizzes
        allProgress.forEach(progress => {
            const quizExists = state.quizzes.some(q => q.id === progress.quizId);
            if (!quizExists) {
                clearQuizProgress(progress.quizId);
            }
        });
        
        render();
    }); 
} else { 
    render(); 
}