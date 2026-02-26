/* Results Component */
import { getState, setState, getLevelInfo, getUnlockedAchievements } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { icon } from '../utils/icons.js';

export function renderResults() {
    const state = getState();
    const { correct, total, percentage, isPerfect, answers,
            isSimulation, passed, domainScores, certName,
            passingScore, timeTaken } = state.quizResults || {};
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

    const message = getMessage(percentage);
    const tierColors = {
        bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700',
        platinum: '#e5e4e2', diamond: '#b9f2ff', legendary: '#ff6b6b'
    };

    return `
        <div class="results-page">
            <div class="container">
                <div class="results-hero">
                    ${isSimulation ? `
                        <div class="sim-result-banner ${passed ? 'passed' : 'failed'}">
                            ${passed ? `${icon('check')} PASSED` : `${icon('x')} NOT PASSED`}
                        </div>
                        ${certName ? `<p class="text-muted" style="margin-bottom:0.5rem">${escapeHtml(certName)} Practice Exam</p>` : ''}
                        ${passingScore ? `<p class="text-muted" style="font-size:0.8rem">Passing score: ${passingScore}%</p>` : ''}
                    ` : ''}
                    ${isPerfect && !isSimulation ? `<div class="perfect-banner">${icon('trophy')} PERFECT SCORE ${icon('trophy')}</div>` : ''}

                    <div class="results-score ${isPerfect ? 'perfect' : ''}" style="--score-color: ${getScoreColor(percentage)}">
                        <span class="results-score-pct" id="score-counter">0</span>
                        <span class="results-score-percent">%</span>
                    </div>

                    <h2 class="results-msg">${message.emoji} ${message.text}</h2>
                    <p class="text-muted">${escapeHtml(quiz.title)}</p>

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
                        ${timeTaken ? `
                        <div class="stat-card">
                            <div class="stat-value">${Math.floor(timeTaken / 60)}:${String(timeTaken % 60).padStart(2, '0')}</div>
                            <div class="stat-label">Time</div>
                        </div>
                        ` : ''}
                    </div>

                    ${isSimulation && domainScores ? renderDomainBreakdown(domainScores) : ''}

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
                                    <span class="streak-badge">${icon('flame')} ${profile.dailyStreak} day streak</span>
                                ` : ''}
                            </div>
                        </div>
                        <div class="xp-bar-large">
                            <div class="xp-bar-fill" style="width: ${levelInfo.progress * 100}%"></div>
                            <span class="xp-bar-text">${levelInfo.xpInLevel} / ${levelInfo.xpForNext} XP to level ${levelInfo.level + 1}</span>
                        </div>
                    </div>

                    <div class="results-actions">
                        <button class="btn btn-primary btn-lg" onclick="window.app.retryQuiz()">
                            ${icon('rotateCcw')} Try Again
                        </button>
                        <button class="btn btn-secondary" onclick="window.app.reviewQuiz()">
                            ${icon('fileText')} Review Answers
                        </button>
                        <button class="btn btn-ghost" onclick="window.app.navigate('${isSimulation ? 'readiness' : 'library'}')">
                            ${icon('arrowLeft')} ${isSimulation ? 'Back to Readiness' : 'Back to Library'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function renderReview() {
    const state = getState();
    const quiz = state.currentQuiz;
    const answers = state.quizResults?.answers || [];
    
    if (!quiz) return '';
    
    return `
        <div class="review-page">
            <header class="quiz-header">
                <button class="btn btn-ghost" onclick="window.app.navigate('results')">${icon('arrowLeft')} Back to Results</button>
                <h2>${escapeHtml(quiz.title)} - Review</h2>
                <div></div>
            </header>
            <main class="quiz-main">
                <div class="container">
                    <div class="review-filters mb-4">
                        <button class="btn btn-sm ${state.reviewFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="window.app.setReviewFilter('all')">All</button>
                        <button class="btn btn-sm ${state.reviewFilter === 'incorrect' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="window.app.setReviewFilter('incorrect')">Incorrect Only</button>
                        <button class="btn btn-sm ${state.reviewFilter === 'correct' ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="window.app.setReviewFilter('correct')">Correct Only</button>
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
                                ${q.explanation ? `<div class="explanation mt-3"><strong>${icon('lightbulb')}</strong> ${escapeHtml(q.explanation)}</div>` : ''}
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
        case 'truefalse': {
            // correct is stored as [0] for True, [1] for False
            const correctBool = Array.isArray(q.correct) ? q.correct[0] === 0 : q.correct === 0;
            const userAnswerStr = userAnswer === true ? 'True' : userAnswer === false ? 'False' : 'Not answered';
            return `
                <div class="review-tf">
                    <div class="review-answer ${userAnswer === correctBool ? 'correct' : 'user-wrong'}">
                        Your answer: <strong>${userAnswerStr}</strong>
                    </div>
                    ${!isCorrect ? `
                        <div class="review-answer correct">
                            Correct answer: <strong>${correctBool ? 'True' : 'False'}</strong>
                        </div>
                    ` : ''}
                </div>
            `;
        }
            
        case 'matching': {
            // userAnswer format: { leftIndex: rightDisplayIndex }
            // matchingShuffled[questionIndex] maps rightDisplayIndex → { origIndex, text }
            const state = getState();
            // Find question index by searching quiz questions
            const quiz = state.currentQuiz;
            const questionIndex = quiz ? quiz.questions.findIndex(qx => qx === q || (qx.question === q.question && qx.type === q.type)) : -1;
            const shuffledRight = questionIndex >= 0 ? (state.matchingShuffled || {})[questionIndex] : null;

            return `
                <div class="review-matching">
                    ${q.pairs.map((pair, i) => {
                        const rightDisplayIdx = userAnswer?.[i];
                        let userMatchText = 'Not matched';
                        let isMatchCorrect = false;
                        if (rightDisplayIdx !== undefined) {
                            if (shuffledRight) {
                                // Use the shuffled order to look up the actual right-side text
                                const rightItem = shuffledRight[rightDisplayIdx];
                                userMatchText = rightItem ? rightItem.text : 'Unknown';
                                isMatchCorrect = rightItem && rightItem.origIndex === i;
                            } else {
                                // No shuffle info: fall back to treating displayIndex as origIndex
                                userMatchText = q.pairs[rightDisplayIdx]?.right ?? 'Unknown';
                                isMatchCorrect = rightDisplayIdx === i;
                            }
                        }
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
        }
            
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
            // correct is stored as [0] for True, [1] for False (index into [True,False])
            const correctBool = Array.isArray(question.correct) ? question.correct[0] === 0 : question.correct === 0;
            return answer === correctBool;
        case 'matching': {
            if (!answer) return false;
            // Look up matchingShuffled to correctly verify pairs
            const state = getState();
            const quiz = state.currentQuiz;
            const qIndex = quiz ? quiz.questions.findIndex(qx => qx === question || (qx.question === question.question && qx.type === question.type)) : -1;
            const shuffledRight = qIndex >= 0 ? (state.matchingShuffled || {})[qIndex] : null;
            if (!shuffledRight) {
                // Fallback: all left indices must equal right display indices (unshuffled)
                return Object.entries(answer).every(([left, right]) => parseInt(left) === parseInt(right));
            }
            if (Object.keys(answer).length !== question.pairs.length) return false;
            return Object.entries(answer).every(([left, right]) => {
                const leftIdx = parseInt(left);
                const rightItem = shuffledRight[parseInt(right)];
                return rightItem && rightItem.origIndex === leftIdx;
            });
        }
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

function renderDomainBreakdown(domainScores) {
    const domains = Object.entries(domainScores)
        .map(([name, data]) => ({
            name,
            correct: data.correct,
            total: data.total,
            pct: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        }))
        .sort((a, b) => a.pct - b.pct);

    if (domains.length === 0) return '';

    return `
        <div class="domain-breakdown card" style="width:100%;margin:1.5rem 0">
            <h3 style="margin:0 0 1rem;font-size:1rem">${icon('barChart')} Domain Breakdown</h3>
            <div class="domain-list">
                ${domains.map(d => `
                    <div class="domain-row" style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem">
                        <div style="flex:1;min-width:0">
                            <div style="display:flex;justify-content:space-between;margin-bottom:0.25rem">
                                <span style="font-size:0.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(d.name)}</span>
                                <span style="font-size:0.75rem;color:${d.pct >= 70 ? '#10b981' : d.pct >= 50 ? '#f59e0b' : '#ef4444'};font-weight:600;flex-shrink:0;margin-left:0.5rem">${d.pct}%</span>
                            </div>
                            <div style="height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden">
                                <div style="height:100%;width:${d.pct}%;background:${d.pct >= 70 ? '#10b981' : d.pct >= 50 ? '#f59e0b' : '#ef4444'};border-radius:3px;transition:width 0.5s ease"></div>
                            </div>
                        </div>
                        <span style="font-size:0.7rem;color:rgba(255,255,255,0.5);flex-shrink:0">${d.correct}/${d.total}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function getMessage(percentage) {
    if (percentage === 100) return { emoji: '', text: 'Perfect!' };
    if (percentage >= 90) return { emoji: '', text: 'Outstanding!' };
    if (percentage >= 80) return { emoji: '', text: 'Great job!' };
    if (percentage >= 70) return { emoji: '', text: 'Good work!' };
    if (percentage >= 60) return { emoji: '', text: 'Keep practicing!' };
    if (percentage >= 50) return { emoji: '', text: 'You can do better!' };
    return { emoji: '', text: 'Time to study more!' };
}

function getScoreColor(percentage) {
    if (percentage >= 90) return '#16a34a';
    if (percentage >= 70) return '#2563eb';
    if (percentage >= 50) return '#d97706';
    return '#dc2626';
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