/* Quiz Component - SPECTACULAR Edition */
import { 
    getState, setState, saveQuizProgress, loadQuizProgress, clearQuizProgress,
    recordCorrectAnswer, recordWrongAnswer, recordQuizComplete, updateDailyStreak,
    getLevelInfo, clearPendingRewards
} from '../state.js';
import { getQuiz, saveAttempt } from '../services/api.js';
import { escapeHtml, shuffleArray, showLoading, hideLoading } from '../utils/dom.js';
import { showToast } from '../utils/toast.js';
import { renderQuizStreakDisplay } from '../utils/playerHud.js';
import * as sounds from '../utils/sounds.js';
import * as animations from '../utils/animations.js';

let timerInterval = null;

export function renderQuiz() {
    const state = getState();
    const quiz = state.currentQuiz;
    if (!quiz) return '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh"><div class="spinner"></div></div>';
    
    const q = quiz.questions[state.currentQuestionIndex];
    const total = quiz.questions.length;

    return `<div class="quiz-page">
        <header class="quiz-header">
            <button class="btn btn-ghost" onclick="window.app.exitQuiz()">← Exit</button>
            <div class="quiz-info">
                <span class="hide-mobile text-sm">${escapeHtml(quiz.title)}</span>
                <span class="badge badge-primary">${state.currentQuestionIndex + 1} / ${total}</span>
            </div>
            <div class="flex items-center gap-2">
                ${state.timerEnabled ? `<div id="timer" class="quiz-timer ${state.timeRemaining <= 60 ? 'urgent' : ''}">${formatTime(state.timeRemaining)}</div>` : ''}
                <button class="btn btn-icon btn-ghost ${state.flaggedQuestions.has(state.currentQuestionIndex) ? 'flagged' : ''}" onclick="window.app.toggleFlag()" title="Flag for review">🚩</button>
            </div>
        </header>
        <main class="quiz-main"><div class="quiz-content">
            ${renderQuizStreakDisplay(state.quizStreak)}
            <div class="question-header">
                <div class="question-num">
                    Question ${state.currentQuestionIndex + 1}
                    ${getTypeBadge(q.type)}
                    ${state.flaggedQuestions.has(state.currentQuestionIndex) ? '<span class="badge badge-warning">Flagged</span>' : ''}
                </div>
                <h2 class="question-text">${escapeHtml(q.question)}</h2>
            </div>
            ${q.code ? renderCodeBlock(q.code) : ''}
            ${renderQuestionType(q, state.currentQuestionIndex)}
            ${state.studyMode && state.showAnswer && q.explanation ? `<div class="explanation"><strong>💡 Explanation:</strong> ${escapeHtml(q.explanation)}</div>` : ''}
        </div></main>
        <footer class="quiz-footer"><div class="quiz-nav">
            <button class="btn btn-secondary" onclick="window.app.prevQ()" ${state.currentQuestionIndex === 0 ? 'disabled' : ''}>← Previous</button>
            <div class="question-dots hide-mobile">${renderDots()}</div>
            <div class="show-mobile font-medium">${state.currentQuestionIndex + 1} / ${total}</div>
            ${state.currentQuestionIndex === total - 1 
                ? `<button class="btn btn-primary" onclick="window.app.submitQuiz()">Submit Quiz</button>` 
                : `<button class="btn btn-primary" onclick="window.app.nextQ()">Next →</button>`}
        </div></footer>
    </div>`;
}

function getTypeBadge(type) {
    const badges = {
        'ordering': '<span class="badge badge-primary">↕️ Ordering</span>',
        'matching': '<span class="badge badge-primary">🔗 Matching</span>',
        'truefalse': '<span class="badge badge-primary">⚡ True/False</span>'
    };
    return badges[type] || '';
}

function renderCodeBlock(code) {
    return `<div class="code-block">
        <div class="code-header">
            <div class="code-dots">
                <div class="code-dot red"></div>
                <div class="code-dot yellow"></div>
                <div class="code-dot green"></div>
            </div>
        </div>
        <pre class="code-body">${escapeHtml(code)}</pre>
    </div>`;
}

function renderQuestionType(q, idx) {
    const state = getState();
    const ans = state.answers[idx];
    
    switch (q.type) {
        case 'truefalse': return renderTrueFalse(q, ans, state.showAnswer);
        case 'matching': return renderMatching(q, ans, idx, state.showAnswer);
        case 'ordering': return renderOrdering(q, ans, idx, state.showAnswer);
        default: return renderMultipleChoice(q, ans, state.showAnswer);
    }
}

function renderMultipleChoice(q, ans, showAnswer) {
    const isMulti = Array.isArray(q.correct);
    return `<div class="options-list" id="options-container">
        ${q.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = isMulti ? (ans || []).includes(i) : ans === i;
            const isCorrect = isMulti ? q.correct.includes(i) : q.correct === i;
            let cls = 'option';
            if (isSelected) cls += ' selected';
            if (showAnswer && isCorrect) cls += ' correct';
            if (showAnswer && isSelected && !isCorrect) cls += ' incorrect';
            
            return `<div class="${cls}" data-index="${i}" onclick="window.app.selectOption(${i})">
                <span class="option-letter">${letter}</span>
                <span class="option-text">${escapeHtml(opt)}</span>
                ${showAnswer && isCorrect ? renderCheckmark() : ''}
                ${showAnswer && isSelected && !isCorrect ? renderXMark() : ''}
            </div>`;
        }).join('')}
    </div>
    ${isMulti ? '<p class="helper-text mt-2">Select all that apply</p>' : ''}`;
}

function renderTrueFalse(q, ans, showAnswer) {
    const correctVal = q.correct === true || q.correct === 'true';
    return `<div class="tf-options">
        ${[true, false].map(val => {
            let cls = 'tf-option';
            const isSelected = ans === val;
            const isCorrect = val === correctVal;
            if (isSelected) cls += ' selected';
            if (showAnswer && isCorrect) cls += ' correct';
            if (showAnswer && isSelected && !isCorrect) cls += ' incorrect';
            
            return `<div class="${cls}" onclick="window.app.selectTF(${val})">
                <span class="tf-icon">${val ? '✓' : '✗'}</span>
                <span class="tf-label">${val ? 'True' : 'False'}</span>
                ${showAnswer && isCorrect ? renderCheckmark() : ''}
            </div>`;
        }).join('')}
    </div>`;
}

function renderMatching(q, ans, qIdx, showAnswer) {
    const state = getState();
    const userMatches = ans || {};
    
    // Initialize shuffled options for this question if not exists
    if (!state.matchingShuffled[qIdx]) {
        const shuffled = { ...state.matchingShuffled };
        shuffled[qIdx] = shuffleArray([...q.pairs.map((p, i) => ({ text: p.right, origIndex: i }))]);
        setState({ matchingShuffled: shuffled });
    }
    const shuffledRight = state.matchingShuffled[qIdx] || q.pairs.map((p, i) => ({ text: p.right, origIndex: i }));
    
    // Find which right items are already matched
    const usedRightIndices = new Set(Object.values(userMatches));
    
    return `<div class="matching-container">
        <div class="matching-instructions">Drag items from the right to match with terms on the left</div>
        <div class="matching-columns">
            <div class="matching-left">
                <div class="matching-header">Terms</div>
                ${q.pairs.map((pair, i) => {
                    const matchedIdx = userMatches[i];
                    const hasMatch = matchedIdx !== undefined;
                    const matchedText = hasMatch ? q.pairs.find((_, idx) => shuffledRight.find(s => s.origIndex === matchedIdx)?.origIndex === matchedIdx)?.right || shuffledRight.find(s => s.origIndex === matchedIdx)?.text : null;
                    
                    let cls = 'match-item left';
                    if (showAnswer) {
                        const isCorrect = matchedIdx === i;
                        cls += isCorrect ? ' correct' : (hasMatch ? ' incorrect' : '');
                    }
                    
                    return `<div class="${cls}" 
                        data-left-index="${i}"
                        ondragover="window.app.matchDragOver(event)"
                        ondragleave="window.app.matchDragLeave(event)"
                        ondrop="window.app.matchDrop(event, ${i})">
                        <span class="match-letter">${String.fromCharCode(65 + i)}</span>
                        <span class="match-text">${escapeHtml(pair.left)}</span>
                        ${hasMatch 
                            ? `<div class="match-answer" draggable="true" ondragstart="window.app.matchDragStart(event, ${matchedIdx}, ${i})">
                                ${escapeHtml(matchedText || shuffledRight.find(s => s.origIndex === matchedIdx)?.text || '')}
                                <button class="match-remove" onclick="window.app.removeMatch(${i})">×</button>
                               </div>`
                            : `<div class="match-dropzone">Drop here</div>`
                        }
                    </div>`;
                }).join('')}
            </div>
            <div class="matching-right">
                <div class="matching-header">Definitions</div>
                ${shuffledRight.filter(item => !usedRightIndices.has(item.origIndex)).map(item => {
                    return `<div class="match-draggable" 
                        draggable="true" 
                        data-orig-index="${item.origIndex}"
                        ondragstart="window.app.matchDragStart(event, ${item.origIndex})">
                        ${escapeHtml(item.text)}
                    </div>`;
                }).join('')}
                ${shuffledRight.filter(item => !usedRightIndices.has(item.origIndex)).length === 0 
                    ? '<div class="text-center text-muted mt-2">All items matched!</div>' : ''}
            </div>
        </div>
    </div>`;
}

function renderOrdering(q, ans, qIdx, showAnswer) {
    const items = ans || q.items.map((item, i) => ({ text: item, origIndex: i }));
    
    return `<div class="ordering-container">
        <p class="helper-text mb-3">Drag to reorder the items</p>
        <div class="ordering-list" id="ordering-list">
            ${items.map((item, i) => {
                let cls = 'match-item ordering-item';
                if (showAnswer) {
                    cls += item.origIndex === i ? ' correct' : ' incorrect';
                }
                return `<div class="${cls}" 
                    draggable="true" 
                    data-index="${i}"
                    ondragstart="window.app.orderDragStart(event, ${i})"
                    ondragover="window.app.orderDragOver(event)"
                    ondragleave="window.app.orderDragLeave(event)"
                    ondrop="window.app.orderDrop(event, ${i})"
                    ondragend="window.app.orderDragEnd(event)">
                    <span class="match-num">${i + 1}</span>
                    <span class="match-text">${escapeHtml(item.text)}</span>
                    <span class="drag-handle">⋮⋮</span>
                </div>`;
            }).join('')}
        </div>
    </div>`;
}

function renderCheckmark() {
    return `<span class="answer-check">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    </span>`;
}

function renderXMark() {
    return `<span class="answer-check answer-x">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    </span>`;
}

function renderDots() {
    const state = getState();
    const total = state.currentQuiz.questions.length;
    return Array.from({ length: total }, (_, i) => {
        let cls = 'q-dot';
        if (i === state.currentQuestionIndex) cls += ' current';
        if (state.answers[i] !== undefined) cls += ' answered';
        if (state.flaggedQuestions.has(i)) cls += ' flagged';
        return `<button class="${cls}" onclick="window.app.goToQ(${i})">${i + 1}</button>`;
    }).join('');
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ==================== QUIZ ACTIONS ====================

export async function startQuiz(quizId, options = {}) {
    showLoading();
    try {
        const quiz = await getQuiz(quizId);
        
        // Check for saved progress
        const saved = loadQuizProgress(quizId);
        if (saved && !options.restart) {
            const resume = confirm(`Resume from question ${saved.questionIndex + 1}?`);
            if (resume) {
                setState({
                    view: 'quiz',
                    currentQuiz: quiz,
                    currentQuestionIndex: saved.questionIndex,
                    answers: saved.answers,
                    flaggedQuestions: new Set(saved.flagged || []),
                    studyMode: saved.studyMode,
                    timerEnabled: saved.timerEnabled,
                    timeRemaining: saved.timeRemaining,
                    quizStreak: saved.quizStreak || 0,
                    maxQuizStreak: saved.maxQuizStreak || 0,
                    matchingShuffled: saved.matchingShuffled || {},
                    showAnswer: false,
                    quizStartTime: Date.now()
                });
                if (saved.timerEnabled) startTimer();
                hideLoading();
                
                // Update daily streak
                updateDailyStreak();
                sounds.playQuizStart();
                return;
            }
        }
        
        // Fresh start
        setState({
            view: 'quiz',
            currentQuiz: quiz,
            currentQuestionIndex: 0,
            answers: [],
            flaggedQuestions: new Set(),
            studyMode: options.studyMode || false,
            timerEnabled: options.timed || false,
            timeRemaining: (options.minutes || 15) * 60,
            quizStreak: 0,
            maxQuizStreak: 0,
            matchingShuffled: {},
            showAnswer: false,
            quizStartTime: Date.now()
        });
        
        if (options.timed) startTimer();
        
        // Update daily streak when starting a quiz
        updateDailyStreak();
        sounds.playQuizStart();
        
    } catch (e) {
        showToast('Failed to load quiz', 'error');
    }
    hideLoading();
}

export function selectOption(index) {
    const state = getState();
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    const isMulti = Array.isArray(q.correct);
    
    let newAnswer;
    if (isMulti) {
        const current = state.answers[state.currentQuestionIndex] || [];
        newAnswer = current.includes(index) 
            ? current.filter(i => i !== index)
            : [...current, index];
    } else {
        newAnswer = index;
    }
    
    const newAnswers = [...state.answers];
    newAnswers[state.currentQuestionIndex] = newAnswer;
    setState({ answers: newAnswers });
    
    // Study mode: check answer immediately
    if (state.studyMode && !isMulti) {
        checkAnswer(newAnswer, q);
    }
    
    saveQuizProgress();
}

export function selectTF(value) {
    const state = getState();
    const newAnswers = [...state.answers];
    newAnswers[state.currentQuestionIndex] = value;
    setState({ answers: newAnswers });
    
    if (state.studyMode) {
        const q = state.currentQuiz.questions[state.currentQuestionIndex];
        checkAnswer(value, q);
    }
    
    saveQuizProgress();
}

function checkAnswer(answer, question) {
    const state = getState();
    const isCorrect = checkIfCorrect(answer, question);
    
    // Get the selected element for animations
    const optionsContainer = document.getElementById('options-container') || document.querySelector('.tf-options');
    const selectedEl = optionsContainer?.querySelector('.selected');
    
    if (isCorrect) {
        // Correct answer!
        const result = recordCorrectAnswer();
        sounds.playCorrect(result.streak);
        
        if (selectedEl) {
            animations.burstCorrect(selectedEl);
        }
        
        // Check for streak milestones
        if (result.streak === 5 || result.streak === 10 || result.streak === 15 || result.streak === 20) {
            sounds.playStreakMilestone(result.streak);
            animations.burstStreak(selectedEl, result.streak);
        }
        
        // Show floating XP
        if (selectedEl) {
            animations.showXPGain(selectedEl, result.xp);
        }
        
    } else {
        // Wrong answer
        recordWrongAnswer();
        sounds.playWrong();
        
        if (selectedEl) {
            animations.burstWrong(selectedEl);
            animations.addShakeAnimation(selectedEl);
        }
    }
    
    setState({ showAnswer: true });
    saveQuizProgress();
    
    // Check for pending level ups or achievements
    setTimeout(() => showPendingRewards(), 500);
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

function showPendingRewards() {
    const state = getState();
    
    // Show level up modal
    if (state.pendingLevelUp) {
        sounds.playLevelUp();
        animations.showLevelUpEffect();
        
        const modal = document.createElement('div');
        modal.innerHTML = renderLevelUpModal(state.pendingLevelUp);
        document.body.appendChild(modal.firstElementChild);
        
        setState({ pendingLevelUp: null });
    }
    
    // Show achievement modals
    if (state.pendingAchievements.length > 0) {
        const achievement = state.pendingAchievements[0];
        sounds.playAchievement();
        animations.showAchievementEffect();
        
        const modal = document.createElement('div');
        modal.innerHTML = renderAchievementUnlock(achievement);
        document.body.appendChild(modal.firstElementChild);
        
        setState({ 
            pendingAchievements: state.pendingAchievements.slice(1)
        });
    }
}

function renderLevelUpModal(levelInfo) {
    const tierColors = {
        bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700',
        platinum: '#e5e4e2', diamond: '#b9f2ff', legendary: '#ff6b6b'
    };
    const tierColor = tierColors[levelInfo.tier] || tierColors.bronze;
    
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
                        <span class="reward-icon">💎</span>
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

function renderAchievementUnlock(achievement) {
    return `
        <div class="modal-overlay achievement-modal" onclick="this.remove()">
            <div class="achievement-content" onclick="event.stopPropagation()">
                <div class="achievement-glow"></div>
                <div class="achievement-icon-large">${achievement.icon}</div>
                <h3 class="achievement-name">${escapeHtml(achievement.name)}</h3>
                <p class="achievement-desc">${escapeHtml(achievement.desc)}</p>
                <div class="achievement-rewards">
                    <span class="reward-item">
                        <span class="reward-icon">✨</span>
                        <span>+${achievement.xp} XP</span>
                    </span>
                    <span class="reward-item">
                        <span class="reward-icon">💎</span>
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

// ==================== MATCHING DRAG & DROP ====================

let draggedMatchIndex = null;
let draggedFromLeft = null;

export function matchDragStart(e, origIndex, fromLeftIndex = null) {
    draggedMatchIndex = origIndex;
    draggedFromLeft = fromLeftIndex;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

export function matchDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

export function matchDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

export function matchDrop(e, leftIndex) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (draggedMatchIndex === null) return;
    
    const state = getState();
    const currentAnswers = state.answers[state.currentQuestionIndex] || {};
    const newAnswers = { ...currentAnswers };
    
    // If dragged from another left slot, remove from there
    if (draggedFromLeft !== null && draggedFromLeft !== leftIndex) {
        delete newAnswers[draggedFromLeft];
    }
    
    // If this left slot already has a match, swap or clear
    if (newAnswers[leftIndex] !== undefined && draggedFromLeft !== null) {
        newAnswers[draggedFromLeft] = newAnswers[leftIndex];
    }
    
    newAnswers[leftIndex] = draggedMatchIndex;
    
    const answers = [...state.answers];
    answers[state.currentQuestionIndex] = newAnswers;
    setState({ answers });
    
    draggedMatchIndex = null;
    draggedFromLeft = null;
    
    // Auto-check in study mode when all pairs matched
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    if (state.studyMode && Object.keys(newAnswers).length === q.pairs.length) {
        setTimeout(() => {
            checkAnswer(newAnswers, q);
        }, 300);
    }
    
    saveQuizProgress();
}

export function removeMatch(leftIndex) {
    const state = getState();
    const currentAnswers = { ...(state.answers[state.currentQuestionIndex] || {}) };
    delete currentAnswers[leftIndex];
    
    const answers = [...state.answers];
    answers[state.currentQuestionIndex] = currentAnswers;
    setState({ answers });
    saveQuizProgress();
}

export function matchDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedMatchIndex = null;
    draggedFromLeft = null;
}

// ==================== ORDERING DRAG & DROP ====================

let draggedOrderIndex = null;

export function orderDragStart(e, index) {
    draggedOrderIndex = index;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

export function orderDragOver(e) {
    e.preventDefault();
    if (draggedOrderIndex !== null) {
        e.currentTarget.classList.add('drag-over');
    }
}

export function orderDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

export function orderDrop(e, targetIndex) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (draggedOrderIndex === null || draggedOrderIndex === targetIndex) return;
    
    const state = getState();
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    const currentOrder = state.answers[state.currentQuestionIndex] || 
        q.items.map((text, i) => ({ text, origIndex: i }));
    
    const newOrder = [...currentOrder];
    const [removed] = newOrder.splice(draggedOrderIndex, 1);
    newOrder.splice(targetIndex, 0, removed);
    
    const answers = [...state.answers];
    answers[state.currentQuestionIndex] = newOrder;
    setState({ answers });
    
    draggedOrderIndex = null;
    saveQuizProgress();
}

export function orderDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    draggedOrderIndex = null;
}

// ==================== NAVIGATION ====================

export function nextQuestion() {
    const state = getState();
    if (state.currentQuestionIndex < state.currentQuiz.questions.length - 1) {
        setState({ 
            currentQuestionIndex: state.currentQuestionIndex + 1,
            showAnswer: false
        });
        saveQuizProgress();
    }
}

export function prevQuestion() {
    const state = getState();
    if (state.currentQuestionIndex > 0) {
        setState({ 
            currentQuestionIndex: state.currentQuestionIndex - 1,
            showAnswer: false
        });
        saveQuizProgress();
    }
}

export function goToQuestion(index) {
    const state = getState();
    if (index >= 0 && index < state.currentQuiz.questions.length) {
        setState({ 
            currentQuestionIndex: index,
            showAnswer: false
        });
        saveQuizProgress();
    }
}

export function toggleFlag() {
    const state = getState();
    const flagged = new Set(state.flaggedQuestions);
    if (flagged.has(state.currentQuestionIndex)) {
        flagged.delete(state.currentQuestionIndex);
    } else {
        flagged.add(state.currentQuestionIndex);
    }
    setState({ flaggedQuestions: flagged });
    saveQuizProgress();
}

// ==================== TIMER ====================

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        const state = getState();
        if (state.timeRemaining <= 0) {
            clearInterval(timerInterval);
            submitQuiz();
            return;
        }
        
        // Warning sounds
        if (state.timeRemaining === 60) {
            sounds.playTimerWarning();
        } else if (state.timeRemaining <= 10) {
            sounds.playTimerUrgent();
        }
        
        setState({ timeRemaining: state.timeRemaining - 1 });
    }, 1000);
}

export function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ==================== SUBMIT ====================

export async function submitQuiz() {
    stopTimer();
    const state = getState();
    const quiz = state.currentQuiz;
    
    // Calculate score
    let correct = 0;
    quiz.questions.forEach((q, i) => {
        if (checkIfCorrect(state.answers[i], q)) {
            correct++;
        }
    });
    
    const total = quiz.questions.length;
    const percentage = Math.round((correct / total) * 100);
    const isPerfect = correct === total;
    
    // Record completion
    const result = recordQuizComplete(correct, total);
    
    // Celebrations
    if (isPerfect) {
        sounds.playPerfectScore();
        setTimeout(() => animations.showFireworks(), 300);
    } else if (percentage >= 75) {
        animations.showConfetti(true);
    } else if (percentage >= 50) {
        animations.showConfetti(false);
    }
    
    // Save attempt
    try {
        await saveAttempt(quiz.id, {
            score: correct,
            total,
            answers: state.answers,
            timeSpent: state.timerEnabled ? (state.timerMinutes * 60 - state.timeRemaining) : null
        });
    } catch (e) {
        console.error('Failed to save attempt:', e);
    }
    
    clearQuizProgress(quiz.id);
    
    setState({
        view: 'results',
        quizResults: { correct, total, percentage, isPerfect, answers: state.answers }
    });
    
    // Show pending rewards
    setTimeout(() => showPendingRewards(), 1000);
}

export function exitQuiz() {
    const state = getState();
    if (state.answers.some(a => a !== undefined)) {
        if (!confirm('Your progress will be saved. Exit quiz?')) return;
    }
    stopTimer();
    saveQuizProgress();
    setState({ view: 'library', currentQuiz: null });
}

// ==================== EXPORTS ====================

export {
    startQuiz,
    selectOption,
    selectTF,
    nextQuestion as nextQ,
    prevQuestion as prevQ,
    goToQuestion as goToQ,
    toggleFlag,
    submitQuiz,
    exitQuiz,
    matchDragStart,
    matchDragOver,
    matchDragLeave,
    matchDrop,
    matchDragEnd,
    removeMatch,
    orderDragStart,
    orderDragOver,
    orderDragLeave,
    orderDrop,
    orderDragEnd
};
