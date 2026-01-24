/* Quiz Component - with Drag & Drop Matching */
import { getState, setState, saveQuizProgress, loadQuizProgress, clearQuizProgress } from '../state.js';
import { getQuiz, saveAttempt } from '../services/api.js';
import { escapeHtml, shuffleArray, showLoading, hideLoading, showConfetti } from '../utils/dom.js';
import { showToast } from '../utils/toast.js';

let timerInterval = null;
let draggedItem = null;

export function renderQuiz() {
    const state = getState();
    const quiz = state.currentQuiz;
    if (!quiz) return '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh"><div class="spinner"></div></div>';
    const q = quiz.questions[state.currentQuestionIndex], total = quiz.questions.length;

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
        case 'ordering': return renderOrdering(q, ans, state.showAnswer);
        default: return renderMultipleChoice(q, ans, state.showAnswer, state.studyMode);
    }
}

// ==================== TRUE/FALSE ====================
function renderTrueFalse(q, ans, showAnswer) {
    return `<div class="tf-options">
        ${['True', 'False'].map((opt, i) => {
            const selected = Array.isArray(ans) && ans.includes(i);
            const correct = showAnswer && q.correct.includes(i);
            const wrong = showAnswer && selected && !q.correct.includes(i);
            return `<div class="tf-option${selected ? ' selected' : ''}${correct ? ' correct' : ''}${wrong ? ' incorrect' : ''}" 
                onclick="window.app.selectOpt(${i})">
                <span class="tf-icon">${i === 0 ? '✓' : '✗'}</span>
                <span class="option-text">${opt}</span>
            </div>`;
        }).join('')}
    </div>`;
}

// ==================== MATCHING (Drag & Drop) ====================
function renderMatching(q, ans, idx, showAnswer) {
    const state = getState();
    const userMatches = ans || {};
    
    // Get shuffled right options (stored in state to persist during quiz)
    let rightOptions = state.matchingShuffled?.[idx];
    if (!rightOptions) {
        rightOptions = shuffleArray([...q.pairs.map((p, i) => ({ text: p.right, originalIdx: i }))]);
        // Store in state
        const shuffled = { ...(state.matchingShuffled || {}), [idx]: rightOptions };
        setState({ matchingShuffled: shuffled });
    }
    
    return `<div class="matching-container">
        <div class="matching-instructions">
            Drag items from the right to match with terms on the left
        </div>
        <div class="matching-columns">
            <div class="matching-left">
                <div class="matching-header">Terms</div>
                ${q.pairs.map((pair, i) => {
                    const matchedIdx = userMatches[i];
                    const matchedItem = matchedIdx !== undefined ? rightOptions.find(r => r.originalIdx === matchedIdx) : null;
                    const isCorrect = showAnswer && matchedIdx === i;
                    const isWrong = showAnswer && matchedIdx !== undefined && matchedIdx !== i;
                    
                    return `<div class="match-item left${isCorrect ? ' correct' : ''}${isWrong ? ' incorrect' : ''}"
                        ondragover="window.app.matchDragOver(event)" 
                        ondragleave="window.app.matchDragLeave(event)"
                        ondrop="window.app.matchDrop(event, ${i})"
                        data-term="${i}">
                        <span class="match-letter">${String.fromCharCode(65 + i)}</span>
                        <span class="match-text">${escapeHtml(pair.left)}</span>
                        ${matchedItem ? `
                            <div class="match-answer" draggable="true" 
                                ondragstart="window.app.matchDragStart(event, ${matchedItem.originalIdx})"
                                ondragend="window.app.matchDragEnd(event)">
                                ${escapeHtml(matchedItem.text)}
                                <button class="match-remove" onclick="window.app.removeMatch(${i})">✕</button>
                            </div>
                        ` : '<div class="match-dropzone">Drop here</div>'}
                    </div>`;
                }).join('')}
            </div>
            <div class="matching-right">
                <div class="matching-header">Definitions</div>
                <div class="match-options" id="match-options">
                    ${rightOptions.map((item, i) => {
                        const isUsed = Object.values(userMatches).includes(item.originalIdx);
                        if (isUsed) return '';
                        return `<div class="match-draggable" draggable="true"
                            ondragstart="window.app.matchDragStart(event, ${item.originalIdx})"
                            ondragend="window.app.matchDragEnd(event)"
                            data-idx="${item.originalIdx}">
                            ${escapeHtml(item.text)}
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>
        ${getState().studyMode && !showAnswer && Object.keys(userMatches).length === q.pairs.length ? 
            `<button class="btn btn-primary mt-4" style="width:100%" onclick="window.app.checkAnswer()">Check Matches</button>` : ''}
    </div>`;
}

// ==================== ORDERING ====================
function renderOrdering(q, ans, showAnswer) {
    const order = ans || q.options.map((_, i) => i);
    
    return `<div class="options-list ordering-list" id="ordering-list">
        ${order.map((optIdx, pos) => {
            const isCorrect = showAnswer && q.correct[pos] === optIdx;
            const isWrong = showAnswer && q.correct[pos] !== optIdx;
            return `<div class="option ordering-item${isCorrect ? ' correct' : ''}${isWrong ? ' incorrect' : ''}" 
                draggable="true"
                ondragstart="window.app.orderDragStart(event, ${pos})"
                ondragover="window.app.orderDragOver(event)"
                ondragleave="window.app.orderDragLeave(event)"
                ondrop="window.app.orderDrop(event, ${pos})"
                ondragend="window.app.orderDragEnd(event)"
                data-pos="${pos}">
                <span class="option-letter">${pos + 1}</span>
                <span class="option-text">${escapeHtml(q.options[optIdx])}</span>
                <span class="drag-handle">⋮⋮</span>
            </div>`;
        }).join('')}
    </div>
    ${getState().studyMode && !showAnswer ? `<button class="btn btn-primary mt-4" style="width:100%" onclick="window.app.checkAnswer()">Check Order</button>` : ''}`;
}

// ==================== MULTIPLE CHOICE ====================
function renderMultipleChoice(q, ans, showAnswer, studyMode) {
    const selected = ans || [];
    const isMulti = q.correct.length > 1;
    
    return `<div class="options-list">
        ${q.options.map((opt, i) => {
            const sel = selected.includes(i);
            const correct = showAnswer && q.correct.includes(i);
            const wrong = showAnswer && sel && !q.correct.includes(i);
            return `<div class="option${sel ? ' selected' : ''}${correct ? ' correct' : ''}${wrong ? ' incorrect' : ''}" 
                onclick="window.app.selectOpt(${i})">
                <span class="option-letter">${String.fromCharCode(65 + i)}</span>
                <span class="option-text">${escapeHtml(opt)}</span>
                ${correct ? '<span style="margin-left:auto;color:var(--success)">✓</span>' : ''}
                ${wrong ? '<span style="margin-left:auto;color:var(--error)">✗</span>' : ''}
            </div>`;
        }).join('')}
    </div>
    ${studyMode && !showAnswer && isMulti ? `<button class="btn btn-primary mt-4" style="width:100%" onclick="window.app.checkAnswer()">Check Answer</button>` : ''}`;
}

function renderDots() {
    const state = getState(), total = state.currentQuiz.questions.length, max = 10;
    let start = total > max ? Math.max(0, Math.min(state.currentQuestionIndex - 4, total - max)) : 0;
    let html = '';
    for (let i = 0; i < Math.min(total, max); i++) {
        const idx = start + i;
        const answered = state.answers[idx] !== null && state.answers[idx] !== undefined && 
            (Array.isArray(state.answers[idx]) ? state.answers[idx].length > 0 : Object.keys(state.answers[idx] || {}).length > 0);
        html += `<button class="q-dot${idx === state.currentQuestionIndex ? ' current' : ''}${answered ? ' answered' : ''}${state.flaggedQuestions.has(idx) ? ' flagged' : ''}" 
            onclick="window.app.goToQ(${idx})">${idx + 1}</button>`;
    }
    return html;
}

function formatTime(s) { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`; }

// ==================== QUIZ CONTROL ====================
export async function startQuiz(id, opts = {}) {
    showLoading();
    const saved = loadQuizProgress(id);
    
    if (saved && !opts.fresh) {
        try {
            const quiz = await getQuiz(id);
            setState({ 
                view: 'quiz', 
                currentQuiz: { id, title: quiz.title, questions: quiz.questions }, 
                currentQuestionIndex: saved.questionIndex, 
                answers: saved.answers, 
                flaggedQuestions: new Set(saved.flagged || []), 
                studyMode: saved.studyMode, 
                timerEnabled: saved.timerEnabled, 
                timeRemaining: saved.timeRemaining, 
                streak: saved.streak || 0, 
                maxStreak: saved.maxStreak || 0, 
                showAnswer: false,
                matchingShuffled: saved.matchingShuffled || {}
            });
            if (saved.timerEnabled && saved.timeRemaining > 0) startTimer();
            hideLoading(); 
            showToast('Progress restored', 'info'); 
            return;
        } catch { hideLoading(); showToast('Failed to load', 'error'); return; }
    }
    
    if (saved) clearQuizProgress(id);
    
    try {
        const quiz = await getQuiz(id);
        let questions = quiz.questions;
        if (opts.shuffle) questions = shuffleArray(questions);
        
        const answers = questions.map(q => {
            if (q.type === 'ordering') return shuffleArray(q.options.map((_, i) => i));
            if (q.type === 'matching') return {};
            return null;
        });
        
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
            maxStreak: 0,
            matchingShuffled: {}
        });
        
        if (opts.timer) startTimer();
        saveQuizProgress(); 
        hideLoading();
    } catch { hideLoading(); showToast('Failed to load', 'error'); }
}

// ==================== ANSWER HANDLERS ====================
export function selectOpt(i) {
    const state = getState();
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    
    if (q.type === 'truefalse') {
        const newAns = [...state.answers];
        newAns[state.currentQuestionIndex] = [i];
        setState({ answers: newAns });
        saveQuizProgress();
        if (state.studyMode) checkAnswer();
        return;
    }
    
    // Multiple choice
    let ans = state.answers[state.currentQuestionIndex] || [];
    if (q.correct.length > 1) {
        ans = ans.includes(i) ? ans.filter(x => x !== i) : [...ans, i];
    } else {
        ans = [i];
    }
    
    const newAns = [...state.answers];
    newAns[state.currentQuestionIndex] = ans;
    setState({ answers: newAns });
    saveQuizProgress();
    
    if (state.studyMode && q.correct.length === 1) checkAnswer();
}

// Matching drag handlers
export function matchDragStart(e, idx) {
    draggedItem = idx;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

export function matchDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedItem = null;
    document.querySelectorAll('.match-item').forEach(el => el.classList.remove('drag-over'));
}

export function matchDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

export function matchDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

export function matchDrop(e, termIdx) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (draggedItem === null) return;
    
    const state = getState();
    const newAns = [...state.answers];
    const matches = { ...(newAns[state.currentQuestionIndex] || {}) };
    
    // Remove if this definition was matched elsewhere
    Object.keys(matches).forEach(key => {
        if (matches[key] === draggedItem) delete matches[key];
    });
    
    matches[termIdx] = draggedItem;
    newAns[state.currentQuestionIndex] = matches;
    setState({ answers: newAns });
    saveQuizProgress();
    
    // Auto-check in study mode when all matched
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    if (state.studyMode && Object.keys(matches).length === q.pairs.length) {
        setTimeout(() => checkAnswer(), 300);
    }
}

export function removeMatch(termIdx) {
    const state = getState();
    const newAns = [...state.answers];
    const matches = { ...(newAns[state.currentQuestionIndex] || {}) };
    delete matches[termIdx];
    newAns[state.currentQuestionIndex] = matches;
    setState({ answers: newAns });
    saveQuizProgress();
}

// Ordering drag handlers
let orderDraggedPos = null;

export function orderDragStart(e, pos) {
    orderDraggedPos = pos;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

export function orderDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

export function orderDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

export function orderDrop(e, targetPos) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (orderDraggedPos === null || orderDraggedPos === targetPos) return;
    
    const state = getState();
    const newAns = [...state.answers];
    const order = [...newAns[state.currentQuestionIndex]];
    
    const [item] = order.splice(orderDraggedPos, 1);
    order.splice(targetPos, 0, item);
    
    newAns[state.currentQuestionIndex] = order;
    setState({ answers: newAns });
    saveQuizProgress();
}

export function orderDragEnd(e) {
    e.target.classList.remove('dragging');
    orderDraggedPos = null;
    document.querySelectorAll('.ordering-item').forEach(el => el.classList.remove('drag-over'));
}

// Legacy drag handlers (for compatibility)
export function dragStart(e, i) { orderDragStart(e, i); }
export function dragOver(e) { orderDragOver(e); }
export function dragLeave(e) { orderDragLeave(e); }
export function drop(e, i) { orderDrop(e, i); }
export function dragEnd(e) { orderDragEnd(e); }

export function checkAnswer() {
    const state = getState();
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    const ans = state.answers[state.currentQuestionIndex];
    
    let correct = false;
    
    if (q.type === 'ordering') {
        correct = JSON.stringify(ans) === JSON.stringify(q.correct);
    } else if (q.type === 'matching') {
        const matches = ans || {};
        correct = q.pairs.every((_, i) => matches[i] === i);
    } else if (q.type === 'truefalse') {
        correct = ans && ans[0] === q.correct[0];
    } else {
        const ansArr = ans || [];
        correct = new Set(ansArr).size === new Set(q.correct).size && ansArr.every(a => q.correct.includes(a));
    }
    
    setState({ 
        showAnswer: true, 
        streak: correct ? state.streak + 1 : 0, 
        maxStreak: Math.max(state.maxStreak, correct ? state.streak + 1 : state.maxStreak) 
    });
    saveQuizProgress();
    showToast(correct ? 'Correct! 🎉' : 'Incorrect', correct ? 'success' : 'error');
}

export function nextQ() { 
    const s = getState(); 
    if (s.currentQuestionIndex < s.currentQuiz.questions.length - 1) { 
        setState({ currentQuestionIndex: s.currentQuestionIndex + 1, showAnswer: false }); 
        saveQuizProgress(); 
    } 
}

export function prevQ() { 
    const s = getState(); 
    if (s.currentQuestionIndex > 0) {
        setState({ currentQuestionIndex: s.currentQuestionIndex - 1, showAnswer: false }); 
    }
}

export function goToQ(i) { setState({ currentQuestionIndex: i, showAnswer: false }); }

export function toggleFlag() { 
    const s = getState();
    const f = new Set(s.flaggedQuestions); 
    f.has(s.currentQuestionIndex) ? f.delete(s.currentQuestionIndex) : f.add(s.currentQuestionIndex); 
    setState({ flaggedQuestions: f }); 
    saveQuizProgress(); 
}

export function exitQuiz() { 
    stopTimer(); 
    saveQuizProgress(); 
    setState({ view: 'library', currentQuiz: null, matchingShuffled: {} }); 
    showToast('Progress saved', 'info'); 
}

export async function submitQuiz() {
    stopTimer();
    const state = getState();
    const score = calcScore();
    const total = state.currentQuiz.questions.length;
    const pct = Math.round((score / total) * 100);
    
    await saveAttempt(state.currentQuiz.id, { 
        score, total, percentage: pct, answers: state.answers, 
        study_mode: state.studyMode, timed: state.timerEnabled, max_streak: state.maxStreak 
    });
    
    clearQuizProgress(state.currentQuiz.id); 
    setState({ view: 'results', matchingShuffled: {} });
    if (pct === 100) setTimeout(showConfetti, 100);
}

function calcScore() {
    const s = getState();
    let score = 0;
    s.currentQuiz.questions.forEach((q, i) => {
        const a = s.answers[i];
        if (!a) return;
        if (q.type === 'ordering') { if (JSON.stringify(a) === JSON.stringify(q.correct)) score++; }
        else if (q.type === 'matching') { if (q.pairs.every((_, j) => a[j] === j)) score++; }
        else if (q.type === 'truefalse') { if (a[0] === q.correct[0]) score++; }
        else if (new Set(a).size === new Set(q.correct).size && a.every(x => q.correct.includes(x))) score++;
    });
    return score;
}

function startTimer() { 
    stopTimer(); 
    timerInterval = setInterval(() => { 
        const s = getState(); 
        if (s.timeRemaining <= 1) { 
            stopTimer(); 
            submitQuiz(); 
            showToast("Time's up!", 'warning'); 
        } else { 
            setState({ timeRemaining: s.timeRemaining - 1 }); 
            const el = document.getElementById('timer'); 
            if (el) { 
                el.textContent = formatTime(s.timeRemaining - 1); 
                if (s.timeRemaining <= 61) el.classList.add('urgent'); 
            } 
        } 
    }, 1000); 
}

function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

// ==================== QUIZ OPTIONS MODAL ====================
export function showQuizOptions(quizId) {
    const state = getState();
    const quiz = state.quizzes.find(q => q.id === quizId);
    if (!quiz) return;
    
    const progress = loadQuizProgress(quizId);
    const m = document.createElement('div');
    m.className = 'modal-overlay';
    m.id = 'quiz-opts';
    m.onclick = e => { if (e.target === m) m.remove(); };
    
    m.innerHTML = `<div class="modal">
        <div class="modal-header">
            <h2>Start Quiz</h2>
            <button class="btn btn-icon btn-ghost" onclick="document.getElementById('quiz-opts').remove()">✕</button>
        </div>
        <div class="modal-body">
            <h3 style="margin-bottom:0.5rem">${escapeHtml(quiz.title)}</h3>
            <p class="text-muted mb-4">${quiz.questions?.length || 0} questions</p>
            
            ${progress ? `<div class="card mb-4" style="background:rgba(245,158,11,0.15);border-color:rgba(245,158,11,0.5)">
                <p class="font-medium" style="color:var(--warning-light)">⏸ Progress saved</p>
                <p class="text-sm text-muted">Question ${progress.questionIndex + 1} of ${quiz.questions?.length}</p>
            </div>` : ''}
            
            <div class="form-group">
                <label class="flex items-center gap-3" style="cursor:pointer">
                    <input type="checkbox" id="opt-study" style="width:20px;height:20px;accent-color:var(--primary)">
                    <div>
                        <div class="font-medium">📖 Study Mode</div>
                        <div class="text-sm text-muted">See answers after each question</div>
                    </div>
                </label>
            </div>
            
            <div class="form-group">
                <label class="flex items-center gap-3" style="cursor:pointer">
                    <input type="checkbox" id="opt-shuffle" style="width:20px;height:20px;accent-color:var(--primary)">
                    <div>
                        <div class="font-medium">🔀 Shuffle Questions</div>
                        <div class="text-sm text-muted">Randomize question order</div>
                    </div>
                </label>
            </div>
            
            <div class="form-group">
                <label class="flex items-center gap-3" style="cursor:pointer">
                    <input type="checkbox" id="opt-timer" onchange="document.getElementById('timer-opts').style.display=this.checked?'flex':'none'" style="width:20px;height:20px;accent-color:var(--primary)">
                    <div>
                        <div class="font-medium">⏱️ Timer</div>
                        <div class="text-sm text-muted">Set a time limit</div>
                    </div>
                </label>
            </div>
            
            <div id="timer-opts" style="display:none;margin-left:2.5rem;align-items:center;gap:0.5rem">
                <select id="opt-mins" class="input" style="width:auto">
                    <option value="5">5 minutes</option>
                    <option value="10">10 minutes</option>
                    <option value="15" selected>15 minutes</option>
                    <option value="20">20 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                </select>
            </div>
        </div>
        <div class="modal-footer">
            ${progress ? `<button class="btn btn-secondary flex-1" onclick="window.app.launchQuiz(${quizId}, true)">Start Fresh</button>` : ''}
            <button class="btn btn-primary flex-1" onclick="window.app.launchQuiz(${quizId}, false)">${progress ? 'Resume' : 'Start Quiz'}</button>
        </div>
    </div>`;
    
    document.body.appendChild(m);
}

export function launchQuiz(id, fresh) {
    const study = document.getElementById('opt-study')?.checked;
    const shuffle = document.getElementById('opt-shuffle')?.checked;
    const timer = document.getElementById('opt-timer')?.checked;
    const mins = parseInt(document.getElementById('opt-mins')?.value || '15');
    
    document.getElementById('quiz-opts')?.remove();
    startQuiz(id, { study, shuffle, timer, minutes: mins, fresh });
}

// Keep for compatibility
export function selectMatchLeft() {}
export function selectMatchRight() {}
export function clearMatches() {
    const state = getState();
    const newAns = [...state.answers];
    newAns[state.currentQuestionIndex] = {};
    setState({ answers: newAns });
    saveQuizProgress();
}
