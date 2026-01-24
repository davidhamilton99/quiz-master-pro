/* ============================================
   Sound System - Audio Feedback
   ============================================ */

import { getState } from '../state.js';

// Audio context for generating sounds
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

// Check if sound is enabled
function canPlaySound() {
    return getState().soundEnabled;
}

// Generate a tone
function playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (!canPlaySound()) return;
    
    try {
        const ctx = getAudioContext();
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

// Play a sequence of tones
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
    // Higher pitch with streak
    const baseFreq = 523.25; // C5
    const freq = baseFreq + (streakCount * 30); // Pitch rises with streak
    playTone(Math.min(freq, 1046.5), 0.15, 'sine', 0.25);
    
    // Add sparkle for streaks
    if (streakCount >= 5) {
        setTimeout(() => playTone(1318.51, 0.1, 'sine', 0.15), 50);
    }
}

export function playWrong() {
    // Soft descending tone
    playTone(311.13, 0.2, 'sine', 0.2);
    setTimeout(() => playTone(261.63, 0.2, 'sine', 0.15), 100);
}

export function playStreakMilestone(streak) {
    // Musical flourish for streak milestones
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
    // Triumphant fanfare
    playSequence([
        { freq: 523.25, duration: 0.15 },
        { freq: 659.25, duration: 0.15 },
        { freq: 783.99, duration: 0.15 },
        { freq: 1046.5, duration: 0.3 },
    ], 120);
    
    // Add harmony
    setTimeout(() => {
        playSequence([
            { freq: 392, duration: 0.15, volume: 0.2 },
            { freq: 523.25, duration: 0.15, volume: 0.2 },
            { freq: 659.25, duration: 0.15, volume: 0.2 },
            { freq: 783.99, duration: 0.3, volume: 0.2 },
        ], 120);
    }, 30);
}

export function playAchievement() {
    // Magical chime
    playSequence([
        { freq: 1046.5, duration: 0.1, volume: 0.2 },
        { freq: 1318.51, duration: 0.1, volume: 0.25 },
        { freq: 1567.98, duration: 0.2, volume: 0.3 },
    ], 100);
    
    // Sparkle
    setTimeout(() => {
        playTone(2093, 0.3, 'sine', 0.1);
    }, 250);
}

export function playPerfectScore() {
    // Epic celebration
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

export function playClick() {
    playTone(800, 0.05, 'sine', 0.1);
}

export function playHover() {
    playTone(600, 0.03, 'sine', 0.05);
}

export function playTimerWarning() {
    // Heartbeat-like pulse
    playTone(200, 0.15, 'sine', 0.2);
    setTimeout(() => playTone(180, 0.1, 'sine', 0.15), 150);
}

export function playTimerUrgent() {
    // Faster, more urgent
    playTone(250, 0.1, 'sine', 0.25);
    setTimeout(() => playTone(220, 0.08, 'sine', 0.2), 100);
}

export function playQuizStart() {
    playSequence([
        { freq: 392, duration: 0.1 },
        { freq: 523.25, duration: 0.15 },
    ], 100);
}

export function playQuizEnd() {
    playSequence([
        { freq: 659.25, duration: 0.15 },
        { freq: 523.25, duration: 0.2 },
    ], 120);
}

export function playXPGain() {
    // Coin-like sound
    playTone(1200, 0.08, 'sine', 0.15);
    setTimeout(() => playTone(1400, 0.1, 'sine', 0.1), 50);
}

export function playGemGain() {
    // Crystal-like sound
    playTone(1800, 0.15, 'sine', 0.15);
    setTimeout(() => playTone(2200, 0.1, 'sine', 0.1), 80);
    setTimeout(() => playTone(2600, 0.08, 'sine', 0.08), 150);
}

// Initialize audio on first user interaction
export function initAudio() {
    const unlock = () => {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
    };
    
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
}
