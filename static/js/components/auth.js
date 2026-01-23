/* Auth Component */

import { getState, setState } from '../state.js';
import { login, register } from '../services/api.js';

export function renderAuth() {
    const state = getState();
    
    return `
        <div class="auth-page">
            <div class="auth-card card">
                <div class="auth-header">
                    <div class="auth-logo">Q</div>
                    <h1>Quiz Master Pro</h1>
                    <p class="text-muted">Study smarter, not harder</p>
                </div>
                
                <div class="auth-tabs">
                    <button class="auth-tab ${state.authMode === 'login' ? 'active' : ''}" onclick="window.app.setAuthMode('login')">Sign In</button>
                    <button class="auth-tab ${state.authMode === 'register' ? 'active' : ''}" onclick="window.app.setAuthMode('register')">Sign Up</button>
                </div>
                
                <form onsubmit="window.app.handleAuth(event)">
                    <div class="form-group">
                        <label class="label">Username</label>
                        <input type="text" id="auth-user" class="input" placeholder="Enter username" required autocomplete="username">
                    </div>
                    <div class="form-group">
                        <label class="label">Password</label>
                        <input type="password" id="auth-pass" class="input" placeholder="Enter password" required minlength="4">
                    </div>
                    <button type="submit" class="btn btn-primary btn-lg" style="width:100%" ${state.loading ? 'disabled' : ''}>
                        ${state.loading ? '<span class="spinner"></span>' : (state.authMode === 'login' ? 'Sign In' : 'Create Account')}
                    </button>
                </form>
            </div>
        </div>
    `;
}

export function setAuthMode(mode) {
    setState({ authMode: mode });
}

export async function handleAuth(e) {
    e.preventDefault();
    const user = document.getElementById('auth-user').value.trim();
    const pass = document.getElementById('auth-pass').value;
    
    if (getState().authMode === 'login') {
        await login(user, pass);
    } else {
        await register(user, pass);
    }
}
