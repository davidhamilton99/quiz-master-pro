/* Library Component - IMPROVED with Debounced Search */
import { getState, setState, getAllInProgressQuizzes } from '../state.js';
import { logout, deleteQuiz } from '../services/api.js';
import { showExportModal, showImportModal } from '../services/export.js';
import { escapeHtml, formatDate } from '../utils/dom.js';
import { TIME } from '../utils/constants.js';

// Debounce timer for search
let searchTimeout = null;

export function renderLibrary() {
    const state = getState();
    const quizzes = getFilteredQuizzes();
    const categories = [...new Set(state.quizzes.filter(q => q.description).map(q => q.description))].sort();
    const total = state.quizzes.reduce((s, q) => s + (q.questions?.length || 0), 0);
    const progressList = getAllInProgressQuizzes();

    return `<nav class="navbar"><div class="container"><div class="navbar-inner">
        <div class="navbar-brand"><div class="navbar-logo">Q</div><span class="hide-mobile">Quiz Master Pro</span></div>
        <div class="flex items-center gap-2">
            <button class="btn btn-ghost btn-sm" onclick="window.app.showImportModal()" title="Import">📥</button>
            <button class="btn btn-primary" onclick="window.app.navigate('create')">+ New</button>
            <div class="dropdown"><button class="btn btn-icon btn-ghost" onclick="window.app.toggleMenu()">👤</button>
                <div id="user-menu" class="dropdown-menu hidden">
                    <div style="padding:0.75rem 1rem;border-bottom:1px solid var(--border)"><div class="font-medium">${escapeHtml(state.user?.username)}</div></div>
                    <button class="dropdown-item" onclick="window.app.logout()">🚪 Sign Out</button>
                </div>
            </div>
        </div>
    </div></div></nav>
    <main class="container" style="padding-bottom:3rem">
        <div class="library-header"><div><h1>My Quizzes</h1><p class="text-muted text-sm">${state.quizzes.length} quizzes · ${total} questions</p></div></div>
        <div class="library-toolbar">
            <div class="search-box">
                <span class="search-icon">🔍</span>
                <input type="text" 
                    class="input" 
                    placeholder="Search..." 
                    value="${escapeHtml(state.searchQuery)}" 
                    oninput="window.app.setSearch(this.value)"
                    id="search-input">
            </div>
            <select class="input" style="width:auto" onchange="window.app.setSort(this.value)">
                <option value="recent" ${state.sortBy === 'recent' ? 'selected' : ''}>Recent</option>
                <option value="alpha" ${state.sortBy === 'alpha' ? 'selected' : ''}>A-Z</option>
                <option value="questions" ${state.sortBy === 'questions' ? 'selected' : ''}>Most Questions</option>
            </select>
            ${categories.length ? `<select class="input" style="width:auto" onchange="window.app.setCategory(this.value)">
                <option value="all">All Categories</option>
                ${categories.map(c => `<option value="${escapeHtml(c)}" ${state.categoryFilter === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            </select>` : ''}
        </div>
        ${quizzes.length === 0 ? renderEmptyState(state) : `<div class="quiz-grid">${quizzes.map(q => renderCard(q, progressList)).join('')}</div>`}
    </main>`;
}

function renderEmptyState(state) {
    const hasSearch = state.searchQuery || state.categoryFilter !== 'all';
    
    if (hasSearch) {
        return `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>No quizzes found</h3>
                <p class="text-muted">Try adjusting your search or filters</p>
                <button class="btn btn-secondary mt-4" onclick="window.app.clearFilters()">Clear Filters</button>
            </div>
        `;
    }
    
    return `
        <div class="empty-state">
            <div class="empty-icon">📚</div>
            <h3>No quizzes yet</h3>
            <p class="text-muted">Create your first quiz to get started</p>
            <div class="flex gap-2 justify-center mt-4">
                <button class="btn btn-primary" onclick="window.app.navigate('create')">+ Create Quiz</button>
                <button class="btn btn-secondary" onclick="window.app.showImportModal()">📥 Import Quiz</button>
            </div>
        </div>
    `;
}

function renderCard(quiz, progressList) {
    const progress = progressList.find(p => p.quizId === quiz.id);
    const count = quiz.questions?.length || 0;
    return `<div class="card card-hover quiz-card" onclick="window.app.showQuizOptions(${quiz.id})">
        <div class="quiz-card-accent" style="background:${quiz.color || '#6366f1'}"></div>
        <div class="quiz-card-content">
            <div class="quiz-card-title">${escapeHtml(quiz.title)}</div>
            ${quiz.description ? `<span class="badge">${escapeHtml(quiz.description)}</span>` : ''}
            <div class="quiz-card-meta"><span>📝 ${count}</span><span>📅 ${formatDate(quiz.last_modified || quiz.created_at)}</span></div>
            ${progress ? `<div class="in-progress-badge mt-2">⏸ Q${progress.questionIndex + 1}/${progress.total}</div>` : ''}
            <div class="quiz-card-footer">
                <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();window.app.showQuizOptions(${quiz.id})">${progress ? 'Resume' : 'Start'}</button>
                <div class="quiz-card-actions">
                    <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();window.app.showExportModal(${quiz.id})" title="Export">📤</button>
                    <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();window.app.editQuiz(${quiz.id})" title="Edit">✏️</button>
                    <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();window.app.confirmDelete(${quiz.id})" title="Delete">🗑️</button>
                </div>
            </div>
        </div>
    </div>`;
}

function getFilteredQuizzes() {
    const state = getState();
    let q = [...state.quizzes];
    
    // Apply search filter
    if (state.searchQuery) {
        const s = state.searchQuery.toLowerCase();
        q = q.filter(x => 
            x.title.toLowerCase().includes(s) || 
            (x.description && x.description.toLowerCase().includes(s))
        );
    }
    
    // Apply category filter
    if (state.categoryFilter !== 'all') {
        q = q.filter(x => x.description === state.categoryFilter);
    }
    
    // Apply sorting
    if (state.sortBy === 'alpha') {
        q.sort((a, b) => a.title.localeCompare(b.title));
    } else if (state.sortBy === 'questions') {
        q.sort((a, b) => (b.questions?.length || 0) - (a.questions?.length || 0));
    } else {
        // Default: recent
        q.sort((a, b) => new Date(b.last_modified || b.created_at) - new Date(a.last_modified || a.created_at));
    }
    
    return q;
}

// IMPROVED: Debounced search
export function setSearch(query) {
    // Clear previous timeout
    clearTimeout(searchTimeout);
    
    // Update input value immediately for responsiveness
    const input = document.getElementById('search-input');
    if (input) input.value = query;
    
    // Set new timeout - only update state after user stops typing
    searchTimeout = setTimeout(() => {
        setState({ searchQuery: query });
    }, TIME.SEARCH_DEBOUNCE_MS);
}

export function setSort(s) { 
    setState({ sortBy: s }); 
}

export function setCategory(c) { 
    setState({ categoryFilter: c }); 
}

export function clearFilters() {
    setState({ searchQuery: '', categoryFilter: 'all' });
    const input = document.getElementById('search-input');
    if (input) input.value = '';
}

export function toggleMenu() { 
    document.getElementById('user-menu')?.classList.toggle('hidden'); 
}

export async function confirmDelete(id) { 
    const state = getState();
    const quiz = state.quizzes.find(q => q.id === id);
    const title = quiz ? quiz.title : 'this quiz';
    
    if (confirm(`Delete "${title}"? This cannot be undone.`)) {
        const success = await deleteQuiz(id);
        if (!success) {
            // Error already shown by API
            console.error('Delete failed');
        }
    }
}

export { showExportModal, showImportModal };