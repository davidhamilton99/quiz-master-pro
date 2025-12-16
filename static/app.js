/* ============================================
   QUIZ MASTER PRO v4.0
   Complete Rewrite - Modular Architecture
   For CCNA/Networking Students
   ============================================ */

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    APP_NAME: 'Quiz Master Pro',
    VERSION: '4.0.0',
    API_URL: '/api',
    STORAGE_PREFIX: 'qmp_',
    MAX_RECENT_QUIZZES: 10,
    AUTO_SAVE_INTERVAL: 30000,
    QUESTION_TIMER_DEFAULT: 60,
    SRS_INTERVALS: [1, 3, 7, 14, 30, 60],
    COLORS: ['#FF6B2C', '#22D3EE', '#10B981', '#A855F7', '#3B82F6', '#FBBF24'],
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const Utils = {
    // Generate unique ID
    generateId: () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    
    // Deep clone object
    clone: (obj) => JSON.parse(JSON.stringify(obj)),
    
    // Debounce function
    debounce: (fn, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    },
    
    // Throttle function
    throttle: (fn, limit) => {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                fn(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Format time (seconds to MM:SS)
    formatTime: (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
    
    // Format date
    formatDate: (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    },
    
    // Relative time
    relativeTime: (date) => {
        const now = Date.now();
        const diff = now - new Date(date).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return Utils.formatDate(date);
    },
    
    // Shuffle array
    shuffle: (array) => {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },
    
    // Escape HTML
    escapeHtml: (str) => {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
    
    // Parse markdown-like formatting
    parseFormatting: (text) => {
        if (!text) return '';
        return Utils.escapeHtml(text)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    },
    
    // Get letter from index
    getLetter: (index) => String.fromCharCode(65 + index),
    
    // Calculate percentage
    percentage: (value, total) => total > 0 ? Math.round((value / total) * 100) : 0,
    
    // Clamp number
    clamp: (num, min, max) => Math.min(Math.max(num, min), max),
    
    // Random color
    randomColor: () => CONFIG.COLORS[Math.floor(Math.random() * CONFIG.COLORS.length)],
    
    // Check if mobile
    isMobile: () => window.innerWidth <= 768,
    
    // Check touch device
    isTouch: () => 'ontouchstart' in window || navigator.maxTouchPoints > 0,
};

// ============================================
// STORAGE SERVICE
// ============================================

const Storage = {
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(CONFIG.STORAGE_PREFIX + key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage get error:', e);
            return defaultValue;
        }
    },
    
    set: (key, value) => {
        try {
            localStorage.setItem(CONFIG.STORAGE_PREFIX + key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    },
    
    remove: (key) => {
        try {
            localStorage.removeItem(CONFIG.STORAGE_PREFIX + key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    },
    
    clear: () => {
        try {
            Object.keys(localStorage)
                .filter(k => k.startsWith(CONFIG.STORAGE_PREFIX))
                .forEach(k => localStorage.removeItem(k));
            return true;
        } catch (e) {
            console.error('Storage clear error:', e);
            return false;
        }
    }
};

// ============================================
// EVENT BUS (Pub/Sub)
// ============================================

const EventBus = {
    events: {},
    
    on: (event, callback) => {
        if (!EventBus.events[event]) {
            EventBus.events[event] = [];
        }
        EventBus.events[event].push(callback);
        return () => EventBus.off(event, callback);
    },
    
    off: (event, callback) => {
        if (!EventBus.events[event]) return;
        EventBus.events[event] = EventBus.events[event].filter(cb => cb !== callback);
    },
    
    emit: (event, data) => {
        if (!EventBus.events[event]) return;
        EventBus.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (e) {
                console.error(`Event handler error for ${event}:`, e);
            }
        });
    }
};

// ============================================
// STATE MANAGEMENT
// ============================================

const createStore = (initialState) => {
    let state = { ...initialState };
    const listeners = new Set();
    
    return {
        getState: () => state,
        
        setState: (newState) => {
            const prevState = state;
            state = typeof newState === 'function' 
                ? { ...state, ...newState(state) }
                : { ...state, ...newState };
            listeners.forEach(listener => listener(state, prevState));
        },
        
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        
        reset: () => {
            state = { ...initialState };
            listeners.forEach(listener => listener(state, initialState));
        }
    };
};

// Global Application State
const AppState = createStore({
    // App state
    initialized: false,
    loading: false,
    error: null,
    currentView: 'library',
    
    // User
    user: null,
    isAuthenticated: false,
    
    // Quizzes
    quizzes: [],
    currentQuiz: null,
    
    // Quiz session
    session: null,
    
    // UI state
    modal: null,
    dropdown: null,
    sidebarOpen: false,
    
    // Analytics
    stats: {
        totalQuizzes: 0,
        totalQuestions: 0,
        questionsAnswered: 0,
        correctAnswers: 0,
        streak: 0,
        lastStudyDate: null
    },
    
    // SRS data
    srsData: {},
    
    // Multiplayer
    multiplayer: {
        active: false,
        roomCode: null,
        players: [],
        isHost: false,
        gameState: null
    }
});

// ============================================
// TOAST NOTIFICATIONS
// ============================================

const Toast = {
    container: null,
    
    init: () => {
        Toast.container = document.getElementById('toast-container');
    },
    
    show: (message, type = 'info', duration = 4000) => {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${Utils.escapeHtml(message)}</span>
            <button class="toast-close" aria-label="Close">×</button>
        `;
        
        toast.querySelector('.toast-close').onclick = () => Toast.dismiss(toast);
        Toast.container.appendChild(toast);
        
        if (duration > 0) {
            setTimeout(() => Toast.dismiss(toast), duration);
        }
        
        return toast;
    },
    
    dismiss: (toast) => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    },
    
    success: (msg) => Toast.show(msg, 'success'),
    error: (msg) => Toast.show(msg, 'error'),
    warning: (msg) => Toast.show(msg, 'warning'),
    info: (msg) => Toast.show(msg, 'info')
};

// ============================================
// LOADING OVERLAY
// ============================================

const Loading = {
    overlay: null,
    
    init: () => {
        Loading.overlay = document.getElementById('loading-overlay');
    },
    
    show: (text = 'Loading...') => {
        if (Loading.overlay) {
            Loading.overlay.querySelector('.spinner-text').textContent = text;
            Loading.overlay.classList.remove('hidden');
        }
        AppState.setState({ loading: true });
    },
    
    hide: () => {
        if (Loading.overlay) {
            Loading.overlay.classList.add('hidden');
        }
        AppState.setState({ loading: false });
    }
};

// ============================================
// MODAL SYSTEM
// ============================================

const Modal = {
    show: (options) => {
        const {
            title,
            content,
            size = '',
            actions = [],
            onClose = () => {},
            closable = true
        } = options;
        
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal ${size ? `modal-${size}` : ''}">
                <div class="modal-header">
                    <h2>${Utils.escapeHtml(title)}</h2>
                    ${closable ? '<button class="btn btn-ghost btn-icon modal-close" aria-label="Close">×</button>' : ''}
                </div>
                <div class="modal-body">
                    ${typeof content === 'string' ? content : ''}
                </div>
                ${actions.length > 0 ? `
                    <div class="modal-footer">
                        ${actions.map(action => `
                            <button class="btn ${action.variant || 'btn-secondary'}" data-action="${action.id}">
                                ${Utils.escapeHtml(action.label)}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        // Handle content as element
        if (typeof content !== 'string' && content instanceof HTMLElement) {
            overlay.querySelector('.modal-body').appendChild(content);
        }
        
        // Close handlers
        if (closable) {
            overlay.querySelector('.modal-close').onclick = () => Modal.close(overlay, onClose);
            overlay.onclick = (e) => {
                if (e.target === overlay) Modal.close(overlay, onClose);
            };
        }
        
        // Action handlers
        actions.forEach(action => {
            const btn = overlay.querySelector(`[data-action="${action.id}"]`);
            if (btn && action.handler) {
                btn.onclick = () => action.handler(overlay);
            }
        });
        
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
        
        // Focus first button
        const firstBtn = overlay.querySelector('.modal-footer .btn');
        if (firstBtn) firstBtn.focus();
        
        AppState.setState({ modal: overlay });
        return overlay;
    },
    
    close: (overlay, callback) => {
        if (!overlay) overlay = AppState.getState().modal;
        if (!overlay) return;
        
        overlay.remove();
        document.body.style.overflow = '';
        AppState.setState({ modal: null });
        
        if (callback) callback();
    },
    
    confirm: (options) => {
        return new Promise((resolve) => {
            Modal.show({
                title: options.title || 'Confirm',
                content: `<p>${Utils.escapeHtml(options.message)}</p>`,
                actions: [
                    {
                        id: 'cancel',
                        label: options.cancelText || 'Cancel',
                        variant: 'btn-secondary',
                        handler: (modal) => {
                            Modal.close(modal);
                            resolve(false);
                        }
                    },
                    {
                        id: 'confirm',
                        label: options.confirmText || 'Confirm',
                        variant: options.danger ? 'btn-danger' : 'btn-primary',
                        handler: (modal) => {
                            Modal.close(modal);
                            resolve(true);
                        }
                    }
                ],
                onClose: () => resolve(false)
            });
        });
    }
};

// ============================================
// QUIZ PARSER
// ============================================

const QuizParser = {
    // Parse quiz text format
    parse: (text) => {
        const questions = [];
        const lines = text.trim().split('\n');
        let current = null;
        let inCode = false;
        let codeContent = '';
        let codeType = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            // Handle code blocks
            if (trimmed.startsWith('[code')) {
                inCode = true;
                codeType = trimmed.match(/\[code(?::(\w+))?\]/)?.[1] || 'text';
                codeContent = '';
                continue;
            }
            
            if (trimmed === '[/code]') {
                inCode = false;
                if (current) {
                    current.code = { content: codeContent.trim(), type: codeType };
                }
                continue;
            }
            
            if (inCode) {
                codeContent += line + '\n';
                continue;
            }
            
            // Question number pattern
            const questionMatch = trimmed.match(/^(\d+)\.\s*(?:\[(order|matching|ios|multi|fillblank|truefalse|subnet|acl)\])?\s*(.+)/i);
            
            if (questionMatch) {
                if (current) questions.push(current);
                
                const typeTag = questionMatch[2]?.toLowerCase();
                current = {
                    id: Utils.generateId(),
                    number: parseInt(questionMatch[1]),
                    text: questionMatch[3],
                    type: QuizParser.mapType(typeTag),
                    options: [],
                    correctAnswers: [],
                    explanation: '',
                    code: null,
                    matchingPairs: [],
                    orderItems: [],
                    iosConfig: null,
                    blankAnswers: [],
                    subnetConfig: null
                };
                continue;
            }
            
            if (!current) continue;
            
            // Option pattern (A. B. C. etc.)
            const optionMatch = trimmed.match(/^([A-Z])\.\s*(.+?)(\s*\*)?$/);
            if (optionMatch) {
                current.options.push({
                    letter: optionMatch[1],
                    text: optionMatch[2],
                    isCorrect: !!optionMatch[3]
                });
                if (optionMatch[3]) {
                    current.correctAnswers.push(optionMatch[1]);
                }
                continue;
            }
            
            // Order items (numbered list)
            const orderMatch = trimmed.match(/^(\d+)\)\s*(.+)/);
            if (orderMatch && current.type === 'order') {
                current.orderItems.push({
                    position: parseInt(orderMatch[1]),
                    text: orderMatch[2]
                });
                continue;
            }
            
            // Matching pairs (A = B format)
            const matchMatch = trimmed.match(/^([A-Z])\.\s*(.+?)\s*=\s*([A-Z0-9]+)\s*\*?$/i);
            if (matchMatch && current.type === 'matching') {
                current.matchingPairs.push({
                    term: matchMatch[1],
                    termText: matchMatch[2],
                    definition: matchMatch[3].toUpperCase()
                });
                continue;
            }
            
            // Definitions for matching
            if (trimmed.toLowerCase().startsWith('definitions:')) {
                continue;
            }
            
            const defMatch = trimmed.match(/^([A-Z0-9]+)\)\s*(.+)/);
            if (defMatch && current.type === 'matching') {
                if (!current.definitions) current.definitions = [];
                current.definitions.push({
                    id: defMatch[1],
                    text: defMatch[2]
                });
                continue;
            }
            
            // True/False
            if (current.type === 'truefalse') {
                if (trimmed.toLowerCase() === 'true *' || trimmed.toLowerCase() === 't *') {
                    current.correctAnswers = ['true'];
                } else if (trimmed.toLowerCase() === 'false *' || trimmed.toLowerCase() === 'f *') {
                    current.correctAnswers = ['false'];
                }
                continue;
            }
            
            // Fill in blank answers
            const blankMatch = trimmed.match(/^blank\s*(\d*):\s*(.+)/i);
            if (blankMatch && current.type === 'fillblank') {
                const answers = blankMatch[2].split(',').map(a => a.trim().toLowerCase());
                current.blankAnswers.push(answers);
                continue;
            }
            
            // IOS configuration
            if (trimmed.toLowerCase().startsWith('expected:') && current.type === 'ios') {
                if (!current.iosConfig) current.iosConfig = { expected: [], mode: 'any' };
                const commands = trimmed.substring(9).split(',').map(c => c.trim());
                current.iosConfig.expected.push(...commands);
                continue;
            }
            
            // Subnet configuration
            if (current.type === 'subnet' && trimmed.startsWith('network:')) {
                if (!current.subnetConfig) current.subnetConfig = {};
                current.subnetConfig.network = trimmed.substring(8).trim();
                continue;
            }
            
            // ACL configuration
            if (current.type === 'acl' && trimmed.startsWith('scenario:')) {
                if (!current.aclConfig) current.aclConfig = {};
                current.aclConfig.scenario = trimmed.substring(9).trim();
                continue;
            }
            
            // Explanation
            if (trimmed.toLowerCase().startsWith('explanation:')) {
                current.explanation = trimmed.substring(12).trim();
                continue;
            }
            
            // Continue explanation on next lines
            if (current.explanation && trimmed && !trimmed.match(/^[A-Z]\.|^\d+\./)) {
                current.explanation += ' ' + trimmed;
            }
        }
        
        if (current) questions.push(current);
        
        // Post-process questions
        return questions.map(q => QuizParser.postProcess(q));
    },
    
    mapType: (tag) => {
        const typeMap = {
            'order': 'order',
            'matching': 'matching',
            'ios': 'ios',
            'multi': 'multiple',
            'fillblank': 'fillblank',
            'truefalse': 'truefalse',
            'subnet': 'subnet',
            'acl': 'acl'
        };
        return typeMap[tag] || 'choice';
    },
    
    postProcess: (question) => {
        // Determine if single or multiple choice
        if (question.type === 'choice') {
            if (question.correctAnswers.length > 1) {
                question.type = 'multiple';
            }
        }
        
        // Validate order questions
        if (question.type === 'order' && question.orderItems.length === 0) {
            // Convert options to order items if needed
            question.orderItems = question.options.map((opt, i) => ({
                position: i + 1,
                text: opt.text
            }));
        }
        
        // Setup true/false options
        if (question.type === 'truefalse') {
            question.options = [
                { letter: 'T', text: 'True', isCorrect: question.correctAnswers.includes('true') },
                { letter: 'F', text: 'False', isCorrect: question.correctAnswers.includes('false') }
            ];
        }
        
        return question;
    },
    
    // Convert questions back to text format
    serialize: (questions) => {
        return questions.map((q, i) => {
            let text = `${i + 1}. `;
            
            // Add type tag
            if (q.type !== 'choice') {
                text += `[${q.type}] `;
            }
            
            text += q.text + '\n';
            
            // Add code block
            if (q.code) {
                text += `[code${q.code.type !== 'text' ? ':' + q.code.type : ''}]\n`;
                text += q.code.content + '\n';
                text += '[/code]\n';
            }
            
            // Add options based on type
            if (q.type === 'order') {
                q.orderItems.forEach((item, idx) => {
                    text += `${idx + 1}) ${item.text}\n`;
                });
            } else if (q.type === 'matching') {
                q.matchingPairs.forEach(pair => {
                    text += `${pair.term}. ${pair.termText} = ${pair.definition} *\n`;
                });
                if (q.definitions) {
                    text += 'Definitions:\n';
                    q.definitions.forEach(def => {
                        text += `${def.id}) ${def.text}\n`;
                    });
                }
            } else {
                q.options.forEach(opt => {
                    text += `${opt.letter}. ${opt.text}${opt.isCorrect ? ' *' : ''}\n`;
                });
            }
            
            if (q.explanation) {
                text += `Explanation: ${q.explanation}\n`;
            }
            
            return text;
        }).join('\n');
    }
};

// ============================================
// QUIZ SERVICE
// ============================================

const QuizService = {
    // Get all quizzes
    getAll: () => {
        return Storage.get('quizzes', []);
    },
    
    // Get quiz by ID
    getById: (id) => {
        const quizzes = QuizService.getAll();
        return quizzes.find(q => q.id === id);
    },
    
    // Create new quiz
    create: (data) => {
        const quiz = {
            id: Utils.generateId(),
            title: data.title || 'Untitled Quiz',
            description: data.description || '',
            questions: data.questions || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            color: data.color || Utils.randomColor(),
            icon: data.icon || '📚',
            tags: data.tags || [],
            settings: {
                shuffleQuestions: false,
                shuffleOptions: false,
                showExplanations: true,
                timerEnabled: false,
                timerSeconds: 60,
                ...data.settings
            },
            stats: {
                attempts: 0,
                bestScore: 0,
                avgScore: 0,
                lastAttempt: null
            }
        };
        
        const quizzes = QuizService.getAll();
        quizzes.unshift(quiz);
        Storage.set('quizzes', quizzes);
        
        AppState.setState({ quizzes });
        EventBus.emit('quiz:created', quiz);
        
        return quiz;
    },
    
    // Update quiz
    update: (id, data) => {
        const quizzes = QuizService.getAll();
        const index = quizzes.findIndex(q => q.id === id);
        
        if (index === -1) return null;
        
        quizzes[index] = {
            ...quizzes[index],
            ...data,
            updatedAt: new Date().toISOString()
        };
        
        Storage.set('quizzes', quizzes);
        AppState.setState({ quizzes });
        EventBus.emit('quiz:updated', quizzes[index]);
        
        return quizzes[index];
    },
    
    // Delete quiz
    delete: async (id) => {
        const confirmed = await Modal.confirm({
            title: 'Delete Quiz',
            message: 'Are you sure you want to delete this quiz? This cannot be undone.',
            confirmText: 'Delete',
            danger: true
        });
        
        if (!confirmed) return false;
        
        const quizzes = QuizService.getAll().filter(q => q.id !== id);
        Storage.set('quizzes', quizzes);
        
        // Also delete SRS data
        Storage.remove(`srs_${id}`);
        
        AppState.setState({ quizzes });
        EventBus.emit('quiz:deleted', id);
        Toast.success('Quiz deleted');
        
        return true;
    },
    
    // Import quiz from text
    importFromText: (text, title = 'Imported Quiz') => {
        const questions = QuizParser.parse(text);
        if (questions.length === 0) {
            Toast.error('No questions found in the text');
            return null;
        }
        
        return QuizService.create({
            title,
            questions,
            description: `${questions.length} questions`
        });
    },
    
    // Export quiz to text
    exportToText: (id) => {
        const quiz = QuizService.getById(id);
        if (!quiz) return null;
        return QuizParser.serialize(quiz.questions);
    },
    
    // Duplicate quiz
    duplicate: (id) => {
        const original = QuizService.getById(id);
        if (!original) return null;
        
        return QuizService.create({
            ...Utils.clone(original),
            title: `${original.title} (Copy)`,
            id: undefined,
            createdAt: undefined,
            updatedAt: undefined,
            stats: undefined
        });
    }
};

// ============================================
// QUIZ SESSION MANAGER
// ============================================

const SessionManager = {
    // Start new quiz session
    start: (quizId, options = {}) => {
        const quiz = QuizService.getById(quizId);
        if (!quiz) {
            Toast.error('Quiz not found');
            return null;
        }
        
        let questions = Utils.clone(quiz.questions);
        
        // Apply shuffle if enabled
        if (quiz.settings.shuffleQuestions || options.shuffle) {
            questions = Utils.shuffle(questions);
        }
        
        // Shuffle options within each question
        if (quiz.settings.shuffleOptions) {
            questions = questions.map(q => {
                if (q.options && q.options.length > 0) {
                    q.options = Utils.shuffle(q.options);
                }
                return q;
            });
        }
        
        const session = {
            id: Utils.generateId(),
            quizId,
            quizTitle: quiz.title,
            mode: options.mode || 'quiz', // 'quiz', 'study', 'srs'
            questions,
            currentIndex: 0,
            answers: {},
            flagged: new Set(),
            startTime: Date.now(),
            endTime: null,
            timerEnabled: quiz.settings.timerEnabled,
            timerSeconds: quiz.settings.timerSeconds,
            showExplanations: quiz.settings.showExplanations,
            isComplete: false,
            results: null
        };
        
        AppState.setState({ 
            session,
            currentView: 'quiz'
        });
        
        EventBus.emit('session:started', session);
        return session;
    },
    
    // Get current question
    getCurrentQuestion: () => {
        const { session } = AppState.getState();
        if (!session) return null;
        return session.questions[session.currentIndex];
    },
    
    // Submit answer for current question
    submitAnswer: (answer) => {
        const { session } = AppState.getState();
        if (!session || session.isComplete) return;
        
        const question = session.questions[session.currentIndex];
        
        AppState.setState({
            session: {
                ...session,
                answers: {
                    ...session.answers,
                    [question.id]: answer
                }
            }
        });
        
        EventBus.emit('answer:submitted', { questionId: question.id, answer });
    },
    
    // Navigate to question
    goToQuestion: (index) => {
        const { session } = AppState.getState();
        if (!session) return;
        
        const newIndex = Utils.clamp(index, 0, session.questions.length - 1);
        
        AppState.setState({
            session: { ...session, currentIndex: newIndex }
        });
        
        EventBus.emit('question:changed', newIndex);
    },
    
    // Navigate next/prev
    next: () => {
        const { session } = AppState.getState();
        if (!session) return;
        SessionManager.goToQuestion(session.currentIndex + 1);
    },
    
    prev: () => {
        const { session } = AppState.getState();
        if (!session) return;
        SessionManager.goToQuestion(session.currentIndex - 1);
    },
    
    // Toggle flag on current question
    toggleFlag: () => {
        const { session } = AppState.getState();
        if (!session) return;
        
        const question = session.questions[session.currentIndex];
        const flagged = new Set(session.flagged);
        
        if (flagged.has(question.id)) {
            flagged.delete(question.id);
        } else {
            flagged.add(question.id);
        }
        
        AppState.setState({
            session: { ...session, flagged }
        });
    },
    
    // Check answer correctness
    checkAnswer: (question, answer) => {
        if (!answer) return false;
        
        switch (question.type) {
            case 'choice':
                return question.correctAnswers.includes(answer);
                
            case 'multiple':
                if (!Array.isArray(answer)) return false;
                const correct = new Set(question.correctAnswers);
                const selected = new Set(answer);
                return correct.size === selected.size && 
                       [...correct].every(a => selected.has(a));
                
            case 'order':
                if (!Array.isArray(answer)) return false;
                return answer.every((item, i) => item.position === i + 1);
                
            case 'matching':
                if (typeof answer !== 'object') return false;
                return question.matchingPairs.every(pair => 
                    answer[pair.term] === pair.definition
                );
                
            case 'truefalse':
                return question.correctAnswers.includes(answer.toLowerCase());
                
            case 'fillblank':
                if (!Array.isArray(answer)) return false;
                return question.blankAnswers.every((accepted, i) => 
                    accepted.includes(answer[i]?.toLowerCase())
                );
                
            case 'ios':
                // IOS questions are checked differently
                return answer.success === true;
                
            default:
                return false;
        }
    },
    
    // Finish session and calculate results
    finish: () => {
        const { session } = AppState.getState();
        if (!session) return null;
        
        let correct = 0;
        const questionResults = session.questions.map(q => {
            const answer = session.answers[q.id];
            const isCorrect = SessionManager.checkAnswer(q, answer);
            if (isCorrect) correct++;
            
            return {
                question: q,
                answer,
                isCorrect
            };
        });
        
        const results = {
            totalQuestions: session.questions.length,
            correctAnswers: correct,
            score: Utils.percentage(correct, session.questions.length),
            timeTaken: Date.now() - session.startTime,
            questionResults
        };
        
        // Update quiz stats
        const quiz = QuizService.getById(session.quizId);
        if (quiz) {
            const newStats = {
                attempts: quiz.stats.attempts + 1,
                bestScore: Math.max(quiz.stats.bestScore, results.score),
                avgScore: Math.round(
                    (quiz.stats.avgScore * quiz.stats.attempts + results.score) / 
                    (quiz.stats.attempts + 1)
                ),
                lastAttempt: new Date().toISOString()
            };
            QuizService.update(session.quizId, { stats: newStats });
        }
        
        // Update global stats
        const stats = AppState.getState().stats;
        AppState.setState({
            session: { ...session, isComplete: true, endTime: Date.now(), results },
            currentView: 'results',
            stats: {
                ...stats,
                questionsAnswered: stats.questionsAnswered + session.questions.length,
                correctAnswers: stats.correctAnswers + correct
            }
        });
        
        // Save stats
        Storage.set('stats', AppState.getState().stats);
        
        EventBus.emit('session:finished', results);
        return results;
    },
    
    // End session without finishing
    quit: async () => {
        const { session } = AppState.getState();
        if (!session) return;
        
        const answered = Object.keys(session.answers).length;
        if (answered > 0) {
            const confirmed = await Modal.confirm({
                title: 'Quit Quiz?',
                message: `You've answered ${answered} of ${session.questions.length} questions. Your progress will be lost.`,
                confirmText: 'Quit',
                danger: true
            });
            if (!confirmed) return;
        }
        
        AppState.setState({
            session: null,
            currentView: 'library'
        });
        
        EventBus.emit('session:quit');
    }
};

// Continue in Part 2...

// ============================================
// SRS (SPACED REPETITION SYSTEM)
// ============================================

const SRSService = {
    // Get SRS data for a quiz
    getData: (quizId) => {
        return Storage.get(`srs_${quizId}`, {});
    },
    
    // Save SRS data
    saveData: (quizId, data) => {
        Storage.set(`srs_${quizId}`, data);
    },
    
    // Get cards due for review
    getDueCards: (quizId) => {
        const quiz = QuizService.getById(quizId);
        if (!quiz) return [];
        
        const srsData = SRSService.getData(quizId);
        const now = Date.now();
        
        return quiz.questions.filter(q => {
            const card = srsData[q.id];
            if (!card) return true; // New card
            return card.nextReview <= now;
        });
    },
    
    // Update card after review
    updateCard: (quizId, questionId, quality) => {
        // quality: 0-5 (0=complete blackout, 5=perfect)
        const srsData = SRSService.getData(quizId);
        const card = srsData[questionId] || {
            ease: 2.5,
            interval: 0,
            repetitions: 0,
            nextReview: Date.now()
        };
        
        // SM-2 Algorithm
        if (quality >= 3) {
            // Correct response
            if (card.repetitions === 0) {
                card.interval = 1;
            } else if (card.repetitions === 1) {
                card.interval = 6;
            } else {
                card.interval = Math.round(card.interval * card.ease);
            }
            card.repetitions++;
            card.ease = Math.max(1.3, card.ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        } else {
            // Incorrect response
            card.repetitions = 0;
            card.interval = 1;
        }
        
        card.nextReview = Date.now() + card.interval * 24 * 60 * 60 * 1000;
        card.lastReview = Date.now();
        
        srsData[questionId] = card;
        SRSService.saveData(quizId, srsData);
        
        return card;
    },
    
    // Get mastery level (0-5 stars)
    getMasteryLevel: (quizId, questionId) => {
        const srsData = SRSService.getData(quizId);
        const card = srsData[questionId];
        if (!card) return 0;
        
        if (card.interval >= 30) return 5;
        if (card.interval >= 14) return 4;
        if (card.interval >= 7) return 3;
        if (card.interval >= 3) return 2;
        if (card.repetitions >= 1) return 1;
        return 0;
    },
    
    // Get overall quiz mastery
    getQuizMastery: (quizId) => {
        const quiz = QuizService.getById(quizId);
        if (!quiz || quiz.questions.length === 0) return 0;
        
        const totalStars = quiz.questions.reduce((sum, q) => 
            sum + SRSService.getMasteryLevel(quizId, q.id), 0);
        
        return Utils.percentage(totalStars, quiz.questions.length * 5);
    }
};

// ============================================
// ANALYTICS SERVICE
// ============================================

const Analytics = {
    // Get overall stats
    getStats: () => {
        const stats = Storage.get('stats', {
            totalQuizzes: 0,
            totalQuestions: 0,
            questionsAnswered: 0,
            correctAnswers: 0,
            streak: 0,
            lastStudyDate: null,
            studyHistory: []
        });
        
        // Update streak
        const today = new Date().toDateString();
        const lastStudy = stats.lastStudyDate ? new Date(stats.lastStudyDate).toDateString() : null;
        
        if (lastStudy === today) {
            // Already studied today
        } else if (lastStudy === new Date(Date.now() - 86400000).toDateString()) {
            // Studied yesterday, maintain streak
        } else if (lastStudy !== today) {
            // Streak broken
            stats.streak = 0;
        }
        
        return stats;
    },
    
    // Record study session
    recordStudy: (quizId, questionsAnswered, correctAnswers) => {
        const stats = Analytics.getStats();
        const today = new Date().toDateString();
        
        // Update streak
        if (stats.lastStudyDate !== today) {
            const lastStudy = stats.lastStudyDate ? new Date(stats.lastStudyDate).toDateString() : null;
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            
            if (lastStudy === yesterday) {
                stats.streak++;
            } else {
                stats.streak = 1;
            }
            stats.lastStudyDate = today;
        }
        
        stats.questionsAnswered += questionsAnswered;
        stats.correctAnswers += correctAnswers;
        
        // Add to history
        if (!stats.studyHistory) stats.studyHistory = [];
        stats.studyHistory.push({
            date: new Date().toISOString(),
            quizId,
            questionsAnswered,
            correctAnswers
        });
        
        // Keep only last 90 days
        const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
        stats.studyHistory = stats.studyHistory.filter(h => 
            new Date(h.date).getTime() > cutoff
        );
        
        Storage.set('stats', stats);
        AppState.setState({ stats });
        
        return stats;
    },
    
    // Get study heatmap data
    getHeatmapData: (days = 84) => {
        const stats = Analytics.getStats();
        const history = stats.studyHistory || [];
        const heatmap = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            
            const dayActivity = history.filter(h => 
                h.date.startsWith(dateStr)
            );
            
            const questions = dayActivity.reduce((sum, h) => sum + h.questionsAnswered, 0);
            
            let level = 0;
            if (questions > 0) level = 1;
            if (questions >= 10) level = 2;
            if (questions >= 25) level = 3;
            if (questions >= 50) level = 4;
            
            heatmap.push({ date: dateStr, level, questions });
        }
        
        return heatmap;
    },
    
    // Get performance by question type
    getPerformanceByType: () => {
        const quizzes = QuizService.getAll();
        const performance = {};
        
        quizzes.forEach(quiz => {
            quiz.questions.forEach(q => {
                if (!performance[q.type]) {
                    performance[q.type] = { total: 0, correct: 0 };
                }
                performance[q.type].total++;
            });
        });
        
        return performance;
    }
};

// ============================================
// IOS SIMULATOR
// ============================================

const IOSSimulator = {
    // Command definitions with patterns and expected outputs
    commands: {
        'enable': {
            pattern: /^enable$/i,
            mode: 'privileged',
            output: ''
        },
        'configure terminal': {
            pattern: /^conf(?:igure)?\s*t(?:erminal)?$/i,
            mode: 'config',
            output: 'Enter configuration commands, one per line. End with CNTL/Z.'
        },
        'exit': {
            pattern: /^exit$/i,
            action: 'exit',
            output: ''
        },
        'end': {
            pattern: /^end$/i,
            mode: 'privileged',
            output: ''
        },
        'show running-config': {
            pattern: /^sh(?:ow)?\s*run(?:ning-config)?$/i,
            output: (state) => IOSSimulator.generateRunningConfig(state)
        },
        'show ip route': {
            pattern: /^sh(?:ow)?\s*ip\s*route$/i,
            output: (state) => IOSSimulator.generateRouteTable(state)
        },
        'show ip interface brief': {
            pattern: /^sh(?:ow)?\s*ip\s*int(?:erface)?\s*br(?:ief)?$/i,
            output: (state) => IOSSimulator.generateInterfaceBrief(state)
        },
        'show interfaces': {
            pattern: /^sh(?:ow)?\s*int(?:erfaces)?(?:\s+(\S+))?$/i,
            output: (state, match) => IOSSimulator.generateInterfaceDetail(state, match[1])
        },
        'show vlan': {
            pattern: /^sh(?:ow)?\s*vlan(?:\s*brief)?$/i,
            output: (state) => IOSSimulator.generateVlanTable(state)
        },
        'interface': {
            pattern: /^int(?:erface)?\s+(\S+)$/i,
            mode: 'config-if',
            action: (state, match) => {
                state.currentInterface = match[1];
                if (!state.interfaces[match[1]]) {
                    state.interfaces[match[1]] = { ip: null, mask: null, status: 'up', description: '' };
                }
            }
        },
        'ip address': {
            pattern: /^ip\s*add(?:ress)?\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)$/i,
            action: (state, match) => {
                if (state.currentInterface && state.interfaces[state.currentInterface]) {
                    state.interfaces[state.currentInterface].ip = match[1];
                    state.interfaces[state.currentInterface].mask = match[2];
                }
            }
        },
        'no shutdown': {
            pattern: /^no\s*shut(?:down)?$/i,
            action: (state) => {
                if (state.currentInterface && state.interfaces[state.currentInterface]) {
                    state.interfaces[state.currentInterface].status = 'up';
                }
            }
        },
        'shutdown': {
            pattern: /^shut(?:down)?$/i,
            action: (state) => {
                if (state.currentInterface && state.interfaces[state.currentInterface]) {
                    state.interfaces[state.currentInterface].status = 'administratively down';
                }
            }
        },
        'hostname': {
            pattern: /^hostname\s+(\S+)$/i,
            action: (state, match) => { state.hostname = match[1]; }
        },
        'ip route': {
            pattern: /^ip\s*route\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)\s+(\S+)$/i,
            action: (state, match) => {
                state.routes.push({
                    network: match[1],
                    mask: match[2],
                    nextHop: match[3]
                });
            }
        },
        'router ospf': {
            pattern: /^router\s+ospf\s+(\d+)$/i,
            mode: 'config-router',
            action: (state, match) => {
                state.ospf = state.ospf || { processId: match[1], networks: [] };
            }
        },
        'network ospf': {
            pattern: /^network\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)\s+area\s+(\d+)$/i,
            action: (state, match) => {
                if (state.ospf) {
                    state.ospf.networks.push({
                        network: match[1],
                        wildcard: match[2],
                        area: match[3]
                    });
                }
            }
        },
        'router eigrp': {
            pattern: /^router\s+eigrp\s+(\d+)$/i,
            mode: 'config-router',
            action: (state, match) => {
                state.eigrp = state.eigrp || { as: match[1], networks: [] };
            }
        },
        'access-list': {
            pattern: /^access-list\s+(\d+)\s+(permit|deny)\s+(.+)$/i,
            action: (state, match) => {
                if (!state.acls) state.acls = {};
                if (!state.acls[match[1]]) state.acls[match[1]] = [];
                state.acls[match[1]].push({
                    action: match[2],
                    condition: match[3]
                });
            }
        },
        'vlan': {
            pattern: /^vlan\s+(\d+)$/i,
            mode: 'config-vlan',
            action: (state, match) => {
                state.currentVlan = match[1];
                if (!state.vlans) state.vlans = {};
                if (!state.vlans[match[1]]) {
                    state.vlans[match[1]] = { name: `VLAN${match[1]}`, ports: [] };
                }
            }
        },
        'name vlan': {
            pattern: /^name\s+(\S+)$/i,
            action: (state, match) => {
                if (state.currentVlan && state.vlans[state.currentVlan]) {
                    state.vlans[state.currentVlan].name = match[1];
                }
            }
        },
        'switchport mode': {
            pattern: /^switchport\s+mode\s+(access|trunk)$/i,
            action: (state, match) => {
                if (state.currentInterface) {
                    if (!state.switchports) state.switchports = {};
                    state.switchports[state.currentInterface] = {
                        ...state.switchports[state.currentInterface],
                        mode: match[1]
                    };
                }
            }
        },
        'switchport access vlan': {
            pattern: /^switchport\s+access\s+vlan\s+(\d+)$/i,
            action: (state, match) => {
                if (state.currentInterface) {
                    if (!state.switchports) state.switchports = {};
                    state.switchports[state.currentInterface] = {
                        ...state.switchports[state.currentInterface],
                        vlan: match[1]
                    };
                }
            }
        }
    },
    
    // Create new simulator instance
    createInstance: (hostname = 'Router') => {
        return {
            hostname,
            mode: 'user', // user, privileged, config, config-if, config-router, config-vlan
            interfaces: {
                'GigabitEthernet0/0': { ip: null, mask: null, status: 'administratively down', description: '' },
                'GigabitEthernet0/1': { ip: null, mask: null, status: 'administratively down', description: '' }
            },
            routes: [],
            ospf: null,
            eigrp: null,
            acls: {},
            vlans: { '1': { name: 'default', ports: [] } },
            switchports: {},
            currentInterface: null,
            currentVlan: null,
            history: [],
            output: []
        };
    },
    
    // Get prompt for current mode
    getPrompt: (state) => {
        const modes = {
            'user': `${state.hostname}>`,
            'privileged': `${state.hostname}#`,
            'config': `${state.hostname}(config)#`,
            'config-if': `${state.hostname}(config-if)#`,
            'config-router': `${state.hostname}(config-router)#`,
            'config-vlan': `${state.hostname}(config-vlan)#`
        };
        return modes[state.mode] || `${state.hostname}>`;
    },
    
    // Execute command
    execute: (state, input) => {
        const command = input.trim();
        if (!command) return { state, output: '' };
        
        state.history.push(command);
        
        // Handle ? for help
        if (command === '?') {
            return { state, output: IOSSimulator.getHelp(state) };
        }
        
        // Handle exit
        if (command.toLowerCase() === 'exit') {
            return IOSSimulator.handleExit(state);
        }
        
        // Handle end
        if (command.toLowerCase() === 'end') {
            state.mode = 'privileged';
            state.currentInterface = null;
            state.currentVlan = null;
            return { state, output: '' };
        }
        
        // Try to match command
        for (const [name, def] of Object.entries(IOSSimulator.commands)) {
            const match = command.match(def.pattern);
            if (match) {
                // Execute action if defined
                if (def.action && typeof def.action === 'function') {
                    def.action(state, match);
                }
                
                // Change mode if specified
                if (def.mode) {
                    state.mode = def.mode;
                }
                
                // Generate output
                let output = '';
                if (typeof def.output === 'function') {
                    output = def.output(state, match);
                } else if (def.output) {
                    output = def.output;
                }
                
                return { state, output };
            }
        }
        
        // Command not recognized
        return { 
            state, 
            output: `% Invalid input detected at '^' marker.\n\n${command}\n^`
        };
    },
    
    // Handle exit command based on mode
    handleExit: (state) => {
        const modeTransitions = {
            'config-if': 'config',
            'config-router': 'config',
            'config-vlan': 'config',
            'config': 'privileged',
            'privileged': 'user'
        };
        
        state.currentInterface = null;
        state.currentVlan = null;
        state.mode = modeTransitions[state.mode] || 'user';
        
        return { state, output: '' };
    },
    
    // Generate help output
    getHelp: (state) => {
        const helpText = {
            'user': `Exec commands:
  enable        Turn on privileged commands
  exit          Exit from the EXEC
  show          Show running system information`,
            'privileged': `Exec commands:
  configure     Enter configuration mode
  exit          Exit from the EXEC
  show          Show running system information
  copy          Copy configuration or image data`,
            'config': `Configure commands:
  exit          Exit from configure mode
  hostname      Set system's network name
  interface     Select an interface to configure
  ip            Global IP configuration
  router        Enable a routing process
  access-list   Add an access list entry
  vlan          VLAN commands`,
            'config-if': `Interface configuration commands:
  exit          Exit from interface configuration
  ip            Interface IP configuration
  no            Negate a command
  shutdown      Shutdown the interface
  switchport    Set switching mode characteristics`
        };
        
        return helpText[state.mode] || 'No help available';
    },
    
    // Generate running config output
    generateRunningConfig: (state) => {
        let config = `Building configuration...\n\nCurrent configuration:\n!\nhostname ${state.hostname}\n!\n`;
        
        // Interfaces
        for (const [name, iface] of Object.entries(state.interfaces)) {
            config += `interface ${name}\n`;
            if (iface.description) config += ` description ${iface.description}\n`;
            if (iface.ip) config += ` ip address ${iface.ip} ${iface.mask}\n`;
            if (iface.status === 'administratively down') config += ` shutdown\n`;
            config += '!\n';
        }
        
        // Routes
        state.routes.forEach(route => {
            config += `ip route ${route.network} ${route.mask} ${route.nextHop}\n`;
        });
        
        // OSPF
        if (state.ospf) {
            config += `!\nrouter ospf ${state.ospf.processId}\n`;
            state.ospf.networks.forEach(net => {
                config += ` network ${net.network} ${net.wildcard} area ${net.area}\n`;
            });
        }
        
        // ACLs
        for (const [id, entries] of Object.entries(state.acls || {})) {
            entries.forEach(entry => {
                config += `access-list ${id} ${entry.action} ${entry.condition}\n`;
            });
        }
        
        config += '!\nend';
        return config;
    },
    
    // Generate route table
    generateRouteTable: (state) => {
        let table = `Codes: C - connected, S - static, O - OSPF\n\nGateway of last resort is not set\n\n`;
        
        // Connected routes from interfaces
        for (const [name, iface] of Object.entries(state.interfaces)) {
            if (iface.ip && iface.status === 'up') {
                table += `C    ${iface.ip}/24 is directly connected, ${name}\n`;
            }
        }
        
        // Static routes
        state.routes.forEach(route => {
            table += `S    ${route.network}/${IOSSimulator.maskToCidr(route.mask)} [1/0] via ${route.nextHop}\n`;
        });
        
        return table || 'No routes configured';
    },
    
    // Generate interface brief
    generateInterfaceBrief: (state) => {
        let table = 'Interface              IP-Address      OK? Method Status                Protocol\n';
        
        for (const [name, iface] of Object.entries(state.interfaces)) {
            const ip = iface.ip || 'unassigned';
            const status = iface.status === 'up' ? 'up' : 'administratively down';
            const protocol = iface.status === 'up' ? 'up' : 'down';
            
            table += `${name.padEnd(22)} ${ip.padEnd(15)} YES manual ${status.padEnd(21)} ${protocol}\n`;
        }
        
        return table;
    },
    
    // Generate VLAN table
    generateVlanTable: (state) => {
        let table = 'VLAN Name                             Status    Ports\n';
        table += '---- -------------------------------- --------- -------------------------------\n';
        
        for (const [id, vlan] of Object.entries(state.vlans || {})) {
            table += `${id.padEnd(4)} ${vlan.name.padEnd(32)} active\n`;
        }
        
        return table;
    },
    
    // Generate interface detail
    generateInterfaceDetail: (state, ifaceName) => {
        const iface = state.interfaces[ifaceName];
        if (!iface) return `% Invalid interface ${ifaceName}`;
        
        return `${ifaceName} is ${iface.status}, line protocol is ${iface.status === 'up' ? 'up' : 'down'}
  Hardware is Gigabit Ethernet
  ${iface.ip ? `Internet address is ${iface.ip}/${IOSSimulator.maskToCidr(iface.mask)}` : 'Internet address is not set'}
  MTU 1500 bytes, BW 1000000 Kbit/sec, DLY 10 usec
  Encapsulation ARPA, loopback not set`;
    },
    
    // Convert subnet mask to CIDR
    maskToCidr: (mask) => {
        if (!mask) return '24';
        return mask.split('.').reduce((cidr, octet) => {
            return cidr + (parseInt(octet).toString(2).match(/1/g) || []).length;
        }, 0).toString();
    },
    
    // Validate expected commands were entered
    validateCommands: (state, expected) => {
        const history = state.history.map(c => c.toLowerCase());
        return expected.every(cmd => 
            history.some(h => h.includes(cmd.toLowerCase()))
        );
    }
};

// ============================================
// UI COMPONENTS
// ============================================

const Components = {
    // Icon helper
    icon: (name) => {
        const icons = {
            'menu': '☰',
            'close': '×',
            'search': '🔍',
            'plus': '+',
            'edit': '✏️',
            'delete': '🗑️',
            'play': '▶',
            'pause': '⏸',
            'flag': '🚩',
            'check': '✓',
            'cross': '✕',
            'arrow-left': '←',
            'arrow-right': '→',
            'arrow-up': '↑',
            'arrow-down': '↓',
            'clock': '⏱',
            'fire': '🔥',
            'star': '⭐',
            'star-empty': '☆',
            'trophy': '🏆',
            'chart': '📊',
            'book': '📖',
            'brain': '🧠',
            'terminal': '💻',
            'network': '🌐',
            'router': '📡',
            'users': '👥',
            'copy': '📋',
            'download': '⬇️',
            'upload': '⬆️',
            'settings': '⚙️',
            'logout': '🚪',
            'grip': '⋮⋮',
            'info': 'ℹ️',
            'warning': '⚠️',
            'shuffle': '🔀',
            'repeat': '🔁'
        };
        return icons[name] || '•';
    },
    
    // Navigation bar
    navbar: () => {
        const state = AppState.getState();
        return `
            <nav class="navbar">
                <div class="container navbar-inner">
                    <a href="#" class="logo" data-nav="library">
                        <div class="logo-icon">🎯</div>
                        <span class="logo-text">Quiz Master Pro</span>
                    </a>
                    
                    <div class="flex items-center gap-3">
                        ${state.stats.streak > 0 ? `
                            <div class="streak-display hide-mobile">
                                <span class="streak-flame">🔥</span>
                                <span class="streak-count">${state.stats.streak}</span>
                                <span class="streak-label">day streak</span>
                            </div>
                        ` : ''}
                        
                        <div class="dropdown">
                            <button class="btn btn-ghost btn-icon" data-dropdown="menu" aria-label="Menu">
                                ${Components.icon('menu')}
                            </button>
                            <div class="dropdown-menu">
                                <button class="dropdown-item" data-nav="library">
                                    ${Components.icon('book')} Library
                                </button>
                                <button class="dropdown-item" data-nav="create">
                                    ${Components.icon('plus')} Create Quiz
                                </button>
                                <button class="dropdown-item" data-nav="analytics">
                                    ${Components.icon('chart')} Analytics
                                </button>
                                <button class="dropdown-item" data-nav="multiplayer">
                                    ${Components.icon('users')} Multiplayer
                                </button>
                                <button class="dropdown-item" data-action="import">
                                    ${Components.icon('upload')} Import Quiz
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        `;
    },
    
    // Quiz card
    quizCard: (quiz) => {
        const dueCount = SRSService.getDueCards(quiz.id).length;
        const mastery = SRSService.getQuizMastery(quiz.id);
        
        return `
            <div class="quiz-card" data-quiz-id="${quiz.id}">
                <div class="flex items-start gap-4 mb-3">
                    <div class="quiz-card-icon" style="background: ${quiz.color}20; color: ${quiz.color}">
                        ${quiz.icon}
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="quiz-card-title">${Utils.escapeHtml(quiz.title)}</h3>
                        <p class="quiz-card-meta">${quiz.questions.length} questions</p>
                    </div>
                    ${dueCount > 0 ? `<span class="due-badge">${dueCount} due</span>` : ''}
                </div>
                
                <div class="quiz-card-stats">
                    <div class="quiz-card-stat">
                        ${Components.icon('play')} ${quiz.stats.attempts} attempts
                    </div>
                    <div class="quiz-card-stat">
                        ${Components.icon('trophy')} ${quiz.stats.bestScore}%
                    </div>
                    <div class="quiz-card-stat">
                        ${Components.masteryStars(Math.round(mastery / 20))}
                    </div>
                </div>
            </div>
        `;
    },
    
    // Mastery stars
    masteryStars: (level, max = 5) => {
        let stars = '';
        for (let i = 0; i < max; i++) {
            stars += `<span class="mastery-star ${i < level ? 'filled' : ''}">${i < level ? '★' : '☆'}</span>`;
        }
        return `<span class="mastery-stars">${stars}</span>`;
    },
    
    // Progress bar
    progressBar: (value, max = 100) => {
        const percent = Utils.percentage(value, max);
        return `
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percent}%"></div>
            </div>
        `;
    },
    
    // Stat card
    statCard: (value, label, accent = false) => {
        return `
            <div class="stat-card ${accent ? 'accent' : ''}">
                <div class="stat-value">${value}</div>
                <div class="stat-label">${label}</div>
            </div>
        `;
    },
    
    // Question option button
    optionButton: (option, selected, showResult, isCorrect) => {
        let classes = 'option-btn';
        if (selected) classes += ' selected';
        if (showResult && isCorrect) classes += ' correct';
        if (showResult && selected && !isCorrect) classes += ' incorrect';
        
        return `
            <button class="${classes}" data-option="${option.letter}" ${showResult ? 'disabled' : ''}>
                <span class="option-letter">${option.letter}</span>
                <span class="option-text">${Utils.parseFormatting(option.text)}</span>
                ${showResult ? `
                    <span class="option-indicator">
                        ${isCorrect ? Components.icon('check') : (selected ? Components.icon('cross') : '')}
                    </span>
                ` : ''}
            </button>
        `;
    },
    
    // Draggable item for ordering
    draggableItem: (item, index, showResult, correctPosition) => {
        let classes = 'draggable-item';
        if (showResult) {
            classes += index + 1 === correctPosition ? ' correct' : ' incorrect';
        }
        
        return `
            <div class="${classes}" draggable="true" data-position="${item.position}" data-index="${index}">
                <span class="drag-handle">${Components.icon('grip')}</span>
                <span class="drag-number">${index + 1}</span>
                <span class="drag-text">${Utils.parseFormatting(item.text)}</span>
            </div>
        `;
    },
    
    // Code block
    codeBlock: (code, type = 'text') => {
        return `
            <div class="code-block">
                <div class="code-header">
                    <div class="code-dots">
                        <span class="code-dot red"></span>
                        <span class="code-dot yellow"></span>
                        <span class="code-dot green"></span>
                    </div>
                    <span class="code-language">${type}</span>
                </div>
                <pre class="code-body">${Utils.escapeHtml(code)}</pre>
            </div>
        `;
    },
    
    // IOS Terminal
    iosTerminal: (state) => {
        return `
            <div class="ios-terminal" data-ios-terminal>
                <div class="ios-terminal-header">
                    <span class="ios-terminal-title">${Components.icon('terminal')} Cisco IOS Simulator</span>
                    <span class="ios-mode-badge">${state.mode.toUpperCase()}</span>
                </div>
                <div class="ios-terminal-body" data-ios-output>
                    ${state.output.map(line => `<div class="ios-output">${Utils.escapeHtml(line)}</div>`).join('')}
                    <div class="ios-prompt-line">
                        <span class="ios-prompt">${IOSSimulator.getPrompt(state)}</span>
                        <input type="text" class="ios-input" data-ios-input autocomplete="off" autocapitalize="off" spellcheck="false">
                    </div>
                </div>
            </div>
        `;
    },
    
    // Explanation box
    explanationBox: (text) => {
        if (!text) return '';
        return `
            <div class="explanation-box">
                <p><strong>💡 Explanation:</strong> ${Utils.parseFormatting(text)}</p>
            </div>
        `;
    },
    
    // Feedback banner
    feedbackBanner: (isCorrect, message) => {
        return `
            <div class="feedback-banner ${isCorrect ? 'correct' : 'incorrect'}">
                <span>${isCorrect ? '✓' : '✕'}</span>
                <span>${message || (isCorrect ? 'Correct!' : 'Incorrect')}</span>
            </div>
        `;
    },
    
    // Empty state
    emptyState: (icon, title, description, action = null) => {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">${icon}</div>
                <h3 class="empty-state-title">${title}</h3>
                <p class="empty-state-desc">${description}</p>
                ${action ? `
                    <button class="btn btn-primary" data-action="${action.id}">
                        ${action.label}
                    </button>
                ` : ''}
            </div>
        `;
    },
    
    // Heatmap
    heatmap: (data) => {
        return `
            <div class="heat-map">
                ${data.map(day => `
                    <div class="heat-map-day level-${day.level}" 
                         title="${day.date}: ${day.questions} questions"
                         data-date="${day.date}">
                    </div>
                `).join('')}
            </div>
        `;
    }
};

// ============================================
// VIEWS
// ============================================

const Views = {
    // Library view (home)
    library: () => {
        const state = AppState.getState();
        const quizzes = state.quizzes;
        const stats = state.stats;
        
        return `
            ${Components.navbar()}
            
            <main class="container" style="padding-top: var(--space-6); padding-bottom: var(--space-16);">
                <!-- Stats Overview -->
                <div class="stats-grid mb-8" style="margin-bottom: var(--space-8);">
                    ${Components.statCard(quizzes.length, 'Quizzes')}
                    ${Components.statCard(quizzes.reduce((sum, q) => sum + q.questions.length, 0), 'Questions')}
                    ${Components.statCard(stats.questionsAnswered, 'Answered')}
                    ${Components.statCard(`${Utils.percentage(stats.correctAnswers, stats.questionsAnswered || 1)}%`, 'Accuracy', true)}
                </div>
                
                <!-- Section Header -->
                <div class="flex items-center justify-between mb-6" style="margin-bottom: var(--space-6);">
                    <h2>Your Quizzes</h2>
                    <div class="flex gap-2">
                        <button class="btn btn-secondary btn-sm" data-action="import">
                            ${Components.icon('upload')} Import
                        </button>
                        <button class="btn btn-primary btn-sm" data-nav="create">
                            ${Components.icon('plus')} Create
                        </button>
                    </div>
                </div>
                
                <!-- Quiz Grid -->
                ${quizzes.length > 0 ? `
                    <div class="grid grid-3 gap-4" style="gap: var(--space-4);">
                        ${quizzes.map(q => Components.quizCard(q)).join('')}
                    </div>
                ` : Components.emptyState(
                    '📚',
                    'No quizzes yet',
                    'Create your first quiz or import one to get started',
                    { id: 'create', label: 'Create Quiz' }
                )}
            </main>
        `;
    },
    
    // Quiz detail/start view
    quizDetail: (quiz) => {
        const dueCards = SRSService.getDueCards(quiz.id);
        const mastery = SRSService.getQuizMastery(quiz.id);
        
        return `
            ${Components.navbar()}
            
            <main class="container container-md" style="padding-top: var(--space-8); padding-bottom: var(--space-16);">
                <button class="btn btn-ghost mb-6" data-nav="library" style="margin-bottom: var(--space-6);">
                    ${Components.icon('arrow-left')} Back to Library
                </button>
                
                <div class="card mb-6" style="margin-bottom: var(--space-6);">
                    <div class="flex items-start gap-4 mb-4">
                        <div class="quiz-card-icon" style="background: ${quiz.color}20; color: ${quiz.color}; width: 64px; height: 64px; font-size: 2rem;">
                            ${quiz.icon}
                        </div>
                        <div class="flex-1">
                            <h1 style="margin-bottom: var(--space-2);">${Utils.escapeHtml(quiz.title)}</h1>
                            <p class="text-muted">${quiz.questions.length} questions • Created ${Utils.formatDate(quiz.createdAt)}</p>
                        </div>
                        
                        <div class="dropdown">
                            <button class="btn btn-ghost btn-icon" data-dropdown="quiz-actions">
                                ⋮
                            </button>
                            <div class="dropdown-menu">
                                <button class="dropdown-item" data-action="edit-quiz" data-quiz-id="${quiz.id}">
                                    ${Components.icon('edit')} Edit
                                </button>
                                <button class="dropdown-item" data-action="export-quiz" data-quiz-id="${quiz.id}">
                                    ${Components.icon('download')} Export
                                </button>
                                <button class="dropdown-item" data-action="duplicate-quiz" data-quiz-id="${quiz.id}">
                                    ${Components.icon('copy')} Duplicate
                                </button>
                                <button class="dropdown-item danger" data-action="delete-quiz" data-quiz-id="${quiz.id}">
                                    ${Components.icon('delete')} Delete
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stats-grid mb-6" style="margin-bottom: var(--space-6);">
                        ${Components.statCard(quiz.stats.attempts, 'Attempts')}
                        ${Components.statCard(`${quiz.stats.bestScore}%`, 'Best Score')}
                        ${Components.statCard(`${quiz.stats.avgScore}%`, 'Average')}
                        ${Components.statCard(dueCards.length, 'Due for Review')}
                    </div>
                    
                    <div style="margin-bottom: var(--space-4);">
                        <div class="flex items-center justify-between mb-2" style="margin-bottom: var(--space-2);">
                            <span class="text-sm text-muted">Mastery</span>
                            <span class="text-sm font-semibold">${mastery}%</span>
                        </div>
                        ${Components.progressBar(mastery)}
                    </div>
                </div>
                
                <!-- Study Options -->
                <h3 style="margin-bottom: var(--space-4);">Study Options</h3>
                
                <div class="grid grid-2 gap-4" style="gap: var(--space-4);">
                    <button class="card card-hover" style="text-align: left; cursor: pointer; border: none;" 
                            data-action="start-quiz" data-quiz-id="${quiz.id}" data-mode="quiz">
                        <div class="flex items-center gap-3 mb-2">
                            <span style="font-size: 1.5rem;">📝</span>
                            <h4>Quiz Mode</h4>
                        </div>
                        <p class="text-sm text-muted">Test your knowledge with all questions. See your score at the end.</p>
                    </button>
                    
                    <button class="card card-hover" style="text-align: left; cursor: pointer; border: none;"
                            data-action="start-quiz" data-quiz-id="${quiz.id}" data-mode="study">
                        <div class="flex items-center gap-3 mb-2">
                            <span style="font-size: 1.5rem;">📖</span>
                            <h4>Study Mode</h4>
                        </div>
                        <p class="text-sm text-muted">Learn at your own pace with instant feedback and explanations.</p>
                    </button>
                    
                    <button class="card card-hover ${dueCards.length === 0 ? 'disabled' : ''}" 
                            style="text-align: left; cursor: pointer; border: none; ${dueCards.length === 0 ? 'opacity: 0.5;' : ''}"
                            data-action="start-quiz" data-quiz-id="${quiz.id}" data-mode="srs"
                            ${dueCards.length === 0 ? 'disabled' : ''}>
                        <div class="flex items-center gap-3 mb-2">
                            <span style="font-size: 1.5rem;">🧠</span>
                            <h4>Spaced Repetition</h4>
                            ${dueCards.length > 0 ? `<span class="badge badge-accent">${dueCards.length} due</span>` : ''}
                        </div>
                        <p class="text-sm text-muted">Review cards using the SM-2 algorithm for optimal retention.</p>
                    </button>
                    
                    <button class="card card-hover" style="text-align: left; cursor: pointer; border: none;"
                            data-action="start-multiplayer" data-quiz-id="${quiz.id}">
                        <div class="flex items-center gap-3 mb-2">
                            <span style="font-size: 1.5rem;">👥</span>
                            <h4>Multiplayer</h4>
                        </div>
                        <p class="text-sm text-muted">Challenge your classmates in real-time competitive mode.</p>
                    </button>
                </div>
                
                <!-- Question Types Summary -->
                <h3 style="margin-top: var(--space-8); margin-bottom: var(--space-4);">Question Types</h3>
                <div class="flex gap-2 flex-wrap">
                    ${Object.entries(quiz.questions.reduce((acc, q) => {
                        acc[q.type] = (acc[q.type] || 0) + 1;
                        return acc;
                    }, {})).map(([type, count]) => `
                        <span class="badge">${type}: ${count}</span>
                    `).join('')}
                </div>
            </main>
        `;
    },
    
    // Active quiz view
    quiz: () => {
        const state = AppState.getState();
        const { session } = state;
        
        if (!session) return Views.library();
        
        const question = SessionManager.getCurrentQuestion();
        const answer = session.answers[question.id];
        const isStudyMode = session.mode === 'study';
        const showResult = isStudyMode && answer !== undefined;
        const isCorrect = showResult ? SessionManager.checkAnswer(question, answer) : false;
        
        return `
            <!-- Quiz Header -->
            <div class="quiz-header">
                <div class="container">
                    <div class="flex items-center justify-between">
                        <button class="btn btn-ghost btn-sm" data-action="quit-quiz">
                            ${Components.icon('close')} Exit
                        </button>
                        
                        <h3 class="text-sm font-medium hide-mobile">${Utils.escapeHtml(session.quizTitle)}</h3>
                        
                        <div class="flex items-center gap-3">
                            ${session.timerEnabled ? `
                                <div class="timer" data-timer>
                                    ${Utils.formatTime(session.timerSeconds)}
                                </div>
                            ` : ''}
                            <button class="btn btn-ghost btn-icon btn-sm ${session.flagged.has(question.id) ? 'text-accent' : ''}" 
                                    data-action="toggle-flag" title="Flag question">
                                ${Components.icon('flag')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Progress -->
            <div class="quiz-progress-section">
                <div class="container">
                    <div class="flex items-center justify-between mb-2" style="margin-bottom: var(--space-2);">
                        <span class="text-sm text-muted">Question ${session.currentIndex + 1} of ${session.questions.length}</span>
                        <span class="text-sm font-medium">${Utils.percentage(session.currentIndex + 1, session.questions.length)}%</span>
                    </div>
                    ${Components.progressBar(session.currentIndex + 1, session.questions.length)}
                </div>
            </div>
            
            <!-- Question Content -->
            <div class="quiz-content">
                <div class="container container-md">
                    ${Views.renderQuestion(question, answer, showResult, isCorrect)}
                </div>
            </div>
            
            <!-- Footer Navigation -->
            <div class="quiz-footer">
                <div class="container">
                    <div class="flex items-center justify-between">
                        <button class="btn btn-secondary" data-action="prev-question" 
                                ${session.currentIndex === 0 ? 'disabled' : ''}>
                            ${Components.icon('arrow-left')} Previous
                        </button>
                        
                        <div class="flex gap-1 hide-mobile" style="max-width: 400px; overflow-x: auto;">
                            ${session.questions.slice(0, 20).map((q, i) => `
                                <button class="question-dot ${i === session.currentIndex ? 'current' : ''} 
                                              ${session.answers[q.id] !== undefined ? 'answered' : ''}
                                              ${session.flagged.has(q.id) ? 'flagged' : ''}"
                                        data-action="go-to-question" data-index="${i}">
                                    ${i + 1}
                                </button>
                            `).join('')}
                            ${session.questions.length > 20 ? '<span class="text-muted">...</span>' : ''}
                        </div>
                        
                        ${session.currentIndex === session.questions.length - 1 ? `
                            <button class="btn btn-primary" data-action="finish-quiz">
                                Finish ${Components.icon('check')}
                            </button>
                        ` : `
                            <button class="btn btn-primary" data-action="next-question">
                                Next ${Components.icon('arrow-right')}
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    },
    
    // Render question based on type
    renderQuestion: (question, answer, showResult, isCorrect) => {
        let questionHtml = `
            <div class="flex items-start gap-4 mb-6" style="margin-bottom: var(--space-6);">
                <div class="question-number">${question.number || '?'}</div>
                <div class="flex-1">
                    <p class="question-text">${Utils.parseFormatting(question.text)}</p>
                    ${question.code ? Components.codeBlock(question.code.content, question.code.type) : ''}
                </div>
            </div>
        `;
        
        // Show feedback in study mode
        if (showResult) {
            questionHtml += `
                <div style="margin-bottom: var(--space-4);">
                    ${Components.feedbackBanner(isCorrect)}
                </div>
            `;
        }
        
        // Render options based on question type
        switch (question.type) {
            case 'choice':
                questionHtml += Views.renderChoiceQuestion(question, answer, showResult);
                break;
            case 'multiple':
                questionHtml += Views.renderMultipleQuestion(question, answer, showResult);
                break;
            case 'order':
                questionHtml += Views.renderOrderQuestion(question, answer, showResult);
                break;
            case 'matching':
                questionHtml += Views.renderMatchingQuestion(question, answer, showResult);
                break;
            case 'truefalse':
                questionHtml += Views.renderTrueFalseQuestion(question, answer, showResult);
                break;
            case 'fillblank':
                questionHtml += Views.renderFillBlankQuestion(question, answer, showResult);
                break;
            case 'ios':
                questionHtml += Views.renderIOSQuestion(question, answer, showResult);
                break;
            default:
                questionHtml += Views.renderChoiceQuestion(question, answer, showResult);
        }
        
        // Show explanation in study mode after answering
        if (showResult && question.explanation) {
            questionHtml += Components.explanationBox(question.explanation);
        }
        
        return questionHtml;
    },
    
    // Single choice question
    renderChoiceQuestion: (question, answer, showResult) => {
        return `
            <div class="flex flex-col gap-3" style="gap: var(--space-3);">
                ${question.options.map(opt => 
                    Components.optionButton(opt, answer === opt.letter, showResult, opt.isCorrect)
                ).join('')}
            </div>
        `;
    },
    
    // Multiple choice question
    renderMultipleQuestion: (question, answer, showResult) => {
        const selected = Array.isArray(answer) ? answer : [];
        return `
            <p class="text-sm text-muted mb-4" style="margin-bottom: var(--space-4);">
                Select all that apply (${question.correctAnswers.length} correct)
            </p>
            <div class="flex flex-col gap-3" style="gap: var(--space-3);">
                ${question.options.map(opt => `
                    <button class="option-btn ${selected.includes(opt.letter) ? 'selected' : ''} 
                                  ${showResult && opt.isCorrect ? 'correct' : ''} 
                                  ${showResult && selected.includes(opt.letter) && !opt.isCorrect ? 'incorrect' : ''}"
                            data-option="${opt.letter}" data-multi="true" ${showResult ? 'disabled' : ''}>
                        <input type="checkbox" class="checkbox" ${selected.includes(opt.letter) ? 'checked' : ''} 
                               style="pointer-events: none;">
                        <span class="option-letter">${opt.letter}</span>
                        <span class="option-text">${Utils.parseFormatting(opt.text)}</span>
                    </button>
                `).join('')}
            </div>
        `;
    },
    
    // Order question
    renderOrderQuestion: (question, answer, showResult) => {
        const items = answer || Utils.shuffle([...question.orderItems]);
        return `
            <p class="text-sm text-muted mb-4" style="margin-bottom: var(--space-4);">
                Drag to reorder the items in the correct sequence
            </p>
            <div class="flex flex-col gap-3" data-sortable style="gap: var(--space-3);">
                ${items.map((item, i) => 
                    Components.draggableItem(item, i, showResult, item.position)
                ).join('')}
            </div>
        `;
    },
    
    // Matching question
    renderMatchingQuestion: (question, answer, showResult) => {
        const matches = answer || {};
        const definitions = question.definitions || [];
        
        return `
            <div class="matching-container">
                <div class="matching-hint">
                    ${Components.icon('info')} Click a term, then click the matching definition
                </div>
                
                <div class="matching-grid">
                    <div class="matching-column">
                        <h4 class="text-sm font-semibold mb-3" style="margin-bottom: var(--space-3);">Terms</h4>
                        ${question.matchingPairs.map(pair => {
                            const matchedDef = matches[pair.term];
                            const isCorrect = showResult && matchedDef === pair.definition;
                            const isIncorrect = showResult && matchedDef && matchedDef !== pair.definition;
                            
                            return `
                                <div class="matching-pair ${matchedDef ? 'matched' : ''} 
                                            ${isCorrect ? 'correct' : ''} ${isIncorrect ? 'incorrect' : ''}"
                                     data-term="${pair.term}">
                                    <span class="matching-pair-label">${pair.term}</span>
                                    <span class="flex-1">${Utils.parseFormatting(pair.termText)}</span>
                                    ${matchedDef ? `<span class="badge badge-accent">${matchedDef}</span>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <div class="matching-column">
                        <h4 class="text-sm font-semibold mb-3" style="margin-bottom: var(--space-3);">Definitions</h4>
                        ${definitions.map(def => {
                            const isUsed = Object.values(matches).includes(def.id);
                            return `
                                <div class="matching-target ${isUsed ? 'selected' : ''}" data-definition="${def.id}">
                                    <span class="matching-pair-label">${def.id}</span>
                                    <span class="flex-1">${Utils.parseFormatting(def.text)}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    },
    
    // True/False question
    renderTrueFalseQuestion: (question, answer, showResult) => {
        const options = [
            { letter: 'T', text: 'True', isCorrect: question.correctAnswers.includes('true') },
            { letter: 'F', text: 'False', isCorrect: question.correctAnswers.includes('false') }
        ];
        
        return `
            <div class="grid grid-2 gap-4" style="gap: var(--space-4);">
                ${options.map(opt => `
                    <button class="option-btn ${answer === opt.letter.toLowerCase() ? 'selected' : ''} 
                                  ${showResult && opt.isCorrect ? 'correct' : ''} 
                                  ${showResult && answer === opt.letter.toLowerCase() && !opt.isCorrect ? 'incorrect' : ''}"
                            data-option="${opt.letter.toLowerCase()}" ${showResult ? 'disabled' : ''}
                            style="justify-content: center;">
                        <span style="font-size: 1.5rem;">${opt.letter === 'T' ? '✓' : '✗'}</span>
                        <span class="option-text font-semibold">${opt.text}</span>
                    </button>
                `).join('')}
            </div>
        `;
    },
    
    // Fill in the blank question
    renderFillBlankQuestion: (question, answer, showResult) => {
        const blanks = question.blankAnswers || [];
        const userAnswers = answer || [];
        
        return `
            <div class="flex flex-col gap-4" style="gap: var(--space-4);">
                ${blanks.map((accepted, i) => {
                    const userAnswer = userAnswers[i] || '';
                    const isCorrect = showResult && accepted.includes(userAnswer.toLowerCase());
                    
                    return `
                        <div class="flex items-center gap-3">
                            <span class="text-muted">Blank ${i + 1}:</span>
                            <input type="text" class="input" style="max-width: 300px;" 
                                   data-blank="${i}" value="${Utils.escapeHtml(userAnswer)}"
                                   placeholder="Enter answer..." ${showResult ? 'disabled' : ''}>
                            ${showResult ? `
                                <span class="${isCorrect ? 'text-success' : 'text-error'}">
                                    ${isCorrect ? '✓' : `✗ (${accepted[0]})`}
                                </span>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },
    
    // IOS terminal question
    renderIOSQuestion: (question, answer, showResult) => {
        const iosState = answer?.state || IOSSimulator.createInstance(question.iosConfig?.hostname || 'Router');
        
        return `
            <div>
                ${question.iosConfig?.task ? `
                    <div class="card card-accent mb-4" style="margin-bottom: var(--space-4);">
                        <p><strong>Task:</strong> ${Utils.parseFormatting(question.iosConfig.task)}</p>
                    </div>
                ` : ''}
                
                ${Components.iosTerminal(iosState)}
                
                ${showResult ? `
                    <div class="ios-result ${answer?.success ? 'success' : 'error'}">
                        ${answer?.success ? '✓ Commands executed correctly!' : '✗ Expected commands not found'}
                    </div>
                ` : `
                    <div class="flex justify-end mt-4" style="margin-top: var(--space-4);">
                        <button class="btn btn-primary" data-action="check-ios">
                            Check Answer
                        </button>
                    </div>
                `}
            </div>
        `;
    },
    
    // Results view
    results: () => {
        const { session } = AppState.getState();
        if (!session || !session.results) return Views.library();
        
        const { results } = session;
        const grade = results.score >= 90 ? 'A' : results.score >= 80 ? 'B' : 
                      results.score >= 70 ? 'C' : results.score >= 60 ? 'D' : 'F';
        const message = results.score >= 90 ? 'Excellent! 🎉' : 
                       results.score >= 70 ? 'Good job! 👍' : 
                       results.score >= 50 ? 'Keep practicing! 💪' : 'Need more study 📚';
        
        return `
            ${Components.navbar()}
            
            <main class="container container-md">
                <div class="results-hero">
                    <div class="results-score">
                        <span class="results-score-value">${results.score}%</span>
                        <span class="results-score-label">Grade: ${grade}</span>
                    </div>
                    
                    <h1 class="results-message">${message}</h1>
                    <p class="text-secondary">
                        You got ${results.correctAnswers} out of ${results.totalQuestions} questions correct
                    </p>
                </div>
                
                <div class="stats-grid mb-8" style="margin-bottom: var(--space-8);">
                    ${Components.statCard(results.correctAnswers, 'Correct')}
                    ${Components.statCard(results.totalQuestions - results.correctAnswers, 'Incorrect')}
                    ${Components.statCard(Utils.formatTime(Math.floor(results.timeTaken / 1000)), 'Time')}
                    ${Components.statCard(grade, 'Grade', true)}
                </div>
                
                <div class="flex gap-4 justify-center mb-8" style="margin-bottom: var(--space-8); gap: var(--space-4);">
                    <button class="btn btn-secondary" data-nav="library">
                        ${Components.icon('arrow-left')} Back to Library
                    </button>
                    <button class="btn btn-secondary" data-action="review-answers">
                        ${Components.icon('book')} Review Answers
                    </button>
                    <button class="btn btn-primary" data-action="retry-quiz" data-quiz-id="${session.quizId}">
                        ${Components.icon('repeat')} Try Again
                    </button>
                </div>
                
                <!-- Question Results Summary -->
                <h3 style="margin-bottom: var(--space-4);">Question Summary</h3>
                <div class="flex flex-col gap-2" style="gap: var(--space-2);">
                    ${results.questionResults.map((qr, i) => `
                        <div class="flex items-center gap-3 p-3" style="padding: var(--space-3); background: var(--bg-secondary); border-radius: var(--radius-md);">
                            <span class="badge ${qr.isCorrect ? 'badge-success' : 'badge-error'}">
                                ${qr.isCorrect ? '✓' : '✗'}
                            </span>
                            <span class="flex-1 text-sm">${Utils.escapeHtml(qr.question.text.substring(0, 80))}${qr.question.text.length > 80 ? '...' : ''}</span>
                            <button class="btn btn-ghost btn-sm" data-action="view-question" data-index="${i}">
                                View
                            </button>
                        </div>
                    `).join('')}
                </div>
            </main>
        `;
    },
    
    // Create/Edit quiz view
    create: (editingQuiz = null) => {
        return `
            ${Components.navbar()}
            
            <main class="container" style="padding-top: var(--space-6); padding-bottom: var(--space-16);">
                <div class="flex items-center justify-between mb-6" style="margin-bottom: var(--space-6);">
                    <div>
                        <button class="btn btn-ghost btn-sm mb-2" data-nav="library" style="margin-bottom: var(--space-2);">
                            ${Components.icon('arrow-left')} Back
                        </button>
                        <h1>${editingQuiz ? 'Edit Quiz' : 'Create Quiz'}</h1>
                    </div>
                    <button class="btn btn-primary" data-action="save-quiz">
                        ${Components.icon('check')} Save Quiz
                    </button>
                </div>
                
                <div class="grid gap-6" style="gap: var(--space-6); grid-template-columns: 1fr 1fr;">
                    <div class="card">
                        <h3 style="margin-bottom: var(--space-4);">Quiz Details</h3>
                        
                        <div style="margin-bottom: var(--space-4);">
                            <label class="input-label">Title</label>
                            <input type="text" class="input" id="quiz-title" 
                                   value="${editingQuiz ? Utils.escapeHtml(editingQuiz.title) : ''}"
                                   placeholder="Enter quiz title...">
                        </div>
                        
                        <div style="margin-bottom: var(--space-4);">
                            <label class="input-label">Description (optional)</label>
                            <textarea class="textarea" id="quiz-description" rows="3"
                                      placeholder="Describe your quiz...">${editingQuiz ? Utils.escapeHtml(editingQuiz.description) : ''}</textarea>
                        </div>
                        
                        <div class="flex gap-4" style="gap: var(--space-4);">
                            <div class="flex-1">
                                <label class="input-label">Icon</label>
                                <input type="text" class="input" id="quiz-icon" 
                                       value="${editingQuiz?.icon || '📚'}" maxlength="4">
                            </div>
                            <div class="flex-1">
                                <label class="input-label">Color</label>
                                <input type="color" class="input" id="quiz-color" 
                                       value="${editingQuiz?.color || '#FF6B2C'}" style="height: 48px; padding: 4px;">
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3 style="margin-bottom: var(--space-4);">Settings</h3>
                        
                        <label class="flex items-center gap-3 mb-4" style="margin-bottom: var(--space-4); cursor: pointer;">
                            <input type="checkbox" class="checkbox" id="shuffle-questions"
                                   ${editingQuiz?.settings?.shuffleQuestions ? 'checked' : ''}>
                            <span>Shuffle questions</span>
                        </label>
                        
                        <label class="flex items-center gap-3 mb-4" style="margin-bottom: var(--space-4); cursor: pointer;">
                            <input type="checkbox" class="checkbox" id="shuffle-options"
                                   ${editingQuiz?.settings?.shuffleOptions ? 'checked' : ''}>
                            <span>Shuffle answer options</span>
                        </label>
                        
                        <label class="flex items-center gap-3 mb-4" style="margin-bottom: var(--space-4); cursor: pointer;">
                            <input type="checkbox" class="checkbox" id="show-explanations"
                                   ${editingQuiz?.settings?.showExplanations !== false ? 'checked' : ''}>
                            <span>Show explanations</span>
                        </label>
                        
                        <label class="flex items-center gap-3 mb-4" style="margin-bottom: var(--space-4); cursor: pointer;">
                            <input type="checkbox" class="checkbox" id="timer-enabled"
                                   ${editingQuiz?.settings?.timerEnabled ? 'checked' : ''}>
                            <span>Enable timer</span>
                        </label>
                        
                        <div id="timer-settings" class="${editingQuiz?.settings?.timerEnabled ? '' : 'hidden'}">
                            <label class="input-label">Seconds per question</label>
                            <input type="number" class="input" id="timer-seconds" 
                                   value="${editingQuiz?.settings?.timerSeconds || 60}" min="10" max="300">
                        </div>
                    </div>
                </div>
                
                <div class="card mt-6" style="margin-top: var(--space-6);">
                    <div class="flex items-center justify-between mb-4" style="margin-bottom: var(--space-4);">
                        <h3>Questions</h3>
                        <div class="tabs">
                            <button class="tab active" data-tab="text">Text Editor</button>
                            <button class="tab" data-tab="visual">Visual Editor</button>
                        </div>
                    </div>
                    
                    <div id="text-editor">
                        <p class="text-sm text-muted mb-4" style="margin-bottom: var(--space-4);">
                            Enter questions in the format shown below. Use * to mark correct answers.
                        </p>
                        <textarea class="textarea font-mono" id="questions-text" rows="20" 
                                  placeholder="1. What protocol operates at Layer 3?
A. HTTP
B. TCP
C. IP *
D. Ethernet

2. [order] Arrange the OSI layers from top to bottom:
1) Application
2) Presentation
3) Session

3. [matching] Match the port to its protocol:
A. HTTP = 1 *
B. HTTPS = 2 *
C. SSH = 3 *
Definitions:
1) Port 80
2) Port 443
3) Port 22

4. [ios] Configure interface with IP:
expected: ip address, no shutdown">${editingQuiz ? QuizParser.serialize(editingQuiz.questions) : ''}</textarea>
                    </div>
                    
                    <div id="visual-editor" class="hidden">
                        <!-- Visual editor content will be rendered dynamically -->
                        <p class="text-muted">Visual editor coming soon...</p>
                    </div>
                </div>
            </main>
        `;
    },
    
    // Analytics view
    analytics: () => {
        const stats = Analytics.getStats();
        const heatmapData = Analytics.getHeatmapData();
        const quizzes = QuizService.getAll();
        
        return `
            ${Components.navbar()}
            
            <main class="container" style="padding-top: var(--space-6); padding-bottom: var(--space-16);">
                <h1 style="margin-bottom: var(--space-6);">Analytics</h1>
                
                <div class="stats-grid mb-8" style="margin-bottom: var(--space-8);">
                    ${Components.statCard(stats.streak, 'Day Streak', true)}
                    ${Components.statCard(stats.questionsAnswered, 'Questions Answered')}
                    ${Components.statCard(`${Utils.percentage(stats.correctAnswers, stats.questionsAnswered || 1)}%`, 'Accuracy')}
                    ${Components.statCard(quizzes.length, 'Total Quizzes')}
                </div>
                
                <div class="grid gap-6" style="gap: var(--space-6); grid-template-columns: 2fr 1fr;">
                    <div class="analytics-card">
                        <h3 style="margin-bottom: var(--space-4);">Study Activity (Last 12 weeks)</h3>
                        ${Components.heatmap(heatmapData)}
                        <div class="flex items-center justify-end gap-2 mt-3" style="margin-top: var(--space-3);">
                            <span class="text-xs text-muted">Less</span>
                            <div class="heat-map-day" style="width: 12px; height: 12px;"></div>
                            <div class="heat-map-day level-1" style="width: 12px; height: 12px;"></div>
                            <div class="heat-map-day level-2" style="width: 12px; height: 12px;"></div>
                            <div class="heat-map-day level-3" style="width: 12px; height: 12px;"></div>
                            <div class="heat-map-day level-4" style="width: 12px; height: 12px;"></div>
                            <span class="text-xs text-muted">More</span>
                        </div>
                    </div>
                    
                    <div class="analytics-card">
                        <h3 style="margin-bottom: var(--space-4);">Quick Stats</h3>
                        <div class="flex flex-col gap-4" style="gap: var(--space-4);">
                            <div>
                                <div class="flex justify-between text-sm mb-1">
                                    <span>This Week</span>
                                    <span class="font-semibold">${heatmapData.slice(-7).reduce((sum, d) => sum + d.questions, 0)} questions</span>
                                </div>
                            </div>
                            <div>
                                <div class="flex justify-between text-sm mb-1">
                                    <span>Average per Day</span>
                                    <span class="font-semibold">${Math.round(stats.questionsAnswered / Math.max(1, heatmapData.filter(d => d.level > 0).length))}</span>
                                </div>
                            </div>
                            <div>
                                <div class="flex justify-between text-sm mb-1">
                                    <span>Best Day</span>
                                    <span class="font-semibold">${Math.max(...heatmapData.map(d => d.questions))} questions</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <h3 style="margin-top: var(--space-8); margin-bottom: var(--space-4);">Quiz Performance</h3>
                <div class="flex flex-col gap-3" style="gap: var(--space-3);">
                    ${quizzes.sort((a, b) => b.stats.attempts - a.stats.attempts).slice(0, 10).map(quiz => `
                        <div class="analytics-card flex items-center gap-4" style="gap: var(--space-4); padding: var(--space-4);">
                            <div class="quiz-card-icon" style="background: ${quiz.color}20; color: ${quiz.color}; width: 40px; height: 40px; font-size: 1.25rem;">
                                ${quiz.icon}
                            </div>
                            <div class="flex-1">
                                <h4 class="text-sm font-semibold">${Utils.escapeHtml(quiz.title)}</h4>
                                <p class="text-xs text-muted">${quiz.stats.attempts} attempts</p>
                            </div>
                            <div class="text-right">
                                <div class="font-semibold">${quiz.stats.bestScore}%</div>
                                <div class="text-xs text-muted">best score</div>
                            </div>
                            <div class="text-right">
                                ${Components.masteryStars(Math.round(SRSService.getQuizMastery(quiz.id) / 20))}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </main>
        `;
    },
    
    // Multiplayer lobby
    multiplayer: () => {
        return `
            ${Components.navbar()}
            
            <main class="container container-md" style="padding-top: var(--space-8); padding-bottom: var(--space-16);">
                <h1 style="margin-bottom: var(--space-2);">Multiplayer</h1>
                <p class="text-muted mb-8" style="margin-bottom: var(--space-8);">
                    Challenge your classmates to a real-time quiz battle!
                </p>
                
                <div class="grid grid-2 gap-6" style="gap: var(--space-6);">
                    <div class="card text-center">
                        <div style="font-size: 3rem; margin-bottom: var(--space-4);">🎮</div>
                        <h3 style="margin-bottom: var(--space-2);">Host a Game</h3>
                        <p class="text-sm text-muted mb-4" style="margin-bottom: var(--space-4);">
                            Create a room and invite your friends to join
                        </p>
                        <button class="btn btn-primary" data-action="host-game">
                            Create Room
                        </button>
                    </div>
                    
                    <div class="card text-center">
                        <div style="font-size: 3rem; margin-bottom: var(--space-4);">🔗</div>
                        <h3 style="margin-bottom: var(--space-2);">Join a Game</h3>
                        <p class="text-sm text-muted mb-4" style="margin-bottom: var(--space-4);">
                            Enter a room code to join an existing game
                        </p>
                        <div class="flex gap-2" style="gap: var(--space-2);">
                            <input type="text" class="input" id="room-code" placeholder="Enter code..." 
                                   maxlength="6" style="text-transform: uppercase; text-align: center; font-family: var(--font-mono);">
                            <button class="btn btn-primary" data-action="join-game">
                                Join
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="card mt-8" style="margin-top: var(--space-8);">
                    <h3 style="margin-bottom: var(--space-4);">How it Works</h3>
                    <div class="grid grid-3 gap-4" style="gap: var(--space-4);">
                        <div class="text-center">
                            <div style="font-size: 2rem; margin-bottom: var(--space-2);">1️⃣</div>
                            <p class="text-sm">Host creates a room and selects a quiz</p>
                        </div>
                        <div class="text-center">
                            <div style="font-size: 2rem; margin-bottom: var(--space-2);">2️⃣</div>
                            <p class="text-sm">Players join using the room code</p>
                        </div>
                        <div class="text-center">
                            <div style="font-size: 2rem; margin-bottom: var(--space-2);">3️⃣</div>
                            <p class="text-sm">Race to answer questions correctly!</p>
                        </div>
                    </div>
                </div>
            </main>
        `;
    }
};

// ============================================
// ROUTER
// ============================================

const Router = {
    currentRoute: null,
    
    routes: {
        'library': () => Views.library(),
        'quiz-detail': (params) => {
            const quiz = QuizService.getById(params.id);
            return quiz ? Views.quizDetail(quiz) : Views.library();
        },
        'quiz': () => Views.quiz(),
        'results': () => Views.results(),
        'create': () => Views.create(),
        'edit': (params) => {
            const quiz = QuizService.getById(params.id);
            return Views.create(quiz);
        },
        'analytics': () => Views.analytics(),
        'multiplayer': () => Views.multiplayer()
    },
    
    navigate: (route, params = {}) => {
        Router.currentRoute = { route, params };
        const view = Router.routes[route];
        
        if (view) {
            const content = typeof view === 'function' ? view(params) : view;
            document.getElementById('app').innerHTML = content;
            
            // Post-render setup
            Router.afterRender();
            
            // Update state
            AppState.setState({ currentView: route });
            
            // Scroll to top
            window.scrollTo(0, 0);
        }
    },
    
    afterRender: () => {
        // Setup dropdowns
        document.querySelectorAll('[data-dropdown]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = btn.closest('.dropdown');
                const isOpen = dropdown.classList.contains('open');
                
                // Close all dropdowns
                document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
                
                if (!isOpen) {
                    dropdown.classList.add('open');
                }
            });
        });
        
        // Setup tabs
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabGroup = tab.closest('.tabs');
                tabGroup.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const tabId = tab.dataset.tab;
                // Toggle content visibility
                document.getElementById('text-editor')?.classList.toggle('hidden', tabId !== 'text');
                document.getElementById('visual-editor')?.classList.toggle('hidden', tabId !== 'visual');
            });
        });
        
        // Setup timer toggle
        const timerCheckbox = document.getElementById('timer-enabled');
        if (timerCheckbox) {
            timerCheckbox.addEventListener('change', () => {
                document.getElementById('timer-settings')?.classList.toggle('hidden', !timerCheckbox.checked);
            });
        }
        
        // Setup IOS terminal
        const iosInput = document.querySelector('[data-ios-input]');
        if (iosInput) {
            iosInput.focus();
            iosInput.addEventListener('keydown', EventHandlers.handleIOSInput);
        }
        
        // Setup sortable (drag and drop for ordering questions)
        const sortable = document.querySelector('[data-sortable]');
        if (sortable) {
            EventHandlers.setupSortable(sortable);
        }
        
        // Setup matching question handlers
        EventHandlers.setupMatching();
    },
    
    refresh: () => {
        if (Router.currentRoute) {
            Router.navigate(Router.currentRoute.route, Router.currentRoute.params);
        }
    }
};

// ============================================
// EVENT HANDLERS
// ============================================

const EventHandlers = {
    // Initialize all event listeners
    init: () => {
        // Global click handler for delegated events
        document.addEventListener('click', EventHandlers.handleClick);
        
        // Close dropdowns on outside click
        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', EventHandlers.handleKeydown);
        
        // Handle option inputs for fill-in-blank
        document.addEventListener('input', EventHandlers.handleInput);
    },
    
    // Delegated click handler
    handleClick: (e) => {
        const target = e.target.closest('[data-action], [data-nav], [data-quiz-id], [data-option]');
        if (!target) return;
        
        // Navigation
        if (target.dataset.nav) {
            e.preventDefault();
            Router.navigate(target.dataset.nav);
            return;
        }
        
        // Quiz card click
        if (target.dataset.quizId && !target.dataset.action) {
            Router.navigate('quiz-detail', { id: target.dataset.quizId });
            return;
        }
        
        // Option selection
        if (target.dataset.option !== undefined) {
            EventHandlers.handleOptionClick(target);
            return;
        }
        
        // Actions
        const action = target.dataset.action;
        if (!action) return;
        
        switch (action) {
            case 'start-quiz':
                SessionManager.start(target.dataset.quizId, { mode: target.dataset.mode });
                Router.navigate('quiz');
                break;
                
            case 'quit-quiz':
                SessionManager.quit();
                break;
                
            case 'prev-question':
                SessionManager.prev();
                Router.refresh();
                break;
                
            case 'next-question':
                SessionManager.next();
                Router.refresh();
                break;
                
            case 'go-to-question':
                SessionManager.goToQuestion(parseInt(target.dataset.index));
                Router.refresh();
                break;
                
            case 'toggle-flag':
                SessionManager.toggleFlag();
                Router.refresh();
                break;
                
            case 'finish-quiz':
                SessionManager.finish();
                Router.navigate('results');
                // Trigger confetti
                EventHandlers.triggerConfetti();
                break;
                
            case 'retry-quiz':
                SessionManager.start(target.dataset.quizId);
                Router.navigate('quiz');
                break;
                
            case 'review-answers':
                // TODO: Implement review mode
                Toast.info('Review mode coming soon!');
                break;
                
            case 'import':
                EventHandlers.showImportModal();
                break;
                
            case 'save-quiz':
                EventHandlers.saveQuiz();
                break;
                
            case 'edit-quiz':
                Router.navigate('edit', { id: target.dataset.quizId });
                break;
                
            case 'delete-quiz':
                QuizService.delete(target.dataset.quizId).then(deleted => {
                    if (deleted) Router.navigate('library');
                });
                break;
                
            case 'duplicate-quiz':
                const duplicated = QuizService.duplicate(target.dataset.quizId);
                if (duplicated) {
                    Toast.success('Quiz duplicated');
                    Router.navigate('library');
                }
                break;
                
            case 'export-quiz':
                EventHandlers.exportQuiz(target.dataset.quizId);
                break;
                
            case 'check-ios':
                EventHandlers.checkIOSAnswer();
                break;
                
            case 'host-game':
                EventHandlers.hostMultiplayerGame();
                break;
                
            case 'join-game':
                EventHandlers.joinMultiplayerGame();
                break;
                
            case 'create':
                Router.navigate('create');
                break;
        }
    },
    
    // Handle option click
    handleOptionClick: (target) => {
        const { session } = AppState.getState();
        if (!session) return;
        
        const question = SessionManager.getCurrentQuestion();
        const option = target.dataset.option;
        const isMulti = target.dataset.multi === 'true';
        
        if (isMulti) {
            // Multiple selection
            let current = session.answers[question.id] || [];
            if (!Array.isArray(current)) current = [];
            
            if (current.includes(option)) {
                current = current.filter(o => o !== option);
            } else {
                current = [...current, option];
            }
            
            SessionManager.submitAnswer(current);
        } else {
            // Single selection
            SessionManager.submitAnswer(option);
        }
        
        Router.refresh();
    },
    
    // Handle keyboard shortcuts
    handleKeydown: (e) => {
        const { session, currentView } = AppState.getState();
        
        // Quiz-specific shortcuts
        if (currentView === 'quiz' && session) {
            // Arrow keys for navigation
            if (e.key === 'ArrowLeft') {
                SessionManager.prev();
                Router.refresh();
            } else if (e.key === 'ArrowRight') {
                SessionManager.next();
                Router.refresh();
            }
            
            // Number keys for quick option selection
            const question = SessionManager.getCurrentQuestion();
            if (question && question.type === 'choice') {
                const keyNum = parseInt(e.key);
                if (keyNum >= 1 && keyNum <= question.options.length) {
                    const option = question.options[keyNum - 1];
                    SessionManager.submitAnswer(option.letter);
                    Router.refresh();
                }
            }
            
            // F to flag
            if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
                const activeElement = document.activeElement;
                if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                    SessionManager.toggleFlag();
                    Router.refresh();
                }
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            Modal.close();
        }
    },
    
    // Handle input events
    handleInput: (e) => {
        const target = e.target;
        
        // Fill in blank inputs
        if (target.dataset.blank !== undefined) {
            const { session } = AppState.getState();
            if (!session) return;
            
            const question = SessionManager.getCurrentQuestion();
            const blankIndex = parseInt(target.dataset.blank);
            let current = session.answers[question.id] || [];
            if (!Array.isArray(current)) current = [];
            
            current = [...current];
            current[blankIndex] = target.value;
            
            SessionManager.submitAnswer(current);
        }
    },
    
    // Setup drag and drop for ordering questions
    setupSortable: (container) => {
        let draggedItem = null;
        
        container.querySelectorAll('.draggable-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                draggedItem = null;
                
                // Update answer
                const items = [...container.querySelectorAll('.draggable-item')];
                const newOrder = items.map((el, i) => ({
                    position: parseInt(el.dataset.position),
                    text: el.querySelector('.drag-text').textContent
                }));
                
                SessionManager.submitAnswer(newOrder);
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                if (draggedItem && draggedItem !== item) {
                    const rect = item.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    
                    if (e.clientY < midY) {
                        container.insertBefore(draggedItem, item);
                    } else {
                        container.insertBefore(draggedItem, item.nextSibling);
                    }
                }
            });
            
            item.addEventListener('dragenter', () => {
                item.classList.add('drag-over');
            });
            
            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });
            
            item.addEventListener('drop', () => {
                item.classList.remove('drag-over');
            });
        });
        
        // Touch support for mobile
        if (Utils.isTouch()) {
            EventHandlers.setupTouchSortable(container);
        }
    },
    
    // Touch-based sorting for mobile
    setupTouchSortable: (container) => {
        let touchItem = null;
        let touchStartY = 0;
        let placeholder = null;
        
        container.querySelectorAll('.draggable-item').forEach(item => {
            item.addEventListener('touchstart', (e) => {
                touchItem = item;
                touchStartY = e.touches[0].clientY;
                item.classList.add('dragging');
                
                // Create placeholder
                placeholder = item.cloneNode(true);
                placeholder.style.opacity = '0.3';
                placeholder.style.pointerEvents = 'none';
            }, { passive: true });
            
            item.addEventListener('touchmove', (e) => {
                if (!touchItem) return;
                
                const touch = e.touches[0];
                const currentY = touch.clientY;
                
                // Find item under touch point
                const items = [...container.querySelectorAll('.draggable-item:not(.dragging)')];
                const target = items.find(el => {
                    const rect = el.getBoundingClientRect();
                    return currentY >= rect.top && currentY <= rect.bottom;
                });
                
                if (target && target !== touchItem) {
                    const rect = target.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    
                    if (currentY < midY) {
                        container.insertBefore(touchItem, target);
                    } else {
                        container.insertBefore(touchItem, target.nextSibling);
                    }
                }
            }, { passive: true });
            
            item.addEventListener('touchend', () => {
                if (!touchItem) return;
                
                touchItem.classList.remove('dragging');
                
                // Update answer
                const items = [...container.querySelectorAll('.draggable-item')];
                const newOrder = items.map((el, i) => ({
                    position: parseInt(el.dataset.position),
                    text: el.querySelector('.drag-text').textContent
                }));
                
                SessionManager.submitAnswer(newOrder);
                touchItem = null;
            });
        });
    },
    
    // Setup matching question handlers
    setupMatching: () => {
        let selectedTerm = null;
        
        document.querySelectorAll('.matching-pair[data-term]').forEach(pair => {
            pair.addEventListener('click', () => {
                // Deselect previous
                document.querySelectorAll('.matching-pair.selected').forEach(p => p.classList.remove('selected'));
                
                pair.classList.add('selected');
                selectedTerm = pair.dataset.term;
            });
        });
        
        document.querySelectorAll('.matching-target[data-definition]').forEach(target => {
            target.addEventListener('click', () => {
                if (!selectedTerm) {
                    Toast.info('Select a term first');
                    return;
                }
                
                const { session } = AppState.getState();
                if (!session) return;
                
                const question = SessionManager.getCurrentQuestion();
                const current = session.answers[question.id] || {};
                
                // Update match
                const newMatches = { ...current, [selectedTerm]: target.dataset.definition };
                SessionManager.submitAnswer(newMatches);
                
                selectedTerm = null;
                Router.refresh();
            });
        });
    },
    
    // Handle IOS terminal input
    handleIOSInput: (e) => {
        if (e.key !== 'Enter') return;
        
        const input = e.target;
        const command = input.value.trim();
        input.value = '';
        
        const { session } = AppState.getState();
        if (!session) return;
        
        const question = SessionManager.getCurrentQuestion();
        let currentAnswer = session.answers[question.id] || {
            state: IOSSimulator.createInstance(question.iosConfig?.hostname || 'Router'),
            success: false
        };
        
        // Execute command
        const { state, output } = IOSSimulator.execute(currentAnswer.state, command);
        
        // Update output
        state.output = [...(currentAnswer.state.output || [])];
        if (command) {
            state.output.push(`${IOSSimulator.getPrompt(currentAnswer.state)}${command}`);
        }
        if (output) {
            state.output.push(output);
        }
        
        // Save answer
        SessionManager.submitAnswer({ state, success: false });
        Router.refresh();
        
        // Re-focus input after refresh
        setTimeout(() => {
            const newInput = document.querySelector('[data-ios-input]');
            if (newInput) newInput.focus();
        }, 10);
    },
    
    // Check IOS answer
    checkIOSAnswer: () => {
        const { session } = AppState.getState();
        if (!session) return;
        
        const question = SessionManager.getCurrentQuestion();
        const answer = session.answers[question.id];
        
        if (!answer || !answer.state) {
            Toast.error('Please enter some commands first');
            return;
        }
        
        const expected = question.iosConfig?.expected || [];
        const success = IOSSimulator.validateCommands(answer.state, expected);
        
        SessionManager.submitAnswer({ ...answer, success });
        Router.refresh();
    },
    
    // Show import modal
    showImportModal: () => {
        Modal.show({
            title: 'Import Quiz',
            size: 'lg',
            content: `
                <div style="margin-bottom: var(--space-4);">
                    <label class="input-label">Quiz Title</label>
                    <input type="text" class="input" id="import-title" placeholder="Enter quiz title...">
                </div>
                <div>
                    <label class="input-label">Questions (paste your quiz text)</label>
                    <textarea class="textarea font-mono" id="import-text" rows="15" 
                              placeholder="1. What is the capital of France?
A. London
B. Paris *
C. Berlin
D. Madrid

2. [order] Arrange in chronological order:
1) First event
2) Second event
3) Third event"></textarea>
                </div>
            `,
            actions: [
                { id: 'cancel', label: 'Cancel', handler: Modal.close },
                {
                    id: 'import',
                    label: 'Import',
                    variant: 'btn-primary',
                    handler: (modal) => {
                        const title = modal.querySelector('#import-title').value || 'Imported Quiz';
                        const text = modal.querySelector('#import-text').value;
                        
                        if (!text.trim()) {
                            Toast.error('Please enter some questions');
                            return;
                        }
                        
                        const quiz = QuizService.importFromText(text, title);
                        if (quiz) {
                            Modal.close(modal);
                            Toast.success(`Imported ${quiz.questions.length} questions`);
                            Router.navigate('library');
                        }
                    }
                }
            ]
        });
    },
    
    // Save quiz from create/edit view
    saveQuiz: () => {
        const title = document.getElementById('quiz-title')?.value;
        const description = document.getElementById('quiz-description')?.value;
        const icon = document.getElementById('quiz-icon')?.value || '📚';
        const color = document.getElementById('quiz-color')?.value || '#FF6B2C';
        const questionsText = document.getElementById('questions-text')?.value;
        
        const settings = {
            shuffleQuestions: document.getElementById('shuffle-questions')?.checked,
            shuffleOptions: document.getElementById('shuffle-options')?.checked,
            showExplanations: document.getElementById('show-explanations')?.checked,
            timerEnabled: document.getElementById('timer-enabled')?.checked,
            timerSeconds: parseInt(document.getElementById('timer-seconds')?.value) || 60
        };
        
        if (!title?.trim()) {
            Toast.error('Please enter a quiz title');
            return;
        }
        
        const questions = QuizParser.parse(questionsText || '');
        
        if (questions.length === 0) {
            Toast.error('Please add at least one question');
            return;
        }
        
        // Check if editing
        const editingId = Router.currentRoute?.params?.id;
        
        if (editingId) {
            QuizService.update(editingId, {
                title, description, icon, color, questions, settings
            });
            Toast.success('Quiz updated');
        } else {
            QuizService.create({
                title, description, icon, color, questions, settings
            });
            Toast.success('Quiz created');
        }
        
        Router.navigate('library');
    },
    
    // Export quiz
    exportQuiz: (quizId) => {
        const text = QuizService.exportToText(quizId);
        const quiz = QuizService.getById(quizId);
        
        if (!text || !quiz) {
            Toast.error('Failed to export quiz');
            return;
        }
        
        // Create download
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${quiz.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Toast.success('Quiz exported');
    },
    
    // Host multiplayer game
    hostMultiplayerGame: () => {
        // Generate room code
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        Modal.show({
            title: 'Select a Quiz',
            size: 'lg',
            content: `
                <div class="grid gap-3" style="gap: var(--space-3);">
                    ${QuizService.getAll().map(quiz => `
                        <button class="card card-hover" style="text-align: left; border: none; cursor: pointer;"
                                data-select-quiz="${quiz.id}">
                            <div class="flex items-center gap-3">
                                <div class="quiz-card-icon" style="background: ${quiz.color}20; color: ${quiz.color};">
                                    ${quiz.icon}
                                </div>
                                <div>
                                    <h4>${Utils.escapeHtml(quiz.title)}</h4>
                                    <p class="text-sm text-muted">${quiz.questions.length} questions</p>
                                </div>
                            </div>
                        </button>
                    `).join('')}
                </div>
            `,
            actions: [
                { id: 'cancel', label: 'Cancel', handler: Modal.close }
            ]
        });
        
        // Handle quiz selection
        setTimeout(() => {
            document.querySelectorAll('[data-select-quiz]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const quizId = btn.dataset.selectQuiz;
                    Modal.close();
                    
                    // Show room code
                    Modal.show({
                        title: 'Room Created!',
                        content: `
                            <div class="mp-code-card">
                                <p class="text-sm opacity-80 mb-2" style="margin-bottom: var(--space-2);">Share this code with your friends:</p>
                                <div class="mp-code">${code}</div>
                            </div>
                            <p class="text-center text-muted mt-4" style="margin-top: var(--space-4);">
                                Waiting for players to join...
                            </p>
                        `,
                        closable: true,
                        actions: [
                            {
                                id: 'copy',
                                label: 'Copy Code',
                                variant: 'btn-secondary',
                                handler: () => {
                                    navigator.clipboard.writeText(code);
                                    Toast.success('Code copied!');
                                }
                            },
                            {
                                id: 'start',
                                label: 'Start Game',
                                variant: 'btn-primary',
                                handler: () => {
                                    Modal.close();
                                    Toast.info('Multiplayer requires a backend server. Coming soon!');
                                }
                            }
                        ]
                    });
                });
            });
        }, 100);
    },
    
    // Join multiplayer game
    joinMultiplayerGame: () => {
        const code = document.getElementById('room-code')?.value?.toUpperCase();
        
        if (!code || code.length < 4) {
            Toast.error('Please enter a valid room code');
            return;
        }
        
        Toast.info('Multiplayer requires a backend server. Coming soon!');
    },
    
    // Trigger confetti effect
    triggerConfetti: () => {
        const colors = ['#FF6B2C', '#22D3EE', '#10B981', '#A855F7', '#FBBF24'];
        
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + 'vw';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.width = Math.random() * 10 + 5 + 'px';
                confetti.style.height = confetti.style.width;
                confetti.style.animationDuration = Math.random() * 2 + 2 + 's';
                document.body.appendChild(confetti);
                
                setTimeout(() => confetti.remove(), 4000);
            }, i * 30);
        }
    }
};

// ============================================
// APP INITIALIZATION
// ============================================

const App = {
    init: () => {
        console.log(`${CONFIG.APP_NAME} v${CONFIG.VERSION} initializing...`);
        
        // Load saved data
        const quizzes = QuizService.getAll();
        const stats = Analytics.getStats();
        
        AppState.setState({
            initialized: true,
            quizzes,
            stats
        });
        
        // Initialize components
        Toast.init();
        Loading.init();
        EventHandlers.init();
        
        // Initial route
        Router.navigate('library');
        
        // Listen for state changes
        AppState.subscribe((state, prevState) => {
            // Auto-refresh view on relevant state changes
            if (state.quizzes !== prevState.quizzes && state.currentView === 'library') {
                Router.refresh();
            }
        });
        
        // Handle browser back/forward (simple implementation)
        window.addEventListener('popstate', () => {
            Router.navigate('library');
        });
        
        console.log(`${CONFIG.APP_NAME} initialized with ${quizzes.length} quizzes`);
    }
};

// ============================================
// START APPLICATION
// ============================================

// Wait for DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
} else {
    App.init();
}