/* Readiness Center - 4 tabs: Overview, Objectives, Simulate, Weak Points */
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
let _tab = 'overview';          // 'overview' | 'objectives' | 'simulate' | 'weak'
let _activeCertId = null;       // currently selected cert
let _readiness = null;          // getCertReadiness response
let _domains = [];              // getCertPerformance response
let _trends = [];               // getCertTrends response
let _weakQs = [];               // getWeakQuestions response
let _objectives = [];           // getCertObjectives response
let _resources = [];            // getStudyResources response
let _dataLoaded = false;
let _objectivesLoaded = false;
let _resourcesLoaded = false;
let _expandedDomains = new Set(); // track which domains are expanded in objectives tab

export function setReadinessTab(tab) {
    _tab = tab;
    // Lazy-load objectives and resources data
    if (tab === 'objectives' && !_objectivesLoaded && _activeCertId) {
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
    // Optimistic update
    for (const domain of _objectives) {
        if (domain.domain_id === domainId) {
            domain.confidence = confidence;
        }
        for (const obj of (domain.objectives || [])) {
            if (obj.domain_id === domainId) {
                obj.confidence = confidence;
            }
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
    if (_expandedDomains.has(domainId)) {
        _expandedDomains.delete(domainId);
    } else {
        _expandedDomains.add(domainId);
    }
    setState({});
}

export function renderReadiness() {
    const state = getState();
    const certs = state.userCertifications || [];

    // Auto-select first cert if none selected
    if (!_activeCertId && certs.length > 0) {
        _activeCertId = certs[0].certification_id;
        if (!_dataLoaded) {
            _loadReadinessData(_activeCertId);
        }
    }

    if (certs.length === 0) {
        return `
        ${renderNav('readiness')}
        <main class="readiness-main">
            <div class="container">
                <div class="readiness-no-certs">
                    <div class="no-certs-icon">${icon('barChart', 'icon-2xl')}</div>
                    <h2>No Certifications Enrolled</h2>
                    <p class="text-muted">Enroll in a certification to track your readiness and target weak areas.</p>
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
                        <div class="gauge-big-num">${_dataLoaded ? readinessScore + '%' : '…'}</div>
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

            <!-- Tabs -->
            <div class="readiness-tabs">
                <button class="readiness-tab ${_tab === 'overview' ? 'active' : ''}" onclick="window.app.setReadinessTab('overview')">
                    ${icon('barChart')} Overview
                </button>
                <button class="readiness-tab ${_tab === 'objectives' ? 'active' : ''}" onclick="window.app.setReadinessTab('objectives')">
                    ${icon('listChecks')} Objectives
                </button>
                <button class="readiness-tab ${_tab === 'simulate' ? 'active' : ''}" onclick="window.app.setReadinessTab('simulate')">
                    ${icon('penLine')} Simulate
                </button>
                <button class="readiness-tab ${_tab === 'weak' ? 'active' : ''}" onclick="window.app.setReadinessTab('weak')">
                    ${icon('sparkles')} Weak Points
                </button>
            </div>

            <!-- Tab content -->
            <div class="readiness-tab-body">
                ${_tab === 'overview' ? renderOverviewTab(activeCert) : ''}
                ${_tab === 'objectives' ? renderObjectivesTab(activeCert) : ''}
                ${_tab === 'simulate' ? renderSimulateTab(activeCert) : ''}
                ${_tab === 'weak' ? renderWeakTab() : ''}
            </div>

        </div>
    </main>
    <div class="mobile-tab-spacer"></div>
    `;
}

function renderOverviewTab(cert) {
    if (!_dataLoaded) {
        return `<div class="readiness-loading"><div class="spinner"></div><p class="text-muted">Loading data…</p></div>`;
    }

    const prediction = _readiness?.prediction;
    const studyTime = _readiness?.study_time;

    return `
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
            <p class="text-muted">Take a few simulations to generate your readiness prediction.</p>
            `}
        </div>

        <!-- Domain performance bars -->
        <div class="readiness-card">
            <h3 class="readiness-card-title">${icon('layers')} Domain Performance</h3>
            ${_domains.length === 0 ? `
                <p class="text-muted">No quiz data yet. Take some quizzes linked to this certification.</p>
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
                <p class="text-muted">No recent quiz attempts for this certification.</p>
            ` : `
            <div class="trend-list">
                ${_trends.slice(0, 6).map(t => {
                    const pct = Math.round(t.score || 0);
                    return `
                    <div class="trend-row">
                        <div class="trend-info">
                            <div class="trend-quiz">${escapeHtml(t.quiz_title || 'Quiz')}</div>
                            <div class="trend-date text-muted">${new Date(t.completed_at || t.date).toLocaleDateString(undefined, { month:'short', day:'numeric' })}</div>
                        </div>
                        <div class="trend-score ${pct >= 70 ? 'score-good' : pct >= 40 ? 'score-ok' : 'score-low'}">${pct}%</div>
                    </div>
                    `;
                }).join('')}
            </div>
            `}
        </div>

        <!-- Study Resources card -->
        <div class="readiness-card">
            <h3 class="readiness-card-title">${icon('bookOpen')} Study Resources</h3>
            ${!_resourcesLoaded ? `
                <p class="text-muted">Loading resources…</p>
            ` : _resources.length === 0 ? `
                <p class="text-muted">No study resources available for this certification yet.</p>
            ` : `
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
            `}
        </div>

    </div>
    `;
}

// Confidence level labels and colors
const CONFIDENCE_LABELS = ['Not Started', 'Learning', 'Reviewing', 'Confident'];
const CONFIDENCE_CLASSES = ['conf-none', 'conf-learning', 'conf-reviewing', 'conf-confident'];

function renderObjectivesTab(cert) {
    if (!_objectivesLoaded) {
        return `<div class="readiness-loading"><div class="spinner"></div><p class="text-muted">Loading objectives…</p></div>`;
    }

    if (_objectives.length === 0) {
        return `
        <div class="weak-empty">
            <div class="weak-empty-icon">${icon('listChecks', 'icon-2xl')}</div>
            <h3>No Objectives Available</h3>
            <p class="text-muted">Objectives haven't been defined for this certification yet.</p>
        </div>
        `;
    }

    // Calculate overall self-assessment progress
    let totalObj = 0, totalConf = 0;
    for (const d of _objectives) {
        for (const obj of (d.objectives || [])) {
            totalObj++;
            totalConf += obj.confidence;
        }
    }
    const avgConf = totalObj > 0 ? (totalConf / (totalObj * 3) * 100) : 0;
    const confPct = Math.round(avgConf);

    return `
    <div class="objectives-section">
        <div class="objectives-summary">
            <div class="objectives-summary-gauge">
                <div class="obj-gauge-bar">
                    <div class="obj-gauge-fill" style="width:${confPct}%"></div>
                </div>
                <span class="obj-gauge-label">${confPct}% Self-Assessed Confidence</span>
            </div>
            <p class="text-muted objectives-hint">Rate your confidence on each exam objective to track study progress. Click a domain to expand.</p>
        </div>
        <div class="objectives-domains">
            ${_objectives.map(d => {
                const isExpanded = _expandedDomains.has(d.domain_id);
                const children = d.objectives || [];
                // Domain-level confidence summary
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
    `;
}

function renderSimulateTab(cert) {
    return `
    <div class="simulate-content">
        <div class="simulate-card">
            <div class="simulate-icon">${icon('penLine', 'icon-2xl')}</div>
            <h3>Exam Simulation</h3>
            <p class="text-muted">
                Practice under real exam conditions — timed, randomised questions from all domains of
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
    `;
}

function renderWeakTab() {
    if (!_dataLoaded) {
        return `<div class="readiness-loading"><div class="spinner"></div><p class="text-muted">Loading weak points…</p></div>`;
    }

    if (_weakQs.length === 0) {
        return `
        <div class="weak-empty">
            <div class="weak-empty-icon">${icon('sparkles', 'icon-2xl')}</div>
            <h3>No weak points yet!</h3>
            <p class="text-muted">Take more quizzes linked to this certification to identify areas to improve.</p>
        </div>
        `;
    }

    return `
    <div class="weak-list">
        ${_weakQs.map((q, i) => {
            const acc = Math.round(q.accuracy ?? 0);
            const accClass = acc < 40 ? 'acc-danger' : acc < 65 ? 'acc-warn' : 'acc-ok';
            return `
            <div class="weak-item">
                <div class="weak-rank">#${i + 1}</div>
                <div class="weak-body">
                    <div class="weak-domain text-muted">${escapeHtml(q.domain_name || q.topic || 'Topic')}</div>
                    <div class="weak-question">${escapeHtml((q.question_text || '').slice(0, 120))}${(q.question_text || '').length > 120 ? '…' : ''}</div>
                </div>
                <div class="weak-acc ${accClass}">${acc}%</div>
            </div>
            `;
        }).join('')}
    </div>
    `;
}
