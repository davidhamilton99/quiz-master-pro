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
.cpick-overlay{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;padding:1rem}
.cpick-modal{background:#ffffff;border:1px solid #e2e2e6;border-radius:12px;width:100%;max-width:700px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10)}
.cpick-header{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;border-bottom:1px solid #e2e2e6}
.cpick-title{font-size:1.125rem;font-weight:600;color:#1a1a1f}
.cpick-close{background:none;border:none;color:#8a8a95;font-size:1.5rem;cursor:pointer;padding:0 0.25rem}
.cpick-close:hover{color:#1a1a1f}
.cpick-search{padding:0.75rem 1.5rem;border-bottom:1px solid #e2e2e6}
.cpick-input{width:100%;padding:0.6rem 1rem;background:#ffffff;border:1px solid #e2e2e6;border-radius:6px;color:#1a1a1f;font-size:0.9rem;outline:none}
.cpick-input:focus{border-color:#2563eb}
.cpick-input::placeholder{color:#8a8a95}
.cpick-body{overflow-y:auto;padding:1rem 1.5rem;flex:1}
.cpick-vendor{margin-bottom:1.5rem}
.cpick-vendor-name{font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.75rem;padding-left:0.25rem}
.cpick-cards{display:flex;flex-direction:column;gap:0.5rem}
.cpick-card{background:#ffffff;border:1px solid #e2e2e6;border-radius:8px;padding:1rem 1.25rem;display:flex;align-items:center;gap:1rem;transition:border-color 0.2s}
.cpick-card:hover{border-color:#2563eb}
.cpick-card-info{flex:1}
.cpick-card-name{font-size:0.95rem;font-weight:600;color:#1a1a1f;margin-bottom:0.25rem}
.cpick-card-desc{font-size:0.8rem;color:#5a5a65;margin-bottom:0.375rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.cpick-card-meta{display:flex;gap:1rem;font-size:0.7rem;color:#8a8a95}
.cpick-enroll{padding:0.5rem 1.25rem;border-radius:6px;font-size:0.8rem;font-weight:500;cursor:pointer;white-space:nowrap;border:none}
.cpick-enroll.enroll{background:rgba(37,99,235,0.08);color:#2563eb;border:1px solid rgba(37,99,235,0.2)}
.cpick-enroll.enroll:hover{background:rgba(37,99,235,0.15)}
.cpick-enroll.enrolled{background:rgba(22,163,74,0.08);color:#16a34a;cursor:default;border:1px solid rgba(22,163,74,0.2)}
.cpick-empty{text-align:center;padding:2rem;color:#8a8a95;font-size:0.9rem}
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
                    <div class="cpick-vendor-name" style="color:${vendorColors[vendor] || '#2563eb'}">${escapeHtml(vendor)}</div>
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
