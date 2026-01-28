/* Quiz Component - COMPLETE FIX: Mobile Support + Randomization + All Improvements */
import { 
    getState, setState, saveQuizProgress, loadQuizProgress, clearQuizProgress,
    recordCorrectAnswer, recordWrongAnswer, recordQuizComplete, updateDailyStreak,
    getLevelInfo
} from '../state.js';
import { getQuiz, saveAttempt } from '../services/api.js';
import { escapeHtml, shuffleArray, showLoading, hideLoading } from '../utils/dom.js';
import { showToast } from '../utils/toast.js';
import { TIME, STREAK, QUIZ } from '../utils/constants.js';

let timerInterval = null;

// ==================== MOBILE TOUCH SUPPORT ====================

let touchStartX = 0;
let touchStartY = 0;
let touchedElement = null;
let isTouchDragging = false;

function initTouchSupport() {
    // Add touch event listeners for drag-and-drop on mobile
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
}

function handleTouchStart(e) {
    const target = e.target.closest('[data-touch-draggable]');
    if (!target) return;
    
    e.preventDefault();
    touchedElement = target;
    isTouchDragging = false;
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    
    target.classList.add('touch-active');
}

function handleTouchMove(e) {
    if (!touchedElement) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);
    
    // If moved more than 10px, consider it a drag
    if (deltaX > 10 || deltaY > 10) {
        isTouchDragging = true;
        e.preventDefault();
        
        // Visual feedback - move the element with finger
        touchedElement.style.transform = `translate(${touch.clientX - touchStartX}px, ${touch.clientY - touchStartY}px)`;
        touchedElement.style.opacity = '0.7';
        touchedElement.classList.add('dragging');
    }
}

function handleTouchEnd(e) {
    if (!touchedElement) return;
    
    const touch = e.changedTouches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Reset visual state
    touchedElement.style.transform = '';
    touchedElement.style.opacity = '';
    touchedElement.classList.remove('touch-active', 'dragging');
    
    if (isTouchDragging && target) {
        // Handle different drop zones
        const dropZone = target.closest('[data-touch-drop-zone]');
        if (dropZone) {
            e.preventDefault();
            handleTouchDrop(touchedElement, dropZone);
        }
    } else if (!isTouchDragging) {
        // It was a tap, not a drag - handle as click
        touchedElement.click();
    }
    
    touchedElement = null;
    isTouchDragging = false;
}

function handleTouchDrop(dragged, dropZone) {
    const dragType = dragged.dataset.touchDraggable;
    const dropType = dropZone.dataset.touchDropZone;
    
    if (dragType === 'match-left') {
        const leftIndex = parseInt(dragged.dataset.index);
        const rightIndex = parseInt(dropZone.dataset.index);
        if (!isNaN(leftIndex) && !isNaN(rightIndex)) {
            matchDropTouchHandler(leftIndex, rightIndex);
        }
    } else if (dragType === 'order-item') {
        const fromIndex = parseInt(dragged.dataset.index);
        const toIndex = parseInt(dropZone.dataset.index);
        if (!isNaN(fromIndex) && !isNaN(toIndex)) {
            orderDropTouchHandler(fromIndex, toIndex);
        }
    }
}

// Initialize touch support when module loads
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTouchSupport);
    } else {
        initTouchSupport();
    }
}

// ==================== OPTION SHUFFLING (FIX) ====================

function shuffleOptionsWithMapping(options, correctAnswer) {
    const indexedOptions = options.map((opt, i) => ({ 
        originalIndex: i, 
        text: opt 
    }));
    
    // Fisher-Yates shuffle
    for (let i = indexedOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indexedOptions[i], indexedOptions[j]] = [indexedOptions[j], indexedOptions[i]];
    }
    
    const mapping = {};
    indexedOptions.forEach((item, newIndex) => {
        mapping[newIndex] = item.originalIndex;
    });
    
    const shuffledOptions = indexedOptions.map(item => item.text);
    
    let newCorrect;
    if (Array.isArray(correctAnswer)) {
        newCorrect = correctAnswer.map(oldIdx => {
            return indexedOptions.findIndex(item => item.originalIndex === oldIdx);
        });
    } else {
        newCorrect = indexedOptions.findIndex(item => item.originalIndex === correctAnswer);
    }
    
    return { shuffledOptions, newCorrect, mapping };
}

// ==================== RENDER FUNCTIONS ====================

export function renderQuiz() {
    const state = getState();
    const quiz = state.currentQuiz;
    if (!quiz) return '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh"><div class="spinner"></div></div>';
    
    const q = quiz.questions[state.currentQuestionIndex];
    const total = quiz.questions.length;
    const hasAnswered = state.answers[state.currentQuestionIndex] !== undefined;
    const showingAnswer = state.studyMode && state.showAnswer;

    return `<div class="quiz-page">
        <header class="quiz-header">
            <button class="btn btn-ghost" onclick="window.app.exitQuiz()">← Exit</button>
            <div class="quiz-info">
                <span class="hide-mobile text-sm truncate" style="max-width: 200px;">${escapeHtml(quiz.title)}</span>
                <span class="badge badge-primary">${state.currentQuestionIndex + 1} / ${total}</span>
                ${state.studyMode ? '<span class="badge badge-success">Study Mode</span>' : ''}
            </div>
            <div class="flex items-center gap-2">
                ${state.timerEnabled ? `<div id="timer" class="quiz-timer ${state.timeRemaining <= TIME.TIMER_WARNING_SECONDS ? 'urgent' : ''}">${formatTime(state.timeRemaining)}</div>` : ''}
                <button class="btn btn-icon btn-ghost ${state.flaggedQuestions.has(state.currentQuestionIndex) ? 'flagged' : ''}" onclick="window.app.toggleFlag()" title="Flag for review">🚩</button>
            </div>
        </header>
        <main class="quiz-main"><div class="quiz-content">
            ${renderStreakDisplay(state.quizStreak)}
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
            ${renderStudyModeFeedback(q, state)}
        </div></main>
        <footer class="quiz-footer"><div class="quiz-nav">
            <button class="btn btn-secondary" onclick="window.app.prevQuestion()" ${state.currentQuestionIndex === 0 ? 'disabled' : ''}>← Prev</button>
            ${renderQuestionNav(total, state.currentQuestionIndex)}
            ${state.currentQuestionIndex === total - 1 
                ? `<button class="btn btn-primary" onclick="window.app.submitQuiz()">Submit</button>` 
                : `<button class="btn btn-primary" onclick="window.app.nextQuestion()">Next →</button>`}
        </div></footer>
    </div>`;
}

function renderStudyModeFeedback(q, state) {
    if (!state.studyMode || !state.showAnswer) return '';
    
    const userAnswer = state.answers[state.currentQuestionIndex];
    const isCorrect = checkIfCorrect(userAnswer, q, state.currentQuestionIndex);
    
    let feedbackHtml = `
        <div class="study-feedback ${isCorrect ? 'correct' : 'incorrect'}">
            <div class="feedback-header">
                <span class="feedback-icon">${isCorrect ? '✓' : '✗'}</span>
                <span class="feedback-text">${isCorrect ? 'Correct!' : 'Incorrect'}</span>
            </div>
    `;
    
    if (!isCorrect) {
        feedbackHtml += `<div class="correct-answer-reveal">`;
        
        switch (q.type) {
            case 'truefalse':
                const correctBool = q.correct[0] === 0;
                feedbackHtml += `<strong>Correct answer:</strong> ${correctBool ? 'True' : 'False'}`;
                break;
            case 'matching':
                feedbackHtml += `<strong>Correct matches:</strong><ul class="correct-list">`;
                q.pairs.forEach((pair, i) => {
                    feedbackHtml += `<li>${escapeHtml(pair.left)} → ${escapeHtml(pair.right)}</li>`;
                });
                feedbackHtml += `</ul>`;
                break;
            case 'ordering':
                feedbackHtml += `<strong>Correct order:</strong><ol class="correct-list">`;
                q.options.forEach((item, i) => {
                    const actualItem = q.options[q.correct[i]];
                    feedbackHtml += `<li>${escapeHtml(actualItem)}</li>`;
                });
                feedbackHtml += `</ol>`;
                break;
            default:
                // Get actual correct options (handle randomization)
                const correctOptions = getCorrectOptionsForDisplay(q, state.currentQuestionIndex);
                if (Array.isArray(correctOptions)) {
                    feedbackHtml += `<strong>Correct answers:</strong> ${correctOptions.join(', ')}`;
                } else {
                    feedbackHtml += `<strong>Correct answer:</strong> ${correctOptions}`;
                }
        }
        
        feedbackHtml += `</div>`;
    }
    
    if (q.explanation) {
        feedbackHtml += `<div class="explanation"><strong>💡 Explanation:</strong> ${escapeHtml(q.explanation)}</div>`;
    }
    
    feedbackHtml += `</div>`;
    
    return feedbackHtml;
}

function getCorrectOptionsForDisplay(q, questionIndex) {
    const state = getState();
    
    // Get displayed options and correct indices
    let displayOptions = q.options;
    let displayCorrect = q.correct;
    
    if (state.randomizeOptions && state.optionShuffles[questionIndex]) {
        const shuffle = state.optionShuffles[questionIndex];
        displayOptions = shuffle.shuffledOptions;
        displayCorrect = shuffle.newCorrect;
    }
    
    if (Array.isArray(displayCorrect)) {
        return displayCorrect.map(idx => 
            `${String.fromCharCode(65 + idx)}. ${escapeHtml(displayOptions[idx])}`
        );
    } else {
        return `${String.fromCharCode(65 + displayCorrect)}. ${escapeHtml(displayOptions[displayCorrect])}`;
    }
}

function renderStreakDisplay(streak) {
    if (!streak || streak < 3) return '';
    
    const intensity = Math.min(Math.floor(streak / 5), 3);
    const fires = '🔥'.repeat(intensity + 1);
    
    let message = '';
    let className = 'streak-indicator';
    
    if (streak >= STREAK.LEGENDARY) {
        message = 'LEGENDARY!';
        className += ' legendary';
    } else if (streak >= STREAK.UNSTOPPABLE) {
        message = 'UNSTOPPABLE!';
        className += ' unstoppable';
    } else if (streak >= STREAK.ON_FIRE) {
        message = 'ON FIRE!';
        className += ' on-fire';
    } else if (streak >= STREAK.NICE) {
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

function renderQuestionNav(total, current) {
    if (total > QUIZ.MAX_COMPACT_NAV_QUESTIONS) {
        return `
            <div class="question-nav-compact">
                <input type="number" 
                    class="question-jump-input" 
                    min="1" 
                    max="${total}" 
                    value="${current + 1}"
                    onchange="window.app.goToQuestion(parseInt(this.value) - 1)"
                    onclick="this.select()"
                />
                <span class="question-nav-total">/ ${total}</span>
            </div>
        `;
    }
    
    return `<div class="question-dots hide-mobile">${renderDots()}</div>
            <div class="show-mobile font-medium">${current + 1} / ${total}</div>`;
}

function renderDots() {
    const state = getState();
    const total = state.currentQuiz.questions.length;
    return Array.from({ length: total }, (_, i) => {
        let cls = 'q-dot';
        if (i === state.currentQuestionIndex) cls += ' current';
        if (state.answers[i] !== undefined) cls += ' answered';
        if (state.flaggedQuestions.has(i)) cls += ' flagged';
        return `<button class="${cls}" onclick="window.app.goToQuestion(${i})">${i + 1}</button>`;
    }).join('');
}

function getTypeBadge(type) {
    const badges = {
        choice: '<span class="badge badge-info">Multiple Choice</span>',
        truefalse: '<span class="badge badge-success">True/False</span>',
        matching: '<span class="badge badge-warning">Matching</span>',
        ordering: '<span class="badge badge-primary">Ordering</span>'
    };
    return badges[type] || '';
}

function renderCodeBlock(code) {
    return `<pre class="code-block"><code>${escapeHtml(code)}</code></pre>`;
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function renderQuestionType(q, questionIndex) {
    switch (q.type) {
        case 'truefalse': return renderTrueFalse(q, questionIndex);
        case 'matching': return renderMatching(q, questionIndex);
        case 'ordering': return renderOrdering(q, questionIndex);
        default: return renderMultipleChoice(q, questionIndex);
    }
}

// ==================== MULTIPLE CHOICE (WITH RANDOMIZATION FIX) ====================

function renderMultipleChoice(q, questionIndex) {
    const state = getState();
    const userAnswer = state.answers[questionIndex];
    const hasAnswered = userAnswer !== undefined;
    const showingAnswer = state.studyMode && state.showAnswer;
    
    // ===== RANDOMIZATION FIX =====
    let displayOptions = q.options;
    let displayCorrect = q.correct;
    
    if (state.randomizeOptions) {
        if (!state.optionShuffles[questionIndex]) {
            // First time - shuffle and store
            const result = shuffleOptionsWithMapping(q.options, q.correct);
            const shuffles = { ...state.optionShuffles };
            shuffles[questionIndex] = result;
            setState({ optionShuffles: shuffles });
            
            displayOptions = result.shuffledOptions;
            displayCorrect = result.newCorrect;
        } else {
            // Use stored shuffle
            const stored = state.optionShuffles[questionIndex];
            displayOptions = stored.shuffledOptions;
            displayCorrect = stored.newCorrect;
        }
    }
    // ===== END RANDOMIZATION FIX =====
    
    const isMulti = Array.isArray(displayCorrect);
    const disabled = showingAnswer ? 'disabled' : '';
    
    let html = '<div class="options-grid">';
    displayOptions.forEach((opt, i) => {
        const letter = String.fromCharCode(65 + i);
        const isSelected = isMulti 
            ? (userAnswer || []).includes(i) 
            : userAnswer === i;
        const isCorrectOpt = isMulti 
            ? displayCorrect.includes(i) 
            : displayCorrect === i;
        
        let cls = 'option';
        if (showingAnswer) {
            if (isCorrectOpt) cls += ' correct-opt';
            if (isSelected && !isCorrectOpt) cls += ' wrong-opt';
        } else if (isSelected) {
            cls += ' selected';
        }
        
        const checkType = isMulti ? 'checkbox' : 'radio';
        const checked = isSelected ? 'checked' : '';
        
        html += `
            <label class="${cls}">
                <input type="${checkType}" 
                    name="q${questionIndex}" 
                    value="${i}" 
                    ${checked} 
                    ${disabled}
                    onchange="window.app.${isMulti ? 'toggleMultiSelect' : 'selectOption'}(${i})">
                <span class="option-letter">${letter}</span>
                <span class="option-text">${escapeHtml(opt)}</span>
                ${showingAnswer && isCorrectOpt ? '<span class="option-check">✓</span>' : ''}
            </label>
        `;
    });
    html += '</div>';
    
    if (isMulti && !showingAnswer) {
        html += `<div class="mt-4"><button class="btn btn-primary" onclick="window.app.checkMultipleChoiceAnswer()">Check Answer</button></div>`;
    }
    
    return html;
}

// New function for multi-select toggle
export function toggleMultiSelect(index) {
    const state = getState();
    if (state.studyMode && state.showAnswer) return;
    
    const currentAnswer = state.answers[state.currentQuestionIndex] || [];
    let newAnswer;
    
    if (currentAnswer.includes(index)) {
        newAnswer = currentAnswer.filter(i => i !== index);
    } else {
        newAnswer = [...currentAnswer, index];
    }
    
    const answers = [...state.answers];
    answers[state.currentQuestionIndex] = newAnswer;
    setState({ answers });
    saveQuizProgress();
}

// ==================== TRUE/FALSE ====================

function renderTrueFalse(q, questionIndex) {
    const state = getState();
    const userAnswer = state.answers[questionIndex];
    const showingAnswer = state.studyMode && state.showAnswer;
    const disabled = showingAnswer ? 'disabled' : '';
    
    const correctAnswer = q.correct[0] === 0;
    
    const trueClass = showingAnswer 
        ? (correctAnswer ? 'option correct-opt' : userAnswer === true ? 'option wrong-opt' : 'option')
        : userAnswer === true ? 'option selected' : 'option';
    
    const falseClass = showingAnswer 
        ? (!correctAnswer ? 'option correct-opt' : userAnswer === false ? 'option wrong-opt' : 'option')
        : userAnswer === false ? 'option selected' : 'option';
    
    return `
        <div class="tf-options">
            <button class="${trueClass}" onclick="window.app.selectTF(true)" ${disabled}>
                <span class="tf-icon">✓</span>
                <span class="tf-label">True</span>
                ${showingAnswer && correctAnswer ? '<span class="option-check">✓</span>' : ''}
            </button>
            <button class="${falseClass}" onclick="window.app.selectTF(false)" ${disabled}>
                <span class="tf-icon">✗</span>
                <span class="tf-label">False</span>
                ${showingAnswer && !correctAnswer ? '<span class="option-check">✓</span>' : ''}
            </button>
        </div>
    `;
}

// ==================== MATCHING (WITH MOBILE SUPPORT) ====================

function renderMatching(q, questionIndex) {
    const state = getState();
    const userAnswer = state.answers[questionIndex] || {};
    const showingAnswer = state.studyMode && state.showAnswer;
    
    // Get or create shuffled right items
    let shuffledRight = state.matchingShuffled[questionIndex];
    if (!shuffledRight) {
        shuffledRight = shuffleArray(q.pairs.map((p, i) => ({ text: p.right, origIndex: i })));
        const newShuffled = { ...state.matchingShuffled };
        newShuffled[questionIndex] = shuffledRight;
        setState({ matchingShuffled: newShuffled });
    }
    
    const isMobile = 'ontouchstart' in window;
    
    return `
        <div class="matching-container">
            <p class="helper-text mb-4">${isMobile ? 'Tap left items, then tap matching right items' : 'Drag left items to matching right items'}</p>
            
            <div class="matching-grid">
                <div class="matching-column">
                    <div class="matching-header">Terms</div>
                    ${q.pairs.map((pair, i) => {
                        const isMatched = userAnswer[i] !== undefined;
                        const matchedWith = isMatched ? shuffledRight[userAnswer[i]].text : '';
                        
                        return `
                            <div class="match-item left ${isMatched ? 'matched' : ''} ${showingAnswer ? 'disabled' : ''}"
                                data-touch-draggable="match-left"
                                data-index="${i}"
                                draggable="${!showingAnswer}"
                                ondragstart="window.app.matchDragStart(event, ${i}, true)"
                                ondragend="window.app.matchDragEnd(event)"
                                onclick="window.app.selectMatchLeft(${i})">
                                <span class="match-letter">${String.fromCharCode(65 + i)}</span>
                                <span class="match-text">${escapeHtml(pair.left)}</span>
                                ${isMatched ? `
                                    <div class="match-preview">
                                        → ${escapeHtml(matchedWith)}
                                        ${!showingAnswer ? `<button class="btn-remove" onclick="event.stopPropagation(); window.app.removeMatch(${i})">✕</button>` : ''}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="matching-column">
                    <div class="matching-header">Definitions</div>
                    ${shuffledRight.map((item, i) => {
                        const isUsed = Object.values(userAnswer).includes(i);
                        const isCorrect = showingAnswer && userAnswer[item.origIndex] === i;
                        const isWrong = showingAnswer && Object.entries(userAnswer).some(([left, right]) => right === i && parseInt(left) !== item.origIndex);
                        
                        return `
                            <div class="match-item right ${isUsed ? 'used' : ''} ${isCorrect ? 'correct-match' : ''} ${isWrong ? 'wrong-match' : ''} ${showingAnswer ? 'disabled' : ''}"
                                data-touch-drop-zone="match-right"
                                data-index="${i}"
                                ondragover="window.app.matchDragOver(event)"
                                ondragleave="window.app.matchDragLeave(event)"
                                ondrop="window.app.matchDrop(event, ${i})"
                                onclick="window.app.selectMatchRight(${i})">
                                <span class="match-number">${i + 1}</span>
                                <span class="match-text">${escapeHtml(item.text)}</span>
                                ${showingAnswer && isCorrect ? '<span class="match-check">✓</span>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            ${Object.keys(userAnswer).length > 0 && !showingAnswer ? `
                <div class="mt-4">
                    <button class="btn btn-secondary btn-sm" onclick="window.app.clearAllMatches()">Clear All</button>
                </div>
            ` : ''}
        </div>
    `;
}

// ==================== ORDERING (WITH MOBILE SUPPORT) ====================

function renderOrdering(q, questionIndex) {
    const state = getState();
    const showingAnswer = state.studyMode && state.showAnswer;
    
    let currentOrder = state.answers[questionIndex];
    if (!currentOrder) {
        // Initialize with shuffled order
        currentOrder = shuffleArray(q.options.map((text, i) => ({ 
            text, 
            origIndex: q.correct[i] 
        })));
        const answers = [...state.answers];
        answers[questionIndex] = currentOrder;
        setState({ answers });
    }
    
    const isMobile = 'ontouchstart' in window;
    
    return `
        <div class="ordering-container">
            <p class="helper-text mb-4">${isMobile ? 'Tap and drag items to reorder them' : 'Drag items to reorder them'}</p>
            
            <div class="ordering-list">
                ${currentOrder.map((item, i) => {
                    const isCorrect = showingAnswer && item.origIndex === i;
                    const isWrong = showingAnswer && item.origIndex !== i;
                    
                    return `
                        <div class="order-item ${isCorrect ? 'correct-order' : ''} ${isWrong ? 'wrong-order' : ''} ${showingAnswer ? 'disabled' : ''}"
                            data-touch-draggable="order-item"
                            data-touch-drop-zone="order-item"
                            data-index="${i}"
                            draggable="${!showingAnswer}"
                            ondragstart="window.app.orderDragStart(event, ${i})"
                            ondragover="window.app.orderDragOver(event)"
                            ondragleave="window.app.orderDragLeave(event)"
                            ondrop="window.app.orderDrop(event, ${i})"
                            ondragend="window.app.orderDragEnd(event)">
                            <span class="order-handle">${showingAnswer ? (isCorrect ? '✓' : '✗') : '☰'}</span>
                            <span class="order-number">${i + 1}</span>
                            <span class="order-text">${escapeHtml(item.text)}</span>
                            ${showingAnswer && isCorrect ? '<span class="order-check">✓</span>' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// ==================== ANSWER HANDLING ====================

export function selectOption(index) {
    const state = getState();
    if (state.studyMode && state.showAnswer) return;
    
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    const answers = [...state.answers];
    answers[state.currentQuestionIndex] = index;
    
    setState({ answers });
    
    if (state.studyMode) {
        setTimeout(() => handleStudyModeCheck(index, q), 300);
    }
    
    saveQuizProgress();
}

export function selectTF(value) {
    const state = getState();
    if (state.studyMode && state.showAnswer) return;
    
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    const answers = [...state.answers];
    answers[state.currentQuestionIndex] = value;
    
    setState({ answers });
    
    if (state.studyMode) {
        setTimeout(() => handleStudyModeCheck(value, q), 300);
    }
    
    saveQuizProgress();
}

export function checkMultipleChoiceAnswer() {
    const state = getState();
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    const userAnswer = state.answers[state.currentQuestionIndex];
    
    if (!userAnswer || userAnswer.length === 0) {
        showToast('Please select at least one answer', 'warning');
        return;
    }
    
    if (state.studyMode) {
        handleStudyModeCheck(userAnswer, q);
    }
}

function handleStudyModeCheck(userAnswer, question) {
    const state = getState();
    const isCorrect = checkIfCorrect(userAnswer, question, state.currentQuestionIndex);
    
    if (isCorrect) {
        recordCorrectAnswer();
        if (window.sounds) window.sounds.playCorrect(state.quizStreak);
        if (window.animations) {
            const answerEl = document.querySelector('.option.selected') || document.querySelector('.tf-options button.selected');
            if (answerEl) window.animations.burstCorrect(answerEl);
        }
    } else {
        recordWrongAnswer();
        if (window.sounds) window.sounds.playWrong();
        if (window.animations) {
            const answerEl = document.querySelector('.option.selected') || document.querySelector('.tf-options button.selected');
            if (answerEl) window.animations.burstWrong(answerEl);
        }
    }
    
    setState({ showAnswer: true });
}

function checkIfCorrect(answer, question, questionIndex = null) {
    const state = getState();
    
    // Get correct answer (handle randomization)
    let correctAnswer = question.correct;
    if (questionIndex !== null && state.randomizeOptions && state.optionShuffles[questionIndex]) {
        correctAnswer = state.optionShuffles[questionIndex].newCorrect;
    }
    
    switch (question.type) {
        case 'truefalse':
            const correctBool = correctAnswer[0] === 0;
            return answer === correctBool;
            
        case 'matching':
            if (!answer || typeof answer !== 'object') return false;
            return Object.entries(answer).every(([left, right]) => 
                parseInt(left) === parseInt(right)
            );
            
        case 'ordering':
            if (!answer || !Array.isArray(answer)) return false;
            return answer.every((item, idx) => item.origIndex === idx);
            
        default:
            if (Array.isArray(correctAnswer)) {
                const ans = answer || [];
                return correctAnswer.length === ans.length && 
                       correctAnswer.every(c => ans.includes(c));
            }
            return answer === correctAnswer;
    }
}

// ==================== MATCHING HANDLERS ====================

let draggedMatchIndex = null;
let draggedFromLeft = null;
let selectedMatchLeft = null; // For mobile tap-to-match

export function matchDragStart(e, index, fromLeft) {
    draggedMatchIndex = index;
    draggedFromLeft = fromLeft;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

export function matchDragOver(e) {
    e.preventDefault();
    if (draggedMatchIndex !== null && draggedFromLeft) {
        e.currentTarget.classList.add('drag-over');
    }
}

export function matchDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

export function matchDrop(e, rightIndex) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (draggedMatchIndex === null || !draggedFromLeft) return;
    
    const state = getState();
    if (state.studyMode && state.showAnswer) return;
    
    matchDropHandler(draggedMatchIndex, rightIndex);
}

function matchDropHandler(leftIndex, rightIndex) {
    const state = getState();
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    const currentAnswers = { ...(state.answers[state.currentQuestionIndex] || {}) };
    
    currentAnswers[leftIndex] = rightIndex;
    
    const answers = [...state.answers];
    answers[state.currentQuestionIndex] = currentAnswers;
    setState({ answers });
    
    if (state.studyMode && Object.keys(currentAnswers).length === q.pairs.length) {
        setTimeout(() => {
            handleStudyModeCheck(currentAnswers, q);
        }, 300);
    }
    
    saveQuizProgress();
}

// Touch handler for matching
function matchDropTouchHandler(leftIndex, rightIndex) {
    matchDropHandler(leftIndex, rightIndex);
}

// Mobile tap-to-match support
export function selectMatchLeft(index) {
    const state = getState();
    if (state.studyMode && state.showAnswer) return;
    
    selectedMatchLeft = index;
    
    // Highlight selected
    document.querySelectorAll('.match-item.left').forEach(el => el.classList.remove('tap-selected'));
    document.querySelector(`[data-index="${index}"].match-item.left`)?.classList.add('tap-selected');
    
    showToast('Now tap a definition to match', 'info');
}

export function selectMatchRight(index) {
    if (selectedMatchLeft === null) {
        showToast('Select a term first', 'warning');
        return;
    }
    
    matchDropHandler(selectedMatchLeft, index);
    
    // Clear selection
    document.querySelectorAll('.match-item.left').forEach(el => el.classList.remove('tap-selected'));
    selectedMatchLeft = null;
}

export function removeMatch(leftIndex) {
    const state = getState();
    if (state.studyMode && state.showAnswer) return;
    
    const currentAnswers = { ...(state.answers[state.currentQuestionIndex] || {}) };
    delete currentAnswers[leftIndex];
    
    const answers = [...state.answers];
    answers[state.currentQuestionIndex] = currentAnswers;
    setState({ answers });
    saveQuizProgress();
}

export function clearAllMatches() {
    const state = getState();
    if (state.studyMode && state.showAnswer) return;
    
    const answers = [...state.answers];
    answers[state.currentQuestionIndex] = {};
    setState({ answers });
    saveQuizProgress();
}

export function matchDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    draggedMatchIndex = null;
    draggedFromLeft = null;
}

// ==================== ORDERING HANDLERS ====================

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
    if (state.studyMode && state.showAnswer) return;
    
    orderDropHandler(draggedOrderIndex, targetIndex);
}

function orderDropHandler(fromIndex, toIndex) {
    const state = getState();
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    const currentOrder = state.answers[state.currentQuestionIndex] || 
        q.options.map((text, i) => ({ text, origIndex: q.correct[i] }));
    
    const newOrder = [...currentOrder];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    
    const answers = [...state.answers];
    answers[state.currentQuestionIndex] = newOrder;
    setState({ answers });
    
    saveQuizProgress();
}

// Touch handler for ordering
function orderDropTouchHandler(fromIndex, toIndex) {
    orderDropHandler(fromIndex, toIndex);
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

// ==================== QUIZ START ====================

export async function startQuiz(quizId, options = {}) {
    showLoading();
    
    try {
        const quiz = await getQuiz(quizId);
        
        let savedProgress = null;
        if (!options.restart) {
            savedProgress = loadQuizProgress(quizId);
        }
        
        if (savedProgress && !options.restart) {
            // Restore saved progress
            setState({
                view: 'quiz',
                currentQuiz: quiz,
                currentQuestionIndex: savedProgress.questionIndex || 0,
                answers: savedProgress.answers || [],
                flaggedQuestions: new Set(savedProgress.flagged || []),
                studyMode: savedProgress.studyMode ?? options.studyMode ?? true,
                randomizeOptions: savedProgress.randomizeOptions ?? options.randomizeOptions ?? false,
                optionShuffles: savedProgress.optionShuffles || {},
                showAnswer: false,
                quizStreak: savedProgress.quizStreak || 0,
                maxQuizStreak: savedProgress.maxQuizStreak || 0,
                matchingShuffled: savedProgress.matchingShuffled || {},
                timerEnabled: savedProgress.timerEnabled ?? options.timed ?? false,
                timerMinutes: options.minutes || 15,
                timeRemaining: savedProgress.timeRemaining || ((options.minutes || 15) * 60),
                quizStartTime: Date.now()
            });
            
            showToast('Resuming quiz...', 'info');
        } else {
            // Fresh start
            setState({
                view: 'quiz',
                currentQuiz: quiz,
                currentQuestionIndex: 0,
                answers: [],
                flaggedQuestions: new Set(),
                studyMode: options.studyMode ?? true,
                randomizeOptions: options.randomizeOptions ?? false,
                optionShuffles: {},
                showAnswer: false,
                quizStreak: 0,
                maxQuizStreak: 0,
                matchingShuffled: {},
                timerEnabled: options.timed ?? false,
                timerMinutes: options.minutes || 15,
                timeRemaining: (options.minutes || 15) * 60,
                quizStartTime: Date.now()
            });
            
            if (window.sounds) window.sounds.playQuizStart();
        }
        
        if (options.timed) {
            startTimer();
        }
        
        // Update daily streak
        updateDailyStreak();
        
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Failed to load quiz: ' + error.message, 'error');
        console.error('Quiz load error:', error);
    }
}

// ==================== TIMER ====================

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        const state = getState();
        if (state.timeRemaining <= 0) {
            clearInterval(timerInterval);
            showToast('Time\'s up!', 'warning');
            submitQuiz();
            return;
        }
        
        if (window.sounds) {
            if (state.timeRemaining === TIME.TIMER_WARNING_SECONDS) {
                window.sounds.playTimerWarning();
            } else if (state.timeRemaining <= TIME.TIMER_URGENT_SECONDS) {
                window.sounds.playTimerUrgent();
            }
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
    
    let correct = 0;
    quiz.questions.forEach((q, i) => {
        if (checkIfCorrect(state.answers[i], q, i)) {
            correct++;
        }
    });
    
    const total = quiz.questions.length;
    const percentage = Math.round((correct / total) * 100);
    const isPerfect = correct === total;
    
    recordQuizComplete(correct, total);
    
    // Celebrations
    if (window.sounds && window.animations) {
        if (isPerfect) {
            window.sounds.playPerfectScore();
            setTimeout(() => window.animations.showFireworks(), 300);
        } else if (percentage >= 75) {
            window.animations.showConfetti(true);
        } else if (percentage >= 50) {
            window.animations.showConfetti(false);
        }
    }
    
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