/* Dashboard - Certification Performance Dashboard */

import { getState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';

export function renderDashboard() {
    const state = getState();
    const certs = state.userCertifications || [];
    const activeCert = state.activeCertification;
    const domains = state.domainPerformance || [];
    const trends = state.certTrends || [];
    const weakQs = state.weakQuestions || [];
    const reviewStats = state.reviewStats || {};
    const studySummary = state.studySummary || [];

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
.dash-quick-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-bottom:2rem}
.dash-stat-card{background:#16161e;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:1.25rem;text-align:center;cursor:pointer;transition:all 0.2s}
.dash-stat-card:hover{border-color:rgba(167,139,250,0.3)}
.dash-stat-val{font-size:2rem;font-weight:700;margin-bottom:0.25rem}
.dash-stat-label{font-size:0.8rem;color:#71717a}
.dash-stat-sub{font-size:0.7rem;color:#52525b;margin-top:0.25rem}
.dash-study-chart{display:flex;align-items:flex-end;gap:4px;height:60px;margin-top:0.75rem;padding:0 0.5rem}
.dash-study-bar{flex:1;background:rgba(167,139,250,0.3);border-radius:3px 3px 0 0;min-height:2px;transition:height 0.3s}
.dash-study-labels{display:flex;justify-content:space-between;font-size:0.6rem;color:#52525b;padding:0 0.5rem;margin-top:2px}
</style>
<div class="dash-container">
    <div class="dash-header">
        <button class="dash-back" onclick="window.app.navigate('library')">← Library</button>
        <div class="dash-title">Certification Dashboard</div>
        <button class="dash-add-btn" onclick="window.app.showCertPicker()">+ Add Certification</button>
    </div>

    <div class="dash-quick-stats">
        <div class="dash-stat-card" onclick="window.app.startReview()">
            <div class="dash-stat-val" style="color:${(reviewStats.due_today || 0) > 0 ? '#a78bfa' : '#34d399'}">${reviewStats.due_today || 0}</div>
            <div class="dash-stat-label">Due for Review</div>
            <div class="dash-stat-sub">${reviewStats.total || 0} total cards</div>
        </div>
        <div class="dash-stat-card">
            <div class="dash-stat-val" style="color:#67e8f9">${reviewStats.graduated || 0}</div>
            <div class="dash-stat-label">Mastered</div>
            <div class="dash-stat-sub">${reviewStats.due_week || 0} due this week</div>
        </div>
        <div class="dash-stat-card">
            <div class="dash-stat-val" style="color:#fbbf24">${formatStudyTime(studySummary)}</div>
            <div class="dash-stat-label">Study Time (7d)</div>
            ${renderStudyChart(studySummary)}
        </div>
    </div>

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

function formatStudyTime(days) {
    if (!days || days.length === 0) return '0m';
    const totalSecs = days.reduce((sum, d) => sum + (d.total_seconds || 0), 0);
    if (totalSecs < 60) return `${totalSecs}s`;
    if (totalSecs < 3600) return `${Math.round(totalSecs / 60)}m`;
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.round((totalSecs % 3600) / 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function renderStudyChart(days) {
    if (!days || days.length === 0) {
        return '<div class="dash-stat-sub">No study sessions yet</div>';
    }
    // Ensure we have 7 days of data, filling gaps with 0
    const last7 = [];
    const dayNames = ['S','M','T','W','T','F','S'];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const match = days.find(day => day.date === dateStr);
        last7.push({
            date: dateStr,
            seconds: match ? match.total_seconds : 0,
            label: dayNames[d.getDay()]
        });
    }
    const maxSecs = Math.max(...last7.map(d => d.seconds), 1);
    return `
        <div class="dash-study-chart">
            ${last7.map(d => {
                const pct = Math.max(3, (d.seconds / maxSecs) * 100);
                return `<div class="dash-study-bar" style="height:${pct}%" title="${Math.round(d.seconds / 60)}m"></div>`;
            }).join('')}
        </div>
        <div class="dash-study-labels">
            ${last7.map(d => `<span>${d.label}</span>`).join('')}
        </div>`;
}
