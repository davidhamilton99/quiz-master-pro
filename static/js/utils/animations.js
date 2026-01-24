/* ============================================
   Animation System - Visual Feedback (Simplified)
   ============================================ */

let animationsEnabled = true;
let particleCanvas = null;
let particleCtx = null;
let particles = [];
let animationId = null;

export function setAnimationsEnabled(enabled) {
    animationsEnabled = enabled;
}

function canAnimate() {
    return animationsEnabled;
}

// ==================== PARTICLE SYSTEM ====================

function initCanvas() {
    if (particleCanvas) return;
    
    particleCanvas = document.createElement('canvas');
    particleCanvas.id = 'particle-canvas';
    particleCanvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
    `;
    document.body.appendChild(particleCanvas);
    particleCtx = particleCanvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    if (!particleCanvas) return;
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
}

function createParticle(x, y, options = {}) {
    return {
        x,
        y,
        vx: (options.vx || 0) + (Math.random() - 0.5) * (options.spread || 10),
        vy: (options.vy || 0) + (Math.random() - 0.5) * (options.spread || 10),
        gravity: options.gravity ?? 0.3,
        friction: options.friction ?? 0.99,
        size: options.size || Math.random() * 6 + 2,
        color: options.color || `hsl(${Math.random() * 60 + 40}, 100%, 60%)`,
        life: options.life || 1,
        decay: options.decay || 0.02,
    };
}

function emitParticles(x, y, count, options = {}) {
    if (!canAnimate()) return;
    initCanvas();
    
    for (let i = 0; i < count; i++) {
        particles.push(createParticle(x, y, options));
    }
    
    if (!animationId) {
        animateParticles();
    }
}

function animateParticles() {
    if (!particleCtx) return;
    
    particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    
    particles = particles.filter(p => {
        p.vy += p.gravity;
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        
        if (p.life > 0) {
            particleCtx.beginPath();
            particleCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            particleCtx.fillStyle = p.color.replace(')', `, ${p.life})`).replace('hsl', 'hsla').replace('rgb', 'rgba');
            particleCtx.fill();
        }
        
        return p.life > 0;
    });
    
    if (particles.length > 0) {
        animationId = requestAnimationFrame(animateParticles);
    } else {
        animationId = null;
    }
}

// ==================== EFFECT FUNCTIONS ====================

export function burstCorrect(element) {
    if (!canAnimate() || !element) return;
    
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    emitParticles(x, y, 15, {
        color: `hsl(${140 + Math.random() * 20}, 80%, 60%)`,
        spread: 8,
        gravity: 0.2,
        decay: 0.03,
        size: 4,
    });
}

export function burstWrong(element) {
    if (!canAnimate() || !element) return;
    
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    emitParticles(x, y, 8, {
        color: `hsl(${0 + Math.random() * 10}, 70%, 55%)`,
        spread: 5,
        gravity: 0.4,
        decay: 0.04,
        size: 3,
    });
}

export function burstStreak(element, streak) {
    if (!canAnimate() || !element) return;
    
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    const count = Math.min(streak * 3, 30);
    emitParticles(x, y, count, {
        color: `hsl(${30 + Math.random() * 30}, 100%, 55%)`,
        spread: 6,
        vy: -8,
        gravity: -0.1,
        decay: 0.02,
        size: 5,
    });
}

export function showConfetti(fullScreen = true) {
    if (!canAnimate()) return;
    initCanvas();
    
    const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
    
    const emitConfetti = () => {
        const count = fullScreen ? 50 : 20;
        const width = window.innerWidth;
        
        for (let i = 0; i < count; i++) {
            const x = fullScreen ? Math.random() * width : width / 2;
            emitParticles(x, -10, 1, {
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 15,
                vy: Math.random() * 3 + 2,
                gravity: 0.15,
                decay: 0.005,
                size: Math.random() * 8 + 4,
            });
        }
    };
    
    emitConfetti();
    setTimeout(emitConfetti, 200);
    setTimeout(emitConfetti, 400);
    if (fullScreen) {
        setTimeout(emitConfetti, 600);
        setTimeout(emitConfetti, 800);
    }
}

export function showFireworks() {
    if (!canAnimate()) return;
    initCanvas();
    
    const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
    
    const burst = (x, y) => {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const count = 40;
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 5 + Math.random() * 5;
            
            emitParticles(x, y, 1, {
                color,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 0.1,
                decay: 0.015,
                size: 4,
                spread: 0,
            });
        }
    };
    
    burst(window.innerWidth * 0.3, window.innerHeight * 0.4);
    setTimeout(() => burst(window.innerWidth * 0.7, window.innerHeight * 0.3), 300);
    setTimeout(() => burst(window.innerWidth * 0.5, window.innerHeight * 0.5), 600);
}

export function showLevelUpEffect() {
    if (!canAnimate()) return;
    initCanvas();
    
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    for (let i = 0; i < 60; i++) {
        const angle = (i / 60) * Math.PI * 2;
        const speed = 8 + Math.random() * 4;
        
        emitParticles(centerX, centerY, 1, {
            color: `hsl(${45 + Math.random() * 15}, 100%, 55%)`,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            gravity: 0.05,
            decay: 0.01,
            size: 6,
            spread: 0,
        });
    }
}

export function showAchievementEffect(element) {
    if (!canAnimate()) return;
    
    const rect = element ? element.getBoundingClientRect() : {
        left: window.innerWidth / 2,
        top: window.innerHeight / 2,
        width: 0,
        height: 0
    };
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const angle = (i / 30) * Math.PI * 4;
            const distance = 20 + i * 2;
            
            emitParticles(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance,
                1,
                {
                    color: `hsl(${45 + Math.random() * 20}, 100%, 60%)`,
                    vx: Math.cos(angle) * 2,
                    vy: Math.sin(angle) * 2 - 2,
                    gravity: 0,
                    decay: 0.02,
                    size: 5,
                    spread: 0,
                }
            );
        }, i * 20);
    }
}

export function showXPGain(element, amount) {
    if (!canAnimate() || !element) return;
    
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;
    
    const floater = document.createElement('div');
    floater.className = 'xp-floater';
    floater.textContent = `+${amount} XP`;
    floater.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        transform: translateX(-50%);
        font-size: 1.25rem;
        font-weight: 700;
        color: #fbbf24;
        text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
        pointer-events: none;
        z-index: 10000;
        animation: xpFloat 1.5s ease-out forwards;
    `;
    
    document.body.appendChild(floater);
    
    emitParticles(x, y, 8, {
        color: '#fbbf24',
        spread: 4,
        vy: -3,
        gravity: 0.1,
        decay: 0.03,
        size: 3,
    });
    
    setTimeout(() => floater.remove(), 1500);
}

// ==================== CSS ANIMATIONS ====================

export function addShakeAnimation(element) {
    if (!canAnimate() || !element) return;
    element.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => element.style.animation = '', 500);
}

export function addPulseAnimation(element) {
    if (!canAnimate() || !element) return;
    element.style.animation = 'pulse 0.6s ease-in-out';
    setTimeout(() => element.style.animation = '', 600);
}

export function addBounceAnimation(element) {
    if (!canAnimate() || !element) return;
    element.style.animation = 'bounce 0.5s ease-in-out';
    setTimeout(() => element.style.animation = '', 500);
}

// Inject CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes xpFloat {
        0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        50% { opacity: 1; transform: translateX(-50%) translateY(-40px) scale(1.1); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-80px) scale(0.8); }
    }
    
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
    
    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
    }
`;
document.head.appendChild(style);
