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

export function showConfetti() {
    const colors = ['#2563eb','#16a34a','#d97706','#0891b2','#dc2626'];
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const c = document.createElement('div');
            c.style.cssText = `position:fixed;z-index:9999;pointer-events:none;width:${6+Math.random()*6}px;height:${6+Math.random()*6}px;background:${colors[Math.floor(Math.random()*colors.length)]};left:${Math.random()*100}vw;top:-10px;border-radius:${Math.random()>0.5?'50%':'2px'}`;
            c.animate([{transform:'translateY(0) rotate(0)',opacity:1},{transform:`translateY(100vh) rotate(${Math.random()*720}deg)`,opacity:0}],{duration:2500,easing:'ease-out'});
            document.body.appendChild(c);
            setTimeout(() => c.remove(), 2500);
        }, i * 30);
    }
}
