/* DOM Utilities */

export function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

export function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function getRandomColor() {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#22c55e', '#14b8a6', '#3b82f6'];
    return colors[Math.floor(Math.random() * colors.length)];
}

export function showLoading() {
    let overlay = document.querySelector('.loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7)';
        overlay.innerHTML = '<div class="spinner" style="width:32px;height:32px"></div>';
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

export function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

export function showConfetti() {
    const colors = ['#6366f1', '#8b5cf6', '#22c55e', '#f59e0b', '#ec4899', '#3b82f6'];
    for (let i = 0; i < 60; i++) {
        setTimeout(() => {
            const c = document.createElement('div');
            c.style.cssText = `position:fixed;z-index:9999;pointer-events:none;width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;background:${colors[Math.floor(Math.random()*colors.length)]};left:${Math.random()*100}vw;top:-10px;border-radius:${Math.random()>0.5?'50%':'2px'};animation:confetti-fall 2.5s ease-out forwards`;
            document.body.appendChild(c);
            setTimeout(() => c.remove(), 2500);
        }, i * 25);
    }
    
    // Add animation if not exists
    if (!document.getElementById('confetti-style')) {
        const style = document.createElement('style');
        style.id = 'confetti-style';
        style.textContent = '@keyframes confetti-fall{to{transform:translateY(100vh) rotate(720deg);opacity:0}}';
        document.head.appendChild(style);
    }
}
