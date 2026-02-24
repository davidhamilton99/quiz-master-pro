/* SRS Review Component - Spaced Repetition Review Screen */
import { getState, setState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { getDueCards, submitReview, getSrsStats } from '../services/api.js';
import { showToast } from '../utils/toast.js';

let srs = {
    cards: [],
    currentIndex: 0,
    isFlipped: false,
    stats: null,
    sessionCorrect: 0,
    sessionTotal: 0,
    loading: true,
};

export async function initSrsReview() {
    srs = {
        cards: [],
        currentIndex: 0,
        isFlipped: false,
        stats: null,
        sessionCorrect: 0,
        sessionTotal: 0,
        loading: true,
    };
    setState({ view: 'srsReview' });

    try {
        const [dueData, statsData] = await Promise.all([
            getDueCards(50),
            getSrsStats(),
        ]);
        srs.cards = dueData.cards || [];
        srs.stats = statsData;
        srs.loading = false;
        setState({ view: 'srsReview' });
    } catch (e) {
        srs.loading = false;
        srs.cards = [];
        showToast('Failed to load review cards', 'error');
        setState({ view: 'srsReview' });
    }
}

export function renderSrsReview() {
    if (srs.loading) {
        return `
        <div class="srs-container">
            <div class="srs-loading">
                <div class="spinner"></div>
                <p class="text-muted">Loading review cards...</p>
            </div>
        </div>`;
    }

    if (srs.cards.length === 0 && srs.sessionTotal === 0) {
        return renderEmptyState();
    }

    const card = srs.cards[srs.currentIndex];
    if (!card) {
        return renderSessionComplete();
    }

    const total = srs.cards.length;
    const progress = total > 0 ? ((srs.currentIndex + 1) / total) * 100 : 0;

    return `
    <div class="srs-container">
        <!-- Top Bar -->
        <div class="srs-topbar">
            <button class="btn btn-ghost btn-icon" onclick="window.app.exitSrsReview()">
                ${icon('arrowLeft')}
            </button>
            <div class="srs-title">
                ${icon('brain')} Spaced Repetition Review
            </div>
            <div class="srs-counter">${srs.currentIndex + 1} / ${total}</div>
        </div>

        <!-- Progress Bar -->
        <div class="srs-progress-bar">
            <div class="srs-progress-fill" style="width: ${progress}%"></div>
        </div>

        <!-- Stats Bar -->
        ${srs.stats ? `
        <div class="srs-stats-bar">
            <div class="srs-stat">
                <span class="srs-stat-num">${srs.stats.due_today || 0}</span>
                <span class="srs-stat-label">Due Today</span>
            </div>
            <div class="srs-stat">
                <span class="srs-stat-num">${srs.stats.learning || 0}</span>
                <span class="srs-stat-label">Learning</span>
            </div>
            <div class="srs-stat">
                <span class="srs-stat-num">${srs.stats.graduated || 0}</span>
                <span class="srs-stat-label">Mastered</span>
            </div>
            <div class="srs-stat">
                <span class="srs-stat-num">${srs.stats.streak || 0}</span>
                <span class="srs-stat-label">Streak</span>
            </div>
        </div>
        ` : ''}

        <!-- Card -->
        <div class="srs-card-area">
            <div class="srs-card ${srs.isFlipped ? 'flipped' : ''}" onclick="window.app.srsFlip()">
                <!-- Front -->
                <div class="srs-card-face srs-card-front">
                    <div class="srs-card-type">${getTypeLabel(card.type)}</div>
                    <div class="srs-card-content">
                        ${escapeHtml(card.question_text || '')}
                    </div>
                    ${card.code ? `<pre class="code-block"><code>${escapeHtml(card.code)}</code></pre>` : ''}
                    <div class="srs-tap-hint">Tap to reveal answer</div>
                </div>

                <!-- Back -->
                <div class="srs-card-face srs-card-back">
                    <div class="srs-card-label">Answer</div>
                    <div class="srs-card-content srs-answer">
                        ${formatAnswer(card)}
                    </div>
                    ${card.explanation ? `
                        <div class="srs-explanation">
                            ${icon('lightbulb')} ${escapeHtml(card.explanation)}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>

        <!-- Rating Buttons (shown after flip) -->
        <div class="srs-rating-area ${srs.isFlipped ? 'visible' : ''}">
            <p class="srs-rating-prompt">How well did you know this?</p>
            <div class="srs-rating-buttons">
                <button class="srs-rate-btn srs-rate-again" onclick="window.app.srsRate(0)">
                    <span class="srs-rate-label">Again</span>
                    <span class="srs-rate-desc">Forgot</span>
                </button>
                <button class="srs-rate-btn srs-rate-hard" onclick="window.app.srsRate(2)">
                    <span class="srs-rate-label">Hard</span>
                    <span class="srs-rate-desc">Struggled</span>
                </button>
                <button class="srs-rate-btn srs-rate-good" onclick="window.app.srsRate(4)">
                    <span class="srs-rate-label">Good</span>
                    <span class="srs-rate-desc">Recalled</span>
                </button>
                <button class="srs-rate-btn srs-rate-easy" onclick="window.app.srsRate(5)">
                    <span class="srs-rate-label">Easy</span>
                    <span class="srs-rate-desc">Instant</span>
                </button>
            </div>
        </div>
    </div>
    `;
}

function renderEmptyState() {
    const stats = srs.stats;
    return `
    <div class="srs-container">
        <div class="srs-topbar">
            <button class="btn btn-ghost btn-icon" onclick="window.app.exitSrsReview()">
                ${icon('arrowLeft')}
            </button>
            <div class="srs-title">${icon('brain')} Spaced Repetition</div>
            <div></div>
        </div>

        <div class="srs-empty">
            <div class="srs-empty-icon">${icon('check', 'icon-3xl')}</div>
            <h2>All caught up!</h2>
            <p class="text-muted">No cards due for review right now.</p>
            ${stats ? `
            <div class="srs-overview-stats">
                <div class="srs-overview-stat">
                    <strong>${stats.total_cards || 0}</strong>
                    <span>Total Cards</span>
                </div>
                <div class="srs-overview-stat">
                    <strong>${stats.graduated || 0}</strong>
                    <span>Mastered</span>
                </div>
                <div class="srs-overview-stat">
                    <strong>${stats.streak || 0}</strong>
                    <span>Day Streak</span>
                </div>
            </div>
            ` : ''}
            <p class="text-muted" style="margin-top:1rem;">Cards are automatically added when you get quiz questions wrong.</p>
            <button class="btn btn-primary" onclick="window.app.navigate('home')">
                ${icon('arrowLeft')} Back to Home
            </button>
        </div>
    </div>
    `;
}

function renderSessionComplete() {
    const accuracy = srs.sessionTotal > 0 ? Math.round((srs.sessionCorrect / srs.sessionTotal) * 100) : 0;
    return `
    <div class="srs-container">
        <div class="srs-topbar">
            <button class="btn btn-ghost btn-icon" onclick="window.app.exitSrsReview()">
                ${icon('arrowLeft')}
            </button>
            <div class="srs-title">${icon('brain')} Review Complete</div>
            <div></div>
        </div>

        <div class="srs-complete">
            <div class="srs-complete-icon">${icon('trophy', 'icon-3xl')}</div>
            <h2>Session Complete!</h2>
            <p class="text-muted">You reviewed ${srs.sessionTotal} card${srs.sessionTotal !== 1 ? 's' : ''}</p>

            <div class="srs-complete-stats">
                <div class="srs-comp-stat">
                    <span class="srs-comp-num text-success">${srs.sessionCorrect}</span>
                    <span>Recalled</span>
                </div>
                <div class="srs-comp-stat">
                    <span class="srs-comp-num text-error">${srs.sessionTotal - srs.sessionCorrect}</span>
                    <span>Forgot</span>
                </div>
                <div class="srs-comp-stat">
                    <span class="srs-comp-num">${accuracy}%</span>
                    <span>Accuracy</span>
                </div>
            </div>

            <div class="srs-complete-actions">
                <button class="btn btn-primary btn-lg" onclick="window.app.navigate('home')">
                    ${icon('arrowLeft')} Back to Home
                </button>
            </div>
        </div>
    </div>
    `;
}

function getTypeLabel(type) {
    const labels = {
        'choice': 'Multiple Choice', 'truefalse': 'True/False',
        'matching': 'Matching', 'ordering': 'Ordering', 'multiselect': 'Multi-Select'
    };
    return labels[type] || 'Question';
}

function formatAnswer(card) {
    if (card.type === 'truefalse') {
        const val = Array.isArray(card.correct) ? card.correct[0] : card.correct;
        const isTrue = val === 0 || val === true || val === 'true';
        return `<p>${isTrue ? 'True' : 'False'}</p>`;
    }
    if (card.type === 'matching' && card.pairs) {
        const pairs = typeof card.pairs === 'string' ? JSON.parse(card.pairs) : card.pairs;
        return pairs.map(p => `<div>${escapeHtml(p.left)} &rarr; ${escapeHtml(p.right)}</div>`).join('');
    }
    if (card.type === 'ordering' && card.options) {
        const items = typeof card.options === 'string' ? JSON.parse(card.options) : card.options;
        return items.map((item, i) => `<div>${i + 1}. ${escapeHtml(typeof item === 'string' ? item : item.text || item)}</div>`).join('');
    }
    // Multiple choice / multi-select
    const options = typeof card.options === 'string' ? JSON.parse(card.options) : (card.options || []);
    const correct = typeof card.correct === 'string' ? JSON.parse(card.correct) : card.correct;
    if (Array.isArray(correct)) {
        return correct.map(i => `<p>${escapeHtml(options[i] || '')}</p>`).join('');
    }
    return `<p>${escapeHtml(options[correct] || '')}</p>`;
}

// === Actions ===

export function srsFlip() {
    srs.isFlipped = !srs.isFlipped;

    const card = document.querySelector('.srs-card');
    if (card) {
        card.classList.toggle('flipped', srs.isFlipped);
        document.querySelector('.srs-rating-area')?.classList.toggle('visible', srs.isFlipped);
    } else {
        setState({ view: 'srsReview' });
    }
}

export async function srsRate(quality) {
    const card = srs.cards[srs.currentIndex];
    if (!card) return;

    srs.sessionTotal++;
    if (quality >= 3) srs.sessionCorrect++;

    // Submit review to backend (fire-and-forget)
    submitReview(card.id, quality).catch(e => console.error('SRS review failed:', e));

    // Advance to next card
    srs.currentIndex++;
    srs.isFlipped = false;
    setState({ view: 'srsReview' });
}

export function exitSrsReview() {
    setState({ view: 'home' });
}
