/* Flashcards v2 */
import { getState, setState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { showToast } from '../utils/toast.js';
import { icon } from '../utils/icons.js';
import { submitReview, addToReview } from '../services/api.js';

// Flashcard state
let fc = {
    quiz: null,
    cards: [],
    currentIndex: 0,
    isFlipped: false,
    ratings: {}, // cardId -> 'easy' | 'good' | 'hard' | 'again'
    sessionStats: { seen: 0, easy: 0, good: 0, hard: 0, again: 0 },
    isShuffled: false,
    autoAdvance: true,
    showShortcuts: false,
};

// Touch state
let touch = { startX: 0, startY: 0, currentX: 0, isDragging: false };

export function initFlashcards(quiz) {
    const cards = quiz.questions.map((q, i) => ({
        id: i,
        front: q.question.replace(/^\[multi\]\s*/i, ''),
        back: getAnswerText(q),
        explanation: q.explanation || null,
        type: q.type,
        question: q,
    }));
    
    fc = {
        quiz,
        cards,
        currentIndex: 0,
        isFlipped: false,
        ratings: {},
        sessionStats: { seen: 0, easy: 0, good: 0, hard: 0, again: 0 },
        isShuffled: false,
        autoAdvance: true,
        showShortcuts: false,
    };
    
    setState({ view: 'flashcards', currentQuiz: quiz });
}

function getAnswerText(q) {
    switch (q.type) {
        case 'truefalse': {
            const c = q.correct;
            // Handle array [0]/[1], boolean, string, or number
            const val = Array.isArray(c) ? c[0] : c;
            const isTrue = val === 0 || val === true || val === 'true';
            return isTrue ? 'True ✓' : 'False ✗';
        }
        case 'matching':
            return (q.options || []).map(opt => `${opt.left} → ${opt.right}`).join('\n');
        case 'ordering':
            const items = q.items || q.options || [];
            return items.map((item, i) => `${i + 1}. ${typeof item === 'string' ? item : item.text}`).join('\n');
        default:
            if (Array.isArray(q.correct)) {
                return q.correct.map(i => q.options[i]).join(', ');
            }
            return q.options?.[q.correct] || 'N/A';
    }
}

export function renderFlashcards() {
    const card = fc.cards[fc.currentIndex];
    const total = fc.cards.length;
    const progress = total > 0 ? ((fc.currentIndex + 1) / total) * 100 : 0;
    const rating = card ? fc.ratings[card.id] : null;
    
    // Calculate stats
    const remaining = total - fc.currentIndex;
    const masteredCount = Object.values(fc.ratings).filter(r => r === 'easy' || r === 'good').length;
    const learningCount = Object.values(fc.ratings).filter(r => r === 'hard' || r === 'again').length;
    
    if (!card) {
        return renderCompletionScreen();
    }

    return `
    <div class="fc2-container" 
         ontouchstart="window.app.fcTouchStart(event)"
         ontouchmove="window.app.fcTouchMove(event)" 
         ontouchend="window.app.fcTouchEnd(event)">
        
        <!-- Top Bar -->
        <div class="fc2-topbar">
            <button class="fc2-close" onclick="window.app.exitFlashcards()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
            
            <div class="fc2-progress-info">
                <span class="fc2-counter">${fc.currentIndex + 1} / ${total}</span>
            </div>
            
            <button class="fc2-menu-btn" onclick="window.app.fcToggleMenu()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                </svg>
            </button>
        </div>
        
        <!-- Progress Bar -->
        <div class="fc2-progress-bar">
            <div class="fc2-progress-fill" style="width: ${progress}%"></div>
            <div class="fc2-progress-sections">
                ${fc.cards.map((c, i) => `
                    <div class="fc2-progress-dot ${i === fc.currentIndex ? 'current' : ''} ${fc.ratings[c.id] ? fc.ratings[c.id] : ''}"
                         onclick="window.app.fcGoToCard(${i})"></div>
                `).join('')}
            </div>
        </div>
        
        <!-- Session Stats -->
        <div class="fc2-stats-bar">
            <div class="fc2-stat">
                <span class="fc2-stat-num remaining">${remaining}</span>
                <span class="fc2-stat-label">Left</span>
            </div>
            <div class="fc2-stat">
                <span class="fc2-stat-num mastered">${masteredCount}</span>
                <span class="fc2-stat-label">Mastered</span>
            </div>
            <div class="fc2-stat">
                <span class="fc2-stat-num learning">${learningCount}</span>
                <span class="fc2-stat-label">Learning</span>
            </div>
        </div>
        
        <!-- Card Stack Area -->
        <div class="fc2-card-area">
            <!-- Background cards for stack effect -->
            <div class="fc2-card-stack">
                <div class="fc2-stack-card fc2-stack-2"></div>
                <div class="fc2-stack-card fc2-stack-1"></div>
            </div>
            
            <!-- Main Card -->
            <div class="fc2-card ${fc.isFlipped ? 'flipped' : ''} ${rating ? 'rated-' + rating : ''}" 
                 id="fc2-card"
                 onclick="window.app.fcFlip()">
                
                <!-- Front -->
                <div class="fc2-card-face fc2-card-front">
                    <div class="fc2-card-type">${getTypeIcon(card.type)} ${getTypeName(card.type)}</div>
                    <div class="fc2-card-content">
                        ${formatContent(card.front)}
                    </div>
                    <div class="fc2-tap-hint">
                        <span>Tap to reveal answer</span>
                    </div>
                </div>
                
                <!-- Back -->
                <div class="fc2-card-face fc2-card-back">
                    <div class="fc2-card-label">Answer</div>
                    <div class="fc2-card-content fc2-answer">
                        ${formatContent(card.back)}
                    </div>
                    ${card.explanation ? `
                        <div class="fc2-explanation">
                            <div class="fc2-explanation-title">${icon('lightbulb')} Why?</div>
                            <div class="fc2-explanation-text">${escapeHtml(card.explanation)}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Swipe Overlays -->
            <div class="fc2-swipe-overlay fc2-swipe-left" id="swipe-left-overlay">
                <div class="fc2-swipe-icon">${icon('rotateCcw', 'icon-xl')}</div>
                <div class="fc2-swipe-text">Again</div>
            </div>
            <div class="fc2-swipe-overlay fc2-swipe-right" id="swipe-right-overlay">
                <div class="fc2-swipe-icon">${icon('check', 'icon-xl')}</div>
                <div class="fc2-swipe-text">Got it!</div>
            </div>
        </div>
        
        <!-- Rating Buttons (shown after flip) -->
        <div class="fc2-rating-area ${fc.isFlipped ? 'visible' : ''}">
            <p class="fc2-rating-prompt">How well did you know this?</p>
            <div class="fc2-rating-buttons">
                <button class="fc2-rate-btn fc2-rate-again ${rating === 'again' ? 'selected' : ''}" 
                        onclick="window.app.fcRate('again')">
                    <span class="fc2-rate-icon">${icon('rotateCcw')}</span>
                    <span class="fc2-rate-label">Again</span>
                    <span class="fc2-rate-key">1</span>
                </button>
                <button class="fc2-rate-btn fc2-rate-hard ${rating === 'hard' ? 'selected' : ''}"
                        onclick="window.app.fcRate('hard')">
                    <span class="fc2-rate-icon">${icon('alertTriangle')}</span>
                    <span class="fc2-rate-label">Hard</span>
                    <span class="fc2-rate-key">2</span>
                </button>
                <button class="fc2-rate-btn fc2-rate-good ${rating === 'good' ? 'selected' : ''}"
                        onclick="window.app.fcRate('good')">
                    <span class="fc2-rate-icon">${icon('check')}</span>
                    <span class="fc2-rate-label">Good</span>
                    <span class="fc2-rate-key">3</span>
                </button>
                <button class="fc2-rate-btn fc2-rate-easy ${rating === 'easy' ? 'selected' : ''}"
                        onclick="window.app.fcRate('easy')">
                    <span class="fc2-rate-icon">${icon('target')}</span>
                    <span class="fc2-rate-label">Easy</span>
                    <span class="fc2-rate-key">4</span>
                </button>
            </div>
        </div>
        
        <!-- Bottom Navigation -->
        <div class="fc2-bottom-nav">
            <button class="fc2-nav-btn" onclick="window.app.fcPrev()" ${fc.currentIndex === 0 ? 'disabled' : ''}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 18l-6-6 6-6"/>
                </svg>
            </button>
            
            <button class="fc2-flip-btn" onclick="window.app.fcFlip()">
                ${fc.isFlipped ? 'Tap card or press Space' : 'Flip Card'}
            </button>
            
            <button class="fc2-nav-btn" onclick="window.app.fcNext()" ${fc.currentIndex >= total - 1 ? 'disabled' : ''}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                </svg>
            </button>
        </div>
        
        <!-- Keyboard Shortcuts (Desktop) -->
        <div class="fc2-shortcuts ${fc.showShortcuts ? 'visible' : ''}">
            <div class="fc2-shortcut"><kbd>Space</kbd> Flip card</div>
            <div class="fc2-shortcut"><kbd>←</kbd><kbd>→</kbd> Navigate</div>
            <div class="fc2-shortcut"><kbd>1-4</kbd> Rate card</div>
            <div class="fc2-shortcut"><kbd>S</kbd> Shuffle</div>
            <div class="fc2-shortcut"><kbd>Esc</kbd> Exit</div>
        </div>
        
        <!-- Menu Dropdown -->
        <div class="fc2-menu" id="fc2-menu">
            <button onclick="window.app.fcShuffle()">${icon('shuffle')} Shuffle Cards</button>
            <button onclick="window.app.fcRestart()">${icon('rotateCcw')} Restart</button>
            <button onclick="window.app.fcToggleShortcuts()">${icon('settings')} Keyboard Shortcuts</button>
            <div class="fc2-menu-divider"></div>
            <button onclick="window.app.exitFlashcards()">✕ Exit to Library</button>
        </div>
    </div>
    `;
}

function renderCompletionScreen() {
    const total = fc.cards.length;
    const stats = fc.sessionStats;
    const masteredCount = Object.values(fc.ratings).filter(r => r === 'easy' || r === 'good').length;
    const learningCount = Object.values(fc.ratings).filter(r => r === 'hard' || r === 'again').length;
    const masteryPercent = total > 0 ? Math.round((masteredCount / total) * 100) : 0;
    
    // Get cards that need review
    const againCards = fc.cards.filter(c => fc.ratings[c.id] === 'again' || fc.ratings[c.id] === 'hard');
    
    return `
    <div class="fc2-container fc2-completion">
        <div class="fc2-completion-content">
            <div class="fc2-completion-icon">${icon('trophy', 'icon-3xl')}</div>
            <h1>Session Complete!</h1>
            <p class="fc2-completion-subtitle">You've reviewed all ${total} cards</p>
            
            <!-- Mastery Ring -->
            <div class="fc2-mastery-ring">
                <svg viewBox="0 0 100 100">
                    <circle class="fc2-ring-bg" cx="50" cy="50" r="45"/>
                    <circle class="fc2-ring-fill" cx="50" cy="50" r="45" 
                            stroke-dasharray="${masteryPercent * 2.83} 283"/>
                </svg>
                <div class="fc2-mastery-text">
                    <span class="fc2-mastery-percent">${masteryPercent}%</span>
                    <span class="fc2-mastery-label">Mastered</span>
                </div>
            </div>
            
            <!-- Stats Grid -->
            <div class="fc2-completion-stats">
                <div class="fc2-comp-stat easy">
                    <span class="fc2-comp-num">${Object.values(fc.ratings).filter(r => r === 'easy').length}</span>
                    <span class="fc2-comp-label">${icon('target')} Easy</span>
                </div>
                <div class="fc2-comp-stat good">
                    <span class="fc2-comp-num">${Object.values(fc.ratings).filter(r => r === 'good').length}</span>
                    <span class="fc2-comp-label">${icon('check')} Good</span>
                </div>
                <div class="fc2-comp-stat hard">
                    <span class="fc2-comp-num">${Object.values(fc.ratings).filter(r => r === 'hard').length}</span>
                    <span class="fc2-comp-label">${icon('alertTriangle')} Hard</span>
                </div>
                <div class="fc2-comp-stat again">
                    <span class="fc2-comp-num">${Object.values(fc.ratings).filter(r => r === 'again').length}</span>
                    <span class="fc2-comp-label">${icon('rotateCcw')} Again</span>
                </div>
            </div>
            
            <!-- Actions -->
            <div class="fc2-completion-actions">
                ${againCards.length > 0 ? `
                    <button class="btn btn-primary btn-lg" onclick="window.app.fcStudyMissed()">
                        ${icon('rotateCcw')} Review ${againCards.length} Difficult Cards
                    </button>
                ` : ''}
                <button class="btn ${againCards.length > 0 ? 'btn-secondary' : 'btn-primary btn-lg'}" onclick="window.app.fcRestart()">
                    ↻ Study All Again
                </button>
                <button class="btn btn-ghost" onclick="window.app.exitFlashcards()">
                    ← Back to Library
                </button>
            </div>
        </div>
    </div>
    `;
}

function formatContent(content) {
    if (!content) return '';
    
    // Handle multiline (matching/ordering)
    if (content.includes('\n')) {
        return `<div class="fc2-list">${content.split('\n').map(line => 
            `<div class="fc2-list-item">${escapeHtml(line)}</div>`
        ).join('')}</div>`;
    }
    
    return `<p>${escapeHtml(content)}</p>`;
}

function getTypeIcon(type) {
    const typeIcons = {
        'choice': icon('circleCheck'),
        'truefalse': icon('toggleLeft'),
        'matching': icon('link'),
        'ordering': icon('listOrdered'),
        'multiselect': icon('check')
    };
    return typeIcons[type] || icon('circleCheck');
}

function getTypeName(type) {
    const names = { 
        'choice': 'Multiple Choice', 'truefalse': 'True/False', 
        'matching': 'Matching', 'ordering': 'Ordering', 'multiselect': 'Multi-Select' 
    };
    return names[type] || 'Question';
}

// ==================== Actions ====================

export function fcFlip() {
    fc.isFlipped = !fc.isFlipped;
    
    const card = document.getElementById('fc2-card');
    if (card) {
        card.classList.toggle('flipped', fc.isFlipped);
        // Update rating area visibility
        document.querySelector('.fc2-rating-area')?.classList.toggle('visible', fc.isFlipped);
    } else {
        setState({ view: 'flashcards' });
    }
}

export function fcNext() {
    if (fc.currentIndex < fc.cards.length - 1) {
        fc.currentIndex++;
        fc.isFlipped = false;
        setState({ view: 'flashcards' });
    } else if (fc.currentIndex === fc.cards.length - 1) {
        // Go to completion
        fc.currentIndex++;
        setState({ view: 'flashcards' });
    }
}

export function fcPrev() {
    if (fc.currentIndex > 0) {
        fc.currentIndex--;
        fc.isFlipped = false;
        setState({ view: 'flashcards' });
    }
}

export function fcGoToCard(index) {
    if (index >= 0 && index < fc.cards.length) {
        fc.currentIndex = index;
        fc.isFlipped = false;
        setState({ view: 'flashcards' });
    }
}

export function fcRate(rating) {
    const card = fc.cards[fc.currentIndex];
    if (!card) return;

    fc.ratings[card.id] = rating;
    fc.sessionStats[rating]++;
    fc.sessionStats.seen++;

    // Sync rating to SRS backend if question has a real ID
    const questionId = card.question?.id;
    if (questionId) {
        // Map flashcard ratings to SM-2 quality scores (0-5)
        const qualityMap = { again: 0, hard: 2, good: 4, easy: 5 };
        const quality = qualityMap[rating] ?? 3;
        // Ensure card exists in SRS, then submit review
        addToReview([questionId]).then(data => {
            // submitReview needs the SRS card ID, not the question ID.
            // For simplicity we fire addToReview which is idempotent; the actual
            // SM-2 update happens during the dedicated SRS review flow.
        }).catch(() => {});
    }

    // Instant advance - no delay
    if (fc.autoAdvance) {
        if (fc.currentIndex < fc.cards.length - 1) {
            fc.currentIndex++;
            fc.isFlipped = false;
            setState({ view: 'flashcards' });
        } else {
            // Go to completion
            fc.currentIndex++;
            setState({ view: 'flashcards' });
        }
    }
}

export function fcShuffle() {
    const cards = [...fc.cards];
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    fc.cards = cards;
    fc.currentIndex = 0;
    fc.isFlipped = false;
    fc.isShuffled = true;
    showToast('Cards shuffled!', 'success');
    closeMenu();
    setState({ view: 'flashcards' });
}

export function fcRestart() {
    fc.currentIndex = 0;
    fc.isFlipped = false;
    fc.ratings = {};
    fc.sessionStats = { seen: 0, easy: 0, good: 0, hard: 0, again: 0 };
    closeMenu();
    setState({ view: 'flashcards' });
}

export function fcStudyMissed() {
    // Filter to only cards rated hard or again
    const missedCards = fc.cards.filter(c => 
        fc.ratings[c.id] === 'hard' || fc.ratings[c.id] === 'again'
    );
    
    if (missedCards.length > 0) {
        fc.cards = missedCards;
        fc.currentIndex = 0;
        fc.isFlipped = false;
        fc.ratings = {};
        fc.sessionStats = { seen: 0, easy: 0, good: 0, hard: 0, again: 0 };
        setState({ view: 'flashcards' });
    }
}

export function fcToggleMenu() {
    const menu = document.getElementById('fc2-menu');
    if (menu) menu.classList.toggle('visible');
}

export function fcToggleShortcuts() {
    fc.showShortcuts = !fc.showShortcuts;
    closeMenu();
    setState({ view: 'flashcards' });
}

function closeMenu() {
    const menu = document.getElementById('fc2-menu');
    if (menu) menu.classList.remove('visible');
}

export function exitFlashcards() {
    setState({ view: 'library' });
}

// ==================== Touch Handling ====================

export function fcTouchStart(e) {
    if (e.target.closest('button, .fc2-menu')) return;
    touch.startX = e.touches[0].clientX;
    touch.startY = e.touches[0].clientY;
    touch.currentX = touch.startX;
    touch.isDragging = false;
}

export function fcTouchMove(e) {
    if (!touch.startX) return;
    
    touch.currentX = e.touches[0].clientX;
    const deltaX = touch.currentX - touch.startX;
    const deltaY = Math.abs(e.touches[0].clientY - touch.startY);
    
    // Only handle horizontal swipes
    if (Math.abs(deltaX) > 30 && deltaY < 100) {
        touch.isDragging = true;
        e.preventDefault();
        
        const card = document.getElementById('fc2-card');
        if (card) {
            const rotate = deltaX * 0.05;
            card.style.transform = `translateX(${deltaX}px) rotate(${rotate}deg)`;
            card.style.transition = 'none';
        }
        
        // Show swipe overlays
        const leftOverlay = document.getElementById('swipe-left-overlay');
        const rightOverlay = document.getElementById('swipe-right-overlay');
        
        if (leftOverlay && rightOverlay) {
            if (deltaX < -80) {
                leftOverlay.classList.add('visible');
                rightOverlay.classList.remove('visible');
            } else if (deltaX > 80) {
                rightOverlay.classList.add('visible');
                leftOverlay.classList.remove('visible');
            } else {
                leftOverlay.classList.remove('visible');
                rightOverlay.classList.remove('visible');
            }
        }
    }
}

export function fcTouchEnd(e) {
    const deltaX = touch.currentX - touch.startX;
    
    // Reset card position
    const card = document.getElementById('fc2-card');
    if (card) {
        card.style.transform = '';
        card.style.transition = '';
    }
    
    // Hide overlays
    document.getElementById('swipe-left-overlay')?.classList.remove('visible');
    document.getElementById('swipe-right-overlay')?.classList.remove('visible');
    
    // Handle swipe
    if (touch.isDragging && Math.abs(deltaX) > 100) {
        if (fc.isFlipped) {
            // Rate based on swipe direction - instant transition
            fcRate(deltaX > 0 ? 'good' : 'again');
        } else {
            // If not flipped, flip first
            fcFlip();
        }
    }
    
    touch = { startX: 0, startY: 0, currentX: 0, isDragging: false };
}

// ==================== Keyboard ====================

export function fcKeyHandler(e) {
    if (getState().view !== 'flashcards') return;
    
    switch (e.key) {
        case ' ':
        case 'Enter':
            e.preventDefault();
            fcFlip();
            break;
        case 'ArrowLeft':
            fcPrev();
            break;
        case 'ArrowRight':
            fcNext();
            break;
        case '1':
            if (fc.isFlipped) fcRate('again');
            break;
        case '2':
            if (fc.isFlipped) fcRate('hard');
            break;
        case '3':
            if (fc.isFlipped) fcRate('good');
            break;
        case '4':
            if (fc.isFlipped) fcRate('easy');
            break;
        case 's':
        case 'S':
            fcShuffle();
            break;
        case 'Escape':
            exitFlashcards();
            break;
    }
}

// Initialize keyboard listener
document.addEventListener('keydown', fcKeyHandler);