/* Community Screen - Browse public quizzes by certification (Phase 2.4) */
import { getState, setState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { icon } from '../utils/icons.js';

import { apiCall } from '../services/api.js';
import { showToast } from '../utils/toast.js';
import { getStudyModalQuizId, renderStudyModal } from './library-v3.js';

// Module-level cache
let _communityQuizzes = null;
let _communityLoading = false;
let _activeCertFilter = null; // null = no selection (show all); '' = "All" explicitly clicked
let _communitySearch = '';

export async function loadCommunityQuizzes() {
    if (_communityLoading) return;
    _communityLoading = true;
    try {
        const params = new URLSearchParams();
        if (_activeCertFilter !== null && _activeCertFilter !== '') params.set('cert_id', _activeCertFilter);
        if (_communitySearch) params.set('q', _communitySearch);
        const data = await apiCall(`/community/quizzes?${params}`);
        _communityQuizzes = data.quizzes || [];
    } catch (e) {
        console.warn('Failed to load community quizzes:', e);
        _communityQuizzes = [];
    }
    _communityLoading = false;
    if (getState().view === 'community') {
        setState({});
        // Restore focus to search input if user was typing when results arrived
        if (_communitySearch) {
            setTimeout(() => {
                const input = document.getElementById('comm-search');
                if (input && document.activeElement !== input) input.focus();
                if (input) input.setSelectionRange(_communitySearch.length, _communitySearch.length);
            }, 0);
        }
    }
}

export function setCommunityFilter(certId) {
    _activeCertFilter = certId;
    _communityQuizzes = null;
    setState({});   // immediately re-render to show active pill
    loadCommunityQuizzes();
}

export function setCommunitySearch(q) {
    _communitySearch = q;
    _communityQuizzes = null;
    // Debounce
    clearTimeout(window._commSearchTimer);
    window._commSearchTimer = setTimeout(loadCommunityQuizzes, 350);
}

export function renderCommunity() {
    const state = getState();
    const certs = state.certifications || [];

    // Trigger first load
    if (_communityQuizzes === null && !_communityLoading) {
        loadCommunityQuizzes();
    }

    const quizzes = _communityQuizzes || [];
    const isLoading = _communityLoading && _communityQuizzes === null;

    return `
    <main class="comm-main">
        <div class="container">

            <div class="comm-header">
                <div>
                    <h1 class="comm-title">${icon('globe')} Community</h1>
                    <p class="text-muted">Browse public quizzes shared by the community</p>
                </div>
            </div>

            <!-- Filters -->
            <div class="comm-filters">
                <div class="search-wrapper comm-search-wrap">
                    <span class="search-icon">${icon('search')}</span>
                    <input
                        type="text"
                        class="search-input"
                        id="comm-search"
                        placeholder="Search community quizzes…"
                        value="${escapeHtml(_communitySearch)}"
                        oninput="window.app.setCommunitySearch(this.value)"
                    >
                    ${_communitySearch ? `<button class="search-clear" onclick="window.app.clearCommunitySearch()">×</button>` : ''}
                </div>

                <div class="comm-cert-filters">
                    <button class="cert-filter-btn ${_activeCertFilter === '' ? 'active' : ''}" onclick="window.app.setCommunityFilter('')">
                        All
                    </button>
                    ${certs.slice(0, 8).map(c => `
                        <button class="cert-filter-btn ${_activeCertFilter == c.id ? 'active' : ''}"
                                onclick="window.app.setCommunityFilter(${c.id})">
                            ${escapeHtml(c.code || c.name)}
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- Quiz Grid -->
            ${isLoading ? `
            <div class="comm-loading">
                <div class="spinner"></div>
                <p class="text-muted">Loading community quizzes…</p>
            </div>
            ` : quizzes.length === 0 ? `
            <div class="comm-empty">
                <div class="comm-empty-icon">${icon('globe', 'icon-2xl')}</div>
                <h3>No public quizzes yet</h3>
                <p class="text-muted">Be the first to share a quiz with the community!</p>
                <button class="btn btn-primary" onclick="window.app.navigate('study')">
                    ${icon('library')} Go to My Study Sets
                </button>
            </div>
            ` : `
            <div class="comm-grid">
                ${quizzes.map(q => renderCommunityCard(q)).join('')}
            </div>
            <p class="comm-count text-muted">${quizzes.length} quiz${quizzes.length !== 1 ? 'zes' : ''} found</p>
            `}

        </div>
    </main>

    ${(() => {
        const modalQuizId = getStudyModalQuizId();
        if (!modalQuizId) return '';
        const quiz = state.communityQuizPreview?.id === modalQuizId ? state.communityQuizPreview : null;
        return renderStudyModal(quiz);
    })()}
    `;
}

function renderCommunityCard(quiz) {
    const count = quiz.question_count || 0;
    const certLabel = quiz.certification_code
        ? `<span class="badge badge-cert">${escapeHtml(quiz.certification_code)}</span>`
        : '';
    return `
    <div class="comm-card">
        <div class="comm-card-accent" style="background: ${getQuizColor(quiz.id)}"></div>
        <div class="comm-card-body">
            <div class="comm-card-top">
                <h3 class="comm-card-title">${escapeHtml(quiz.title)}</h3>
                ${certLabel}
            </div>
            ${quiz.description ? `<p class="comm-card-desc text-muted">${escapeHtml(quiz.description)}</p>` : ''}
            <div class="comm-card-meta">
                <span>${icon('layers')} ${count} term${count !== 1 ? 's' : ''}</span>
                <span>by ${escapeHtml(quiz.username || 'Anonymous')}</span>
            </div>
        </div>
        <div class="comm-card-footer">
            <button class="btn btn-primary btn-sm" onclick="window.app.studyCommunityQuiz(${quiz.id})">
                ${icon('bookOpen')} Study
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.app.copyQuizToLibrary(${quiz.id})">
                ${icon('copy')} Copy to Library
            </button>
        </div>
    </div>
    `;
}

function getQuizColor(id) {
    const colors = [
        '#2563eb',
        '#16a34a',
        '#d97706',
        '#0891b2',
        '#7c3aed',
    ];
    return colors[(id || 0) % colors.length];
}
