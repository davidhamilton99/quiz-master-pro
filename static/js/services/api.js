/* ============================================
   QUIZ MASTER PRO - API Service
   All backend communication
   ============================================ */

import { getState, setState, saveAuth, clearAuth } from './state.js';
import { showToast } from './utils/toast.js';

const API_URL = 'https://davidhamilton.pythonanywhere.com/api';

// Generic API call
export async function apiCall(endpoint, options = {}) {
    const state = getState();
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }
    
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            // Handle auth errors
            if (response.status === 401) {
                clearAuth();
                throw new Error('Session expired. Please log in again.');
            }
            throw new Error(data.error || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ========== AUTH ==========
export async function login(username, password) {
    try {
        setState({ loading: true });
        
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        console.log('✅ Login successful:', data); // ADD THIS
        
        setState({
            token: data.token,
            user: data.user,
            isAuthenticated: true,
            view: 'library',
            loading: false
        });
        
        console.log('✅ State updated, view should be:', getState().view); // ADD THIS
        
        saveAuth();
        await loadQuizzes();
        showToast(`Welcome back, ${data.user.username}!`, 'success');
        
    } catch (error) {
        setState({ loading: false });
        showToast(error.message || 'Login failed', 'error');
        throw error;
    }
}
export async function register(username, password) {
    try {
        setState({ loading: true });
        
        const data = await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ 
                username, 
                password,
                email: `${username}@quiz.local`
            })
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
        showToast('Account created!', 'success');
        
    } catch (error) {
        setState({ loading: false });
        showToast(error.message || 'Registration failed', 'error');
        throw error;
    }
}

export function logout() {
    clearAuth();
    showToast('Logged out', 'info');
}

// ========== QUIZZES ==========
export async function loadQuizzes() {
    try {
        const data = await apiCall('/quizzes');
        setState({ quizzes: data.quizzes || data });
    } catch (error) {
        console.error('Failed to load quizzes:', error);
        setState({ quizzes: [] });
    }
}

export async function getQuiz(id) {
    const data = await apiCall(`/quizzes/${id}`);
    return data.quiz || data;
}

export async function createQuiz(quizData) {
    const data = await apiCall('/quizzes', {
        method: 'POST',
        body: JSON.stringify(quizData)
    });
    
    await loadQuizzes();
    showToast('Quiz created!', 'success');
    return data;
}

export async function updateQuiz(id, quizData) {
    const data = await apiCall(`/quizzes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(quizData)
    });
    
    await loadQuizzes();
    showToast('Quiz updated!', 'success');
    return data;
}

export async function deleteQuiz(id) {
    await apiCall(`/quizzes/${id}`, { method: 'DELETE' });
    await loadQuizzes();
    showToast('Quiz deleted', 'success');
}

// ========== ATTEMPTS ==========
export async function saveAttempt(quizId, attemptData) {
    try {
        await apiCall(`/quizzes/${quizId}/attempts`, {
            method: 'POST',
            body: JSON.stringify(attemptData)
        });
    } catch (error) {
        console.error('Failed to save attempt:', error);
    }
}

export default {
    apiCall,
    login,
    register,
    logout,
    loadQuizzes,
    getQuiz,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    saveAttempt
};
