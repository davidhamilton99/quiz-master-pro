/* ============================================
   Animation System - Visual Feedback
   Particles, Confetti, Effects
   ============================================ */

import { getState } from '../state.js';

// Check if animations are enabled
function canAnimate() {
    return getState().animationsEnabled;
}

// ==================== PARTICLE SYSTEM ====================

class Particle {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = options.vx || (Math.random() - 0.5) * 10;
        this.vy = options.vy || (Math.random() - 0.5) * 10 - 5;
        this.gravity = options.gravity ?? 0.3;
        this.friction = options.friction ?? 0.99;
        this.size = options.size || Math.random() * 6 + 2;
        this.color = options.color || `hsl(${Math.random() * 60 + 40}, 100%, 60%)`;
        this.life = options.life || 1;
        this.decay = options.decay || 0.02;
        this.shape = options.shape || 'circle';
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }
    
    update() {
        this.vy += this.gravity;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.rotation += this.rotationSpeed;
        return this.life > 0;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        if (this.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.shape === 'square') {
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        } else if (this.shape === 'star') {
            this.drawStar(ctx, 0, 0, 5, this.size, this.size / 2);
        }
        
        ctx.restore();
    }
    
    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;
        
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;
            
            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
    }
    
    init() {
        if (this.canvas) return;
        
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'particle-canvas';
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
        `;
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    emit(x, y, count, options = {}) {
        if (!canAnimate()) return;
        this.init();
        
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, {
                ...options,
                vx: (options.vx ?? 0) + (Math.random() - 0.5) * (options.spread ?? 10),
                vy: (options.vy ?? 0) + (Math.random() - 0.5) * (options.spread ?? 10),
            }));
        }
        
        if (!this.animationId) {
            this.animate();
        }
    }
    
    animate() {
        if (!this.ctx) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles = this.particles.filter(p => {
            const alive = p.update();
            if (alive) p.draw(this.ctx);
            return alive;
        });
        
        if (this.particles.length > 0) {
            this.animationId = requestAnimationFrame(() => this.animate());
        } else {
            this.animationId = null;
        }
    }
    
    clear() {
        this.particles = [];
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}

const particles = new ParticleSystem();

// ==================== EFFECT FUNCTIONS ====================

export function burstCorrect(element) {
    if (!canAnimate() || !element) return;
    
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    // Green sparkles
    particles.emit(x, y, 15, {
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
    
    // Red particles (fewer, less intense)
    particles.emit(x, y, 8, {
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
    
    // Fire particles rising
    const count = Math.min(streak * 3, 30);
    particles.emit(x, y, count, {
        color: `hsl(${30 + Math.random() * 30}, 100%, 55%)`,
        spread: 6,
        vy: -8,
        gravity: -0.1, // Float up
        decay: 0.02,
        size: 5,
        shape: 'circle',
    });
}

export function showConfetti(fullScreen = true) {
    if (!canAnimate()) return;
    particles.init();
    
    const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
    const shapes = ['circle', 'square', 'star'];
    
    const emitConfetti = () => {
        const count = fullScreen ? 50 : 20;
        const width = window.innerWidth;
        
        for (let i = 0; i < count; i++) {
            const x = fullScreen ? Math.random() * width : width / 2;
            const y = -10;
            
            particles.emit(x, y, 1, {
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 15,
                vy: Math.random() * 3 + 2,
                gravity: 0.15,
                friction: 0.99,
                decay: 0.005,
                size: Math.random() * 8 + 4,
                shape: shapes[Math.floor(Math.random() * shapes.length)],
            });
        }
    };
    
    // Multiple bursts
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
    particles.init();
    
    const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
    
    const burst = (x, y) => {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const count = 40;
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 5 + Math.random() * 5;
            
            particles.emit(x, y, 1, {
                color,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 0.1,
                decay: 0.015,
                size: 4,
                shape: 'circle',
            });
        }
    };
    
    // Multiple fireworks
    burst(window.innerWidth * 0.3, window.innerHeight * 0.4);
    setTimeout(() => burst(window.innerWidth * 0.7, window.innerHeight * 0.3), 300);
    setTimeout(() => burst(window.innerWidth * 0.5, window.innerHeight * 0.5), 600);
}

export function showLevelUpEffect() {
    if (!canAnimate()) return;
    particles.init();
    
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // Golden burst
    for (let i = 0; i < 60; i++) {
        const angle = (i / 60) * Math.PI * 2;
        const speed = 8 + Math.random() * 4;
        
        particles.emit(centerX, centerY, 1, {
            color: `hsl(${45 + Math.random() * 15}, 100%, 55%)`,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            gravity: 0.05,
            decay: 0.01,
            size: 6,
            shape: 'star',
        });
    }
    
    // Secondary ring
    setTimeout(() => {
        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2;
            const speed = 12;
            
            particles.emit(centerX, centerY, 1, {
                color: `hsl(${280 + Math.random() * 20}, 80%, 60%)`,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 0.02,
                decay: 0.015,
                size: 4,
            });
        }
    }, 150);
}

export function showAchievementEffect(element) {
    if (!canAnimate()) return;
    particles.init();
    
    const rect = element ? element.getBoundingClientRect() : {
        left: window.innerWidth / 2,
        top: window.innerHeight / 2,
        width: 0,
        height: 0
    };
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    // Golden sparkles spiral
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const angle = (i / 30) * Math.PI * 4;
            const distance = 20 + i * 2;
            
            particles.emit(
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
                    shape: 'star',
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
    
    // Floating +XP text
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
    
    // Small particles
    particles.emit(x, y, 8, {
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
    element.classList.add('shake');
    setTimeout(() => element.classList.remove('shake'), 500);
}

export function addPulseAnimation(element) {
    if (!canAnimate() || !element) return;
    element.classList.add('pulse');
    setTimeout(() => element.classList.remove('pulse'), 600);
}

export function addBounceAnimation(element) {
    if (!canAnimate() || !element) return;
    element.classList.add('bounce');
    setTimeout(() => element.classList.remove('bounce'), 500);
}

// ==================== STREAK FIRE ====================

let fireCanvas = null;
let fireCtx = null;
let fireParticles = [];
let fireAnimationId = null;

export function showStreakFire(element, intensity = 1) {
    if (!canAnimate() || !element) return;
    
    if (!fireCanvas) {
        fireCanvas = document.createElement('canvas');
        fireCanvas.id = 'fire-canvas';
        fireCanvas.style.cssText = `
            position: fixed;
            pointer-events: none;
            z-index: 9998;
        `;
        document.body.appendChild(fireCanvas);
        fireCtx = fireCanvas.getContext('2d');
    }
    
    const rect = element.getBoundingClientRect();
    fireCanvas.style.left = `${rect.left - 20}px`;
    fireCanvas.style.top = `${rect.top - 40}px`;
    fireCanvas.width = rect.width + 40;
    fireCanvas.height = rect.height + 60;
    fireCanvas.style.display = 'block';
    
    // Emit fire particles
    const emitFire = () => {
        const count = Math.floor(intensity * 3);
        for (let i = 0; i < count; i++) {
            fireParticles.push({
                x: 20 + Math.random() * rect.width,
                y: rect.height + 40,
                vx: (Math.random() - 0.5) * 2,
                vy: -2 - Math.random() * 3 * intensity,
                size: 4 + Math.random() * 4,
                life: 1,
                hue: 20 + Math.random() * 30,
            });
        }
    };
    
    const animateFire = () => {
        fireCtx.clearRect(0, 0, fireCanvas.width, fireCanvas.height);
        
        fireParticles = fireParticles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            p.size *= 0.98;
            
            if (p.life > 0) {
                fireCtx.beginPath();
                fireCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                fireCtx.fillStyle = `hsla(${p.hue}, 100%, 50%, ${p.life})`;
                fireCtx.fill();
            }
            
            return p.life > 0;
        });
        
        if (fireParticles.length > 0 || intensity > 0) {
            fireAnimationId = requestAnimationFrame(animateFire);
        }
    };
    
    // Start emitting
    const emitInterval = setInterval(emitFire, 50);
    
    if (!fireAnimationId) {
        animateFire();
    }
    
    // Return cleanup function
    return () => {
        clearInterval(emitInterval);
        intensity = 0;
        setTimeout(() => {
            if (fireCanvas) {
                fireCanvas.style.display = 'none';
            }
            fireParticles = [];
        }, 500);
    };
}

export function hideStreakFire() {
    if (fireCanvas) {
        fireCanvas.style.display = 'none';
    }
    fireParticles = [];
}

// ==================== CLEANUP ====================

export function clearAllAnimations() {
    particles.clear();
    hideStreakFire();
}

// Add required CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes xpFloat {
        0% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-60px); }
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
    
    .shake { animation: shake 0.5s ease-in-out; }
    .pulse { animation: pulse 0.6s ease-in-out; }
    .bounce { animation: bounce 0.5s ease-in-out; }
`;
document.head.appendChild(style);
