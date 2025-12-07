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

function createFolder() { const n = prompt('Folder name:'); if (!n?.trim()) return; state.folders.push({ id: Date.now(), name: n.trim(), quizIds: [], color: getRandomColor() }); saveFolders(); showToast('Created', 'success'); render(); }
function deleteFolder(id) { 
    if (!confirm('Delete folder? Quizzes will not be deleted.')) return; 
    state.folders = state.folders.filter(f => f.id !== id); 
    if (state.selectedFolder == id) state.selectedFolder = 'all'; 
    saveFolders(); 
    showToast('Deleted', 'success'); 
    render(); 
}

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