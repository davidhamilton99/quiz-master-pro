/* Quiz Component - PHASE 2: Code Highlighting, Transitions, Image Support */
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

// ==================== PHASE 2: TRANSITION STATE ====================

let isTransitioning = false;
const TRANSITION_DURATION = 300; // ms

// ==================== MOBILE TOUCH SUPPORT ====================

let touchStartX = 0;
let touchStartY = 0;
let touchedElement = null;
let isTouchDragging = false;

function initTouchSupport() {
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
}

function handleTouchStart(e) {
    const target = e.target.closest('[data-touch-draggable]');
    if (!target) return;
    
    e.preventDefault();
    touchedElement = target;
    isTouchDragging = false;
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    
    target.classList.add('touch-active');
}

function handleTouchMove(e) {
    if (!touchedElement) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);
    
    if (deltaX > 10 || deltaY > 10) {
        isTouchDragging = true;
        e.preventDefault();
        
        touchedElement.style.transform = `translate(${touch.clientX - touchStartX}px, ${touch.clientY - touchStartY}px)`;
        touchedElement.style.opacity = '0.7';
        touchedElement.style.pointerEvents = 'none';
        touchedElement.classList.add('dragging');
        
        highlightDropZonesUnderFinger(touchedElement.dataset.touchDraggable, touch.clientX, touch.clientY);
    }
}

function highlightDropZonesUnderFinger(dragType, x, y) {
    document.querySelectorAll('.drop-zone-highlight').forEach(el => 
        el.classList.remove('drop-zone-highlight')
    );
    
    const elements = document.elementsFromPoint(x, y);
    for (const el of elements) {
        const dropZone = el.closest('[data-touch-drop-zone]');
        if (dropZone) {
            const dropType = dropZone.dataset.touchDropZone;
            if ((dragType === 'match-left' && dropType === 'match-right') ||
                (dragType === 'order-item' && dropType === 'order-item')) {
                dropZone.classList.add('drop-zone-highlight');
            }
            break;
        }
    }
}

function handleTouchEnd(e) {
    if (!touchedElement) return;
    
    const touch = e.changedTouches[0];
    
    touchedElement.style.visibility = 'hidden';
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    touchedElement.style.visibility = '';
    
    touchedElement.style.transform = '';
    touchedElement.style.opacity = '';
    touchedElement.style.pointerEvents = '';
    touchedElement.classList.remove('touch-active', 'dragging');
    
    document.querySelectorAll('.drop-zone-highlight').forEach(el => 
        el.classList.remove('drop-zone-highlight')
    );
    
    if (isTouchDragging && target) {
        const dropZone = target.closest('[data-touch-drop-zone]');
        if (dropZone) {
            e.preventDefault();
            handleTouchDrop(touchedElement, dropZone);
        }
    } else if (!isTouchDragging) {
        touchedElement.click();
    }
    
    touchedElement = null;
    isTouchDragging = false;
}

function handleTouchDrop(dragged, dropZone) {
    const dragType = dragged.dataset.touchDraggable;
    const dropType = dropZone.dataset.touchDropZone;
    
    if (dragType === 'match-left') {
        const leftIndex = parseInt(dragged.dataset.index);
        const rightIndex = parseInt(dropZone.dataset.index);
        if (!isNaN(leftIndex) && !isNaN(rightIndex)) {
            matchDropTouchHandler(leftIndex, rightIndex);
        }
    } else if (dragType === 'order-item') {
        const fromIndex = parseInt(dragged.dataset.index);
        const toIndex = parseInt(dropZone.dataset.index);
        if (!isNaN(fromIndex) && !isNaN(toIndex)) {
            orderDropTouchHandler(fromIndex, toIndex);
        }
    }
}

if (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTouchSupport);
    } else {
        initTouchSupport();
    }
}

// ==================== OPTION SHUFFLING ====================

function shuffleOptionsWithMapping(options, correctAnswer) {
    const indexedOptions = options.map((opt, i) => ({ 
        originalIndex: i, 
        text: opt 
    }));
    
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

// ==================== PHASE 2: CODE HIGHLIGHTING ====================

/**
 * Highlight code using Prism.js
 * Supports: powershell, bash, python, javascript, json, yaml, xml, sql, csharp, etc.
 */
function highlightCode(code, language = 'plaintext') {
    // Normalize language names
    const langMap = {
        'ps': 'powershell',
        'ps1': 'powershell',
        'sh': 'bash',
        'shell': 'bash',
        'js': 'javascript',
        'ts': 'typescript',
        'py': 'python',
        'yml': 'yaml',
        'cs': 'csharp',
        'c#': 'csharp',
        'txt': 'plaintext',
        'text': 'plaintext',
        'conf': 'ini',
        'config': 'ini',
        'reg': 'ini', // Windows registry
    };
    
    const normalizedLang = langMap[language.toLowerCase()] || language.toLowerCase();
    
    // Check if Prism is available and has the language
    if (typeof Prism !== 'undefined' && Prism.languages[normalizedLang]) {
        try {
            return Prism.highlight(code, Prism.languages[normalizedLang], normalizedLang);
        } catch (e) {
            console.warn('Prism highlighting failed:', e);
        }
    }
    
    // Fallback: escape HTML
    return escapeHtml(code);
}

/**
 * Render a code block with syntax highlighting
 * @param {string} code - The code content
 * @param {string} language - Optional language identifier
 */
function renderCodeBlock(code, language = 'plaintext') {
    const highlightedCode = highlightCode(code, language);
    const langLabel = language && language !== 'plaintext' ? language.toUpperCase() : '';
    
    return `
        <div class="code-block-wrapper">
            ${langLabel ? `<div class="code-lang-label">${escapeHtml(langLabel)}</div>` : ''}
            <pre class="code-block${language ? ` language-${language}` : ''}"><code>${highlightedCode}</code></pre>
            <button class="code-copy-btn" onclick="window.app.copyCode(this)" title="Copy code">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            </button>
        </div>
    `;
}

// Copy code to clipboard
export function copyCode(button) {
    const codeBlock = button.closest('.code-block-wrapper').querySelector('code');
    const code = codeBlock.textContent;
    
    navigator.clipboard.writeText(code).then(() => {
        button.classList.add('copied');
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
        setTimeout(() => {
            button.classList.remove('copied');
            button.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            `;
        }, 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
        showToast('Failed to copy', 'error');
    });
}

// ==================== PHASE 2: IMAGE SUPPORT ====================

/**
 * Render an image in a question
 * @param {string} imageUrl - URL or base64 data URL
 * @param {string} alt - Alt text for accessibility
 */
function renderQuestionImage(imageUrl, alt = 'Question image') {
    if (!imageUrl) return '';
    
    return `
        <div class="question-image-container">
            <img 
                src="${escapeHtml(imageUrl)}" 
                alt="${escapeHtml(alt)}"
                class="question-image"
                loading="lazy"
                onclick="window.app.showImageModal(this.src, this.alt)"
            />
            <button class="image-zoom-btn" onclick="window.app.showImageModal('${escapeHtml(imageUrl)}', '${escapeHtml(alt)}')" title="View full size">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                    <path d="M11 8v6M8 11h6"></path>
                </svg>
            </button>
        </div>
    `;
}

/**
 * Render an image option (for image-based multiple choice)
 */
function renderImageOption(imageUrl, index, isSelected, isCorrect, showingAnswer, disabled) {
    let cls = 'option image-option';
    if (isSelected) cls += ' selected';
    if (showingAnswer && isCorrect) cls += ' correct';
    if (showingAnswer && isSelected && !isCorrect) cls += ' incorrect';
    
    return `
        <label class="${cls}">
            <input type="radio" 
                name="q-img" 
                value="${index}" 
                ${isSelected ? 'checked' : ''} 
                ${disabled ? 'disabled' : ''}
                onchange="window.app.selectOption(${index})">
            <span class="option-letter">${String.fromCharCode(65 + index)}</span>
            <img src="${escapeHtml(imageUrl)}" alt="Option ${String.fromCharCode(65 + index)}" class="option-image" loading="lazy">
        </label>
    `;
}

// Image modal for full-screen view
export function showImageModal(src, alt) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay image-modal';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
        <div class="image-modal-content">
            <button class="modal-close-btn" onclick="this.closest('.modal-overlay').remove()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
            </button>
            <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" class="modal-image">
            ${alt && alt !== 'Question image' ? `<p class="image-caption">${escapeHtml(alt)}</p>` : ''}
        </div>
    `;
    document.body.appendChild(modal);
    
    // Close on escape
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
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
    
    // Calculate progress percentage
    const answeredCount = state.answers.filter(a => a !== undefined).length;
    const progressPercent = Math.round((answeredCount / total) * 100);

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
        
        <!-- PHASE 2: Progress bar with milestones -->
        <div class="quiz-progress-bar">
            <div class="progress-track">
                <div class="progress-fill" style="width: ${progressPercent}%"></div>
                ${renderProgressMilestones(total, answeredCount)}
            </div>
            <span class="progress-label">${progressPercent}% complete</span>
        </div>
        
        <main class="quiz-main">
            <!-- PHASE 2: Animated question container -->
            <div class="quiz-content question-container ${state.transitionDirection || ''}" id="question-container">
                ${renderStreakDisplay(state.quizStreak)}
                <div class="question-header">
                    <div class="question-num">
                        Question ${state.currentQuestionIndex + 1}
                        ${getTypeBadge(q.type)}
                        ${state.flaggedQuestions.has(state.currentQuestionIndex) ? '<span class="badge badge-warning">Flagged</span>' : ''}
                    </div>
                    <h2 class="question-text">${escapeHtml(q.question)}</h2>
                </div>
                
                <!-- PHASE 2: Question image support -->
                ${q.image ? renderQuestionImage(q.image, q.imageAlt) : ''}
                
                <!-- PHASE 2: Enhanced code block with syntax highlighting -->
                ${q.code ? renderCodeBlock(q.code, q.codeLanguage || 'plaintext') : ''}
                
                ${renderQuestionType(q, state.currentQuestionIndex)}
                ${renderStudyModeFeedback(q, state)}
            </div>
        </main>
        <footer class="quiz-footer"><div class="quiz-nav">
            <button class="btn btn-secondary" onclick="window.app.prevQuestion()" ${state.currentQuestionIndex === 0 ? 'disabled' : ''}>← Prev</button>
            ${renderQuestionNav(total, state.currentQuestionIndex)}
            ${state.currentQuestionIndex === total - 1 
                ? `<button class="btn btn-primary" onclick="window.app.submitQuiz()">Submit</button>` 
                : `<button class="btn btn-primary" onclick="window.app.nextQuestion()">Next →</button>`}
        </div></footer>
    </div>`;
}

// PHASE 2: Progress milestones (25%, 50%, 75%, 100%)
function renderProgressMilestones(total, answered) {
    const milestones = [25, 50, 75, 100];
    return milestones.map(pct => {
        const reached = (answered / total) * 100 >= pct;
        return `<div class="progress-milestone ${reached ? 'reached' : ''}" style="left: ${pct}%" title="${pct}%">
            ${reached ? '✓' : ''}
        </div>`;
    }).join('');
}

function renderStudyModeFeedback(q, state) {
    if (!state.studyMode || !state.showAnswer) return '';
    
    const userAnswer = state.answers[state.currentQuestionIndex];
    const isCorrect = checkIfCorrect(userAnswer, q, state.currentQuestionIndex);
    
    let feedbackHtml = `
        <div class="study-feedback ${isCorrect ? 'correct' : 'incorrect'} fade-in">
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
                    feedbackHtml += `<li>${escapeHtml(item)}</li>`;
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
        ordering: '<span class="badge badge-primary">Ordering</span>',
        fillin: '<span class="badge badge-accent">Fill in Blank</span>'
    };
    return badges[type] || '';
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

// ==================== MULTIPLE CHOICE ====================

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
    
    // PHASE 2: Check if options are images
    const hasImageOptions = q.optionImages && q.optionImages.length > 0;
    
    let html = `<div class="options-grid ${hasImageOptions ? 'image-options-grid' : ''}">`;
    
    displayOptions.forEach((opt, i) => {
        const letter = String.fromCharCode(65 + i);
        const isSelected = isMulti 
            ? (userAnswer || []).includes(i) 
            : userAnswer === i;
        const isCorrectOpt = isMulti 
            ? displayCorrect.includes(i) 
            : displayCorrect === i;
        
        let cls = 'option';
        if (isSelected) cls += ' selected';
        if (showingAnswer) {
            if (isCorrectOpt) cls += ' correct';
            if (isSelected && !isCorrectOpt) cls += ' incorrect';
        }
        
        const checkType = isMulti ? 'checkbox' : 'radio';
        const checked = isSelected ? 'checked' : '';
        
        // PHASE 2: Image option support
        if (hasImageOptions && q.optionImages[i]) {
            html += `
                <label class="${cls} image-option">
                    <input type="${checkType}" 
                        name="q${questionIndex}" 
                        value="${i}" 
                        ${checked} 
                        ${disabled}
                        onchange="window.app.${isMulti ? 'toggleMultiSelect' : 'selectOption'}(${i})">
                    <span class="option-letter">${letter}</span>
                    <img src="${escapeHtml(q.optionImages[i])}" alt="Option ${letter}" class="option-image" loading="lazy">
                    ${opt ? `<span class="option-caption">${escapeHtml(opt)}</span>` : ''}
                </label>
            `;
        } else {
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
        }
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
    
    let trueClass = 'option tf-option';
    let falseClass = 'option tf-option';
    
    if (trueSelected) trueClass += ' selected';
    if (falseSelected) falseClass += ' selected';
    
    if (showingAnswer) {
        if (correctAnswer) trueClass += ' correct';
        else if (trueSelected) trueClass += ' incorrect';
        
        if (!correctAnswer) falseClass += ' correct';
        else if (falseSelected) falseClass += ' incorrect';
    }
    
    // PHASE 2: Card flip style for T/F
    return `
        <div class="tf-options">
            <button class="${trueClass}" onclick="window.app.selectTF(true)" ${disabled}>
                <div class="tf-icon-wrapper true">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <span class="tf-label">True</span>
            </button>
            <button class="${falseClass}" onclick="window.app.selectTF(false)" ${disabled}>
                <div class="tf-icon-wrapper false">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <path d="M18 6L6 18M6 6l12 12"></path>
                    </svg>
                </div>
                <span class="tf-label">False</span>
            </button>
        </div>
    `;
}

// ==================== MATCHING ====================

function renderMatching(q, questionIndex) {
    const state = getState();
    const userAnswer = state.answers[questionIndex] || {};
    const showingAnswer = state.studyMode && state.showAnswer;
    const allMatched = Object.keys(userAnswer).length === q.pairs.length;
    
    let shuffledRight = state.matchingShuffled[questionIndex];
    if (!shuffledRight) {
        shuffledRight = shuffleArray(q.pairs.map((p, i) => ({ text: p.right, origIndex: i })));
        const newShuffled = { ...state.matchingShuffled };
        newShuffled[questionIndex] = shuffledRight;
        setState({ matchingShuffled: newShuffled });
    }
    
    const selectedLeft = state.matchingSelectedLeft;
    
    const rightToLeft = {};
    Object.entries(userAnswer).forEach(([left, right]) => {
        rightToLeft[right] = parseInt(left);
    });
    
    return `
        <div class="matching-container tap-mode">
            <p class="helper-text mb-4">Tap a term, then tap its matching definition</p>
            
            <div class="matching-grid">
                <div class="matching-column">
                    <div class="matching-header">Terms</div>
                    ${q.pairs.map((pair, i) => {
                        const isMatched = userAnswer[i] !== undefined;
                        const isSelected = selectedLeft === i && !isMatched;
                        const matchedRightIndex = userAnswer[i];
                        
                        return `
                            <div class="match-item left ${isMatched ? 'matched' : ''} ${isSelected ? 'selected' : ''} ${showingAnswer ? 'disabled' : ''}"
                                data-index="${i}"
                                onclick="window.app.selectMatchLeft(${i})">
                                <span class="match-letter">${String.fromCharCode(65 + i)}</span>
                                <span class="match-text">${escapeHtml(pair.left)}</span>
                                ${isMatched ? `
                                    <span class="match-badge">${matchedRightIndex + 1}</span>
                                    ${!showingAnswer ? `<button class="btn-remove" onclick="event.stopPropagation(); window.app.removeMatch(${i})" title="Remove match">×</button>` : ''}
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="matching-column">
                    <div class="matching-header">Definitions</div>
                    ${shuffledRight.map((item, i) => {
                        const isUsed = Object.values(userAnswer).includes(i);
                        const matchedLeftIndex = rightToLeft[i];
                        const isCorrect = showingAnswer && userAnswer[item.origIndex] === i;
                        const isWrong = showingAnswer && isUsed && !isCorrect;
                        
                        return `
                            <div class="match-item right ${isUsed ? 'used' : ''} ${isCorrect ? 'correct-match' : ''} ${isWrong ? 'wrong-match' : ''} ${showingAnswer ? 'disabled' : ''}"
                                data-index="${i}"
                                data-orig-index="${item.origIndex}"
                                onclick="window.app.selectMatchRight(${i})">
                                <span class="match-number">${i + 1}</span>
                                <span class="match-text">${escapeHtml(item.text)}</span>
                                ${isUsed ? `<span class="match-badge-right">${String.fromCharCode(65 + matchedLeftIndex)}</span>` : ''}
                                ${showingAnswer && isCorrect ? '<span class="match-check">✓</span>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <div class="mt-4 flex gap-2">
                ${Object.keys(userAnswer).length > 0 && !showingAnswer ? `
                    <button class="btn btn-secondary btn-sm" onclick="window.app.clearAllMatches()">Clear All</button>
                ` : ''}
                ${state.studyMode && allMatched && !showingAnswer ? `
                    <button class="btn btn-primary" onclick="window.app.checkMatchingAnswer()">Check Answer</button>
                ` : ''}
            </div>
        </div>
    `;
}

// ==================== ORDERING ====================

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
    
    return `
        <div class="ordering-container arrow-mode">
            <p class="helper-text mb-4">Use the arrows to reorder items (1 = first)</p>
            
            <div class="ordering-list">
                ${currentOrder.map((item, i) => {
                    const isCorrect = showingAnswer && item.origIndex === i;
                    const isWrong = showingAnswer && item.origIndex !== i;
                    const isFirst = i === 0;
                    const isLast = i === currentOrder.length - 1;
                    
                    return `
                        <div class="order-item ${isCorrect ? 'correct-order' : ''} ${isWrong ? 'wrong-order' : ''} ${showingAnswer ? 'disabled' : ''}"
                            data-index="${i}">
                            <div class="order-arrows ${showingAnswer ? 'hidden' : ''}">
                                <button class="order-arrow up ${isFirst ? 'disabled' : ''}" 
                                    onclick="window.app.moveOrderItem(${i}, -1)"
                                    ${isFirst || showingAnswer ? 'disabled' : ''}>▲</button>
                                <button class="order-arrow down ${isLast ? 'disabled' : ''}" 
                                    onclick="window.app.moveOrderItem(${i}, 1)"
                                    ${isLast || showingAnswer ? 'disabled' : ''}>▼</button>
                            </div>
                            <span class="order-number">${i + 1}</span>
                            <span class="order-text">${escapeHtml(item.text)}</span>
                            ${showingAnswer ? `<span class="order-result">${isCorrect ? '✓' : '✗'}</span>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
            
            ${!showingAnswer ? `
                <div class="mt-4 text-center">
                    <button class="btn btn-primary btn-lg" onclick="window.app.checkOrderingAnswer()">Check Answer</button>
                </div>
            ` : ''}
        </div>
    `;
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

export function checkMatchingAnswer() {
    const state = getState();
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    const userAnswer = state.answers[state.currentQuestionIndex];
    
    if (!userAnswer || Object.keys(userAnswer).length !== q.pairs.length) {
        showToast('Please match all items first', 'warning');
        return;
    }
    
    if (state.studyMode) {
        handleStudyModeCheck(userAnswer, q);
    }
}

export function checkOrderingAnswer() {
    const state = getState();
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    const userAnswer = state.answers[state.currentQuestionIndex];
    
    if (!userAnswer || !Array.isArray(userAnswer)) {
        showToast('Please arrange the items first', 'warning');
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
            const answerEl = document.querySelector('.option.selected') || document.querySelector('.tf-option.selected');
            if (answerEl) window.animations.burstCorrect(answerEl);
        }
    } else {
        recordWrongAnswer();
        if (window.sounds) window.sounds.playWrong();
        if (window.animations) {
            const answerEl = document.querySelector('.option.selected') || document.querySelector('.tf-option.selected');
            if (answerEl) {
                window.animations.burstWrong(answerEl);
                window.animations.addShakeAnimation(answerEl);
            }
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
            
            if (Object.keys(answer).length !== question.pairs.length) return false;
            
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

// ==================== MATCHING HANDLERS ====================

let draggedMatchIndex = null;
let draggedFromLeft = null;

export function matchDragStart(e, index, fromLeft) {
    draggedMatchIndex = index;
    draggedFromLeft = fromLeft;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

export function matchDragOver(e) {
    e.preventDefault();
    if (draggedMatchIndex !== null && draggedFromLeft) {
        e.currentTarget.classList.add('drag-over');
    }
}

export function matchDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

export function matchDrop(e, rightIndex) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (draggedMatchIndex === null || !draggedFromLeft) return;
    
    const state = getState();
    if (state.studyMode && state.showAnswer) return;
    
    matchDropHandler(draggedMatchIndex, rightIndex);
}

function matchDropHandler(leftIndex, rightIndex) {
    const state = getState();
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    const currentAnswers = { ...(state.answers[state.currentQuestionIndex] || {}) };
    
    currentAnswers[leftIndex] = rightIndex;
    
    const answers = [...state.answers];
    answers[state.currentQuestionIndex] = currentAnswers;
    setState({ answers });
    
    if (state.studyMode && Object.keys(currentAnswers).length === q.pairs.length) {
        setTimeout(() => {
            handleStudyModeCheck(currentAnswers, q);
        }, 300);
    }
    
    saveQuizProgress();
}

function matchDropTouchHandler(leftIndex, rightIndex) {
    matchDropHandler(leftIndex, rightIndex);
}

export function selectMatchLeft(index) {
    const state = getState();
    if (state.studyMode && state.showAnswer) return;
    
    const currentAnswers = state.answers[state.currentQuestionIndex] || {};
    if (currentAnswers[index] !== undefined) {
        return;
    }
    
    setState({ matchingSelectedLeft: index });
}

export function selectMatchRight(index) {
    const state = getState();
    if (state.studyMode && state.showAnswer) return;
    
    const selectedLeft = state.matchingSelectedLeft;
    
    if (selectedLeft === null || selectedLeft === undefined) {
        showToast('Select a term first', 'warning');
        return;
    }
    
    const currentAnswers = state.answers[state.currentQuestionIndex] || {};
    if (Object.values(currentAnswers).includes(index)) {
        showToast('This definition is already matched', 'warning');
        return;
    }
    
    matchDropHandler(selectedLeft, index);
    
    setState({ matchingSelectedLeft: null });
}

export function removeMatch(leftIndex) {
    const state = getState();
    if (state.studyMode && state.showAnswer) return;
    
    const currentAnswers = { ...(state.answers[state.currentQuestionIndex] || {}) };
    delete currentAnswers[leftIndex];
    
    const answers = [...state.answers];
    answers[state.currentQuestionIndex] = currentAnswers;
    setState({ answers });
    saveQuizProgress();
}

export const unmatchItem = removeMatch;

export function clearAllMatches() {
    const state = getState();
    if (state.studyMode && state.showAnswer) return;
    
    const answers = [...state.answers];
    answers[state.currentQuestionIndex] = {};
    setState({ answers });
    saveQuizProgress();
}

export function initQuizHandlers() {
    // Kept for compatibility
}

export function matchDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    draggedMatchIndex = null;
    draggedFromLeft = null;
}

// ==================== ORDERING HANDLERS ====================

export function moveOrderItem(index, direction) {
    const state = getState();
    if (state.studyMode && state.showAnswer) return;
    
    const currentOrder = state.answers[state.currentQuestionIndex];
    if (!currentOrder) return;
    
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= currentOrder.length) return;
    
    const newOrder = [...currentOrder];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    
    const answers = [...state.answers];
    answers[state.currentQuestionIndex] = newOrder;
    setState({ answers });
    
    saveQuizProgress();
}

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
    if (state.studyMode && state.showAnswer) return;
    
    orderDropHandler(draggedOrderIndex, targetIndex);
}

function orderDropHandler(fromIndex, toIndex) {
    const state = getState();
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    const currentOrder = state.answers[state.currentQuestionIndex] || 
        q.options.map((text, i) => ({ text, origIndex: i }));
    
    const newOrder = [...currentOrder];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    
    const answers = [...state.answers];
    answers[state.currentQuestionIndex] = newOrder;
    setState({ answers });
    
    saveQuizProgress();
}

function orderDropTouchHandler(fromIndex, toIndex) {
    orderDropHandler(fromIndex, toIndex);
}

export function orderDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    draggedOrderIndex = null;
}

// ==================== NAVIGATION (WITH TRANSITIONS) ====================

export function nextQuestion() {
    const state = getState();
    if (isTransitioning) return;
    if (state.currentQuestionIndex < state.currentQuiz.questions.length - 1) {
        transitionToQuestion(state.currentQuestionIndex + 1, 'next');
    }
}

export function prevQuestion() {
    const state = getState();
    if (isTransitioning) return;
    if (state.currentQuestionIndex > 0) {
        transitionToQuestion(state.currentQuestionIndex - 1, 'prev');
    }
}

export function goToQuestion(index) {
    const state = getState();
    if (isTransitioning) return;
    if (index >= 0 && index < state.currentQuiz.questions.length && index !== state.currentQuestionIndex) {
        const direction = index > state.currentQuestionIndex ? 'next' : 'prev';
        transitionToQuestion(index, direction);
    }
}

// PHASE 2: Smooth question transitions
function transitionToQuestion(newIndex, direction) {
    isTransitioning = true;
    const container = document.getElementById('question-container');
    
    if (container) {
        // Add exit animation
        container.classList.add(`slide-out-${direction}`);
        
        setTimeout(() => {
            setState({ 
                currentQuestionIndex: newIndex,
                showAnswer: false,
                matchingSelectedLeft: null,
                transitionDirection: `slide-in-${direction}`
            });
            saveQuizProgress();
            
            // Remove transition class after animation completes
            setTimeout(() => {
                const newContainer = document.getElementById('question-container');
                if (newContainer) {
                    newContainer.classList.remove(`slide-in-${direction}`);
                }
                isTransitioning = false;
            }, TRANSITION_DURATION);
        }, TRANSITION_DURATION);
    } else {
        // Fallback without animation
        setState({ 
            currentQuestionIndex: newIndex,
            showAnswer: false,
            matchingSelectedLeft: null
        });
        saveQuizProgress();
        isTransitioning = false;
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
                quizStartTime: Date.now(),
                transitionDirection: null
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
                quizStartTime: Date.now(),
                transitionDirection: null
            });
            
            if (window.sounds) window.sounds.playQuizStart();
        }
        
        if (options.timed) {
            startTimer();
        }
        
        updateDailyStreak();
        
        hideLoading();
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