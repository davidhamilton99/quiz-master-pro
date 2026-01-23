/* ============================================
   QUIZ MASTER PRO - Auth View
   Login and registration
   ============================================ */

import { getState, setState } from '../state.js';
import { login, register } from '../services/api.js';
import { escapeHtml } from '../utils/dom.js';

export function renderAuth() {
    const state = getState();
    
    return `
        <div class="auth-page">
            <div class="auth-card card">
                <div class="auth-header">
                    <div class="auth-logo">Q</div>
                    <h1>Quiz Master Pro</h1>
                    <p class="text-muted">Where code actually runs</p>
                </div>
                
                <div class="auth-tabs">
                    <button 
                        class="auth-tab ${state.authMode === 'login' ? 'active' : ''}"
                        onclick="window.app.setAuthMode('login')"
                    >
                        Sign In
                    </button>
                    <button 
                        class="auth-tab ${state.authMode === 'register' ? 'active' : ''}"
                        onclick="window.app.setAuthMode('register')"
                    >
                        Sign Up
                    </button>
                </div>
                
                <form onsubmit="window.app.handleAuth(event)">
                    <div class="form-group">
                        <label class="label">Username</label>
                        <input 
                            type="text" 
                            id="auth-username"
                            class="input" 
                            placeholder="Enter username"
                            required
                            autocomplete="username"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label class="label">Password</label>
                        <input 
                            type="password" 
                            id="auth-password"
                            class="input" 
                            placeholder="Enter password"
                            required
                            autocomplete="${state.authMode === 'login' ? 'current-password' : 'new-password'}"
                            minlength="4"
                        >
                    </div>
                    
                    <button 
                        type="submit" 
                        class="btn btn-primary btn-lg" 
                        style="width: 100%"
                        ${state.loading ? 'disabled' : ''}
                    >
                        ${state.loading ? '<span class="spinner spinner-sm"></span>' : ''}
                        ${state.authMode === 'login' ? 'Sign In' : 'Create Account'}
                    </button>
                </form>
            </div>
        </div>
    `;
}

// Auth handlers
export function setAuthMode(mode) {
    setState({ authMode: mode });
}

export async function handleAuth(event) {
    event.preventDefault();
    
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    
    const state = getState();
    
    try {
        if (state.authMode === 'login') {
            await login(username, password);
        } else {
            await register(username, password);
        }
    } catch (error) {
        // Error is handled in api.js
    }
}

export default { renderAuth, setAuthMode, handleAuth };
