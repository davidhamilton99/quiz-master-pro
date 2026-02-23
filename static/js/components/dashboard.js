/* Dashboard - Certification Performance Dashboard */

import { getState, setState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { getStudyStats, getCertReadiness } from '../services/api.js';

// Study stats cache (7-day global)
let studyStatsCache = null;
export async function loadStudyStats() {
    try {
        const data = await getStudyStats('week');
        studyStatsCache = data;
        return data;
    } catch (e) {
        console.error('Failed to load study stats:', e);
        return null;
    }
}

// Readiness data cache keyed by certId
let readinessCache = {};
export async function loadReadiness(certId) {
    try {
        const data = await getCertReadiness(certId);
        readinessCache[certId] = data;
        return data;
    } catch (e) {
        console.error('Failed to load readiness:', e);
        return null;
    }
}

function formatStudyTime(seconds) {
    if (!seconds || seconds < 60) return '<1 min';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins} min`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function renderDashboard() {
    const state = getState();
    const certs = state.userCertifications || [];
    const activeCert = state.activeCertification;
    const domains = state.domainPerformance || [];
    const trends = state.certTrends || [];
    const weakQs = state.weakQuestions || [];
    const studyStats = studyStatsCache;

    // Trigger async load if not yet cached
    if (!studyStatsCache) {
        loadStudyStats().then(() => {
            if (getState().view === 'dashboard') setState({});
        });
    }

    return `
<div class="dash-container">
    <div class="dash-header">
        <button class="dash-back" onclick="window.app.navigate('library')">← Library</button>
        <div class="dash-title">Certification Dashboard</div>
        <button class="dash-add-btn" onclick="window.app.showCertPicker()">+ Add Certification</button>
    </div>

    ${studyStats ? `
    <div class="dash-stats-row">
        <div class="dash-stat-card">
            <div class="dash-stat-value">${formatStudyTime(studyStats.stats?.total_seconds || 0)}</div>
            <div class="dash-stat-label">Study Time (7d)</div>
        </div>
        <div class="dash-stat-card">
            <div class="dash-stat-value">${studyStats.stats?.total_questions || 0}</div>
            <div class="dash-stat-label">Questions (7d)</div>
        </div>
        <div class="dash-stat-card">
            <div class="dash-stat-value">${studyStats.stats?.total_questions > 0
                ? Math.round((studyStats.stats?.total_correct || 0) / studyStats.stats.total_questions * 100)
                : 0}%</div>
            <div class="dash-stat-label">Accuracy (7d)</div>
        </div>
        <div class="dash-stat-card">
            <div class="dash-stat-value">${studyStats.stats?.total_sessions || 0}</div>
            <div class="dash-stat-label">Sessions (7d)</div>
        </div>
    </div>` : ''}

    ${certs.length === 0 ? `
        <div class="dash-empty">
            <h3>No certifications enrolled yet</h3>
            <p>Choose a certification to start tracking your progress across exam domains.</p>
            <button class="dash-empty-btn" onclick="window.app.showCertPicker()">Choose a Certification</button>
        </div>
    ` : `
        <div class="dash-certs">
            ${certs.map(cert => {
                const isActive = activeCert && activeCert.certification_id === cert.certification_id;
                return `
                <div class="dash-cert-card${isActive ? ' active' : ''}"
                     onclick="window.app.selectCertAndScroll(${cert.certification_id})">
                    <button class="dash-cert-remove"
                        onclick="event.stopPropagation();window.app.unenrollCert(${cert.certification_id},'${escapeHtml(cert.name)}')"
                        title="Remove certification">✕</button>
                    <div class="dash-cert-vendor">${escapeHtml(cert.vendor)}</div>
                    <div class="dash-cert-name">${escapeHtml(cert.name)}</div>
                    ${cert.target_date ? `<div class="dash-cert-target">Target: ${formatDate(cert.target_date)}</div>` : ''}
                    <div class="dash-cert-actions">
                        <button class="dash-sim-btn"
                            onclick="event.stopPropagation();window.app.startSimulation(${cert.certification_id})">
                            Practice Exam
                        </button>
                    </div>
                </div>`;
            }).join('')}
        </div>

        <div class="dash-detail" id="dash-detail">
            ${activeCert
                ? renderDetailSection(activeCert, domains, trends, weakQs)
                : `<div class="dash-select-hint">Select a certification above to view your performance and readiness.</div>`
            }
        </div>
    `}
</div>`;
}

// ---- Detail: single unified section, no duplicate data ----

function renderDetailSection(cert, domains, trends, weakQs) {
    const certId = cert.certification_id;
    const readiness = readinessCache[certId];

    // Trigger async readiness load if not yet cached
    if (!readiness) {
        loadReadiness(certId).then(() => {
            if (getState().view === 'dashboard') setState({});
        });
    }

    return `
        ${renderReadinessPanel(cert, readiness)}
        ${renderDomainSection(readiness, domains)}
        ${renderSimulationsSection(readiness, trends)}
        ${weakQs.length > 0 ? renderWeakQuestionsSection(weakQs) : ''}
    `;
}

// ---- Exam Readiness Panel (gauge + prediction + meta) ----

function renderReadinessPanel(cert, readiness) {
    if (!readiness) {
        return `
        <div class="dash-skeleton">
            <div style="display:flex;gap:1.5rem;align-items:center">
                <div class="skel-circle"></div>
                <div style="flex:1">
                    <div class="skel-line wide"></div>
                    <div class="skel-line medium"></div>
                    <div class="skel-line short"></div>
                </div>
            </div>
        </div>`;
    }

    const score = readiness.overall_score || 0;
    const prediction = readiness.prediction || {};
    const studyTime = readiness.study_time || {};
    const sims = readiness.simulations || [];
    const certInfo = readiness.certification || {};

    const gaugeColor = score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : score > 0 ? '#ef4444' : '#52525b';
    const circumference = 283;
    const offset = circumference - (score / 100) * circumference;

    const predBadgeClass = prediction.likely_pass ? 'prediction-badge--pass' : 'prediction-badge--fail';
    const predLabel = prediction.likely_pass ? 'Likely to Pass' : 'Needs More Work';
    const predConfidence = prediction.confidence
        ? prediction.confidence.charAt(0).toUpperCase() + prediction.confidence.slice(1)
        : '';

    const trendDir = prediction.trend === 'improving' ? 'up'
                   : prediction.trend === 'declining' ? 'down'
                   : 'stable';
    const trendLabel = trendDir === 'up' ? 'Improving' : trendDir === 'down' ? 'Declining' : 'Stable';
    const trendColor = trendDir === 'up' ? '#34d399' : trendDir === 'down' ? '#ef4444' : 'var(--text-muted)';

    return `
    <div class="readiness-panel">
        <div class="readiness-panel-header">
            <span class="readiness-panel-title">Exam Readiness — ${escapeHtml(certInfo.name || cert.name || '')}</span>
            <div class="readiness-panel-actions">
                <button class="dash-sim-btn" style="width:auto;padding:0.4rem 0.875rem"
                    onclick="window.app.startSimulation(${cert.certification_id})">
                    Take Practice Exam
                </button>
            </div>
        </div>

        <div class="readiness-top-row">
            <div class="readiness-gauge-wrapper">
                <svg class="readiness-gauge" viewBox="0 0 100 100"
                     aria-label="Readiness score: ${Math.round(score)} out of 100" role="img">
                    <circle cx="50" cy="50" r="45" fill="none"
                        stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
                    <circle cx="50" cy="50" r="45" fill="none"
                        stroke="${gaugeColor}" stroke-width="8"
                        stroke-dasharray="${circumference}"
                        stroke-dashoffset="${offset}"
                        stroke-linecap="round"
                        transform="rotate(-90 50 50)"
                        style="transition:stroke-dashoffset 0.8s ease"/>
                    <text x="50" y="46" text-anchor="middle" fill="#f0eef6"
                        font-size="20" font-weight="700" font-family="system-ui,sans-serif">
                        ${Math.round(score)}
                    </text>
                    <text x="50" y="60" text-anchor="middle" fill="#6b6585"
                        font-size="9" font-family="system-ui,sans-serif">
                        / 100
                    </text>
                </svg>
                <span class="readiness-gauge-label">Overall Score</span>
            </div>

            <div class="readiness-summary">
                ${score > 0 ? `
                <div class="prediction-badge ${predBadgeClass}">
                    <span class="prediction-badge-label">${predLabel}</span>
                    ${predConfidence ? `<span class="prediction-badge-confidence">${predConfidence} confidence</span>` : ''}
                </div>` : `
                <div style="color:var(--text-muted);font-size:0.85rem">
                    Take some quizzes to see your readiness prediction.
                </div>`}

                <div class="readiness-meta-row">
                    ${prediction.trend ? `
                    <div class="readiness-meta-item">
                        <span class="readiness-meta-value" style="color:${trendColor}">
                            <span class="trend-icon trend-icon--${trendDir}"></span>
                            ${trendLabel}
                        </span>
                        <span class="readiness-meta-label">Trend</span>
                    </div>` : ''}
                    <div class="readiness-meta-item">
                        <span class="readiness-meta-value">${studyTime.total_hours || 0}h</span>
                        <span class="readiness-meta-label">Study (30d)</span>
                    </div>
                    <div class="readiness-meta-item">
                        <span class="readiness-meta-value">${studyTime.sessions || 0}</span>
                        <span class="readiness-meta-label">Sessions</span>
                    </div>
                    <div class="readiness-meta-item">
                        <span class="readiness-meta-value">${sims.length}</span>
                        <span class="readiness-meta-label">Exams Taken</span>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

// ---- Domain Breakdown (single, de-duplicated) ----
// Prefers rich readiness domain data; falls back to certPerformance data.

function renderDomainSection(readiness, fallbackDomains) {
    const readinessDomains = readiness?.domains;

    if (readinessDomains && readinessDomains.length > 0) {
        return `
        <div class="dash-section">
            <div class="dash-section-title">Domain Breakdown</div>
            <div class="dash-domain-list">
                ${readinessDomains.map(d => {
                    const status = d.status || 'unseen';
                    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
                    return `
                    <div class="dash-domain">
                        <div class="dash-domain-header">
                            <div>
                                <span class="dash-domain-name">${escapeHtml(d.name || '')}</span>
                                ${d.code ? `<span class="dash-domain-code">${escapeHtml(d.code)}</span>` : ''}
                            </div>
                            <span class="readiness-domain-status readiness-domain-status--${status}">
                                ${statusLabel}
                            </span>
                        </div>
                        <div class="dash-domain-bar">
                            <div class="dash-domain-fill domain-bar--${status}"
                                 style="width:${d.score || 0}%"></div>
                        </div>
                        <div class="dash-domain-meta">
                            <span>${d.seen || 0} seen · ${d.correct || 0} correct</span>
                            <span>Exam weight: ${Math.round((d.weight || 0) * 100)}%</span>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }

    if (!fallbackDomains || fallbackDomains.length === 0) {
        return `
        <div class="dash-section">
            <div class="dash-section-title">Domain Breakdown</div>
            <p style="color:var(--text-muted);font-size:0.875rem">
                No performance data yet. Take quizzes tagged to this certification's domains to see your progress.
            </p>
        </div>`;
    }

    return `
    <div class="dash-section">
        <div class="dash-section-title">Domain Breakdown</div>
        <div class="dash-domain-list">
            ${fallbackDomains.map(d => {
                const acc = d.accuracy || 0;
                const color = acc >= 80 ? '#34d399' : acc >= 60 ? '#fbbf24' : acc < 1 ? '#52525b' : '#ef4444';
                const fillClass = acc >= 80 ? 'domain-bar--strong'
                                : acc >= 60 ? 'domain-bar--moderate'
                                : acc < 1   ? 'domain-bar--unseen'
                                :             'domain-bar--weak';
                return `
                <div class="dash-domain">
                    <div class="dash-domain-header">
                        <div>
                            <span class="dash-domain-name">${escapeHtml(d.name)}</span>
                            ${d.code ? `<span class="dash-domain-code">${escapeHtml(d.code)}</span>` : ''}
                        </div>
                        <span class="dash-domain-accuracy" style="color:${color}">${acc}%</span>
                    </div>
                    <div class="dash-domain-bar">
                        <div class="dash-domain-fill ${fillClass}" style="width:${acc}%"></div>
                    </div>
                    <div class="dash-domain-meta">
                        <span>${d.unique_questions || 0} questions studied</span>
                        <span>Exam weight: ${Math.round((d.weight || 0) * 100)}%</span>
                    </div>
                </div>`;
            }).join('')}
        </div>
    </div>`;
}

// ---- Recent Simulations (single list, shown once) ----
// Prefers readiness sims; falls back to certTrends.

function renderSimulationsSection(readiness, fallbackTrends) {
    const sims = (readiness?.simulations?.length ? readiness.simulations : fallbackTrends) || [];
    if (sims.length === 0) return '';

    return `
    <div class="dash-section">
        <div class="dash-section-title">Recent Simulations</div>
        <div class="dash-sims">
            ${sims.slice(0, 5).map(s => {
                const pct = Math.round(s.percentage ?? (s.total > 0 ? s.score / s.total * 100 : 0));
                const pctColor = s.passed ? '#34d399' : '#ef4444';
                const dateStr = s.created_at ? formatDate(s.created_at) : '';
                return `
                <div class="dash-sim-row">
                    <div class="dash-sim-pass ${s.passed ? 'pass' : 'fail'}">${s.passed ? '✓' : '✕'}</div>
                    <div class="dash-sim-info">
                        <div class="dash-sim-score">${s.score}/${s.total} correct</div>
                        ${dateStr ? `<div class="dash-sim-date">${dateStr}</div>` : ''}
                    </div>
                    <div class="dash-sim-pct" style="color:${pctColor}">${pct}%</div>
                </div>`;
            }).join('')}
        </div>
    </div>`;
}

// ---- Weak Questions ----

function renderWeakQuestionsSection(weakQs) {
    return `
    <div class="dash-section">
        <div class="dash-section-title">Weak Areas</div>
        <div class="dash-weak-list">
            ${weakQs.slice(0, 5).map(q => {
                const errorRate = q.times_seen > 0
                    ? Math.round(q.times_incorrect / q.times_seen * 100)
                    : 0;
                return `
                <div class="dash-weak-item">
                    <span class="dash-weak-rate">${errorRate}%</span>
                    <div style="flex:1;overflow:hidden">
                        <div class="dash-weak-text">${escapeHtml(q.question_text)}</div>
                        ${q.quiz_title ? `<div class="dash-weak-quiz">${escapeHtml(q.quiz_title)}</div>` : ''}
                    </div>
                </div>`;
            }).join('')}
        </div>
    </div>`;
}
