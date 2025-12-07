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
}

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
}