/* DOM Utilities */
export function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }
export function formatDate(d) { const dt = new Date(d), now = new Date(), diff = Math.floor((now - dt) / 86400000); if (diff === 0) return 'Today'; if (diff === 1) return 'Yesterday'; if (diff < 7) return `${diff}d ago`; return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
export function shuffleArray(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function getRandomColor() { return ['#2563eb','#16a34a','#d97706','#dc2626','#0891b2','#7c3aed','#c2410c','#0d9488'][Math.floor(Math.random() * 8)]; }

export function showLoading() {
    let o = document.querySelector('.loading-overlay');
    if (!o) { o = document.createElement('div'); o.className = 'loading-overlay'; o.innerHTML = '<div class="spinner"></div>'; document.body.appendChild(o); }
    o.style.display = 'flex';
}
export function hideLoading() { const o = document.querySelector('.loading-overlay'); if (o) o.style.display = 'none'; }
