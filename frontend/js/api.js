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