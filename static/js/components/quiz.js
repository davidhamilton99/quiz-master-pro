/* Quiz Component */
import { getState, setState, saveQuizProgress, loadQuizProgress, clearQuizProgress } from '../state.js';
import { getQuiz, saveAttempt } from '../services/api.js';
import { escapeHtml, shuffleArray, showLoading, hideLoading, showConfetti } from '../utils/dom.js';
import { showToast } from '../utils/toast.js';

let timerInterval = null, draggedIdx = null;

export function renderQuiz() {
    const state = getState();
    const quiz = state.currentQuiz;
    if (!quiz) return '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh"><div class="spinner"></div></div>';
    const q = quiz.questions[state.currentQuestionIndex], total = quiz.questions.length;

    return `<div class="quiz-page">
        <header class="quiz-header">
            <button class="btn btn-ghost" onclick="window.app.exitQuiz()">← Exit</button>
            <div class="quiz-info"><span class="hide-mobile text-sm">${escapeHtml(quiz.title)}</span><span class="badge">${state.currentQuestionIndex + 1}/${total}</span></div>
            <div class="flex items-center gap-2">
                ${state.timerEnabled ? `<div id="timer" class="quiz-timer ${state.timeRemaining <= 60 ? 'urgent' : ''}">${formatTime(state.timeRemaining)}</div>` : ''}
                <button class="btn btn-icon btn-ghost ${state.flaggedQuestions.has(state.currentQuestionIndex) ? 'flagged' : ''}" onclick="window.app.toggleFlag()">🚩</button>
            </div>
        </header>
        <main class="quiz-main"><div class="quiz-content">
            <div class="question-header">
                <div class="question-num">Question ${state.currentQuestionIndex + 1} ${getTypeBadge(q.type)} ${state.flaggedQuestions.has(state.currentQuestionIndex) ? '<span class="badge badge-warning">Flagged</span>' : ''}</div>
                <h2 class="question-text">${escapeHtml(q.question)}</h2>
            </div>
            ${q.code ? `<div class="code-block"><div class="code-header"><div class="code-dots"><div class="code-dot red"></div><div class="code-dot yellow"></div><div class="code-dot green"></div></div></div><pre class="code-body">${escapeHtml(q.code)}</pre></div>` : ''}
            ${renderOptions(q, state.currentQuestionIndex)}
            ${state.studyMode && state.showAnswer && q.explanation ? `<div class="explanation"><strong>💡</strong> ${escapeHtml(q.explanation)}</div>` : ''}
        </div></main>
        <footer class="quiz-footer"><div class="quiz-nav">
            <button class="btn btn-secondary" onclick="window.app.prevQ()" ${state.currentQuestionIndex === 0 ? 'disabled' : ''}>← Prev</button>
            <div class="question-dots hide-mobile">${renderDots()}</div>
            <div class="show-mobile font-medium">${state.currentQuestionIndex + 1} / ${total}</div>
            ${state.currentQuestionIndex === total - 1 ? `<button class="btn btn-primary" onclick="window.app.submitQuiz()">Submit</button>` : `<button class="btn btn-primary" onclick="window.app.nextQ()">Next →</button>`}
        </div></footer>
    </div>`;
}

function getTypeBadge(type) {
    const badges = {
        'ordering': '<span class="badge badge-primary">↕️ Order</span>',
        'matching': '<span class="badge badge-primary">🔗 Match</span>',
        'truefalse': '<span class="badge badge-primary">T/F</span>'
    };
    return badges[type] || '';
}

function renderOptions(q, idx) {
    const state = getState(), ans = state.answers[idx];
    
    // True/False
    if (q.type === 'truefalse') {
        return `<div class="options-list tf-options">
            ${['True', 'False'].map((opt, i) => {
                const sel = Array.isArray(ans) && ans.includes(i);
                const correct = state.showAnswer && q.correct.includes(i);
                const wrong = state.showAnswer && sel && !q.correct.includes(i);
                return `<div class="option tf-option${sel ? ' selected' : ''}${correct ? ' correct' : ''}${wrong ? ' incorrect' : ''}" onclick="window.app.selectOpt(${i})">
                    <span class="tf-icon">${i === 0 ? '✓' : '✗'}</span>
                    <span class="option-text">${opt}</span>
                </div>`;
            }).join('')}
        </div>`;
    }
    
    // Matching
    if (q.type === 'matching') {
        const userMatches = ans || {};
        const rightOptions = state.showAnswer ? q.pairs.map(p => p.right) : shuffleMatchOptions(q, idx);
        
        return `<div class="matching-container">
            <div class="matching-instructions text-sm text-muted mb-4">Click a term, then click its match</div>
            <div class="matching-columns">
                <div class="matching-left">
                    <div class="matching-header">Terms</div>
                    ${q.pairs.map((pair, i) => {
                        const isSelected = state.selectedMatchLeft === i;
                        const isMatched = userMatches[i] !== undefined;
                        const matchedTo = isMatched ? userMatches[i] : null;
                        const isCorrect = state.showAnswer && matchedTo === i;
                        const isWrong = state.showAnswer && isMatched && matchedTo !== i;
                        return `<div class="match-item left${isSelected ? ' selected' : ''}${isMatched ? ' matched' : ''}${isCorrect ? ' correct' : ''}${isWrong ? ' incorrect' : ''}" 
                            onclick="window.app.selectMatchLeft(${i})" data-idx="${i}">
                            <span class="match-letter">${String.fromCharCode(65 + i)}</span>
                            <span class="match-text">${escapeHtml(pair.left)}</span>
                            ${isMatched ? `<span class="match-link">${matchedTo + 1}</span>` : ''}
                        </div>`;
                    }).join('')}
                </div>
                <div class="matching-right">
                    <div class="matching-header">Definitions</div>
                    ${rightOptions.map((opt, i) => {
                        const isUsed = Object.values(userMatches).includes(i);
                        const originalIdx = q.pairs.findIndex(p => p.right === opt);
                        return `<div class="match-item right${isUsed ? ' used' : ''}" 
                            onclick="window.app.selectMatchRight(${i})" data-idx="${i}">
                            <span class="match-num">${i + 1}</span>
                            <span class="match-text">${escapeHtml(opt)}</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>
            ${state.studyMode && !state.showAnswer ? `<button class="btn btn-primary mt-4" style="width:100%" onclick="window.app.checkAnswer()">Check Matches</button>` : ''}
            ${Object.keys(userMatches).length > 0 && !state.showAnswer ? `<button class="btn btn-ghost btn-sm mt-2" onclick="window.app.clearMatches()">Clear All</button>` : ''}
        </div>`;
    }
    
    // Ordering
    if (q.type === 'ordering') {
        const order = ans || q.options.map((_, i) => i);
        return `<div class="options-list">${order.map((oi, pos) => `<div class="option" draggable="true" ondragstart="window.app.dragStart(event,${pos})" ondragover="window.app.dragOver(event)" ondragleave="window.app.dragLeave(event)" ondrop="window.app.drop(event,${pos})" ondragend="window.app.dragEnd(event)"><span class="option-letter">${pos + 1}</span><span class="option-text">${escapeHtml(q.options[oi])}</span><span style="margin-left:auto;cursor:grab">⋮⋮</span></div>`).join('')}</div>${state.studyMode && !state.showAnswer ? `<button class="btn btn-primary mt-4" style="width:100%" onclick="window.app.checkAnswer()">Check</button>` : ''}`;
    }
    
    // Multiple choice (default)
    return `<div class="options-list">${q.options.map((opt, i) => {
        const sel = Array.isArray(ans) && ans.includes(i), correct = state.showAnswer && q.correct.includes(i), wrong = state.showAnswer && sel && !q.correct.includes(i);
        return `<div class="option${sel ? ' selected' : ''}${correct ? ' correct' : ''}${wrong ? ' incorrect' : ''}" onclick="window.app.selectOpt(${i})"><span class="option-letter">${String.fromCharCode(65 + i)}</span><span class="option-text">${escapeHtml(opt)}</span>${correct ? '<span style="margin-left:auto">✓</span>' : ''}</div>`;
    }).join('')}</div>${state.studyMode && !state.showAnswer && q.correct.length > 1 ? `<button class="btn btn-primary mt-4" style="width:100%" onclick="window.app.checkAnswer()">Check</button>` : ''}`;
}

// Store shuffled match options per question to keep consistent
const matchShuffleCache = {};
function shuffleMatchOptions(q, idx) {
    const key = `${idx}-${q.pairs.map(p => p.right).join('|')}`;
    if (!matchShuffleCache[key]) {
        matchShuffleCache[key] = shuffleArray(q.pairs.map(p => p.right));
    }
    return matchShuffleCache[key];
}

function renderDots() {
    const state = getState(), total = state.currentQuiz.questions.length, max = 10;
    let start = total > max ? Math.max(0, Math.min(state.currentQuestionIndex - 4, total - max)) : 0;
    let html = '';
    for (let i = 0; i < Math.min(total, max); i++) {
        const idx = start + i;
        html += `<button class="q-dot${idx === state.currentQuestionIndex ? ' current' : ''}${state.answers[idx] !== null ? ' answered' : ''}${state.flaggedQuestions.has(idx) ? ' flagged' : ''}" onclick="window.app.goToQ(${idx})">${idx + 1}</button>`;
    }
    return html;
}

function formatTime(s) { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`; }

export async function startQuiz(id, opts = {}) {
    // Clear match cache
    Object.keys(matchShuffleCache).forEach(k => delete matchShuffleCache[k]);
    
    showLoading();
    const saved = loadQuizProgress(id);
    if (saved && !opts.fresh && confirm(`Resume from Q${saved.questionIndex + 1}?`)) {
        try {
            const quiz = await getQuiz(id);
            setState({ view: 'quiz', currentQuiz: { id, title: quiz.title, questions: quiz.questions }, currentQuestionIndex: saved.questionIndex, answers: saved.answers, flaggedQuestions: new Set(saved.flagged || []), studyMode: saved.studyMode, timerEnabled: saved.timerEnabled, timeRemaining: saved.timeRemaining, streak: saved.streak || 0, maxStreak: saved.maxStreak || 0, showAnswer: false, selectedMatchLeft: null });
            if (saved.timerEnabled && saved.timeRemaining > 0) startTimer();
            hideLoading(); showToast('Progress restored', 'info'); return;
        } catch { hideLoading(); showToast('Failed to load', 'error'); return; }
    }
    if (saved) clearQuizProgress(id);
    try {
        const quiz = await getQuiz(id);
        let questions = quiz.questions;
        if (opts.shuffle) questions = shuffleArray(questions);
        const answers = questions.map(q => {
            if (q.type === 'ordering') return shuffleArray(q.options.map((_, i) => i));
            if (q.type === 'matching') return {}; // object for matches
            return null;
        });
        setState({ view: 'quiz', currentQuiz: { id, title: quiz.title, questions }, currentQuestionIndex: 0, answers, studyMode: opts.study || false, timerEnabled: opts.timer || false, timerMinutes: opts.minutes || 15, timeRemaining: opts.timer ? (opts.minutes || 15) * 60 : 0, showAnswer: false, flaggedQuestions: new Set(), streak: 0, maxStreak: 0, selectedMatchLeft: null });
        if (opts.timer) startTimer();
        saveQuizProgress(); hideLoading();
    } catch { hideLoading(); showToast('Failed to load', 'error'); }
}

export function selectOpt(i) {
    const state = getState(), q = state.currentQuiz.questions[state.currentQuestionIndex];
    
    // True/False - single select
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
    ans = q.correct.length > 1 ? (ans.includes(i) ? ans.filter(x => x !== i) : [...ans, i]) : [i];
    const newAns = [...state.answers]; newAns[state.currentQuestionIndex] = ans;
    setState({ answers: newAns }); saveQuizProgress();
    if (state.studyMode && q.correct.length === 1) checkAnswer();
}

// Matching handlers
export function selectMatchLeft(i) {
    const state = getState();
    setState({ selectedMatchLeft: state.selectedMatchLeft === i ? null : i });
}

export function selectMatchRight(i) {
    const state = getState();
    if (state.selectedMatchLeft === null) return;
    
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    const rightOptions = shuffleMatchOptions(q, state.currentQuestionIndex);
    const newAns = [...state.answers];
    const matches = { ...(newAns[state.currentQuestionIndex] || {}) };
    
    // Find which original index this shuffled position corresponds to
    const selectedRight = rightOptions[i];
    const originalRightIdx = q.pairs.findIndex(p => p.right === selectedRight);
    
    matches[state.selectedMatchLeft] = originalRightIdx;
    newAns[state.currentQuestionIndex] = matches;
    
    setState({ answers: newAns, selectedMatchLeft: null });
    saveQuizProgress();
    
    // Auto-check if all matched in study mode
    if (state.studyMode && Object.keys(matches).length === q.pairs.length) {
        checkAnswer();
    }
}

export function clearMatches() {
    const state = getState();
    const newAns = [...state.answers];
    newAns[state.currentQuestionIndex] = {};
    setState({ answers: newAns, selectedMatchLeft: null });
    saveQuizProgress();
}

export function checkAnswer() {
    const state = getState(), q = state.currentQuiz.questions[state.currentQuestionIndex], ans = state.answers[state.currentQuestionIndex];
    
    let correct = false;
    if (q.type === 'ordering') {
        correct = JSON.stringify(ans) === JSON.stringify(q.correct);
    } else if (q.type === 'matching') {
        // Check if all matches are correct (key matches value)
        const matches = ans || {};
        correct = q.pairs.every((_, i) => matches[i] === i);
    } else if (q.type === 'truefalse') {
        correct = ans && ans[0] === q.correct[0];
    } else {
        const ansArr = ans || [];
        correct = new Set(ansArr).size === new Set(q.correct).size && ansArr.every(a => q.correct.includes(a));
    }
    
    setState({ showAnswer: true, streak: correct ? state.streak + 1 : 0, maxStreak: Math.max(state.maxStreak, correct ? state.streak + 1 : state.maxStreak) });
    saveQuizProgress(); showToast(correct ? 'Correct! 🎉' : 'Incorrect', correct ? 'success' : 'error');
}

export function nextQ() { const s = getState(); if (s.currentQuestionIndex < s.currentQuiz.questions.length - 1) { setState({ currentQuestionIndex: s.currentQuestionIndex + 1, showAnswer: false, selectedMatchLeft: null }); saveQuizProgress(); } }
export function prevQ() { const s = getState(); if (s.currentQuestionIndex > 0) setState({ currentQuestionIndex: s.currentQuestionIndex - 1, showAnswer: false, selectedMatchLeft: null }); }
export function goToQ(i) { setState({ currentQuestionIndex: i, showAnswer: false, selectedMatchLeft: null }); }
export function toggleFlag() { const s = getState(), f = new Set(s.flaggedQuestions); f.has(s.currentQuestionIndex) ? f.delete(s.currentQuestionIndex) : f.add(s.currentQuestionIndex); setState({ flaggedQuestions: f }); saveQuizProgress(); }
export function exitQuiz() { stopTimer(); saveQuizProgress(); setState({ view: 'library', currentQuiz: null, selectedMatchLeft: null }); showToast('Progress saved', 'info'); }

export async function submitQuiz() {
    stopTimer();
    const state = getState(), score = calcScore(), total = state.currentQuiz.questions.length, pct = Math.round((score / total) * 100);
    await saveAttempt(state.currentQuiz.id, { score, total, percentage: pct, answers: state.answers, study_mode: state.studyMode, timed: state.timerEnabled, max_streak: state.maxStreak });
    clearQuizProgress(state.currentQuiz.id); setState({ view: 'results' });
    if (pct === 100) setTimeout(showConfetti, 100);
}

function calcScore() {
    const s = getState(); let score = 0;
    s.currentQuiz.questions.forEach((q, i) => {
        const a = s.answers[i]; if (!a) return;
        if (q.type === 'ordering') { if (JSON.stringify(a) === JSON.stringify(q.correct)) score++; }
        else if (q.type === 'matching') { if (q.pairs.every((_, j) => a[j] === j)) score++; }
        else if (q.type === 'truefalse') { if (a[0] === q.correct[0]) score++; }
        else if (new Set(a).size === new Set(q.correct).size && a.every(x => q.correct.includes(x))) score++;
    });
    return score;
}

function startTimer() { stopTimer(); timerInterval = setInterval(() => { const s = getState(); if (s.timeRemaining <= 1) { stopTimer(); submitQuiz(); showToast("Time's up!", 'warning'); } else { setState({ timeRemaining: s.timeRemaining - 1 }); const el = document.getElementById('timer'); if (el) { el.textContent = formatTime(s.timeRemaining - 1); if (s.timeRemaining <= 61) el.classList.add('urgent'); } } }, 1000); }
function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

export function dragStart(e, i) { draggedIdx = i; e.target.style.opacity = '0.5'; }
export function dragOver(e) { e.preventDefault(); e.currentTarget.style.background = 'var(--bg-hover)'; }
export function dragLeave(e) { e.currentTarget.style.background = ''; }
export function drop(e, target) { e.preventDefault(); e.currentTarget.style.background = ''; if (draggedIdx !== null && draggedIdx !== target) { const s = getState(), order = [...s.answers[s.currentQuestionIndex]], [item] = order.splice(draggedIdx, 1); order.splice(target, 0, item); const newAns = [...s.answers]; newAns[s.currentQuestionIndex] = order; setState({ answers: newAns }); saveQuizProgress(); } }
export function dragEnd(e) { e.target.style.opacity = '1'; draggedIdx = null; }

export function showQuizOptions(quizId) {
    const state = getState(), quiz = state.quizzes.find(q => q.id === quizId);
    if (!quiz) return;
    const progress = loadQuizProgress(quizId);
    const m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'quiz-opts';
    m.onclick = e => { if (e.target === m) m.remove(); };
    m.innerHTML = `<div class="modal"><div class="modal-header"><h2>Start Quiz</h2><button class="btn btn-icon btn-ghost" onclick="document.getElementById('quiz-opts').remove()">✕</button></div><div class="modal-body">
        <h3 style="margin-bottom:0.5rem">${escapeHtml(quiz.title)}</h3><p class="text-muted mb-4">${quiz.questions?.length || 0} questions</p>
        ${progress ? `<div class="card mb-4" style="background:rgba(245,158,11,0.15);border-color:#f59e0b"><p class="font-medium">⏸ Progress saved</p><p class="text-sm text-muted">Question ${progress.questionIndex + 1}</p></div>` : ''}
        <div class="form-group"><label class="flex items-center gap-3" style="cursor:pointer"><input type="checkbox" id="opt-study" style="width:18px;height:18px"><div><div class="font-medium">📖 Study Mode</div><div class="text-sm text-muted">See answers immediately</div></div></label></div>
        <div class="form-group"><label class="flex items-center gap-3" style="cursor:pointer"><input type="checkbox" id="opt-shuffle" style="width:18px;height:18px"><div><div class="font-medium">🔀 Shuffle</div><div class="text-sm text-muted">Randomize order</div></div></label></div>
        <div class="form-group"><label class="flex items-center gap-3" style="cursor:pointer"><input type="checkbox" id="opt-timer" onchange="document.getElementById('timer-opts').style.display=this.checked?'block':'none'" style="width:18px;height:18px"><div><div class="font-medium">⏱️ Timer</div><div class="text-sm text-muted">Set time limit</div></div></label></div>
        <div id="timer-opts" style="display:none;margin-left:2rem"><select id="opt-mins" class="input" style="width:auto"><option value="5">5 min</option><option value="10">10 min</option><option value="15" selected>15 min</option><option value="30">30 min</option><option value="60">60 min</option></select></div>
    </div><div class="modal-footer">${progress ? `<button class="btn btn-secondary flex-1" onclick="window.app.launchQuiz(${quizId},true)">Start Fresh</button>` : ''}<button class="btn btn-primary flex-1" onclick="window.app.launchQuiz(${quizId},false)">${progress ? 'Resume' : 'Start'}</button></div></div>`;
    document.body.appendChild(m);
}

export function launchQuiz(id, fresh) {
    const study = document.getElementById('opt-study')?.checked, shuffle = document.getElementById('opt-shuffle')?.checked, timer = document.getElementById('opt-timer')?.checked, mins = parseInt(document.getElementById('opt-mins')?.value || '15');
    document.getElementById('quiz-opts')?.remove();
    startQuiz(id, { study, shuffle, timer, minutes: mins, fresh });
}
