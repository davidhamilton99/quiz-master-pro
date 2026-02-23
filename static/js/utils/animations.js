/* ============================================
   Animation System - CSS-only feedback
   Particle system removed in Phase 7.5.
   ============================================ */

// ==================== CSS ANIMATIONS ====================

export function addShakeAnimation(element) {
    if (!element) return;
    element.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => { element.style.animation = ''; }, 500);
}

export function addPulseAnimation(element) {
    if (!element) return;
    element.style.animation = 'pulse 0.6s ease-in-out';
    setTimeout(() => { element.style.animation = ''; }, 600);
}

// No-ops retained for compatibility with any remaining call sites
export function burstCorrect() {}
export function burstWrong() {}
export function burstStreak() {}
export function showConfetti() {}
export function showFireworks() {}
export function showLevelUpEffect() {}
export function showAchievementEffect() {}
export function showXPGain() {}
export function setAnimationsEnabled() {}

// Inject keyframe CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
    }

    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);
