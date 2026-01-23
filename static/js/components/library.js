/* ============================================
   QUIZ MASTER PRO - Library View
   Quiz list with filtering and sorting
   ============================================ */

import { getState, setState, loadFolders, saveFolders } from '../state.js';
import { logout, deleteQuiz as apiDeleteQuiz } from '../services/api.js';
import { escapeHtml, formatDate, showConfirmDialog } from '../utils/dom.js';
import { showToast } from '../utils/toast.js';

export function renderLibrary() {
    const state = getState();
    const quizzes = getFilteredQuizzes();
    const categories = getCategories();
    
    return `
        <nav class="navbar">
            <div class="container">
                <div class="navbar-inner">
                    <a href="#" class="navbar-brand" onclick="window.app.navigate('library')">
                        <div class="navbar-logo">Q</div>
                        <span class="hide-mobile">Quiz Master Pro</span>
                    </a>
                    
                    <div class="flex items-center gap-3">
                        <button class="btn btn-primary" onclick="window.app.navigate('create')">
                            + New Quiz
                        </button>
                        
                        <div class="dropdown">
                            <button class="btn btn-icon btn-ghost" onclick="window.app.toggleUserMenu()">
                                <span style="font-size: 1.25rem">👤</span>
                            </button>
                            <div id="user-menu" class="dropdown-menu hidden">
                                <div style="padding: var(--space-3); border-bottom: 1px solid var(--border)">
                                    <p class="font-medium">${escapeHtml(state.user?.username)}</p>
                                    <p class="text-sm text-muted">${state.quizzes.length} quizzes</p>
                                </div>
                                <button class="dropdown-item" onclick="window.app.logout()">
                                    🚪 Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
        
        <main class="container" style="padding-top: var(--space-6); padding-bottom: var(--space-8)">
            <div class="library-header">
                <div class="library-title">
                    <h1>My Quizzes</h1>
                    <p class="text-muted">${state.quizzes.length} quiz${state.quizzes.length !== 1 ? 'zes' : ''}</p>
                </div>
            </div>
            
            <div class="library-filters">
                <input 
                    type="text" 
                    class="input search-input" 
                    placeholder="🔍 Search quizzes..."
                    value="${escapeHtml(state.searchQuery)}"
                    oninput="window.app.setSearchQuery(this.value)"
                >
                
                <select class="input" style="width: auto" onchange="window.app.setSortBy(this.value)">
                    <option value="recent" ${state.sortBy === 'recent' ? 'selected' : ''}>Recent</option>
                    <option value="alpha" ${state.sortBy === 'alpha' ? 'selected' : ''}>A-Z</option>
                    <option value="questions" ${state.sortBy === 'questions' ? 'selected' : ''}>Questions</option>
                </select>
                
                ${categories.length > 1 ? `
                    <select class="input" style="width: auto" onchange="window.app.setCategoryFilter(this.value)">
                        <option value="all">All Categories</option>
                        ${categories.map(cat => `
                            <option value="${escapeHtml(cat)}" ${state.categoryFilter === cat ? 'selected' : ''}>
                                ${escapeHtml(cat)}
                            </option>
                        `).join('')}
                    </select>
                ` : ''}
            </div>
            
            ${quizzes.length === 0 ? renderEmptyState() : `
                <div class="quiz-grid">
                    ${quizzes.map(quiz => renderQuizCard(quiz)).join('')}
                </div>
            `}
        </main>
    `;
}

function renderQuizCard(quiz) {
    const questionCount = quiz.questions?.length || 0;
    const color = quiz.color || '#FF6B35';
    
    return `
        <div class="card card-hover quiz-card" onclick="window.app.showQuizOptions(${quiz.id})">
            <div class="quiz-card-color" style="background: ${color}"></div>
            
            <div class="quiz-card-header">
                <div>
                    <h3 class="quiz-card-title">${escapeHtml(quiz.title)}</h3>
                    ${quiz.description ? `<span class="badge">${escapeHtml(quiz.description)}</span>` : ''}
                </div>
            </div>
            
            <div class="quiz-card-meta">
                <span>📝 ${questionCount} question${questionCount !== 1 ? 's' : ''}</span>
                <span>📅 ${formatDate(quiz.last_modified || quiz.created_at)}</span>
            </div>
            
            <div class="quiz-card-footer">
                <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); window.app.showQuizOptions(${quiz.id})">
                    Start
                </button>
                
                <div class="flex gap-2">
                    <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); window.app.editQuiz(${quiz.id})">
                        ✏️
                    </button>
                    <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); window.app.confirmDeleteQuiz(${quiz.id})">
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderEmptyState() {
    const state = getState();
    
    if (state.searchQuery) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <h3>No quizzes found</h3>
                <p>Try a different search term</p>
                <button class="btn btn-secondary" onclick="window.app.setSearchQuery('')">
                    Clear Search
                </button>
            </div>
        `;
    }
    
    return `
        <div class="empty-state">
            <div class="empty-state-icon">📚</div>
            <h3>No quizzes yet</h3>
            <p>Create your first quiz to get started</p>
            <button class="btn btn-primary" onclick="window.app.navigate('create')">
                + Create Quiz
            </button>
        </div>
    `;
}

// Helper functions
function getFilteredQuizzes() {
    const state = getState();
    let quizzes = [...state.quizzes];
    
    // Filter by search
    if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        quizzes = quizzes.filter(q => 
            q.title.toLowerCase().includes(query) ||
            (q.description && q.description.toLowerCase().includes(query))
        );
    }
    
    // Filter by category
    if (state.categoryFilter !== 'all') {
        quizzes = quizzes.filter(q => q.description === state.categoryFilter);
    }
    
    // Sort
    switch (state.sortBy) {
        case 'recent':
            quizzes.sort((a, b) => new Date(b.last_modified || b.created_at) - new Date(a.last_modified || a.created_at));
            break;
        case 'alpha':
            quizzes.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'questions':
            quizzes.sort((a, b) => (b.questions?.length || 0) - (a.questions?.length || 0));
            break;
    }
    
    return quizzes;
}

function getCategories() {
    const state = getState();
    const categories = new Set();
    state.quizzes.forEach(q => {
        if (q.description) categories.add(q.description);
    });
    return Array.from(categories).sort();
}

// Event handlers
export function setSearchQuery(query) {
    setState({ searchQuery: query });
}

export function setSortBy(sortBy) {
    setState({ sortBy });
}

export function setCategoryFilter(filter) {
    setState({ categoryFilter: filter });
}

export function toggleUserMenu() {
    const menu = document.getElementById('user-menu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

export async function confirmDeleteQuiz(id) {
    const confirmed = await showConfirmDialog({
        title: 'Delete Quiz?',
        message: 'This action cannot be undone.',
        confirmText: 'Delete',
        type: 'danger'
    });
    
    if (confirmed) {
        await apiDeleteQuiz(id);
    }
}

export default {
    renderLibrary,
    setSearchQuery,
    setSortBy,
    setCategoryFilter,
    toggleUserMenu,
    confirmDeleteQuiz
};
