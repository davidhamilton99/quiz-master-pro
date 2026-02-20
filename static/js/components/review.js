/* Review - Spaced Repetition Review Interface */

import { getState, setState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { showToast } from '../utils/toast.js';

export function renderReviewSession() {
    const state = getState();
    const cards = state.reviewCards || [];
    const idx = state.reviewIndex || 0;
    const showingAnswer = state.reviewShowAnswer || false;
    const stats = state.reviewStats || {};
    const reviewed = state.reviewedCount || 0;

    if (cards.length === 0) {
        return renderEmptyReview(stats);
    }

    if (idx >= cards.length) {
        return renderReviewSummary(reviewed, cards.length, state.reviewCorrect || 0);
    }

    const card = cards[idx];

    return `
<style>
.rev-container{max-width:700px;margin:0 auto;padding:1.5rem}
.rev-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem}
.rev-back{background:none;border:1px solid rgba(255,255,255,0.1);color:#a1a1aa;padding:0.5rem 1rem;border-radius:8px;cursor:pointer;font-size:0.85rem}
.rev-back:hover{border-color:#a78bfa;color:#e4e4e7}
.rev-progress{font-size:0.85rem;color:#71717a}
.rev-progress-bar{height:4px;background:rgba(255,255,255,0.06);border-radius:2px;margin-bottom:2rem;overflow:hidden}
.rev-progress-fill{height:100%;background:linear-gradient(90deg,#a78bfa,#67e8f9);border-radius:2px;transition:width 0.3s}
.rev-card{background:#16161e;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:2rem;min-height:300px;display:flex;flex-direction:column}
.rev-quiz-name{font-size:0.75rem;color:#71717a;margin-bottom:0.75rem}
.rev-question{font-size:1.1rem;color:#e4e4e7;line-height:1.6;flex:1}
.rev-code{background:#1e1e28;border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:1rem;margin:1rem 0;font-family:'JetBrains Mono',monospace;font-size:0.85rem;color:#67e8f9;overflow-x:auto;white-space:pre}
.rev-options{margin-top:1.5rem;display:flex;flex-direction:column;gap:0.5rem}
.rev-option{padding:0.75rem 1rem;background:#1e1e28;border:1px solid rgba(255,255,255,0.06);border-radius:8px;color:#a1a1aa;font-size:0.9rem;text-align:left}
.rev-option.correct{border-color:rgba(52,211,153,0.4);background:rgba(52,211,153,0.08);color:#34d399}
.rev-option.incorrect{border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.05);color:#ef4444}
.rev-explanation{margin-top:1rem;padding:1rem;background:rgba(167,139,250,0.08);border:1px solid rgba(167,139,250,0.15);border-radius:8px;font-size:0.85rem;color:#a1a1aa}
.rev-show-btn{width:100%;padding:1rem;margin-top:1.5rem;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);color:#a78bfa;border-radius:10px;cursor:pointer;font-size:1rem;font-weight:500}
.rev-show-btn:hover{background:rgba(167,139,250,0.25)}
.rev-rating{display:flex;gap:0.5rem;margin-top:1.5rem}
.rev-rate-btn{flex:1;padding:0.875rem;border-radius:10px;cursor:pointer;font-size:0.85rem;font-weight:600;border:none;text-align:center}
.rev-rate-btn.again{background:rgba(239,68,68,0.15);color:#ef4444}
.rev-rate-btn.again:hover{background:rgba(239,68,68,0.25)}
.rev-rate-btn.hard{background:rgba(251,191,36,0.15);color:#fbbf24}
.rev-rate-btn.hard:hover{background:rgba(251,191,36,0.25)}
.rev-rate-btn.good{background:rgba(52,211,153,0.15);color:#34d399}
.rev-rate-btn.good:hover{background:rgba(52,211,153,0.25)}
.rev-rate-btn.easy{background:rgba(103,232,249,0.15);color:#67e8f9}
.rev-rate-btn.easy:hover{background:rgba(103,232,249,0.25)}
.rev-rate-hint{font-size:0.7rem;display:block;opacity:0.7;margin-top:2px}
.rev-empty{text-align:center;padding:4rem 2rem;max-width:500px;margin:0 auto}
.rev-empty h2{color:#fff;margin-bottom:1rem}
.rev-empty p{color:#71717a;margin-bottom:0.5rem}
.rev-empty-stats{display:flex;justify-content:center;gap:2rem;margin:2rem 0}
.rev-empty-stat{text-align:center}
.rev-empty-val{font-size:1.5rem;font-weight:700;color:#a78bfa}
.rev-empty-label{font-size:0.75rem;color:#71717a}
.rev-summary{text-align:center;padding:3rem 2rem;max-width:500px;margin:0 auto}
.rev-summary h2{color:#fff;margin-bottom:0.5rem}
.rev-summary-stats{display:flex;justify-content:center;gap:2rem;margin:2rem 0}
.rev-summary-val{font-size:2rem;font-weight:700}
.rev-summary-label{font-size:0.75rem;color:#71717a}
.rev-done-btn{display:inline-block;margin-top:1rem;padding:0.75rem 2rem;background:linear-gradient(135deg,#a78bfa,#67e8f9);color:#0f0f14;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-size:1rem}
</style>
<div class="rev-container">
    <div class="rev-header">
        <button class="rev-back" onclick="window.app.exitReview()">← Exit Review</button>
        <span class="rev-progress">${idx + 1} / ${cards.length}</span>
    </div>
    <div class="rev-progress-bar">
        <div class="rev-progress-fill" style="width:${(idx / cards.length) * 100}%"></div>
    </div>

    <div class="rev-card">
        <div class="rev-quiz-name">${escapeHtml(card.quiz_title || '')}</div>
        <div class="rev-question">${escapeHtml(card.question_text)}</div>
        ${card.code ? `<div class="rev-code">${escapeHtml(card.code)}</div>` : ''}

        ${showingAnswer ? renderAnswer(card) : ''}

        ${!showingAnswer ? `
            <button class="rev-show-btn" onclick="window.app.revShowAnswer()">Show Answer</button>
        ` : `
            <div class="rev-rating">
                <button class="rev-rate-btn again" onclick="window.app.revRate(1)">
                    Again<span class="rev-rate-hint">&lt;1m</span>
                </button>
                <button class="rev-rate-btn hard" onclick="window.app.revRate(2)">
                    Hard<span class="rev-rate-hint">~1d</span>
                </button>
                <button class="rev-rate-btn good" onclick="window.app.revRate(4)">
                    Good<span class="rev-rate-hint">~6d</span>
                </button>
                <button class="rev-rate-btn easy" onclick="window.app.revRate(5)">
                    Easy<span class="rev-rate-hint">~15d</span>
                </button>
            </div>
        `}
    </div>
</div>`;
}

function renderAnswer(card) {
    let answerHtml = '';

    if (card.type === 'choice' || card.type === 'truefalse') {
        const options = card.options || [];
        const correct = card.correct || [];
        answerHtml = `<div class="rev-options">
            ${options.map((opt, i) => `
                <div class="rev-option ${correct.includes(i) ? 'correct' : ''}">${escapeHtml(opt)}</div>
            `).join('')}
        </div>`;
    } else if (card.type === 'matching') {
        const pairs = card.pairs || [];
        answerHtml = `<div class="rev-options">
            ${pairs.map(p => `
                <div class="rev-option correct">${escapeHtml(p.left)} → ${escapeHtml(p.right)}</div>
            `).join('')}
        </div>`;
    }

    if (card.explanation) {
        answerHtml += `<div class="rev-explanation">${escapeHtml(card.explanation)}</div>`;
    }

    return answerHtml;
}

function renderEmptyReview(stats) {
    return `
<div class="rev-container">
    <div class="rev-header">
        <button class="rev-back" onclick="window.app.navigate('library')">← Back</button>
    </div>
    <div class="rev-empty">
        <h2>All Caught Up!</h2>
        <p>No questions due for review right now.</p>
        ${stats.total ? `
            <div class="rev-empty-stats">
                <div class="rev-empty-stat">
                    <div class="rev-empty-val">${stats.total}</div>
                    <div class="rev-empty-label">Total Cards</div>
                </div>
                <div class="rev-empty-stat">
                    <div class="rev-empty-val">${stats.due_week || 0}</div>
                    <div class="rev-empty-label">Due This Week</div>
                </div>
                <div class="rev-empty-stat">
                    <div class="rev-empty-val">${stats.graduated || 0}</div>
                    <div class="rev-empty-label">Mastered</div>
                </div>
            </div>
        ` : '<p style="margin-top:1rem;color:#a1a1aa">Questions you get wrong will automatically be added to your review deck.</p>'}
        <button class="rev-done-btn" onclick="window.app.navigate('library')">Back to Library</button>
    </div>
</div>`;
}

function renderReviewSummary(reviewed, total, correct) {
    const accuracy = reviewed > 0 ? Math.round(correct / reviewed * 100) : 0;
    return `
<div class="rev-container">
    <div class="rev-summary">
        <h2>Review Complete!</h2>
        <p style="color:#71717a">You reviewed ${reviewed} cards</p>
        <div class="rev-summary-stats">
            <div>
                <div class="rev-summary-val" style="color:#34d399">${accuracy}%</div>
                <div class="rev-summary-label">Retention</div>
            </div>
            <div>
                <div class="rev-summary-val" style="color:#a78bfa">${reviewed}</div>
                <div class="rev-summary-label">Reviewed</div>
            </div>
        </div>
        <button class="rev-done-btn" onclick="window.app.navigate('library')">Done</button>
    </div>
</div>`;
}
