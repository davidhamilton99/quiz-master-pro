/* API Service */

import { getState, setState, saveAuth, clearAuth } from '../state.js';
import { showToast } from '../utils/toast.js';

const API_URL = 'https://davidhamilton.pythonanywhere.com/api';

export async function apiCall(endpoint, options = {}) {
    const state = getState();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
    
    try {
        const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        const data = await res.json();
        
        if (!res.ok) {
            if (res.status === 401) {
                clearAuth();
                throw new Error('Session expired');
            }
            throw new Error(data.error || 'Request failed');
        }
        return data;
    } catch (err) {
        console.error('API:', err);
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
        setState({ token: data.token, user: data.user, isAuthenticated: true, view: 'library', loading: false });
        saveAuth();
        await loadQuizzes();
        showToast(`Welcome, ${data.user.username}!`, 'success');
    } catch (err) {
        setState({ loading: false });
        showToast(err.message || 'Login failed', 'error');
    }
}

export async function register(username, password) {
    setState({ loading: true });
    try {
        const data = await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password, email: `${username}@quiz.local` })
        });
        setState({ token: data.token, user: data.user, isAuthenticated: true, view: 'library', loading: false });
        saveAuth();
        await loadQuizzes();
        showToast('Account created!', 'success');
    } catch (err) {
        setState({ loading: false });
        showToast(err.message || 'Registration failed', 'error');
    }
}

export function logout() {
    clearAuth();
    showToast('Logged out', 'info');
}

export async function loadQuizzes() {
    try {
        const data = await apiCall('/quizzes');
        setState({ quizzes: data.quizzes || data });
    } catch {
        setState({ quizzes: [] });
    }
}

export async function getQuiz(id) {
    const data = await apiCall(`/quizzes/${id}`);
    return data.quiz || data;
}

export async function createQuiz(payload) {
    await apiCall('/quizzes', { method: 'POST', body: JSON.stringify(payload) });
    await loadQuizzes();
    showToast('Quiz created!', 'success');
}

export async function updateQuiz(id, payload) {
    await apiCall(`/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    await loadQuizzes();
    showToast('Quiz updated!', 'success');
}

export async function deleteQuiz(id) {
    await apiCall(`/quizzes/${id}`, { method: 'DELETE' });
    await loadQuizzes();
    showToast('Quiz deleted', 'success');
}

export async function saveAttempt(quizId, data) {
    try {
        await apiCall(`/quizzes/${quizId}/attempts`, { method: 'POST', body: JSON.stringify(data) });
    } catch (err) {
        console.error('Failed to save attempt:', err);
    }
}
