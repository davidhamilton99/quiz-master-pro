/* ============================================
   Sound System - Audio Feedback (Simplified)
   ============================================ */

let audioCtx = null;
let soundEnabled = true;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function canPlaySound() {
    return soundEnabled;
}

export function setSoundEnabled(enabled) {
    soundEnabled = enabled;
}

function playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (!canPlaySound()) return;
    
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
        console.warn('Audio playback failed:', e);
    }
}

function playSequence(notes, tempo = 150) {
    if (!canPlaySound()) return;
    
    notes.forEach((note, i) => {
        setTimeout(() => {
            playTone(note.freq, note.duration || 0.15, note.type || 'sine', note.volume || 0.3);
        }, i * tempo);
    });
}

// ==================== SOUND EFFECTS ====================

export function playCorrect(streakCount = 0) {
    const baseFreq = 523.25;
    const freq = baseFreq + (Math.min(streakCount, 10) * 30);
    playTone(Math.min(freq, 1046.5), 0.15, 'sine', 0.25);
    
    if (streakCount >= 5) {
        setTimeout(() => playTone(1318.51, 0.1, 'sine', 0.15), 50);
    }
}

export function playWrong() {
    playTone(311.13, 0.2, 'sine', 0.2);
    setTimeout(() => playTone(261.63, 0.2, 'sine', 0.15), 100);
}

export function playStreakMilestone(streak) {
    if (streak === 5) {
        playSequence([
            { freq: 523.25, duration: 0.1 },
            { freq: 659.25, duration: 0.1 },
            { freq: 783.99, duration: 0.15 },
        ], 80);
    } else if (streak === 10) {
        playSequence([
            { freq: 523.25, duration: 0.1 },
            { freq: 659.25, duration: 0.1 },
            { freq: 783.99, duration: 0.1 },
            { freq: 1046.5, duration: 0.2 },
        ], 70);
    } else if (streak >= 15) {
        playSequence([
            { freq: 523.25, duration: 0.08 },
            { freq: 659.25, duration: 0.08 },
            { freq: 783.99, duration: 0.08 },
            { freq: 1046.5, duration: 0.08 },
            { freq: 1318.51, duration: 0.25 },
        ], 60);
    }
}

export function playLevelUp() {
    playSequence([
        { freq: 523.25, duration: 0.15 },
        { freq: 659.25, duration: 0.15 },
        { freq: 783.99, duration: 0.15 },
        { freq: 1046.5, duration: 0.3 },
    ], 120);
}

export function playAchievement() {
    playSequence([
        { freq: 1046.5, duration: 0.1, volume: 0.2 },
        { freq: 1318.51, duration: 0.1, volume: 0.25 },
        { freq: 1567.98, duration: 0.2, volume: 0.3 },
    ], 100);
}

export function playPerfectScore() {
    playSequence([
        { freq: 523.25, duration: 0.12 },
        { freq: 523.25, duration: 0.12 },
        { freq: 523.25, duration: 0.12 },
        { freq: 659.25, duration: 0.2 },
        { freq: 783.99, duration: 0.12 },
        { freq: 659.25, duration: 0.12 },
        { freq: 783.99, duration: 0.12 },
        { freq: 1046.5, duration: 0.4 },
    ], 100);
}

export function playTimerWarning() {
    playTone(200, 0.15, 'sine', 0.2);
    setTimeout(() => playTone(180, 0.1, 'sine', 0.15), 150);
}

export function playTimerUrgent() {
    playTone(250, 0.1, 'sine', 0.25);
    setTimeout(() => playTone(220, 0.08, 'sine', 0.2), 100);
}

export function playQuizStart() {
    playSequence([
        { freq: 392, duration: 0.1 },
        { freq: 523.25, duration: 0.15 },
    ], 100);
}

// Initialize audio on first user interaction
export function initAudio() {
    const unlock = () => {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('keydown', unlock);
    };
    
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
    document.addEventListener('keydown', unlock);
}
