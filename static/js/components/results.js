/* Results Component - SPECTACULAR Edition */
import { getState, setState, getLevelInfo, getUnlockedAchievements } from '../state.js';
import { escapeHtml } from '../utils/dom.js';

export function renderResults() {
    const state = getState();
    const results = state.quizResults || {};
    const { correct, total, percentage, isPerfect, answers } = results;
    const quiz = state.currentQuiz;
    const profile = state.playerProfile;
    const levelInfo = getLevelInfo(profile.xp);

    if (!quiz) {
        return `<div class="results-page container">
            <div class="text-center">
                <h2>No results available</h2>
                <button class="btn btn-primary mt-4" onclick="window.app.navigate('library')">Back to Library</button>
            </div>
        </div>`;
    }

    const isSim = results.isSimulation;
    const message = isSim ? getSimMessage(results.passed, percentage) : getMessage(percentage);
    const tierColors = {
        bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700',
        platinum: '#e5e4e2', diamond: '#b9f2ff', legendary: '#ff6b6b'
    };

    return `
<style>
.sim-pass-badge{display:inline-block;padding:0.5rem 1.5rem;border-radius:2rem;font-size:1.1rem;font-weight:700;margin-bottom:1rem}
.sim-pass-badge.pass{background:rgba(52,211,153,0.15);color:#34d399;border:1px solid rgba(52,211,153,0.3)}
.sim-pass-badge.fail{background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3)}
.sim-cert-name{font-size:0.85rem;color:#a1a1aa;margin-bottom:0.5rem}
.domain-breakdown{margin:1.5rem 0;text-align:left}
.domain-breakdown-title{font-size:0.9rem;font-weight:600;color:#e4e4e7;margin-bottom:0.75rem}
.domain-row{display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.06)}
.domain-row:last-child{border-bottom:none}
.domain-row-name{flex:1;font-size:0.85rem;color:#a1a1aa}
.domain-row-score{font-size:0.85rem;font-weight:500;min-width:60px;text-align:right}
.domain-row-bar{width:80px;height:5px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden}
.domain-row-fill{height:100%;border-radius:3px}
.sim-time{font-size:0.8rem;color:#71717a;margin-top:0.5rem}
</style>
        <div class="results-page">
            <div class="container">
                <div class="results-hero">
                    ${isSim ? `
                        <div class="sim-pass-badge ${results.passed ? 'pass' : 'fail'}">
                            ${results.passed ? '✓ PASSED' : '✕ FAILED'}
                        </div>
                        <div class="sim-cert-name">${escapeHtml(results.certName || '')}</div>
                    ` : ''}
                    ${isPerfect && !isSim ? '<div class="perfect-banner">🏆 PERFECT SCORE! 🏆</div>' : ''}

                    <div class="results-score ${isPerfect ? 'perfect' : ''}" style="--score-color: ${getScoreColor(percentage)}">
                        <span class="results-score-pct" id="score-counter">0</span>
                        <span class="results-score-percent">%</span>
                    </div>

                    <h2 class="results-msg">${message.emoji} ${message.text}</h2>
                    <p class="text-muted">${escapeHtml(quiz.title)}</p>
                    ${isSim && results.timeTaken ? `<div class="sim-time">Completed in ${Math.floor(results.timeTaken / 60)}m ${results.timeTaken % 60}s</div>` : ''}

                    <div class="results-stats">
                        <div class="stat-card">
                            <div class="stat-value text-success">${correct}</div>
                            <div class="stat-label">Correct</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value text-error">${total - correct}</div>
                            <div class="stat-label">Incorrect</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${total}</div>
                            <div class="stat-label">Total</div>
                        </div>
                    </div>

                    ${isSim && results.domainScores ? renderDomainBreakdown(results.domainScores) : ''}

                    ${!isSim ? `
                    <!-- XP & Progress Section -->
                    <div class="results-progress card">
                        <div class="progress-header">
                            <div class="level-info">
                                <div class="level-badge-small" style="--tier-color: ${tierColors[levelInfo.tier]}">
                                    ${levelInfo.level}
                                </div>
                                <div>
                                    <div class="level-title">${escapeHtml(levelInfo.title)}</div>
                                    <div class="xp-text-small">${profile.xp} XP</div>
                                </div>
                            </div>
                            <div class="streak-info">
                                ${profile.dailyStreak > 0 ? `
                                    <span class="streak-badge">🔥 ${profile.dailyStreak} day streak</span>
                                ` : ''}
                            </div>
                        </div>
                        <div class="xp-bar-large">
                            <div class="xp-bar-fill" style="width: ${levelInfo.progress * 100}%"></div>
                            <span class="xp-bar-text">${levelInfo.xpInLevel} / ${levelInfo.xpForNext} XP to level ${levelInfo.level + 1}</span>
                        </div>
                    </div>
                    ` : ''}

                    <div class="results-actions">
                        ${isSim ? `
                            <button class="btn btn-primary btn-lg" onclick="window.app.openDashboard()">
                                📊 Back to Dashboard
                            </button>
                        ` : `
                            <button class="btn btn-primary btn-lg" onclick="window.app.retryQuiz()">
                                🔄 Try Again
                            </button>
                        `}
                        <button class="btn btn-secondary" onclick="window.app.reviewQuiz()">
                            📝 Review Answers
                        </button>
                        <button class="btn btn-ghost" onclick="window.app.navigate('library')">
                            ← Back to Library
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderDomainBreakdown(domainScores) {
    const entries = Object.entries(domainScores);
    if (entries.length === 0) return '';

    return `
    <div class="domain-breakdown">
        <div class="domain-breakdown-title">Domain Breakdown</div>
        ${entries.map(([name, data]) => {
            const pct = data.total > 0 ? Math.round(data.correct / data.total * 100) : 0;
            const color = pct >= 80 ? '#34d399' : pct >= 60 ? '#fbbf24' : '#ef4444';
            return `
            <div class="domain-row">
                <span class="domain-row-name">${escapeHtml(name)}</span>
                <span class="domain-row-score" style="color:${color}">${data.correct}/${data.total}</span>
                <div class="domain-row-bar">
                    <div class="domain-row-fill" style="width:${pct}%;background:${color}"></div>
                </div>
            </div>`;
        }).join('')}
    </div>`;
}

function getSimMessage(passed, percentage) {
    if (passed) {
        if (percentage >= 95) return { emoji: '🏆', text: 'Outstanding! Ready for exam day!' };
        if (percentage >= 85) return { emoji: '🌟', text: 'Excellent - you\'re well prepared!' };
        return { emoji: '✅', text: 'You passed! Keep practicing to build confidence.' };
    } else {
        if (percentage >= 60) return { emoji: '📈', text: 'Almost there - focus on weak domains.' };
        if (percentage >= 40) return { emoji: '💪', text: 'Making progress - review the fundamentals.' };
        return { emoji: '📚', text: 'More study needed - focus on domain objectives.' };
    }
}

export function renderReview() {
    const state = getState();
    const quiz = state.currentQuiz;
    const answers = state.quizResults?.answers || [];
    
    if (!quiz) return '';
    
    return `
        <div class="review-page">
            <header class="quiz-header">
                <button class="btn btn-ghost" onclick="window.app.navigate('results')">← Back to Results</button>
                <h2>${escapeHtml(quiz.title)} - Review</h2>
                <div></div>
            </header>
            <main class="quiz-main">
                <div class="container">
                    <div class="review-filters mb-4">
                        <button class="btn btn-sm ${state.reviewFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="window.app.setReviewFilter('all')">All</button>
                        <button class="btn btn-sm ${state.reviewFilter === 'incorrect' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="window.app.setReviewFilter('incorrect')">❌ Incorrect Only</button>
                        <button class="btn btn-sm ${state.reviewFilter === 'correct' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="window.app.setReviewFilter('correct')">✓ Correct Only</button>
                    </div>
                    
                    ${quiz.questions.map((q, i) => {
                        const userAnswer = answers[i];
                        const isCorrect = checkIfCorrect(userAnswer, q);
                        
                        // Filter
                        if (state.reviewFilter === 'incorrect' && isCorrect) return '';
                        if (state.reviewFilter === 'correct' && !isCorrect) return '';
                        
                        return `
                            <div class="review-item card ${isCorrect ? 'correct' : 'incorrect'}">
                                <div class="review-header">
                                    <span class="review-status">${isCorrect ? '✓' : '✗'}</span>
                                    <span class="review-question">Q${i + 1}: ${escapeHtml(q.question.replace(/^\[multi\]\s*/i, ""))}</span>
                                </div>
                                ${q.code ? `<pre class="code-block"><code>${escapeHtml(q.code)}</code></pre>` : ''}
                                ${renderReviewAnswer(q, userAnswer, isCorrect)}
                                ${q.explanation ? `<div class="explanation mt-3"><strong>💡</strong> ${escapeHtml(q.explanation)}</div>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </main>
        </div>
    `;
}

function renderReviewAnswer(q, userAnswer, isCorrect) {
    switch (q.type) {
        case 'truefalse':
            const correctBool = q.correct === true || q.correct === 'true';
            return `
                <div class="review-tf">
                    <div class="review-answer ${userAnswer === correctBool ? 'correct' : 'user-wrong'}">
                        Your answer: <strong>${userAnswer === true ? 'True' : userAnswer === false ? 'False' : 'Not answered'}</strong>
                    </div>
                    ${!isCorrect ? `
                        <div class="review-answer correct">
                            Correct answer: <strong>${correctBool ? 'True' : 'False'}</strong>
                        </div>
                    ` : ''}
                </div>
            `;
            
        case 'matching':
            return `
                <div class="review-matching">
                    ${q.pairs.map((pair, i) => {
                        const userMatch = userAnswer?.[i];
                        const isMatchCorrect = userMatch === i;
                        const userMatchText = userMatch !== undefined ? q.pairs[userMatch]?.right : 'Not matched';
                        return `
                            <div class="review-match-row ${isMatchCorrect ? 'correct' : 'incorrect'}">
                                <span class="match-left">${escapeHtml(pair.left)}</span>
                                <span class="match-arrow">→</span>
                                <span class="match-right ${isMatchCorrect ? '' : 'wrong'}">${escapeHtml(userMatchText)}</span>
                                ${!isMatchCorrect ? `<span class="match-correct">✓ ${escapeHtml(pair.right)}</span>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            
        case 'ordering':
            // Get items - parser stores as q.options, but may also be q.items
            const orderItems = q.items || q.options || [];
            return `
                <div class="review-ordering">
                    <div class="order-comparison">
                        <div class="order-col">
                            <div class="order-header">Your Order</div>
                            ${(userAnswer || orderItems.map((t, i) => ({ text: typeof t === 'string' ? t : t.text, origIndex: i }))).map((item, i) => `
                                <div class="order-item ${item.origIndex === i ? 'correct' : 'incorrect'}">
                                    ${i + 1}. ${escapeHtml(typeof item.text === 'string' ? item.text : item.text || item)}
                                </div>
                            `).join('')}
                        </div>
                        <div class="order-col">
                            <div class="order-header">Correct Order</div>
                            ${orderItems.map((item, i) => `
                                <div class="order-item correct">
                                    ${i + 1}. ${escapeHtml(typeof item === 'string' ? item : item.text || item)}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            
        default:
            const isMulti = Array.isArray(q.correct);
            return `
                <div class="review-options">
                    ${q.options.map((opt, i) => {
                        const letter = String.fromCharCode(65 + i);
                        const isSelected = isMulti ? (userAnswer || []).includes(i) : userAnswer === i;
                        const isCorrectOpt = isMulti ? q.correct.includes(i) : q.correct === i;
                        
                        let cls = 'review-opt';
                        if (isCorrectOpt) cls += ' correct';
                        if (isSelected && !isCorrectOpt) cls += ' wrong';
                        
                        return `
                            <div class="${cls}">
                                <span class="opt-letter">${letter}</span>
                                <span class="opt-text">${escapeHtml(opt)}</span>
                                ${isSelected ? '<span class="opt-marker">Your answer</span>' : ''}
                                ${isCorrectOpt ? '<span class="opt-marker correct">✓ Correct</span>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
    }
}

function checkIfCorrect(answer, question) {
    switch (question.type) {
        case 'truefalse':
            const correctBool = question.correct === true || question.correct === 'true';
            return answer === correctBool;
        case 'matching':
            if (!answer) return false;
            return Object.entries(answer).every(([left, right]) => parseInt(left) === parseInt(right));
        case 'ordering':
            if (!answer) return false;
            return answer.every((item, idx) => item.origIndex === idx);
        default:
            if (Array.isArray(question.correct)) {
                const ans = answer || [];
                return question.correct.length === ans.length && 
                       question.correct.every(c => ans.includes(c));
            }
            return answer === question.correct;
    }
}

function getMessage(percentage) {
    if (percentage === 100) return { emoji: '🏆', text: 'PERFECT!' };
    if (percentage >= 90) return { emoji: '🌟', text: 'Outstanding!' };
    if (percentage >= 80) return { emoji: '🎉', text: 'Great job!' };
    if (percentage >= 70) return { emoji: '👍', text: 'Good work!' };
    if (percentage >= 60) return { emoji: '📚', text: 'Keep practicing!' };
    if (percentage >= 50) return { emoji: '💪', text: 'You can do better!' };
    return { emoji: '📖', text: 'Time to study more!' };
}

function getScoreColor(percentage) {
    if (percentage >= 90) return '#10b981';
    if (percentage >= 70) return '#8b5cf6';
    if (percentage >= 50) return '#f59e0b';
    return '#ef4444';
}

// Animate score counter
export function animateScoreCounter() {
    const counter = document.getElementById('score-counter');
    if (!counter) return;
    
    const state = getState();
    const target = state.quizResults?.percentage || 0;
    const duration = 1500;
    const start = performance.now();
    
    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);
        
        counter.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Actions
export function retryQuiz() {
    const state = getState();
    if (state.currentQuiz) {
        window.app.startQuiz(state.currentQuiz.id, { restart: true });
    }
}

export function reviewQuiz() {
    setState({ view: 'review', reviewFilter: 'all' });
}

export function setReviewFilter(filter) {
    setState({ reviewFilter: filter });
}