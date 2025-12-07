function render() {
            let html = '';
            if (!state.isAuthenticated) html = renderAuth();
            else { switch (state.view) { case 'library': html = renderLibrary(); break; case 'create': html = renderCreate(); break; case 'quiz': html = renderQuiz(); break; case 'results': html = renderResults(); break; case 'review': html = renderReview(); break; default: html = renderLibrary(); } }
            document.getElementById('app').innerHTML = html;
            bindEvents();
        }
        
        function bindEvents() {
            if (state.view === 'create' && state.isAuthenticated) {
                setTimeout(() => {
                    const ti = document.getElementById('quizTitle'), ci = document.getElementById('quizCategory'), di = document.getElementById('quizData');
                    if (ti) { ti.value = state.quizTitle; ti.addEventListener('input', e => state.quizTitle = e.target.value); }
                    if (ci) { ci.value = state.quizCategory; ci.addEventListener('input', e => state.quizCategory = e.target.value); }
                    if (di) { di.value = state.quizData; di.addEventListener('input', e => state.quizData = e.target.value); }
                }, 0);
            }
            if (state.view === 'quiz' && state.currentQuiz?.questions[state.currentQuestionIndex]?.type === 'ordering') {
                setTimeout(() => {
                    document.querySelectorAll('.draggable-item').forEach((item, i) => {
                        item.addEventListener('dragstart', e => handleDragStart(e, i));
                        item.addEventListener('dragover', handleDragOver);
                        item.addEventListener('dragleave', handleDragLeave);
                        item.addEventListener('drop', e => handleDrop(e, i));
                        item.addEventListener('dragend', handleDragEnd);
                    });
                }, 0);
            }
            if (state.view === 'quiz' && state.timerEnabled) updateTimerDisplay();
        }
        function saveQuizProgress() {
    if (!state.currentQuiz) return;
    
    const progress = {
        quizId: state.currentQuiz.id,
        quizTitle: state.currentQuiz.title,
        questions: state.currentQuiz.questions,
        currentQuestionIndex: state.currentQuestionIndex,
        answers: state.answers,
        studyMode: state.studyMode,
        showAnswer: state.showAnswer,
        flaggedQuestions: Array.from(state.flaggedQuestions),
        timerEnabled: state.timerEnabled,
        timerMinutes: state.timerMinutes,
        timeRemaining: state.timeRemaining || 0,
        startTime: state.startTime || Date.now(),
        streak: state.streak || 0,
        maxStreak: state.maxStreak || 0,
        savedAt: Date.now()
    };
    
    try {
        const stored = localStorage.getItem('quiz-progress-all');
        const allProgress = stored ? JSON.parse(stored) : {};
        
        allProgress[state.currentQuiz.id] = progress;
        
        // Clean up old progress (older than 7 days)
        Object.keys(allProgress).forEach(qid => {
            const daysSinceStart = (Date.now() - (allProgress[qid].startTime || Date.now())) / (1000 * 60 * 60 * 24);
            if (daysSinceStart > 7) {
                delete allProgress[qid];
            }
        });
        
        localStorage.setItem('quiz-progress-all', JSON.stringify(allProgress));
    } catch (e) {
        console.error('Failed to save quiz progress:', e);
    }
}

function bindEvents() {
            if (state.view === 'create' && state.isAuthenticated) {
                setTimeout(() => {
                    const ti = document.getElementById('quizTitle'), ci = document.getElementById('quizCategory'), di = document.getElementById('quizData');
                    if (ti) { ti.value = state.quizTitle; ti.addEventListener('input', e => state.quizTitle = e.target.value); }
                    if (ci) { ci.value = state.quizCategory; ci.addEventListener('input', e => state.quizCategory = e.target.value); }
                    if (di) { di.value = state.quizData; di.addEventListener('input', e => state.quizData = e.target.value); }
                }, 0);
            }
            if (state.view === 'quiz' && state.currentQuiz?.questions[state.currentQuestionIndex]?.type === 'ordering') {
                setTimeout(() => {
                    document.querySelectorAll('.draggable-item').forEach((item, i) => {
                        item.addEventListener('dragstart', e => handleDragStart(e, i));
                        item.addEventListener('dragover', handleDragOver);
                        item.addEventListener('dragleave', handleDragLeave);
                        item.addEventListener('drop', e => handleDrop(e, i));
                        item.addEventListener('dragend', handleDragEnd);
                    });
                }, 0);
            }
            if (state.view === 'quiz' && state.timerEnabled) updateTimerDisplay();
        }
        function saveQuizProgress() {
    if (!state.currentQuiz) return;
    
    const progress = {
        quizId: state.currentQuiz.id,
        quizTitle: state.currentQuiz.title,
        questions: state.currentQuiz.questions,
        currentQuestionIndex: state.currentQuestionIndex,
        answers: state.answers,
        studyMode: state.studyMode,
        showAnswer: state.showAnswer,
        flaggedQuestions: Array.from(state.flaggedQuestions),
        timerEnabled: state.timerEnabled,
        timerMinutes: state.timerMinutes,
        timeRemaining: state.timeRemaining || 0,
        startTime: state.startTime || Date.now(),
        streak: state.streak || 0,
        maxStreak: state.maxStreak || 0,
        savedAt: Date.now()
    };
    
    try {
        const stored = localStorage.getItem('quiz-progress-all');
        const allProgress = stored ? JSON.parse(stored) : {};
        
        allProgress[state.currentQuiz.id] = progress;
        
        // Clean up old progress (older than 7 days)
        Object.keys(allProgress).forEach(qid => {
            const daysSinceStart = (Date.now() - (allProgress[qid].startTime || Date.now())) / (1000 * 60 * 60 * 24);
            if (daysSinceStart > 7) {
                delete allProgress[qid];
            }
        });
        
        localStorage.setItem('quiz-progress-all', JSON.stringify(allProgress));
    } catch (e) {
        console.error('Failed to save quiz progress:', e);
    }
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