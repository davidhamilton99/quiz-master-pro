/* Readiness Center - 3 tabs: Overview, Simulate, Weak Points (Phase 2.3) */
import { getState, setState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { renderNav } from '../utils/nav.js';
import {
    getUserCertifications, getCertPerformance, getCertTrends,
    getWeakQuestions, getCertReadiness
} from '../services/api.js';
import { showToast } from '../utils/toast.js';
import { showLoading, hideLoading } from '../utils/dom.js';

// Module state
let _tab = 'overview';          // 'overview' | 'simulate' | 'weak'
let _activeCertId = null;       // currently selected cert
let _readiness = null;          // getCertReadiness response
let _domains = [];              // getCertPerformance response
let _trends = [];               // getCertTrends response
let _weakQs = [];               // getWeakQuestions response
let _dataLoaded = false;

export function setReadinessTab(tab) {
    _tab = tab;
    setState({});
}

export async function selectReadinessCert(certId) {
    _activeCertId = certId;
    _dataLoaded = false;
    _readiness = null;
    _domains = [];
    _trends = [];
    _weakQs = [];
    setState({});
    await _loadReadinessData(certId);
}

async function _loadReadinessData(certId) {
    if (!certId) return;
    try {
        const [readiness, domains, trends, weakQs] = await Promise.all([
            getCertReadiness(certId),
            getCertPerformance(certId),
            getCertTrends(certId),
            getWeakQuestions(certId, 10),
        ]);
        _readiness = readiness;
        _domains = domains || [];
        _trends = trends || [];
        _weakQs = weakQs || [];
    } catch (e) {
        console.warn('Readiness data load failed:', e);
    }
    _dataLoaded = true;
    if (getState().view === 'readiness') setState({});
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
                    ${activeCert.target_date ? `<p class="readiness-target-date">🎯 Target: ${new Date(activeCert.target_date).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' })}</p>` : ''}
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

    return `
    <div class="overview-grid">

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
