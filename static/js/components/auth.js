/* Auth Component - v2.0 with landing page integration */
import { getState, setState } from '../state.js';
import { login, register, getBookmarks } from '../services/api.js';
import { showToast } from '../utils/toast.js';
import { showLoading, hideLoading } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { shouldShowOnboarding, startOnboarding } from './onboarding.js';

export function renderAuth() {
    const state = getState();
    const isLogin = state.view === 'login';

    return `
    <div class="auth-page">
        <div class="auth-container">
            <button class="auth-back-btn" onclick="window.app.navigate('landing')">
                ${icon('arrowLeft')} Back
            </button>

            <div class="auth-card">
                <div class="auth-header">
                    <div class="auth-logo">${icon('graduationCap', 'icon-3xl')}</div>
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
                        <label class="label">Email</label>
                        <input
                            type="email"
                            id="auth-email"
                            class="input"
                            placeholder="your@email.com"
                            autocomplete="email"
                            required
                        >
                    </div>
                    ` : ''}

                    <div class="form-group">
                        <label class="label">Password</label>
                        <input
                            type="password"
                            id="auth-password"
                            class="input input-lg"
                            placeholder="${isLogin ? 'Enter password' : 'At least 8 characters'}"
                            autocomplete="${isLogin ? 'current-password' : 'new-password'}"
                            required
                            minlength="8"
                            ${!isLogin ? 'oninput="window.app.updatePwdStrength(this.value)"' : ''}
                        >
                        ${!isLogin ? '<div class="pwd-strength" id="pwd-strength"></div>' : ''}
                    </div>

                    ${state.authError ? `
                    <div class="auth-error">
                        ${icon('alertTriangle')} ${state.authError}
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

    if (password.length < 8) {
        setState({ authError: 'Password must be at least 8 characters' });
        return;
    }

    if (!isLogin && !email) {
        setState({ authError: 'Email address is required' });
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
            setState({ authError: null });
            // Load bookmarks after fresh login/register
            getBookmarks().then(bms => {
                setState({ bookmarks: bms, bookmarkedQuestions: new Set(bms.map(b => b.question_id)) });
            }).catch(() => {});

            // Show onboarding for new users (registration) or first time on this device
            if (!isLogin || shouldShowOnboarding()) {
                setTimeout(() => startOnboarding(), 500);
            }
        } else {
            setState({ authError: result.error || 'Authentication failed' });
        }
    } catch (error) {
        hideLoading();
        setState({ authError: error.message || 'Connection failed. Please try again.' });
    }
}
