/* Results Component */
import { getState, setState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { startQuiz } from './quiz.js';

export function renderResults() {
    const state = getState(), quiz = state.currentQuiz;
    if (!quiz) { setState({ view: 'library' }); return ''; }
    const score = calcScore(), total = quiz.questions.length, pct = Math.round((score / total) * 100);
    const msg = pct >= 90 ? '🏆 Outstanding!' : pct >= 80 ? '🌟 Great job!' : pct >= 70 ? '👍 Good work!' : pct >= 60 ? '💪 Not bad!' : '📚 Keep practicing!';

    return `<div class="results-page"><div class="container container-sm">
        <div class="results-hero">
            <div class="results-score"><div class="results-score-pct">${pct}%</div><div class="results-score-label">${score} of ${total}</div></div>
            <h1 class="results-msg">${msg}</h1><p class="text-muted">${escapeHtml(quiz.title)}</p>
            ${state.maxStreak > 1 ? `<span class="badge badge-primary mt-2">🔥 Streak: ${state.maxStreak}</span>` : ''}
        </div>
        <div class="results-stats">
            <div class="card stat-card"><div class="stat-value text-success">${score}</div><div class="stat-label">Correct</div></div>
            <div class="card stat-card"><div class="stat-value text-error">${total - score}</div><div class="stat-label">Incorrect</div></div>
            <div class="card stat-card"><div class="stat-value">${state.flaggedQuestions.size}</div><div class="stat-label">Flagged</div></div>
        </div>
        <div class="results-actions">
            <button class="btn btn-primary btn-lg" onclick="window.app.navigate('review')">📝 Review</button>
            <button class="btn btn-secondary btn-lg" onclick="window.app.retryQuiz()">🔄 Retry</button>
            <button class="btn btn-ghost btn-lg" onclick="window.app.navigate('library')">← Library</button>
        </div>
    </div></div>`;
}

export function renderReview() {
    const state = getState(), quiz = state.currentQuiz;
    if (!quiz) { setState({ view: 'library' }); return ''; }
    return `<nav class="navbar"><div class="container"><div class="navbar-inner"><button class="btn btn-ghost" onclick="window.app.navigate('results')">← Results</button><h2 style="font-size:1rem">Review</h2><div style="width:80px"></div></div></div></nav>
    <main class="container container-sm" style="padding:2rem 1rem">
        ${quiz.questions.map((q, i) => renderReviewItem(q, i)).join('')}
        <div class="flex gap-3 mt-6"><button class="btn btn-primary flex-1" onclick="window.app.retryQuiz()">🔄 Retry</button><button class="btn btn-ghost flex-1" onclick="window.app.navigate('library')">Library</button></div>
    </main>`;
}

function renderReviewItem(q, i) {
    const state = getState(), ans = state.answers[i] || [], correct = checkCorrect(q, ans);
    return `<div class="card review-item mb-4" style="${!correct ? 'border-left:4px solid var(--error)' : ''}">
        <div class="review-header"><span>${correct ? '✅' : '❌'}</span><span class="badge ${correct ? 'badge-success' : 'badge-error'}">${correct ? 'Correct' : 'Incorrect'}</span><span class="text-sm text-muted">Q${i + 1}</span></div>
        <h3 class="mb-4">${escapeHtml(q.question)}</h3>
        ${q.code ? `<div class="code-block mb-4"><pre class="code-body">${escapeHtml(q.code)}</pre></div>` : ''}
        ${q.type === 'ordering' ? q.correct.map((ci, pos) => `<div class="review-opt ${ans[pos] === ci ? 'correct' : 'wrong'}">${pos + 1}. ${escapeHtml(q.options[ci])}</div>`).join('') :
        q.options.map((opt, j) => { const sel = ans.includes(j), cor = q.correct.includes(j); return `<div class="review-opt${cor ? ' correct' : ''}${sel && !cor ? ' wrong' : ''}">${String.fromCharCode(65 + j)}. ${escapeHtml(opt)}${cor && sel ? ' ✓' : cor ? ' (correct)' : sel ? ' ✗' : ''}</div>`; }).join('')}
        ${q.explanation ? `<div class="explanation mt-4">💡 ${escapeHtml(q.explanation)}</div>` : ''}
    </div>`;
}

function calcScore() { const s = getState(); return s.currentQuiz.questions.filter((q, i) => checkCorrect(q, s.answers[i] || [])).length; }
function checkCorrect(q, ans) {
    if (!ans || !ans.length) return false;
    if (q.type === 'ordering') return JSON.stringify(ans) === JSON.stringify(q.correct);
    return new Set(ans).size === new Set(q.correct).size && ans.every(a => q.correct.includes(a));
}

export function retryQuiz() { const s = getState(); if (s.currentQuiz) startQuiz(s.currentQuiz.id, { fresh: true, study: s.studyMode }); }
