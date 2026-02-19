/* API Service - FIXED: Proper return values for auth functions */
/* Note: This file must NOT import from state.js to avoid circular dependency */

import { showToast } from '../utils/toast.js';
import { API } from '../utils/constants.js';

const API_URL = 'https://davidhamilton.pythonanywhere.com/api';

// State update callback - set by state.js to avoid circular import
let stateUpdater = null;
let authClearer = null;

/**
 * Register callbacks from state.js to avoid circular imports
 */
export function registerStateCallbacks(updateFn, clearAuthFn) {
    stateUpdater = updateFn;
    authClearer = clearAuthFn;
}

/**
 * Core API call function with retry logic and error handling
 * Exported so state.js can use the same client (fixes Bug #8)
 */
export async function apiCall(endpoint, options = {}, retryCount = 0) {
    const token = localStorage.getItem('token');
    
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API.REQUEST_TIMEOUT_MS || 15000);
        
        const res = await fetch(`${API_URL}${endpoint}`, { 
            ...options, 
            headers,
            signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            
            // Handle specific HTTP errors
            if (res.status === 401) {
                // Clear auth from localStorage directly to avoid circular import
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (authClearer) authClearer();
                showToast('Session expired - please log in again', 'error');
                throw new Error('Unauthorized');
            } else if (res.status === 404) {
                throw new Error(data.error || 'Not found');
            } else if (res.status === 403) {
                throw new Error(data.error || 'Access denied');
            } else if (res.status === 409) {
                throw new Error(data.error || 'Already exists');
            } else if (res.status === 500) {
                throw new Error(data.error || 'Server error');
            } else if (res.status === 503) {
                throw new Error(data.error || 'Service unavailable');
            } else {
                throw new Error(data.error || `Request failed (${res.status})`);
            }
        }
        
        return await res.json();
        
    } catch (err) {
        // Handle network errors and timeouts
        if (err.name === 'AbortError') {
            throw new Error('Request timed out');
        } else if (err.message === 'Failed to fetch') {
            // Network error - retry if applicable
            if (retryCount < (API.MAX_RETRIES || 2)) {
                console.log(`Network error, retrying (attempt ${retryCount + 1})...`);
                await new Promise(resolve => setTimeout(resolve, API.RETRY_DELAY_MS || 1000));
                return apiCall(endpoint, options, retryCount + 1);
            }
            throw new Error('Network error - check your connection');
        }
        
        // Re-throw other errors
        throw err;
    }
}

/**
 * Login user
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function login(username, password) {
    try {
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        // Save to localStorage (Bug #4 fix)
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Update state via callback
        if (stateUpdater) {
            stateUpdater({ 
                token: data.token, 
                user: data.user, 
                isAuthenticated: true, 
                view: 'library'
            });
        }
        
        // Load quizzes
        await loadQuizzes();
        
        showToast(`Welcome back, ${data.user.username}!`, 'success');
        
        // Return proper object (Bug #3 fix)
        return { success: true, user: data.user };
        
    } catch (err) {
        showToast(err.message || 'Login failed', 'error');
        return { success: false, error: err.message || 'Login failed' };
    }
}

/**
 * Register new user
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function register(username, password, email = null) {
    try {
        const data = await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ 
                username, 
                password, 
                email: email || `${username}@quiz.local` 
            })
        });
        
        // Save to localStorage (Bug #4 fix)
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Update state via callback
        if (stateUpdater) {
            stateUpdater({ 
                token: data.token, 
                user: data.user, 
                isAuthenticated: true, 
                view: 'library'
            });
        }
        
        // Load quizzes
        await loadQuizzes();
        
        showToast('Account created successfully!', 'success');
        
        // Return proper object (Bug #3 fix)
        return { success: true, user: data.user };
        
    } catch (err) {
        showToast(err.message || 'Registration failed', 'error');
        return { success: false, error: err.message || 'Registration failed' };
    }
}

/**
 * Logout user
 */
export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (authClearer) authClearer();
    showToast('Logged out successfully', 'info');
}

/**
 * Load all user's quizzes
 */
export async function loadQuizzes() {
    try {
        const data = await apiCall('/quizzes');
        const quizzes = data.quizzes || data || [];
        if (stateUpdater) stateUpdater({ quizzes });
        return quizzes;
    } catch (err) {
        console.error('Failed to load quizzes:', err);
        if (stateUpdater) stateUpdater({ quizzes: [] });
        return [];
    }
}

/**
 * Get single quiz by ID
 */
export async function getQuiz(id) {
    const data = await apiCall(`/quizzes/${id}`);
    return data.quiz || data;
}

/**
 * Create new quiz
 */
export async function createQuiz(payload) {
    try {
        const data = await apiCall('/quizzes', { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        await loadQuizzes();
        showToast('Quiz created successfully!', 'success');
        return { success: true, quizId: data.quiz_id };
    } catch (err) {
        showToast(err.message || 'Failed to create quiz', 'error');
        return { success: false, error: err.message };
    }
}

/**
 * Update existing quiz
 */
export async function updateQuiz(id, payload) {
    try {
        await apiCall(`/quizzes/${id}`, { 
            method: 'PUT', 
            body: JSON.stringify(payload) 
        });
        await loadQuizzes();
        showToast('Quiz updated successfully!', 'success');
        return { success: true };
    } catch (err) {
        showToast(err.message || 'Failed to update quiz', 'error');
        return { success: false, error: err.message };
    }
}

/**
 * Delete quiz
 */
export async function deleteQuiz(id) {
    try {
        await apiCall(`/quizzes/${id}`, { method: 'DELETE' });
        await loadQuizzes();
        showToast('Quiz deleted', 'success');
        return { success: true };
    } catch (err) {
        showToast(err.message || 'Failed to delete quiz', 'error');
        return { success: false, error: err.message };
    }
}

/**
 * Save quiz attempt
 */
export async function saveAttempt(quizId, data) {
    try {
        await apiCall(`/quizzes/${quizId}/attempts`, { 
            method: 'POST', 
            body: JSON.stringify(data) 
        });
        return true;
    } catch (err) {
        console.error('Failed to save attempt:', err);
        // Don't show error to user - this is non-critical
        return false;
    }
}

// ==================== Profile & Progress API (for state.js) ====================

/**
 * Load user profile from server
 */
export async function loadProfile() {
    return await apiCall('/profile');
}

/**
 * Save user profile to server
 */
export async function saveProfileToServer(profileData) {
    return await apiCall('/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
    });
}

/**
 * Get quiz progress from server
 */
export async function getQuizProgress(quizId) {
    return await apiCall(`/progress/${quizId}`);
}

/**
 * Save quiz progress to server
 */
export async function saveQuizProgressToServer(quizId, progressData) {
    return await apiCall(`/progress/${quizId}`, {
        method: 'PUT',
        body: JSON.stringify(progressData)
    });
}

/**
 * Clear quiz progress on server
 */
export async function clearQuizProgressOnServer(quizId) {
    return await apiCall(`/progress/${quizId}`, { method: 'DELETE' });
}

/**
 * Get all in-progress quizzes
 */
export async function getAllProgress() {
    return await apiCall('/progress');
}

/**
 * Health check for connection status
 */
export async function checkConnection() {
    try {
        await apiCall('/health', { method: 'GET' });
        return true;
    } catch {
        return false;
    }
}