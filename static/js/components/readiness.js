/* Certification Workspace - Full cert prep environment with feature blocks */
import { getState, setState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { renderNav } from '../utils/nav.js';
import {
    getUserCertifications, getCertPerformance, getCertTrends,
    getWeakQuestions, getCertReadiness,
    getCertObjectives, updateObjectiveConfidence, getStudyResources
} from '../services/api.js';
import { showToast } from '../utils/toast.js';
import { showLoading, hideLoading } from '../utils/dom.js';

// Module state
let _activeView = 'workspace';   // 'workspace' | 'practice-exams' | 'domain-readiness' | 'objectives' | 'weak-points' | 'pbq' | 'study-guides' | 'flashcards' | 'quick-notes' | 'mini-games'
let _activeCertId = null;
let _readiness = null;
let _domains = [];
let _trends = [];
let _weakQs = [];
let _objectives = [];
let _resources = [];
let _dataLoaded = false;
let _objectivesLoaded = false;
let _resourcesLoaded = false;
let _expandedDomains = new Set();

// Keep old tab name for compatibility
export function setReadinessTab(tab) {
    const tabMap = { 'overview': 'domain-readiness', 'objectives': 'objectives', 'simulate': 'practice-exams', 'weak': 'weak-points' };
    _activeView = tabMap[tab] || tab;
    if (_activeView === 'objectives' && !_objectivesLoaded && _activeCertId) {
        _loadObjectivesData(_activeCertId);
    }
    setState({});
}

export function setWorkspaceView(view) {
    _activeView = view;
    if (view === 'objectives' && !_objectivesLoaded && _activeCertId) {
        _loadObjectivesData(_activeCertId);
    }
    setState({});
}

export async function selectReadinessCert(certId) {
    _activeCertId = certId;
    _dataLoaded = false;
    _objectivesLoaded = false;
    _resourcesLoaded = false;
    _readiness = null;
    _domains = [];
    _trends = [];
    _weakQs = [];
    _objectives = [];
    _resources = [];
    _expandedDomains = new Set();
    _activeView = 'workspace';
    setState({});
    await _loadReadinessData(certId);
}

async function _loadReadinessData(certId) {
    if (!certId) return;
    try {
        const [readiness, domains, trends, weakQs, resources] = await Promise.all([
            getCertReadiness(certId),
            getCertPerformance(certId),
            getCertTrends(certId),
            getWeakQuestions(certId, 10),
            getStudyResources(certId).catch(() => []),
        ]);
        _readiness = readiness;
        _domains = domains || [];
        _trends = trends || [];
        _weakQs = weakQs || [];
        _resources = resources || [];
        _resourcesLoaded = true;
    } catch (e) {
        console.warn('Readiness data load failed:', e);
    }
    _dataLoaded = true;
    if (getState().view === 'readiness') setState({});
}

async function _loadObjectivesData(certId) {
    if (!certId) return;
    try {
        _objectives = await getCertObjectives(certId);
    } catch (e) {
        console.warn('Objectives load failed:', e);
        _objectives = [];
    }
    _objectivesLoaded = true;
    if (getState().view === 'readiness') setState({});
}

export async function setObjectiveConfidence(domainId, confidence) {
    if (!_activeCertId) return;
    for (const domain of _objectives) {
        if (domain.domain_id === domainId) domain.confidence = confidence;
        for (const obj of (domain.objectives || [])) {
            if (obj.domain_id === domainId) obj.confidence = confidence;
        }
    }
    setState({});
    try {
        await updateObjectiveConfidence(_activeCertId, { [domainId]: confidence });
    } catch (e) {
        showToast('Failed to save confidence rating', 'error');
    }
}

export function toggleObjectiveDomain(domainId) {
    if (_expandedDomains.has(domainId)) _expandedDomains.delete(domainId);
    else _expandedDomains.add(domainId);
    setState({});
}

// ==================== MAIN RENDER ====================

export function renderReadiness() {
    const state = getState();
    const certs = state.userCertifications || [];

    if (!_activeCertId && certs.length > 0) {
        _activeCertId = certs[0].certification_id;
        if (!_dataLoaded) _loadReadinessData(_activeCertId);
    }

    if (certs.length === 0) {
        return `
        ${renderNav('readiness')}
        <main class="readiness-main">
            <div class="container">
                <div class="readiness-no-certs">
                    <div class="no-certs-icon">${icon('barChart', 'icon-2xl')}</div>
                    <h2>No Certifications Enrolled</h2>
                    <p class="text-muted">Enroll in a certification to access your full prep workspace.</p>
                    <button class="btn btn-primary" onclick="window.app.showCertPicker()">
                        ${icon('plus')} Add Certification
                    </button>
                </div>
            </div>
        </main>
        <div class="mobile-tab-spacer"></div>
        `;
    }

    const activeCert = certs.find(c => c.certification_id === _activeCertId) || certs[0];
    const readinessScore = _readiness?.overall_score ?? 0;
    const gaugeClass = readinessScore >= 70 ? 'gauge-good' : readinessScore >= 40 ? 'gauge-ok' : 'gauge-low';

    return `
    ${renderNav('readiness')}

    <main class="readiness-main">
        <div class="container">

            <!-- Cert selector (pills) -->
            <div class="readiness-cert-pills">
                ${certs.map(c => `
                    <button class="cert-pill ${c.certification_id === _activeCertId ? 'active' : ''}"
                            onclick="window.app.selectReadinessCert(${c.certification_id})">
                        ${escapeHtml(c.code || c.name || 'Cert')}
                    </button>
                `).join('')}
                <button class="cert-pill cert-pill-add" onclick="window.app.showCertPicker()">
                    ${icon('plus')} Add
                </button>
            </div>

            <!-- Cert heading + readiness gauge -->
            <div class="readiness-hero">
                <div class="readiness-gauge-wrap">
                    <svg viewBox="0 0 36 36" class="readiness-gauge-svg">
                        <path class="gauge-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                        <path class="gauge-arc ${gaugeClass}"
                              stroke-dasharray="${_dataLoaded ? readinessScore : 0}, 100"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                    </svg>
                    <div class="readiness-gauge-label">
                        <div class="gauge-big-num">${_dataLoaded ? readinessScore + '%' : '...'}</div>
                        <div class="gauge-caption text-muted">Readiness</div>
                    </div>
                </div>
                <div class="readiness-hero-info">
                    <h2>${escapeHtml(activeCert.name || 'Certification')}</h2>
                    <p class="text-muted">${escapeHtml(activeCert.code || '')}</p>
                    ${activeCert.target_date ? `<p class="readiness-target-date">${icon('crosshair')} Target: ${new Date(activeCert.target_date).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' })}</p>` : ''}
                    <button class="btn btn-ghost btn-sm readiness-remove-btn"
                            onclick="window.app.unenrollCert(${activeCert.certification_id}, '${escapeHtml(activeCert.name || '')}')">
                        Remove
                    </button>
                </div>
            </div>

            <!-- View content -->
            ${_activeView === 'workspace' ? renderWorkspaceGrid(activeCert) : `
                <button class="btn btn-ghost workspace-back-btn" onclick="window.app.setWorkspaceView('workspace')">
                    ${icon('chevronLeft')} Back to Workspace
                </button>
                <div class="workspace-detail-view">
                    ${_activeView === 'practice-exams' ? renderPracticeExams(activeCert) : ''}
                    ${_activeView === 'domain-readiness' ? renderDomainReadiness(activeCert) : ''}
                    ${_activeView === 'objectives' ? renderObjectivesView(activeCert) : ''}
                    ${_activeView === 'weak-points' ? renderWeakPoints() : ''}
                    ${_activeView === 'pbq' ? renderPBQShell(activeCert) : ''}
                    ${_activeView === 'study-guides' ? renderStudyGuidesShell(activeCert) : ''}
                    ${_activeView === 'flashcards' ? renderFlashcardsShell(activeCert) : ''}
                    ${_activeView === 'quick-notes' ? renderQuickNotesShell(activeCert) : ''}
                    ${_activeView === 'mini-games' ? renderMiniGamesShell(activeCert) : ''}
                </div>
            `}

        </div>
    </main>
    <div class="mobile-tab-spacer"></div>
    `;
}

// ==================== WORKSPACE GRID ====================

function renderWorkspaceGrid(cert) {
    const prediction = _readiness?.prediction;
    const simCount = _trends.length;
    const weakCount = _weakQs.length;
    const domainCount = _domains.length;

    return `
    <div class="workspace-grid">

        <!-- ROW 1: Primary study tools -->
        <div class="ws-block ws-block-primary" onclick="window.app.setWorkspaceView('practice-exams')">
            <div class="ws-block-icon ws-icon-exams">${icon('penLine')}</div>
            <div class="ws-block-body">
                <h3 class="ws-block-title">Practice Exams</h3>
                <p class="ws-block-desc">Timed simulations under real exam conditions with domain-weighted question selection</p>
                ${simCount > 0 ? `<div class="ws-block-stat">${simCount} attempt${simCount !== 1 ? 's' : ''} completed</div>` : `<div class="ws-block-stat ws-stat-ready">Ready to start</div>`}
            </div>
            <div class="ws-block-arrow">${icon('chevronRight')}</div>
        </div>

        <div class="ws-block ws-block-primary" onclick="window.app.setWorkspaceView('domain-readiness')">
            <div class="ws-block-icon ws-icon-domains">${icon('layers')}</div>
            <div class="ws-block-body">
                <h3 class="ws-block-title">Domain Readiness</h3>
                <p class="ws-block-desc">Performance breakdown by exam domain with readiness prediction and study time tracking</p>
                ${domainCount > 0 ? `<div class="ws-block-stat">${domainCount} domains tracked</div>` : `<div class="ws-block-stat ws-stat-empty">No data yet</div>`}
            </div>
            <div class="ws-block-arrow">${icon('chevronRight')}</div>
        </div>

        <div class="ws-block ws-block-primary" onclick="window.app.setWorkspaceView('pbq')">
            <div class="ws-block-icon ws-icon-pbq">${icon('terminal')}</div>
            <div class="ws-block-body">
                <h3 class="ws-block-title">PBQ Simulations</h3>
                <p class="ws-block-desc">Performance-based question labs with interactive scenarios, drag-and-drop, and CLI simulations</p>
                <div class="ws-block-stat ws-stat-coming">Coming soon</div>
            </div>
            <div class="ws-block-arrow">${icon('chevronRight')}</div>
        </div>

        <!-- ROW 2: Study & review tools -->
        <div class="ws-block" onclick="window.app.setWorkspaceView('objectives')">
            <div class="ws-block-icon ws-icon-objectives">${icon('listChecks')}</div>
            <div class="ws-block-body">
                <h3 class="ws-block-title">Exam Objectives</h3>
                <p class="ws-block-desc">Track your self-assessed confidence on every exam objective and sub-objective</p>
                <div class="ws-block-stat">${_objectivesLoaded && _objectives.length > 0 ? `${_objectives.length} domains` : 'Self-assessment tracker'}</div>
            </div>
            <div class="ws-block-arrow">${icon('chevronRight')}</div>
        </div>

        <div class="ws-block" onclick="window.app.setWorkspaceView('study-guides')">
            <div class="ws-block-icon ws-icon-guides">${icon('bookOpen')}</div>
            <div class="ws-block-body">
                <h3 class="ws-block-title">Study Guides</h3>
                <p class="ws-block-desc">Curated study material organized by domain with key concepts, mnemonics, and reference tables</p>
                <div class="ws-block-stat ws-stat-coming">Coming soon</div>
            </div>
            <div class="ws-block-arrow">${icon('chevronRight')}</div>
        </div>

        <div class="ws-block" onclick="window.app.setWorkspaceView('flashcards')">
            <div class="ws-block-icon ws-icon-flashcards">${icon('copy')}</div>
            <div class="ws-block-body">
                <h3 class="ws-block-title">Flashcards</h3>
                <p class="ws-block-desc">Spaced-repetition flashcard decks organized by exam domain for rapid knowledge retention</p>
                <div class="ws-block-stat ws-stat-coming">Coming soon</div>
            </div>
            <div class="ws-block-arrow">${icon('chevronRight')}</div>
        </div>

        <!-- ROW 3: Supplemental tools -->
        <div class="ws-block" onclick="window.app.setWorkspaceView('weak-points')">
            <div class="ws-block-icon ws-icon-weak">${icon('sparkles')}</div>
            <div class="ws-block-body">
                <h3 class="ws-block-title">Weak Points</h3>
                <p class="ws-block-desc">Questions you struggle with most, ranked by error rate to target your weakest areas</p>
                ${weakCount > 0 ? `<div class="ws-block-stat ws-stat-alert">${weakCount} area${weakCount !== 1 ? 's' : ''} to review</div>` : `<div class="ws-block-stat ws-stat-empty">No weak spots identified</div>`}
            </div>
            <div class="ws-block-arrow">${icon('chevronRight')}</div>
        </div>

        <div class="ws-block" onclick="window.app.setWorkspaceView('quick-notes')">
            <div class="ws-block-icon ws-icon-notes">${icon('edit')}</div>
            <div class="ws-block-body">
                <h3 class="ws-block-title">Quick Notes</h3>
                <p class="ws-block-desc">Personal notes, cheat sheets, and reference material you build as you study</p>
                <div class="ws-block-stat ws-stat-coming">Coming soon</div>
            </div>
            <div class="ws-block-arrow">${icon('chevronRight')}</div>
        </div>

        <div class="ws-block" onclick="window.app.setWorkspaceView('mini-games')">
            <div class="ws-block-icon ws-icon-games">${icon('gamepad')}</div>
            <div class="ws-block-body">
                <h3 class="ws-block-title">Mini Games</h3>
                <p class="ws-block-desc">Gamified drills — term matching, speed rounds, and domain challenges to reinforce learning</p>
                <div class="ws-block-stat ws-stat-coming">Coming soon</div>
            </div>
            <div class="ws-block-arrow">${icon('chevronRight')}</div>
        </div>

    </div>

    <!-- Study Resources (if available) -->
    ${_resourcesLoaded && _resources.length > 0 ? `
    <div class="workspace-resources">
        <h3 class="ws-resources-title">${icon('bookOpen')} Study Resources</h3>
        <div class="resources-list">
            ${_resources.slice(0, 5).map(r => {
                const typeIcon = r.resource_type === 'video' ? 'play' : r.resource_type === 'book' ? 'bookOpen' : 'link';
                return `
                <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener" class="resource-item">
                    <div class="resource-icon">${icon(typeIcon)}</div>
                    <div class="resource-body">
                        <div class="resource-title">${escapeHtml(r.title)}</div>
                        <div class="resource-meta text-muted">
                            ${escapeHtml(r.provider || '')}
                            ${r.is_free ? '<span class="resource-free-badge">Free</span>' : ''}
                        </div>
                    </div>
                    <div class="resource-arrow">${icon('chevronRight')}</div>
                </a>
                `;
            }).join('')}
        </div>
    </div>
    ` : ''}
    `;
}

// ==================== PRACTICE EXAMS (was Simulate tab) ====================

function renderPracticeExams(cert) {
    return `
    <div class="ws-detail-section">
        <h2 class="ws-detail-title">${icon('penLine')} Practice Exams</h2>
        <div class="simulate-content">
            <div class="simulate-card">
                <div class="simulate-icon">${icon('penLine', 'icon-2xl')}</div>
                <h3>Exam Simulation</h3>
                <p class="text-muted">
                    Practice under real exam conditions — timed, randomized questions from all domains of
                    <strong>${escapeHtml(cert.name || 'this certification')}</strong>.
                </p>
                <ul class="simulate-features">
                    <li>${icon('clock')} Timed (mirrors real exam duration)</li>
                    <li>${icon('layers')} Questions from all domains</li>
                    <li>${icon('barChart')} Detailed score breakdown on completion</li>
                </ul>
                <button class="btn btn-primary btn-lg" onclick="window.app.startSimulation(${cert.certification_id})">
                    ${icon('penLine')} Start Simulation
                </button>
            </div>
        </div>
        ${_trends.length > 0 ? `
        <div class="readiness-card" style="margin-top:1.5rem">
            <h3 class="readiness-card-title">${icon('clock')} Recent Results</h3>
            <div class="trend-list">
                ${_trends.slice(0, 6).map(t => {
                    const pct = Math.round(t.score || 0);
                    return `
                    <div class="trend-row">
                        <div class="trend-info">
                            <div class="trend-quiz">${escapeHtml(t.quiz_title || 'Practice Exam')}</div>
                            <div class="trend-date text-muted">${new Date(t.completed_at || t.date).toLocaleDateString(undefined, { month:'short', day:'numeric' })}</div>
                        </div>
                        <div class="trend-score ${pct >= 70 ? 'score-good' : pct >= 40 ? 'score-ok' : 'score-low'}">${pct}%</div>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>
        ` : ''}
    </div>
    `;
}

// ==================== DOMAIN READINESS (was Overview tab) ====================

function renderDomainReadiness(cert) {
    if (!_dataLoaded) {
        return `<div class="readiness-loading"><div class="spinner"></div><p class="text-muted">Loading data...</p></div>`;
    }

    const prediction = _readiness?.prediction;
    const studyTime = _readiness?.study_time;

    return `
    <div class="ws-detail-section">
        <h2 class="ws-detail-title">${icon('layers')} Domain Readiness</h2>
        <div class="overview-grid">

            <!-- Readiness Signal card -->
            <div class="readiness-card readiness-signal-card">
                <h3 class="readiness-card-title">${icon('shield')} Readiness Signal</h3>
                ${prediction ? `
                <div class="signal-content">
                    <div class="signal-badge ${prediction.likely_pass ? 'signal-pass' : 'signal-fail'}">
                        ${prediction.likely_pass ? 'Likely to Pass' : 'Not Yet Ready'}
                    </div>
                    <div class="signal-meta">
                        <span class="signal-confidence">Confidence: <strong>${prediction.confidence}</strong></span>
                        <span class="signal-trend">
                            Trend: <strong>${prediction.trend}</strong>
                            ${prediction.trend === 'improving' ? '<span class="trend-arrow trend-up"></span>' : ''}
                            ${prediction.trend === 'declining' ? '<span class="trend-arrow trend-down"></span>' : ''}
                            ${prediction.trend === 'stable' ? '<span class="trend-arrow trend-flat"></span>' : ''}
                        </span>
                    </div>
                    ${studyTime ? `
                    <div class="signal-study-time">
                        <span>${icon('clock')} ${studyTime.total_hours}h studied</span>
                        <span class="text-muted">(${studyTime.sessions} sessions, last 30 days)</span>
                    </div>
                    ` : ''}
                </div>
                ` : `
                <p class="text-muted">Complete a few practice exams to generate your readiness prediction.</p>
                `}
            </div>

            <!-- Domain performance bars -->
            <div class="readiness-card">
                <h3 class="readiness-card-title">${icon('layers')} Domain Performance</h3>
                ${_domains.length === 0 ? `
                    <p class="text-muted">No performance data yet. Complete practice exams to see your domain breakdown.</p>
                ` : `
                <div class="domain-bars">
                    ${_domains.map(d => {
                        const pct = Math.round(d.accuracy || 0);
                        const barClass = pct >= 70 ? 'bar-good' : pct >= 40 ? 'bar-ok' : 'bar-low';
                        return `
                        <div class="domain-bar-row">
                            <div class="domain-bar-label">${escapeHtml(d.domain_name || d.name || 'Domain')}</div>
                            <div class="domain-bar-track">
                                <div class="domain-bar-fill ${barClass}" style="width:${pct}%"></div>
                            </div>
                            <div class="domain-bar-pct ${barClass}-text">${pct}%</div>
                        </div>
                        `;
                    }).join('')}
                </div>
                `}
            </div>

            <!-- Trend / recent performance -->
            <div class="readiness-card">
                <h3 class="readiness-card-title">${icon('clock')} Recent Activity</h3>
                ${_trends.length === 0 ? `
                    <p class="text-muted">No practice exam results yet.</p>
                ` : `
                <div class="trend-list">
                    ${_trends.slice(0, 6).map(t => {
                        const pct = Math.round(t.score || 0);
                        return `
                        <div class="trend-row">
                            <div class="trend-info">
                                <div class="trend-quiz">${escapeHtml(t.quiz_title || 'Practice Exam')}</div>
                                <div class="trend-date text-muted">${new Date(t.completed_at || t.date).toLocaleDateString(undefined, { month:'short', day:'numeric' })}</div>
                            </div>
                            <div class="trend-score ${pct >= 70 ? 'score-good' : pct >= 40 ? 'score-ok' : 'score-low'}">${pct}%</div>
                        </div>
                        `;
                    }).join('')}
                </div>
                `}
            </div>

        </div>
    </div>
    `;
}

// ==================== OBJECTIVES (existing) ====================

const CONFIDENCE_LABELS = ['Not Started', 'Learning', 'Reviewing', 'Confident'];
const CONFIDENCE_CLASSES = ['conf-none', 'conf-learning', 'conf-reviewing', 'conf-confident'];

function renderObjectivesView(cert) {
    if (!_objectivesLoaded) {
        return `<div class="readiness-loading"><div class="spinner"></div><p class="text-muted">Loading objectives...</p></div>`;
    }

    if (_objectives.length === 0) {
        return `
        <div class="ws-detail-section">
            <h2 class="ws-detail-title">${icon('listChecks')} Exam Objectives</h2>
            <div class="weak-empty">
                <div class="weak-empty-icon">${icon('listChecks', 'icon-2xl')}</div>
                <h3>No Objectives Available</h3>
                <p class="text-muted">Exam objectives haven't been loaded for this certification yet.</p>
            </div>
        </div>
        `;
    }

    let totalObj = 0, totalConf = 0;
    for (const d of _objectives) {
        for (const obj of (d.objectives || [])) { totalObj++; totalConf += obj.confidence; }
    }
    const confPct = totalObj > 0 ? Math.round(totalConf / (totalObj * 3) * 100) : 0;

    return `
    <div class="ws-detail-section">
        <h2 class="ws-detail-title">${icon('listChecks')} Exam Objectives</h2>
        <div class="objectives-section">
            <div class="objectives-summary">
                <div class="objectives-summary-gauge">
                    <div class="obj-gauge-bar">
                        <div class="obj-gauge-fill" style="width:${confPct}%"></div>
                    </div>
                    <span class="obj-gauge-label">${confPct}% Self-Assessed Confidence</span>
                </div>
                <p class="text-muted objectives-hint">Rate your confidence on each exam objective. Click a domain to expand.</p>
            </div>
            <div class="objectives-domains">
                ${_objectives.map(d => {
                    const isExpanded = _expandedDomains.has(d.domain_id);
                    const children = d.objectives || [];
                    let dConf = 0, dTotal = 0;
                    for (const obj of children) { dTotal++; dConf += obj.confidence; }
                    const dPct = dTotal > 0 ? Math.round(dConf / (dTotal * 3) * 100) : 0;
                    const dClass = dPct >= 75 ? 'bar-good' : dPct >= 40 ? 'bar-ok' : 'bar-low';
                    return `
                    <div class="obj-domain ${isExpanded ? 'expanded' : ''}">
                        <button class="obj-domain-header" onclick="window.app.toggleObjectiveDomain(${d.domain_id})">
                            <div class="obj-domain-left">
                                <span class="obj-domain-code">${escapeHtml(d.code || '')}</span>
                                <span class="obj-domain-name">${escapeHtml(d.name)}</span>
                                ${d.weight ? `<span class="obj-domain-weight">${Math.round(d.weight * 100)}%</span>` : ''}
                            </div>
                            <div class="obj-domain-right">
                                <div class="obj-mini-bar">
                                    <div class="obj-mini-fill ${dClass}" style="width:${dPct}%"></div>
                                </div>
                                <span class="obj-domain-chevron">${icon('chevronRight')}</span>
                            </div>
                        </button>
                        ${isExpanded && children.length > 0 ? `
                        <div class="obj-children">
                            ${children.map(obj => `
                            <div class="obj-item">
                                <div class="obj-item-info">
                                    <span class="obj-item-code">${escapeHtml(obj.code || '')}</span>
                                    <span class="obj-item-name">${escapeHtml(obj.name)}</span>
                                </div>
                                <div class="obj-confidence-btns">
                                    ${[0, 1, 2, 3].map(level => `
                                        <button class="obj-conf-btn ${obj.confidence === level ? CONFIDENCE_CLASSES[level] + ' active' : ''}"
                                                onclick="window.app.setObjectiveConfidence(${obj.domain_id}, ${level})"
                                                title="${CONFIDENCE_LABELS[level]}">
                                            ${CONFIDENCE_LABELS[level].charAt(0)}
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                            `).join('')}
                        </div>
                        ` : ''}
                    </div>
                    `;
                }).join('')}
            </div>
        </div>
    </div>
    `;
}

// ==================== WEAK POINTS (existing) ====================

function renderWeakPoints() {
    if (!_dataLoaded) {
        return `<div class="readiness-loading"><div class="spinner"></div><p class="text-muted">Loading weak points...</p></div>`;
    }

    return `
    <div class="ws-detail-section">
        <h2 class="ws-detail-title">${icon('sparkles')} Weak Points</h2>
        ${_weakQs.length === 0 ? `
        <div class="weak-empty">
            <div class="weak-empty-icon">${icon('sparkles', 'icon-2xl')}</div>
            <h3>No weak points yet!</h3>
            <p class="text-muted">Complete more practice exams to identify areas to improve.</p>
        </div>
        ` : `
        <div class="weak-list">
            ${_weakQs.map((q, i) => {
                const acc = Math.round(q.accuracy ?? 0);
                const accClass = acc < 40 ? 'acc-danger' : acc < 65 ? 'acc-warn' : 'acc-ok';
                return `
                <div class="weak-item">
                    <div class="weak-rank">#${i + 1}</div>
                    <div class="weak-body">
                        <div class="weak-domain text-muted">${escapeHtml(q.domain_name || q.topic || 'Topic')}</div>
                        <div class="weak-question">${escapeHtml((q.question_text || '').slice(0, 120))}${(q.question_text || '').length > 120 ? '...' : ''}</div>
                    </div>
                    <div class="weak-acc ${accClass}">${acc}%</div>
                </div>
                `;
            }).join('')}
        </div>
        `}
    </div>
    `;
}

// ==================== SHELL VIEWS (content coming later) ====================

function renderPBQShell(cert) {
    return `
    <div class="ws-detail-section">
        <h2 class="ws-detail-title">${icon('terminal')} PBQ Simulations</h2>
        <div class="ws-shell-content">
            <div class="ws-shell-icon">${icon('terminal', 'icon-2xl')}</div>
            <h3>Performance-Based Questions</h3>
            <p class="ws-shell-desc">
                Interactive lab scenarios that go beyond multiple choice. Configure network devices,
                troubleshoot systems, analyze logs, and solve real-world problems in a simulated environment.
            </p>
            <div class="ws-shell-features">
                <div class="ws-shell-feature">
                    <div class="ws-feature-icon">${icon('monitor')}</div>
                    <div class="ws-feature-text">
                        <strong>CLI Simulations</strong>
                        <span>Practice command-line tasks in a simulated terminal</span>
                    </div>
                </div>
                <div class="ws-shell-feature">
                    <div class="ws-feature-icon">${icon('move')}</div>
                    <div class="ws-feature-text">
                        <strong>Drag-and-Drop Labs</strong>
                        <span>Build network topologies, match configurations, and order procedures</span>
                    </div>
                </div>
                <div class="ws-shell-feature">
                    <div class="ws-feature-icon">${icon('search')}</div>
                    <div class="ws-feature-text">
                        <strong>Scenario Analysis</strong>
                        <span>Read scenarios and select the correct sequence of actions</span>
                    </div>
                </div>
            </div>
            <div class="ws-shell-status">
                <span class="ws-status-badge">Content in development</span>
                <p class="text-muted">PBQ labs for <strong>${escapeHtml(cert.name || 'this certification')}</strong> are being authored. Check back soon.</p>
            </div>
        </div>
    </div>
    `;
}

function renderStudyGuidesShell(cert) {
    return `
    <div class="ws-detail-section">
        <h2 class="ws-detail-title">${icon('bookOpen')} Study Guides</h2>
        <div class="ws-shell-content">
            <div class="ws-shell-icon">${icon('bookOpen', 'icon-2xl')}</div>
            <h3>Certification Study Guides</h3>
            <p class="ws-shell-desc">
                Comprehensive, domain-organized study material covering every exam objective.
                Key concepts, definitions, diagrams, comparison tables, and mnemonics — all in one place.
            </p>
            <div class="ws-shell-features">
                <div class="ws-shell-feature">
                    <div class="ws-feature-icon">${icon('layers')}</div>
                    <div class="ws-feature-text">
                        <strong>Domain-Organized</strong>
                        <span>Material structured by official exam domains and objectives</span>
                    </div>
                </div>
                <div class="ws-shell-feature">
                    <div class="ws-feature-icon">${icon('listChecks')}</div>
                    <div class="ws-feature-text">
                        <strong>Key Concepts</strong>
                        <span>Essential terms, protocols, and definitions highlighted</span>
                    </div>
                </div>
                <div class="ws-shell-feature">
                    <div class="ws-feature-icon">${icon('barChart')}</div>
                    <div class="ws-feature-text">
                        <strong>Reference Tables</strong>
                        <span>Port numbers, protocol comparisons, and quick-reference charts</span>
                    </div>
                </div>
            </div>
            <div class="ws-shell-status">
                <span class="ws-status-badge">Content in development</span>
                <p class="text-muted">Study guides for <strong>${escapeHtml(cert.name || 'this certification')}</strong> are being written. Check back soon.</p>
            </div>
        </div>
    </div>
    `;
}

function renderFlashcardsShell(cert) {
    return `
    <div class="ws-detail-section">
        <h2 class="ws-detail-title">${icon('copy')} Flashcards</h2>
        <div class="ws-shell-content">
            <div class="ws-shell-icon">${icon('copy', 'icon-2xl')}</div>
            <h3>Certification Flashcards</h3>
            <p class="ws-shell-desc">
                Pre-built flashcard decks for every exam domain, powered by spaced repetition.
                Learn terms, concepts, and procedures through active recall.
            </p>
            <div class="ws-shell-features">
                <div class="ws-shell-feature">
                    <div class="ws-feature-icon">${icon('clock')}</div>
                    <div class="ws-feature-text">
                        <strong>Spaced Repetition</strong>
                        <span>Cards resurface at optimal intervals based on your recall accuracy</span>
                    </div>
                </div>
                <div class="ws-shell-feature">
                    <div class="ws-feature-icon">${icon('layers')}</div>
                    <div class="ws-feature-text">
                        <strong>Domain Decks</strong>
                        <span>Focus on specific exam domains or study all at once</span>
                    </div>
                </div>
                <div class="ws-shell-feature">
                    <div class="ws-feature-icon">${icon('barChart')}</div>
                    <div class="ws-feature-text">
                        <strong>Progress Tracking</strong>
                        <span>See which cards you've mastered and which need more review</span>
                    </div>
                </div>
            </div>
            <div class="ws-shell-status">
                <span class="ws-status-badge">Content in development</span>
                <p class="text-muted">Flashcard decks for <strong>${escapeHtml(cert.name || 'this certification')}</strong> are being created. Check back soon.</p>
            </div>
        </div>
    </div>
    `;
}

function renderQuickNotesShell(cert) {
    return `
    <div class="ws-detail-section">
        <h2 class="ws-detail-title">${icon('edit')} Quick Notes</h2>
        <div class="ws-shell-content">
            <div class="ws-shell-icon">${icon('edit', 'icon-2xl')}</div>
            <h3>Quick Notes</h3>
            <p class="ws-shell-desc">
                Your personal notepad for this certification. Jot down key takeaways, mnemonics,
                and anything you want to remember — organized alongside your study material.
            </p>
            <div class="ws-shell-features">
                <div class="ws-shell-feature">
                    <div class="ws-feature-icon">${icon('edit')}</div>
                    <div class="ws-feature-text">
                        <strong>Personal Notes</strong>
                        <span>Write and organize notes tied to specific domains</span>
                    </div>
                </div>
                <div class="ws-shell-feature">
                    <div class="ws-feature-icon">${icon('search')}</div>
                    <div class="ws-feature-text">
                        <strong>Searchable</strong>
                        <span>Quickly find any note across all your study material</span>
                    </div>
                </div>
                <div class="ws-shell-feature">
                    <div class="ws-feature-icon">${icon('share')}</div>
                    <div class="ws-feature-text">
                        <strong>Cheat Sheets</strong>
                        <span>Build exam-day reference sheets with key formulas and facts</span>
                    </div>
                </div>
            </div>
            <div class="ws-shell-status">
                <span class="ws-status-badge">Content in development</span>
                <p class="text-muted">Quick notes for <strong>${escapeHtml(cert.name || 'this certification')}</strong> will be available soon.</p>
            </div>
        </div>
    </div>
    `;
}

function renderMiniGamesShell(cert) {
    return `
    <div class="ws-detail-section">
        <h2 class="ws-detail-title">${icon('gamepad')} Mini Games</h2>
        <div class="ws-shell-content">
            <div class="ws-shell-icon">${icon('gamepad', 'icon-2xl')}</div>
            <h3>Study Mini Games</h3>
            <p class="ws-shell-desc">
                Gamified study activities that make reviewing fun. Compete against yourself,
                beat high scores, and reinforce knowledge through play.
            </p>
            <div class="ws-shell-features">
                <div class="ws-shell-feature">
                    <div class="ws-feature-icon">${icon('link')}</div>
                    <div class="ws-feature-text">
                        <strong>Term Matcher</strong>
                        <span>Match terms to definitions in a timed memory game</span>
                    </div>
                </div>
                <div class="ws-shell-feature">
                    <div class="ws-feature-icon">${icon('clock')}</div>
                    <div class="ws-feature-text">
                        <strong>Speed Rounds</strong>
                        <span>Answer as many questions as possible in 60 seconds</span>
                    </div>
                </div>
                <div class="ws-shell-feature">
                    <div class="ws-feature-icon">${icon('award')}</div>
                    <div class="ws-feature-text">
                        <strong>Domain Challenge</strong>
                        <span>Test your mastery of a single domain in a focused challenge</span>
                    </div>
                </div>
            </div>
            <div class="ws-shell-status">
                <span class="ws-status-badge">Content in development</span>
                <p class="text-muted">Mini games for <strong>${escapeHtml(cert.name || 'this certification')}</strong> are being built. Check back soon.</p>
            </div>
        </div>
    </div>
    `;
}
