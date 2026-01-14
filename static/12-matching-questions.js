/* ============================================
   QUIZ MASTER PRO - MODULE 12: MATCHING QUESTIONS
   Click-based matching, drag-drop, rendering
   ============================================ */

function selectMatchAnswer(pairIndex, targetId) {
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    if (!state.answers[state.currentQuestionIndex]) {
        state.answers[state.currentQuestionIndex] = {};
    }
    
    const pairId = q.matchPairs[pairIndex].id;
    
    // Toggle selection - if already selected, unselect
    if (state.answers[state.currentQuestionIndex][pairId] === targetId) {
        delete state.answers[state.currentQuestionIndex][pairId];
    } else {
        // Store the match: { pairId: targetId }
        state.answers[state.currentQuestionIndex][pairId] = targetId;
    }
    
    saveQuizProgress();
    
    // Check if all pairs are matched and we're in study mode
    if (state.studyMode && Object.keys(state.answers[state.currentQuestionIndex]).length === q.matchPairs.length) {
        checkStudyAnswer();
    }
    
    render();
}

// Click-based matching state
let matchingSelectedPair = null;

function handleMatchPairClick(pairId, questionIndex) {
    if (state.showAnswer) return;
    
    const q = state.currentQuiz.questions[questionIndex];
    const userAnswers = state.answers[questionIndex] || {};
    
    // If this pair already has a match, clicking it clears the match
    if (userAnswers[pairId]) {
        delete state.answers[questionIndex][pairId];
        matchingSelectedPair = null;
        saveQuizProgress();
        render();
        return;
    }
    
    // Toggle selection
    if (matchingSelectedPair === pairId) {
        matchingSelectedPair = null;
    } else {
        matchingSelectedPair = pairId;
    }
    render();
}

function handleMatchTargetClick(targetId, questionIndex) {
    if (state.showAnswer) return;
    
    const q = state.currentQuiz.questions[questionIndex];
    const userAnswers = state.answers[questionIndex] || {};
    
    // Check if this target is already used
    const isUsed = Object.values(userAnswers).includes(targetId);
    if (isUsed) return;
    
    // If a pair is selected, make the match
    if (matchingSelectedPair) {
        if (!state.answers[questionIndex]) {
            state.answers[questionIndex] = {};
        }
        
        // Remove this target from any other pair first
        Object.keys(state.answers[questionIndex]).forEach(key => {
            if (state.answers[questionIndex][key] === targetId) {
                delete state.answers[questionIndex][key];
            }
        });
        
        state.answers[questionIndex][matchingSelectedPair] = targetId;
        matchingSelectedPair = null;
        
        saveQuizProgress();
        
        // Check if all matched in study mode
        if (state.studyMode && Object.keys(state.answers[questionIndex]).length === q.matchPairs.length) {
            checkStudyAnswer();
        }
        
        render();
    }
}

function renderMatchingQuestion(q, questionIndex) {
    const userAnswers = state.answers[questionIndex] || {};
    const showResults = state.studyMode && state.showAnswer;
    const questionId = `matching-${questionIndex}`;
    
    return `
        <div class="matching-container" id="${questionId}">
            <div class="matching-hint">
                <span class="matching-hint-icon">💡</span>
                <span>Click a term, then click its matching definition. Or drag definitions onto terms.</span>
            </div>
            
            <div class="matching-grid">
                <!-- Left Column: Terms -->
                <div class="matching-column matching-pairs">
                    ${q.matchPairs.map((pair, idx) => {
                        const selected = userAnswers[pair.id];
                        const isCorrect = showResults && selected === pair.correctMatch;
                        const isIncorrect = showResults && selected && selected !== pair.correctMatch;
                        const isClickSelected = matchingSelectedPair === pair.id;
                        const selectedTarget = selected ? q.matchTargets.find(t => t.id === selected) : null;
                        
                        return `
                            <div class="matching-pair ${selected ? 'matched' : ''} ${isCorrect ? 'correct' : ''} ${isIncorrect ? 'incorrect' : ''} ${isClickSelected ? 'click-selected' : ''}"
                                 data-pair-id="${pair.id}"
                                 data-question-index="${questionIndex}"
                                 onclick="handleMatchPairClick('${pair.id}', ${questionIndex})"
                                 style="cursor:pointer">
                                <div class="matching-pair-label">${pair.id}</div>
                                <div class="matching-pair-text">${escapeHtml(pair.text)}</div>
                                ${selected && selectedTarget ? `
                                    <div class="matching-pair-arrow">→</div>
                                    <div class="matching-pair-match-preview">
                                        <div class="matching-pair-selection">${selected}</div>
                                        <div class="matching-pair-match-text">${escapeHtml(selectedTarget.text.substring(0, 50))}${selectedTarget.text.length > 50 ? '...' : ''}</div>
                                        ${!showResults ? '<button class="clear-match-btn" onclick="event.stopPropagation();handleMatchPairClick(\\''+pair.id+'\\','+questionIndex+')">✕</button>' : ''}
                                    </div>
                                ` : ''}
                                ${showResults && isCorrect ? '<span class="match-badge badge-success">✓</span>' : ''}
                                ${showResults && isIncorrect ? '<span class="match-badge badge-error">✗</span>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <!-- Right Column: Definitions -->
                <div class="matching-column matching-targets">
                    ${q.matchTargets.map((target) => {
                        const isUsed = Object.values(userAnswers).includes(target.id);
                        const isHighlighted = matchingSelectedPair && !isUsed && !showResults;
                        const isCorrectAnswer = showResults && q.matchPairs.some(p => p.correctMatch === target.id);
                        
                        return `
                            <div class="matching-target ${!showResults ? 'draggable' : ''} ${isUsed ? 'used' : ''} ${isHighlighted ? 'highlighted' : ''} ${isCorrectAnswer && showResults ? 'highlight-correct' : ''}"
                                 data-target-id="${target.id}"
                                 data-question-index="${questionIndex}"
                                 draggable="${!showResults && !isUsed}"
                                 onclick="handleMatchTargetClick('${target.id}', ${questionIndex})"
                                 style="cursor:${isUsed || showResults ? 'default' : 'pointer'}">
                                <div class="matching-target-label">${target.id}</div>
                                <div class="matching-target-text">${escapeHtml(target.text)}</div>
                                ${!showResults && !isUsed ? '<div class="matching-target-drag-indicator">⋮⋮</div>' : ''}
                                ${isUsed ? '<span class="used-indicator">✓</span>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <div class="matching-progress">
                <span>${Object.keys(userAnswers).length} of ${q.matchPairs.length} matched</span>
            </div>
            
            ${showResults && q.explanation ? `
                <div class="explanation-box" style="margin-top:1.5rem">
                    <p class="font-semibold" style="margin-bottom:0.25rem">💡 Explanation</p>
                    <p>${escapeHtml(q.explanation)}</p>
                </div>
            ` : ''}
            
            ${showResults ? `
                <div class="matching-correct-answers" style="margin-top:1rem">
                    <p class="font-semibold" style="margin-bottom:0.5rem;color:var(--success)">Correct Matches:</p>
                    ${q.matchPairs.map(pair => {
                        const correctTarget = q.matchTargets.find(t => t.id === pair.correctMatch);
                        return `<div style="display:flex;align-items:center;gap:0.5rem;padding:0.25rem 0;font-size:0.875rem">
                            <span style="font-weight:600">${pair.id}. ${escapeHtml(pair.text)}</span>
                            <span style="color:var(--success)">→</span>
                            <span style="color:var(--text-secondary)">${pair.correctMatch}. ${escapeHtml(correctTarget?.text || '')}</span>
                        </div>`;
                    }).join('')}
                </div>
            ` : ''}
        </div>
    `;
}
// Initialize drag and drop for matching questions
function initMatchingDragDrop() {
    const targets = document.querySelectorAll('.matching-target.draggable');
    const pairs = document.querySelectorAll('.matching-pair');
    
    // Draggable items (definitions)
    targets.forEach(target => {
        target.addEventListener('dragstart', handleMatchingDragStart);
        target.addEventListener('dragend', handleMatchingDragEnd);
    });
    
    // Drop zones (terms)
    pairs.forEach(pair => {
        pair.addEventListener('dragover', handleMatchingDragOver);
        pair.addEventListener('dragleave', handleMatchingDragLeave);
        pair.addEventListener('drop', handleMatchingDrop);
    });
}

function handleMatchingDragStart(e) {
    const targetId = e.currentTarget.dataset.targetId;
    const questionIndex = e.currentTarget.dataset.questionIndex;
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ targetId, questionIndex }));
    
    e.currentTarget.classList.add('dragging');
    
    // Highlight all drop zones
    document.querySelectorAll('.matching-pair').forEach(pair => {
        if (pair.dataset.questionIndex === questionIndex) {
            pair.classList.add('drop-zone');
        }
    });
}

function handleMatchingDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    
    // Remove all highlights
    document.querySelectorAll('.matching-pair').forEach(pair => {
        pair.classList.remove('drop-zone', 'drop-valid', 'drop-invalid');
    });
}

function handleMatchingDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const pair = e.currentTarget;
    if (!pair.classList.contains('dragging')) {
        pair.classList.add('drop-valid');
        pair.classList.remove('drop-invalid');
    }
}

function handleMatchingDragLeave(e) {
    const pair = e.currentTarget;
    pair.classList.remove('drop-valid', 'drop-invalid');
}

function handleMatchingDrop(e) {
    e.preventDefault();
    
    const pair = e.currentTarget;
    pair.classList.remove('drop-zone', 'drop-valid', 'drop-invalid');
    
    try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        const { targetId, questionIndex } = data;
        
        const pairId = pair.dataset.pairId;
        const pairQuestionIndex = parseInt(pair.dataset.questionIndex);
        
        // Verify it's the same question
        if (parseInt(questionIndex) !== pairQuestionIndex) {
            return;
        }
        
        // Initialize answers object if needed
        if (!state.answers[questionIndex]) {
            state.answers[questionIndex] = {};
        }
        
        // Remove this target from any other pairs first
        Object.keys(state.answers[questionIndex]).forEach(key => {
            if (state.answers[questionIndex][key] === targetId) {
                delete state.answers[questionIndex][key];
            }
        });
        
        // Add the new match
        state.answers[questionIndex][pairId] = targetId;
        
        // Save progress
        saveQuizProgress();
        
        // Visual feedback
        pair.style.transform = 'scale(1.05)';
        setTimeout(() => {
            pair.style.transform = '';
        }, 200);
        
        // Check if all pairs matched in study mode
        const q = state.currentQuiz.questions[questionIndex];
        if (state.studyMode && Object.keys(state.answers[questionIndex]).length === q.matchPairs.length) {
            checkStudyAnswer();
        }
        
        // Re-render to show the match
        render();
        
    } catch (error) {
        console.error('Drop error:', error);
    }
}
function checkStudyAnswer() {
    const q = state.currentQuiz.questions[state.currentQuestionIndex], ua = state.answers[state.currentQuestionIndex] || [];
    let correct = false;
    
    if (q.type === 'choice') { 
        const as = new Set(ua), cs = new Set(q.correct); 

console.log('✅ Module 12: Matching Questions loaded');
