let draggedIndex = null;

function startQuiz(id, opts = {}) {
    try {
        // CHECK FOR EXISTING PROGRESS FIRST
        if (!opts.forceNew) {
            const existingProgress = loadQuizProgress(id);
            if (existingProgress) {
                showResumePrompt(existingProgress);
                return;
            }
        }
        
        const d = await apiCall(`/quizzes/${id}`);
        const qd = d.quiz || d;
        let qs = qd.questions;
        if (opts.shuffleQuestions) qs = shuffleArray(qs);
        
        state.currentQuiz = { id, title: qd.title, questions: qs };
        state.currentQuestionIndex = 0;
        state.answers = qs.map(q => q.type === 'ordering' ? shuffleArray(q.options.map((_, i) => i)) : null);
        state.studyMode = opts.studyMode || false;
        state.timerEnabled = opts.timerEnabled || false;
        state.timerMinutes = opts.timerMinutes || 15;
        state.showAnswer = false;
        state.flaggedQuestions = new Set();
        state.timeExpired = false;
        state.streak = 0;
        state.maxStreak = 0;
        state.startTime = Date.now();
        
        if (state.timerEnabled) {
            state.timeRemaining = state.timerMinutes * 60;
            startTimer();
        }
        
        state.view = 'quiz';
        saveQuizProgress();
        render();
    } catch (e) {
        showToast('Failed to load quiz', 'error');
    }
}

function startTimer() { stopTimer(); state.timerInterval = setInterval(() => { state.timeRemaining--; updateTimerDisplay(); if (state.timeRemaining <= 0) { state.timeExpired = true; stopTimer(); submitQuiz(); } }, 1000); }
        function stopTimer() { if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; } }
        function updateTimerDisplay() { const el = document.getElementById('timer'); if (el) { el.textContent = `${Math.floor(state.timeRemaining / 60)}:${(state.timeRemaining % 60).toString().padStart(2, '0')}`; if (state.timeRemaining <= 60) el.classList.add('timer-urgent'); } }
        
        function selectAnswer(idx) {
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    if (q.type === 'choice') {
        if (q.correct.length > 1) { const c = state.answers[state.currentQuestionIndex] || []; state.answers[state.currentQuestionIndex] = c.includes(idx) ? c.filter(i => i !== idx) : [...c, idx]; }
        else state.answers[state.currentQuestionIndex] = [idx];
    }
    saveQuizProgress(); // Auto-save
    if (state.studyMode && q.correct.length === 1) checkStudyAnswer();
    render();
}

function stopTimer() { if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; } }
        function updateTimerDisplay() { const el = document.getElementById('timer'); if (el) { el.textContent = `${Math.floor(state.timeRemaining / 60)}:${(state.timeRemaining % 60).toString().padStart(2, '0')}`; if (state.timeRemaining <= 60) el.classList.add('timer-urgent'); } }
        
        function selectAnswer(idx) {
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    if (q.type === 'choice') {
        if (q.correct.length > 1) { const c = state.answers[state.currentQuestionIndex] || []; state.answers[state.currentQuestionIndex] = c.includes(idx) ? c.filter(i => i !== idx) : [...c, idx]; }
        else state.answers[state.currentQuestionIndex] = [idx];
    }
    saveQuizProgress(); // Auto-save
    if (state.studyMode && q.correct.length === 1) checkStudyAnswer();
    render();
}

function updateTimerDisplay() { const el = document.getElementById('timer'); if (el) { el.textContent = `${Math.floor(state.timeRemaining / 60)}:${(state.timeRemaining % 60).toString().padStart(2, '0')}`; if (state.timeRemaining <= 60) el.classList.add('timer-urgent'); } }
        
        function selectAnswer(idx) {
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    if (q.type === 'choice') {
        if (q.correct.length > 1) { const c = state.answers[state.currentQuestionIndex] || []; state.answers[state.currentQuestionIndex] = c.includes(idx) ? c.filter(i => i !== idx) : [...c, idx]; }
        else state.answers[state.currentQuestionIndex] = [idx];
    }
    saveQuizProgress(); // Auto-save
    if (state.studyMode && q.correct.length === 1) checkStudyAnswer();
    render();
}

function renderQuiz() {
            const q = state.currentQuiz.questions[state.currentQuestionIndex];
            const prog = ((state.currentQuestionIndex + 1) / state.currentQuiz.questions.length) * 100;
            const flagged = state.flaggedQuestions.has(state.currentQuestionIndex);
            const ua = state.answers[state.currentQuestionIndex] || [];
            let isCorrect = false;
            if (state.studyMode && state.showAnswer) {
                if (q.type === 'choice') { const as = new Set(ua), cs = new Set(q.correct); isCorrect = as.size === cs.size && [...as].every(a => cs.has(a)); }
                else if (q.type === 'ordering') isCorrect = JSON.stringify(ua) === JSON.stringify(q.correct);
            }
            
            let optHTML = '';
            if (q.type === 'ordering') {
                const order = state.answers[state.currentQuestionIndex] || q.options.map((_, i) => i);
                optHTML = `<div class="flex flex-col gap-sm">${order.map((oi, pos) => `<div draggable="true" class="draggable-item ${state.studyMode && state.showAnswer ? (q.correct[pos] === oi ? 'correct' : 'incorrect') : ''}" data-position="${pos}"><span class="drag-handle">☰</span><span class="drag-number">${pos + 1}</span><span style="flex:1">${escapeHtml(q.options[oi])}</span></div>`).join('')}</div><p class="text-sm text-muted" style="margin-top:1rem">${state.studyMode && !state.showAnswer ? '💡 Drag to reorder, then click Check Answer' : '💡 Drag to reorder'}</p>`;
            } else {
                optHTML = q.options.map((opt, i) => {
                    const sel = ua.includes(i), corr = q.correct.includes(i);
                    let cls = 'option-btn';
                    if (state.studyMode && state.showAnswer) { if (corr) cls += ' correct'; else if (sel) cls += ' incorrect'; }
                    else if (sel) cls += ' selected';
                    return `<button class="${cls}" onclick="selectAnswer(${i})" ${state.studyMode && state.showAnswer ? 'disabled' : ''}><span class="option-letter">${String.fromCharCode(65 + i)}</span><span style="flex:1">${escapeHtml(opt)}</span>${state.studyMode && state.showAnswer && corr ? '<span class="badge badge-success">✓</span>' : ''}${state.studyMode && state.showAnswer && sel && !corr ? '<span class="badge badge-error">✗</span>' : ''}</button>`;
                }).join('');
            }
            
            return `<div style="min-height:100vh;background:var(--paper)"><header class="quiz-header"><div class="container"><div class="flex justify-between items-center"><div class="flex items-center gap-md"><div class="flex gap-sm">
    <button onclick="saveAndExitQuiz()" class="btn btn-ghost btn-sm">💾 Save & Exit</button>
</div><div><h2 style="font-size:1rem;margin-bottom:2px">${escapeHtml(state.currentQuiz.title)}</h2><p class="text-xs text-muted">${state.studyMode ? '📖 Study' : '🎯 Quiz'}</p></div></div><div class="flex items-center gap-sm">${state.timerEnabled ? `<div class="badge" style="font-family:monospace;font-size:1rem;padding:0.5rem 1rem">⏱️ <span id="timer">${Math.floor(state.timeRemaining / 60)}:${(state.timeRemaining % 60).toString().padStart(2, '0')}</span></div>` : ''}${state.studyMode && state.streak > 0 ? `<div class="streak-badge">🔥 ${state.streak}</div>` : ''}<button onclick="toggleFlag()" class="btn btn-icon ${flagged ? 'btn-accent' : 'btn-ghost'}">${flagged ? '🚩' : '⚑'}</button></div></div></div></header>
            <div class="quiz-progress-section"><div class="container"><div class="flex justify-between items-center" style="margin-bottom:0.5rem"><span class="text-sm text-muted">Question ${state.currentQuestionIndex + 1} of ${state.currentQuiz.questions.length}</span><span class="text-sm font-semibold" style="color:var(--accent)">${Math.round(prog)}%</span></div><div class="progress-bar"><div class="progress-fill" style="width:${prog}%"></div></div></div></div>
            <div class="quiz-content"><div class="container-narrow">${state.studyMode && state.showAnswer ? `<div class="feedback-banner ${isCorrect ? 'correct' : 'incorrect'}" style="margin-bottom:1.5rem"><span style="font-size:1.25rem">${isCorrect ? '✓' : '✗'}</span><span>${isCorrect ? 'Correct!' : 'Incorrect'}</span>${isCorrect && state.streak > 1 ? `<span class="streak-badge" style="margin-left:auto">🔥 ${state.streak}</span>` : ''}</div>` : ''}
            <div class="card" style="padding:2rem;margin-bottom:1.5rem"><div class="flex items-start gap-md" style="margin-bottom:2rem"><div class="question-number">${state.currentQuestionIndex + 1}</div><h2 class="question-text">${escapeHtml(q.question)}</h2></div>${q.code ? `<div class="code-block" style="margin-bottom:1.5rem"><div class="code-header"><div class="code-dot" style="background:#ef4444"></div><div class="code-dot" style="background:#f59e0b"></div><div class="code-dot" style="background:#22c55e"></div><span class="text-xs" style="margin-left:0.5rem;opacity:0.7">Code</span></div><div class="code-body">${escapeHtml(q.code)}</div></div>` : ''}${q.image ? `<img src="${escapeHtml(q.image)}" alt="Question image" style="max-width:100%;max-height:300px;border-radius:var(--radius-md);margin-bottom:1.5rem">` : ''}${q.correct.length > 1 && q.type === 'choice' ? `<div class="badge badge-accent" style="margin-bottom:1rem">Select all that apply (${q.correct.length} answers)</div>` : ''}<div class="flex flex-col gap-sm">${optHTML}</div>${state.studyMode && !state.showAnswer && (q.correct.length > 1 || q.type === 'ordering') ? `<button onclick="checkStudyAnswer();render()" class="btn btn-accent" style="margin-top:1.5rem;width:100%">Check Answer</button>` : ''}${state.studyMode && state.showAnswer && q.explanation ? `<div class="explanation-box" style="margin-top:1.5rem"><p class="font-semibold" style="margin-bottom:0.25rem">💡 Explanation</p><p>${escapeHtml(q.explanation)}</p></div>` : ''}</div></div></div>
            <footer class="quiz-footer"><div class="container"><div class="flex justify-between items-center gap-md"><button onclick="prevQuestion()" class="btn btn-ghost" ${state.currentQuestionIndex === 0 ? 'disabled' : ''}>← Prev</button><div class="flex gap-xs">${Array.from({length: Math.min(state.currentQuiz.questions.length, 10)}, (_, i) => { const idx = state.currentQuiz.questions.length <= 10 ? i : Math.max(0, Math.min(state.currentQuestionIndex - 4, state.currentQuiz.questions.length - 10)) + i; const cur = idx === state.currentQuestionIndex, ans = state.answers[idx] != null, fl = state.flaggedQuestions.has(idx); return `<button onclick="state.currentQuestionIndex=${idx};state.showAnswer=false;render()" class="btn btn-icon btn-sm" style="width:32px;height:32px;font-size:0.75rem;background:${cur ? 'var(--accent)' : ans ? 'var(--cream)' : 'transparent'};color:${cur ? 'white' : 'var(--ink)'};border:${fl ? '2px solid var(--accent)' : '1px solid var(--cream)'}">${idx + 1}</button>`; }).join('')}</div>${state.currentQuestionIndex === state.currentQuiz.questions.length - 1 ? `<button onclick="submitQuiz()" class="btn btn-accent">Submit</button>` : `<button onclick="nextQuestion()" class="btn btn-primary">Next →</button>`}</div></div></footer></div>`;
        }
        function saveAndExitQuiz() {
    saveQuizProgress();
    stopTimer();
    showToast('Progress saved!', 'success');
    state.view = 'library';
    state.currentQuiz = null;
    render();
}

function selectAnswer(idx) {
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    if (q.type === 'choice') {
        if (q.correct.length > 1) { const c = state.answers[state.currentQuestionIndex] || []; state.answers[state.currentQuestionIndex] = c.includes(idx) ? c.filter(i => i !== idx) : [...c, idx]; }
        else state.answers[state.currentQuestionIndex] = [idx];
    }
    saveQuizProgress(); // Auto-save
    if (state.studyMode && q.correct.length === 1) checkStudyAnswer();
    render();
}

function checkStudyAnswer() {
    const q = state.currentQuiz.questions[state.currentQuestionIndex], ua = state.answers[state.currentQuestionIndex] || [];
    let correct = false;
    if (q.type === 'choice') { const as = new Set(ua), cs = new Set(q.correct); correct = as.size === cs.size && [...as].every(a => cs.has(a)); }
    else if (q.type === 'ordering') correct = JSON.stringify(ua) === JSON.stringify(q.correct);
    if (correct) { state.streak++; state.maxStreak = Math.max(state.maxStreak, state.streak); } else state.streak = 0;
    state.showAnswer = true;
    saveQuizProgress(); // Auto-save
}

function nextQuestion() { 
    if (state.currentQuestionIndex < state.currentQuiz.questions.length - 1) { 
        state.currentQuestionIndex++; 
        state.showAnswer = false; 
        saveQuizProgress(); // Auto-save
        render(); 
    } 
}

function prevQuestion() { 
    if (state.currentQuestionIndex > 0) { 
        state.currentQuestionIndex--; 
        state.showAnswer = false; 
        saveQuizProgress(); // Auto-save
        render(); 
    } 
}

function toggleFlag() { 
    const i = state.currentQuestionIndex; 
    state.flaggedQuestions.has(i) ? state.flaggedQuestions.delete(i) : state.flaggedQuestions.add(i); 
    saveQuizProgress(); // Auto-save
    render(); 
}

function submitQuiz() {
    stopTimer(); 
    const score = calculateScore(), total = state.currentQuiz.questions.length, pct = Math.round((score / total) * 100);
    try { 
        await apiCall(`/quizzes/${state.currentQuiz.id}/attempts`, { 
            method: 'POST', 
            body: JSON.stringify({ 
                score, total, percentage: pct, answers: state.answers, 
                study_mode: state.studyMode, timed: state.timerEnabled, 
                max_streak: state.maxStreak, 
                time_taken: state.timerEnabled ? (state.timerMinutes * 60 - state.timeRemaining) : null 
            }) 
        }); 
    } catch (e) { 
        showToast('Failed to save results', 'error'); 
    }
    clearQuizProgress(); // Clear saved progress
    state.view = 'results'; 
    render();
}

function saveAndExitQuiz() {
    saveQuizProgress();
    stopTimer();
    showToast('Progress saved!', 'success');
    state.view = 'library';
    state.currentQuiz = null;
    render();
}

function handleDragStart(e, i) { draggedIndex = i; e.target.classList.add('dragging'); }
        function handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
        function handleDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
        function handleDrop(e, ti) { 
    e.preventDefault(); 
    e.currentTarget.classList.remove('drag-over'); 
    if (draggedIndex !== null && draggedIndex !== ti) { 
        const a = [...state.answers[state.currentQuestionIndex]]; 
        const [di] = a.splice(draggedIndex, 1); 
        a.splice(ti, 0, di); 
        state.answers[state.currentQuestionIndex] = a; 
        saveQuizProgress(); // Auto-save
        if (state.studyMode) checkStudyAnswer(); 
        render(); 
    } 
}

function handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
        function handleDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
        function handleDrop(e, ti) { 
    e.preventDefault(); 
    e.currentTarget.classList.remove('drag-over'); 
    if (draggedIndex !== null && draggedIndex !== ti) { 
        const a = [...state.answers[state.currentQuestionIndex]]; 
        const [di] = a.splice(draggedIndex, 1); 
        a.splice(ti, 0, di); 
        state.answers[state.currentQuestionIndex] = a; 
        saveQuizProgress(); // Auto-save
        if (state.studyMode) checkStudyAnswer(); 
        render(); 
    } 
}

function handleDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
        function handleDrop(e, ti) { 
    e.preventDefault(); 
    e.currentTarget.classList.remove('drag-over'); 
    if (draggedIndex !== null && draggedIndex !== ti) { 
        const a = [...state.answers[state.currentQuestionIndex]]; 
        const [di] = a.splice(draggedIndex, 1); 
        a.splice(ti, 0, di); 
        state.answers[state.currentQuestionIndex] = a; 
        saveQuizProgress(); // Auto-save
        if (state.studyMode) checkStudyAnswer(); 
        render(); 
    } 
}

function handleDrop(e, ti) { 
    e.preventDefault(); 
    e.currentTarget.classList.remove('drag-over'); 
    if (draggedIndex !== null && draggedIndex !== ti) { 
        const a = [...state.answers[state.currentQuestionIndex]]; 
        const [di] = a.splice(draggedIndex, 1); 
        a.splice(ti, 0, di); 
        state.answers[state.currentQuestionIndex] = a; 
        saveQuizProgress(); // Auto-save
        if (state.studyMode) checkStudyAnswer(); 
        render(); 
    } 
}

function handleDragEnd(e) { e.target.classList.remove('dragging'); draggedIndex = null; }
        
        async function saveQuiz() {
    const title = state.quizTitle.trim();
    const data = state.quizData.trim();
    
    if (!title) { 
        showToast('Please enter a title', 'warning'); 
        return; 
    }
    if (!data) { 
        showToast('Please enter questions', 'warning'); 
        return; 
    }
    
    try {
        const qs = parseQuizData(data);
        if (qs.length === 0) { 
            showToast('Could not parse any questions. Check format.', 'error'); 
            return; 
        }
        
        // Validate each question
        const invalid = qs.find((q, i) => {
            if (q.type === 'choice' && q.correct.length === 0) return true;
            if (q.type === 'ordering' && q.correct.length !== q.options.length) return true;
            if (q.options.length < 2) return true;
            return false;
        });
        
        if (invalid) {
            showToast('Some questions are invalid (need correct answers & 2+ options)', 'error');
            return;
        }
        
        const payload = { 
            title: state.quizTitle, 
            questions: qs, 
            description: state.quizCategory || '', 
            color: getRandomColor(), 
            is_public: false 
        };
        
        if (state.editingQuizId) { 
            await apiCall(`/quizzes/${state.editingQuizId}`, { 
                method: 'PUT', 
                body: JSON.stringify(payload) 
            }); 
            showToast('Quiz updated!', 'success'); 
        } else { 
            await apiCall('/quizzes', { 
                method: 'POST', 
                body: JSON.stringify(payload) 
            }); 
            showToast('Quiz created!', 'success'); 
        }
        
        state.quizTitle = ''; 
        state.quizData = ''; 
        state.quizCategory = ''; 
        state.editingQuizId = null; 
        state.view = 'library'; 
        await loadQuizzes(); 
        render();
    } catch (e) { 
        showToast('Failed to save quiz', 'error'); 
    }
}