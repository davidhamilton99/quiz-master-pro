/* ============================================
   QUIZ MASTER PRO - Results View
   Score display and answer review
   ============================================ */

import { getState, setState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';

export function renderResults() {
    const state = getState();
    const quiz = state.currentQuiz;
    
    if (!quiz) {
        setState({ view: 'library' });
        return '';
    }
    
    const score = calculateScore();
    const total = quiz.questions.length;
    const percentage = Math.round((score / total) * 100);
    
    const { message, emoji } = getResultMessage(percentage);
    
    return `
        <div class="results-page">
            <div class="container container-sm">
                <div class="results-hero">
                    <div class="results-score">
                        <div class="results-score-value">${percentage}%</div>
                        <div class="results-score-label">${score} of ${total}</div>
                    </div>
                    
                    <h1 class="results-message">${emoji} ${message}</h1>
                    <p class="text-muted mb-4">${escapeHtml(quiz.title)}</p>
                    
                    ${state.maxStreak > 1 ? `
                        <span class="badge badge-accent" style="font-size: 0.875rem; padding: 0.5rem 1rem">
                            🔥 Best streak: ${state.maxStreak}
                        </span>
                    ` : ''}
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
                    <button class="btn btn-primary btn-lg" onclick="window.app.navigate('review')">
                        📝 Review Answers
                    </button>
                    <button class="btn btn-secondary btn-lg" onclick="window.app.retryQuiz()">
                        🔄 Try Again
                    </button>
                    <button class="btn btn-ghost btn-lg" onclick="window.app.navigate('library')">
                        ← Back to Library
                    </button>
                </div>
            </div>
        </div>
    `;
}

export function renderReview() {
    const state = getState();
    const quiz = state.currentQuiz;
    
    if (!quiz) {
        setState({ view: 'library' });
        return '';
    }
    
    return `
        <nav class="navbar">
            <div class="container">
                <div class="navbar-inner">
                    <button class="btn btn-ghost" onclick="window.app.navigate('results')">
                        ← Results
                    </button>
                    <h2 style="font-size: 1rem">Review Answers</h2>
                    <div style="width: 80px"></div>
                </div>
            </div>
        </nav>
        
        <main class="container container-md" style="padding: var(--space-8) var(--space-4)">
            ${quiz.questions.map((q, i) => renderReviewQuestion(q, i)).join('')}
            
            <div class="flex gap-4 mt-8">
                <button class="btn btn-primary flex-1" onclick="window.app.retryQuiz()">
                    🔄 Try Again
                </button>
                <button class="btn btn-ghost flex-1" onclick="window.app.navigate('library')">
                    Back to Library
                </button>
            </div>
        </main>
    `;
}

function renderReviewQuestion(question, index) {
    const state = getState();
    const userAnswer = state.answers[index] || [];
    
    let isCorrect = false;
    if (question.type === 'ordering') {
        isCorrect = JSON.stringify(userAnswer) === JSON.stringify(question.correct);
    } else {
        const answerSet = new Set(userAnswer);
        const correctSet = new Set(question.correct);
        isCorrect = answerSet.size === correctSet.size && [...answerSet].every(a => correctSet.has(a));
    }
    
    return `
        <div class="card review-question mb-4" style="${!isCorrect ? 'border-left: 4px solid var(--error)' : ''}">
            <div class="review-header">
                <span class="review-status">${isCorrect ? '✅' : '❌'}</span>
                <span class="badge ${isCorrect ? 'badge-success' : 'badge-error'}">
                    ${isCorrect ? 'Correct' : 'Incorrect'}
                </span>
                <span class="text-sm text-muted">Q${index + 1}</span>
            </div>
            
            <h3 class="mb-4">${escapeHtml(question.question)}</h3>
            
            ${question.code ? `
                <div class="code-block mb-4">
                    <div class="code-header">
                        <div class="code-dots">
                            <div class="code-dot red"></div>
                            <div class="code-dot yellow"></div>
                            <div class="code-dot green"></div>
                        </div>
                    </div>
                    <pre class="code-body">${escapeHtml(question.code)}</pre>
                </div>
            ` : ''}
            
            <div class="mb-4">
                ${question.type === 'ordering' ? 
                    renderOrderingReview(question, userAnswer) : 
                    renderChoiceReview(question, userAnswer)
                }
            </div>
            
            ${question.explanation ? `
                <div class="explanation-box">
                    <p class="font-semibold mb-2">💡 Explanation</p>
                    <p>${escapeHtml(question.explanation)}</p>
                </div>
            ` : ''}
        </div>
    `;
}

function renderChoiceReview(question, userAnswer) {
    return question.options.map((option, i) => {
        const isUserAnswer = userAnswer.includes(i);
        const isCorrect = question.correct.includes(i);
        
        let className = 'review-option';
        if (isCorrect) className += ' correct';
        if (isUserAnswer && !isCorrect) className += ' incorrect';
        
        let badge = '';
        if (isCorrect && isUserAnswer) {
            badge = '<span class="badge badge-success">Your answer ✓</span>';
        } else if (isCorrect) {
            badge = '<span class="badge badge-success">Correct</span>';
        } else if (isUserAnswer) {
            badge = '<span class="badge badge-error">Your answer</span>';
        }
        
        return `
            <div class="${className}">
                <span class="font-semibold">${String.fromCharCode(65 + i)}.</span>
                ${escapeHtml(option)}
                <span style="margin-left: auto">${badge}</span>
            </div>
        `;
    }).join('');
}

function renderOrderingReview(question, userAnswer) {
    return `
        <div class="text-sm text-muted mb-2">Correct order:</div>
        ${question.correct.map((correctIndex, position) => {
            const userHadCorrect = userAnswer[position] === correctIndex;
            return `
                <div class="review-option ${userHadCorrect ? 'correct' : 'incorrect'}">
                    ${position + 1}. ${escapeHtml(question.options[correctIndex])}
                    <span style="margin-left: auto">${userHadCorrect ? '✓' : '✗'}</span>
                </div>
            `;
        }).join('')}
    `;
}

function calculateScore() {
    const state = getState();
    let score = 0;
    
    state.currentQuiz.questions.forEach((q, i) => {
        const userAnswer = state.answers[i];
        if (!userAnswer) return;
        
        if (q.type === 'ordering') {
            if (JSON.stringify(userAnswer) === JSON.stringify(q.correct)) {
                score++;
            }
        } else {
            const answerSet = new Set(userAnswer);
            const correctSet = new Set(q.correct);
            if (answerSet.size === correctSet.size && [...answerSet].every(a => correctSet.has(a))) {
                score++;
            }
        }
    });
    
    return score;
}

function getResultMessage(percentage) {
    if (percentage >= 90) return { message: 'Outstanding!', emoji: '🏆' };
    if (percentage >= 80) return { message: 'Great job!', emoji: '🌟' };
    if (percentage >= 70) return { message: 'Good work!', emoji: '👍' };
    if (percentage >= 60) return { message: 'Not bad!', emoji: '💪' };
    return { message: 'Keep practicing!', emoji: '📚' };
}

export function retryQuiz() {
    const state = getState();
    if (state.currentQuiz) {
        // Import dynamically to avoid circular dependency
        import('./quiz.js').then(({ startQuiz }) => {
            startQuiz(state.currentQuiz.id, { studyMode: state.studyMode });
        });
    }
}

export default { renderResults, renderReview, retryQuiz };
