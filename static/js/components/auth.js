/* Auth Component - v2.0 with landing page integration */
import { getState, setState } from '../state.js';
import { login, register } from '../services/api.js';
import { showToast } from '../utils/toast.js';
import { showLoading, hideLoading } from '../utils/dom.js';

export function renderAuth() {
    const state = getState();
    const isLogin = state.view === 'login';
    
    return `
    <div class="auth-page">
        <div class="auth-container">
            <button class="auth-back-btn" onclick="window.app.navigate('landing')">
                ← Back
            </button>
            
            <div class="auth-card">
                <div class="auth-header">
                    <div class="auth-logo">🎓</div>
                    <h1>${isLogin ? 'Welcome Back' : 'Create Account'}</h1>
                    <p class="text-muted">
                        ${isLogin 
                            ? 'Sign in to access your quizzes' 
                            : 'Start creating quizzes in minutes'}
                    </p>
                </div>
                
                <form class="auth-form" onsubmit="event.preventDefault(); window.app.handleAuth()">
                    <div class="form-group">
                        <label class="label">Username</label>
                        <input 
                            type="text" 
                            id="auth-username" 
                            class="input input-lg" 
                            placeholder="Enter username"
                            autocomplete="username"
                            required
                            autofocus
                        >
                    </div>
                    
                    ${!isLogin ? `
                    <div class="form-group">
                        <label class="label">Email <span class="optional">(optional)</span></label>
                        <input 
                            type="email" 
                            id="auth-email" 
                            class="input" 
                            placeholder="your@email.com"
                            autocomplete="email"
                        >
                    </div>
                    ` : ''}
                    
                    <div class="form-group">
                        <label class="label">Password</label>
                        <input 
                            type="password" 
                            id="auth-password" 
                            class="input input-lg" 
                            placeholder="Enter password"
                            autocomplete="${isLogin ? 'current-password' : 'new-password'}"
                            required
                            minlength="4"
                        >
                    </div>
                    
                    ${state.authError ? `
                    <div class="auth-error">
                        <span>⚠️</span> ${state.authError}
                    </div>
                    ` : ''}
                    
                    <button type="submit" class="btn btn-primary btn-lg btn-full">
                        ${isLogin ? 'Sign In' : 'Create Account'}
                    </button>
                </form>
                
                <div class="auth-footer">
                    ${isLogin 
                        ? `<p>Don't have an account? <button class="btn-link" onclick="window.app.navigate('register')">Sign up</button></p>`
                        : `<p>Already have an account? <button class="btn-link" onclick="window.app.navigate('login')">Sign in</button></p>`
                    }
                </div>
            </div>
            
            <p class="auth-note">
                Your data is stored securely and never shared.
            </p>
        </div>
    </div>
    `;
}

export function setAuthMode(mode) {
    setState({ view: mode, authError: null });
}

export async function handleAuth() {
    const state = getState();
    const isLogin = state.view === 'login';
    
    const username = document.getElementById('auth-username')?.value?.trim();
    const password = document.getElementById('auth-password')?.value;
    const email = document.getElementById('auth-email')?.value?.trim();
    
    if (!username || !password) {
        setState({ authError: 'Please fill in all required fields' });
        return;
    }
    
    if (username.length < 3) {
        setState({ authError: 'Username must be at least 3 characters' });
        return;
    }
    
    if (password.length < 4) {
        setState({ authError: 'Password must be at least 4 characters' });
        return;
    }
    
    try {
        showLoading();
        
        let result;
        if (isLogin) {
            result = await login(username, password);
        } else {
            result = await register(username, password, email);
        }
        
        hideLoading();
        
        if (result.success) {
            setState({ 
                view: 'library',
                isAuthenticated: true,
                user: result.user,
                authError: null
            });
            showToast(isLogin ? 'Welcome back!' : 'Account created! Welcome to Quiz Master Pro.', 'success');
        } else {
            setState({ authError: result.error || 'Authentication failed' });
        }
    } catch (error) {
        hideLoading();
        setState({ authError: error.message || 'Connection failed. Please try again.' });
    }
}