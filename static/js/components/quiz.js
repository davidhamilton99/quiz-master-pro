/* Quiz Component - SPECTACULAR Edition - STUDY MODE FIXED WITH MULTI-SELECT */
import { 
    getState, setState, saveQuizProgress, loadQuizProgress, clearQuizProgress,
    recordCorrectAnswer, recordWrongAnswer, recordQuizComplete, updateDailyStreak,
    getLevelInfo
} from '../state.js';
import { getQuiz, saveAttempt } from '../services/api.js';
import { escapeHtml, shuffleArray, showLoading, hideLoading } from '../utils/dom.js';
import { showToast } from '../utils/toast.js';

let timerInterval = null;

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
                ${state.timerEnabled ? `<div id="timer" class="quiz-timer ${state.timeRemaining <= 60 ? 'urgent' : ''}">${formatTime(state.timeRemaining)}</div>` : ''}
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
    const isCorrect = checkIfCorrect(userAnswer, q);
    
    let feedbackHtml = `
        <div class="study-feedback ${isCorrect ? 'correct' : 'incorrect'}">
            <div class="feedback-header">
                <span class="feedback-icon">${isCorrect ? '✓' : '✗'}</span>
                <span class="feedback-text">${isCorrect ? 'Correct!' : 'Incorrect'}</span>
            </div>
    `;
    
    // Show correct answer if wrong
    if (!isCorrect) {
        feedbackHtml += `<div class="correct-answer-reveal">`;
        
        switch (q.type) {
            case 'truefalse':
                const correctBool = q.correct === true || q.correct === 'true';
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
                q.items.forEach((item, i) => {
                    feedbackHtml += `<li>${escapeHtml(item)}</li>`;
                });
                feedbackHtml += `</ol>`;
                break;
            default:
                if (Array.isArray(q.correct)) {
                    feedbackHtml += `<strong>Correct answers:</strong> `;
                    feedbackHtml += q.correct.map(idx => `${String.fromCharCode(65 + idx)}. ${escapeHtml(q.options[idx])}`).join(', ');
                } else {
                    feedbackHtml += `<strong>Correct answer:</strong> ${String.fromCharCode(65 + q.correct)}. ${escapeHtml(q.options[q.correct])}`;
                }
        }
        
        feedbackHtml += `</div>`;
    }
    
    // Show explanation if available
    if (q.explanation) {
        feedbackHtml += `<div class="explanation"><strong>💡 Explanation:</strong> ${escapeHtml(q.explanation)}</div>`;
    }
    
    feedbackHtml += `</div>`;
    
    return feedbackHtml;
}

function renderStreakDisplay(streak) {
    if (!streak || streak < 3) return '';
    
    const intensity = Math.min(Math.floor(streak / 5), 3);
    const fires = '🔥'.repeat(intensity + 1);
    
    let message = '';
    let className = 'streak-indicator';
    
    if (streak >= 20) {
        message = 'LEGENDARY!';
        className += ' legendary';
    } else if (streak >= 15) {
        message = 'UNSTOPPABLE!';
        className += ' unstoppable';
    } else if (streak >= 10) {
        message = 'ON FIRE!';
        className += ' on-fire';
    } else if (streak >= 5) {
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
    if (total > 20) {
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
    const showAnswer = state.studyMode && state.showAnswer;
    
    switch (q.type) {
        case 'truefalse': return renderTrueFalse(q, ans, showAnswer);
        case 'matching': return renderMatching(q, ans, idx, showAnswer);
        case 'ordering': return renderOrdering(q, ans, idx, showAnswer);
        default: return renderMultipleChoice(q, ans, showAnswer);
    }
}

function renderMultipleChoice(q, ans, showAnswer) {
       // FIX: Only multi-select if MULTIPLE correct answers
    const isMulti = Array.isArray(q.correct) && q.correct.length > 1;
    const state = getState();
    const isLocked = state.studyMode && state.showAnswer;
    const hasSelection = ans && (isMulti ? ans.length > 0 : ans !== undefined);
    
    return `<div class="options-list ${isLocked ? 'locked' : ''}" id="options-container">
        ${q.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = isMulti ? (ans || []).includes(i) : ans === i;
            const isCorrect = isMulti ? q.correct.includes(i) : q.correct === i;
            
            let cls = 'option';
            if (isSelected) cls += ' selected';
            if (showAnswer) {
                cls += ' revealed';
                if (isCorrect) cls += ' correct';
                if (isSelected && !isCorrect) cls += ' incorrect';
            }
            
            return `<div class="${cls}" data-index="${i}" onclick="window.app.selectOption(${i})">
                <span class="option-letter">${letter}</span>
                <span class="option-text">${escapeHtml(opt)}</span>
                ${showAnswer && isCorrect ? '<span class="answer-icon">✓</span>' : ''}
                ${showAnswer && isSelected && !isCorrect ? '<span class="answer-icon wrong">✗</span>' : ''}
            </div>`;
        }).join('')}
    </div>
    ${isMulti && !showAnswer ? `
        <p class="helper-text mt-2">Select all that apply</p>
        ${state.studyMode ? `
            <button class="btn btn-primary mt-3" 
                onclick="window.app.checkMultipleChoiceAnswer()"
                ${!hasSelection ? 'disabled' : ''}>
                Check Answer
            </button>
        ` : ''}
    ` : ''}`;
}

function renderTrueFalse(q, ans, showAnswer) {
    const correctVal = q.correct === true || q.correct === 'true';
    const state = getState();
    const isLocked = state.studyMode && state.showAnswer;
    
    return `<div class="tf-options ${isLocked ? 'locked' : ''}">
        ${[true, false].map(val => {
            let cls = 'tf-option';
            const isSelected = ans === val;
            const isCorrect = val === correctVal;
            
            if (isSelected) cls += ' selected';
            if (showAnswer) {
                cls += ' revealed';
                if (isCorrect) cls += ' correct';
                if (isSelected && !isCorrect) cls += ' incorrect';
            }
            
            return `<div class="${cls}" onclick="window.app.selectTF(${val})">
                <span class="tf-icon">${val ? '✓' : '✗'}</span>
                <span class="tf-label">${val ? 'True' : 'False'}</span>
                ${showAnswer && isCorrect ? '<span class="answer-icon">✓</span>' : ''}
            </div>`;
        }).join('')}
    </div>`;
}

function renderMatching(q, ans, qIdx, showAnswer) {
    const state = getState();
    const userMatches = ans || {};
    const isLocked = state.studyMode && state.showAnswer;
    
    if (!state.matchingShuffled) {
        setState({ matchingShuffled: {} });
    }
    
    if (!state.matchingShuffled[qIdx]) {
        const shuffled = { ...state.matchingShuffled };
        shuffled[qIdx] = shuffleArray([...q.pairs.map((p, i) => ({ text: p.right, origIndex: i }))]);
        setState({ matchingShuffled: shuffled });
    }
    const shuffledRight = state.matchingShuffled[qIdx] || q.pairs.map((p, i) => ({ text: p.right, origIndex: i }));
    
    const usedRightIndices = new Set(Object.values(userMatches));
    
    return `<div class="matching-container ${isLocked ? 'locked' : ''}">
        <div class="matching-instructions">${isLocked ? 'Review your matches below' : 'Drag items from the right to match with terms on the left'}</div>
        <div class="matching-columns">
            <div class="matching-left">
                <div class="matching-header">Terms</div>
                ${q.pairs.map((pair, i) => {
                    const matchedIdx = userMatches[i];
                    const hasMatch = matchedIdx !== undefined;
                    const matchedItem = shuffledRight.find(s => s.origIndex === matchedIdx);
                    const matchedText = matchedItem ? matchedItem.text : '';
                    
                    let cls = 'match-item left';
                    if (showAnswer) {
                        cls += ' revealed';
                        const isMatchCorrect = matchedIdx === i;
                        cls += isMatchCorrect ? ' correct' : (hasMatch ? ' incorrect' : ' incorrect');
                    }
                    
                    return `<div class="${cls}" 
                        data-left-index="${i}"
                        ${!isLocked ? `ondragover="window.app.matchDragOver(event)"
                        ondragleave="window.app.matchDragLeave(event)"
                        ondrop="window.app.matchDrop(event, ${i})"` : ''}>
                        <span class="match-letter">${String.fromCharCode(65 + i)}</span>
                        <span class="match-text">${escapeHtml(pair.left)}</span>
                        ${hasMatch 
                            ? `<div class="match-answer" ${!isLocked ? `draggable="true" ondragstart="window.app.matchDragStart(event, ${matchedIdx}, ${i})"` : ''}>
                                ${escapeHtml(matchedText)}
                                ${!isLocked ? `<button class="match-remove" onclick="event.stopPropagation(); window.app.removeMatch(${i})">×</button>` : ''}
                               </div>`
                            : `<div class="match-dropzone">${isLocked ? '(not matched)' : 'Drop here'}</div>`
                        }
                    </div>`;
                }).join('')}
            </div>
            ${!isLocked ? `
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
            </div>` : ''}
        </div>
    </div>`;
}

function renderOrdering(q, ans, qIdx, showAnswer) {
    const items = ans || q.items.map((item, i) => ({ text: item, origIndex: i }));
    const state = getState();
    const isLocked = state.studyMode && state.showAnswer;
    
    return `<div class="ordering-container ${isLocked ? 'locked' : ''}">
        <p class="helper-text mb-3">${isLocked ? 'Review your order below' : 'Drag to reorder the items'}</p>
        <div class="ordering-list" id="ordering-list">
            ${items.map((item, i) => {
                let cls = 'match-item ordering-item';
                if (showAnswer) {
                    cls += ' revealed';
                    cls += item.origIndex === i ? ' correct' : ' incorrect';
                }
                return `<div class="${cls}" 
                    ${!isLocked ? `draggable="true" 
                    data-index="${i}"
                    ondragstart="window.app.orderDragStart(event, ${i})"
                    ondragover="window.app.orderDragOver(event)"
                    ondragleave="window.app.orderDragLeave(event)"
                    ondrop="window.app.orderDrop(event, ${i})"
                    ondragend="window.app.orderDragEnd(event)"` : ''}>
                    <span class="match-num">${i + 1}</span>
                    <span class="match-text">${escapeHtml(item.text)}</span>
                    ${!isLocked ? '<span class="drag-handle">⋮⋮</span>' : ''}
                </div>`;
            }).join('')}
        </div>
    </div>`;
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ==================== ANSWER CHECKING ====================

function checkIfCorrect(answer, question) {
    switch (question.type) {
        case 'truefalse':
            const correctBool = question.correct === true || question.correct === 'true' || 
                               (Array.isArray(question.correct) && question.correct[0] === 0);
            return answer === correctBool;
            
        case 'matching':
            if (!answer) return false;
            return Object.entries(answer).every(([left, right]) => parseInt(left) === parseInt(right));
            
        case 'ordering':
            if (!answer) return false;
            return answer.every((item, idx) => item.origIndex === idx);
            
        default:
            // Multiple choice handling
            if (Array.isArray(question.correct)) {
                // If only one correct answer, treat as single choice
                if (question.correct.length === 1) {
                    return answer === question.correct[0];
                }
                // Multiple correct answers
                const ans = Array.isArray(answer) ? answer : [answer];
                return question.correct.length === ans.length && 
                       question.correct.every(c => ans.includes(c));
            }
            // Single correct answer as number
            return answer === question.correct;
    }
}

function handleStudyModeCheck(answer, question) {
    const state = getState();
    if (!state.studyMode) return;
    
    const isCorrect = checkIfCorrect(answer, question);
    
    // Play sounds via window if available
    if (window.sounds) {
        if (isCorrect) {
            const newStreak = (state.quizStreak || 0) + 1;
            window.sounds.playCorrect(newStreak);
            if (newStreak === 5 || newStreak === 10 || newStreak === 15 || newStreak === 20) {
                window.sounds.playStreakMilestone(newStreak);
            }
        } else {
            window.sounds.playWrong();
        }
    }
    
    // Update state - this will trigger re-render with showAnswer: true
    if (isCorrect) {
        recordCorrectAnswer();
        setState({ 
            showAnswer: true,
            quizStreak: (state.quizStreak || 0) + 1,
            maxQuizStreak: Math.max(state.maxQuizStreak || 0, (state.quizStreak || 0) + 1)
        });
    } else {
        recordWrongAnswer();
        setState({ 
            showAnswer: true,
            quizStreak: 0 
        });
    }
    
    // Animations after DOM updates
    setTimeout(() => {
        const selectedEl = document.querySelector('.option.selected, .tf-option.selected');
        if (window.animations && selectedEl) {
            if (isCorrect) {
                window.animations.burstCorrect(selectedEl);
            } else {
                window.animations.burstWrong(selectedEl);
                window.animations.addShakeAnimation(selectedEl);
            }
        }
    }, 50);
    
    saveQuizProgress();
}

// ==================== QUIZ ACTIONS ====================

export async function startQuiz(quizId, options = {}) {
    showLoading();
    try {
        const quiz = await getQuiz(quizId);
        
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
                updateDailyStreak();
                if (window.sounds) window.sounds.playQuizStart();
                return;
            }
        }
        
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
        updateDailyStreak();
        if (window.sounds) window.sounds.playQuizStart();
        
    } catch (e) {
        showToast('Failed to load quiz', 'error');
        console.error(e);
    }
    hideLoading();
}

export function selectOption(index) {
    const state = getState();
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    
    // FIX: Only multi-select if MULTIPLE correct answers
    const isMulti = Array.isArray(q.correct) && q.correct.length > 1;
    
    // Don't allow changes if answer already shown in study mode
    if (state.studyMode && state.showAnswer) return;
    
    let newAnswer;
    if (isMulti) {
        const current = state.answers[state.currentQuestionIndex] || [];
        newAnswer = current.includes(index) 
            ? current.filter(i => i !== index)
            : [...current, index];
    } else {
        // Single choice - just set the index directly
        newAnswer = index;
    }
    
    const newAnswers = [...state.answers];
    newAnswers[state.currentQuestionIndex] = newAnswer;
    setState({ answers: newAnswers });
    
    // Study mode: check answer immediately for single choice only
    if (state.studyMode && !isMulti) {
        handleStudyModeCheck(newAnswer, q);
    }
    
    saveQuizProgress();
}

export function checkMultipleChoiceAnswer() {
    const state = getState();
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    const answer = state.answers[state.currentQuestionIndex];
    
    if (!state.studyMode || state.showAnswer) return;
    if (!Array.isArray(q.correct)) return; // Not a multi-select
    
    // Check if at least one option is selected
    if (!answer || answer.length === 0) {
        if (window.sounds) window.sounds.playWrong();
        showToast('Please select at least one answer', 'warning');
        return;
    }
    
    handleStudyModeCheck(answer, q);
}

export function selectTF(value) {
    const state = getState();
    
    // Don't allow changes if answer already shown in study mode
    if (state.studyMode && state.showAnswer) return;
    
    const newAnswers = [...state.answers];
    newAnswers[state.currentQuestionIndex] = value;
    setState({ answers: newAnswers });
    
    if (state.studyMode) {
        const q = state.currentQuiz.questions[state.currentQuestionIndex];
        handleStudyModeCheck(value, q);
    }
    
    saveQuizProgress();
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
    
    // Don't allow changes if answer already shown in study mode
    if (state.studyMode && state.showAnswer) return;
    
    const currentAnswers = state.answers[state.currentQuestionIndex] || {};
    const newAnswers = { ...currentAnswers };
    
    if (draggedFromLeft !== null && draggedFromLeft !== leftIndex) {
        delete newAnswers[draggedFromLeft];
    }
    
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
            handleStudyModeCheck(newAnswers, q);
        }, 300);
    }
    
    saveQuizProgress();
}

export function removeMatch(leftIndex) {
    const state = getState();
    
    // Don't allow changes if answer already shown in study mode
    if (state.studyMode && state.showAnswer) return;
    
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
    
    // Don't allow changes if answer already shown in study mode
    if (state.studyMode && state.showAnswer) return;
    
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
        
        if (window.sounds) {
            if (state.timeRemaining === 60) {
                window.sounds.playTimerWarning();
            } else if (state.timeRemaining <= 10) {
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
        if (checkIfCorrect(state.answers[i], q)) {
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
