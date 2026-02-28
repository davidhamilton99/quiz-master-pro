/* Mission Control — the immersive session-based home view */
import { getState, setState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { getSessionPlan, invalidateSession } from './session.js';

let _sessionData = null;
let _loading = true;
let _error = false;

/**
 * Reset mission control cache (call when navigating away or after quiz).
 */
export function resetMissionControl() {
    _sessionData = null;
    _loading = true;
    _error = false;
}

/**
 * Refresh the session plan and re-render.
 */
export async function refreshSession() {
    invalidateSession();
    _loading = true;
    _error = false;
    rerenderMC();
    try {
        _sessionData = await getSessionPlan(true);
        _loading = false;
    } catch (e) {
        _loading = false;
        _error = true;
    }
    rerenderMC();
}

function rerenderMC() {
    const container = document.getElementById('mc-root');
    if (container) {
        container.innerHTML = renderMCContent();
        // Re-attach any listeners if needed
    }
}

/**
 * Main render function for mission control.
 */
export function renderMissionControl() {
    const state = getState();

    // Kick off async session load
    if (_loading && !_sessionData) {
        getSessionPlan().then(session => {
            _sessionData = session;
            _loading = false;
            if (getState().view === 'mission-control') {
                rerenderMC();
            }
        }).catch(() => {
            _loading = false;
            _error = true;
            if (getState().view === 'mission-control') {
                rerenderMC();
            }
        });
    }

    return `
        <main class="mc-main">
            <div class="mc-container" id="mc-root">
                ${renderMCContent()}
            </div>
        </main>
    `;
}

/**
 * Shared app nav — hamburger menu, brand, user avatar.
 * Exported so every authenticated view can use the same shell.
 * @param {string} [currentView] - The active view name for highlighting the menu item.
 */
export function renderMCNav(currentView) {
    const state = getState();
    const v = currentView || state.view || '';
    const isActive = (name) => v === name ? 'active' : '';

    return `
    <header class="mc-header">
        <button class="mc-menu-btn" onclick="window.app.toggleMCMenu()" title="Menu">
            ${icon('menu')}
        </button>
        <div class="mc-brand" onclick="window.app.navigate('mission-control')" style="cursor:pointer">
            <span class="mc-brand-mark">Q</span>
        </div>
        <button class="mc-avatar-btn" onclick="window.app.toggleMenu()">
            <span class="mc-avatar">${state.user?.username?.charAt(0).toUpperCase() || 'U'}</span>
        </button>
        <div id="user-menu" class="dropdown-menu hidden">
            <div class="dropdown-header">
                <div class="dropdown-user-name">${escapeHtml(state.user?.username || 'User')}</div>
            </div>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" onclick="window.app.navigate('profile')">
                ${icon('user')} Profile
            </button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" onclick="window.app.showImportModal()">
                ${icon('download')} Import Quiz
            </button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item text-danger" onclick="window.app.logout()">
                ${icon('logOut')} Sign Out
            </button>
        </div>
    </header>

    <!-- Slide-out menu for accessing all features -->
    <div class="mc-menu-overlay hidden" id="mc-menu-overlay" onclick="window.app.closeMCMenu()">
        <nav class="mc-menu-panel" onclick="event.stopPropagation()">
            <div class="mc-menu-header">
                <span class="mc-menu-title">Quiz Master Pro</span>
                <button class="btn btn-ghost btn-icon" onclick="window.app.closeMCMenu()">${icon('x')}</button>
            </div>
            <div class="mc-menu-items">
                <button class="mc-menu-item ${isActive('mission-control')}" onclick="window.app.closeMCMenu(); window.app.navigate('mission-control')">
                    ${icon('home')} <span>Session</span>
                </button>
                <button class="mc-menu-item ${isActive('study') || isActive('library') ? 'active' : ''}" onclick="window.app.closeMCMenu(); window.app.navigate('study')">
                    ${icon('library')} <span>My Quizzes</span>
                </button>
                <button class="mc-menu-item ${isActive('readiness')}" onclick="window.app.closeMCMenu(); window.app.navigate('readiness')">
                    ${icon('barChart')} <span>Readiness Details</span>
                </button>
                <button class="mc-menu-item ${isActive('community')}" onclick="window.app.closeMCMenu(); window.app.navigate('community')">
                    ${icon('globe')} <span>Community</span>
                </button>
                <button class="mc-menu-item" onclick="window.app.closeMCMenu(); window.app.showCreateOptions()">
                    ${icon('plus')} <span>Create Quiz</span>
                </button>
            </div>
        </nav>
    </div>

    <!-- Bottom tab bar — always visible for quick navigation -->
    <nav class="mobile-tab-bar mc-tab-bar">
        <button class="tab-item ${v === 'mission-control' ? 'active' : ''}" onclick="window.app.navigate('mission-control')">
            <span class="tab-icon">${icon('home')}</span>
            <span class="tab-label">Session</span>
        </button>
        <button class="tab-item ${v === 'study' || v === 'library' ? 'active' : ''}" onclick="window.app.navigate('study')">
            <span class="tab-icon">${icon('library')}</span>
            <span class="tab-label">Study</span>
        </button>
        <button class="tab-item tab-create-btn" onclick="window.app.showCreateOptions()">
            <span class="tab-create-icon">${icon('plus')}</span>
        </button>
        <button class="tab-item ${v === 'readiness' ? 'active' : ''}" onclick="window.app.navigate('readiness')">
            <span class="tab-icon">${icon('barChart')}</span>
            <span class="tab-label">Readiness</span>
        </button>
        <button class="tab-item ${v === 'community' ? 'active' : ''}" onclick="window.app.navigate('community')">
            <span class="tab-icon">${icon('globe')}</span>
            <span class="tab-label">Community</span>
        </button>
    </nav>
    `;
}

function renderMCContent() {
    if (_loading) return renderSkeleton();
    if (_error && !_sessionData) return renderEmpty();

    const ctx = _sessionData?.context || {};
    const blocks = _sessionData?.blocks || [];
    const state = getState();
    const certs = state.userCertifications || [];

    return `
        ${renderContextHeader(ctx, certs, blocks.length > 0)}
        ${renderSessionStream(blocks, ctx)}
    `;
}

/**
 * Context header — the "Day X of Y" + readiness summary.
 * Hidden entirely for first-time users (no history) — the empty state handles that.
 */
function renderContextHeader(ctx, certs, hasBlocks) {
    const cert = ctx.certification;
    const days = ctx.days_remaining;
    const readiness = ctx.overall_readiness || 0;
    const hours = ctx.study_hours_30d || 0;

    // Don't show stats header when user has no history yet
    if (!hasBlocks && readiness === 0) return '';

    let headline = '';
    if (cert && days !== null && days !== undefined) {
        if (days === 0) {
            headline = `<span class="mc-headline">Exam day.</span>`;
        } else if (days === 1) {
            headline = `<span class="mc-headline">Tomorrow.</span>`;
        } else {
            headline = `<span class="mc-headline">${days} days to ${escapeHtml(cert.name || cert.code)}.</span>`;
        }
    } else if (cert) {
        headline = `<span class="mc-headline">${escapeHtml(cert.name || cert.code)}</span>`;
    } else {
        headline = `<span class="mc-headline">Your study session.</span>`;
    }

    // Domain mini-bars — only show when at least one domain has been attempted
    const domains = ctx.domains || [];
    const hasAnyData = domains.some(d => d.score > 0);
    const domainBars = domains.length > 0 && hasAnyData ? `
        <div class="mc-domain-section">
            <span class="mc-domain-heading">Domain Readiness</span>
            <div class="mc-domain-bars">
                ${domains.map(d => {
                    const statusClass = d.status === 'strong' ? 'mc-bar-strong' :
                                        d.status === 'moderate' ? 'mc-bar-moderate' :
                                        d.status === 'weak' ? 'mc-bar-weak' : 'mc-bar-unseen';
                    return `
                    <div class="mc-domain-bar-item" title="${escapeHtml(d.name)}: ${d.score}%">
                        <div class="mc-domain-bar-track">
                            <div class="mc-domain-bar-fill ${statusClass}" style="width: ${d.score}%"></div>
                        </div>
                        <span class="mc-domain-bar-label">${escapeHtml(d.name)}</span>
                    </div>`;
                }).join('')}
            </div>
        </div>
    ` : '';

    return `
        <div class="mc-context-header">
            <div class="mc-headline-row">
                ${headline}
            </div>
            ${cert ? `
                <div class="mc-readiness-row">
                    <div class="mc-readiness-score">
                        <span class="mc-readiness-num">${readiness}%</span>
                        <span class="mc-readiness-label">readiness</span>
                    </div>
                    ${hours > 0 ? `
                    <div class="mc-stat">
                        <span class="mc-stat-num">${hours}h</span>
                        <span class="mc-stat-label">studied (30d)</span>
                    </div>` : ''}
                </div>
                ${domainBars}
            ` : ''}
        </div>
    `;
}

/**
 * The session stream — ordered blocks of what to do next.
 */
function renderSessionStream(blocks, ctx) {
    if (blocks.length === 0) {
        return renderNoBlocks(ctx);
    }

    return `
        <div class="mc-stream">
            <span class="mc-stream-heading">Your study plan</span>
            ${blocks.map((block, i) => renderBlock(block, i)).join('')}
        </div>
    `;
}

/**
 * Render a single session block.
 */
function renderBlock(block, index) {
    switch (block.type) {
        case 'srs_review': return renderSrsBlock(block, index);
        case 'domain_quiz': return renderDomainBlock(block, index);
        case 'simulation_prompt': return renderSimBlock(block, index);
        default: return '';
    }
}

function renderSrsBlock(block, index) {
    return `
        <div class="mc-block mc-block-srs" onclick="window.app.startSrsReview()" style="cursor:pointer">
            <div class="mc-block-order">${index + 1}</div>
            <div class="mc-block-body">
                <div class="mc-block-title">${escapeHtml(block.title)}</div>
                <div class="mc-block-subtitle">${escapeHtml(block.subtitle)}</div>
            </div>
            <div class="mc-block-meta">
                <span class="mc-block-estimate">${block.estimate_minutes} min</span>
                <span class="mc-block-action">${icon('arrowRight')}</span>
            </div>
        </div>
    `;
}

function renderDomainBlock(block, index) {
    const statusBadge = block.domain_status === 'unseen' ? 'New' :
                        block.domain_status === 'weak' ? `${block.domain_score}%` :
                        `${block.domain_score}%`;
    const statusClass = block.domain_status === 'unseen' ? 'mc-badge-unseen' :
                        block.domain_status === 'weak' ? 'mc-badge-weak' :
                        'mc-badge-moderate';

    return `
        <div class="mc-block mc-block-domain" onclick="window.app.startSessionDomainQuiz(${block.action_data?.domainId}, ${block.question_count})" style="cursor:pointer">
            <div class="mc-block-order">${index + 1}</div>
            <div class="mc-block-body">
                <div class="mc-block-title">${escapeHtml(block.title)}</div>
                <div class="mc-block-subtitle">${escapeHtml(block.subtitle)}</div>
            </div>
            <div class="mc-block-meta">
                <span class="mc-block-badge ${statusClass}">${statusBadge}</span>
                <span class="mc-block-estimate">${block.question_count}q / ${block.estimate_minutes} min</span>
                <span class="mc-block-action">${icon('arrowRight')}</span>
            </div>
        </div>
    `;
}

function renderSimBlock(block, index) {
    return `
        <div class="mc-block mc-block-sim">
            <div class="mc-block-body">
                <div class="mc-block-title">${escapeHtml(block.title)}</div>
                <div class="mc-block-subtitle">${escapeHtml(block.subtitle)}</div>
                <div class="mc-sim-readiness">
                    Readiness: ${block.readiness_pct}%
                </div>
            </div>
            <div class="mc-block-meta">
                <button class="mc-sim-btn" onclick="event.stopPropagation(); window.app.startSimulation(${block.action_data?.certId})">
                    Start practice exam
                </button>
            </div>
        </div>
    `;
}

/**
 * Empty state — no blocks, guide the user.
 * When a cert is selected: immersive entry point with diagnostic invitation.
 * When no cert: simple prompt to pick one.
 */
function renderNoBlocks(ctx) {
    const cert = ctx.certification;
    if (cert) {
        const certName = escapeHtml(cert.name || cert.code);
        const certCode = cert.code ? escapeHtml(cert.code) : '';
        return `
            <div class="mc-entry">
                <div class="mc-entry-header">
                    ${certCode ? `<span class="mc-entry-code">${certCode}</span>` : ''}
                    <h1 class="mc-entry-cert">${certName}</h1>
                    <p class="mc-entry-welcome">Your prep starts here. Let's find out where you stand.</p>
                </div>

                <div class="mc-diagnostic-card" onclick="window.app.startSimulation(${cert.id})" style="cursor:pointer">
                    <div class="mc-diagnostic-content">
                        <span class="mc-diagnostic-label">Recommended first step</span>
                        <h2 class="mc-diagnostic-title">Diagnostic Exam</h2>
                        <p class="mc-diagnostic-desc">A 20-question assessment across all exam domains. Takes about 15 minutes. Tells us exactly where to focus your prep.</p>
                    </div>
                    <div class="mc-diagnostic-action">
                        <button class="mc-primary-btn" onclick="event.stopPropagation(); window.app.startSimulation(${cert.id})">Begin Diagnostic</button>
                    </div>
                </div>

                <div class="mc-locked-section">
                    <span class="mc-locked-heading">Available after diagnostic</span>
                    <div class="mc-locked-grid">
                        <div class="mc-locked-card">
                            <div class="mc-locked-icon">${icon('barChart')}</div>
                            <div class="mc-locked-info">
                                <span class="mc-locked-title">Domain Breakdown</span>
                                <span class="mc-locked-desc">See your readiness across every exam objective</span>
                            </div>
                        </div>
                        <div class="mc-locked-card">
                            <div class="mc-locked-icon">${icon('target')}</div>
                            <div class="mc-locked-info">
                                <span class="mc-locked-title">Weak Areas</span>
                                <span class="mc-locked-desc">Pinpoint the topics that need the most attention</span>
                            </div>
                        </div>
                        <div class="mc-locked-card">
                            <div class="mc-locked-icon">${icon('listChecks')}</div>
                            <div class="mc-locked-info">
                                <span class="mc-locked-title">Study Plan</span>
                                <span class="mc-locked-desc">A personalised session plan built from your results</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    return `
        <div class="mc-empty">
            <p class="mc-empty-text">Pick a certification to get started.</p>
            <div class="mc-empty-actions">
                <button class="mc-primary-btn" onclick="window.app.showCertPicker()">Add Certification</button>
            </div>
        </div>
    `;
}

function renderSkeleton() {
    return `
        <div class="mc-skeleton">
            <div class="mc-skel-headline"></div>
            <div class="mc-skel-stats"></div>
            <div class="mc-skel-block"></div>
            <div class="mc-skel-block"></div>
            <div class="mc-skel-block"></div>
        </div>
    `;
}

function renderEmpty() {
    return `
        <div class="mc-empty">
            <p class="mc-empty-text">Couldn't load your session. Check your connection and try again.</p>
            <button class="mc-primary-btn" onclick="window.app.refreshSession()">Retry</button>
        </div>
    `;
}
