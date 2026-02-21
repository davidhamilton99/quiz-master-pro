/* Dashboard - Certification Performance Dashboard */

import { getState, setState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { getStudyStats, getCertReadiness } from '../services/api.js';

// Load study stats on dashboard render
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

// Readiness data cache
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

export function renderDashboard() {
    const state = getState();
    const certs = state.userCertifications || [];
    const activeCert = state.activeCertification;
    const domains = state.domainPerformance || [];
    const trends = state.certTrends || [];
    const weakQs = state.weakQuestions || [];
    const studyStats = studyStatsCache;

    // Trigger async load if not cached
    if (!studyStatsCache) loadStudyStats().then(() => {
        // Re-render if data arrives
        if (state.view === 'dashboard') setState({});
    });

    return `
<style>
.dash-container{max-width:900px;margin:0 auto;padding:1.5rem}
.dash-header{display:flex;align-items:center;gap:1rem;margin-bottom:2rem}
.dash-back{background:none;border:1px solid rgba(255,255,255,0.1);color:#a1a1aa;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-size:0.85rem}
.dash-back:hover{border-color:#a78bfa;color:#e4e4e7}
.dash-title{font-size:1.5rem;font-weight:700;color:#fff;flex:1}
.dash-add-btn{background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);color:#a78bfa;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:500}
.dash-add-btn:hover{background:rgba(167,139,250,0.25)}
.dash-empty{text-align:center;padding:4rem 2rem;color:#71717a}
.dash-empty h3{color:#a1a1aa;margin-bottom:1rem;font-size:1.2rem}
.dash-empty-btn{display:inline-block;margin-top:1rem;padding:0.75rem 2rem;background:linear-gradient(135deg,#a78bfa,#67e8f9);color:#0f0f14;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-size:1rem}
.dash-certs{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;margin-bottom:2rem}
.dash-cert-card{background:#16161e;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:1.25rem;cursor:pointer;transition:all 0.2s}
.dash-cert-card:hover{border-color:rgba(167,139,250,0.3)}
.dash-cert-card.active{border-color:#a78bfa;box-shadow:0 0 20px rgba(167,139,250,0.15)}
.dash-cert-vendor{font-size:0.7rem;text-transform:uppercase;letter-spacing:0.05em;color:#71717a;margin-bottom:0.25rem}
.dash-cert-name{font-size:1rem;font-weight:600;color:#fff;margin-bottom:0.5rem}
.dash-cert-target{font-size:0.75rem;color:#a1a1aa;margin-bottom:0.75rem}
.dash-cert-actions{display:flex;gap:0.5rem;margin-top:0.75rem}
.dash-sim-btn{flex:1;padding:0.5rem;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);color:#a78bfa;border-radius:8px;cursor:pointer;font-size:0.8rem;font-weight:500;text-align:center}
.dash-sim-btn:hover{background:rgba(167,139,250,0.25)}
.dash-detail-btn{flex:1;padding:0.5rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#a1a1aa;border-radius:8px;cursor:pointer;font-size:0.8rem;text-align:center}
.dash-detail-btn:hover{color:#e4e4e7;border-color:rgba(255,255,255,0.2)}
.dash-section{margin-bottom:2.5rem}
.dash-section-title{font-size:1.1rem;font-weight:600;color:#fff;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem}
.dash-domain-list{display:flex;flex-direction:column;gap:0.75rem}
.dash-domain{background:#16161e;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:1rem 1.25rem}
.dash-domain-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem}
.dash-domain-name{font-size:0.9rem;font-weight:500;color:#e4e4e7}
.dash-domain-code{font-size:0.75rem;color:#71717a;margin-left:0.5rem}
.dash-domain-accuracy{font-size:0.9rem;font-weight:600}
.dash-domain-bar{height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;margin-bottom:0.375rem}
.dash-domain-fill{height:100%;border-radius:3px;transition:width 0.5s}
.dash-domain-meta{display:flex;justify-content:space-between;font-size:0.75rem;color:#71717a}
.dash-sims{display:flex;flex-direction:column;gap:0.5rem}
.dash-sim-row{display:flex;align-items:center;gap:1rem;background:#16161e;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:0.875rem 1.25rem}
.dash-sim-pass{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;flex-shrink:0}
.dash-sim-pass.pass{background:rgba(52,211,153,0.15);color:#34d399}
.dash-sim-pass.fail{background:rgba(239,68,68,0.15);color:#ef4444}
.dash-sim-info{flex:1}
.dash-sim-score{font-size:0.9rem;font-weight:500;color:#e4e4e7}
.dash-sim-date{font-size:0.75rem;color:#71717a}
.dash-sim-pct{font-size:1.1rem;font-weight:700}
.dash-weak-list{display:flex;flex-direction:column;gap:0.5rem}
.dash-weak-item{display:flex;align-items:center;gap:1rem;background:#16161e;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:0.875rem 1.25rem}
.dash-weak-rate{font-size:0.85rem;font-weight:600;color:#ef4444;min-width:45px}
.dash-weak-text{flex:1;font-size:0.85rem;color:#a1a1aa;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dash-weak-quiz{font-size:0.7rem;color:#71717a}
.dash-mini-bars{display:flex;flex-direction:column;gap:4px;margin-top:0.5rem}
.dash-mini-bar{height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden}
.dash-mini-fill{height:100%;border-radius:2px}
.dash-stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.75rem;margin-bottom:2rem}
.dash-stat-card{background:#16161e;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:1rem 1.25rem;text-align:center}
.dash-stat-value{font-size:1.5rem;font-weight:700;color:#fff;margin-bottom:0.25rem}
.dash-stat-label{font-size:0.75rem;color:#71717a;text-transform:uppercase;letter-spacing:0.03em}
.dash-daily-bars{display:flex;align-items:flex-end;gap:4px;height:48px;margin-top:0.5rem}
.dash-daily-bar{flex:1;background:rgba(167,139,250,0.3);border-radius:3px 3px 0 0;min-height:2px;transition:height 0.3s}
</style>
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
            <div class="dash-stat-value">${studyStats.stats?.total_questions > 0 ? Math.round((studyStats.stats?.total_correct || 0) / studyStats.stats.total_questions * 100) : 0}%</div>
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
            ${certs.map(cert => `
                <div class="dash-cert-card ${activeCert && activeCert.certification_id === cert.certification_id ? 'active' : ''}"
                     onclick="window.app.selectCert(${cert.certification_id})">
                    <div class="dash-cert-vendor">${escapeHtml(cert.vendor)}</div>
                    <div class="dash-cert-name">${escapeHtml(cert.name)}</div>
                    ${cert.target_date ? `<div class="dash-cert-target">Target: ${cert.target_date}</div>` : ''}
                    <div class="dash-cert-actions">
                        <button class="dash-sim-btn" onclick="event.stopPropagation();window.app.startSimulation(${cert.certification_id})">Practice Exam</button>
                        <button class="dash-detail-btn" onclick="event.stopPropagation();window.app.selectCert(${cert.certification_id})">Details</button>
                    </div>
                </div>
            `).join('')}
        </div>

        ${activeCert ? renderReadinessSection(activeCert) : ''}

        ${activeCert ? renderDetailView(activeCert, domains, trends, weakQs) : `
            <div class="dash-empty" style="padding:2rem">
                <p>Select a certification above to view domain performance.</p>
            </div>
        `}
    `}
</div>`;
}

function renderDetailView(cert, domains, trends, weakQs) {
    return `
    <div class="dash-section">
        <div class="dash-section-title">Domain Performance — ${escapeHtml(cert.name)}</div>
        <div class="dash-domain-list">
            ${domains.length === 0 ? '<p style="color:#71717a;font-size:0.9rem">No performance data yet. Take quizzes tagged with this certification\'s domains to see your progress.</p>' :
            domains.map(d => {
                const acc = d.accuracy || 0;
                const color = acc >= 80 ? '#34d399' : acc >= 60 ? '#fbbf24' : acc < 1 ? '#3f3f46' : '#ef4444';
                return `
                <div class="dash-domain">
                    <div class="dash-domain-header">
                        <div>
                            <span class="dash-domain-name">${escapeHtml(d.name)}</span>
                            <span class="dash-domain-code">${escapeHtml(d.code || '')}</span>
                        </div>
                        <span class="dash-domain-accuracy" style="color:${color}">${acc}%</span>
                    </div>
                    <div class="dash-domain-bar">
                        <div class="dash-domain-fill" style="width:${acc}%;background:${color}"></div>
                    </div>
                    <div class="dash-domain-meta">
                        <span>${d.unique_questions || 0} questions studied</span>
                        <span>Weight: ${Math.round((d.weight || 0) * 100)}%</span>
                    </div>
                </div>`;
            }).join('')}
        </div>
    </div>

    ${trends.length > 0 ? `
    <div class="dash-section">
        <div class="dash-section-title">Recent Simulations</div>
        <div class="dash-sims">
            ${trends.slice(0, 5).map(s => {
                const pctColor = s.passed ? '#34d399' : '#ef4444';
                return `
                <div class="dash-sim-row">
                    <div class="dash-sim-pass ${s.passed ? 'pass' : 'fail'}">${s.passed ? '✓' : '✕'}</div>
                    <div class="dash-sim-info">
                        <div class="dash-sim-score">${s.score}/${s.total} correct</div>
                        <div class="dash-sim-date">${new Date(s.created_at).toLocaleDateString()}</div>
                    </div>
                    <div class="dash-sim-pct" style="color:${pctColor}">${Math.round(s.percentage)}%</div>
                </div>`;
            }).join('')}
        </div>
    </div>` : ''}

    ${weakQs.length > 0 ? `
    <div class="dash-section">
        <div class="dash-section-title">Weak Areas</div>
        <div class="dash-weak-list">
            ${weakQs.slice(0, 5).map(q => {
                const errorRate = q.times_seen > 0 ? Math.round(q.times_incorrect / q.times_seen * 100) : 0;
                return `
                <div class="dash-weak-item">
                    <span class="dash-weak-rate">${errorRate}%</span>
                    <div style="flex:1;overflow:hidden">
                        <div class="dash-weak-text">${escapeHtml(q.question_text)}</div>
                        <div class="dash-weak-quiz">${escapeHtml(q.quiz_title || '')}</div>
                    </div>
                </div>`;
            }).join('')}
        </div>
    </div>` : ''}
    `;
}

function renderReadinessSection(activeCert) {
    const certId = activeCert.certification_id;
    const readiness = readinessCache[certId];

    // Trigger async load if not cached
    if (!readiness) {
        loadReadiness(certId).then(() => {
            const state = getState();
            if (state.view === 'dashboard') setState({});
        });
        return `
        <div class="readiness-panel">
            <div class="readiness-header">
                <div class="dash-section-title">Exam Readiness</div>
            </div>
            <div style="text-align:center;padding:2rem;color:#71717a">Loading readiness data...</div>
        </div>`;
    }

    const score = readiness.overall_score || 0;
    const domains = readiness.domains || [];
    const sims = readiness.simulations || [];
    const studyTime = readiness.study_time || {};
    const prediction = readiness.prediction || {};
    const certInfo = readiness.certification || {};

    // Gauge color based on score
    const gaugeColor = score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : score > 0 ? '#ef4444' : '#3f3f46';
    // SVG arc for circular gauge (score 0-100 maps to 0-283 stroke-dashoffset on a circle with circumference ~283)
    const circumference = 283;
    const offset = circumference - (score / 100) * circumference;

    // Prediction badge
    const predBadgeClass = prediction.likely_pass ? 'prediction-badge--pass' : 'prediction-badge--fail';
    const predLabel = prediction.likely_pass ? 'Likely Pass' : 'Needs Work';
    const predConfidence = prediction.confidence ? prediction.confidence.charAt(0).toUpperCase() + prediction.confidence.slice(1) : '';

    // Trend indicator
    const trendIcon = prediction.trend === 'improving' ? '&#9650;' : prediction.trend === 'declining' ? '&#9660;' : '&#9644;';
    const trendColor = prediction.trend === 'improving' ? '#34d399' : prediction.trend === 'declining' ? '#ef4444' : '#71717a';
    const trendLabel = prediction.trend ? prediction.trend.charAt(0).toUpperCase() + prediction.trend.slice(1) : 'Stable';

    return `
    <div class="readiness-panel">
        <div class="readiness-header">
            <div class="dash-section-title">Exam Readiness -- ${escapeHtml(certInfo.name || activeCert.name || '')}</div>
        </div>

        <div class="readiness-top-row">
            <!-- Gauge -->
            <div class="readiness-gauge-wrapper">
                <svg class="readiness-gauge" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
                    <circle cx="50" cy="50" r="45" fill="none" stroke="${gaugeColor}" stroke-width="8"
                        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                        stroke-linecap="round" transform="rotate(-90 50 50)"
                        style="transition:stroke-dashoffset 0.8s ease"/>
                    <text x="50" y="46" text-anchor="middle" fill="#fff" font-size="20" font-weight="700">${Math.round(score)}</text>
                    <text x="50" y="60" text-anchor="middle" fill="#71717a" font-size="8">/ 100</text>
                </svg>
                <div class="readiness-gauge-label">Overall Score</div>
            </div>

            <!-- Prediction & Stats -->
            <div class="readiness-summary">
                <div class="prediction-badge ${predBadgeClass}">
                    <span class="prediction-badge-label">${predLabel}</span>
                    <span class="prediction-badge-confidence">${predConfidence} confidence</span>
                </div>
                <div class="readiness-meta-row">
                    <div class="readiness-meta-item">
                        <span class="readiness-meta-value" style="color:${trendColor}">${trendIcon} ${trendLabel}</span>
                        <span class="readiness-meta-label">Trend</span>
                    </div>
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
                        <span class="readiness-meta-label">Exams</span>
                    </div>
                </div>
                <div class="readiness-actions">
                    <button class="dash-sim-btn" onclick="window.app.startSimulation(${certId})">Take Practice Exam</button>
                    <button class="dash-detail-btn" onclick="window.app.startSrsReview && window.app.startSrsReview(${certId})">Start Review</button>
                </div>
            </div>
        </div>

        <!-- Domain Breakdown Bars -->
        <div class="readiness-domains">
            <div class="readiness-domains-title">Domain Breakdown</div>
            ${domains.map(d => {
                const barClass = d.status === 'strong' ? 'domain-bar--strong' :
                                 d.status === 'moderate' ? 'domain-bar--moderate' :
                                 d.status === 'weak' ? 'domain-bar--weak' : 'domain-bar--unseen';
                const statusLabel = d.status.charAt(0).toUpperCase() + d.status.slice(1);
                return `
                <div class="readiness-domain-row">
                    <div class="readiness-domain-info">
                        <span class="readiness-domain-name">${escapeHtml(d.code)} ${escapeHtml(d.name)}</span>
                        <span class="readiness-domain-status readiness-domain-status--${d.status}">${statusLabel}</span>
                    </div>
                    <div class="domain-bar">
                        <div class="domain-bar-fill ${barClass}" style="width:${d.score}%"></div>
                    </div>
                    <div class="readiness-domain-meta">
                        <span>${d.score}%</span>
                        <span>${d.seen} seen / ${d.correct} correct</span>
                        <span>Weight: ${Math.round((d.weight || 0) * 100)}%</span>
                    </div>
                </div>`;
            }).join('')}
        </div>

        ${sims.length > 0 ? `
        <!-- Simulation Trend -->
        <div class="readiness-sim-trend">
            <div class="readiness-domains-title">Recent Simulations</div>
            <div class="sim-trend-chart">
                ${sims.slice().reverse().map((s, i) => {
                    const height = Math.max(s.percentage * 0.8, 5);
                    const barColor = s.passed ? '#34d399' : '#ef4444';
                    return `<div class="sim-trend-bar-wrap">
                        <div class="sim-trend-bar" style="height:${height}%;background:${barColor}" title="${Math.round(s.percentage)}% - ${s.passed ? 'Pass' : 'Fail'}"></div>
                        <div class="sim-trend-label">${Math.round(s.percentage)}%</div>
                    </div>`;
                }).join('')}
            </div>
        </div>` : ''}
    </div>`;
}
