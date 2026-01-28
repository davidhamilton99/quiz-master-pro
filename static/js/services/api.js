/* API Service - IMPROVED with Retry Logic and Better Error Handling */

import { getState, setState, saveAuth, clearAuth } from '../state.js';
import { showToast } from '../utils/toast.js';
import { API } from '../utils/constants.js';

const API_URL = 'https://davidhamilton.pythonanywhere.com/api';

export async function apiCall(endpoint, options = {}, retryCount = 0) {
    const state = getState();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API.REQUEST_TIMEOUT_MS);
        
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
                clearAuth();
                showToast('Session expired - please log in again', 'error');
                throw new Error('Unauthorized');
            } else if (res.status === 404) {
                showToast('Resource not found', 'error');
                throw new Error('Not found');
            } else if (res.status === 403) {
                showToast('Access denied', 'error');
                throw new Error('Forbidden');
            } else if (res.status === 500) {
                showToast('Server error - please try again later', 'error');
                throw new Error('Server error');
            } else if (res.status === 503) {
                showToast('Service temporarily unavailable', 'error');
                throw new Error('Service unavailable');
            } else {
                showToast(data.error || `Request failed (${res.status})`, 'error');
                throw new Error(data.error || 'Request failed');
            }
        }
        
        return await res.json();
        
    } catch (err) {
        // Handle network errors and timeouts
        if (err.name === 'AbortError') {
            showToast('Request timed out', 'error');
            throw new Error('Request timeout');
        } else if (err.message === 'Failed to fetch') {
            // Network error - retry if applicable
            if (retryCount < API.MAX_RETRIES) {
                console.log(`Network error, retrying (attempt ${retryCount + 1}/${API.MAX_RETRIES})...`);
                await new Promise(resolve => setTimeout(resolve, API.RETRY_DELAY_MS));
                return apiCall(endpoint, options, retryCount + 1);
            }
            showToast('Network error - check your connection', 'error');
            throw new Error('Network error');
        }
        
        // Re-throw other errors (already showed toast)
        throw err;
    }
}

export async function login(username, password) {
    setState({ loading: true });
    try {
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        setState({ 
            token: data.token, 
            user: data.user, 
            isAuthenticated: true, 
            view: 'library', 
            loading: false 
        });
        saveAuth();
        await loadQuizzes();
        showToast(`Welcome back, ${data.user.username}!`, 'success');
        return true;
    } catch (err) {
        setState({ loading: false });
        // Error toast already shown by apiCall
        return false;
    }
}

export async function register(username, password) {
    setState({ loading: true });
    try {
        const data = await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password, email: `${username}@quiz.local` })
        });
        setState({ 
            token: data.token, 
            user: data.user, 
            isAuthenticated: true, 
            view: 'library', 
            loading: false 
        });
        saveAuth();
        await loadQuizzes();
        showToast('Account created successfully!', 'success');
        return true;
    } catch (err) {
        setState({ loading: false });
        return false;
    }
}

export function logout() {
    clearAuth();
    showToast('Logged out successfully', 'info');
}

export async function loadQuizzes() {
    try {
        const data = await apiCall('/quizzes');
        setState({ quizzes: data.quizzes || data });
        return true;
    } catch (err) {
        console.error('Failed to load quizzes:', err);
        setState({ quizzes: [] });
        return false;
    }
}

export async function getQuiz(id) {
    try {
        const data = await apiCall(`/quizzes/${id}`);
        return data.quiz || data;
    } catch (err) {
        throw new Error(`Failed to load quiz: ${err.message}`);
    }
}

export async function createQuiz(payload) {
    try {
        await apiCall('/quizzes', { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        await loadQuizzes();
        showToast('Quiz created successfully!', 'success');
        return true;
    } catch (err) {
        return false;
    }
}

export async function updateQuiz(id, payload) {
    try {
        await apiCall(`/quizzes/${id}`, { 
            method: 'PUT', 
            body: JSON.stringify(payload) 
        });
        await loadQuizzes();
        showToast('Quiz updated successfully!', 'success');
        return true;
    } catch (err) {
        return false;
    }
}

export async function deleteQuiz(id) {
    try {
        await apiCall(`/quizzes/${id}`, { method: 'DELETE' });
        await loadQuizzes();
        showToast('Quiz deleted', 'success');
        return true;
    } catch (err) {
        return false;
    }
}

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

// Health check for connection status
export async function checkConnection() {
    try {
        await apiCall('/health', { method: 'GET' });
        return true;
    } catch {
        return false;
    }
}