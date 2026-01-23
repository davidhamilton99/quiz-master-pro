/* ============================================
   QUIZ MASTER PRO - DOM Utilities
   ============================================ */

// Escape HTML to prevent XSS
export function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// Format relative dates
export function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Shuffle array (Fisher-Yates)
export function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Get random color from palette
export function getRandomColor() {
    const colors = ['#FF6B35', '#10B981', '#3B82F6', '#A855F7', '#EC4899', '#EF4444'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Show loading overlay
export function showLoading() {
    let overlay = document.querySelector('.loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
}

// Hide loading overlay
export function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Show confirmation dialog
export function showConfirmDialog({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' }) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal" style="max-width: 400px">
                <div class="modal-header">
                    <h2>${escapeHtml(title)}</h2>
                </div>
                <div class="modal-body">
                    <p>${escapeHtml(message)}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary flex-1" data-action="cancel">${cancelText}</button>
                    <button class="btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'} flex-1" data-action="confirm">${confirmText}</button>
                </div>
            </div>
        `;
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.dataset.action === 'cancel') {
                overlay.remove();
                resolve(false);
            } else if (e.target.dataset.action === 'confirm') {
                overlay.remove();
                resolve(true);
            }
        });
        
        document.body.appendChild(overlay);
    });
}

// Show confetti effect
export function showConfetti() {
    const colors = ['#FF6B35', '#10B981', '#3B82F6', '#A855F7', '#EC4899', '#FBBF24'];
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.top = '-10px';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = (Math.random() * 10 + 5) + 'px';
            confetti.style.height = (Math.random() * 10 + 5) + 'px';
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 3000);
        }, i * 30);
    }
}

export default {
    escapeHtml,
    formatDate,
    shuffleArray,
    getRandomColor,
    showLoading,
    hideLoading,
    showConfirmDialog,
    showConfetti
};
