/* ============================================
   QUIZ MASTER PRO - Quiz View
   Quiz taking and question display
   ============================================ */

import { getState, setState, saveQuizProgress, clearQuizProgress } from '../state.js';
import { getQuiz, saveAttempt } from '../services/api.js';
import { escapeHtml, shuffleArray, showConfetti, showLoading, hideLoading } from '../utils/dom.js';
import { showToast } from '../utils/toast.js';

export function renderQuiz() {
    const state = getState();
    const quiz = state.currentQuiz;
    
    if (!quiz) return '<div class="flex items-center justify-center" style="min-height:100vh"><div class="spinner"></div></div>';
    
    const question = quiz.questions[state.currentQuestionIndex];
    const totalQuestions = quiz.questions.length;
    
    return `
        <div class="quiz-page">
            <header class="quiz-header">
                <button class="btn btn-ghost" onclick="window.app.exitQuiz()">
                    ← Exit
                </button>
                
                <div class="quiz-progress">
                    <span class="text-sm hide-mobile">${escapeHtml(quiz.title)}</span>
                    <span class="badge">${state.currentQuestionIndex + 1}/${totalQuestions}</span>
                </div>
                
                <div class="flex items-center gap-3">
                    ${state.timerEnabled ? `
                        <div id="timer" class="quiz-timer ${state.timeRemaining <= 60 ? 'urgent' : ''}">
                            ${formatTime(state.timeRemaining)}
                        </div>
                    ` : ''}
                    
                    <button 
                        class="btn btn-icon btn-ghost ${state.flaggedQuestions.has(state.currentQuestionIndex) ? 'text-accent' : ''}"
                        onclick="window.app.toggleFlag()"
                        title="Flag for review"
                    >
                        🚩
                    </button>
                </div>
            </header>
            
            <main class="quiz-main">
                <div class="quiz-content">
                    <div class="question-number">
                        <span>Question ${state.currentQuestionIndex + 1}</span>
                        ${question.type !== 'choice' ? `<span class="badge badge-accent">${question.type}</span>` : ''}
                        ${state.flaggedQuestions.has(state.currentQuestionIndex) ? '<span class="badge badge-warning">Flagged</span>' : ''}
                    </div>
                    
                    <h2 class="question-text">${escapeHtml(question.question)}</h2>
                    
                    ${question.code ? renderCodeBlock(question) : ''}
                    ${question.image ? `<img src="${escapeHtml(question.image)}" alt="" style="max-width: 100%; border-radius: var(--radius-lg); margin-bottom: var(--space-6)">` : ''}
                    
                    ${renderQuestionOptions(question, state.currentQuestionIndex)}
                    
                    ${state.studyMode && state.showAnswer && question.explanation ? `
                        <div class="explanation-box mt-6">
                            <p class="font-semibold mb-2">💡 Explanation</p>
                            <p>${escapeHtml(question.explanation)}</p>
                        </div>
                    ` : ''}
                </div>
            </main>
            
            <footer class="quiz-footer">
                <div class="quiz-nav">
                    <button 
                        class="btn btn-secondary"
                        onclick="window.app.prevQuestion()"
                        ${state.currentQuestionIndex === 0 ? 'disabled' : ''}
                    >
                        ← Prev
                    </button>
                    
                    <div class="question-dots hide-mobile">
                        ${renderQuestionDots()}
                    </div>
                    
                    <div class="show-mobile text-center">
                        <span class="font-medium">${state.currentQuestionIndex + 1} / ${totalQuestions}</span>
                    </div>
                    
                    ${state.currentQuestionIndex === totalQuestions - 1 ? `
                        <button class="btn btn-primary" onclick="window.app.submitQuiz()">
                            Submit
                        </button>
                    ` : `
                        <button class="btn btn-primary" onclick="window.app.nextQuestion()">
                            Next →
                        </button>
                    `}
                </div>
            </footer>
        </div>
    `;
}

function renderCodeBlock(question) {
    return `
        <div class="code-block mb-6">
            <div class="code-header">
                <div class="code-dots">
                    <div class="code-dot red"></div>
                    <div class="code-dot yellow"></div>
                    <div class="code-dot green"></div>
                </div>
                <span class="code-lang">${question.language || 'code'}</span>
            </div>
            <pre class="code-body">${escapeHtml(question.code)}</pre>
        </div>
    `;
}

function renderQuestionOptions(question, questionIndex) {
    const state = getState();
    const userAnswer = state.answers[questionIndex];
    
    if (question.type === 'ordering') {
        return renderOrderingOptions(question, questionIndex, userAnswer);
    }
    
    // Multiple choice
    return `
        <div class="options-list">
            ${question.options.map((option, i) => {
                const isSelected = Array.isArray(userAnswer) && userAnswer.includes(i);
                const isCorrect = state.showAnswer && question.correct.includes(i);
                const isWrong = state.showAnswer && isSelected && !question.correct.includes(i);
                
                let className = 'option';
                if (isSelected) className += ' selected';
                if (state.showAnswer && isCorrect) className += ' correct';
                if (state.showAnswer && isWrong) className += ' incorrect';
                
                return `
                    <div 
                        class="${className}"
                        onclick="window.app.selectAnswer(${i})"
                    >
                        <span class="option-letter">${String.fromCharCode(65 + i)}</span>
                        <span class="option-text">${escapeHtml(option)}</span>
                        ${state.showAnswer && isCorrect ? '<span style="margin-left:auto">✓</span>' : ''}
                    </div>
                `;
            }).join('')}
        </div>
        
        ${state.studyMode && !state.showAnswer && question.correct.length > 1 ? `
            <button class="btn btn-primary mt-4" style="width:100%" onclick="window.app.checkStudyAnswer()">
                Check Answer
            </button>
        ` : ''}
    `;
}

function renderOrderingOptions(question, questionIndex, userAnswer) {
    const state = getState();
    const order = userAnswer || question.options.map((_, i) => i);
    
    return `
        <div class="options-list" id="ordering-list">
            ${order.map((optionIndex, position) => `
                <div 
                    class="option"
                    draggable="true"
                    data-index="${position}"
                    ondragstart="window.app.handleDragStart(event, ${position})"
                    ondragover="window.app.handleDragOver(event)"
                    ondragleave="window.app.handleDragLeave(event)"
                    ondrop="window.app.handleDrop(event, ${position})"
                    ondragend="window.app.handleDragEnd(event)"
                >
                    <span class="option-letter">${position + 1}</span>
                    <span class="option-text">${escapeHtml(question.options[optionIndex])}</span>
                    <span style="margin-left:auto;cursor:grab">⋮⋮</span>
                </div>
            `).join('')}
        </div>
        
        ${state.studyMode && !state.showAnswer ? `
            <button class="btn btn-primary mt-4" style="width:100%" onclick="window.app.checkStudyAnswer()">
                Check Order
            </button>
        ` : ''}
    `;
}

function renderQuestionDots() {
    const state = getState();
    const total = state.currentQuiz.questions.length;
    const maxDots = 10;
    
    let start = 0;
    if (total > maxDots) {
        start = Math.max(0, Math.min(state.currentQuestionIndex - 4, total - maxDots));
    }
    
    const dots = [];
    for (let i = 0; i < Math.min(total, maxDots); i++) {
        const idx = start + i;
        const isCurrent = idx === state.currentQuestionIndex;
        const isAnswered = state.answers[idx] !== null;
        const isFlagged = state.flaggedQuestions.has(idx);
        
        let className = 'question-dot';
        if (isCurrent) className += ' current';
        if (isAnswered) className += ' answered';
        if (isFlagged) className += ' flagged';
        
        dots.push(`
            <button class="${className}" onclick="window.app.goToQuestion(${idx})">
                ${idx + 1}
            </button>
        `);
    }
    
    return dots.join('');
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ========== QUIZ ACTIONS ==========

export async function startQuiz(id, options = {}) {
    showLoading();
    
    try {
        const quiz = await getQuiz(id);
        let questions = quiz.questions;
        
        if (options.shuffleQuestions) {
            questions = shuffleArray(questions);
        }
        
        const answers = questions.map(q => {
            if (q.type === 'ordering') {
                return shuffleArray(q.options.map((_, i) => i));
            }
            return null;
        });
        
        setState({
            view: 'quiz',
            currentQuiz: { id, title: quiz.title, questions },
            currentQuestionIndex: 0,
            answers,
            studyMode: options.studyMode || false,
            timerEnabled: options.timerEnabled || false,
            timerMinutes: options.timerMinutes || 15,
            timeRemaining: options.timerEnabled ? options.timerMinutes * 60 : 0,
            showAnswer: false,
            flaggedQuestions: new Set(),
            streak: 0,
            maxStreak: 0
        });
        
        if (options.timerEnabled) {
            startTimer();
        }
        
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Failed to load quiz', 'error');
    }
}

export function selectAnswer(index) {
    const state = getState();
    const question = state.currentQuiz.questions[state.currentQuestionIndex];
    
    let newAnswer;
    const currentAnswer = state.answers[state.currentQuestionIndex] || [];
    
    if (question.correct.length > 1) {
        // Multi-select
        if (currentAnswer.includes(index)) {
            newAnswer = currentAnswer.filter(i => i !== index);
        } else {
            newAnswer = [...currentAnswer, index];
        }
    } else {
        // Single select
        newAnswer = [index];
    }
    
    const newAnswers = [...state.answers];
    newAnswers[state.currentQuestionIndex] = newAnswer;
    
    setState({ answers: newAnswers });
    saveQuizProgress();
    
    // Auto-check in study mode for single answer questions
    if (state.studyMode && question.correct.length === 1) {
        checkStudyAnswer();
    }
}

export function checkStudyAnswer() {
    const state = getState();
    const question = state.currentQuiz.questions[state.currentQuestionIndex];
    const userAnswer = state.answers[state.currentQuestionIndex] || [];
    
    let correct = false;
    
    if (question.type === 'ordering') {
        correct = JSON.stringify(userAnswer) === JSON.stringify(question.correct);
    } else {
        const answerSet = new Set(userAnswer);
        const correctSet = new Set(question.correct);
        correct = answerSet.size === correctSet.size && [...answerSet].every(a => correctSet.has(a));
    }
    
    const newStreak = correct ? state.streak + 1 : 0;
    const newMaxStreak = Math.max(state.maxStreak, newStreak);
    
    setState({ 
        showAnswer: true,
        streak: newStreak,
        maxStreak: newMaxStreak
    });
    
    if (correct) {
        showToast('Correct! 🎉', 'success');
    } else {
        showToast('Not quite. Check the answer.', 'error');
    }
}

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
    }
}

export function goToQuestion(index) {
    setState({
        currentQuestionIndex: index,
        showAnswer: false
    });
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

export function exitQuiz() {
    stopTimer();
    saveQuizProgress();
    setState({ view: 'library', currentQuiz: null });
    showToast('Progress saved', 'info');
}

export async function submitQuiz() {
    stopTimer();
    
    const state = getState();
    const score = calculateScore();
    const total = state.currentQuiz.questions.length;
    const percentage = Math.round((score / total) * 100);
    
    // Save attempt to server
    await saveAttempt(state.currentQuiz.id, {
        score,
        total,
        percentage,
        answers: state.answers,
        study_mode: state.studyMode,
        timed: state.timerEnabled,
        max_streak: state.maxStreak
    });
    
    clearQuizProgress();
    setState({ view: 'results' });
    
    if (percentage === 100) {
        setTimeout(() => showConfetti(), 100);
    }
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

// ========== TIMER ==========
let timerInterval = null;

function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
        const state = getState();
        if (state.timeRemaining <= 1) {
            stopTimer();
            submitQuiz();
            showToast('Time\'s up!', 'warning');
        } else {
            setState({ timeRemaining: state.timeRemaining - 1 });
            updateTimerDisplay();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    const state = getState();
    const timer = document.getElementById('timer');
    if (timer) {
        timer.textContent = formatTime(state.timeRemaining);
        if (state.timeRemaining <= 60) {
            timer.classList.add('urgent');
        }
    }
}

// ========== DRAG & DROP ==========
let draggedIndex = null;

export function handleDragStart(e, index) {
    draggedIndex = index;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

export function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

export function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

export function handleDrop(e, targetIndex) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
        const state = getState();
        const newOrder = [...state.answers[state.currentQuestionIndex]];
        const [item] = newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, item);
        
        const newAnswers = [...state.answers];
        newAnswers[state.currentQuestionIndex] = newOrder;
        setState({ answers: newAnswers });
        saveQuizProgress();
    }
}

export function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedIndex = null;
}

export default {
    renderQuiz,
    startQuiz,
    selectAnswer,
    checkStudyAnswer,
    nextQuestion,
    prevQuestion,
    goToQuestion,
    toggleFlag,
    exitQuiz,
    submitQuiz,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
};
