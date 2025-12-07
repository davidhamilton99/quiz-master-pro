function calculateScore() { let s = 0; state.currentQuiz.questions.forEach((q, i) => { const ua = state.answers[i]; if (!ua) return; if (q.type === 'choice') { const as = new Set(ua), cs = new Set(q.correct); if (as.size === cs.size && [...as].every(a => cs.has(a))) s++; } else if (q.type === 'ordering' && JSON.stringify(ua) === JSON.stringify(q.correct)) s++; }); return s; }
        async function submitQuiz() {
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

function renderResults() {
            const score = calculateScore(), total = state.currentQuiz.questions.length, pct = Math.round((score / total) * 100);
            let msg = '', emoji = '';
            if (pct >= 90) { msg = 'Outstanding!'; emoji = '🏆'; }
            else if (pct >= 80) { msg = 'Great job!'; emoji = '🌟'; }
            else if (pct >= 70) { msg = 'Good work!'; emoji = '👍'; }
            else if (pct >= 60) { msg = 'Not bad!'; emoji = '💪'; }
            else { msg = 'Keep practicing!'; emoji = '📚'; }
            
            return `<div style="min-height:100vh;background:var(--paper)"><div class="container-narrow" style="padding:4rem 1.5rem"><div class="results-hero"><div class="results-score"><div class="results-score-value">${pct}%</div><div class="results-score-label">${score} of ${total}</div></div><h1 class="results-message">${emoji} ${msg}</h1><p class="text-muted" style="margin-bottom:2rem">${escapeHtml(state.currentQuiz.title)}</p>${state.maxStreak > 1 ? `<div class="badge badge-accent" style="font-size:1rem;padding:0.5rem 1.5rem;margin-bottom:2rem">🔥 Best streak: ${state.maxStreak}</div>` : ''}</div><div class="grid grid-3 gap-md" style="margin-bottom:2rem"><div class="stat-card" style="text-align:center"><div class="stat-value" style="color:var(--success)">${score}</div><div class="stat-label">Correct</div></div><div class="stat-card" style="text-align:center"><div class="stat-value" style="color:var(--error)">${total - score}</div><div class="stat-label">Incorrect</div></div><div class="stat-card" style="text-align:center"><div class="stat-value">${state.flaggedQuestions.size}</div><div class="stat-label">Flagged</div></div></div><div class="flex flex-col gap-md"><button onclick="state.view='review';render()" class="btn btn-primary btn-lg" style="width:100%">📝 Review Answers</button><button onclick="startQuiz(${state.currentQuiz.id},{studyMode:false})" class="btn btn-accent btn-lg" style="width:100%">🔄 Try Again</button><button onclick="state.view='library';render()" class="btn btn-ghost btn-lg" style="width:100%">← Library</button></div></div></div>`;
        }
        
        function renderReview() {
            const html = state.currentQuiz.questions.map((q, i) => {
                const ua = state.answers[i] || [];
                let correct = false;
                if (q.type === 'choice') { const as = new Set(ua), cs = new Set(q.correct); correct = as.size === cs.size && [...as].every(a => cs.has(a)); }
                else if (q.type === 'ordering') correct = JSON.stringify(ua) === JSON.stringify(q.correct);
                
                return `<div class="card" style="padding:1.5rem;margin-bottom:1rem;${correct ? '' : 'border-left:4px solid var(--error)'}"><div class="flex items-center gap-md" style="margin-bottom:1rem"><span style="font-size:1.5rem">${correct ? '✅' : '❌'}</span><span class="badge ${correct ? 'badge-success' : 'badge-error'}">${correct ? 'Correct' : 'Incorrect'}</span><span class="text-sm text-muted">Q${i + 1}</span></div><h3 style="margin-bottom:1rem">${escapeHtml(q.question)}</h3>${q.code ? `<div class="code-block" style="margin-bottom:1rem"><div class="code-header"><div class="code-dot" style="background:#ef4444"></div><div class="code-dot" style="background:#f59e0b"></div><div class="code-dot" style="background:#22c55e"></div></div><div class="code-body">${escapeHtml(q.code)}</div></div>` : ''}<div class="flex flex-col gap-sm" style="margin-bottom:1rem">${q.type === 'choice' ? q.options.map((opt, j) => { const isU = ua.includes(j), isC = q.correct.includes(j); let cls = 'review-option'; if (isC) cls += ' review-correct'; if (isU && !isC) cls += ' review-incorrect'; let badge = ''; if (isC) badge = '<span class="badge badge-success">Correct</span>'; if (isU && !isC) badge = '<span class="badge badge-error">Your answer</span>'; if (isU && isC) badge = '<span class="badge badge-success">Your answer ✓</span>'; return `<div class="${cls}"><span class="font-semibold">${String.fromCharCode(65 + j)}.</span> ${escapeHtml(opt)} <span style="float:right">${badge}</span></div>`; }).join('') : `<div class="review-option"><p class="text-sm text-muted" style="margin-bottom:0.5rem">Correct order:</p>${q.correct.map((ci, pos) => `<div style="padding:0.25rem 0">${pos + 1}. ${escapeHtml(q.options[ci])} ${ua[pos] === ci ? '✓' : '❌'}</div>`).join('')}</div>`}</div>${q.explanation ? `<div class="explanation-box"><p class="font-semibold" style="margin-bottom:0.25rem">💡 Explanation</p><p>${escapeHtml(q.explanation)}</p></div>` : ''}</div>`;
            }).join('');
            
            return `<nav class="navbar"><div class="container"><div class="navbar-inner"><button onclick="state.view='results';render()" class="btn btn-ghost">← Results</button><h2 style="font-size:1.125rem">Review</h2><div></div></div></div></nav><main style="padding:2rem 0 4rem"><div class="container-narrow">${html}<div class="flex gap-md" style="margin-top:2rem"><button onclick="startQuiz(${state.currentQuiz.id},{studyMode:false})" class="btn btn-accent flex-1">Try Again</button><button onclick="state.view='library';render()" class="btn btn-ghost flex-1">Library</button></div></div></main>`;
        }
        
        // Initialize
if (loadAuth()) { 
    state.view = 'library'; 
    loadQuizzes().then(() => {
        // Check for saved quiz progress - now handles multiple quizzes
        const allProgress = getAllInProgressQuizzes();
        
        // Clean up progress for deleted quizzes
        allProgress.forEach(progress => {
            const quizExists = state.quizzes.some(q => q.id === progress.quizId);
            if (!quizExists) {
                clearQuizProgress(progress.quizId);
            }
        });
        
        render();
    }); 
}

function renderReview() {
            const html = state.currentQuiz.questions.map((q, i) => {
                const ua = state.answers[i] || [];
                let correct = false;
                if (q.type === 'choice') { const as = new Set(ua), cs = new Set(q.correct); correct = as.size === cs.size && [...as].every(a => cs.has(a)); }
                else if (q.type === 'ordering') correct = JSON.stringify(ua) === JSON.stringify(q.correct);
                
                return `<div class="card" style="padding:1.5rem;margin-bottom:1rem;${correct ? '' : 'border-left:4px solid var(--error)'}"><div class="flex items-center gap-md" style="margin-bottom:1rem"><span style="font-size:1.5rem">${correct ? '✅' : '❌'}</span><span class="badge ${correct ? 'badge-success' : 'badge-error'}">${correct ? 'Correct' : 'Incorrect'}</span><span class="text-sm text-muted">Q${i + 1}</span></div><h3 style="margin-bottom:1rem">${escapeHtml(q.question)}</h3>${q.code ? `<div class="code-block" style="margin-bottom:1rem"><div class="code-header"><div class="code-dot" style="background:#ef4444"></div><div class="code-dot" style="background:#f59e0b"></div><div class="code-dot" style="background:#22c55e"></div></div><div class="code-body">${escapeHtml(q.code)}</div></div>` : ''}<div class="flex flex-col gap-sm" style="margin-bottom:1rem">${q.type === 'choice' ? q.options.map((opt, j) => { const isU = ua.includes(j), isC = q.correct.includes(j); let cls = 'review-option'; if (isC) cls += ' review-correct'; if (isU && !isC) cls += ' review-incorrect'; let badge = ''; if (isC) badge = '<span class="badge badge-success">Correct</span>'; if (isU && !isC) badge = '<span class="badge badge-error">Your answer</span>'; if (isU && isC) badge = '<span class="badge badge-success">Your answer ✓</span>'; return `<div class="${cls}"><span class="font-semibold">${String.fromCharCode(65 + j)}.</span> ${escapeHtml(opt)} <span style="float:right">${badge}</span></div>`; }).join('') : `<div class="review-option"><p class="text-sm text-muted" style="margin-bottom:0.5rem">Correct order:</p>${q.correct.map((ci, pos) => `<div style="padding:0.25rem 0">${pos + 1}. ${escapeHtml(q.options[ci])} ${ua[pos] === ci ? '✓' : '❌'}</div>`).join('')}</div>`}</div>${q.explanation ? `<div class="explanation-box"><p class="font-semibold" style="margin-bottom:0.25rem">💡 Explanation</p><p>${escapeHtml(q.explanation)}</p></div>` : ''}</div>`;
            }).join('');
            
            return `<nav class="navbar"><div class="container"><div class="navbar-inner"><button onclick="state.view='results';render()" class="btn btn-ghost">← Results</button><h2 style="font-size:1.125rem">Review</h2><div></div></div></div></nav><main style="padding:2rem 0 4rem"><div class="container-narrow">${html}<div class="flex gap-md" style="margin-top:2rem"><button onclick="startQuiz(${state.currentQuiz.id},{studyMode:false})" class="btn btn-accent flex-1">Try Again</button><button onclick="state.view='library';render()" class="btn btn-ghost flex-1">Library</button></div></div></main>`;
        }
        
        // Initialize
if (loadAuth()) { 
    state.view = 'library'; 
    loadQuizzes().then(() => {
        // Check for saved quiz progress - now handles multiple quizzes
        const allProgress = getAllInProgressQuizzes();
        
        // Clean up progress for deleted quizzes
        allProgress.forEach(progress => {
            const quizExists = state.quizzes.some(q => q.id === progress.quizId);
            if (!quizExists) {
                clearQuizProgress(progress.quizId);
            }
        });
        
        render();
    }); 
}