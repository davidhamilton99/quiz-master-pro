/* Quiz Component - UPGRADED: Professional Matching & Ordering */
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

// ==================== HELPER FUNCTIONS ====================

function isMobileDevice() {
    return (
        ('ontouchstart' in window || navigator.maxTouchPoints > 0) &&
        window.innerWidth < 768
    );
}

function hapticFeedback(type = 'light') {
    if (!navigator.vibrate) return;
    
    const patterns = {
        light: 10,
        medium: 20,
        heavy: 30,
        success: [10, 50, 10],
        error: [20, 100, 20]
    };
    
    navigator.vibrate(patterns[type] || patterns.light);
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
    
    let displayOptions = q.options;
    let displayCorrect = q.correct;
    
    if (state.randomizeOptions) {
        if (!state.optionShuffles[questionIndex]) {
            const result = shuffleOptionsWithMapping(q.options, q.correct);
            const shuffles = { ...state.optionShuffles };
            shuffles[questionIndex] = result;
            setState({ optionShuffles: shuffles });
            
            displayOptions = result.shuffledOptions;
            displayCorrect = result.newCorrect;
        } else {
            const stored = state.optionShuffles[questionIndex];
            displayOptions = stored.shuffledOptions;
            displayCorrect = stored.newCorrect;
        }
    }
    
    const isMulti = Array.isArray(displayCorrect) && displayCorrect.length > 1;
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
        if (isSelected) {
            cls += ' selected';
        }
        if (showingAnswer) {
            if (isCorrectOpt) cls += ' correct';
            if (isSelected && !isCorrectOpt) cls += ' incorrect';
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
            </label>
        `;
    });
    html += '</div>';
    
    if (isMulti && !showingAnswer) {
        html += `<div class="mt-4"><button class="btn btn-primary" onclick="window.app.checkMultipleChoiceAnswer()">Check Answer</button></div>`;
    }
    
    return html;
}

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
    
    const trueSelected = userAnswer === true;
    const falseSelected = userAnswer === false;
    
    let trueClass = 'option';
    let falseClass = 'option';
    
    if (trueSelected) trueClass += ' selected';
    if (falseSelected) falseClass += ' selected';
    
    if (showingAnswer) {
        if (correctAnswer) trueClass += ' correct';
        else if (trueSelected) trueClass += ' incorrect';
        
        if (!correctAnswer) falseClass += ' correct';
        else if (falseSelected) falseClass += ' incorrect';
    }
    
    return `
        <div class="tf-options">
            <button class="${trueClass}" onclick="window.app.selectTF(true)" ${disabled}>
                <span class="tf-icon">✓</span>
                <span class="tf-label">True</span>
            </button>
            <button class="${falseClass}" onclick="window.app.selectTF(false)" ${disabled}>
                <span class="tf-icon">✗</span>
                <span class="tf-label">False</span>
            </button>
        </div>
    `;
}

// ==================== MATCHING QUESTIONS (NEW IMPLEMENTATION) ====================

function renderMatching(q, questionIndex) {
    const state = getState();
    const userAnswer = state.answers[questionIndex] || {};
    const showingAnswer = state.studyMode && state.showAnswer;
    
    let shuffledRight = state.matchingShuffled[questionIndex];
    if (!shuffledRight) {
        shuffledRight = shuffleArray(q.pairs.map((p, i) => ({ 
            text: p.right, 
            origIndex: i 
        })));
        const newShuffled = { ...state.matchingShuffled };
        newShuffled[questionIndex] = shuffledRight;
        setState({ matchingShuffled: newShuffled });
    }
    
    const mobile = isMobileDevice();
    
    return `
        <div class="matching-container ${showingAnswer ? 'locked' : ''}" 
            id="matching-q${questionIndex}"
            style="${mobile ? 'touch-action: pan-y;' : ''}">
            ${renderMatchingInstructions(mobile, showingAnswer)}
            
            <div class="matching-grid">
                <div class="matching-column matching-left">
                    <div class="matching-header">Terms</div>
                    ${q.pairs.map((pair, i) => 
                        renderMatchLeftItem(pair, i, userAnswer, shuffledRight, showingAnswer, mobile)
                    ).join('')}
                </div>
                
                <div class="matching-column matching-right">
                    <div class="matching-header">Definitions</div>
                    ${shuffledRight.map((item, i) => 
                        renderMatchRightItem(item, i, userAnswer, showingAnswer, mobile)
                    ).join('')}
                </div>
            </div>
            
            ${Object.keys(userAnswer).length > 0 && !showingAnswer ? `
                <div class="matching-actions">
                    <button class="btn btn-secondary btn-sm" onclick="window.app.clearAllMatches()">
                        Clear All Matches
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

function renderMatchingInstructions(mobile, showingAnswer) {
    if (showingAnswer) return '';
    
    if (mobile) {
        return `
            <div class="matching-instructions mobile">
                <span class="instruction-icon">👆</span>
                <p>Tap a term, then tap its matching definition</p>
            </div>
        `;
    }
    return `
        <div class="matching-instructions desktop">
            <span class="instruction-icon">🖱️</span>
            <p>Drag terms to their matching definitions</p>
        </div>
    `;
}

function renderMatchLeftItem(pair, index, userAnswer, shuffledRight, showingAnswer, mobile) {
    const isMatched = userAnswer[index] !== undefined;
    const matchedRightIndex = userAnswer[index];
    const matchedText = isMatched ? shuffledRight[matchedRightIndex].text : '';
    
    let statusClass = '';
    if (showingAnswer && isMatched) {
        const isCorrect = shuffledRight[matchedRightIndex].origIndex === index;
        statusClass = isCorrect ? 'match-correct' : 'match-wrong';
    }
    
    const letter = String.fromCharCode(65 + index);
    
    return `
        <div class="match-item match-left ${isMatched ? 'matched' : ''} ${statusClass} ${showingAnswer ? 'disabled' : ''}"
            data-left-index="${index}">
            
            <div class="match-content">
                <span class="match-letter">${letter}</span>
                <span class="match-text">${escapeHtml(pair.left)}</span>
            </div>
            
            ${isMatched ? `
                <div class="match-connection">
                    <span class="connection-arrow">→</span>
                    <span class="connection-text">${escapeHtml(matchedText)}</span>
                    ${!showingAnswer ? `
                        <button class="match-remove-btn" 
                            onclick="window.app.unmatchItem(${index})"
                            title="Remove match">
                            ✕
                        </button>
                    ` : ''}
                </div>
            ` : ''}
            
            ${showingAnswer && statusClass ? `
                <span class="match-status-icon">
                    ${statusClass === 'match-correct' ? '✓' : '✗'}
                </span>
            ` : ''}
        </div>
    `;
}

function renderMatchRightItem(item, index, userAnswer, showingAnswer, mobile) {
    const isUsed = Object.values(userAnswer).includes(index);
    
    let statusClass = '';
    if (showingAnswer) {
        const matchedLeft = Object.entries(userAnswer).find(([_, right]) => right === index);
        if (matchedLeft) {
            const leftIndex = parseInt(matchedLeft[0]);
            const isCorrect = item.origIndex === leftIndex;
            statusClass = isCorrect ? 'match-correct' : 'match-wrong';
        }
    }
    
    const number = index + 1;
    
    return `
        <div class="match-item match-right ${isUsed ? 'used' : ''} ${statusClass} ${showingAnswer ? 'disabled' : ''}"
            data-right-index="${index}">
            
            <span class="match-number">${number}</span>
            <span class="match-text">${escapeHtml(item.text)}</span>
            
            ${showingAnswer && statusClass ? `
                <span class="match-status-icon">
                    ${statusClass === 'match-correct' ? '✓' : '✗'}
                </span>
            ` : ''}
        </div>
    `;
}

// Matching state
let selectedMatchLeft = null;
let draggedMatchLeft = null;

function initMatchingHandlers() {
    const container = document.querySelector('.matching-container:not(.locked)');
    if (!container) return;
    
    const mobile = isMobileDevice();
    
    if (mobile) {
        initMatchingMobile(container);
    } else {
        initMatchingDesktop(container);
    }
}

function initMatchingMobile(container) {
    container.querySelectorAll('.match-left:not(.disabled)').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.match-remove-btn')) return;
            
            const index = parseInt(item.dataset.leftIndex);
            
            container.querySelectorAll('.match-left').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            selectedMatchLeft = index;
            
            hapticFeedback('light');
        });
    });
    
    container.querySelectorAll('.match-right:not(.disabled)').forEach(item => {
        item.addEventListener('click', () => {
            if (selectedMatchLeft === null) {
                hapticFeedback('error');
                return;
            }
            
            const rightIndex = parseInt(item.dataset.rightIndex);
            createMatch(selectedMatchLeft, rightIndex);
            
            container.querySelectorAll('.match-left').forEach(i => i.classList.remove('selected'));
            selectedMatchLeft = null;
        });
    });
}

function initMatchingDesktop(container) {
    container.querySelectorAll('.match-left:not(.disabled)').forEach(item => {
        item.draggable = true;
        
        item.addEventListener('dragstart', (e) => {
            draggedMatchLeft = parseInt(item.dataset.leftIndex);
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            container.querySelectorAll('.match-right').forEach(r => r.classList.remove('drag-over'));
            draggedMatchLeft = null;
        });
    });
    
    container.querySelectorAll('.match-right:not(.disabled)').forEach(item => {
        item.addEventListener('dragover', (e) => {
            if (draggedMatchLeft === null) return;
            e.preventDefault();
            item.classList.add('drag-over');
        });
        
        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            
            if (draggedMatchLeft === null) return;
            
            const rightIndex = parseInt(item.dataset.rightIndex);
            createMatch(draggedMatchLeft, rightIndex);
        });
    });
}

function createMatch(leftIndex, rightIndex) {
    const state = getState();
    const currentAnswer = { ...(state.answers[state.currentQuestionIndex] || {}) };
    
    currentAnswer[leftIndex] = rightIndex;
    
    const answers = [...state.answers];
    answers[state.currentQuestionIndex] = currentAnswer;
    setState({ answers });
    
    hapticFeedback('success');
    
    const question = state.currentQuiz.questions[state.currentQuestionIndex];
    if (state.studyMode && Object.keys(currentAnswer).length === question.pairs.length) {
        setTimeout(() => checkMatchingAnswer(), 300);
    }
    
    saveQuizProgress();
    rerenderCurrentQuestion();
}

export function unmatchItem(leftIndex) {
    const state = getState();
    const currentAnswer = { ...(state.answers[state.currentQuestionIndex] || {}) };
    
    delete currentAnswer[leftIndex];
    
    const answers = [...state.answers];
    answers[state.currentQuestionIndex] = currentAnswer;
    setState({ answers });
    
    hapticFeedback('medium');
    
    saveQuizProgress();
    rerenderCurrentQuestion();
}

export function clearAllMatches() {
    const state = getState();
    const answers = [...state.answers];
    answers[state.currentQuestionIndex] = {};
    setState({ answers });
    
    rerenderCurrentQuestion();
}

function checkMatchingAnswer() {
    const state = getState();
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    const userAnswer = state.answers[state.currentQuestionIndex];
    
    if (state.studyMode) {
        handleStudyModeCheck(userAnswer, q);
    }
}

// ==================== ORDERING QUESTIONS (NEW IMPLEMENTATION) ====================

function renderOrdering(q, questionIndex) {
    const state = getState();
    const showingAnswer = state.studyMode && state.showAnswer;
    
    let currentOrder = state.answers[questionIndex];
    if (!currentOrder) {
        currentOrder = shuffleArray(q.options.map((text, i) => ({ 
            text, 
            origIndex: i 
        })));
        const answers = [...state.answers];
        answers[questionIndex] = currentOrder;
        setState({ answers });
    }
    
    const mobile = isMobileDevice();
    
    return `
        <div class="ordering-container ${showingAnswer ? 'locked' : ''}" id="ordering-q${questionIndex}">
            ${renderOrderingInstructions(mobile, showingAnswer)}
            
            <div class="ordering-list">
                ${currentOrder.map((item, i) => 
                    renderOrderItem(item, i, showingAnswer, mobile, currentOrder.length)
                ).join('')}
            </div>
        </div>
    `;
}

function renderOrderingInstructions(mobile, showingAnswer) {
    if (showingAnswer) return '';
    
    if (mobile) {
        return `
            <div class="ordering-instructions mobile">
                <span class="instruction-icon">📱</span>
                <p>Use arrow buttons to reorder items</p>
            </div>
        `;
    }
    return `
        <div class="ordering-instructions desktop">
            <span class="instruction-icon">🖱️</span>
            <p>Drag items to reorder them</p>
        </div>
    `;
}

function renderOrderItem(item, index, showingAnswer, mobile, total) {
    let statusClass = '';
    if (showingAnswer) {
        const isCorrect = item.origIndex === index;
        statusClass = isCorrect ? 'order-correct' : 'order-wrong';
    }
    
    return `
        <div class="order-item ${statusClass} ${showingAnswer ? 'disabled' : ''}"
            data-order-index="${index}"
            data-orig-index="${item.origIndex}"
            ${!showingAnswer && !mobile ? 'draggable="true"' : ''}>
            
            ${!showingAnswer && !mobile ? `
                <span class="order-handle" title="Drag to reorder">☰</span>
            ` : showingAnswer ? `
                <span class="order-status-icon">
                    ${statusClass === 'order-correct' ? '✓' : '✗'}
                </span>
            ` : `
                <span class="order-handle-mobile">☰</span>
            `}
            
            <span class="order-number">${index + 1}</span>
            <span class="order-text">${escapeHtml(item.text)}</span>
            
            ${mobile && !showingAnswer ? `
                <div class="order-arrows">
                    <button class="order-arrow-btn order-up" 
                        onclick="window.app.moveOrderItem(${index}, 'up')"
                        ${index === 0 ? 'disabled' : ''}
                        title="Move up">
                        ▲
                    </button>
                    <button class="order-arrow-btn order-down" 
                        onclick="window.app.moveOrderItem(${index}, 'down')"
                        ${index === total - 1 ? 'disabled' : ''}
                        title="Move down">
                        ▼
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

// Ordering state
let draggedOrderIndex = null;

function initOrderingHandlers() {
    const container = document.querySelector('.ordering-container:not(.locked)');
    if (!container) return;
    
    const mobile = isMobileDevice();
    
    if (!mobile) {
        initOrderingDesktop(container);
    }
}

function initOrderingDesktop(container) {
    container.querySelectorAll('.order-item[draggable="true"]').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedOrderIndex = parseInt(item.dataset.orderIndex);
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            container.querySelectorAll('.order-item').forEach(i => {
                i.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            draggedOrderIndex = null;
        });
        
        item.addEventListener('dragover', (e) => {
            if (draggedOrderIndex === null) return;
            
            e.preventDefault();
            const currentIndex = parseInt(item.dataset.orderIndex);
            if (currentIndex === draggedOrderIndex) return;
            
            const rect = item.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            container.querySelectorAll('.order-item').forEach(i => {
                i.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            
            if (e.clientY < midpoint) {
                item.classList.add('drag-over-top');
            } else {
                item.classList.add('drag-over-bottom');
            }
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            
            if (draggedOrderIndex === null) return;
            
            const targetIndex = parseInt(item.dataset.orderIndex);
            const rect = item.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            let finalTarget = targetIndex;
            if (e.clientY >= midpoint) {
                finalTarget++;
            }
            
            if (draggedOrderIndex < finalTarget) {
                finalTarget--;
            }
            
            if (draggedOrderIndex !== finalTarget) {
                reorderItems(draggedOrderIndex, finalTarget);
            }
        });
    });
}

export function moveOrderItem(index, direction) {
    if (direction === 'up' && index > 0) {
        reorderItems(index, index - 1);
    } else if (direction === 'down') {
        const state = getState();
        const total = state.currentQuiz.questions[state.currentQuestionIndex].options.length;
        if (index < total - 1) {
            reorderItems(index, index + 1);
        }
    }
    
    hapticFeedback('light');
}

function reorderItems(fromIndex, toIndex) {
    const state = getState();
    const currentOrder = [...state.answers[state.currentQuestionIndex]];
    
    const [removed] = currentOrder.splice(fromIndex, 1);
    currentOrder.splice(toIndex, 0, removed);
    
    const answers = [...state.answers];
    answers[state.currentQuestionIndex] = currentOrder;
    setState({ answers });
    
    saveQuizProgress();
    rerenderCurrentQuestion();
}

function rerenderCurrentQuestion() {
    const state = getState();
    const question = state.currentQuiz.questions[state.currentQuestionIndex];
    
    let newHtml = '';
    if (question.type === 'matching') {
        newHtml = renderMatching(question, state.currentQuestionIndex);
    } else if (question.type === 'ordering') {
        newHtml = renderOrdering(question, state.currentQuestionIndex);
    }
    
    if (newHtml) {
        const container = document.querySelector(
            question.type === 'matching' ? '.matching-container' : '.ordering-container'
        );
        if (container) {
            container.outerHTML = newHtml;
            
            if (question.type === 'matching') {
                initMatchingHandlers();
            } else {
                initOrderingHandlers();
            }
        }
    }
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
        setTimeout(() => handleStudyModeCheck(index, q), TIME.STUDY_MODE_DELAY_MS);
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
        setTimeout(() => handleStudyModeCheck(value, q), TIME.STUDY_MODE_DELAY_MS);
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
            const shuffledRight = state.matchingShuffled[questionIndex];
            if (!shuffledRight) return false;
            
            return Object.entries(answer).every(([left, right]) => {
                const leftIdx = parseInt(left);
                const rightIdx = parseInt(right);
                return shuffledRight[rightIdx] && shuffledRight[rightIdx].origIndex === leftIdx;
            });
            
        case 'ordering':
            if (!answer || !Array.isArray(answer)) return false;
            return answer.every((item, idx) => item.origIndex === idx);
            
        default:
            if (Array.isArray(correctAnswer)) {
                if (correctAnswer.length === 1 && typeof answer === 'number') {
                    return answer === correctAnswer[0];
                }
                const ans = Array.isArray(answer) ? answer : [];
                return correctAnswer.length === ans.length && 
                       correctAnswer.every(c => ans.includes(c));
            }
            return answer === correctAnswer;
    }
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
        
        updateDailyStreak();
        
        hideLoading();
        
        // Initialize handlers after render
        setTimeout(() => {
            const q = quiz.questions[savedProgress?.questionIndex || 0];
            if (q.type === 'matching') {
                initMatchingHandlers();
            } else if (q.type === 'ordering') {
                initOrderingHandlers();
            }
        }, 100);
        
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

// Initialize handlers when quiz renders
export function initQuizHandlers() {
    const state = getState();
    if (state.view === 'quiz' && state.currentQuiz) {
        const q = state.currentQuiz.questions[state.currentQuestionIndex];
        if (q.type === 'matching') {
            initMatchingHandlers();
        } else if (q.type === 'ordering') {
            initOrderingHandlers();
        }
    }
}