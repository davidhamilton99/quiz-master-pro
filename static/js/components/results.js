/* Results Component */

import { getState, setState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { startQuiz } from './quiz.js';

export function renderResults() {
    const state = getState();
    const quiz = state.currentQuiz;
    if (!quiz) { setState({ view: 'library' }); return ''; }
    
    const score = calcScore();
    const total = quiz.questions.length;
    const pct = Math.round((score / total) * 100);
    const { msg, emoji } = getMessage(pct);
    
    return `
        <div class="results-page">
            <div class="container container-sm">
                <div class="results-hero">
                    <div class="results-score">
                        <div class="results-score-pct">${pct}%</div>
                        <div class="results-score-label">${score} of ${total}</div>
                    </div>
                    <h1 class="results-msg">${emoji} ${msg}</h1>
                    <p class="text-muted">${escapeHtml(quiz.title)}</p>
                    ${state.maxStreak > 1 ? `<span class="badge badge-primary mt-2">🔥 Best streak: ${state.maxStreak}</span>` : ''}
                </div>
                
                <div class="results-stats">
                    <div class="card stat-card">
                        <div class="stat-value text-success">${score}</div>
                        <div class="stat-label">Correct</div>
                    </div>
                    <div class="card stat-card">
                        <div class="stat-value text-error">${total - score}</div>
                        <div class="stat-label">Incorrect</div>
                    </div>
                    <div class="card stat-card">
                        <div class="stat-value">${state.flaggedQuestions.size}</div>
                        <div class="stat-label">Flagged</div>
                    </div>
                </div>
                
                <div class="results-actions">
                    <button class="btn btn-primary btn-lg" onclick="window.app.navigate('review')">📝 Review Answers</button>
                    <button class="btn btn-secondary btn-lg" onclick="window.app.retryQuiz()">🔄 Try Again</button>
                    <button class="btn btn-ghost btn-lg" onclick="window.app.navigate('library')">← Back to Library</button>
                </div>
            </div>
        </div>
    `;
}

export function renderReview() {
    const state = getState();
    const quiz = state.currentQuiz;
    if (!quiz) { setState({ view: 'library' }); return ''; }
    
    return `
        <nav class="navbar">
            <div class="container">
                <div class="navbar-inner">
                    <button class="btn btn-ghost" onclick="window.app.navigate('results')">← Results</button>
                    <h2 style="font-size:1rem">Review Answers</h2>
                    <div style="width:80px"></div>
                </div>
            </div>
        </nav>
        
        <main class="container container-sm" style="padding:2rem 1rem">
            ${quiz.questions.map((q, i) => renderReviewItem(q, i)).join('')}
            
            <div class="flex gap-3 mt-6">
                <button class="btn btn-primary flex-1" onclick="window.app.retryQuiz()">🔄 Try Again</button>
                <button class="btn btn-ghost flex-1" onclick="window.app.navigate('library')">Back to Library</button>
            </div>
        </main>
    `;
}

function renderReviewItem(q, idx) {
    const state = getState();
    const userAns = state.answers[idx] || [];
    const isCorrect = checkCorrect(q, userAns);
    
    return `
        <div class="card review-item" style="${!isCorrect ? 'border-left:4px solid var(--error)' : ''}">
            <div class="review-header">
                <span class="review-status">${isCorrect ? '✅' : '❌'}</span>
                <span class="badge ${isCorrect ? 'badge-success' : 'badge-error'}">${isCorrect ? 'Correct' : 'Incorrect'}</span>
                <span class="text-sm text-muted">Q${idx + 1}</span>
            </div>
            
            <h3 class="mb-4">${escapeHtml(q.question)}</h3>
            
            ${q.code ? `
                <div class="code-block mb-4">
                    <div class="code-header">
                        <div class="code-dots"><div class="code-dot red"></div><div class="code-dot yellow"></div><div class="code-dot green"></div></div>
                    </div>
                    <pre class="code-body">${escapeHtml(q.code)}</pre>
                </div>
            ` : ''}
            
            ${q.type === 'ordering' ? renderOrderReview(q, userAns) : renderChoiceReview(q, userAns)}
            
            ${q.explanation ? `
                <div class="explanation mt-4">
                    <strong>💡 Explanation:</strong> ${escapeHtml(q.explanation)}
                </div>
            ` : ''}
        </div>
    `;
}

function renderChoiceReview(q, userAns) {
    return q.options.map((opt, i) => {
        const selected = userAns.includes(i);
        const correct = q.correct.includes(i);
        
        let cls = 'review-opt';
        if (correct) cls += ' correct';
        else if (selected) cls += ' wrong';
        
        let badge = '';
        if (correct && selected) badge = '<span class="badge badge-success">Your answer ✓</span>';
        else if (correct) badge = '<span class="badge badge-success">Correct</span>';
        else if (selected) badge = '<span class="badge badge-error">Your answer</span>';
        
        return `<div class="${cls}"><span>${String.fromCharCode(65+i)}. ${escapeHtml(opt)}</span>${badge}</div>`;
    }).join('');
}

function renderOrderReview(q, userAns) {
    return `
        <div class="text-sm text-muted mb-2">Correct order:</div>
        ${q.correct.map((correctIdx, pos) => {
            const userHadCorrect = userAns[pos] === correctIdx;
            return `<div class="review-opt ${userHadCorrect ? 'correct' : 'wrong'}">
                <span>${pos + 1}. ${escapeHtml(q.options[correctIdx])}</span>
                <span>${userHadCorrect ? '✓' : '✗'}</span>
            </div>`;
        }).join('')}
    `;
}

function calcScore() {
    const state = getState();
    let score = 0;
    state.currentQuiz.questions.forEach((q, i) => {
        if (checkCorrect(q, state.answers[i] || [])) score++;
    });
    return score;
}

function checkCorrect(q, ans) {
    if (!ans || ans.length === 0) return false;
    if (q.type === 'ordering') {
        return JSON.stringify(ans) === JSON.stringify(q.correct);
    }
    const aSet = new Set(ans);
    const cSet = new Set(q.correct);
    return aSet.size === cSet.size && [...aSet].every(a => cSet.has(a));
}

function getMessage(pct) {
    if (pct >= 90) return { msg: 'Outstanding!', emoji: '🏆' };
    if (pct >= 80) return { msg: 'Great job!', emoji: '🌟' };
    if (pct >= 70) return { msg: 'Good work!', emoji: '👍' };
    if (pct >= 60) return { msg: 'Not bad!', emoji: '💪' };
    return { msg: 'Keep practicing!', emoji: '📚' };
}

export function retryQuiz() {
    const state = getState();
    if (state.currentQuiz) {
        startQuiz(state.currentQuiz.id, { fresh: true, study: state.studyMode });
    }
}
