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