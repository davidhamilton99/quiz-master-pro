/* ============================================
   Player HUD - XP Bar, Level, Streak Display
   ============================================ */

import { getState, getLevelInfo, getTierColor } from '../state.js';
import { escapeHtml } from './dom.js';
import { icon } from './icons.js';

export function renderPlayerHUD() {
    const state = getState();
    const profile = state.playerProfile;
    const levelInfo = getLevelInfo(profile.xp);
    const tierColor = getTierColor(levelInfo.tier);
    
    return `
        <div class="player-hud">
            <div class="hud-left">
                <div class="level-badge" style="--tier-color: ${tierColor}">
                    <span class="level-number">${levelInfo.level}</span>
                </div>
                <div class="xp-info">
                    <div class="level-title">${escapeHtml(levelInfo.title)}</div>
                    <div class="xp-bar-container">
                        <div class="xp-bar" style="width: ${levelInfo.progress * 100}%"></div>
                        <span class="xp-text">${levelInfo.xpInLevel} / ${levelInfo.xpForNext} XP</span>
                    </div>
                </div>
            </div>
            <div class="hud-right">
                ${profile.dailyStreak > 0 ? `
                    <div class="streak-display" title="${profile.dailyStreak}-day streak!">
                        <span class="streak-fire">${getStreakEmoji(profile.dailyStreak)}</span>
                        <span class="streak-count">${profile.dailyStreak}</span>
                    </div>
                ` : ''}
                <div class="gems-display" title="${profile.gems} gems">
                    <span class="gem-icon">${icon('gem')}</span>
                    <span class="gem-count">${formatNumber(profile.gems)}</span>
                </div>
            </div>
        </div>
    `;
}

export function renderQuizStreakDisplay(streak) {
    if (streak < 3) return '';
    
    const intensity = Math.min(Math.floor(streak / 5), 3);
    const fires = icon('flame').repeat(intensity + 1);
    
    let message = '';
    let className = 'streak-indicator';
    
    if (streak >= 20) {
        message = 'LEGENDARY!';
        className += ' legendary';
    } else if (streak >= 15) {
        message = 'UNSTOPPABLE!';
        className += ' unstoppable';
    } else if (streak >= 10) {
        message = 'ON FIRE!';
        className += ' on-fire';
    } else if (streak >= 5) {
        message = 'Nice streak!';
        className += ' nice';
    } else {
        message = `${streak} in a row`;
    }
    
    return `
        <div class="${className}">
            <span class="streak-flames">${fires}</span>
            <span class="streak-message">${message}</span>
            <span class="streak-number">${streak}</span>
        </div>
    `;
}

export function renderXPGainNotification(amount, reason = '') {
    const reasonText = {
        'correct_answer': 'Correct!',
        'quiz_complete': 'Quiz Complete',
        'perfect_score': 'Perfect Score!',
        'create_quiz': 'Quiz Created',
        'streak_bonus': 'Streak Bonus',
    }[reason] || '';
    
    return `
        <div class="xp-notification">
            <span class="xp-amount">+${amount} XP</span>
            ${reasonText ? `<span class="xp-reason">${reasonText}</span>` : ''}
        </div>
    `;
}

export function renderLevelUpModal(levelInfo) {
    const tierColor = getTierColor(levelInfo.tier);
    
    return `
        <div class="modal-overlay level-up-modal" onclick="this.remove()">
            <div class="level-up-content" onclick="event.stopPropagation()">
                <div class="level-up-glow" style="--tier-color: ${tierColor}"></div>
                <div class="level-up-badge" style="--tier-color: ${tierColor}">
                    <span class="level-up-number">${levelInfo.level}</span>
                </div>
                <h2 class="level-up-title">Level Up!</h2>
                <p class="level-up-subtitle">You are now a</p>
                <h3 class="level-up-rank" style="color: ${tierColor}">${escapeHtml(levelInfo.title)}</h3>
                <div class="level-up-rewards">
                    <div class="reward-item">
                        <span class="reward-icon">${icon('gem')}</span>
                        <span class="reward-text">+${levelInfo.level * 5} Gems</span>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">
                    Continue
                </button>
            </div>
        </div>
    `;
}

export function renderAchievementUnlock(achievement) {
    return `
        <div class="modal-overlay achievement-modal" onclick="this.remove()">
            <div class="achievement-content" onclick="event.stopPropagation()">
                <div class="achievement-glow"></div>
                <div class="achievement-icon-large">${achievement.icon}</div>
                <h3 class="achievement-name">${escapeHtml(achievement.name)}</h3>
                <p class="achievement-desc">${escapeHtml(achievement.desc)}</p>
                <div class="achievement-rewards">
                    <span class="reward-item">
                        <span class="reward-icon">${icon('sparkles')}</span>
                        <span>+${achievement.xp} XP</span>
                    </span>
                    <span class="reward-item">
                        <span class="reward-icon">${icon('gem')}</span>
                        <span>+10 Gems</span>
                    </span>
                </div>
                <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">
                    Awesome!
                </button>
            </div>
        </div>
    `;
}

export function renderStatsCard(profile) {
    const levelInfo = getLevelInfo(profile.xp);
    const accuracy = profile.totalAnswered > 0 
        ? Math.round((profile.totalCorrect / profile.totalAnswered) * 100) 
        : 0;
    
    return `
        <div class="stats-card">
            <h3>Your Stats</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-value">${levelInfo.level}</span>
                    <span class="stat-label">Level</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${formatNumber(profile.xp)}</span>
                    <span class="stat-label">Total XP</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${profile.dailyStreak}</span>
                    <span class="stat-label">Day Streak</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${profile.quizzesCompleted}</span>
                    <span class="stat-label">Quizzes</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${accuracy}%</span>
                    <span class="stat-label">Accuracy</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${profile.perfectScores}</span>
                    <span class="stat-label">Perfects</span>
                </div>
            </div>
        </div>
    `;
}

// Helper functions
function getStreakEmoji(streak) {
    if (streak >= 14) return icon('flame', 'icon-lg') + icon('flame', 'icon-lg') + icon('flame', 'icon-lg');
    if (streak >= 7) return icon('flame', 'icon-lg') + icon('flame', 'icon-lg');
    return icon('flame', 'icon-lg');
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}
