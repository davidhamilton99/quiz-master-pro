/* CertPicker - Certification Selection Modal */

import { getState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';

export function renderCertPicker() {
    const state = getState();
    const certs = state.certifications || [];
    const enrolled = state.userCertifications || [];
    const filter = (state.certFilterQuery || '').toLowerCase();
    const enrolledIds = new Set(enrolled.map(e => e.certification_id));

    // Filter certs
    const filtered = filter
        ? certs.filter(c => c.name.toLowerCase().includes(filter) || c.vendor.toLowerCase().includes(filter))
        : certs;

    // Group by vendor
    const groups = {};
    for (const c of filtered) {
        if (!groups[c.vendor]) groups[c.vendor] = [];
        groups[c.vendor].push(c);
    }

    const vendorColors = {
        'CompTIA': '#ef4444',
        'AWS': '#f59e0b',
        'Cisco': '#3b82f6',
        'Microsoft': '#06b6d4',
        'Google Cloud': '#34d399'
    };

    return `
<style>
.cpick-overlay{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1rem}
.cpick-modal{background:#16161e;border:1px solid rgba(255,255,255,0.1);border-radius:16px;width:100%;max-width:700px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden}
.cpick-header{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.06)}
.cpick-title{font-size:1.2rem;font-weight:700;color:#fff}
.cpick-close{background:none;border:none;color:#71717a;font-size:1.5rem;cursor:pointer;padding:0 0.25rem}
.cpick-close:hover{color:#e4e4e7}
.cpick-search{padding:0.75rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.06)}
.cpick-input{width:100%;padding:0.6rem 1rem;background:#1e1e28;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#e4e4e7;font-size:0.9rem;outline:none}
.cpick-input:focus{border-color:#a78bfa}
.cpick-input::placeholder{color:#71717a}
.cpick-body{overflow-y:auto;padding:1rem 1.5rem;flex:1}
.cpick-vendor{margin-bottom:1.5rem}
.cpick-vendor-name{font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.75rem;padding-left:0.25rem}
.cpick-cards{display:flex;flex-direction:column;gap:0.5rem}
.cpick-card{background:#1e1e28;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:1rem 1.25rem;display:flex;align-items:center;gap:1rem;transition:all 0.2s}
.cpick-card:hover{border-color:rgba(167,139,250,0.3)}
.cpick-card-info{flex:1}
.cpick-card-name{font-size:0.95rem;font-weight:600;color:#e4e4e7;margin-bottom:0.25rem}
.cpick-card-desc{font-size:0.8rem;color:#71717a;margin-bottom:0.375rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.cpick-card-meta{display:flex;gap:1rem;font-size:0.7rem;color:#a1a1aa}
.cpick-enroll{padding:0.5rem 1.25rem;border-radius:8px;font-size:0.8rem;font-weight:500;cursor:pointer;white-space:nowrap;border:none}
.cpick-enroll.enroll{background:rgba(167,139,250,0.15);color:#a78bfa;border:1px solid rgba(167,139,250,0.3)}
.cpick-enroll.enroll:hover{background:rgba(167,139,250,0.25)}
.cpick-enroll.enrolled{background:rgba(52,211,153,0.1);color:#34d399;cursor:default;border:1px solid rgba(52,211,153,0.2)}
.cpick-empty{text-align:center;padding:2rem;color:#71717a;font-size:0.9rem}
</style>
<div class="cpick-overlay" onclick="if(event.target===this)window.app.closeCertPicker()">
    <div class="cpick-modal">
        <div class="cpick-header">
            <div class="cpick-title">Choose a Certification</div>
            <button class="cpick-close" onclick="window.app.closeCertPicker()">&times;</button>
        </div>
        <div class="cpick-search">
            <input class="cpick-input" type="text" placeholder="Search certifications..."
                value="${escapeHtml(filter)}"
                oninput="window.app.filterCerts(this.value)">
        </div>
        <div class="cpick-body">
            ${Object.keys(groups).length === 0 ? `
                <div class="cpick-empty">No certifications found.</div>
            ` : Object.entries(groups).map(([vendor, vendorCerts]) => `
                <div class="cpick-vendor">
                    <div class="cpick-vendor-name" style="color:${vendorColors[vendor] || '#a78bfa'}">${escapeHtml(vendor)}</div>
                    <div class="cpick-cards">
                        ${vendorCerts.map(c => `
                            <div class="cpick-card">
                                <div class="cpick-card-info">
                                    <div class="cpick-card-name">${escapeHtml(c.name)}</div>
                                    <div class="cpick-card-desc">${escapeHtml(c.description || '')}</div>
                                    <div class="cpick-card-meta">
                                        ${c.exam_duration_minutes ? `<span>${c.exam_duration_minutes} min</span>` : ''}
                                        ${c.total_questions ? `<span>${c.total_questions} questions</span>` : ''}
                                        ${c.passing_score ? `<span>Pass: ${c.passing_score}</span>` : ''}
                                    </div>
                                </div>
                                ${enrolledIds.has(c.id) ? `
                                    <button class="cpick-enroll enrolled">Enrolled</button>
                                ` : `
                                    <button class="cpick-enroll enroll" onclick="window.app.enrollCert(${c.id})">Enroll</button>
                                `}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</div>`;
}
