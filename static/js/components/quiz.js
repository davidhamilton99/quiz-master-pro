/* Quiz Component */

import { getState, setState, saveQuizProgress, loadQuizProgress, clearQuizProgress } from '../state.js';
import { getQuiz, saveAttempt } from '../services/api.js';
import { escapeHtml, shuffleArray, showLoading, hideLoading, showConfetti } from '../utils/dom.js';
import { showToast } from '../utils/toast.js';

let timerInterval = null;
let draggedIdx = null;

export function renderQuiz() {
    const state = getState();
    const quiz = state.currentQuiz;
    if (!quiz) return '<div class="flex items-center justify-center" style="min-height:100vh"><div class="spinner"></div></div>';
    
    const q = quiz.questions[state.currentQuestionIndex];
    const total = quiz.questions.length;
    
    return `
        <div class="quiz-page">
            <header class="quiz-header">
                <button class="btn btn-ghost" onclick="window.app.exitQuiz()">← Exit</button>
                
                <div class="quiz-info">
                    <span class="hide-mobile text-sm">${escapeHtml(quiz.title)}</span>
                    <span class="badge">${state.currentQuestionIndex + 1}/${total}</span>
                </div>
                
                <div class="flex items-center gap-2">
                    ${state.timerEnabled ? `<div id="timer" class="quiz-timer ${state.timeRemaining <= 60 ? 'urgent' : ''}">${formatTime(state.timeRemaining)}</div>` : ''}
                    <button class="btn btn-icon btn-ghost ${state.flaggedQuestions.has(state.currentQuestionIndex) ? 'text-warning' : ''}" onclick="window.app.toggleFlag()" title="Flag">🚩</button>
                </div>
            </header>
            
            <main class="quiz-main">
                <div class="quiz-content">
                    <div class="question-header">
                        <div class="question-num">
                            Question ${state.currentQuestionIndex + 1}
                            ${q.type !== 'choice' ? `<span class="badge badge-primary">${q.type}</span>` : ''}
                            ${state.flaggedQuestions.has(state.currentQuestionIndex) ? '<span class="badge badge-warning">Flagged</span>' : ''}
                        </div>
                        <h2 class="question-text">${escapeHtml(q.question)}</h2>
                    </div>
                    
                    ${q.code ? renderCode(q.code) : ''}
                    
                    ${renderOptions(q, state.currentQuestionIndex)}
                    
                    ${state.studyMode && state.showAnswer && q.explanation ? `
                        <div class="explanation">
                            <strong>💡 Explanation:</strong> ${escapeHtml(q.explanation)}
                        </div>
                    ` : ''}
                </div>
            </main>
            
            <footer class="quiz-footer">
                <div class="quiz-nav">
                    <button class="btn btn-secondary" onclick="window.app.prevQ()" ${state.currentQuestionIndex === 0 ? 'disabled' : ''}>← Prev</button>
                    
                    <div class="question-dots hide-mobile">${renderDots()}</div>
                    <div class="show-mobile text-center font-medium">${state.currentQuestionIndex + 1} / ${total}</div>
                    
                    ${state.currentQuestionIndex === total - 1 
                        ? `<button class="btn btn-primary" onclick="window.app.submitQuiz()">Submit</button>`
                        : `<button class="btn btn-primary" onclick="window.app.nextQ()">Next →</button>`
                    }
                </div>
            </footer>
        </div>
    `;
}

function renderCode(code) {
    return `
        <div class="code-block">
            <div class="code-header">
                <div class="code-dots"><div class="code-dot red"></div><div class="code-dot yellow"></div><div class="code-dot green"></div></div>
                <span class="code-lang">code</span>
            </div>
            <pre class="code-body">${escapeHtml(code)}</pre>
        </div>
    `;
}

function renderOptions(q, qIndex) {
    const state = getState();
    const userAns = state.answers[qIndex];
    
    if (q.type === 'ordering') {
        const order = userAns || q.options.map((_, i) => i);
        return `
            <div class="options-list" id="order-list">
                ${order.map((optIdx, pos) => `
                    <div class="option" draggable="true" data-pos="${pos}"
                        ondragstart="window.app.dragStart(event,${pos})"
                        ondragover="window.app.dragOver(event)"
                        ondragleave="window.app.dragLeave(event)"
                        ondrop="window.app.drop(event,${pos})"
                        ondragend="window.app.dragEnd(event)">
                        <span class="option-letter">${pos + 1}</span>
                        <span class="option-text">${escapeHtml(q.options[optIdx])}</span>
                        <span style="margin-left:auto;cursor:grab">⋮⋮</span>
                    </div>
                `).join('')}
            </div>
            ${state.studyMode && !state.showAnswer ? `<button class="btn btn-primary mt-4" style="width:100%" onclick="window.app.checkAnswer()">Check Order</button>` : ''}
        `;
    }
    
    return `
        <div class="options-list">
            ${q.options.map((opt, i) => {
                const selected = Array.isArray(userAns) && userAns.includes(i);
                const isCorrect = state.showAnswer && q.correct.includes(i);
                const isWrong = state.showAnswer && selected && !q.correct.includes(i);
                
                let cls = 'option';
                if (selected) cls += ' selected';
                if (isCorrect) cls += ' correct';
                if (isWrong) cls += ' incorrect';
                
                return `
                    <div class="${cls}" onclick="window.app.selectOpt(${i})">
                        <span class="option-letter">${String.fromCharCode(65 + i)}</span>
                        <span class="option-text">${escapeHtml(opt)}</span>
                        ${state.showAnswer && isCorrect ? '<span style="margin-left:auto">✓</span>' : ''}
                    </div>
                `;
            }).join('')}
        </div>
        ${state.studyMode && !state.showAnswer && q.correct.length > 1 ? `<button class="btn btn-primary mt-4" style="width:100%" onclick="window.app.checkAnswer()">Check Answer</button>` : ''}
    `;
}

function renderDots() {
    const state = getState();
    const total = state.currentQuiz.questions.length;
    const max = 10;
    let start = 0;
    if (total > max) start = Math.max(0, Math.min(state.currentQuestionIndex - 4, total - max));
    
    let html = '';
    for (let i = 0; i < Math.min(total, max); i++) {
        const idx = start + i;
        let cls = 'q-dot';
        if (idx === state.currentQuestionIndex) cls += ' current';
        else if (state.answers[idx] !== null) cls += ' answered';
        if (state.flaggedQuestions.has(idx)) cls += ' flagged';
        html += `<button class="${cls}" onclick="window.app.goToQ(${idx})">${idx + 1}</button>`;
    }
    return html;
}

function formatTime(s) {
    return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
}

// === Quiz Actions ===

export async function startQuiz(id, opts = {}) {
    showLoading();
    
    // Check for saved progress
    const savedProgress = loadQuizProgress(id);
    if (savedProgress && !opts.fresh) {
        const resume = confirm(`Resume from question ${savedProgress.questionIndex + 1}?`);
        if (resume) {
            try {
                const quiz = await getQuiz(id);
                setState({
                    view: 'quiz',
                    currentQuiz: { id, title: quiz.title, questions: quiz.questions },
                    currentQuestionIndex: savedProgress.questionIndex,
                    answers: savedProgress.answers,
                    flaggedQuestions: new Set(savedProgress.flagged || []),
                    studyMode: savedProgress.studyMode,
                    timerEnabled: savedProgress.timerEnabled,
                    timeRemaining: savedProgress.timeRemaining,
                    streak: savedProgress.streak || 0,
                    maxStreak: savedProgress.maxStreak || 0,
                    showAnswer: false
                });
                if (savedProgress.timerEnabled && savedProgress.timeRemaining > 0) startTimer();
                hideLoading();
                showToast('Progress restored', 'info');
                return;
            } catch (err) {
                hideLoading();
                showToast('Failed to load quiz', 'error');
                return;
            }
        } else {
            clearQuizProgress(id);
        }
    }
    
    try {
        const quiz = await getQuiz(id);
        let questions = quiz.questions;
        if (opts.shuffle) questions = shuffleArray(questions);
        
        const answers = questions.map(q => q.type === 'ordering' ? shuffleArray(q.options.map((_, i) => i)) : null);
        
        setState({
            view: 'quiz',
            currentQuiz: { id, title: quiz.title, questions },
            currentQuestionIndex: 0,
            answers,
            studyMode: opts.study || false,
            timerEnabled: opts.timer || false,
            timerMinutes: opts.minutes || 15,
            timeRemaining: opts.timer ? (opts.minutes || 15) * 60 : 0,
            showAnswer: false,
            flaggedQuestions: new Set(),
            streak: 0,
            maxStreak: 0
        });
        
        if (opts.timer) startTimer();
        saveQuizProgress();
        hideLoading();
    } catch (err) {
        hideLoading();
        showToast('Failed to load quiz', 'error');
    }
}

export function selectOpt(idx) {
    const state = getState();
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    let ans = state.answers[state.currentQuestionIndex] || [];
    
    if (q.correct.length > 1) {
        ans = ans.includes(idx) ? ans.filter(i => i !== idx) : [...ans, idx];
    } else {
        ans = [idx];
    }
    
    const newAnswers = [...state.answers];
    newAnswers[state.currentQuestionIndex] = ans;
    setState({ answers: newAnswers });
    saveQuizProgress();
    
    if (state.studyMode && q.correct.length === 1) checkAnswer();
}

export function checkAnswer() {
    const state = getState();
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    const userAns = state.answers[state.currentQuestionIndex] || [];
    
    let correct = false;
    if (q.type === 'ordering') {
        correct = JSON.stringify(userAns) === JSON.stringify(q.correct);
    } else {
        const uSet = new Set(userAns);
        const cSet = new Set(q.correct);
        correct = uSet.size === cSet.size && [...uSet].every(a => cSet.has(a));
    }
    
    const newStreak = correct ? state.streak + 1 : 0;
    setState({
        showAnswer: true,
        streak: newStreak,
        maxStreak: Math.max(state.maxStreak, newStreak)
    });
    saveQuizProgress();
    
    showToast(correct ? 'Correct! 🎉' : 'Incorrect', correct ? 'success' : 'error');
}

export function nextQ() {
    const state = getState();
    if (state.currentQuestionIndex < state.currentQuiz.questions.length - 1) {
        setState({ currentQuestionIndex: state.currentQuestionIndex + 1, showAnswer: false });
        saveQuizProgress();
    }
}

export function prevQ() {
    const state = getState();
    if (state.currentQuestionIndex > 0) {
        setState({ currentQuestionIndex: state.currentQuestionIndex - 1, showAnswer: false });
    }
}

export function goToQ(idx) {
    setState({ currentQuestionIndex: idx, showAnswer: false });
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
    const score = calcScore();
    const total = state.currentQuiz.questions.length;
    const pct = Math.round((score / total) * 100);
    
    await saveAttempt(state.currentQuiz.id, {
        score, total, percentage: pct,
        answers: state.answers,
        study_mode: state.studyMode,
        timed: state.timerEnabled,
        max_streak: state.maxStreak
    });
    
    clearQuizProgress(state.currentQuiz.id);
    setState({ view: 'results' });
    
    if (pct === 100) setTimeout(() => showConfetti(), 100);
}

function calcScore() {
    const state = getState();
    let score = 0;
    state.currentQuiz.questions.forEach((q, i) => {
        const ans = state.answers[i];
        if (!ans) return;
        if (q.type === 'ordering') {
            if (JSON.stringify(ans) === JSON.stringify(q.correct)) score++;
        } else {
            const aSet = new Set(ans);
            const cSet = new Set(q.correct);
            if (aSet.size === cSet.size && [...aSet].every(a => cSet.has(a))) score++;
        }
    });
    return score;
}

// Timer
function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
        const state = getState();
        if (state.timeRemaining <= 1) {
            stopTimer();
            submitQuiz();
            showToast("Time's up!", 'warning');
        } else {
            setState({ timeRemaining: state.timeRemaining - 1 });
            const el = document.getElementById('timer');
            if (el) {
                el.textContent = formatTime(state.timeRemaining - 1);
                if (state.timeRemaining <= 61) el.classList.add('urgent');
            }
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Drag and drop for ordering
export function dragStart(e, idx) {
    draggedIdx = idx;
    e.target.style.opacity = '0.5';
}

export function dragOver(e) {
    e.preventDefault();
    e.currentTarget.style.background = 'var(--bg-hover)';
}

export function dragLeave(e) {
    e.currentTarget.style.background = '';
}

export function drop(e, targetIdx) {
    e.preventDefault();
    e.currentTarget.style.background = '';
    
    if (draggedIdx !== null && draggedIdx !== targetIdx) {
        const state = getState();
        const order = [...state.answers[state.currentQuestionIndex]];
        const [item] = order.splice(draggedIdx, 1);
        order.splice(targetIdx, 0, item);
        
        const newAnswers = [...state.answers];
        newAnswers[state.currentQuestionIndex] = order;
        setState({ answers: newAnswers });
        saveQuizProgress();
    }
}

export function dragEnd(e) {
    e.target.style.opacity = '1';
    draggedIdx = null;
}

// Quiz options modal
export function showQuizOptions(quizId) {
    const state = getState();
    const quiz = state.quizzes.find(q => q.id === quizId);
    if (!quiz) return;
    
    const progress = loadQuizProgress(quizId);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'quiz-opts';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Start Quiz</h2>
                <button class="btn btn-icon btn-ghost" onclick="document.getElementById('quiz-opts').remove()">✕</button>
            </div>
            <div class="modal-body">
                <h3 style="margin-bottom:0.5rem">${escapeHtml(quiz.title)}</h3>
                <p class="text-muted mb-6">${quiz.questions?.length || 0} questions</p>
                
                ${progress ? `
                    <div class="card mb-4" style="background:var(--warning-muted);border-color:var(--warning)">
                        <p class="font-medium">⏸ Progress saved</p>
                        <p class="text-sm text-muted">Question ${progress.questionIndex + 1} of ${quiz.questions?.length}</p>
                    </div>
                ` : ''}
                
                <div class="form-group">
                    <label class="flex items-center gap-3" style="cursor:pointer">
                        <input type="checkbox" id="opt-study" style="width:18px;height:18px">
                        <div>
                            <div class="font-medium">📖 Study Mode</div>
                            <div class="text-sm text-muted">See answers after each question</div>
                        </div>
                    </label>
                </div>
                
                <div class="form-group">
                    <label class="flex items-center gap-3" style="cursor:pointer">
                        <input type="checkbox" id="opt-shuffle" style="width:18px;height:18px">
                        <div>
                            <div class="font-medium">🔀 Shuffle Questions</div>
                            <div class="text-sm text-muted">Randomize order</div>
                        </div>
                    </label>
                </div>
                
                <div class="form-group">
                    <label class="flex items-center gap-3" style="cursor:pointer">
                        <input type="checkbox" id="opt-timer" onchange="document.getElementById('timer-opts').style.display=this.checked?'block':'none'" style="width:18px;height:18px">
                        <div>
                            <div class="font-medium">⏱️ Timer</div>
                            <div class="text-sm text-muted">Set a time limit</div>
                        </div>
                    </label>
                </div>
                
                <div id="timer-opts" style="display:none;margin-left:2rem">
                    <select id="opt-mins" class="input" style="width:auto">
                        <option value="5">5 min</option>
                        <option value="10">10 min</option>
                        <option value="15" selected>15 min</option>
                        <option value="20">20 min</option>
                        <option value="30">30 min</option>
                        <option value="45">45 min</option>
                        <option value="60">60 min</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                ${progress ? `<button class="btn btn-secondary flex-1" onclick="window.app.launchQuiz(${quizId}, true)">Start Fresh</button>` : ''}
                <button class="btn btn-primary flex-1" onclick="window.app.launchQuiz(${quizId}, false)">${progress ? 'Resume' : 'Start Quiz'}</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

export function launchQuiz(quizId, fresh) {
    const study = document.getElementById('opt-study')?.checked || false;
    const shuffle = document.getElementById('opt-shuffle')?.checked || false;
    const timer = document.getElementById('opt-timer')?.checked || false;
    const minutes = parseInt(document.getElementById('opt-mins')?.value || '15');
    
    document.getElementById('quiz-opts')?.remove();
    
    startQuiz(quizId, { study, shuffle, timer, minutes, fresh });
}
