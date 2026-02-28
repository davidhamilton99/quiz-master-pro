/* Study Hub (was Library) - v3.0 with My Certs + My Quizzes tabs (Phase 2.2) */
import { getState, setState, getInProgressQuizzesCached, getProfile } from '../state.js';
import { logout, deleteQuiz, updateQuizSettings } from '../services/api.js';
import { escapeHtml, formatDate } from '../utils/dom.js';
import { icon } from '../utils/icons.js';

import { showToast } from '../utils/toast.js';

// View mode
let viewMode = 'grid'; // 'grid' or 'list'
let showStudyModal = null; // quiz ID when modal is open
let studyTab = 'quizzes'; // 'quizzes' | 'certs'

export function setStudyTab(tab) {
    studyTab = tab;
    setState({});
}

export function renderLibrary() {
    const state = getState();
    const quizzes = getFilteredQuizzes(state);
    const categories = [...new Set((state.quizzes || []).filter(q => q.description).map(q => q.description))].sort();
    const total = (state.quizzes || []).reduce((s, q) => s + (q.questions?.length || 0), 0);
    const progressList = getInProgressQuizzesCached();
    const certs = state.userCertifications || [];

    // Get in-progress quizzes for "Continue Studying" section
    const inProgressQuizzes = progressList
        .map(p => {
            const quiz = (state.quizzes || []).find(q => q.id === p.quizId);
            return quiz ? { ...quiz, progress: p } : null;
        })
        .filter(Boolean)
        .slice(0, 3);

    return `
    <!-- Study Hub Tabs -->
    <div class="study-hub-tabs-bar">
        <div class="container">
            <div class="study-hub-tabs">
                <button class="study-hub-tab ${studyTab === 'quizzes' ? 'active' : ''}" onclick="window.app.setStudyTab('quizzes')">
                    ${icon('library')} My Quizzes
                    <span class="tab-badge">${(state.quizzes || []).length}</span>
                </button>
                <button class="study-hub-tab ${studyTab === 'certs' ? 'active' : ''}" onclick="window.app.setStudyTab('certs')">
                    ${icon('barChart')} My Certs
                    <span class="tab-badge">${certs.length}</span>
                </button>
                <button class="study-hub-tab ${studyTab === 'saved' ? 'active' : ''}" onclick="window.app.setStudyTab('saved')">
                    ★ Saved
                    <span class="tab-badge">${(state.bookmarks || []).length}</span>
                </button>
            </div>
        </div>
    </div>

    <main class="library-main">
        <div class="container">
            ${studyTab === 'saved'
                ? renderSavedTab(state)
                : studyTab === 'quizzes'
                    ? renderMyQuizzesTab(state, quizzes, categories, inProgressQuizzes, progressList, total)
                    : renderMyCertsTab(state, certs)}
        </div>
    </main>

    <!-- Study Mode Modal -->
    ${showStudyModal ? renderStudyModal(state.quizzes.find(q => q.id === showStudyModal) || (state.communityQuizPreview?.id === showStudyModal ? state.communityQuizPreview : null)) : ''}

    `;
}

function renderMyQuizzesTab(state, quizzes, categories, inProgressQuizzes, progressList, total) {
    return `
    <!-- Stats Banner -->
    <div class="study-stats-strip">
        <div class="stat-item">
            <div class="stat-value">${(state.quizzes || []).length}</div>
            <div class="stat-label">Quiz Sets</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${total.toLocaleString()}</div>
            <div class="stat-label">Questions</div>
        </div>
        <div class="stat-item">
            <button class="btn btn-primary btn-sm" onclick="window.app.showCreateOptions()">
                ${icon('plus')} Create
            </button>
        </div>
    </div>

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
                        value="${escapeHtml(localSearchQuery || state.searchQuery || '')}"
                        oninput="window.app.handleSearchInput(this.value)"
                        onkeydown="if(event.key==='Enter') window.app.setSearchImmediate(this.value)"
                    >
                    ${(localSearchQuery || state.searchQuery) ? `
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
    `;
}

function renderSavedTab(state) {
    const bookmarks = state.bookmarks || [];
    if (bookmarks.length === 0) {
        return `
        <div class="certs-empty-state">
            <div class="empty-icon" style="font-size:3rem">★</div>
            <h3>No saved questions yet</h3>
            <p class="text-muted">Star any question during a quiz to save it here for quick review.</p>
        </div>`;
    }
    return `
    <div class="saved-list">
        ${bookmarks.map(b => `
        <div class="saved-card card">
            <div class="saved-card-meta text-muted">${escapeHtml(b.quiz_title || 'Unknown quiz')}</div>
            <p class="saved-card-q">${escapeHtml(b.question_text || '')}</p>
            <div class="saved-card-footer">
                <button class="btn btn-sm btn-ghost text-danger" onclick="window.app.toggleBookmark(${b.question_id})">
                    ✕ Remove
                </button>
            </div>
        </div>`).join('')}
    </div>`;
}

function renderMyCertsTab(state, certs) {
    if (certs.length === 0) {
        return `
        <div class="certs-empty-state">
            <div class="empty-icon">${icon('barChart', 'icon-2xl')}</div>
            <h3>No certifications enrolled</h3>
            <p class="text-muted">Track your progress toward industry certifications</p>
            <button class="btn btn-primary" onclick="window.app.showCertPicker()">
                ${icon('plus')} Add Certification
            </button>
        </div>
        `;
    }

    const activeCert = state.activeCertification;
    const domains = state.domainPerformance || [];

    return `
    <div class="my-certs-layout">

        <!-- Cert list sidebar -->
        <div class="my-certs-list">
            ${certs.map(cert => {
                const isActive = activeCert?.certification_id === cert.certification_id;
                return `
                <div class="my-cert-item ${isActive ? 'active' : ''}"
                     onclick="window.app.selectCert(${cert.certification_id})">
                    <div class="my-cert-code">${escapeHtml(cert.code || cert.certification_code || '')}</div>
                    <div class="my-cert-name">${escapeHtml(cert.name || cert.certification_name || '')}</div>
                    ${cert.target_date ? `<div class="my-cert-target text-muted">Target: ${new Date(cert.target_date).toLocaleDateString(undefined, { month:'short', year:'numeric' })}</div>` : ''}
                </div>
                `;
            }).join('')}
            <button class="my-cert-add" onclick="window.app.showCertPicker()">
                ${icon('plus')} Add Certification
            </button>
        </div>

        <!-- Cert detail -->
        <div class="my-cert-detail" id="dash-detail">
            ${activeCert ? renderCertDetail(activeCert, domains, state) : `
            <div class="cert-detail-empty">
                <p class="text-muted">Select a certification to view your performance</p>
            </div>
            `}
        </div>

    </div>
    `;
}

function renderCertDetail(cert, domains, state) {
    const weakQs = state.weakQuestions || [];
    return `
    <div class="cert-detail-header">
        <div>
            <h2>${escapeHtml(cert.name || cert.certification_name || '')}</h2>
            <p class="text-muted">${escapeHtml(cert.code || cert.certification_code || '')}</p>
        </div>
        <div class="cert-detail-actions">
            <button class="btn btn-primary" onclick="window.app.navigate('readiness')">
                ${icon('barChart')} Full Readiness
            </button>
            <button class="btn btn-ghost btn-sm" onclick="window.app.unenrollCert(${cert.certification_id}, '${escapeHtml(cert.name || cert.certification_name || '')}')">
                Remove
            </button>
        </div>
    </div>

    ${domains.length > 0 ? `
    <div class="cert-domains">
        <h3>Domain Performance</h3>
        ${domains.map(d => {
            const pct = Math.round(d.accuracy || 0);
            return `
            <div class="domain-bar-row">
                <div class="domain-bar-label">${escapeHtml(d.domain_name || d.name || 'Domain')}</div>
                <div class="domain-bar-track">
                    <div class="domain-bar-fill ${pct >= 70 ? 'bar-good' : pct >= 40 ? 'bar-ok' : 'bar-low'}" style="width:${pct}%"></div>
                </div>
                <div class="domain-bar-pct">${pct}%</div>
            </div>
            `;
        }).join('')}
    </div>
    ` : `<p class="text-muted" style="margin-top:1rem">Complete practice exams to see domain performance.</p>`}

    ${weakQs.length > 0 ? `
    <div class="cert-weak-preview">
        <h3>Top Weak Areas</h3>
        ${weakQs.slice(0, 5).map(q => `
        <div class="weak-item">
            <div class="weak-body">
                <div class="weak-domain text-muted">${escapeHtml(q.domain_name || q.topic || 'Topic')}</div>
                <div class="weak-question">${escapeHtml((q.question_text || '').slice(0, 100))}…</div>
            </div>
            <div class="weak-acc ${(q.accuracy || 0) < 40 ? 'acc-danger' : 'acc-warn'}">${Math.round(q.accuracy || 0)}%</div>
        </div>
        `).join('')}
    </div>
    ` : ''}
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

// Keep the original renderMyQuizzesTab name for this section

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
    const isOwned = quiz.is_owned !== 0 && quiz.is_owned !== false;

    return `
    <div class="quiz-card-v3" onclick="window.app.openStudyModal(${quiz.id})">
        <div class="quiz-card-body">
            <div class="quiz-card-header">
                <h3 class="quiz-card-title">${escapeHtml(quiz.title)}</h3>
                ${isOwned ? `
                <button class="quiz-card-menu" onclick="event.stopPropagation(); window.app.toggleCardMenu(${quiz.id}, this)">
                    ⋮
                </button>
                ` : `
                <span class="quiz-public-badge" title="Shared publicly">${icon('globe')}</span>
                `}
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
        <div class="quiz-row-color" style="background: ${quiz.color || '#2563eb'}"></div>
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

export function renderStudyModal(quiz) {
    if (!quiz) return '';
    const count = quiz.questions?.length || 0;
    const isOwned = quiz.is_owned !== 0 && quiz.is_owned !== false;

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
                ${isOwned ? `
                <button class="btn btn-ghost" onclick="window.app.editQuiz(${quiz.id})">
                    ${icon('edit')} Edit Quiz
                </button>
                <button class="btn btn-ghost" onclick="window.app.closeStudyModal(); window.app.showShareSettings(${quiz.id})">
                    ${icon('globe')} Share
                </button>
                ` : ''}
                <button class="btn btn-ghost" onclick="window.app.showExportModal(${quiz.id})">
                    ${icon('share')} Export
                </button>
            </div>
        </div>
    </div>
    `;
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
    
    // Only filter if there's an actual search query (use localSearchQuery for instant results)
    const searchQuery = (localSearchQuery || state.searchQuery || '').trim().toLowerCase();
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

    // Re-render immediately so the filtered list updates as you type
    setState({});

    // Restore focus + cursor right after the synchronous re-render
    setTimeout(() => {
        const input = document.getElementById('library-search');
        if (input && document.activeElement !== input) {
            input.focus();
        }
        if (input) input.setSelectionRange(query.length, query.length);
    }, 0);

    // Commit to state.searchQuery after a short delay (for clear-button / persistence)
    // and restore focus again because this setState triggers a second re-render
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        setState({ searchQuery: query });
        setTimeout(() => {
            const input = document.getElementById('library-search');
            if (input) {
                input.focus();
                input.setSelectionRange(query.length, query.length);
            }
        }, 0);
    }, 300);
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
    setState({ view: 'study' });
}

export function openStudyModal(quizId) {
    showStudyModal = quizId;
    setState({});
}

export function closeStudyModal() {
    showStudyModal = null;
    setState({ communityQuizPreview: null });
}

export function getStudyModalQuizId() {
    return showStudyModal;
}

export function toggleCardMenu(quizId, btnEl) {
    // Toggle floating fixed-position menu (escapes overflow:hidden)
    const existing = document.querySelector(`.card-menu-float[data-quiz-id="${quizId}"]`);
    if (existing) { existing.remove(); return; }
    document.querySelectorAll('.card-menu-float').forEach(m => m.remove());

    const rect = btnEl.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'card-menu card-menu-float';
    menu.dataset.quizId = quizId;
    menu.style.cssText = `position:fixed;top:${rect.bottom + 4}px;right:${window.innerWidth - rect.right}px;z-index:9999;`;
    const close = `document.querySelectorAll('.card-menu-float').forEach(m=>m.remove());`;
    menu.innerHTML = `
        <button onclick="${close} window.app.editQuiz(${quizId})">${icon('edit')} Edit</button>
        <button onclick="${close} window.app.showShareSettings(${quizId})">${icon('globe')} Share</button>
        <button onclick="${close} window.app.showExportModal(${quizId})">${icon('share')} Export</button>
        <button class="text-danger" onclick="${close} window.app.confirmDelete(${quizId})">${icon('trash')} Delete</button>
    `;
    document.body.appendChild(menu);
}

export async function showShareSettings(quizId) {
    document.querySelectorAll('.card-menu-float').forEach(m => m.remove());
    const state = getState();
    const quiz = state.quizzes.find(q => q.id === quizId);
    if (!quiz) return;

    const existing = document.getElementById('share-settings-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'share-settings-modal';
    overlay.className = 'modal-overlay share-modal-overlay';
    overlay.innerHTML = `
        <div class="modal share-settings-modal" onclick="event.stopPropagation()">
            <div class="modal-header">
                <h2>${icon('globe')} Share Settings</h2>
                <button class="btn btn-ghost btn-icon" onclick="document.getElementById('share-settings-modal').remove()">${icon('x')}</button>
            </div>
            <div class="modal-body">
                <p class="text-muted mb-4" style="font-size:0.875rem">${escapeHtml(quiz.title)}</p>

                <div class="share-toggle-row">
                    <div>
                        <div style="font-weight:600">Make Public</div>
                        <div class="text-muted" style="font-size:0.8rem">Allow community to find and study this quiz</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="share-public-toggle" class="toggle-checkbox" ${quiz.is_public ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="document.getElementById('share-settings-modal').remove()">Cancel</button>
                <button class="btn btn-primary" id="share-save-btn">${icon('save')} Save</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Save
    overlay.querySelector('#share-save-btn').addEventListener('click', async () => {
        const isPublic = overlay.querySelector('#share-public-toggle').checked;
        overlay.remove();
        await updateQuizSettings(quizId, { isPublic });
    });

    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
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
    // Close floating card menus when clicking outside the menu or the ⋮ button
    if (!e.target.closest('.card-menu-float') && !e.target.closest('.quiz-card-menu')) {
        document.querySelectorAll('.card-menu-float').forEach(m => m.remove());
    }
});