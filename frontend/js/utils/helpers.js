function toggleDarkMode() { state.darkMode = !state.darkMode; document.documentElement.classList.toggle('dark'); localStorage.setItem('darkMode', state.darkMode); render(); }
        function showToast(msg, type = 'info') { const c = document.getElementById('toast-container'); const t = document.createElement('div'); t.className = `toast ${type}`; t.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span><span>${msg}</span>`; c.appendChild(t); setTimeout(() => t.remove(), 4000); }
        function formatDate(d) { const dt = new Date(d), now = new Date(), diff = Math.floor((now - dt) / 86400000); if (diff === 0) return 'Today'; if (diff === 1) return 'Yesterday'; if (diff < 7) return `${diff} days ago`; return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
        function getRandomColor() { return ['#d97706','#059669','#0284c7','#7c3aed','#db2777','#dc2626'][Math.floor(Math.random() * 6)]; }
        function shuffleArray(arr) { const s = [...arr]; for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; } return s; }
        function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
        
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

function showToast(msg, type = 'info') { const c = document.getElementById('toast-container'); const t = document.createElement('div'); t.className = `toast ${type}`; t.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span><span>${msg}</span>`; c.appendChild(t); setTimeout(() => t.remove(), 4000); }
        function formatDate(d) { const dt = new Date(d), now = new Date(), diff = Math.floor((now - dt) / 86400000); if (diff === 0) return 'Today'; if (diff === 1) return 'Yesterday'; if (diff < 7) return `${diff} days ago`; return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
        function getRandomColor() { return ['#d97706','#059669','#0284c7','#7c3aed','#db2777','#dc2626'][Math.floor(Math.random() * 6)]; }
        function shuffleArray(arr) { const s = [...arr]; for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; } return s; }
        function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
        
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

function formatDate(d) { const dt = new Date(d), now = new Date(), diff = Math.floor((now - dt) / 86400000); if (diff === 0) return 'Today'; if (diff === 1) return 'Yesterday'; if (diff < 7) return `${diff} days ago`; return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
        function getRandomColor() { return ['#d97706','#059669','#0284c7','#7c3aed','#db2777','#dc2626'][Math.floor(Math.random() * 6)]; }
        function shuffleArray(arr) { const s = [...arr]; for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; } return s; }
        function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
        
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

function getRandomColor() { return ['#d97706','#059669','#0284c7','#7c3aed','#db2777','#dc2626'][Math.floor(Math.random() * 6)]; }
        function shuffleArray(arr) { const s = [...arr]; for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; } return s; }
        function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
        
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

function shuffleArray(arr) { const s = [...arr]; for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; } return s; }
        function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
        
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

function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
        
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