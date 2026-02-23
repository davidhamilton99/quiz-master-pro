/* Library Component - v3.0 Quizlet-Inspired Redesign */
import { getState, setState, getInProgressQuizzesCached, getProfile, getLevelInfo } from '../state.js';
import { logout, deleteQuiz } from '../services/api.js';
import { escapeHtml, formatDate } from '../utils/dom.js';
import { icon } from '../utils/icons.js';

// View mode
let viewMode = 'grid'; // 'grid' or 'list'
let showStudyModal = null; // quiz ID when modal is open

export function renderLibrary() {
    const state = getState();
    const quizzes = getFilteredQuizzes(state);
    const categories = [...new Set((state.quizzes || []).filter(q => q.description).map(q => q.description))].sort();
    const total = (state.quizzes || []).reduce((s, q) => s + (q.questions?.length || 0), 0);
    const progressList = getInProgressQuizzesCached();
    const profile = getProfile();
    const levelInfo = getLevelInfo();
    
    // Get in-progress quizzes for "Continue Studying" section
    const inProgressQuizzes = progressList
        .map(p => {
            const quiz = (state.quizzes || []).find(q => q.id === p.quizId);
            return quiz ? { ...quiz, progress: p } : null;
        })
        .filter(Boolean)
        .slice(0, 3);
    
    // Get recent quizzes (excluding in-progress)
    const inProgressIds = new Set(progressList.map(p => p.quizId));
    const recentQuizzes = (state.quizzes || [])
        .filter(q => !inProgressIds.has(q.id))
        .slice(0, 6);

    return `
    <!-- Redesigned Header -->
    <header class="library-header-v3">
        <div class="container">
            <div class="header-top">
                <div class="brand">
                    <div class="brand-logo">${icon('graduationCap', 'icon-lg')}</div>
                    <span class="brand-name">Quiz Master Pro</span>
                </div>

                <nav class="header-nav">
                    <button class="nav-link active" onclick="window.app.navigate('library')">
                        <span class="nav-icon">${icon('library')}</span>
                        <span class="nav-text">Library</span>
                    </button>
                    <button class="nav-link" onclick="window.app.loadDashboard()">
                        <span class="nav-icon">${icon('barChart')}</span>
                        <span class="nav-text">Dashboard</span>
                    </button>
                    <button class="nav-link" onclick="window.app.navigate('studyGuide')">
                        <span class="nav-icon">${icon('bookOpen')}</span>
                        <span class="nav-text">Study Guide</span>
                    </button>
                </nav>

                <div class="header-actions">
                    <button class="btn btn-primary" onclick="window.app.showCreateOptions()">
                        ${icon('plus')}
                        Create
                    </button>
                    <div class="user-menu">
                        <button class="user-avatar" onclick="window.app.toggleMenu()">
                            <span class="avatar-initial">${state.user?.username?.charAt(0).toUpperCase() || 'U'}</span>
                            <span class="avatar-chevron">▾</span>
                        </button>
                        <div id="user-menu" class="dropdown-menu hidden">
                            <div class="dropdown-header">
                                <div class="dropdown-user-name">${escapeHtml(state.user?.username || 'User')}</div>
                                <div class="dropdown-user-level">Level ${levelInfo.level || 1}</div>
                            </div>
                            <div class="dropdown-divider"></div>
                            <button class="dropdown-item" onclick="window.app.showImportModal()">
                                ${icon('download')} Import Quiz
                            </button>
                            <div class="dropdown-divider"></div>
                            <button class="dropdown-item text-danger" onclick="window.app.logout()">
                                ${icon('logOut')} Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </header>
    
    <!-- Stats Banner -->
    <div class="stats-banner">
        <div class="container">
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${profile.dailyStreak || 0}</div>
                    <div class="stat-label">Day Streak</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${state.quizzes.length}</div>
                    <div class="stat-label">Quiz Sets</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${total.toLocaleString()}</div>
                    <div class="stat-label">Questions</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${levelInfo.level || 1}</div>
                    <div class="stat-label">Level</div>
                </div>
            </div>
        </div>
    </div>
    
    <main class="library-main">
        <div class="container">
            ${state.quizzes.length === 0 ? renderEmptyState() : `
                
                <!-- Continue Studying Section -->
                ${inProgressQuizzes.length > 0 ? `
                <section class="library-section">
                    <div class="section-header">
                        <h2>${icon('bookOpen')} Continue Studying</h2>
                        <span class="section-badge">${inProgressQuizzes.length} in progress</span>
                    </div>
                    <div class="continue-cards">
                        ${inProgressQuizzes.map(quiz => renderContinueCard(quiz)).join('')}
                    </div>
                </section>
                ` : ''}
                
                <!-- Search and Filters -->
                <section class="library-section">
                    <div class="section-header">
                        <h2>${icon('folder')} My Library</h2>
                        <div class="view-toggles">
                            <button class="view-toggle ${viewMode === 'grid' ? 'active' : ''}" onclick="window.app.setViewMode('grid')" title="Grid view">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                    <rect x="1" y="1" width="6" height="6" rx="1"/>
                                    <rect x="9" y="1" width="6" height="6" rx="1"/>
                                    <rect x="1" y="9" width="6" height="6" rx="1"/>
                                    <rect x="9" y="9" width="6" height="6" rx="1"/>
                                </svg>
                            </button>
                            <button class="view-toggle ${viewMode === 'list' ? 'active' : ''}" onclick="window.app.setViewMode('list')" title="List view">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                    <rect x="1" y="2" width="14" height="3" rx="1"/>
                                    <rect x="1" y="7" width="14" height="3" rx="1"/>
                                    <rect x="1" y="12" width="14" height="3" rx="1"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div class="filters-bar">
                        <div class="search-wrapper">
                            <span class="search-icon">${icon('search')}</span>
                            <input 
                                type="text" 
                                class="search-input" 
                                id="library-search"
                                placeholder="Search your quizzes..."
                                value="${escapeHtml(state.searchQuery || '')}"
                                oninput="window.app.handleSearchInput(this.value)"
                                onkeydown="if(event.key==='Enter') window.app.setSearchImmediate(this.value)"
                            >
                            ${state.searchQuery ? `
                                <button class="search-clear" onclick="window.app.clearSearch()">×</button>
                            ` : ''}
                        </div>
                        
                        <div class="filter-group">
                            <select class="filter-select" onchange="window.app.setSort(this.value)">
                                <option value="recent" ${(state.sortBy || 'recent') === 'recent' ? 'selected' : ''}>Recent</option>
                                <option value="name" ${state.sortBy === 'name' ? 'selected' : ''}>Name A-Z</option>
                                <option value="questions" ${state.sortBy === 'questions' ? 'selected' : ''}>Most Questions</option>
                            </select>
                            
                            <select class="filter-select" onchange="window.app.setCategory(this.value)">
                                <option value="" ${!state.categoryFilter ? 'selected' : ''}>All Categories</option>
                                ${categories.map(cat => `
                                    <option value="${escapeHtml(cat)}" ${state.categoryFilter === cat ? 'selected' : ''}>
                                        ${escapeHtml(cat)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    
                    ${quizzes.length === 0 ? `
                        <div class="no-results">
                            <div class="no-results-icon">${icon('search', 'icon-2xl')}</div>
                            <p>No quizzes match your search</p>
                            <button class="btn btn-ghost" onclick="window.app.clearFilters()">Clear filters</button>
                        </div>
                    ` : `
                        <div class="quiz-${viewMode}">
                            ${quizzes.map(quiz => viewMode === 'grid' ? renderQuizCard(quiz, progressList) : renderQuizRow(quiz, progressList)).join('')}
                        </div>
                    `}
                </section>
            `}
        </div>
    </main>
    
    <!-- Study Mode Modal -->
    ${showStudyModal ? renderStudyModal(state.quizzes.find(q => q.id === showStudyModal)) : ''}
    `;
}

function renderEmptyState() {
    return `
    <div class="empty-state">
        <div class="empty-illustration">
            <div class="empty-icon">${icon('library', 'icon-3xl')}</div>
            <div class="empty-sparkles">${icon('sparkles', 'icon-xl')}</div>
        </div>
        <h2>Create your first quiz</h2>
        <p>Turn your notes into interactive quizzes with AI assistance</p>
        
        <div class="empty-steps">
            <div class="empty-step">
                <div class="step-num">1</div>
                <div class="step-text">
                    <strong>Enter your topic</strong>
                    <span>Tell us what you're studying</span>
                </div>
            </div>
            <div class="empty-step">
                <div class="step-num">2</div>
                <div class="step-text">
                    <strong>Get AI-generated questions</strong>
                    <span>We'll create the perfect prompt for ChatGPT</span>
                </div>
            </div>
            <div class="empty-step">
                <div class="step-num">3</div>
                <div class="step-text">
                    <strong>Study smarter</strong>
                    <span>Flashcards, quizzes, and more</span>
                </div>
            </div>
        </div>
        
        <button class="btn btn-primary btn-lg" onclick="window.app.showCreateOptions()">
            ${icon('sparkles')}
            Create Your First Quiz
        </button>
        
        <p class="empty-alt">
            Or <button class="btn-link" onclick="window.app.showImportModal()">import an existing quiz</button>
        </p>
    </div>
    `;
}

function renderContinueCard(quiz) {
    const progress = quiz.progress;
    const total = quiz.questions?.length || 0;
    const answered = progress.answeredCount || 0;
    const percent = total > 0 ? Math.round((progress.questionIndex / total) * 100) : 0;
    
    return `
    <div class="continue-card" onclick="window.app.startQuiz(${quiz.id})">
        <div class="continue-progress-ring">
            <svg viewBox="0 0 36 36">
                <path class="progress-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                <path class="progress-fill" stroke-dasharray="${percent}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            </svg>
            <div class="progress-text">${percent}%</div>
        </div>
        <div class="continue-info">
            <div class="continue-title">${escapeHtml(quiz.title)}</div>
            <div class="continue-meta">
                Question ${progress.questionIndex + 1} of ${total}
            </div>
        </div>
        <button class="btn btn-primary btn-sm continue-btn">
            Continue →
        </button>
    </div>
    `;
}

function renderQuizCard(quiz, progressList) {
    const progress = progressList.find(p => p.quizId === quiz.id);
    const count = quiz.questions?.length || 0;
    const mastery = quiz.mastery || 0;
    
    return `
    <div class="quiz-card-v3" onclick="window.app.openStudyModal(${quiz.id})">
        <div class="quiz-card-accent" style="background: ${quiz.color || getStableGradient(quiz.id)}"></div>
        
        <div class="quiz-card-body">
            <div class="quiz-card-header">
                <h3 class="quiz-card-title">${escapeHtml(quiz.title)}</h3>
                <button class="quiz-card-menu" onclick="event.stopPropagation(); window.app.toggleCardMenu(${quiz.id})">
                    ⋮
                </button>
                <div id="card-menu-${quiz.id}" class="card-menu hidden">
                    <button onclick="event.stopPropagation(); window.app.editQuiz(${quiz.id})">${icon('edit')} Edit</button>
                    <button onclick="event.stopPropagation(); window.app.showExportModal(${quiz.id})">${icon('share')} Export</button>
                    <button class="text-danger" onclick="event.stopPropagation(); window.app.confirmDelete(${quiz.id})">${icon('trash')} Delete</button>
                </div>
            </div>
            
            ${quiz.description ? `<span class="quiz-card-category">${escapeHtml(quiz.description)}</span>` : ''}
            
            <div class="quiz-card-stats">
                <span class="quiz-stat">
                    ${icon('layers')} ${count} terms
                </span>
                ${progress ? `
                    <span class="quiz-stat in-progress">
                        ${icon('clock')} ${Math.round((progress.questionIndex / count) * 100)}% done
                    </span>
                ` : ''}
            </div>
        </div>
        
        <div class="quiz-card-footer">
            <div class="study-modes">
                <button class="study-mode-btn" onclick="event.stopPropagation(); window.app.startFlashcards(${quiz.id})" title="Flashcards">
                    ${icon('layers')}
                </button>
                <button class="study-mode-btn" onclick="event.stopPropagation(); window.app.startQuiz(${quiz.id}, {studyMode: true})" title="Learn">
                    ${icon('bookOpen')}
                </button>
                <button class="study-mode-btn" onclick="event.stopPropagation(); window.app.startQuiz(${quiz.id}, {studyMode: false})" title="Test">
                    ${icon('penLine')}
                </button>
            </div>
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window.app.openStudyModal(${quiz.id})">
                Study
            </button>
        </div>
    </div>
    `;
}

function renderQuizRow(quiz, progressList) {
    const progress = progressList.find(p => p.quizId === quiz.id);
    const count = quiz.questions?.length || 0;
    
    return `
    <div class="quiz-row" onclick="window.app.openStudyModal(${quiz.id})">
        <div class="quiz-row-color" style="background: ${quiz.color || '#6366f1'}"></div>
        <div class="quiz-row-info">
            <div class="quiz-row-title">${escapeHtml(quiz.title)}</div>
            <div class="quiz-row-meta">
                ${quiz.description ? `<span class="badge">${escapeHtml(quiz.description)}</span>` : ''}
                <span>${count} terms</span>
                <span>•</span>
                <span>${formatDate(quiz.last_modified || quiz.created_at)}</span>
            </div>
        </div>
        <div class="quiz-row-actions">
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); window.app.startFlashcards(${quiz.id})">${icon('layers')}</button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); window.app.editQuiz(${quiz.id})">${icon('edit')}</button>
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window.app.openStudyModal(${quiz.id})">Study</button>
        </div>
    </div>
    `;
}

function renderStudyModal(quiz) {
    if (!quiz) return '';
    const count = quiz.questions?.length || 0;
    
    return `
    <div class="modal-overlay" onclick="window.app.closeStudyModal()">
        <div class="study-modal" onclick="event.stopPropagation()">
            <button class="modal-close" onclick="window.app.closeStudyModal()">×</button>
            
            <div class="study-modal-header">
                <h2>${escapeHtml(quiz.title)}</h2>
                <p>${count} terms ${quiz.description ? `• ${escapeHtml(quiz.description)}` : ''}</p>
            </div>
            
            <div class="study-modes-grid">
                <button class="study-mode-card" onclick="window.app.startFlashcards(${quiz.id})">
                    <div class="mode-icon">${icon('layers', 'icon-2xl')}</div>
                    <div class="mode-name">Flashcards</div>
                    <div class="mode-desc">Review terms one by one</div>
                </button>

                <button class="study-mode-card" onclick="window.app.startQuiz(${quiz.id}, {studyMode: true})">
                    <div class="mode-icon">${icon('bookOpen', 'icon-2xl')}</div>
                    <div class="mode-name">Learn</div>
                    <div class="mode-desc">Study with instant feedback</div>
                </button>

                <button class="study-mode-card" onclick="window.app.startQuiz(${quiz.id}, {studyMode: false})">
                    <div class="mode-icon">${icon('penLine', 'icon-2xl')}</div>
                    <div class="mode-name">Test</div>
                    <div class="mode-desc">Challenge yourself</div>
                </button>

                <button class="study-mode-card" onclick="window.app.startQuiz(${quiz.id}, {studyMode: false, timed: true, minutes: 10})">
                    <div class="mode-icon">${icon('clock', 'icon-2xl')}</div>
                    <div class="mode-name">Timed Test</div>
                    <div class="mode-desc">Race against the clock</div>
                </button>
            </div>

            <div class="study-modal-footer">
                <button class="btn btn-ghost" onclick="window.app.editQuiz(${quiz.id})">
                    ${icon('edit')} Edit Quiz
                </button>
                <button class="btn btn-ghost" onclick="window.app.showExportModal(${quiz.id})">
                    ${icon('share')} Export
                </button>
            </div>
        </div>
    </div>
    `;
}

function getStableGradient(quizId) {
    const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    ];
    return gradients[(quizId || 0) % gradients.length];
}

function getFilteredQuizzes(state) {
    // If state not passed, get it
    if (!state) {
        state = getState();
    }
    
    const quizzes = state.quizzes;
    
    // Make sure quizzes is an array
    if (!quizzes || !Array.isArray(quizzes)) {
        return [];
    }
    
    let q = quizzes.slice(); // Copy array
    
    // Only filter if there's an actual search query
    const searchQuery = (state.searchQuery || '').trim().toLowerCase();
    if (searchQuery && searchQuery.length > 0) {
        q = q.filter(x => {
            const title = (x.title || '').toLowerCase();
            const desc = (x.description || '').toLowerCase();
            return title.includes(searchQuery) || desc.includes(searchQuery);
        });
    }
    
    // Only filter by category if one is EXPLICITLY selected (non-empty string)
    const categoryFilter = state.categoryFilter;
    if (categoryFilter && typeof categoryFilter === 'string' && categoryFilter.trim() !== '') {
        q = q.filter(x => (x.description || '') === categoryFilter.trim());
    }
    
    // Sort
    const sortBy = state.sortBy || 'recent';
    switch (sortBy) {
        case 'name':
            q.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            break;
        case 'questions':
            q.sort((a, b) => (b.questions?.length || 0) - (a.questions?.length || 0));
            break;
        case 'recent':
        default:
            q.sort((a, b) => {
                const dateA = new Date(a.last_modified || a.created_at || 0);
                const dateB = new Date(b.last_modified || b.created_at || 0);
                return dateB - dateA;
            });
    }
    
    return q;
}

// Local search state (to avoid re-renders while typing)
let localSearchQuery = '';
let searchDebounceTimer = null;

// Actions
export function setSearch(query) {
    localSearchQuery = query;
    
    // Debounce the actual state update
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        setState({ searchQuery: query });
    }, 300);
}

export function setSearchImmediate(query) {
    localSearchQuery = query;
    clearTimeout(searchDebounceTimer);
    setState({ searchQuery: query });
}

export function handleSearchInput(query) {
    localSearchQuery = query;
    
    // Debounce: wait for user to stop typing
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        // Save cursor position
        const input = document.getElementById('library-search');
        const cursorPos = input?.selectionStart;
        
        setState({ searchQuery: query });
        
        // Restore focus and cursor after re-render
        setTimeout(() => {
            const newInput = document.getElementById('library-search');
            if (newInput) {
                newInput.focus();
                if (cursorPos !== undefined) {
                    newInput.setSelectionRange(cursorPos, cursorPos);
                }
            }
        }, 0);
    }, 400);
}

export function clearSearch() {
    localSearchQuery = '';
    clearTimeout(searchDebounceTimer);
    setState({ searchQuery: '' });
}

export function setSort(sortBy) {
    setState({ sortBy });
}

export function setCategory(category) {
    setState({ categoryFilter: category });
}

export function clearFilters() {
    setState({ searchQuery: '', categoryFilter: '', sortBy: 'recent' });
}

export function toggleMenu() {
    const menu = document.getElementById('user-menu');
    if (menu) menu.classList.toggle('hidden');
}

export function setViewMode(mode) {
    viewMode = mode;
    setState({ view: 'library' });
}

export function openStudyModal(quizId) {
    showStudyModal = quizId;
    setState({ view: 'library' });
}

export function closeStudyModal() {
    showStudyModal = null;
    setState({ view: 'library' });
}

export function toggleCardMenu(quizId) {
    // Close all other menus first
    document.querySelectorAll('.card-menu').forEach(m => m.classList.add('hidden'));
    const menu = document.getElementById(`card-menu-${quizId}`);
    if (menu) menu.classList.toggle('hidden');
}

export async function confirmDelete(quizId) {
    const state = getState();
    const quiz = state.quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Delete Quiz</h2>
                <button class="btn btn-ghost btn-icon" onclick="this.closest('.modal-overlay').remove()">${icon('x')}</button>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to delete <strong>${escapeHtml(quiz.title)}</strong>? This cannot be undone.</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-primary danger" id="confirm-delete-btn">${icon('trash')} Delete</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#confirm-delete-btn').addEventListener('click', async () => {
        overlay.remove();
        await deleteQuiz(quizId);
    });
}

// Close menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        const menu = document.getElementById('user-menu');
        if (menu) menu.classList.add('hidden');
    }
    if (!e.target.closest('.quiz-card-menu') && !e.target.closest('.card-menu')) {
        document.querySelectorAll('.card-menu').forEach(m => m.classList.add('hidden'));
    }
});