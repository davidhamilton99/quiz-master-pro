/* Flashcards Component - Stunning 3D flip cards with swipe gestures */
import { getState, setState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { showToast } from '../utils/toast.js';

// Flashcard state
let flashcardState = {
    cards: [],
    currentIndex: 0,
    isFlipped: false,
    knownCards: new Set(),
    unknownCards: new Set(),
    shuffled: false,
    studyMode: 'all', // 'all', 'unknown', 'known'
    showProgress: true,
};

// Touch handling for swipe
let touchStartX = 0;
let touchStartY = 0;
let touchCurrentX = 0;
let isDragging = false;

export function initFlashcards(quiz) {
    // Convert quiz questions to flashcards
    const cards = quiz.questions.map((q, index) => ({
        id: index,
        front: q.question,
        back: getAnswerText(q),
        explanation: q.explanation || null,
        type: q.type,
        originalQuestion: q,
    }));
    
    flashcardState = {
        cards,
        currentIndex: 0,
        isFlipped: false,
        knownCards: new Set(),
        unknownCards: new Set(),
        shuffled: false,
        studyMode: 'all',
        showProgress: true,
    };
    
    setState({ view: 'flashcards', currentQuiz: quiz });
}

function getAnswerText(q) {
    switch (q.type) {
        case 'truefalse':
            return q.correct ? 'True' : 'False';
        case 'matching':
            return q.options.map(opt => `${opt.left} → ${opt.right}`).join('\n');
        case 'ordering':
            return (q.items || q.options).map((item, i) => `${i + 1}. ${typeof item === 'string' ? item : item.text}`).join('\n');
        default:
            if (Array.isArray(q.correct)) {
                return q.correct.map(i => q.options[i]).join(', ');
            }
            return q.options[q.correct] || 'N/A';
    }
}

function getFilteredCards() {
    const { cards, studyMode, knownCards, unknownCards } = flashcardState;
    
    switch (studyMode) {
        case 'unknown':
            return cards.filter(c => unknownCards.has(c.id));
        case 'known':
            return cards.filter(c => knownCards.has(c.id));
        default:
            return cards;
    }
}

export function renderFlashcards() {
    const state = getState();
    const quiz = state.currentQuiz;
    const { currentIndex, isFlipped, knownCards, unknownCards, shuffled, studyMode } = flashcardState;
    
    const filteredCards = getFilteredCards();
    const card = filteredCards[currentIndex];
    const total = filteredCards.length;
    const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;
    
    const isKnown = card ? knownCards.has(card.id) : false;
    const isUnknown = card ? unknownCards.has(card.id) : false;
    
    if (!card) {
        return renderEmptyState(quiz, knownCards.size, unknownCards.size);
    }
    
    return `
    <div class="flashcards-container">
        <!-- Header -->
        <div class="flashcards-header">
            <button class="btn btn-ghost" onclick="window.app.exitFlashcards()">
                ← Back
            </button>
            <div class="flashcards-title">
                <h2>${escapeHtml(quiz?.title || 'Flashcards')}</h2>
                <span class="flashcards-counter">${currentIndex + 1} / ${total}</span>
            </div>
            <button class="btn btn-ghost" onclick="window.app.toggleFlashcardSettings()">
                ⚙️
            </button>
        </div>
        
        <!-- Progress Bar -->
        <div class="flashcards-progress">
            <div class="flashcards-progress-bar" style="width: ${progress}%"></div>
        </div>
        
        <!-- Stats Bar -->
        <div class="flashcards-stats">
            <button class="stat-chip ${studyMode === 'all' ? 'active' : ''}" onclick="window.app.setFlashcardMode('all')">
                📚 All (${flashcardState.cards.length})
            </button>
            <button class="stat-chip known ${studyMode === 'known' ? 'active' : ''}" onclick="window.app.setFlashcardMode('known')">
                ✓ Know (${knownCards.size})
            </button>
            <button class="stat-chip unknown ${studyMode === 'unknown' ? 'active' : ''}" onclick="window.app.setFlashcardMode('unknown')">
                ✗ Learning (${unknownCards.size})
            </button>
        </div>
        
        <!-- Card Area -->
        <div class="flashcards-area" 
             ontouchstart="window.app.flashcardTouchStart(event)"
             ontouchmove="window.app.flashcardTouchMove(event)"
             ontouchend="window.app.flashcardTouchEnd(event)">
            
            <div class="flashcard-wrapper ${isFlipped ? 'flipped' : ''}" 
                 onclick="window.app.flipCard()"
                 id="flashcard-wrapper">
                
                <!-- Front of Card -->
                <div class="flashcard flashcard-front">
                    <div class="flashcard-badge">${getTypeBadge(card.type)}</div>
                    <div class="flashcard-content">
                        <div class="flashcard-question">${formatCardContent(card.front)}</div>
                    </div>
                    <div class="flashcard-hint">
                        <span>👆 Tap to flip</span>
                    </div>
                </div>
                
                <!-- Back of Card -->
                <div class="flashcard flashcard-back">
                    <div class="flashcard-badge answer-badge">Answer</div>
                    <div class="flashcard-content">
                        <div class="flashcard-answer">${formatCardContent(card.back)}</div>
                        ${card.explanation ? `
                            <div class="flashcard-explanation">
                                <strong>💡 Explanation:</strong>
                                <p>${escapeHtml(card.explanation)}</p>
                            </div>
                        ` : ''}
                    </div>
                    <div class="flashcard-hint">
                        <span>👆 Tap to flip back</span>
                    </div>
                </div>
            </div>
            
            <!-- Swipe Indicators -->
            <div class="swipe-indicator swipe-left" id="swipe-left">
                <span>✗</span>
                <span>Still Learning</span>
            </div>
            <div class="swipe-indicator swipe-right" id="swipe-right">
                <span>✓</span>
                <span>Got It!</span>
            </div>
        </div>
        
        <!-- Card Status -->
        ${isKnown || isUnknown ? `
            <div class="card-status ${isKnown ? 'known' : 'unknown'}">
                ${isKnown ? '✓ Marked as Known' : '✗ Still Learning'}
            </div>
        ` : ''}
        
        <!-- Controls -->
        <div class="flashcards-controls">
            <button class="fc-btn fc-btn-unknown ${isUnknown ? 'active' : ''}" 
                    onclick="window.app.markCard('unknown')"
                    title="Still learning this">
                <span class="fc-btn-icon">✗</span>
                <span class="fc-btn-label">Learning</span>
            </button>
            
            <div class="fc-nav-controls">
                <button class="fc-nav-btn" onclick="window.app.prevCard()" ${currentIndex === 0 ? 'disabled' : ''}>
                    ‹
                </button>
                <button class="fc-flip-btn" onclick="window.app.flipCard()">
                    🔄 Flip
                </button>
                <button class="fc-nav-btn" onclick="window.app.nextCard()" ${currentIndex >= total - 1 ? 'disabled' : ''}>
                    ›
                </button>
            </div>
            
            <button class="fc-btn fc-btn-known ${isKnown ? 'active' : ''}" 
                    onclick="window.app.markCard('known')"
                    title="I know this one">
                <span class="fc-btn-icon">✓</span>
                <span class="fc-btn-label">Know It</span>
            </button>
        </div>
        
        <!-- Keyboard Hints -->
        <div class="keyboard-hints">
            <span>⌨️ Space: Flip</span>
            <span>←→: Navigate</span>
            <span>1: Learning</span>
            <span>2: Know It</span>
        </div>
    </div>
    `;
}

function renderEmptyState(quiz, knownCount, unknownCount) {
    const { studyMode } = flashcardState;
    
    let message = '';
    let action = '';
    
    if (studyMode === 'unknown' && unknownCount === 0) {
        message = "🎉 Great job! No cards left to learn.";
        action = `<button class="btn btn-primary" onclick="window.app.setFlashcardMode('all')">Review All Cards</button>`;
    } else if (studyMode === 'known' && knownCount === 0) {
        message = "No cards marked as known yet. Keep studying!";
        action = `<button class="btn btn-primary" onclick="window.app.setFlashcardMode('all')">Study All Cards</button>`;
    } else {
        message = "No flashcards available.";
        action = `<button class="btn btn-primary" onclick="window.app.exitFlashcards()">Go Back</button>`;
    }
    
    return `
    <div class="flashcards-container">
        <div class="flashcards-header">
            <button class="btn btn-ghost" onclick="window.app.exitFlashcards()">← Back</button>
            <h2>${escapeHtml(quiz?.title || 'Flashcards')}</h2>
            <div></div>
        </div>
        
        <div class="flashcards-empty">
            <div class="empty-icon">📚</div>
            <p>${message}</p>
            ${action}
            
            ${knownCount > 0 || unknownCount > 0 ? `
                <div class="final-stats">
                    <div class="final-stat known">
                        <span class="stat-number">${knownCount}</span>
                        <span class="stat-label">Known</span>
                    </div>
                    <div class="final-stat unknown">
                        <span class="stat-number">${unknownCount}</span>
                        <span class="stat-label">Learning</span>
                    </div>
                </div>
            ` : ''}
        </div>
    </div>
    `;
}

function formatCardContent(content) {
    if (!content) return '';
    
    // Handle multiline content (like matching/ordering)
    if (content.includes('\n')) {
        return `<div class="card-list">${content.split('\n').map(line => 
            `<div class="card-list-item">${escapeHtml(line)}</div>`
        ).join('')}</div>`;
    }
    
    return `<p>${escapeHtml(content)}</p>`;
}

function getTypeBadge(type) {
    const badges = {
        'choice': '📝 Multiple Choice',
        'truefalse': '⚡ True/False',
        'matching': '🔗 Matching',
        'ordering': '↕️ Ordering',
        'multiselect': '☑️ Multi-Select',
    };
    return badges[type] || '📝 Question';
}

// ==================== Card Actions ====================

export function flipCard() {
    flashcardState.isFlipped = !flashcardState.isFlipped;
    
    // Animate without full re-render
    const wrapper = document.getElementById('flashcard-wrapper');
    if (wrapper) {
        wrapper.classList.toggle('flipped', flashcardState.isFlipped);
    } else {
        setState({ view: 'flashcards' });
    }
}

export function nextCard() {
    const filteredCards = getFilteredCards();
    if (flashcardState.currentIndex < filteredCards.length - 1) {
        flashcardState.currentIndex++;
        flashcardState.isFlipped = false;
        setState({ view: 'flashcards' });
    }
}

export function prevCard() {
    if (flashcardState.currentIndex > 0) {
        flashcardState.currentIndex--;
        flashcardState.isFlipped = false;
        setState({ view: 'flashcards' });
    }
}

export function markCard(status) {
    const filteredCards = getFilteredCards();
    const card = filteredCards[flashcardState.currentIndex];
    if (!card) return;
    
    const { knownCards, unknownCards } = flashcardState;
    
    if (status === 'known') {
        knownCards.add(card.id);
        unknownCards.delete(card.id);
        showToast('✓ Marked as known', 'success');
    } else {
        unknownCards.add(card.id);
        knownCards.delete(card.id);
        showToast('✗ Added to learning pile', 'info');
    }
    
    // Auto-advance after marking
    setTimeout(() => {
        if (flashcardState.currentIndex < filteredCards.length - 1) {
            nextCard();
        } else {
            setState({ view: 'flashcards' });
        }
    }, 300);
}

export function setFlashcardMode(mode) {
    flashcardState.studyMode = mode;
    flashcardState.currentIndex = 0;
    flashcardState.isFlipped = false;
    setState({ view: 'flashcards' });
}

export function shuffleCards() {
    const cards = [...flashcardState.cards];
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    flashcardState.cards = cards;
    flashcardState.currentIndex = 0;
    flashcardState.isFlipped = false;
    flashcardState.shuffled = true;
    showToast('🔀 Cards shuffled!', 'success');
    setState({ view: 'flashcards' });
}

export function resetFlashcards() {
    flashcardState.knownCards.clear();
    flashcardState.unknownCards.clear();
    flashcardState.currentIndex = 0;
    flashcardState.isFlipped = false;
    flashcardState.studyMode = 'all';
    showToast('🔄 Progress reset', 'info');
    setState({ view: 'flashcards' });
}

export function exitFlashcards() {
    setState({ view: 'library' });
}

// ==================== Touch/Swipe Handling ====================

export function flashcardTouchStart(e) {
    if (e.target.closest('.fc-btn, .fc-nav-btn, .stat-chip')) return;
    
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchCurrentX = touchStartX;
    isDragging = false;
}

export function flashcardTouchMove(e) {
    if (!touchStartX) return;
    
    touchCurrentX = e.touches[0].clientX;
    const deltaX = touchCurrentX - touchStartX;
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
    
    // Only handle horizontal swipes
    if (Math.abs(deltaX) > 20 && deltaY < 50) {
        isDragging = true;
        e.preventDefault();
        
        const wrapper = document.getElementById('flashcard-wrapper');
        if (wrapper) {
            wrapper.style.transform = `translateX(${deltaX * 0.5}px) rotateY(${flashcardState.isFlipped ? 180 : 0}deg)`;
            wrapper.style.transition = 'none';
        }
        
        // Show swipe indicators
        const leftIndicator = document.getElementById('swipe-left');
        const rightIndicator = document.getElementById('swipe-right');
        
        if (leftIndicator && rightIndicator) {
            if (deltaX < -50) {
                leftIndicator.classList.add('visible');
                rightIndicator.classList.remove('visible');
            } else if (deltaX > 50) {
                rightIndicator.classList.add('visible');
                leftIndicator.classList.remove('visible');
            } else {
                leftIndicator.classList.remove('visible');
                rightIndicator.classList.remove('visible');
            }
        }
    }
}

export function flashcardTouchEnd(e) {
    const deltaX = touchCurrentX - touchStartX;
    
    // Reset card position
    const wrapper = document.getElementById('flashcard-wrapper');
    if (wrapper) {
        wrapper.style.transform = '';
        wrapper.style.transition = '';
    }
    
    // Hide indicators
    const leftIndicator = document.getElementById('swipe-left');
    const rightIndicator = document.getElementById('swipe-right');
    if (leftIndicator) leftIndicator.classList.remove('visible');
    if (rightIndicator) rightIndicator.classList.remove('visible');
    
    // Handle swipe action
    if (isDragging && Math.abs(deltaX) > 100) {
        if (deltaX < 0) {
            markCard('unknown');
        } else {
            markCard('known');
        }
    }
    
    touchStartX = 0;
    touchStartY = 0;
    isDragging = false;
}

// ==================== Keyboard Handling ====================

export function handleFlashcardKeyboard(e) {
    if (getState().view !== 'flashcards') return;
    
    switch (e.key) {
        case ' ':
        case 'Enter':
            e.preventDefault();
            flipCard();
            break;
        case 'ArrowLeft':
            prevCard();
            break;
        case 'ArrowRight':
            nextCard();
            break;
        case '1':
            markCard('unknown');
            break;
        case '2':
            markCard('known');
            break;
        case 's':
            shuffleCards();
            break;
        case 'Escape':
            exitFlashcards();
            break;
    }
}

// Initialize keyboard listener
document.addEventListener('keydown', handleFlashcardKeyboard);
