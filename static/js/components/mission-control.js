/* Mission Control — the immersive certification session screen */
import { getState, setState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { getSessionPlan, invalidateSession } from './session.js';
import { enrollCertification, getUserCertifications } from '../services/api.js';
import { showToast } from '../utils/toast.js';

let _sessionData = null;
let _loading = true;
let _error = false;
let _activeCertId = null;

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
        _sessionData = await getSessionPlan(true, _activeCertId);
        _loading = false;
    } catch (e) {
        _loading = false;
        _error = true;
    }
    rerenderMC();
}

/**
 * Switch to a different certification tab.
 */
export async function switchSessionCert(certId) {
    if (certId === _activeCertId && _sessionData) return;
    _activeCertId = certId;
    _loading = true;
    _error = false;
    _sessionData = null;
    rerenderMC();
    try {
        _sessionData = await getSessionPlan(true, certId);
        _loading = false;
    } catch (e) {
        _loading = false;
        _error = true;
    }
    rerenderMC();
}

/**
 * Show a modal to set or update the exam date for a certification.
 */
export function showExamDateModal(certId) {
    const existing = document.getElementById('exam-date-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'exam-date-modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal" style="max-width:380px">
            <div class="modal-header">
                <h2>Set Exam Date</h2>
                <button class="btn btn-ghost btn-icon" onclick="document.getElementById('exam-date-modal').remove()">${icon('x')}</button>
            </div>
            <div class="modal-body">
                <p class="text-muted" style="margin-bottom:1rem">When is your exam scheduled?</p>
                <input type="date" id="exam-date-input" class="input" style="width:100%"
                       min="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="document.getElementById('exam-date-modal').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="window.app.saveExamDate(${certId})">Save</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

/**
 * Save exam date from the modal.
 */
export async function saveExamDate(certId) {
    const input = document.getElementById('exam-date-input');
    const date = input?.value;
    if (!date) {
        showToast('Please select a date', 'error');
        return;
    }
    const modal = document.getElementById('exam-date-modal');
    if (modal) modal.remove();

    try {
        await enrollCertification(certId, date);
        const userCerts = await getUserCertifications();
        setState({ userCertifications: userCerts });
        invalidateSession();
        _loading = true;
        _sessionData = null;
        rerenderMC();
        _sessionData = await getSessionPlan(true, _activeCertId);
        _loading = false;
        rerenderMC();
        showToast('Exam date saved', 'success');
    } catch (e) {
        showToast('Failed to save exam date', 'error');
    }
}

function rerenderMC() {
    const container = document.getElementById('mc-root');
    if (container) {
        container.innerHTML = renderMCContent();
    }
}

// ==================== MAIN RENDER ====================

/**
 * Main render function for mission control.
 */
export function renderMissionControl() {
    const state = getState();
    const certs = state.userCertifications;

    // Set initial active cert if not set
    if (!_activeCertId && Array.isArray(certs) && certs.length > 0) {
        _activeCertId = certs[0].certification_id;
    }

    // Kick off async session load
    if (_loading && !_sessionData) {
        getSessionPlan(false, _activeCertId).then(session => {
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
        <div class="user-menu">
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

    `;
}

// ==================== CONTENT RENDERING ====================

function renderMCContent() {
    const state = getState();
    const certs = state.userCertifications;

    // undefined = cert API call hasn't returned yet
    if (!Array.isArray(certs)) return renderSkeleton();

    if (certs.length === 0) return renderNoCerts();

    const certTabsHtml = renderCertTabs(certs);

    if (_loading) return certTabsHtml + renderSkeleton();
    if (_error && !_sessionData) return certTabsHtml + renderErrorState();

    const ctx = _sessionData?.context || {};
    const blocks = _sessionData?.blocks || [];

    return `
        ${certTabsHtml}
        ${renderCertHeader(ctx)}
        ${ctx.has_history ? renderReturningUserView(ctx, blocks) : renderNewUserView(ctx)}
    `;
}

// ==================== CERT TABS ====================

function renderCertTabs(certs) {
    return `
    <div class="mc-cert-tabs">
        ${certs.map(c => `
            <button class="mc-cert-tab ${c.certification_id === _activeCertId ? 'active' : ''}"
                    onclick="window.app.switchSessionCert(${c.certification_id})">
                ${escapeHtml(c.name || c.code || 'Cert')}
            </button>
        `).join('')}
        <button class="mc-cert-tab mc-cert-tab--add" onclick="window.app.showCertPicker()">
            + Add cert
        </button>
    </div>
    `;
}

// ==================== CERTIFICATION HEADER ====================

function renderCertHeader(ctx) {
    const cert = ctx.certification;
    if (!cert) return '';

    const readiness = ctx.overall_readiness || 0;
    const answered = ctx.total_questions_answered || 0;
    const accuracy = ctx.overall_accuracy || 0;

    // Exam date badge
    let examBadge = '';
    if (ctx.target_date && ctx.days_remaining !== null && ctx.days_remaining !== undefined) {
        const dateStr = new Date(ctx.target_date + 'T00:00:00').toLocaleDateString(undefined, {
            month: 'long', day: 'numeric', year: 'numeric'
        });
        examBadge = `
            <div class="mc-exam-badge">
                ${icon('calendar')} ${ctx.days_remaining} days until exam &mdash; ${dateStr}
            </div>
        `;
    } else {
        examBadge = `
            <button class="mc-exam-date-link" onclick="window.app.showExamDateModal(${cert.id})">
                Set exam date
            </button>
        `;
    }

    return `
    <div class="mc-cert-header">
        <span class="mc-cert-label">ACTIVE CERTIFICATION</span>
        <h1 class="mc-cert-name">${escapeHtml(cert.name || cert.code)}</h1>
        <div class="mc-stats-row">
            <div class="mc-stat-item">
                <span class="mc-stat-value mc-stat-value--accent">${readiness}%</span>
                <span class="mc-stat-unit">readiness</span>
            </div>
            <span class="mc-stat-sep"></span>
            <div class="mc-stat-item">
                <span class="mc-stat-value">${answered.toLocaleString()}</span>
                <span class="mc-stat-unit">questions answered</span>
            </div>
            <span class="mc-stat-sep"></span>
            <div class="mc-stat-item">
                <span class="mc-stat-value">${accuracy}%</span>
                <span class="mc-stat-unit">accuracy</span>
            </div>
        </div>
        ${examBadge}
    </div>
    `;
}

// ==================== NEW USER VIEW ====================

function renderNewUserView(ctx) {
    const cert = ctx.certification;
    if (!cert) return '';

    const domainCount = (ctx.domains || []).length || 6;

    return `
    <div class="mc-new-user">
        <span class="mc-section-label">YOUR STUDY PLAN</span>

        <div class="mc-diagnostic-card">
            <span class="mc-diagnostic-start-label">START HERE</span>
            <h2 class="mc-diagnostic-title">Take your diagnostic exam</h2>
            <p class="mc-diagnostic-desc">
                A 20-question assessment across all ${domainCount} ${escapeHtml(cert.name || cert.code)} domains.
                Takes about 15 minutes. This tells us exactly where you stand and builds your personalised study plan &mdash;
                so every session from here focuses on what will actually move your score.
            </p>
            <div class="mc-diagnostic-meta">
                <span class="mc-diagnostic-meta-item">${icon('clock')} 15 minutes</span>
                <span class="mc-diagnostic-meta-item">${icon('listOrdered')} 20 questions</span>
                <span class="mc-diagnostic-meta-item">${icon('star')} All ${domainCount} domains</span>
            </div>
            <div class="mc-diagnostic-actions">
                <button class="mc-primary-btn" onclick="window.app.startSimulation(${cert.id})">Begin diagnostic</button>
                <button class="mc-secondary-btn" onclick="window.app.navigate('readiness')">Open workspace</button>
            </div>
        </div>

        <span class="mc-section-label">AVAILABLE AFTER YOUR DIAGNOSTIC</span>

        <div class="mc-locked-grid">
            <div class="mc-locked-card">
                <h3 class="mc-locked-card-title">Domain Breakdown</h3>
                <p class="mc-locked-card-desc">Your performance across all ${domainCount} exam domains with specific weak areas identified.</p>
                <span class="mc-locked-badge">AFTER DIAGNOSTIC</span>
            </div>
            <div class="mc-locked-card">
                <h3 class="mc-locked-card-title">Readiness Score</h3>
                <p class="mc-locked-card-desc">Your predicted pass probability based on domain performance and exam weighting.</p>
                <span class="mc-locked-badge">AFTER DIAGNOSTIC</span>
            </div>
            <div class="mc-locked-card">
                <h3 class="mc-locked-card-title">Daily Study Sessions</h3>
                <p class="mc-locked-card-desc">Personalised question sets targeting your weakest domains, updated every session.</p>
                <span class="mc-locked-badge">AFTER DIAGNOSTIC</span>
            </div>
            <div class="mc-locked-card">
                <h3 class="mc-locked-card-title">Weak Points Drill</h3>
                <p class="mc-locked-card-desc">Questions you got wrong, surfaced again when you're ready to retry them.</p>
                <span class="mc-locked-badge">AFTER DIAGNOSTIC</span>
            </div>
        </div>
    </div>
    `;
}

// ==================== RETURNING USER VIEW ====================

function renderReturningUserView(ctx, blocks) {
    const readiness = ctx.overall_readiness || 0;
    const domains = ctx.domains || [];

    // Compute "Day X of Y"
    let sessionHeading = "TODAY'S SESSION";
    if (ctx.started_at && ctx.target_date) {
        try {
            const start = new Date(ctx.started_at);
            const target = new Date(ctx.target_date + 'T00:00:00');
            const now = new Date();
            const totalDays = Math.max(1, Math.round((target - start) / 86400000));
            const currentDay = Math.max(1, Math.round((now - start) / 86400000) + 1);
            if (currentDay <= totalDays) {
                sessionHeading = `TODAY'S SESSION &mdash; DAY ${currentDay} OF ${totalDays}`;
            }
        } catch (e) {
            // Fall back to default heading
        }
    }

    // Sort blocks for display: weak domains → SRS → practice → simulation
    const sorted = sortBlocksForDisplay(blocks);

    return `
    <div class="mc-returning-user">
        ${renderReadinessPanel(readiness, domains)}

        <span class="mc-section-label">${sessionHeading}</span>

        <div class="mc-session-stream">
            ${sorted.length > 0 ? sorted.map((block, i) => renderSessionBlock(block, i, sorted)).join('') : `
                <div class="mc-session-empty">
                    <p>No study blocks for today. Great work keeping up!</p>
                    <button class="mc-secondary-btn" onclick="window.app.refreshSession()">Refresh</button>
                </div>
            `}
        </div>
    </div>
    `;
}

// ==================== READINESS PANEL ====================

function renderReadinessPanel(readiness, domains) {
    // Only show domains that have data or are relevant
    const displayDomains = domains.slice(0, 6);

    return `
    <div class="mc-readiness-panel">
        <div class="mc-readiness-left">
            <span class="mc-readiness-big">${readiness}%</span>
            <span class="mc-readiness-big-label">READINESS</span>
        </div>
        <div class="mc-readiness-divider"></div>
        <div class="mc-readiness-right">
            ${displayDomains.map(d => {
                const score = Math.round(d.score || 0);
                const colorClass = score >= 70 ? 'mc-bar-good' : score >= 40 ? 'mc-bar-moderate' : 'mc-bar-weak';
                return `
                <div class="mc-domain-row">
                    <span class="mc-domain-name">${escapeHtml(d.name)}</span>
                    <div class="mc-domain-bar">
                        <div class="mc-domain-fill ${colorClass}" style="width:${score}%"></div>
                    </div>
                    <span class="mc-domain-pct ${colorClass}">${score}%</span>
                </div>
                `;
            }).join('')}
        </div>
    </div>
    `;
}

// ==================== SESSION BLOCKS ====================

function sortBlocksForDisplay(blocks) {
    const weak = [];
    const srs = [];
    const practice = [];
    const sim = [];

    for (const b of blocks) {
        if (b.type === 'srs_review') srs.push(b);
        else if (b.type === 'simulation_prompt') sim.push(b);
        else if (b.type === 'domain_quiz') {
            if (b.domain_status === 'weak' || b.domain_status === 'unseen') {
                weak.push(b);
            } else {
                practice.push(b);
            }
        }
    }

    return [...weak, ...srs, ...practice, ...sim];
}

function getBlockMeta(block, index, allBlocks) {
    if (block.type === 'srs_review') {
        return { label: 'SRS REVIEW', colorClass: 'mc-block--srs' };
    }
    if (block.type === 'simulation_prompt') {
        return { label: 'PRACTICE EXAM', colorClass: 'mc-block--practice' };
    }
    if (block.type === 'domain_quiz') {
        if (block.domain_status === 'weak' || block.domain_status === 'unseen') {
            // First weak/unseen domain is PRIORITY, rest are WEAK AREA
            const isFirst = allBlocks.findIndex(b =>
                b.type === 'domain_quiz' && (b.domain_status === 'weak' || b.domain_status === 'unseen')
            ) === index;
            return isFirst
                ? { label: 'PRIORITY', colorClass: 'mc-block--priority' }
                : { label: 'WEAK AREA', colorClass: 'mc-block--weak' };
        }
        return { label: 'PRACTICE', colorClass: 'mc-block--practice' };
    }
    return { label: '', colorClass: '' };
}

function renderSessionBlock(block, index, allBlocks) {
    const meta = getBlockMeta(block, index, allBlocks);
    const est = block.estimate_minutes ? `~${block.estimate_minutes} min` : '';

    // Determine click handler
    let onclick = '';
    if (block.type === 'srs_review') {
        onclick = 'window.app.startSrsReview()';
    } else if (block.type === 'domain_quiz') {
        onclick = `window.app.startSessionDomainQuiz(${block.action_data?.domainId}, ${block.question_count})`;
    } else if (block.type === 'simulation_prompt') {
        onclick = `window.app.startSimulation(${block.action_data?.certId})`;
    }

    return `
    <div class="mc-session-block ${meta.colorClass}" onclick="${onclick}" style="cursor:pointer">
        <div class="mc-session-block-header">
            <span class="mc-session-label">${meta.label}</span>
            <span class="mc-session-time">${est}</span>
        </div>
        <div class="mc-session-block-body">
            <div class="mc-session-block-content">
                <h3 class="mc-session-title">${escapeHtml(block.title)}</h3>
                <p class="mc-session-desc">${escapeHtml(block.subtitle)}</p>
            </div>
            <span class="mc-session-arrow">&rarr;</span>
        </div>
    </div>
    `;
}

// ==================== EMPTY / ERROR / SKELETON STATES ====================

function renderNoCerts() {
    return `
    <div class="mc-empty">
        <p class="mc-empty-text">Pick a certification to get started.</p>
        <div class="mc-empty-actions">
            <button class="mc-primary-btn" onclick="window.app.showCertPicker()">Add Certification</button>
        </div>
    </div>
    `;
}

function renderErrorState() {
    return `
    <div class="mc-empty">
        <p class="mc-empty-text">Couldn't load your session. Check your connection and try again.</p>
        <button class="mc-primary-btn" onclick="window.app.refreshSession()">Retry</button>
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
