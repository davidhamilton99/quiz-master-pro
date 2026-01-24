// @ts-nocheck
/* eslint-disable */
const API_URL = 'https://davidhamilton.pythonanywhere.com/api';
        
        const state = {
            view: 'login', isAuthenticated: false, user: null, token: null, authMode: 'login',
            quizzes: [], searchQuery: '', sortBy: 'custom', categoryFilter: 'all',
            folders: [], selectedFolder: 'all', customOrder: [],
            currentQuiz: null, currentQuestionIndex: 0, answers: [],
            studyMode: false, showAnswer: false, flaggedQuestions: new Set(),
            timerEnabled: false, timerMinutes: 15, timeRemaining: 0, timerInterval: null, timeExpired: false,
            streak: 0, maxStreak: 0,
            darkMode: localStorage.getItem('darkMode') === 'true',
            showFormatHelp: false, quizTitle: '', quizData: '', quizCategory: '', editingQuizId: null,
            draggedQuizId: null,
            // Phase 5: Multiplayer state
            multiplayer: {
                active: false,
                isHost: false,
                sessionId: null,
                sessionCode: null,
                players: {},
                currentAnswers: {},
                questionTimer: 60,
                questionStartTime: null,
                phase: 'lobby', // lobby, question, waiting, results, finished
                revealed: false
            }
        };
        
        if (state.darkMode) document.documentElement.classList.add('dark');
        
        function toggleDarkMode() { state.darkMode = !state.darkMode; document.documentElement.classList.toggle('dark'); localStorage.setItem('darkMode', state.darkMode); render(); }
        function showToast(msg, type = 'info') { const c = document.getElementById('toast-container'); const t = document.createElement('div'); t.className = `toast ${type}`; t.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span><span>${msg}</span>`; c.appendChild(t); setTimeout(() => t.remove(), 4000); }
        function formatDate(d) { const dt = new Date(d), now = new Date(), diff = Math.floor((now - dt) / 86400000); if (diff === 0) return 'Today'; if (diff === 1) return 'Yesterday'; if (diff < 7) return `${diff} days ago`; return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
        function getRandomColor() { return ['#FF6B35','#10B981','#3B82F6','#A855F7','#EC4899','#EF4444'][Math.floor(Math.random() * 6)]; }
        function shuffleArray(arr) { const s = [...arr]; for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; } return s; }
        function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

/* ============================================
   PORTAL DROPDOWN SYSTEM
   Renders dropdown outside quiz card DOM to escape stacking context
   ============================================ */

const DropdownPortal = {
    container: null,
    menu: null,
    trigger: null,
    isOpen: false,
    
    init() {
        if (this.container) return;
        this.container = document.createElement('div');
        this.container.id = 'dropdown-portal';
        document.body.appendChild(this.container);
        
        document.addEventListener('click', (e) => {
            if (!this.isOpen) return;
            if (this.menu && !this.menu.contains(e.target) && 
                this.trigger && !this.trigger.contains(e.target)) {
                this.close();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });
        
        let timeout;
        const reposition = () => { clearTimeout(timeout); timeout = setTimeout(() => this.position(), 10); };
        window.addEventListener('scroll', reposition, { passive: true, capture: true });
        window.addEventListener('resize', reposition);
    },
    
    open(triggerEl, quizId) {
        this.init();
        if (this.trigger === triggerEl && this.isOpen) { this.close(); return; }
        this.close(false);
        this.trigger = triggerEl;
        this.isOpen = true;
        
        const quiz = state.quizzes.find(q => q.id === quizId);
        if (!quiz) return;
        
        this.menu = document.createElement('div');
        this.menu.className = 'dropdown-portal-menu';
        this.menu.innerHTML = this.buildMenu(quiz);
        this.container.appendChild(this.menu);
        this.position();
        requestAnimationFrame(() => this.menu.classList.add('open'));
    },
    
    buildMenu(quiz) {
        let html = `
            <button class="dropdown-item" onclick="DropdownPortal.close(); showQuizPreview(${quiz.id})">👁️ Preview</button>
            <button class="dropdown-item" onclick="DropdownPortal.close(); editQuiz(${quiz.id})">✏️ Edit</button>
            <button class="dropdown-item" onclick="DropdownPortal.close(); ExportManager.showExportModal(state.quizzes.find(x=>x.id===${quiz.id}))">📤 Export</button>
        `;
        if (state.folders && state.folders.length > 0) {
            html += `<div class="dropdown-divider"></div>`;
            state.folders.forEach(f => {
                html += `<button class="dropdown-item" onclick="DropdownPortal.close(); addToFolder(${quiz.id},${f.id})">📁 ${escapeHtml(f.name)}</button>`;
            });
        }
        html += `<div class="dropdown-divider"></div>
            <button class="dropdown-item danger" onclick="DropdownPortal.close(); deleteQuiz(${quiz.id})">🗑️ Delete</button>`;
        return html;
    },
    
    position() {
        if (!this.menu || !this.trigger) return;
        const tr = this.trigger.getBoundingClientRect();
        const mr = this.menu.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;
        
        if (vw <= 768) {
            this.menu.style.cssText = 'position:fixed;top:auto;bottom:0;left:0;right:0;';
            this.menu.classList.add('mobile-sheet');
        } else {
            let top = tr.bottom + 8, left = tr.right - mr.width;
            if (left < 8) left = tr.left;
            if (left + mr.width > vw - 8) left = vw - mr.width - 8;
            if (top + mr.height > vh - 8) top = tr.top - mr.height - 8;
            this.menu.style.cssText = `position:fixed;top:${top}px;left:${left}px;`;
            this.menu.classList.remove('mobile-sheet');
        }
    },
    
    close(animate = true) {
        if (!this.menu) return;
        if (animate) {
            this.menu.classList.remove('open');
            this.menu.classList.add('closing');
            const ref = this.menu;
            setTimeout(() => ref.remove(), 150);
        } else {
            this.menu.remove();
        }
        this.menu = null;
        this.isOpen = false;
        this.trigger = null;
    }
};

function toggleQuizDropdown(event, quizId) {
    event.stopPropagation();
    event.preventDefault();
    DropdownPortal.open(event.currentTarget, quizId);
}

/* ============================================
   PHASE 2: ADVANCED CODE EXECUTION
   - Monaco Editor (VS Code in browser)
   - Editable "Fix the Bug" questions
   - Multi-language: Python, JavaScript, HTML/CSS
   - Test-driven questions with auto-grading
   ============================================ */

// Runtime state
let pyodideReady = false;
let pyodide = null;
let monacoLoaded = false;
const codeOutputs = {};
const editedCode = {}; // Store user's edited code per question

// ========== PYODIDE (PYTHON) ==========
async function initPyodide() {
    if (pyodide) return pyodide;
    
    console.log('🐍 Initializing Pyodide...');
    
    try {
        pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
        });
        pyodideReady = true;
        console.log('✅ Pyodide ready!');
        return pyodide;
    } catch (err) {
        console.error('❌ Pyodide init failed:', err);
        throw err;
    }
}

// ========== MONACO EDITOR ==========
async function loadMonaco() {
    if (monacoLoaded) return;
    
    return new Promise((resolve, reject) => {
        if (window.monaco) {
            monacoLoaded = true;
            resolve();
            return;
        }
        
        // Load Monaco loader
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js';
        script.onload = () => {
            require.config({ 
                paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }
            });
            require(['vs/editor/editor.main'], () => {
                monacoLoaded = true;
                console.log('✅ Monaco Editor loaded!');
                resolve();
            });
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

const monacoEditors = {};

async function initMonacoEditor(questionIndex, containerId, code, language = 'python') {
    await loadMonaco();
    
    const container = document.getElementById(containerId);
    if (!container) return null;
    
    // Destroy existing editor if any
    if (monacoEditors[questionIndex]) {
        monacoEditors[questionIndex].dispose();
    }
    
    const languageMap = {
        'python': 'python',
        'javascript': 'javascript',
        'js': 'javascript',
        'html': 'html',
        'css': 'css',
        'sql': 'sql',
        'json': 'json'
    };
    
    const editor = monaco.editor.create(container, {
        value: code,
        language: languageMap[language] || 'python',
        theme: state.darkMode ? 'vs-dark' : 'vs',
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        automaticLayout: true,
        scrollBeyondLastLine: false,
        padding: { top: 12, bottom: 12 },
        wordWrap: 'on',
        tabSize: 4,
        insertSpaces: true,
        folding: false,
        lineNumbersMinChars: 3,
        renderLineHighlight: 'line',
        scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10
        }
    });
    
    // Save edited code on change
    editor.onDidChangeModelContent(() => {
        editedCode[questionIndex] = editor.getValue();
    });
    
    monacoEditors[questionIndex] = editor;
    return editor;
}

function getEditedCode(questionIndex) {
    if (monacoEditors[questionIndex]) {
        return monacoEditors[questionIndex].getValue();
    }
    return editedCode[questionIndex] || state.currentQuiz.questions[questionIndex].code;
}

function resetCode(questionIndex) {
    const question = state.currentQuiz.questions[questionIndex];
    const originalCode = question.starterCode || question.code;
    
    if (monacoEditors[questionIndex]) {
        monacoEditors[questionIndex].setValue(originalCode);
    }
    editedCode[questionIndex] = originalCode;
    
    // Clear output
    const outputDiv = document.getElementById(`code-output-${questionIndex}`);
    if (outputDiv) outputDiv.innerHTML = '';
    
    showToast('Code reset to original', 'info');
}

// ========== MULTI-LANGUAGE EXECUTION ==========
async function runCode(questionIndex) {
    const question = state.currentQuiz.questions[questionIndex];
    const language = (question.language || 'python').toLowerCase();
    const code = question.editable ? getEditedCode(questionIndex) : question.code;
    
    const outputDiv = document.getElementById(`code-output-${questionIndex}`);
    const runBtn = document.getElementById(`run-btn-${questionIndex}`);
    
    if (!outputDiv) return;
    
    // Disable button
    if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerHTML = '<span class="spinner-small"></span> Running...';
    }
    
    try {
        let result;
        
        switch (language) {
            case 'python':
                result = await executePython(code, questionIndex);
                break;
            case 'javascript':
            case 'js':
                result = executeJavaScript(code);
                break;
            case 'html':
            case 'html/css':
                result = { type: 'html', content: code };
                break;
            default:
                result = { type: 'error', output: `Unsupported language: ${language}` };
        }
        
        renderCodeOutput(outputDiv, result, question);
        
        // If test cases exist, run them
        if (question.testCases && question.testCases.length > 0) {
            await runTestCases(questionIndex, code, language);
        }
        
    } catch (err) {
        outputDiv.innerHTML = `
            <div class="code-output-error">
                <div class="code-output-header">
                    <span class="code-output-icon">✗</span>
                    <span>Error</span>
                </div>
                <pre class="code-output-pre">${escapeHtml(err.message)}</pre>
            </div>
        `;
    } finally {
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.innerHTML = '▶️ Run Code';
        }
    }
}

async function executePython(code, questionIndex) {
    if (!pyodide) {
        await initPyodide();
    }
    
    codeOutputs[questionIndex] = '';
    
    pyodide.setStdout({ 
        batched: (text) => {
            codeOutputs[questionIndex] = (codeOutputs[questionIndex] || '') + text;
        }
    });
    
    pyodide.setStderr({
        batched: (text) => {
            codeOutputs[questionIndex] = (codeOutputs[questionIndex] || '') + text;
        }
    });
    
    const startTime = performance.now();
    await pyodide.runPythonAsync(code);
    const execTime = Math.round(performance.now() - startTime);
    
    return {
        type: 'success',
        output: codeOutputs[questionIndex] || '(no output)',
        execTime
    };
}

function executeJavaScript(code) {
    const startTime = performance.now();
    let output = '';
    
    // Create sandbox with custom console
    const originalLog = console.log;
    const logs = [];
    
    try {
        console.log = (...args) => {
            logs.push(args.map(a => 
                typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
            ).join(' '));
        };
        
        // Execute in sandbox
        const result = new Function(code)();
        
        if (result !== undefined) {
            logs.push(`→ ${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}`);
        }
        
        output = logs.join('\n') || '(no output)';
        const execTime = Math.round(performance.now() - startTime);
        
        return { type: 'success', output, execTime };
        
    } catch (err) {
        return { type: 'error', output: err.message };
    } finally {
        console.log = originalLog;
    }
}

function renderCodeOutput(container, result, question) {
    if (result.type === 'html') {
        // HTML preview
        container.innerHTML = `
            <div class="code-output-html">
                <div class="code-output-header">
                    <span class="code-output-icon">🌐</span>
                    <span>Preview</span>
                </div>
                <div class="html-preview-frame">
                    <iframe 
                        srcdoc="${escapeHtml(result.content)}"
                        sandbox="allow-scripts"
                        style="width:100%;height:200px;border:none;background:white;border-radius:0 0 var(--radius-md) var(--radius-md);"
                    ></iframe>
                </div>
            </div>
        `;
    } else if (result.type === 'success') {
        container.innerHTML = `
            <div class="code-output-success">
                <div class="code-output-header">
                    <span class="code-output-icon">✓</span>
                    <span>Output</span>
                    ${result.execTime ? `<span class="code-output-time">${result.execTime}ms</span>` : ''}
                </div>
                <pre class="code-output-pre">${escapeHtml(result.output)}</pre>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="code-output-error">
                <div class="code-output-header">
                    <span class="code-output-icon">✗</span>
                    <span>Error</span>
                </div>
                <pre class="code-output-pre">${escapeHtml(result.output)}</pre>
            </div>
        `;
    }
}

// ========== TEST-DRIVEN QUESTIONS ==========
async function runTestCases(questionIndex, code, language) {
    const question = state.currentQuiz.questions[questionIndex];
    const testCases = question.testCases;
    
    if (!testCases || testCases.length === 0) return;
    
    const testOutputDiv = document.getElementById(`test-output-${questionIndex}`);
    if (!testOutputDiv) return;
    
    testOutputDiv.innerHTML = `
        <div class="code-running">
            <span class="spinner-small"></span>
            <span>Running ${testCases.length} test cases...</span>
        </div>
    `;
    
    const results = [];
    
    for (const testCase of testCases) {
        try {
            let passed = false;
            let actual = '';
            
            if (language === 'python') {
                // Run Python test
                const testCode = `${code}\n\n# Test\n${testCase.test}`;
                codeOutputs[questionIndex] = '';
                await pyodide.runPythonAsync(testCode);
                actual = codeOutputs[questionIndex].trim();
                passed = actual === testCase.expected.trim();
            } else if (language === 'javascript' || language === 'js') {
                // Run JS test
                const logs = [];
                const originalLog = console.log;
                console.log = (...args) => logs.push(args.join(' '));
                
                try {
                    new Function(code + '\n' + testCase.test)();
                    actual = logs.join('\n').trim();
                    passed = actual === testCase.expected.trim();
                } finally {
                    console.log = originalLog;
                }
            }
            
            results.push({
                input: testCase.input || testCase.test,
                expected: testCase.expected,
                actual,
                passed
            });
            
        } catch (err) {
            results.push({
                input: testCase.input || testCase.test,
                expected: testCase.expected,
                actual: err.message,
                passed: false,
                error: true
            });
        }
    }
    
    const passedCount = results.filter(r => r.passed).length;
    const allPassed = passedCount === results.length;
    
    testOutputDiv.innerHTML = `
        <div class="test-results ${allPassed ? 'all-passed' : 'some-failed'}">
            <div class="test-results-header">
                <span class="test-results-icon">${allPassed ? '🎉' : '⚠️'}</span>
                <span class="test-results-summary">
                    ${passedCount}/${results.length} tests passed
                </span>
            </div>
            <div class="test-results-list">
                ${results.map((r, i) => `
                    <div class="test-case ${r.passed ? 'passed' : 'failed'}">
                        <div class="test-case-header">
                            <span class="test-case-icon">${r.passed ? '✓' : '✗'}</span>
                            <span>Test ${i + 1}</span>
                        </div>
                        <div class="test-case-details">
                            <div class="test-case-row">
                                <span class="test-case-label">Input:</span>
                                <code>${escapeHtml(r.input)}</code>
                            </div>
                            <div class="test-case-row">
                                <span class="test-case-label">Expected:</span>
                                <code>${escapeHtml(r.expected)}</code>
                            </div>
                            <div class="test-case-row ${r.passed ? '' : 'error'}">
                                <span class="test-case-label">${r.error ? 'Error:' : 'Got:'}</span>
                                <code>${escapeHtml(r.actual)}</code>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Auto-mark correct if all tests pass (for editable questions)
    if (allPassed && question.editable && question.autoGrade) {
        // This could auto-select the correct answer or mark as complete
        showToast('All tests passed! 🎉', 'success');
    }
}

// ========== RENDER CODE BLOCK ==========
function renderExecutableCodeBlock(question, questionIndex) {
    if (!question.code) return '';
    
    const language = question.language || 'python';
    const isExecutable = question.executable === true;
    const isEditable = question.editable === true;
    const hasTests = question.testCases && question.testCases.length > 0;
    
    // For editable questions, use Monaco editor
    if (isEditable && isExecutable) {
        const editorId = `monaco-editor-${questionIndex}`;
        
        // Initialize Monaco after render
        setTimeout(() => {
            const code = editedCode[questionIndex] || question.starterCode || question.code;
            initMonacoEditor(questionIndex, editorId, code, language);
        }, 100);
        
        return `
            <div class="code-block-container editable">
                <div class="code-block">
                    <div class="code-header">
                        <div class="code-dots">
                            <div class="code-dot red"></div>
                            <div class="code-dot yellow"></div>
                            <div class="code-dot green"></div>
                        </div>
                        <span class="code-language">${language}</span>
                        <span class="badge badge-accent" style="margin-left:0.5rem">Editable</span>
                        <div style="margin-left:auto;display:flex;gap:0.5rem">
                            <button 
                                onclick="resetCode(${questionIndex}); event.stopPropagation();" 
                                class="btn btn-sm btn-ghost code-reset-btn">
                                ↺ Reset
                            </button>
                            <button 
                                id="run-btn-${questionIndex}"
                                onclick="runCode(${questionIndex}); event.stopPropagation();" 
                                class="btn btn-sm btn-accent code-run-btn">
                                ▶️ Run Code
                            </button>
                        </div>
                    </div>
                    <div id="${editorId}" class="monaco-editor-container" style="height:250px"></div>
                </div>
                <div id="code-output-${questionIndex}" class="code-output-container"></div>
                ${hasTests ? `<div id="test-output-${questionIndex}" class="test-output-container"></div>` : ''}
            </div>
        `;
    }
    
    // Read-only executable code
    return `
        <div class="code-block-container">
            <div class="code-block">
                <div class="code-header">
                    <div class="code-dots">
                        <div class="code-dot red"></div>
                        <div class="code-dot yellow"></div>
                        <div class="code-dot green"></div>
                    </div>
                    <span class="code-language">${language}</span>
                    ${isExecutable ? `
                        <button 
                            id="run-btn-${questionIndex}"
                            onclick="runCode(${questionIndex}); event.stopPropagation();" 
                            class="btn btn-sm btn-accent code-run-btn">
                            ▶️ Run Code
                        </button>
                    ` : ''}
                </div>
                <pre class="code-body"><code>${escapeHtml(question.code)}</code></pre>
            </div>
            ${isExecutable ? `
                <div id="code-output-${questionIndex}" class="code-output-container"></div>
                ${hasTests ? `<div id="test-output-${questionIndex}" class="test-output-container"></div>` : ''}
            ` : ''}
        </div>
    `;
}

// Cleanup editors when leaving quiz
function cleanupMonacoEditors() {
    Object.keys(monacoEditors).forEach(key => {
        if (monacoEditors[key]) {
            monacoEditors[key].dispose();
            delete monacoEditors[key];
        }
    });
}

console.log('🚀 Phase 2: Advanced Code Execution loaded!');
console.log('   ✓ Monaco Editor (editable code)');
console.log('   ✓ Multi-language: Python, JavaScript, HTML/CSS');
console.log('   ✓ Test-driven questions');

/* ============================================
   PHASE 3: SPACED REPETITION & STUDY ANALYTICS
   - SM-2 Algorithm for optimal review scheduling
   - Study statistics and streaks
   - Keyboard shortcuts for power users
   - Confidence-based learning
   - Export to Anki
   ============================================ */

// ========== SM-2 SPACED REPETITION ALGORITHM ==========
// Based on SuperMemo 2 algorithm - the gold standard for flashcards

const SRS = {
    // Get or initialize SRS data for a quiz
    getData(quizId) {
        const key = `srs-${quizId}`;
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : {};
        } catch {
            return {};
        }
    },
    
    saveData(quizId, data) {
        const key = `srs-${quizId}`;
        localStorage.setItem(key, JSON.stringify(data));
    },
    
    // Initialize a question's SRS data
    initQuestion(quizId, questionIndex) {
        const data = this.getData(quizId);
        if (!data[questionIndex]) {
            data[questionIndex] = {
                easeFactor: 2.5, // Starting ease factor
                interval: 0,     // Days until next review
                repetitions: 0,  // Number of successful reviews
                nextReview: Date.now(), // When to review next
                lastReview: null,
                history: []      // Review history for analytics
            };
            this.saveData(quizId, data);
        }
        return data[questionIndex];
    },
    
    // Process a review with quality rating (0-5)
    // 0-2: Incorrect (reset), 3: Correct with difficulty, 4: Correct, 5: Easy
    review(quizId, questionIndex, quality) {
        const data = this.getData(quizId);
        const card = data[questionIndex] || this.initQuestion(quizId, questionIndex);
        
        // Record history
        card.history.push({
            date: Date.now(),
            quality,
            interval: card.interval
        });
        
        card.lastReview = Date.now();
        
        if (quality < 3) {
            // Failed - reset
            card.repetitions = 0;
            card.interval = 0;
        } else {
            // Passed
            if (card.repetitions === 0) {
                card.interval = 1;
            } else if (card.repetitions === 1) {
                card.interval = 6;
            } else {
                card.interval = Math.round(card.interval * card.easeFactor);
            }
            card.repetitions++;
        }
        
        // Update ease factor
        card.easeFactor = Math.max(1.3, 
            card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        );
        
        // Calculate next review date
        card.nextReview = Date.now() + (card.interval * 24 * 60 * 60 * 1000);
        
        data[questionIndex] = card;
        this.saveData(quizId, data);
        
        return card;
    },
    
    // Get questions due for review
    getDueQuestions(quizId, questions) {
        const data = this.getData(quizId);
        const now = Date.now();
        const due = [];
        
        questions.forEach((q, i) => {
            const card = data[i];
            if (!card || card.nextReview <= now) {
                due.push({
                    index: i,
                    question: q,
                    overdue: card ? Math.floor((now - card.nextReview) / (24*60*60*1000)) : 0
                });
            }
        });
        
        // Sort by most overdue first
        due.sort((a, b) => b.overdue - a.overdue);
        return due;
    },
    
    // Get mastery level (0-5 stars)
    getMastery(quizId, questionIndex) {
        const data = this.getData(quizId);
        const card = data[questionIndex];
        if (!card) return 0;
        
        if (card.interval >= 30) return 5;
        if (card.interval >= 14) return 4;
        if (card.interval >= 7) return 3;
        if (card.interval >= 3) return 2;
        if (card.repetitions >= 1) return 1;
        return 0;
    },
    
    // Get overall quiz mastery percentage
    getQuizMastery(quizId, totalQuestions) {
        const data = this.getData(quizId);
        let totalMastery = 0;
        
        for (let i = 0; i < totalQuestions; i++) {
            totalMastery += this.getMastery(quizId, i);
        }
        
        return Math.round((totalMastery / (totalQuestions * 5)) * 100);
    }
};

// ========== STUDY STATISTICS ==========
const StudyStats = {
    getStats() {
        try {
            const data = localStorage.getItem('study-stats');
            return data ? JSON.parse(data) : this.initStats();
        } catch {
            return this.initStats();
        }
    },
    
    initStats() {
        return {
            totalReviews: 0,
            correctAnswers: 0,
            totalStudyTime: 0, // in seconds
            streak: 0,
            longestStreak: 0,
            lastStudyDate: null,
            dailyActivity: {}, // date -> count
            quizStats: {}      // quizId -> stats
        };
    },
    
    saveStats(stats) {
        localStorage.setItem('study-stats', JSON.stringify(stats));
    },
    
    recordAnswer(quizId, correct, timeSpent) {
        const stats = this.getStats();
        const today = new Date().toISOString().split('T')[0];
        
        stats.totalReviews++;
        if (correct) stats.correctAnswers++;
        stats.totalStudyTime += timeSpent;
        
        // Update daily activity
        stats.dailyActivity[today] = (stats.dailyActivity[today] || 0) + 1;
        
        // Update streak
        const lastDate = stats.lastStudyDate;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        if (lastDate === today) {
            // Same day, streak continues
        } else if (lastDate === yesterday) {
            // Consecutive day
            stats.streak++;
            stats.longestStreak = Math.max(stats.longestStreak, stats.streak);
        } else if (lastDate !== today) {
            // Streak broken or first day
            stats.streak = 1;
        }
        stats.lastStudyDate = today;
        
        // Update quiz-specific stats
        if (!stats.quizStats[quizId]) {
            stats.quizStats[quizId] = { reviews: 0, correct: 0, time: 0 };
        }
        stats.quizStats[quizId].reviews++;
        if (correct) stats.quizStats[quizId].correct++;
        stats.quizStats[quizId].time += timeSpent;
        
        this.saveStats(stats);
        return stats;
    },
    
    getAccuracy() {
        const stats = this.getStats();
        if (stats.totalReviews === 0) return 0;
        return Math.round((stats.correctAnswers / stats.totalReviews) * 100);
    },
    
    getStreak() {
        const stats = this.getStats();
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        // Check if streak is still active
        if (stats.lastStudyDate !== today && stats.lastStudyDate !== yesterday) {
            return 0;
        }
        return stats.streak;
    },
    
    getHeatMapData(weeks = 12) {
        const stats = this.getStats();
        const data = [];
        const today = new Date();
        
        for (let i = weeks * 7 - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const count = stats.dailyActivity[dateStr] || 0;
            
            let level = 0;
            if (count >= 50) level = 4;
            else if (count >= 25) level = 3;
            else if (count >= 10) level = 2;
            else if (count >= 1) level = 1;
            
            data.push({ date: dateStr, count, level });
        }
        
        return data;
    }
};

// ========== KEYBOARD SHORTCUTS ==========
const KeyboardShortcuts = {
    enabled: true,
    
    init() {
        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.metaKey || e.ctrlKey) return;
            
            this.handleKey(e);
        });
    },
    
    handleKey(e) {
        const key = e.key.toLowerCase();
        
        // Quiz mode shortcuts
        if (state.view === 'quiz' && state.currentQuiz) {
            switch (key) {
                case '1': case '2': case '3': case '4': case '5':
                    e.preventDefault();
                    this.selectOption(parseInt(key) - 1);
                    break;
                case 'a': case 'b': case 'c': case 'd': case 'e':
                    e.preventDefault();
                    this.selectOption('abcde'.indexOf(key));
                    break;
                case ' ': // Space
                case 'enter':
                    e.preventDefault();
                    this.submitOrNext();
                    break;
                case 'r':
                    e.preventDefault();
                    this.runCode();
                    break;
                case 's':
                    e.preventDefault();
                    this.skipQuestion();
                    break;
                case 'h':
                    e.preventDefault();
                    this.showHint();
                    break;
                case '?':
                    e.preventDefault();
                    this.showShortcutsModal();
                    break;
            }
        }
        
        // Global shortcuts
        switch (key) {
            case 'escape':
                this.closeModals();
                break;
        }
    },
    
    selectOption(index) {
        const question = state.currentQuiz?.questions[state.currentQuestion];
        if (!question || state.submitted) return;
        
        const options = document.querySelectorAll('.option-btn, .option-label');
        if (options[index]) {
            options[index].click();
        }
    },
    
    submitOrNext() {
        if (state.submitted) {
            // Go to next question
            const nextBtn = document.querySelector('[onclick*="nextQuestion"]');
            if (nextBtn) nextBtn.click();
        } else if (state.selectedOptions?.length > 0) {
            // Submit answer
            const submitBtn = document.querySelector('[onclick*="submitAnswer"]');
            if (submitBtn) submitBtn.click();
        }
    },
    
    runCode() {
        const runBtn = document.querySelector('.code-run-btn');
        if (runBtn) runBtn.click();
    },
    
    skipQuestion() {
        if (typeof nextQuestion === 'function') {
            nextQuestion();
        }
    },
    
    showHint() {
        const hintBtn = document.querySelector('[onclick*="showHint"]');
        if (hintBtn) hintBtn.click();
    },
    
    closeModals() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
    },
    
    showShortcutsModal() {
        const m = document.createElement('div');
        m.innerHTML = `
            <div class="modal-overlay" onclick="if(event.target===this)this.remove()">
                <div class="modal keyboard-shortcuts-modal">
                    <div class="modal-header">
                        <h2>⌨️ Keyboard Shortcuts</h2>
                        <button class="btn btn-icon btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="shortcut-row">
                            <span>Select option</span>
                            <div class="shortcut-keys">
                                <span class="keyboard-hint">1</span>
                                <span class="keyboard-hint">2</span>
                                <span class="keyboard-hint">3</span>
                                <span>or</span>
                                <span class="keyboard-hint">A</span>
                                <span class="keyboard-hint">B</span>
                                <span class="keyboard-hint">C</span>
                            </div>
                        </div>
                        <div class="shortcut-row">
                            <span>Submit / Next</span>
                            <div class="shortcut-keys">
                                <span class="keyboard-hint">Space</span>
                                <span>or</span>
                                <span class="keyboard-hint">Enter</span>
                            </div>
                        </div>
                        <div class="shortcut-row">
                            <span>Run code</span>
                            <span class="keyboard-hint">R</span>
                        </div>
                        <div class="shortcut-row">
                            <span>Skip question</span>
                            <span class="keyboard-hint">S</span>
                        </div>
                        <div class="shortcut-row">
                            <span>Show hint</span>
                            <span class="keyboard-hint">H</span>
                        </div>
                        <div class="shortcut-row">
                            <span>Close modal</span>
                            <span class="keyboard-hint">Esc</span>
                        </div>
                        <div class="shortcut-row">
                            <span>Show shortcuts</span>
                            <span class="keyboard-hint">?</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(m.firstElementChild);
    }
};

// Initialize keyboard shortcuts
KeyboardShortcuts.init();

// ========== EXPORT FUNCTIONALITY ==========
const ExportManager = {
    toAnki(quiz) {
        // Anki import format: front\tback
        let output = '';
        
        quiz.questions.forEach(q => {
            const front = q.question + (q.code ? '\n```\n' + q.code + '\n```' : '');
            let back = '';
            
            if (q.type === 'choice' && q.options) {
                back = q.options.filter((_, i) => q.correct.includes(i)).join(', ');
            } else if (q.type === 'text') {
                back = Array.isArray(q.correct) ? q.correct[0] : q.correct;
            }
            
            if (q.explanation) {
                back += '\n\n' + q.explanation;
            }
            
            output += front.replace(/\t/g, '  ').replace(/\n/g, '<br>') + '\t' + 
                     back.replace(/\t/g, '  ').replace(/\n/g, '<br>') + '\n';
        });
        
        return output;
    },
    
    toCSV(quiz) {
        let csv = 'Question,Type,Options,Correct Answer,Explanation\n';
        
        quiz.questions.forEach(q => {
            const question = '"' + q.question.replace(/"/g, '""') + '"';
            const type = q.type;
            const options = q.options ? '"' + q.options.join('; ').replace(/"/g, '""') + '"' : '';
            const correct = q.options ? 
                '"' + q.options.filter((_, i) => q.correct.includes(i)).join('; ').replace(/"/g, '""') + '"' :
                '"' + (Array.isArray(q.correct) ? q.correct[0] : q.correct) + '"';
            const explanation = q.explanation ? '"' + q.explanation.replace(/"/g, '""') + '"' : '';
            
            csv += `${question},${type},${options},${correct},${explanation}\n`;
        });
        
        return csv;
    },
    
    toMarkdown(quiz) {
        let md = `# ${quiz.title}\n\n`;
        if (quiz.description) md += `*${quiz.description}*\n\n`;
        md += '---\n\n';
        
        quiz.questions.forEach((q, i) => {
            md += `## Question ${i + 1}\n\n`;
            md += q.question + '\n\n';
            
            if (q.code) {
                md += '```' + (q.language || 'python') + '\n' + q.code + '\n```\n\n';
            }
            
            if (q.options) {
                q.options.forEach((opt, j) => {
                    const isCorrect = q.correct.includes(j);
                    md += `${isCorrect ? '✓' : '○'} ${String.fromCharCode(65 + j)}. ${opt}\n`;
                });
            }
            
            if (q.explanation) {
                md += `\n> **Explanation:** ${q.explanation}\n`;
            }
            
            md += '\n---\n\n';
        });
        
        return md;
    },
    
    download(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    showExportModal(quiz) {
        const m = document.createElement('div');
        m.innerHTML = `
            <div class="modal-overlay" onclick="if(event.target===this)this.remove()">
                <div class="modal">
                    <div class="modal-header">
                        <h2>📤 Export Quiz</h2>
                        <button class="btn btn-icon btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted" style="margin-bottom:1rem">Choose export format for "${escapeHtml(quiz.title)}"</p>
                        <div class="export-options">
                            <div class="export-option" onclick="ExportManager.exportAs('anki', ${quiz.id})">
                                <div class="icon">📚</div>
                                <div class="label">Anki</div>
                                <div class="desc">Import to Anki app</div>
                            </div>
                            <div class="export-option" onclick="ExportManager.exportAs('csv', ${quiz.id})">
                                <div class="icon">📊</div>
                                <div class="label">CSV</div>
                                <div class="desc">Excel/Sheets</div>
                            </div>
                            <div class="export-option" onclick="ExportManager.exportAs('markdown', ${quiz.id})">
                                <div class="icon">📝</div>
                                <div class="label">Markdown</div>
                                <div class="desc">Notion/Obsidian</div>
                            </div>
                            <div class="export-option" onclick="ExportManager.exportAs('json', ${quiz.id})">
                                <div class="icon">🔧</div>
                                <div class="label">JSON</div>
                                <div class="desc">Re-import later</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(m.firstElementChild);
    },
    
    async exportAs(format, quizId) {
        const quiz = state.quizzes.find(q => q.id === quizId);
        if (!quiz) return;
        
        const safeName = quiz.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        switch (format) {
            case 'anki':
                this.download(this.toAnki(quiz), `${safeName}_anki.txt`, 'text/plain');
                break;
            case 'csv':
                this.download(this.toCSV(quiz), `${safeName}.csv`, 'text/csv');
                break;
            case 'markdown':
                this.download(this.toMarkdown(quiz), `${safeName}.md`, 'text/markdown');
                break;
            case 'json':
                this.download(JSON.stringify([quiz], null, 2), `${safeName}.json`, 'application/json');
                break;
        }
        
        document.querySelector('.modal-overlay')?.remove();
        showToast(`Exported as ${format.toUpperCase()}`, 'success');
    }
};

// ========== RENDER HELPERS FOR PHASE 3 ==========

function renderStatsCard(value, label, trend = null) {
    return `
        <div class="stat-card">
            <div class="stat-value">${value}</div>
            <div class="stat-label">${label}</div>
            ${trend ? `<div class="stat-trend ${trend > 0 ? 'up' : 'down'}">${trend > 0 ? '↑' : '↓'} ${Math.abs(trend)}%</div>` : ''}
        </div>
    `;
}

function renderStreakDisplay() {
    try {
        const streak = StudyStats.getStreak();
        if (streak === 0) return '';
        
        return `
            <div class="streak-display">
                <span class="streak-flame">🔥</span>
                <span class="streak-count">${streak}</span>
                <span class="streak-label">day${streak !== 1 ? 's' : ''}</span>
            </div>
        `;
    } catch(e) {
        console.warn('Streak display error:', e);
        return '';
    }
}

function renderMasteryStars(quizId, questionIndex) {
    const mastery = SRS.getMastery(quizId, questionIndex);
    let stars = '';
    for (let i = 0; i < 5; i++) {
        stars += `<span class="mastery-star ${i < mastery ? 'filled' : ''}">★</span>`;
    }
    return `<div class="mastery-stars" title="${mastery}/5 mastery">${stars}</div>`;
}

function renderProgressRing(percentage, label = 'Mastery') {
    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (percentage / 100) * circumference;
    
    return `
        <div class="progress-ring">
            <svg width="120" height="120">
                <circle class="progress-ring-bg" cx="60" cy="60" r="52"></circle>
                <circle class="progress-ring-fill" cx="60" cy="60" r="52"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${offset}"></circle>
            </svg>
            <div class="progress-ring-text">
                <div class="progress-ring-value">${percentage}%</div>
                <div class="progress-ring-label">${label}</div>
            </div>
        </div>
    `;
}

function renderHeatMap() {
    const data = StudyStats.getHeatMapData(12);
    const days = data.map(d => 
        `<div class="heat-map-day level-${d.level}" title="${d.date}: ${d.count} reviews"></div>`
    ).join('');
    
    return `<div class="heat-map">${days}</div>`;
}

// Safe helper to get due count (prevents errors from crashing the UI)
function getDueCount(quizId, questions) {
    try {
        return SRS.getDueQuestions(quizId, questions || []).length;
    } catch(e) {
        console.warn('SRS error:', e);
        return 0;
    }
}

function renderDueBanner() {
    try {
        if (!state.quizzes || state.quizzes.length === 0) return '';
        
        let totalDue = 0;
        state.quizzes.forEach(quiz => {
            totalDue += getDueCount(quiz.id, quiz.questions);
        });
        
        if (totalDue === 0) return '';
        
        return `
            <div class="srs-banner">
                <div class="srs-banner-content">
                    <span class="srs-banner-icon">📖</span>
                    <div class="srs-banner-text">
                        <h3>${totalDue} card${totalDue !== 1 ? 's' : ''} due for review</h3>
                        <p>Keep your streak alive! Study now for optimal retention.</p>
                    </div>
                </div>
                <button class="btn btn-accent" onclick="startSRSReview()">Start Review</button>
            </div>
        `;
    } catch(e) {
        console.warn('Due banner error:', e);
        return '';
    }
}

// Start SRS review mode
function startSRSReview() {
    // Find quiz with most due cards
    let maxDue = 0;
    let targetQuiz = null;
    
    state.quizzes.forEach(quiz => {
        const due = SRS.getDueQuestions(quiz.id, quiz.questions || []);
        if (due.length > maxDue) {
            maxDue = due.length;
            targetQuiz = quiz;
        }
    });
    
    if (targetQuiz) {
        state.currentQuiz = targetQuiz;
        state.srsMode = true;
        state.view = 'quiz';
        state.currentQuestion = 0;
        state.score = 0;
        state.submitted = false;
        state.selectedOptions = [];
        state.questionStartTime = Date.now();
        render();
    }
}

// Record SRS result after answering
function recordSRSResult(quizId, questionIndex, correct) {
    // Convert correct/incorrect to SM-2 quality
    // For simplicity: correct = 4, incorrect = 1
    const quality = correct ? 4 : 1;
    SRS.review(quizId, questionIndex, quality);
    
    // Record stats
    const timeSpent = Math.round((Date.now() - (state.questionStartTime || Date.now())) / 1000);
    StudyStats.recordAnswer(quizId, correct, timeSpent);
}

// Confidence button handler
function selectConfidence(quality) {
    if (!state.currentQuiz || state.currentQuestion === undefined) return;
    
    SRS.review(state.currentQuiz.id, state.currentQuestion, quality);
    
    const timeSpent = Math.round((Date.now() - (state.questionStartTime || Date.now())) / 1000);
    StudyStats.recordAnswer(state.currentQuiz.id, quality >= 3, timeSpent);
    
    // Move to next question
    nextQuestion();
}

function renderConfidenceButtons() {
    return `
        <div class="confidence-buttons">
            <button class="confidence-btn" onclick="selectConfidence(1)">
                <span class="emoji">😵</span>
                <span class="label">Again</span>
            </button>
            <button class="confidence-btn" onclick="selectConfidence(3)">
                <span class="emoji">😐</span>
                <span class="label">Hard</span>
            </button>
            <button class="confidence-btn" onclick="selectConfidence(4)">
                <span class="emoji">🙂</span>
                <span class="label">Good</span>
            </button>
            <button class="confidence-btn" onclick="selectConfidence(5)">
                <span class="emoji">😎</span>
                <span class="label">Easy</span>
            </button>
        </div>
    `;
}

console.log('🚀 Phase 3: Spaced Repetition & Analytics loaded!');
console.log('   ✓ SM-2 Algorithm');
console.log('   ✓ Study Statistics');
console.log('   ✓ Keyboard Shortcuts (press ? for help)');
console.log('   ✓ Export to Anki/CSV/Markdown');

/* ============================================
   PHASE 4: CISCO IOS COMMAND SIMULATION
   - Terminal-style IOS interface
   - Router/Switch mode simulation
   - Command verification and auto-grading
   - Perfect for CCNA prep!
   ============================================ */

const CiscoIOS = {
    // Router modes
    MODES: {
        USER_EXEC: { prompt: '>', name: 'User EXEC', color: '#22c55e' },
        PRIVILEGED_EXEC: { prompt: '#', name: 'Privileged EXEC', color: '#3b82f6' },
        GLOBAL_CONFIG: { prompt: '(config)#', name: 'Global Config', color: '#f59e0b' },
        INTERFACE_CONFIG: { prompt: '(config-if)#', name: 'Interface Config', color: '#ec4899' },
        LINE_CONFIG: { prompt: '(config-line)#', name: 'Line Config', color: '#8b5cf6' },
        ROUTER_CONFIG: { prompt: '(config-router)#', name: 'Router Config', color: '#ef4444' }
    },
    
    // Current simulator state
    state: {
        hostname: 'Router',
        mode: 'USER_EXEC',
        currentInterface: null,
        history: [],
        output: []
    },
    
    // Reset simulator
    reset(hostname = 'Router') {
        this.state = {
            hostname: hostname,
            mode: 'USER_EXEC',
            currentInterface: null,
            history: [],
            output: []
        };
    },
    
    // Get current prompt
    getPrompt() {
        const mode = this.MODES[this.state.mode];
        let prompt = this.state.hostname;
        
        if (this.state.mode === 'INTERFACE_CONFIG' && this.state.currentInterface) {
            prompt += `(config-if)`;
        } else if (this.state.mode !== 'USER_EXEC' && this.state.mode !== 'PRIVILEGED_EXEC') {
            prompt += mode.prompt.replace('#', '');
        }
        
        return prompt + (this.state.mode === 'USER_EXEC' ? '>' : '#');
    },
    
    // Common IOS commands and their shortcuts
    COMMANDS: {
        // User EXEC mode
        'enable': { mode: 'USER_EXEC', action: 'PRIVILEGED_EXEC', abbrev: ['en', 'ena', 'enab', 'enabl'] },
        'ping': { mode: '*', output: (args) => `Pinging ${args[0] || '?'} with 32 bytes of data...` },
        'traceroute': { mode: '*', abbrev: ['trace', 'tracer'] },
        'show': { mode: '*', abbrev: ['sh', 'sho'] },
        'exit': { mode: '*', action: 'EXIT' },
        'end': { mode: '*', action: 'PRIVILEGED_EXEC', abbrev: ['en'] },
        'disable': { mode: 'PRIVILEGED_EXEC', action: 'USER_EXEC', abbrev: ['dis', 'disa', 'disab', 'disabl'] },
        
        // Privileged EXEC mode
        'configure terminal': { mode: 'PRIVILEGED_EXEC', action: 'GLOBAL_CONFIG', abbrev: ['conf t', 'config t', 'configure t'] },
        'copy running-config startup-config': { mode: 'PRIVILEGED_EXEC', output: () => 'Building configuration...\n[OK]', abbrev: ['copy run start', 'wr', 'write'] },
        'write memory': { mode: 'PRIVILEGED_EXEC', output: () => 'Building configuration...\n[OK]', abbrev: ['wr', 'wr mem'] },
        'reload': { mode: 'PRIVILEGED_EXEC', output: () => 'System configuration has been modified. Save? [yes/no]: ' },
        
        // Global Config mode
        'hostname': { mode: 'GLOBAL_CONFIG', action: 'SET_HOSTNAME' },
        'interface': { mode: 'GLOBAL_CONFIG', action: 'INTERFACE_CONFIG', abbrev: ['int', 'inter'] },
        'ip route': { mode: 'GLOBAL_CONFIG', output: () => '' },
        'router ospf': { mode: 'GLOBAL_CONFIG', action: 'ROUTER_CONFIG', abbrev: ['router o'] },
        'router eigrp': { mode: 'GLOBAL_CONFIG', action: 'ROUTER_CONFIG', abbrev: ['router e'] },
        'router rip': { mode: 'GLOBAL_CONFIG', action: 'ROUTER_CONFIG' },
        'line console': { mode: 'GLOBAL_CONFIG', action: 'LINE_CONFIG', abbrev: ['line con'] },
        'line vty': { mode: 'GLOBAL_CONFIG', action: 'LINE_CONFIG' },
        'enable secret': { mode: 'GLOBAL_CONFIG' },
        'enable password': { mode: 'GLOBAL_CONFIG' },
        'service password-encryption': { mode: 'GLOBAL_CONFIG', abbrev: ['serv pass'] },
        'no ip domain-lookup': { mode: 'GLOBAL_CONFIG', abbrev: ['no ip domain-l', 'no ip dom lo'] },
        'banner motd': { mode: 'GLOBAL_CONFIG' },
        
        // Interface Config mode
        'ip address': { mode: 'INTERFACE_CONFIG', abbrev: ['ip add', 'ip addr'] },
        'no shutdown': { mode: 'INTERFACE_CONFIG', output: () => '%LINK-5-CHANGED: Interface changed state to up\n%LINEPROTO-5-UPDOWN: Line protocol changed state to up', abbrev: ['no sh', 'no shut'] },
        'shutdown': { mode: 'INTERFACE_CONFIG', output: () => '%LINK-5-CHANGED: Interface changed state to administratively down', abbrev: ['sh', 'shut'] },
        'description': { mode: 'INTERFACE_CONFIG', abbrev: ['desc'] },
        'duplex': { mode: 'INTERFACE_CONFIG' },
        'speed': { mode: 'INTERFACE_CONFIG' },
        'switchport mode access': { mode: 'INTERFACE_CONFIG', abbrev: ['sw mo ac'] },
        'switchport mode trunk': { mode: 'INTERFACE_CONFIG', abbrev: ['sw mo tr'] },
        'switchport access vlan': { mode: 'INTERFACE_CONFIG', abbrev: ['sw ac vl'] },
        
        // Line Config mode  
        'password': { mode: 'LINE_CONFIG', abbrev: ['pass'] },
        'login': { mode: 'LINE_CONFIG' },
        'logging synchronous': { mode: 'LINE_CONFIG', abbrev: ['logg sync', 'logging sync'] },
        'exec-timeout': { mode: 'LINE_CONFIG' },
        
        // Router Config mode
        'network': { mode: 'ROUTER_CONFIG', abbrev: ['net', 'netw'] },
        'passive-interface': { mode: 'ROUTER_CONFIG', abbrev: ['pass', 'passive'] },
        'auto-summary': { mode: 'ROUTER_CONFIG' },
        'no auto-summary': { mode: 'ROUTER_CONFIG' }
    },
    
    // Show commands output
    SHOW_OUTPUTS: {
        'show running-config': () => `Building configuration...\n\nCurrent configuration : 1024 bytes\n!\nhostname ${CiscoIOS.state.hostname}\n!\ninterface GigabitEthernet0/0\n ip address 192.168.1.1 255.255.255.0\n no shutdown\n!\nend`,
        'show ip interface brief': () => `Interface              IP-Address      OK? Method Status                Protocol\nGigabitEthernet0/0     192.168.1.1     YES manual up                    up\nGigabitEthernet0/1     unassigned      YES unset  administratively down down\nSerial0/0/0            10.0.0.1        YES manual up                    up`,
        'show interfaces': () => `GigabitEthernet0/0 is up, line protocol is up\n  Hardware is iGbE, address is 0050.56ab.1234\n  Internet address is 192.168.1.1/24\n  MTU 1500 bytes, BW 1000000 Kbit/sec`,
        'show ip route': () => `Codes: C - connected, S - static, R - RIP, O - OSPF\n\nGateway of last resort is not set\n\nC    192.168.1.0/24 is directly connected, GigabitEthernet0/0\nS    10.0.0.0/8 [1/0] via 192.168.1.254`,
        'show version': () => `Cisco IOS Software, Version 15.4(3)M\nROM: System Bootstrap, Version 15.4(3)M\nRouter uptime is 2 hours, 15 minutes\nSystem image file is "flash:c2900-universalk9-mz.SPA.154-3.M.bin"`,
        'show vlan brief': () => `VLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n1    default                          active    Fa0/1, Fa0/2, Fa0/3\n10   SALES                            active    Fa0/10, Fa0/11\n20   ENGINEERING                      active    Fa0/20, Fa0/21`,
        'show mac address-table': () => `          Mac Address Table\n-------------------------------------------\nVlan    Mac Address       Type        Ports\n----    -----------       --------    -----\n   1    0050.56ab.1234    DYNAMIC     Fa0/1\n  10    0050.56ab.5678    DYNAMIC     Fa0/10`
    },
    
    // Parse and execute command
    execute(input) {
        const cmd = input.trim().toLowerCase();
        if (!cmd) return '';
        
        this.state.history.push(cmd);
        
        // Handle ? for help
        if (cmd === '?') {
            return this.getHelp();
        }
        
        // Handle show commands
        if (cmd.startsWith('show ') || cmd.startsWith('sh ')) {
            return this.handleShow(cmd);
        }
        
        // Find matching command
        const match = this.findCommand(cmd);
        
        if (!match) {
            return `% Invalid input detected at '^' marker.\n${cmd}\n^`;
        }
        
        return this.executeCommand(match, cmd);
    },
    
    findCommand(input) {
        const inputParts = input.split(' ');
        
        for (const [fullCmd, config] of Object.entries(this.COMMANDS)) {
            // Check exact match
            if (input === fullCmd || input.startsWith(fullCmd + ' ')) {
                return { cmd: fullCmd, config, args: input.slice(fullCmd.length).trim().split(' ').filter(x => x) };
            }
            
            // Check abbreviations
            if (config.abbrev) {
                for (const abbrev of config.abbrev) {
                    if (input === abbrev || input.startsWith(abbrev + ' ')) {
                        return { cmd: fullCmd, config, args: input.slice(abbrev.length).trim().split(' ').filter(x => x) };
                    }
                }
            }
        }
        
        return null;
    },
    
    executeCommand(match, input) {
        const { cmd, config, args } = match;
        
        // Check mode
        if (config.mode !== '*' && config.mode !== this.state.mode) {
            return `% Invalid input detected - wrong mode`;
        }
        
        // Handle actions
        if (config.action) {
            switch (config.action) {
                case 'EXIT':
                    if (this.state.mode === 'USER_EXEC') {
                        return 'Connection closed.';
                    } else if (this.state.mode === 'PRIVILEGED_EXEC') {
                        this.state.mode = 'USER_EXEC';
                    } else if (this.state.mode === 'GLOBAL_CONFIG') {
                        this.state.mode = 'PRIVILEGED_EXEC';
                    } else {
                        this.state.mode = 'GLOBAL_CONFIG';
                        this.state.currentInterface = null;
                    }
                    return '';
                    
                case 'SET_HOSTNAME':
                    if (args[0]) {
                        this.state.hostname = args[0];
                    }
                    return '';
                    
                case 'INTERFACE_CONFIG':
                    this.state.mode = 'INTERFACE_CONFIG';
                    this.state.currentInterface = args.join('');
                    return '';
                    
                case 'LINE_CONFIG':
                    this.state.mode = 'LINE_CONFIG';
                    return '';
                    
                case 'ROUTER_CONFIG':
                    this.state.mode = 'ROUTER_CONFIG';
                    return '';
                    
                default:
                    if (this.MODES[config.action]) {
                        this.state.mode = config.action;
                    }
                    return '';
            }
        }
        
        // Handle output
        if (config.output) {
            return typeof config.output === 'function' ? config.output(args) : config.output;
        }
        
        return '';
    },
    
    handleShow(cmd) {
        // Normalize show command
        let normalized = cmd.replace(/^sh\s+/, 'show ').replace(/^sho\s+/, 'show ');
        
        // Handle abbreviations
        normalized = normalized
            .replace('show run', 'show running-config')
            .replace('show ip int br', 'show ip interface brief')
            .replace('show ip int brief', 'show ip interface brief')
            .replace('show int', 'show interfaces')
            .replace('show ver', 'show version')
            .replace('show vl br', 'show vlan brief')
            .replace('show vlan br', 'show vlan brief')
            .replace('show mac add', 'show mac address-table');
        
        for (const [showCmd, outputFn] of Object.entries(this.SHOW_OUTPUTS)) {
            if (normalized.startsWith(showCmd)) {
                return outputFn();
            }
        }
        
        return `% Invalid show command`;
    },
    
    getHelp() {
        const modeCommands = {
            'USER_EXEC': ['enable', 'ping', 'traceroute', 'show', 'exit'],
            'PRIVILEGED_EXEC': ['configure terminal', 'copy running-config startup-config', 'disable', 'ping', 'reload', 'show', 'write memory'],
            'GLOBAL_CONFIG': ['hostname', 'interface', 'ip route', 'router ospf', 'router eigrp', 'line console', 'line vty', 'enable secret', 'service password-encryption', 'no ip domain-lookup', 'banner motd', 'exit', 'end'],
            'INTERFACE_CONFIG': ['ip address', 'no shutdown', 'shutdown', 'description', 'duplex', 'speed', 'switchport mode access', 'switchport mode trunk', 'exit', 'end'],
            'LINE_CONFIG': ['password', 'login', 'logging synchronous', 'exec-timeout', 'exit', 'end'],
            'ROUTER_CONFIG': ['network', 'passive-interface', 'no auto-summary', 'exit', 'end']
        };
        
        const cmds = modeCommands[this.state.mode] || [];
        return `Available commands in ${this.MODES[this.state.mode].name} mode:\n\n${cmds.map(c => `  ${c}`).join('\n')}`;
    },
    
    // Validate if user's command is correct for a question
    validateCommand(userInput, expectedCommand, options = {}) {
        const userCmd = userInput.trim().toLowerCase();
        const expected = expectedCommand.trim().toLowerCase();
        
        // Exact match
        if (userCmd === expected) {
            return { correct: true, message: 'Correct!' };
        }
        
        // Check if user used valid abbreviation
        const userMatch = this.findCommand(userCmd);
        const expectedMatch = this.findCommand(expected);
        
        if (userMatch && expectedMatch && userMatch.cmd === expectedMatch.cmd) {
            // Same command, check args
            const userArgs = userMatch.args.join(' ');
            const expectedArgs = expectedMatch.args.join(' ');
            
            if (userArgs === expectedArgs || options.ignoreArgs) {
                return { correct: true, message: 'Correct! (using abbreviation)' };
            }
        }
        
        // Partial credit for correct command, wrong args
        if (userMatch && expectedMatch && userMatch.cmd === expectedMatch.cmd) {
            return { correct: false, partial: true, message: `Correct command, but check your arguments.\nExpected: ${expected}` };
        }
        
        return { correct: false, message: `Incorrect.\nExpected: ${expected}\nYour answer: ${userInput}` };
    }
};

// Render Cisco IOS terminal interface
function renderIOSTerminal(question, questionIndex) {
    const hostname = question.hostname || 'Router';
    const startMode = question.startMode || 'USER_EXEC';
    const mode = CiscoIOS.MODES[startMode];
    
    // Reset simulator for this question
    CiscoIOS.reset(hostname);
    CiscoIOS.state.mode = startMode;
    
    const prompt = CiscoIOS.getPrompt();
    
    return `
        <div class="ios-terminal-container">
            <div class="ios-terminal">
                <div class="ios-terminal-header">
                    <div class="ios-terminal-dots">
                        <span class="ios-dot red"></span>
                        <span class="ios-dot yellow"></span>
                        <span class="ios-dot green"></span>
                    </div>
                    <span class="ios-terminal-title">🖥️ Cisco IOS - ${escapeHtml(hostname)}</span>
                    <span class="ios-mode-badge" style="background:${mode.color}">${mode.name}</span>
                </div>
                <div class="ios-terminal-body" id="ios-output-${questionIndex}">
                    ${question.initialOutput ? `<pre class="ios-output">${escapeHtml(question.initialOutput)}</pre>` : ''}
                    <div class="ios-prompt-line">
                        <span class="ios-prompt">${escapeHtml(prompt)}</span>
                        <input 
                            type="text" 
                            class="ios-input" 
                            id="ios-input-${questionIndex}"
                            placeholder="Enter command..."
                            autocomplete="off"
                            autocapitalize="off"
                            spellcheck="false"
                            onkeydown="handleIOSInput(event, ${questionIndex})"
                        >
                    </div>
                </div>
            </div>
            <div class="ios-help-text">
                <span>💡 Type <code>?</code> for help</span>
                <span>Press <kbd>Enter</kbd> to execute</span>
            </div>
            <div id="ios-result-${questionIndex}" class="ios-result-container"></div>
        </div>
    `;
}

// Handle IOS terminal input
function handleIOSInput(event, questionIndex) {
    if (event.key !== 'Enter') return;
    
    const input = event.target;
    const command = input.value;
    const outputDiv = document.getElementById(`ios-output-${questionIndex}`);
    const question = state.currentQuiz.questions[questionIndex];
    
    // Add command to output
    const commandLine = document.createElement('div');
    commandLine.className = 'ios-command-line';
    commandLine.innerHTML = `<span class="ios-prompt">${escapeHtml(CiscoIOS.getPrompt())}</span><span>${escapeHtml(command)}</span>`;
    
    // Insert before the prompt line
    const promptLine = outputDiv.querySelector('.ios-prompt-line');
    outputDiv.insertBefore(commandLine, promptLine);
    
    // Execute command and show output
    const output = CiscoIOS.execute(command);
    if (output) {
        const outputLine = document.createElement('pre');
        outputLine.className = 'ios-output';
        outputLine.textContent = output;
        outputDiv.insertBefore(outputLine, promptLine);
    }
    
    // Update prompt
    promptLine.querySelector('.ios-prompt').textContent = CiscoIOS.getPrompt();
    
    // Clear input
    input.value = '';
    
    // Scroll to bottom
    outputDiv.scrollTop = outputDiv.scrollHeight;
    
    // Check if this is an answer submission
    if (question.expectedCommand) {
        checkIOSAnswer(questionIndex, command);
    }
}

// Check IOS command answer
function checkIOSAnswer(questionIndex, userCommand) {
    const question = state.currentQuiz.questions[questionIndex];
    const resultDiv = document.getElementById(`ios-result-${questionIndex}`);
    
    // Support multiple correct answers
    const expectedCommands = Array.isArray(question.expectedCommand) 
        ? question.expectedCommand 
        : [question.expectedCommand];
    
    let bestResult = { correct: false, message: '' };
    
    for (const expected of expectedCommands) {
        const result = CiscoIOS.validateCommand(userCommand, expected, question.validateOptions || {});
        if (result.correct) {
            bestResult = result;
            break;
        }
        if (result.partial && !bestResult.partial) {
            bestResult = result;
        }
    }
    
    if (bestResult.correct) {
        resultDiv.innerHTML = `
            <div class="ios-result success">
                <span class="ios-result-icon">✓</span>
                <span>${bestResult.message}</span>
            </div>
        `;
        // Record SRS if enabled
        if (state.currentQuiz) {
            recordSRSResult(state.currentQuiz.id, questionIndex, true);
        }
    } else if (bestResult.partial) {
        resultDiv.innerHTML = `
            <div class="ios-result partial">
                <span class="ios-result-icon">⚠️</span>
                <span>${escapeHtml(bestResult.message)}</span>
            </div>
        `;
    }
    // Don't show incorrect immediately - let user keep trying
}

// Submit IOS answer (for explicit submission)
function submitIOSAnswer(questionIndex) {
    const input = document.getElementById(`ios-input-${questionIndex}`);
    const question = state.currentQuiz.questions[questionIndex];
    const resultDiv = document.getElementById(`ios-result-${questionIndex}`);
    
    const userCommand = input.value.trim() || CiscoIOS.state.history[CiscoIOS.state.history.length - 1] || '';
    
    const expectedCommands = Array.isArray(question.expectedCommand) 
        ? question.expectedCommand 
        : [question.expectedCommand];
    
    let isCorrect = false;
    for (const expected of expectedCommands) {
        const result = CiscoIOS.validateCommand(userCommand, expected);
        if (result.correct) {
            isCorrect = true;
            break;
        }
    }
    
    if (!isCorrect) {
        resultDiv.innerHTML = `
            <div class="ios-result error">
                <span class="ios-result-icon">✗</span>
                <div>
                    <strong>Incorrect</strong><br>
                    <span class="text-muted">Expected: <code>${escapeHtml(expectedCommands[0])}</code></span>
                    ${question.explanation ? `<br><span class="text-muted">${escapeHtml(question.explanation)}</span>` : ''}
                </div>
            </div>
        `;
        recordSRSResult(state.currentQuiz.id, questionIndex, false);
    }
    
    state.submitted = true;
    render();
}

console.log('🚀 Phase 4: Cisco IOS Simulation loaded!');
console.log('   ✓ Terminal interface');
console.log('   ✓ Router/Switch modes');
console.log('   ✓ Command abbreviations');
console.log('   ✓ Auto-grading');

/* ============================================
   PHASE 5: MULTIPLAYER QUIZ MODE
   - Real-time competitive quizzing with friends
   - Firebase for instant synchronization
   - Lobby system with join codes
   - Live scoring and leaderboards
   - 60-second timer per question
   ============================================ */

// Firebase configuration - You'll need to replace with your own
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    authDomain: "quiz-master-pro-multiplayer.firebaseapp.com",
    databaseURL: "https://quiz-master-pro-multiplayer-default-rtdb.firebaseio.com",
    projectId: "quiz-master-pro-multiplayer",
    storageBucket: "quiz-master-pro-multiplayer.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase (will be called when needed)
let firebaseApp = null;
let firebaseDB = null;
let sessionRef = null;
let sessionListener = null;

function initFirebase() {
    if (firebaseApp) return true;
    
    try {
        // Check if Firebase is loaded
        if (typeof firebase === 'undefined') {
            console.warn('Firebase SDK not loaded');
            return false;
        }
        
        firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
        firebaseDB = firebase.database();
        console.log('✅ Firebase initialized');
        return true;
    } catch (err) {
        console.error('Firebase init error:', err);
        return false;
    }
}

// ========== MULTIPLAYER SESSION MANAGEMENT ==========
const Multiplayer = {
    // Generate a 6-character session code
    generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    },
    
    // Create a new multiplayer session
    async createSession(quizId, settings = {}) {
        if (!initFirebase()) {
            showToast('Multiplayer not available', 'error');
            return null;
        }
        
        const quiz = state.quizzes.find(q => q.id === quizId);
        if (!quiz) {
            showToast('Quiz not found', 'error');
            return null;
        }
        
        const sessionCode = this.generateCode();
        const sessionId = `session_${Date.now()}_${sessionCode}`;
        const playerId = `player_${state.user.id || Date.now()}`;
        
        const sessionData = {
            id: sessionId,
            code: sessionCode,
            hostId: playerId,
            quizId: quizId,
            quizTitle: quiz.title,
            questions: quiz.questions,
            status: 'lobby', // lobby, playing, finished
            currentQuestionIndex: 0,
            questionStartedAt: null,
            settings: {
                timePerQuestion: settings.timePerQuestion || 60,
                showExplanations: settings.showExplanations !== false
            },
            players: {
                [playerId]: {
                    id: playerId,
                    name: state.user?.username || 'Host',
                    score: 0,
                    isHost: true,
                    connected: true,
                    answeredCurrent: false,
                    currentAnswer: null,
                    readyForNext: false,
                    joinedAt: Date.now()
                }
            },
            answers: {},
            createdAt: Date.now()
        };
        
        try {
            await firebaseDB.ref(`sessions/${sessionCode}`).set(sessionData);
            
            // Update local state
            state.multiplayer = {
                active: true,
                isHost: true,
                sessionId: sessionId,
                sessionCode: sessionCode,
                playerId: playerId,
                players: sessionData.players,
                currentAnswers: {},
                questionTimer: settings.timePerQuestion || 60,
                questionStartTime: null,
                phase: 'lobby',
                revealed: false,
                quiz: quiz
            };
            
            // Listen for session changes
            this.listenToSession(sessionCode);
            
            state.view = 'multiplayer-lobby';
            render();
            
            showToast(`Session created! Code: ${sessionCode}`, 'success');
            return sessionCode;
            
        } catch (err) {
            console.error('Create session error:', err);
            showToast('Failed to create session', 'error');
            return null;
        }
    },
    
    // Join an existing session
    async joinSession(code) {
        if (!initFirebase()) {
            showToast('Multiplayer not available', 'error');
            return false;
        }
        
        const sessionCode = code.toUpperCase().trim();
        
        try {
            const snapshot = await firebaseDB.ref(`sessions/${sessionCode}`).once('value');
            const session = snapshot.val();
            
            if (!session) {
                showToast('Session not found', 'error');
                return false;
            }
            
            if (session.status !== 'lobby') {
                showToast('Game already in progress', 'error');
                return false;
            }
            
            const playerCount = Object.keys(session.players || {}).length;
            if (playerCount >= 8) {
                showToast('Session is full (max 8 players)', 'error');
                return false;
            }
            
            const playerId = `player_${state.user?.id || Date.now()}`;
            const playerData = {
                id: playerId,
                name: state.user?.username || `Player ${playerCount + 1}`,
                score: 0,
                isHost: false,
                connected: true,
                answeredCurrent: false,
                currentAnswer: null,
                readyForNext: false,
                joinedAt: Date.now()
            };
            
            await firebaseDB.ref(`sessions/${sessionCode}/players/${playerId}`).set(playerData);
            
            // Update local state
            state.multiplayer = {
                active: true,
                isHost: false,
                sessionId: session.id,
                sessionCode: sessionCode,
                playerId: playerId,
                players: { ...session.players, [playerId]: playerData },
                currentAnswers: {},
                questionTimer: session.settings?.timePerQuestion || 60,
                questionStartTime: null,
                phase: 'lobby',
                revealed: false,
                quiz: { title: session.quizTitle, questions: session.questions }
            };
            
            // Listen for session changes
            this.listenToSession(sessionCode);
            
            state.view = 'multiplayer-lobby';
            render();
            
            showToast('Joined session!', 'success');
            return true;
            
        } catch (err) {
            console.error('Join session error:', err);
            showToast('Failed to join session', 'error');
            return false;
        }
    },
    
    // Listen for real-time session updates
    listenToSession(sessionCode) {
        if (sessionListener) {
            sessionListener.off();
        }
        
        sessionRef = firebaseDB.ref(`sessions/${sessionCode}`);
        sessionListener = sessionRef.on('value', (snapshot) => {
            const session = snapshot.val();
            if (!session) {
                this.handleSessionEnded();
                return;
            }
            
            // Update local state from Firebase
            state.multiplayer.players = session.players || {};
            state.multiplayer.quiz = { title: session.quizTitle, questions: session.questions };
            
            if (session.status === 'playing') {
                state.view = 'multiplayer-game';
                state.currentQuestionIndex = session.currentQuestionIndex || 0;
                state.multiplayer.questionStartTime = session.questionStartedAt;
                state.multiplayer.revealed = session.revealed || false;
                state.multiplayer.currentAnswers = session.answers?.[session.currentQuestionIndex] || {};
                state.multiplayer.phase = session.revealed ? 'results' : 'question';
                
                // Start timer if we're the joining player and game just started
                if (!state.multiplayer.timerInterval && !session.revealed) {
                    this.startQuestionTimer();
                }
            } else if (session.status === 'finished') {
                state.multiplayer.phase = 'finished';
                state.view = 'multiplayer-game';
            } else {
                state.multiplayer.phase = 'lobby';
            }
            
            render();
        });
        
        // Handle disconnection
        const playerRef = firebaseDB.ref(`sessions/${sessionCode}/players/${state.multiplayer.playerId}/connected`);
        playerRef.onDisconnect().set(false);
    },
    
    // Host starts the game
    async startGame() {
        if (!state.multiplayer.isHost) return;
        
        const playerCount = Object.keys(state.multiplayer.players).length;
        if (playerCount < 2) {
            showToast('Need at least 2 players', 'warning');
            return;
        }
        
        try {
            await firebaseDB.ref(`sessions/${state.multiplayer.sessionCode}`).update({
                status: 'playing',
                currentQuestionIndex: 0,
                questionStartedAt: Date.now(),
                revealed: false
            });
            
            // Start the question timer
            this.startQuestionTimer();
            
        } catch (err) {
            console.error('Start game error:', err);
            showToast('Failed to start game', 'error');
        }
    },
    
    // Submit an answer
    async submitAnswer(answerIndex) {
        if (!state.multiplayer.active) return;
        if (state.multiplayer.revealed) return;
        
        const playerId = state.multiplayer.playerId;
        const questionIndex = state.currentQuestionIndex;
        
        try {
            await firebaseDB.ref(`sessions/${state.multiplayer.sessionCode}`).update({
                [`answers/${questionIndex}/${playerId}`]: answerIndex,
                [`players/${playerId}/answeredCurrent`]: true,
                [`players/${playerId}/currentAnswer`]: answerIndex
            });
            
            state.multiplayer.currentAnswers[playerId] = answerIndex;
            render();
            
        } catch (err) {
            console.error('Submit answer error:', err);
            showToast('Failed to submit answer', 'error');
        }
    },
    
    // Timer countdown
    startQuestionTimer() {
        if (state.multiplayer.timerInterval) {
            clearInterval(state.multiplayer.timerInterval);
        }
        
        state.multiplayer.timerInterval = setInterval(() => {
            if (!state.multiplayer.questionStartTime) return;
            
            const elapsed = (Date.now() - state.multiplayer.questionStartTime) / 1000;
            const remaining = state.multiplayer.questionTimer - elapsed;
            
            if (remaining <= 0) {
                this.timeUp();
            }
            
            // Update timer display
            const timerEl = document.getElementById('mp-timer');
            if (timerEl) {
                timerEl.textContent = Math.max(0, Math.ceil(remaining));
                if (remaining <= 10) {
                    timerEl.classList.add('timer-warning');
                }
            }
        }, 100);
    },
    
    // Time's up - reveal answers
    async timeUp() {
        if (!state.multiplayer.isHost) return;
        if (state.multiplayer.revealed) return;
        
        clearInterval(state.multiplayer.timerInterval);
        
        // Calculate scores
        const question = state.multiplayer.quiz.questions[state.currentQuestionIndex];
        const answers = state.multiplayer.currentAnswers;
        const correctAnswer = question.correct[0];
        
        const scoreUpdates = {};
        Object.entries(state.multiplayer.players).forEach(([playerId, player]) => {
            const playerAnswer = answers[playerId];
            let scoreChange = 0;
            
            if (playerAnswer === undefined || playerAnswer === null) {
                scoreChange = -1; // Timeout penalty
            } else if (playerAnswer === correctAnswer) {
                scoreChange = 1; // Correct
            } else {
                scoreChange = -1; // Wrong
            }
            
            scoreUpdates[`players/${playerId}/score`] = (player.score || 0) + scoreChange;
            scoreUpdates[`players/${playerId}/answeredCurrent`] = false;
            scoreUpdates[`players/${playerId}/readyForNext`] = false;
        });
        
        scoreUpdates['revealed'] = true;
        
        try {
            await firebaseDB.ref(`sessions/${state.multiplayer.sessionCode}`).update(scoreUpdates);
        } catch (err) {
            console.error('Score update error:', err);
        }
    },
    
    // Player ready for next question
    async readyForNext() {
        try {
            await firebaseDB.ref(`sessions/${state.multiplayer.sessionCode}/players/${state.multiplayer.playerId}/readyForNext`).set(true);
            
            // If host and all ready, move to next question
            if (state.multiplayer.isHost) {
                const allReady = Object.values(state.multiplayer.players).every(p => p.readyForNext);
                if (allReady) {
                    this.nextQuestion();
                }
            }
        } catch (err) {
            console.error('Ready error:', err);
        }
    },
    
    // Move to next question (host only)
    async nextQuestion() {
        if (!state.multiplayer.isHost) return;
        
        const nextIndex = state.currentQuestionIndex + 1;
        const totalQuestions = state.multiplayer.quiz.questions.length;
        
        if (nextIndex >= totalQuestions) {
            // Game finished
            await firebaseDB.ref(`sessions/${state.multiplayer.sessionCode}`).update({
                status: 'finished'
            });
            return;
        }
        
        // Reset for next question
        const resetUpdates = {
            currentQuestionIndex: nextIndex,
            questionStartedAt: Date.now(),
            revealed: false
        };
        
        Object.keys(state.multiplayer.players).forEach(playerId => {
            resetUpdates[`players/${playerId}/answeredCurrent`] = false;
            resetUpdates[`players/${playerId}/currentAnswer`] = null;
            resetUpdates[`players/${playerId}/readyForNext`] = false;
        });
        
        try {
            await firebaseDB.ref(`sessions/${state.multiplayer.sessionCode}`).update(resetUpdates);
            this.startQuestionTimer();
        } catch (err) {
            console.error('Next question error:', err);
        }
    },
    
    // Leave session
    async leaveSession() {
        if (!state.multiplayer.active) return;
        
        clearInterval(state.multiplayer.timerInterval);
        
        if (sessionListener) {
            sessionListener.off();
            sessionListener = null;
        }
        
        try {
            if (state.multiplayer.isHost) {
                // Host leaving ends the session
                await firebaseDB.ref(`sessions/${state.multiplayer.sessionCode}`).remove();
            } else {
                // Player leaving just removes them
                await firebaseDB.ref(`sessions/${state.multiplayer.sessionCode}/players/${state.multiplayer.playerId}`).remove();
            }
        } catch (err) {
            console.error('Leave session error:', err);
        }
        
        this.resetState();
        state.view = 'library';
        render();
        showToast('Left session', 'info');
    },
    
    // Handle session ended (host left or error)
    handleSessionEnded() {
        clearInterval(state.multiplayer.timerInterval);
        
        if (sessionListener) {
            sessionListener.off();
            sessionListener = null;
        }
        
        this.resetState();
        state.view = 'library';
        render();
        showToast('Session ended', 'info');
    },
    
    // Reset multiplayer state
    resetState() {
        state.multiplayer = {
            active: false,
            isHost: false,
            sessionId: null,
            sessionCode: null,
            playerId: null,
            players: {},
            currentAnswers: {},
            questionTimer: 60,
            questionStartTime: null,
            phase: 'lobby',
            revealed: false,
            quiz: null,
            timerInterval: null
        };
    }
};

// ========== MULTIPLAYER UI COMPONENTS ==========

function renderMultiplayerLobby() {
    const mp = state.multiplayer;
    const players = Object.values(mp.players).sort((a, b) => a.joinedAt - b.joinedAt);
    const playerCount = players.length;
    
    return `
        <div class="mp-container">
            <nav class="navbar">
                <div class="container">
                    <div class="navbar-inner">
                        <button onclick="Multiplayer.leaveSession()" class="btn btn-ghost">← Leave</button>
                        <div style="text-align:center">
                            <h2 style="font-size:1rem;margin-bottom:2px">🎮 Multiplayer</h2>
                            <p class="text-xs text-muted">${escapeHtml(mp.quiz?.title || 'Quiz')}</p>
                        </div>
                        <div></div>
                    </div>
                </div>
            </nav>
            
            <main class="mp-lobby">
                <div class="container-narrow">
                    <div class="mp-code-card">
                        <p class="text-sm text-muted" style="margin-bottom:0.5rem">Join Code</p>
                        <div class="mp-code">${mp.sessionCode}</div>
                        <button onclick="navigator.clipboard.writeText('${mp.sessionCode}');showToast('Code copied!','success')" class="btn btn-ghost btn-sm" style="margin-top:1rem">
                            📋 Copy Code
                        </button>
                    </div>
                    
                    <div class="mp-players-card">
                        <h3 style="margin-bottom:1rem">Players (${playerCount}/8)</h3>
                        <div class="mp-players-list">
                            ${players.map((p, i) => `
                                <div class="mp-player ${p.id === mp.playerId ? 'is-you' : ''}">
                                    <div class="mp-player-avatar" style="background:${getPlayerColor(i)}">${p.name.charAt(0).toUpperCase()}</div>
                                    <span class="mp-player-name">${escapeHtml(p.name)}</span>
                                    ${p.isHost ? '<span class="badge badge-accent">Host</span>' : ''}
                                    ${p.id === mp.playerId ? '<span class="badge">You</span>' : ''}
                                    ${!p.connected ? '<span class="badge badge-error">Disconnected</span>' : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="mp-settings-card">
                        <h3 style="margin-bottom:1rem">Game Settings</h3>
                        <div class="mp-setting">
                            <span>⏱️ Time per question</span>
                            <span class="font-semibold">${mp.questionTimer}s</span>
                        </div>
                        <div class="mp-setting">
                            <span>📝 Questions</span>
                            <span class="font-semibold">${mp.quiz?.questions?.length || 0}</span>
                        </div>
                        <div class="mp-setting">
                            <span>📊 Scoring</span>
                            <span class="font-semibold">+1 correct, -1 wrong</span>
                        </div>
                    </div>
                    
                    ${mp.isHost ? `
                        <button onclick="Multiplayer.startGame()" class="btn btn-accent btn-lg mp-start-btn" ${playerCount < 2 ? 'disabled' : ''}>
                            🚀 Start Game ${playerCount < 2 ? '(Need 2+ players)' : ''}
                        </button>
                    ` : `
                        <div class="mp-waiting">
                            <div class="mp-waiting-spinner"></div>
                            <p>Waiting for host to start...</p>
                        </div>
                    `}
                </div>
            </main>
        </div>
    `;
}

function renderMultiplayerGame() {
    const mp = state.multiplayer;
    const question = mp.quiz?.questions?.[state.currentQuestionIndex];
    if (!question) return renderMultiplayerLobby();
    
    const players = Object.values(mp.players).sort((a, b) => (b.score || 0) - (a.score || 0));
    const myAnswer = mp.currentAnswers[mp.playerId];
    const hasAnswered = myAnswer !== undefined && myAnswer !== null;
    const answeredCount = Object.keys(mp.currentAnswers).length;
    const totalPlayers = players.length;
    
    // Calculate time remaining
    let timeRemaining = mp.questionTimer;
    if (mp.questionStartTime) {
        const elapsed = (Date.now() - mp.questionStartTime) / 1000;
        timeRemaining = Math.max(0, Math.ceil(mp.questionTimer - elapsed));
    }
    
    return `
        <div class="mp-container">
            <nav class="mp-game-header">
                <div class="container">
                    <div class="flex justify-between items-center" style="padding:1rem 0">
                        <div>
                            <p class="text-sm text-muted">Question ${state.currentQuestionIndex + 1}/${mp.quiz.questions.length}</p>
                        </div>
                        <div class="mp-timer ${timeRemaining <= 10 ? 'timer-warning' : ''}" id="mp-timer">
                            ${timeRemaining}
                        </div>
                        <div class="mp-answered-count">
                            ${answeredCount}/${totalPlayers} answered
                        </div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width:${((state.currentQuestionIndex + 1) / mp.quiz.questions.length) * 100}%"></div>
                    </div>
                </div>
            </nav>
            
            <main class="mp-game-content">
                <div class="container">
                    <div class="mp-game-layout">
                        <div class="mp-question-area">
                            <div class="card" style="padding:2rem">
                                <div class="flex items-start gap-md" style="margin-bottom:2rem">
                                    <div class="question-number">${state.currentQuestionIndex + 1}</div>
                                    <h2 class="question-text">${escapeHtml(question.question)}</h2>
                                </div>
                                
                                ${question.code ? `
                                    <div class="code-block" style="margin-bottom:1.5rem">
                                        <div class="code-header">
                                            <div class="code-dot" style="background:#ef4444"></div>
                                            <div class="code-dot" style="background:#f59e0b"></div>
                                            <div class="code-dot" style="background:#22c55e"></div>
                                        </div>
                                        <pre class="code-body"><code>${escapeHtml(question.code)}</code></pre>
                                    </div>
                                ` : ''}
                                
                                ${question.image ? `
                                    <img src="${escapeHtml(question.image)}" alt="Question image" style="max-width:100%;max-height:200px;border-radius:var(--radius-md);margin-bottom:1.5rem">
                                ` : ''}
                                
                                <div class="flex flex-col gap-sm">
                                    ${question.options.map((opt, i) => {
                                        let cls = 'option-btn';
                                        if (mp.revealed) {
                                            if (question.correct.includes(i)) cls += ' correct';
                                            else if (myAnswer === i) cls += ' incorrect';
                                        } else if (myAnswer === i) {
                                            cls += ' selected';
                                        }
                                        
                                        return `
                                            <button 
                                                class="${cls}" 
                                                onclick="Multiplayer.submitAnswer(${i})"
                                                ${hasAnswered || mp.revealed ? 'disabled' : ''}
                                            >
                                                <span class="option-letter">${String.fromCharCode(65 + i)}</span>
                                                <span style="flex:1">${escapeHtml(opt)}</span>
                                                ${mp.revealed && question.correct.includes(i) ? '<span class="badge badge-success">✓</span>' : ''}
                                                ${mp.revealed && myAnswer === i && !question.correct.includes(i) ? '<span class="badge badge-error">✗</span>' : ''}
                                            </button>
                                        `;
                                    }).join('')}
                                </div>
                                
                                ${hasAnswered && !mp.revealed ? `
                                    <div class="mp-waiting-reveal">
                                        <div class="mp-waiting-spinner"></div>
                                        <p>Waiting for others... (${answeredCount}/${totalPlayers})</p>
                                    </div>
                                ` : ''}
                                
                                ${mp.revealed ? `
                                    <div class="mp-results-summary">
                                        ${question.explanation ? `
                                            <div class="explanation-box" style="margin-bottom:1.5rem">
                                                <p class="font-semibold" style="margin-bottom:0.25rem">💡 Explanation</p>
                                                <p>${escapeHtml(question.explanation)}</p>
                                            </div>
                                        ` : ''}
                                        
                                        <div class="mp-answer-results">
                                            ${players.map((p, i) => {
                                                const pAnswer = mp.currentAnswers[p.id];
                                                const isCorrect = pAnswer !== undefined && question.correct.includes(pAnswer);
                                                const noAnswer = pAnswer === undefined || pAnswer === null;
                                                
                                                return `
                                                    <div class="mp-player-result ${isCorrect ? 'correct' : noAnswer ? 'timeout' : 'incorrect'}">
                                                        <div class="mp-player-avatar" style="background:${getPlayerColor(i)}">${p.name.charAt(0).toUpperCase()}</div>
                                                        <span class="mp-player-name">${escapeHtml(p.name)}</span>
                                                        <span class="mp-player-answer">
                                                            ${noAnswer ? '⏰ Timeout' : String.fromCharCode(65 + pAnswer)}
                                                        </span>
                                                        <span class="mp-score-change ${isCorrect ? 'positive' : 'negative'}">
                                                            ${isCorrect ? '+1' : '-1'}
                                                        </span>
                                                    </div>
                                                `;
                                            }).join('')}
                                        </div>
                                        
                                        <button onclick="Multiplayer.readyForNext()" class="btn btn-accent btn-lg" style="width:100%;margin-top:1.5rem">
                                            ${state.currentQuestionIndex < mp.quiz.questions.length - 1 ? '➡️ Next Question' : '🏆 See Results'}
                                        </button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div class="mp-leaderboard">
                            <h3 style="margin-bottom:1rem">🏆 Leaderboard</h3>
                            <div class="mp-leaderboard-list">
                                ${players.map((p, i) => `
                                    <div class="mp-leaderboard-item ${p.id === mp.playerId ? 'is-you' : ''}">
                                        <span class="mp-rank">${i + 1}</span>
                                        <div class="mp-player-avatar" style="background:${getPlayerColor(i)}">${p.name.charAt(0).toUpperCase()}</div>
                                        <span class="mp-player-name">${escapeHtml(p.name)}</span>
                                        <span class="mp-player-score">${p.score || 0}</span>
                                        ${!mp.revealed && p.answeredCurrent ? '<span class="mp-answered-badge">✓</span>' : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    `;
}

function renderMultiplayerResults() {
    const mp = state.multiplayer;
    const players = Object.values(mp.players).sort((a, b) => (b.score || 0) - (a.score || 0));
    const winner = players[0];
    const myRank = players.findIndex(p => p.id === mp.playerId) + 1;
    const myScore = players.find(p => p.id === mp.playerId)?.score || 0;
    
    return `
        <div class="mp-container mp-results">
            <div class="mp-results-hero">
                <div class="mp-confetti"></div>
                <h1 class="mp-results-title">🎉 Game Over!</h1>
                <p class="text-muted" style="margin-bottom:2rem">${escapeHtml(mp.quiz?.title || 'Quiz')}</p>
            </div>
            
            <div class="container-narrow">
                <div class="mp-podium">
                    ${players.length >= 2 ? `
                        <div class="mp-podium-place second">
                            <div class="mp-player-avatar large" style="background:${getPlayerColor(1)}">${players[1].name.charAt(0).toUpperCase()}</div>
                            <p class="mp-podium-name">${escapeHtml(players[1].name)}</p>
                            <p class="mp-podium-score">${players[1].score || 0} pts</p>
                            <div class="mp-podium-stand">🥈</div>
                        </div>
                    ` : ''}
                    
                    <div class="mp-podium-place first">
                        <div class="mp-winner-crown">👑</div>
                        <div class="mp-player-avatar large" style="background:${getPlayerColor(0)}">${winner.name.charAt(0).toUpperCase()}</div>
                        <p class="mp-podium-name">${escapeHtml(winner.name)}</p>
                        <p class="mp-podium-score">${winner.score || 0} pts</p>
                        <div class="mp-podium-stand">🥇</div>
                    </div>
                    
                    ${players.length >= 3 ? `
                        <div class="mp-podium-place third">
                            <div class="mp-player-avatar large" style="background:${getPlayerColor(2)}">${players[2].name.charAt(0).toUpperCase()}</div>
                            <p class="mp-podium-name">${escapeHtml(players[2].name)}</p>
                            <p class="mp-podium-score">${players[2].score || 0} pts</p>
                            <div class="mp-podium-stand">🥉</div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="mp-your-result card" style="padding:1.5rem;margin:2rem 0;text-align:center">
                    <p class="text-muted">Your Result</p>
                    <h2 style="font-size:2rem;margin:0.5rem 0">#${myRank} with ${myScore} points</h2>
                </div>
                
                <div class="mp-full-results card" style="padding:1.5rem;margin-bottom:2rem">
                    <h3 style="margin-bottom:1rem">Final Standings</h3>
                    ${players.map((p, i) => `
                        <div class="mp-final-rank ${p.id === mp.playerId ? 'is-you' : ''}">
                            <span class="mp-rank">${i + 1}</span>
                            <div class="mp-player-avatar" style="background:${getPlayerColor(i)}">${p.name.charAt(0).toUpperCase()}</div>
                            <span class="mp-player-name">${escapeHtml(p.name)}</span>
                            <span class="mp-player-score">${p.score || 0} pts</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="flex gap-md">
                    ${mp.isHost ? `
                        <button onclick="Multiplayer.leaveSession();setTimeout(()=>showMultiplayerQuizSelect(),100)" class="btn btn-accent flex-1">
                            🔄 Play Again
                        </button>
                    ` : ''}
                    <button onclick="Multiplayer.leaveSession()" class="btn btn-ghost flex-1">
                        ← Back to Library
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Helper function for player colors
function getPlayerColor(index) {
    const colors = ['#FF6B35', '#10B981', '#3B82F6', '#A855F7', '#EC4899', '#EF4444', '#06B6D4', '#6366F1'];
    return colors[index % colors.length];
}

// Show modal to create/join multiplayer
function showMultiplayerModal() {
    const m = document.createElement('div');
    m.innerHTML = `
        <div class="modal-overlay" onclick="if(event.target===this)this.remove()">
            <div class="modal">
                <div class="modal-header">
                    <h2>🎮 Multiplayer</h2>
                    <button class="btn btn-icon btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="mp-modal-options">
                        <button onclick="this.closest('.modal-overlay').remove();showMultiplayerQuizSelect()" class="mp-modal-option">
                            <span class="mp-modal-icon">🎯</span>
                            <span class="mp-modal-title">Host a Game</span>
                            <span class="mp-modal-desc">Create a session and invite friends</span>
                        </button>
                        
                        <button onclick="this.closest('.modal-overlay').querySelector('.mp-join-section').style.display='block';this.style.display='none'" class="mp-modal-option">
                            <span class="mp-modal-icon">🔗</span>
                            <span class="mp-modal-title">Join a Game</span>
                            <span class="mp-modal-desc">Enter a session code</span>
                        </button>
                    </div>
                    
                    <div class="mp-join-section" style="display:none;margin-top:1.5rem">
                        <label class="input-label">Enter Session Code</label>
                        <input type="text" id="mp-join-code" class="input" placeholder="ABC123" maxlength="6" style="text-transform:uppercase;text-align:center;font-size:1.5rem;letter-spacing:0.25rem">
                        <button onclick="joinMultiplayerGame()" class="btn btn-accent" style="width:100%;margin-top:1rem">
                            Join Game
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(m.firstElementChild);
}

// Show quiz selection for hosting
function showMultiplayerQuizSelect() {
    const m = document.createElement('div');
    m.innerHTML = `
        <div class="modal-overlay" onclick="if(event.target===this)this.remove()">
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h2>🎯 Select a Quiz to Host</h2>
                    <button class="btn btn-icon btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button>
                </div>
                <div class="modal-body" style="max-height:60vh;overflow-y:auto">
                    <div class="mp-quiz-grid">
                        ${state.quizzes.map(q => `
                            <div class="mp-quiz-option card" onclick="hostMultiplayerGame(${q.id})">
                                <h3 style="margin-bottom:0.25rem">${escapeHtml(q.title)}</h3>
                                <p class="text-sm text-muted">${q.questions?.length || 0} questions • ${q.description || 'No category'}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(m.firstElementChild);
}

async function hostMultiplayerGame(quizId) {
    document.querySelector('.modal-overlay')?.remove();
    showLoading();
    await Multiplayer.createSession(quizId);
    hideLoading();
}

async function joinMultiplayerGame() {
    const code = document.getElementById('mp-join-code')?.value;
    if (!code || code.length < 4) {
        showToast('Enter a valid code', 'warning');
        return;
    }
    
    document.querySelector('.modal-overlay')?.remove();
    showLoading();
    await Multiplayer.joinSession(code);
    hideLoading();
}

console.log('🚀 Phase 5: Multiplayer Mode loaded!');
console.log('   ✓ Firebase real-time sync');
console.log('   ✓ Session management');
console.log('   ✓ Live scoring');
console.log('   ✓ 60-second timer');

        /* ============================================
   QUICK WIN FEATURES - ADD TO BEGINNING OF app.js
   (After the API_URL and state declarations)
   ============================================ */

// ========== 1. LOADING SPINNER ==========
let loadingCount = 0;

function showLoading() {
    loadingCount++;
    if (loadingCount === 1) {
        const spinner = document.createElement('div');
        spinner.id = 'loading-spinner';
        spinner.className = 'spinner-overlay';
        spinner.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(spinner);
    }
}

function hideLoading() {
    loadingCount = Math.max(0, loadingCount - 1);
    if (loadingCount === 0) {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) spinner.remove();
    }
}

// ========== 2. AUTO-SAVE INDICATOR ==========
let saveIndicatorTimeout;

function showSaveIndicator(status = 'saving') {
    clearTimeout(saveIndicatorTimeout);
    
    let indicator = document.getElementById('save-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'save-indicator';
        indicator.className = 'save-indicator';
        document.body.appendChild(indicator);
    }
    
    indicator.className = `save-indicator ${status}`;
    indicator.innerHTML = status === 'saving' 
        ? '<span class="spinner-small"></span><span>Saving...</span>'
        : '<span>✓</span><span>Saved</span>';
    
    if (status === 'saved') {
        saveIndicatorTimeout = setTimeout(() => {
            indicator.classList.add('fade-out');
            setTimeout(() => indicator.remove(), 300);
        }, 2000);
    }
}

// ========== 3. IMPROVED TOAST (Dismissible) ==========
// showToast is already defined at line 34, using dismissToast for enhanced functionality

function dismissToast(id) {
    const toast = document.getElementById(id);
    if (toast) {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }
}

// ========== 4. CONFIRMATION DIALOGS ==========
function showConfirmDialog(options) {
    return new Promise((resolve) => {
        const {
            title = 'Confirm Action',
            message = 'Are you sure?',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            type = 'warning' // 'warning' or 'danger'
        } = options;
        
        const icons = {
            warning: '⚠️',
            danger: '🗑️'
        };
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay confirm-modal';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-body" style="text-align: center; padding: 2rem">
                    <div class="confirm-icon ${type}">
                        ${icons[type] || icons.warning}
                    </div>
                    <h2 style="margin-bottom: 0.5rem">${title}</h2>
                    <p class="text-muted">${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost flex-1" onclick="this.closest('.modal-overlay').remove()">
                        ${cancelText}
                    </button>
                    <button class="btn ${type === 'danger' ? 'btn-accent' : 'btn-primary'} flex-1" id="confirm-btn">
                        ${confirmText}
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('confirm-btn').onclick = () => {
            modal.remove();
            resolve(true);
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(false);
            }
        };
    });
}

// ========== 5. SEARCH HIGHLIGHTING ==========
function highlightText(text, query) {
    if (!query) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const regex = new RegExp(`(${escapeHtml(query)})`, 'gi');
    return escaped.replace(regex, '<span class="search-highlight">$1</span>');
}

// ========== 6. KEYBOARD SHORTCUTS ==========
const shortcuts = {
    'n': { action: () => nextQuestion(), context: 'quiz', description: 'Next question' },
    'p': { action: () => prevQuestion(), context: 'quiz', description: 'Previous question' },
    ' ': { action: (e) => { e.preventDefault(); if (state.view === 'quiz') document.querySelector('.option-btn')?.click(); }, context: 'quiz', description: 'Select option' },
    'Enter': { action: (e) => { e.preventDefault(); if (state.view === 'quiz') nextQuestion(); }, context: 'quiz', description: 'Next/Submit' },
    'f': { action: () => toggleFlag(), context: 'quiz', description: 'Flag question' },
    '?': { action: () => showKeyboardShortcuts(), context: 'all', description: 'Show shortcuts' },
    'Escape': { action: () => document.querySelector('.modal-overlay')?.remove(), context: 'all', description: 'Close modal' }
};

document.addEventListener('keydown', (e) => {
    // Don't trigger if typing in input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    const shortcut = shortcuts[e.key];
    if (shortcut && (shortcut.context === 'all' || shortcut.context === state.view)) {
        shortcut.action(e);
    }
});

function showKeyboardShortcuts() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal keyboard-shortcuts-modal">
            <div class="modal-header">
                <h2>⌨️ Keyboard Shortcuts</h2>
                <button class="btn btn-icon btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <div class="modal-body">
                <div class="shortcut-list">
                    <div class="shortcut-item">
                        <span>Next question</span>
                        <div class="shortcut-keys">
                            <kbd class="keyboard-hint">N</kbd>
                            <span class="text-muted">or</span>
                            <kbd class="keyboard-hint">Enter</kbd>
                        </div>
                    </div>
                    <div class="shortcut-item">
                        <span>Previous question</span>
                        <kbd class="keyboard-hint">P</kbd>
                    </div>
                    <div class="shortcut-item">
                        <span>Select option</span>
                        <kbd class="keyboard-hint">Space</kbd>
                    </div>
                    <div class="shortcut-item">
                        <span>Flag question</span>
                        <kbd class="keyboard-hint">F</kbd>
                    </div>
                    <div class="shortcut-item">
                        <span>Close modal</span>
                        <kbd class="keyboard-hint">Esc</kbd>
                    </div>
                    <div class="shortcut-item">
                        <span>Show this help</span>
                        <kbd class="keyboard-hint">?</kbd>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// ========== 7. QUIZ PREVIEW ==========
function showQuizPreview(quizId) {
    showLoading();
    apiCall(`/quizzes/${quizId}`).then(d => {
        hideLoading();
        const quiz = d.quiz || d;
        const preview = quiz.questions.slice(0, 3);
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal modal-lg">
                <div class="modal-header">
                    <h2>📝 ${escapeHtml(quiz.title)}</h2>
                    <button class="btn btn-icon btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <p class="text-muted" style="margin-bottom: 1.5rem">
                        ${quiz.questions.length} questions • ${quiz.description || 'No category'}
                    </p>
                    <h3 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 1rem">
                        Preview (first 3 questions)
                    </h3>
                    ${preview.map((q, i) => `
                        <div class="preview-question">
                            <div style="display: flex; align-items: start">
                                <span class="preview-question-number">${i + 1}</span>
                                <span style="flex: 1">${escapeHtml(q.question)}</span>
                            </div>
                            ${q.options ? `
                                <div class="preview-options">
                                    ${q.options.map((opt, j) => `${String.fromCharCode(65 + j)}. ${escapeHtml(opt)}`).join('<br>')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                    ${quiz.questions.length > 3 ? `<p class="text-sm text-muted" style="text-align: center">... and ${quiz.questions.length - 3} more questions</p>` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost flex-1" onclick="this.closest('.modal-overlay').remove()">Close</button>
                    <button class="btn btn-accent flex-1" onclick="this.closest('.modal-overlay').remove(); showQuizOptions(${quizId})">Start Quiz</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }).catch(e => {
        hideLoading();
        showToast('Failed to load preview', 'error');
    });
}

// ========== 8. SUCCESS CONFETTI ==========
// ========== 8. SUCCESS CONFETTI ==========
function showConfetti() {
    const colors = ['#FF6B35', '#10B981', '#3B82F6', '#A855F7', '#EC4899', '#EF4444', '#FBBF24', '#22C55E'];
    const confettiCount = 80; // Increased from 50
    
    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.top = '-10px'; // Start from top
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = (Math.random() * 10 + 5) + 'px'; // Random sizes 5-15px
            confetti.style.height = (Math.random() * 10 + 5) + 'px';
            confetti.style.animationDelay = Math.random() * 0.3 + 's';
            confetti.style.animationDuration = (Math.random() * 1 + 2) + 's'; // 2-3 seconds
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px'; // Mix of circles and squares
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 4000);
        }, i * 20); // Stagger the confetti
    }
    
    // Add some celebration text
    const celebration = document.createElement('div');
    celebration.style.cssText = `
        position: fixed;
        top: 20%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        font-size: 4rem;
        z-index: 10000;
        animation: celebrationPop 0.6s ease forwards;
        pointer-events: none;
    `;
    celebration.textContent = '🎉';
    document.body.appendChild(celebration);
    setTimeout(() => celebration.remove(), 1000);
}

// ========== 9. TIMER PULSE WARNING ==========
// Add to updateTimerDisplay function
function updateTimerDisplay() {
    const el = document.getElementById('timer');
    if (el) {
        const minutes = Math.floor(state.timeRemaining / 60);
        const seconds = state.timeRemaining % 60;
        el.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Add pulse animation when under 60 seconds
        if (state.timeRemaining <= 60) {
            el.classList.add('timer-urgent', 'timer-pulse');
        } else {
            el.classList.remove('timer-urgent', 'timer-pulse');
        }
    }
}

// ========== UPDATE EXISTING FUNCTIONS ==========

// Update deleteQuiz to use confirmation dialog
async function deleteQuiz(id) {
    const confirmed = await showConfirmDialog({
        title: 'Delete Quiz?',
        message: 'This action cannot be undone. All quiz data and attempts will be permanently deleted.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
    });
    
    if (!confirmed) return;
    
    try {
        await apiCall(`/quizzes/${id}`, { method: 'DELETE' });
        
        state.folders.forEach(f => {
            const idx = f.quizIds.indexOf(id);
            if (idx > -1) f.quizIds.splice(idx, 1);
        });
        saveFolders();
        
        const idx = state.customOrder.indexOf(id);
        if (idx > -1) state.customOrder.splice(idx, 1);
        saveCustomOrder();
        
        clearQuizProgress(id);
        
        await loadQuizzes();
        showToast('Quiz deleted successfully', 'success');
        render();
    } catch (e) {
        showToast('Failed to delete quiz', 'error');
    }
}

// Update deleteFolder to use confirmation dialog
async function deleteFolder(id) {
    const folder = state.folders.find(f => f.id === id);
    const confirmed = await showConfirmDialog({
        title: 'Delete Folder?',
        message: `Delete "${folder?.name}"? Quizzes inside will not be deleted.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'warning'
    });
    
    if (!confirmed) return;
    
    state.folders = state.folders.filter(f => f.id !== id);
    if (state.selectedFolder == id) state.selectedFolder = 'all';
    saveFolders();
    showToast('Folder deleted', 'success');
    render();
}

// Update submitQuiz to show confetti on perfect score
async function submitQuiz() {
    stopTimer(); 
    const score = calculateScore();
    const total = state.currentQuiz.questions.length;
    const pct = Math.round((score / total) * 100);
    
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
    
    // Show confetti AFTER render for perfect score!
    if (pct === 100) {
        setTimeout(() => showConfetti(), 100);
    }
}

// Update renderLibrary to include search highlighting and preview button
// Find the quiz card rendering section and update the title line to:
// <h3 class="quiz-card-title">${state.searchQuery ? highlightText(q.title, state.searchQuery) : escapeHtml(q.title)}</h3>

// Add preview button to quiz card dropdown menu (in renderLibrary):
// <button class="dropdown-item" onclick="event.stopPropagation(); showQuizPreview(${q.id})">👁️ Preview</button>

console.log('✨ Quick Win features loaded!');
        async function apiCall(endpoint, options = {}) {
            const headers = { 'Content-Type': 'application/json', ...options.headers };
            if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
            try {
                const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Request failed');
                return data;
            } catch (e) { console.error('API Error:', e); throw e; }
        }
        
        async function login(u, p) { try { const d = await apiCall('/auth/login', { method: 'POST', body: JSON.stringify({ username: u, password: p }) }); state.token = d.token; state.user = d.user; state.isAuthenticated = true; saveAuth(); state.view = 'library'; await loadQuizzes(); showToast(`Welcome back, ${d.user.username}!`, 'success'); render(); } catch (e) { showToast(e.message || 'Login failed', 'error'); } }
        async function register(u, p) { try { const d = await apiCall('/auth/register', { method: 'POST', body: JSON.stringify({ username: u, password: p, email: `${u}@quiz.local` }) }); state.token = d.token; state.user = d.user; state.isAuthenticated = true; saveAuth(); state.view = 'library'; await loadQuizzes(); showToast('Account created!', 'success'); render(); } catch (e) { showToast(e.message || 'Registration failed', 'error'); } }
        function logout() { 
    state.token = null; 
    state.user = null; 
    state.isAuthenticated = false; 
    state.view = 'login'; 
    state.quizzes = []; 
    clearQuizProgress(); // Clear quiz progress on logout
    localStorage.removeItem('authToken'); 
    localStorage.removeItem('authUser'); 
    showToast('Logged out', 'info'); 
    render(); 
}
        function saveAuth() { if (state.token && state.user) { localStorage.setItem('authToken', state.token); localStorage.setItem('authUser', JSON.stringify(state.user)); } }
        function loadAuth() { const t = localStorage.getItem('authToken'), u = localStorage.getItem('authUser'); if (t && u) { state.token = t; state.user = JSON.parse(u); state.isAuthenticated = true; return true; } return false; }
        // Add these new functions after the loadAuth/saveAuth functions

function saveCreationState() {
    if (state.view === 'create') {
        const creationState = {
            quizTitle: state.quizTitle,
            quizData: state.quizData,
            quizCategory: state.quizCategory,
            editingQuizId: state.editingQuizId,
            visualEditorMode: state.visualEditorMode,
            parsedQuestions: state.parsedQuestions,
            currentEditQuestion: state.currentEditQuestion,
            timestamp: Date.now()
        };
        localStorage.setItem('quiz-creation-state', JSON.stringify(creationState));
    }
}

function loadCreationState() {
    try {
        const stored = localStorage.getItem('quiz-creation-state');
        if (!stored) return false;
        
        const creationState = JSON.parse(stored);
        
        // Check if it's less than 24 hours old
        const hoursSince = (Date.now() - creationState.timestamp) / (1000 * 60 * 60);
        if (hoursSince > 24) {
            localStorage.removeItem('quiz-creation-state');
            return false;
        }
        
        // Restore state
        state.quizTitle = creationState.quizTitle || '';
        state.quizData = creationState.quizData || '';
        state.quizCategory = creationState.quizCategory || '';
        state.editingQuizId = creationState.editingQuizId;
        state.visualEditorMode = creationState.visualEditorMode || false;
        state.parsedQuestions = creationState.parsedQuestions || null;
        state.currentEditQuestion = creationState.currentEditQuestion || 0;
        
        return true;
    } catch (e) {
        console.error('Failed to load creation state:', e);
        return false;
    }
}

function clearCreationState() {
    localStorage.removeItem('quiz-creation-state');
}
        async function loadQuizzes() { 
    try { 
        const d = await apiCall('/quizzes'); 
        state.quizzes = (d.quizzes || d).map(q => {
            // Backend returns attempt_count, best_score, avg_score
            // Convert to frontend format with attempts array
            if (q.attempt_count > 0) {
                q.attempts = [{
                    percentage: q.best_score || 0,
                    score: 0,
                    total: q.questions?.length || 0,
                    created_at: q.last_modified
                }];
            } else {
                q.attempts = [];
            }
            return q;
        });
        
        loadFolders(); 
        loadCustomOrder(); 
        validateAndCleanData(); 
    } catch (e) { 
        console.error('Failed to load quizzes:', e); 
    } 
}
        function loadFolders() { try { const f = localStorage.getItem('quiz-folders'); state.folders = f ? JSON.parse(f) : []; } catch (e) { state.folders = []; } }
        function saveFolders() { localStorage.setItem('quiz-folders', JSON.stringify(state.folders)); }
        function loadCustomOrder() { 
            try { 
                const o = localStorage.getItem('quiz-custom-order'); 
                state.customOrder = o ? JSON.parse(o) : []; 
                // Add any new quizzes not in the order
                state.quizzes.forEach(q => {
                    if (!state.customOrder.includes(q.id)) state.customOrder.push(q.id);
                });
                // Remove deleted quizzes from order
                state.customOrder = state.customOrder.filter(id => state.quizzes.some(q => q.id === id));
            } catch (e) { state.customOrder = state.quizzes.map(q => q.id); } 
        }
        function saveCustomOrder() { localStorage.setItem('quiz-custom-order', JSON.stringify(state.customOrder)); }
				function validateAndCleanData() {
    const quizIds = new Set(state.quizzes.map(q => q.id));
    
    // Clean folder quiz IDs
    state.folders.forEach(f => {
        const before = f.quizIds.length;
        f.quizIds = f.quizIds.filter(id => quizIds.has(id));
        if (before !== f.quizIds.length) saveFolders();
    });
    
    // Clean custom order
    const before = state.customOrder.length;
    state.customOrder = state.customOrder.filter(id => quizIds.has(id));
    if (before !== state.customOrder.length) saveCustomOrder();
    
    // Clean quiz progress for deleted quizzes
    const allProgress = loadQuizProgress();
    Object.keys(allProgress).forEach(qid => {
        if (!quizIds.has(parseInt(qid))) {
            clearQuizProgress(parseInt(qid));
        }
    });
}
        function getUserStats() { 
    const tq = state.quizzes.length;
    const tqs = state.quizzes.reduce((s, q) => s + (q.questions?.length || 0), 0); 
    
    let ta = 0, ts = 0, ac = 0; 
    
    // Count all attempts across all quizzes using backend data
    state.quizzes.forEach(q => { 
        // Backend provides attempt_count and avg_score directly
        if (q.attempt_count && q.attempt_count > 0) { 
            ta += q.attempt_count;
            if (q.avg_score != null) {
                ts += q.avg_score * q.attempt_count; // Weight by attempt count
                ac += q.attempt_count;
            }
        }
    }); 
    
    return { 
        totalQuizzes: tq, 
        totalQuestions: tqs, 
        totalAttempts: ta, 
        avgScore: ac > 0 ? Math.round(ts / ac) : 0 
    }; 
}

       function getQuizStats(q) { 
    if (!q.attempt_count || q.attempt_count === 0) return null; 
    return { 
        attemptCount: q.attempt_count, 
        best: Math.round(q.best_score || 0), 
        latest: Math.round(q.avg_score || 0)
    }; 
}
        function getCategories() { const c = new Set(); state.quizzes.forEach(q => { if (q.description) c.add(q.description); }); return Array.from(c).sort(); }
        function getFilteredQuizzes() {
            let f = [...state.quizzes];
            if (state.selectedFolder !== 'all') { const folder = state.folders.find(fo => fo.id == state.selectedFolder); if (folder) f = f.filter(q => folder.quizIds.includes(q.id)); }
            if (state.searchQuery) { const query = state.searchQuery.toLowerCase(); f = f.filter(q => q.title.toLowerCase().includes(query) || (q.description && q.description.toLowerCase().includes(query))); }
            if (state.categoryFilter !== 'all') f = f.filter(q => q.description === state.categoryFilter);
            if (state.sortBy === 'recent') f.sort((a, b) => new Date(b.last_modified || b.created_at) - new Date(a.last_modified || a.created_at));
            else if (state.sortBy === 'alpha') f.sort((a, b) => a.title.localeCompare(b.title));
            else if (state.sortBy === 'custom') f.sort((a, b) => state.customOrder.indexOf(a.id) - state.customOrder.indexOf(b.id));
            return f;
        }
        
        // Quiz card drag and drop
        function handleQuizDragStart(e, quizId) {
            state.draggedQuizId = quizId;
            e.target.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        }
        function handleQuizDragOver(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const card = e.target.closest('.quiz-card');
            if (card && !card.classList.contains('dragging')) {
                card.classList.add('drag-over');
            }
        }
        function handleQuizDragLeave(e) {
            const card = e.target.closest('.quiz-card');
            if (card) card.classList.remove('drag-over');
        }
        function handleQuizDrop(e, targetQuizId) {
            e.preventDefault();
            const card = e.target.closest('.quiz-card');
            if (card) card.classList.remove('drag-over');
            
            if (state.draggedQuizId !== null && state.draggedQuizId !== targetQuizId) {
                const fromIndex = state.customOrder.indexOf(state.draggedQuizId);
                const toIndex = state.customOrder.indexOf(targetQuizId);
                if (fromIndex !== -1 && toIndex !== -1) {
                    state.customOrder.splice(fromIndex, 1);
                    state.customOrder.splice(toIndex, 0, state.draggedQuizId);
                    saveCustomOrder();
                    state.sortBy = 'custom'; // Switch to custom sort when reordering
                    render();
                }
            }
        }
        function handleQuizDragEnd(e) {
            e.target.classList.remove('dragging');
            document.querySelectorAll('.quiz-card.drag-over').forEach(el => el.classList.remove('drag-over'));
            state.draggedQuizId = null;
        }
        
  async function startQuiz(id, opts = {}) {
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
    // Don't allow changes if answer already revealed in study mode
    if (state.studyMode && state.showAnswer) return;
    
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    if (q.type === 'choice') {
        if (q.correct.length > 1) { 
            const c = state.answers[state.currentQuestionIndex] || []; 
            state.answers[state.currentQuestionIndex] = c.includes(idx) ? c.filter(i => i !== idx) : [...c, idx]; 
        }
        else state.answers[state.currentQuestionIndex] = [idx];
    }
    saveQuizProgress(); // Auto-save
    
    // Study mode: auto-check for single-select questions
    if (state.studyMode && q.correct.length === 1) {
        checkStudyAnswer();
        return; // checkStudyAnswer already calls render()
    }
    render();
}
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
                                        ${!showResults ? `<button class="clear-match-btn" onclick="event.stopPropagation();handleMatchPairClick('${pair.id}',${questionIndex})">✕</button>` : ''}
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
        correct = as.size === cs.size && [...as].every(a => cs.has(a)); 
    } else if (q.type === 'ordering') {
        correct = JSON.stringify(ua) === JSON.stringify(q.correct);
    } else if (q.type === 'matching') {
        // Check if all pairs are correctly matched
        correct = true;
        const answers = state.answers[state.currentQuestionIndex] || {};
        
        // Must have all pairs matched
        if (Object.keys(answers).length !== q.matchPairs.length) {
            correct = false;
        } else {
            // Check each match
            for (const pair of q.matchPairs) {
                if (answers[pair.id] !== pair.correctMatch) {
                    correct = false;
                    break;
                }
            }
        }
    }
    
    if (correct) { 
        state.streak++; 
        state.maxStreak = Math.max(state.maxStreak, state.streak); 
    } else {
        state.streak = 0;
    }
    
    state.showAnswer = true;
    saveQuizProgress();
    render();
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
        function calculateScore() { 
    let s = 0; 
    state.currentQuiz.questions.forEach((q, i) => { 
        const ua = state.answers[i]; 
        if (!ua) return; 
        
        if (q.type === 'choice') { 
            const as = new Set(ua), cs = new Set(q.correct); 
            if (as.size === cs.size && [...as].every(a => cs.has(a))) s++; 
        } else if (q.type === 'ordering' && JSON.stringify(ua) === JSON.stringify(q.correct)) {
            s++;
        } else if (q.type === 'matching') {
            // Check all matches
            let allCorrect = true;
            
            // Must have all pairs matched
            if (Object.keys(ua).length !== q.matchPairs.length) {
                allCorrect = false;
            } else {
                for (const pair of q.matchPairs) {
                    if (ua[pair.id] !== pair.correctMatch) {
                        allCorrect = false;
                        break;
                    }
                }
            }
            
            if (allCorrect) s++;
        }
    }); 
    return s; 
}
        
        let draggedIndex = null;
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
        // REMOVED: if (state.studyMode) checkStudyAnswer();
        render(); 
    } 
}
        function handleDragEnd(e) { e.target.classList.remove('dragging'); draggedIndex = null; }
       
        function fixEscapedContent(questions) {
    return questions.map(q => {
        if (q.code && typeof q.code === 'string') {
            q.code = q.code.replace(/\\\\n/g, '\n');
        }
        if (q.explanation && typeof q.explanation === 'string') {
            q.explanation = q.explanation.replace(/\\\\n/g, '\n');
        }
        return q;
    });
}

        // FIX 3: Add debugging to your saveQuiz function
// Temporarily add this to see if code blocks are being saved correctly:
async function saveQuiz() {
    if (!state.quizTitle.trim()) {
        showToast('Enter a title', 'warning');
        return;
    }
    
    if (!state.quizData.trim()) {
        showToast('Enter at least one question', 'warning');
        return;
    }
    
    try {
        showLoading();
        const qs = parseQuizData(state.quizData);
        
        if (qs.length === 0) {
            hideLoading();
            showToast('No valid questions found', 'warning');
            return;
        }
        
        // Validate that all questions have correct answers (skip IOS type)
        const invalidQuestions = qs.filter(q => 
            q.type !== 'ios' && (
                (q.type === 'choice' && q.correct.length === 0) ||
                (q.type === 'ordering' && q.correct.length === 0) ||
                !q.options || q.options.length < 2
            )
        );
        
        if (invalidQuestions.length > 0) {
            hideLoading();
            showToast('Some questions are missing correct answers or options', 'error');
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
            // Update existing quiz
            await apiCall(`/quizzes/${state.editingQuizId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            showToast('Quiz updated!', 'success');
        } else {
            // Create new quiz
            await apiCall('/quizzes', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            showToast('Quiz created!', 'success');
        }
        
        await loadQuizzes();
        state.view = 'library';
        state.editingQuizId = null;
        state.quizTitle = '';
        state.quizData = '';
        state.quizCategory = '';
        hideLoading();
        render();
    } catch (e) {
        hideLoading();
        console.error('Save quiz error:', e);
        showToast(e.message || 'Failed to save quiz', 'error');
    }
}
  async function editQuiz(id) {
    try {
        const d = await apiCall(`/quizzes/${id}`); 
        const qd = d.quiz || d;
        
        console.log('Loading quiz for editing:', qd);
        
        const txt = qd.questions.map((q, i) => {
            let t = `${i + 1}. ${q.type === 'ordering' ? '[order] ' : ''}${q.question}\n`;
            
            if (q.code !== undefined && q.code !== null && q.code !== '') {
                const codeContent = String(q.code);
                t += `[code]\n${codeContent}\n[/code]\n`;
            }
            
            // IMPROVED: Show placeholder for base64 images
            if (q.image !== undefined && q.image !== null && q.image !== '') {
                if (q.image.startsWith('data:image/')) {
                    t += `[image: uploaded]\n`;
                } else {
                    t += `[image: ${q.image}]\n`;
                }
            }
            
            if (q.type === 'ordering') {
                q.options.forEach((o, j) => t += `${q.correct[j] + 1}) ${o}\n`);
            } else {
                q.options.forEach((o, j) => t += `${String.fromCharCode(65 + j)}. ${o}${q.correct.includes(j) ? ' *' : ''}\n`);
            }
            
            if (q.explanation !== undefined && q.explanation !== null && q.explanation !== '') {
                t += `[explanation: ${q.explanation}]\n`;
            }
            
            return t;
        }).join('\n\n');
        
        console.log('Generated edit text:', txt);
        
        state.quizTitle = qd.title; 
        state.quizData = txt; 
        state.quizCategory = qd.description || ''; 
        state.editingQuizId = id; 
        state.view = 'create'; 
        render();
    } catch (e) { 
        console.error('Edit quiz error:', e);
        showToast('Failed to load', 'error'); 
    }
}
        
        // FIX 2: Also check if your parseQuizData function properly handles code blocks
// Add this improved version if needed:
function parseQuizData(data) {
    const lines = data.split('\n'), questions = [];
    let i = 0;
    while (i < lines.length) {
        let line = lines[i].trim();
        if (line.match(/^\d+\./)) {
            const isOrder = line.includes('[order]');
            const isMatching = line.includes('[matching]');
            const qText = line.replace(/^\d+\./, '').replace('[order]', '').replace('[matching]', '').trim();
            let q = { 
                question: qText, 
                type: isOrder ? 'ordering' : isMatching ? 'matching' : 'choice', 
                options: [], 
                correct: [], 
                image: null, 
                explanation: null, 
                code: null,
                matchPairs: isMatching ? [] : null,
                matchTargets: isMatching ? [] : null
            };
            i++;
            
            // Code block parsing
            if (i < lines.length && lines[i].trim() === '[code]') { 
                i++; 
                let codeLines = []; 
                while (i < lines.length && lines[i].trim() !== '[/code]') { 
                    codeLines.push(lines[i]); 
                    i++; 
                } 
                if (codeLines.length > 0) { 
                    q.code = codeLines.join('\n'); 
                }
                if (i < lines.length && lines[i].trim() === '[/code]') {
                    i++;
                }
            }
            
            // Image parsing
            if (i < lines.length && lines[i].trim().match(/^\[image:\s*(.+?)\]/i)) { 
                q.image = lines[i].trim().match(/^\[image:\s*(.+?)\]/i)[1]; 
                i++; 
            }
            
            // ===== MATCHING QUESTION PARSING =====
            if (isMatching) {
                // Parse terms with their correct matches: A. Term = B *
                while (i < lines.length && lines[i].match(/^[A-Z]\./)) {
                    const matchLine = lines[i].trim();
                    const match = matchLine.match(/^([A-Z])\.\s*(.+?)\s*=\s*([A-Z])\s*\*/);
                    
                    if (match) {
                        const [_, termLetter, termText, correctAnswer] = match;
                        q.matchPairs.push({
                            id: termLetter,
                            text: termText.trim(),
                            correctMatch: correctAnswer
                        });
                    }
                    i++;
                }
                
                // Look for "Definitions:" header (optional but recommended)
                if (i < lines.length && lines[i].trim().match(/^definitions?:/i)) {
                    i++;
                }
                
                // Parse definitions: A) Definition text
                while (i < lines.length && lines[i].trim().match(/^[A-Z]\)/)) {
                    const defLine = lines[i].trim();
                    const match = defLine.match(/^([A-Z])\)\s*(.+)/);
                    
                    if (match) {
                        const [_, defLetter, defText] = match;
                        q.matchTargets.push({
                            id: defLetter,
                            text: defText.trim()
                        });
                    }
                    i++;
                }
                
                // Debug: Log what we parsed
                console.log('Parsed matching question:', {
                    question: q.question,
                    pairs: q.matchPairs,
                    targets: q.matchTargets
                });
                
                // Shuffle targets for display (but keep IDs)
                if (q.matchTargets.length > 0) {
                    q.matchTargets = shuffleArray(q.matchTargets);
                }
                
                // Parse explanation if present
                if (i < lines.length && lines[i].trim().match(/^\[explanation:\s*(.+?)\]/i)) { 
                    q.explanation = lines[i].trim().match(/^\[explanation:\s*(.+?)\]/i)[1]; 
                    i++; 
                }
                
                // Add question and skip to next
                questions.push(q);
                continue; // CRITICAL: Skip the else blocks below
            }
            // ===== END MATCHING PARSING =====
            else if (isOrder) { 
                while (i < lines.length && lines[i].match(/^\d+\)/)) { 
                    const n = parseInt(lines[i].match(/^(\d+)\)/)[1]); 
                    q.options.push(lines[i].replace(/^\d+\)/, '').trim()); 
                    q.correct.push(n - 1); 
                    i++; 
                } 
            } else { 
                while (i < lines.length && lines[i].match(/^[A-Z]\./)) { 
                    const ot = lines[i].substring(2).trim(), ha = ot.endsWith('*'); 
                    q.options.push(ha ? ot.slice(0, -1).trim() : ot); 
                    if (ha) q.correct.push(q.options.length - 1); 
                    i++; 
                } 
            }
            
            // Explanation parsing (for non-matching questions)
            if (i < lines.length && lines[i].trim().match(/^\[explanation:\s*(.+?)\]/i)) { 
                q.explanation = lines[i].trim().match(/^\[explanation:\s*(.+?)\]/i)[1]; 
                i++; 
            }
            
            questions.push(q);
        } else i++;
    }
    return questions;
}
function proceedToVisualEditor() {
    if (!state.quizTitle.trim()) {
        showToast('Enter a title first', 'warning');
        return;
    }
    
    try {
        let questions = [];
        
        // Only parse if there's actual data
        if (state.quizData.trim()) {
            questions = parseQuizData(state.quizData);
            
            // PRESERVE IMAGES: If editing existing quiz, restore base64 images
            if (state.editingQuizId) {
                const originalQuiz = state.quizzes.find(q => q.id === state.editingQuizId);
                if (originalQuiz) {
                    questions.forEach((q, i) => {
                        if (i < originalQuiz.questions.length) {
                            const origQuestion = originalQuiz.questions[i];
                            // If text says "uploaded" and original has base64, restore it
                            if (q.image === 'uploaded' && origQuestion.image && origQuestion.image.startsWith('data:image/')) {
                                q.image = origQuestion.image;
                            }
                        }
                    });
                }
            }
        }
        
        // If no questions parsed, start with one blank question
        if (questions.length === 0) {
            questions = [{
                question: '',
                type: 'choice',
                options: ['', ''],
                correct: [],
                image: null,
                explanation: null,
                code: null
            }];
        }
        
        state.parsedQuestions = questions;
        state.currentEditQuestion = 0;
        state.visualEditorMode = true;
        render();
    } catch (e) {
        console.error('Parse error:', e);
        showToast('Error parsing questions: ' + e.message, 'error');
    }
}

function saveFromVisualEditor() {
    // Validate all questions (skip IOS type)
    const invalid = state.parsedQuestions.filter(q => 
        q.type !== 'ios' && (
            (q.type === 'choice' && q.correct.length === 0) ||
            (q.type === 'ordering' && q.correct.length === 0) ||
            !q.options || q.options.length < 2
        )
    );
    
    if (invalid.length > 0) {
        showToast(`${invalid.length} question(s) missing correct answers or options`, 'error');
        return;
    }
    
    saveQuizFromParsed();
}

// Update saveQuizFromParsed to clear creation state on success
async function saveQuizFromParsed() {
    try {
        showLoading();
        
        const payload = {
            title: state.quizTitle,
            questions: state.parsedQuestions,
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
        
        await loadQuizzes();
        
        // Clear everything
        state.view = 'library';
        state.editingQuizId = null;
        state.quizTitle = '';
        state.quizData = '';
        state.quizCategory = '';
        state.visualEditorMode = false;
        state.parsedQuestions = null;
        clearCreationState(); // ADD THIS LINE
        
        hideLoading();
        render();
    } catch (e) {
        hideLoading();
        console.error('Save quiz error:', e);
        showToast(e.message || 'Failed to save quiz', 'error');
    }
}
function switchQuestion(index) {
    if (index === state.currentEditQuestion) return; // Already on this question
    
    state.currentEditQuestion = index;
    
    // Update sidebar active state without re-rendering
    const buttons = document.querySelectorAll('.editor-question-list-item');
    buttons.forEach((btn, i) => {
        if (i === index) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update the main editor content area
    updateEditorContent();
}

function updateEditorContent() {
    const q = state.parsedQuestions[state.currentEditQuestion];
    const editorMain = document.querySelector('.editor-main');
    if (!editorMain) return;
    
    const isValid = q.question.trim() && q.options.length >= 2 && q.correct.length > 0;
    
    editorMain.innerHTML = `
        <div class="editor-card">
            <div class="editor-card-header">
                <div>
                    <h2 class="editor-card-title">Question ${state.currentEditQuestion + 1}</h2>
                    <p class="text-sm text-muted">of ${state.parsedQuestions.length} total</p>
                </div>
                ${state.parsedQuestions.length > 1 ? `
                    <button onclick="deleteQuestion(${state.currentEditQuestion})" class="btn btn-ghost btn-sm" style="color:var(--error)">
                        <span style="font-size:1.125rem">🗑️</span> Delete
                    </button>
                ` : ''}
            </div>
            
            <!-- Question Text -->
            <div class="editor-section">
                <label class="editor-section-label">
                    <span>📝</span> Question Text
                </label>
                <textarea 
                    class="input" 
                    rows="3" 
                    placeholder="Enter your question here..."
                    oninput="updateQuestionField('question', this.value)"
                    style="font-size:1rem"
                >${escapeHtml(q.question)}</textarea>
            </div>
            
            <!-- Question Type -->
       <div class="tabs-container">
    <button 
        class="tab-button ${q.type === 'choice' ? 'active' : ''}" 
        onclick="updateQuestionType('choice')"
    >
        <span style="font-size:1rem">✓</span> Multiple Choice
    </button>
    <button 
        class="tab-button ${q.type === 'ordering' ? 'active' : ''}" 
        onclick="updateQuestionType('ordering')"
    >
        <span style="font-size:1rem">↕</span> Ordering
    </button>
    <button 
        class="tab-button ${q.type === 'matching' ? 'active' : ''}" 
        onclick="updateQuestionType('matching')"
    >
        <span style="font-size:1rem">🔗</span> Matching
    </button>
</div>
            
           <!-- Options -->
<div class="editor-section">
    <div class="flex justify-between items-center" style="margin-bottom:1rem">
        <label class="editor-section-label" style="margin-bottom:0">
            <span>📋</span> ${q.type === 'matching' ? 'Matching Pairs' : 'Answer Options'}
        </label>
        ${q.type !== 'matching' ? `
            <button onclick="addOption()" class="btn btn-ghost btn-sm">
                <span style="font-size:1rem">+</span> Add Option
            </button>
        ` : `
            <button onclick="addMatchPair()" class="btn btn-ghost btn-sm">
                <span style="font-size:1rem">+</span> Add Pair
            </button>
        `}
    </div>
    
    ${q.type === 'matching' ? `
    <div class="editor-section-hint">
        <span class="editor-section-hint-icon">💡</span>
        <span>Create terms (left) and their matching definitions (right)</span>
    </div>
    
    <!-- Terms (Left Column) -->
    <h4 style="font-size:0.875rem;font-weight:600;margin-bottom:0.75rem">Terms</h4>
    ${q.matchPairs.map((pair, i) => {
        // Find the target definition for this pair
        const targetDef = q.matchTargets.find(t => t.id === pair.correctMatch);
        
        return `
        <div class="option-editor" style="margin-bottom:1rem">
            <span class="option-label">${pair.id}</span>
            <input 
                type="text" 
                class="input" 
                value="${escapeHtml(pair.text)}"
                placeholder="Term ${i + 1}"
                oninput="updateMatchPair(${i}, 'text', this.value)"
            >
            <select 
                class="input" 
                style="width:200px"
                onchange="updateMatchPair(${i}, 'correctMatch', this.value)"
            >
                ${q.matchTargets.map(target => `
                    <option value="${target.id}" ${pair.correctMatch === target.id ? 'selected' : ''}>
                        → ${target.id}: ${escapeHtml(target.text.substring(0, 30))}${target.text.length > 30 ? '...' : ''}
                    </option>
                `).join('')}
            </select>
            ${q.matchPairs.length > 2 ? `
                <button onclick="removeMatchPair(${i})" class="option-remove-btn">
                    <span style="font-size:1.125rem">✕</span>
                </button>
            ` : ''}
        </div>
    `}).join('')}
    
   <!-- Definitions (Right Column) -->
<h4 style="font-size:0.875rem;font-weight:600;margin:1.5rem 0 0.75rem">Definitions</h4>
<div class="editor-section-hint" style="margin-bottom:1rem">
    <span class="editor-section-hint-icon">💡</span>
    <span>These are the actual definition texts that students will match to the terms above</span>
</div>
${q.matchTargets.map((target, i) => `
    <div class="option-editor">
        <span class="option-label">${target.id}</span>
        <input 
            type="text" 
            class="input" 
            value="${escapeHtml(target.text)}"
            placeholder="Enter the definition for ${target.id}"
            oninput="updateMatchTarget(${i}, this.value)"
        >
    </div>
`).join('')}
    
` : q.type === 'ordering' ? `
        <div class="editor-section-hint">
            <span class="editor-section-hint-icon">💡</span>
            <span>Drag options to set the correct order. The sequence shown here is the answer.</span>
        </div>
        ${q.options.map((opt, i) => `
            <div 
                class="option-editor" 
                draggable="true"
                ondragstart="handleEditorDragStart(event, ${i})"
                ondragover="handleEditorDragOver(event)"
                ondragleave="handleEditorDragLeave(event)"
                ondrop="handleEditorDrop(event, ${i})"
                ondragend="handleEditorDragEnd(event)"
                style="cursor:move"
            >
                <span class="drag-handle">⋮⋮</span>
                <span class="option-label">${i + 1}</span>
                <input 
                    type="text" 
                    class="input" 
                    value="${escapeHtml(opt)}"
                    placeholder="Option ${i + 1}"
                    oninput="updateOption(${i}, this.value)"
                >
                ${q.options.length > 2 ? `
                    <button onclick="event.stopPropagation(); removeOption(${i})" class="option-remove-btn">
                        <span style="font-size:1.125rem">✕</span>
                    </button>
                ` : ''}
            </div>
        `).join('')}
    ` : `
        <div class="editor-section-hint">
            <span class="editor-section-hint-icon">💡</span>
            <span>Check one or more boxes to mark correct answers. Multiple selections create "select all that apply" questions.</span>
        </div>
        ${q.options.map((opt, i) => `
            <div class="option-editor">
                <input 
                    type="checkbox" 
                    class="option-checkbox"
                    ${q.correct.includes(i) ? 'checked' : ''}
                    onchange="toggleCorrectOption(${i})"
                >
                <span class="option-label">${String.fromCharCode(65 + i)}</span>
                <input 
                    type="text" 
                    class="input" 
                    value="${escapeHtml(opt)}"
                    placeholder="Option ${String.fromCharCode(65 + i)}"
                    oninput="updateOption(${i}, this.value)"
                >
                ${q.options.length > 2 ? `
                    <button onclick="removeOption(${i})" class="option-remove-btn">
                        <span style="font-size:1.125rem">✕</span>
                    </button>
                ` : ''}
            </div>
        `).join('')}
    `}
</div>
            
            <!-- Image Section -->
            <div class="editor-section">
                <label class="editor-section-label">
                    <span>🖼️</span> Image (Optional)
                </label>
                ${q.image ? `
                    <div class="image-preview-container">
                        <img src="${q.image}" alt="Question image">
                        <div class="image-preview-overlay">
                            <button onclick="removeImage()" class="image-preview-remove">
                                <span>✕</span> Remove Image
                            </button>
                        </div>
                    </div>
                ` : `
                    <div class="upload-area" onclick="handleImageUpload()">
                        <div class="upload-icon">🖼️</div>
                        <p class="font-semibold" style="margin-bottom:0.25rem">Upload an image</p>
                        <p class="text-sm text-muted">Click to browse • Max 5MB</p>
                    </div>
                `}
            </div>
            
            <!-- Code Block -->
            <div class="editor-section">
                <label class="editor-section-label">
                    <span>💻</span> Code Block (Optional)
                </label>
                ${(q.code !== null && q.code !== undefined) ? `
                    <div class="code-editor-container">
                        <div class="code-editor-header">
                            <div class="code-editor-dot" style="background:#ef4444"></div>
                            <div class="code-editor-dot" style="background:#f59e0b"></div>
                            <div class="code-editor-dot" style="background:#22c55e"></div>
                            <span class="code-editor-label">CODE</span>
                        </div>
                        <textarea 
                            class="code-editor-textarea" 
                            placeholder="Enter code here..."
                            oninput="updateQuestionField('code', this.value)"
                        >${escapeHtml(q.code)}</textarea>
                    </div>
                    <!-- Phase 2: Code Execution Options -->
                    <div class="code-options-panel" style="margin-top:0.75rem;padding:1rem;background:var(--accent-glow);border-radius:var(--radius-md);border:1px solid var(--accent)">
                        <!-- Enable Execution -->
                        <label style="display:flex;align-items:center;gap:0.75rem;cursor:pointer;margin-bottom:1rem">
                            <input 
                                type="checkbox" 
                                ${q.executable ? 'checked' : ''}
                                onchange="updateQuestionField('executable', this.checked);if(this.checked && !state.parsedQuestions[state.currentEditQuestion].language){updateQuestionField('language','python')};updateEditorContent()"
                                style="width:18px;height:18px;accent-color:var(--accent)"
                            >
                            <div>
                                <span style="font-weight:600;color:var(--accent)">▶️ Enable Code Execution</span>
                                <p class="text-xs text-muted" style="margin-top:2px">Students can run this code in their browser</p>
                            </div>
                        </label>
                        
                        ${q.executable ? `
                        <!-- Language Selector -->
                        <div style="display:flex;gap:1rem;margin-bottom:1rem;flex-wrap:wrap">
                            <div style="flex:1;min-width:150px">
                                <label class="text-xs text-muted" style="display:block;margin-bottom:0.25rem">Language</label>
                                <select 
                                    class="input" 
                                    style="padding:0.5rem"
                                    onchange="updateQuestionField('language', this.value);updateEditorContent()"
                                >
                                    <option value="python" ${(q.language || 'python') === 'python' ? 'selected' : ''}>🐍 Python</option>
                                    <option value="javascript" ${q.language === 'javascript' ? 'selected' : ''}>⚡ JavaScript</option>
                                    <option value="html" ${q.language === 'html' ? 'selected' : ''}>🌐 HTML/CSS</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Editable Toggle -->
                        <label style="display:flex;align-items:center;gap:0.75rem;cursor:pointer;margin-bottom:0.5rem">
                            <input 
                                type="checkbox" 
                                ${q.editable ? 'checked' : ''}
                                onchange="updateQuestionField('editable', this.checked);updateEditorContent()"
                                style="width:18px;height:18px;accent-color:var(--success)"
                            >
                            <div>
                                <span style="font-weight:600;color:var(--success)">✏️ Editable Code (Fix the Bug)</span>
                                <p class="text-xs text-muted" style="margin-top:2px">Students can modify the code to fix errors</p>
                            </div>
                        </label>
                        
                        ${q.editable ? `
                        <!-- Starter Code (for editable questions) -->
                        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--cream)">
                            <label class="text-xs text-muted" style="display:block;margin-bottom:0.5rem">
                                Starter Code (what students see initially, leave blank to use main code)
                            </label>
                            <textarea 
                                class="input code-editor-textarea" 
                                rows="4"
                                placeholder="# Buggy code for students to fix..."
                                oninput="updateQuestionField('starterCode', this.value)"
                                style="font-family:'JetBrains Mono',monospace;font-size:0.875rem"
                            >${escapeHtml(q.starterCode || '')}</textarea>
                        </div>
                        ` : ''}
                        ` : ''}
                    </div>
                    <button onclick="updateQuestionField('code', null);updateQuestionField('executable', false);updateQuestionField('editable', false);updateEditorContent()" class="btn btn-ghost btn-sm" style="margin-top:0.75rem">
                        <span>✕</span> Remove Code Block
                    </button>
                ` : `
                    <button onclick="updateQuestionField('code', '');updateEditorContent()" class="btn btn-ghost btn-sm">
                        <span style="font-size:1rem">+</span> Add Code Block
                    </button>
                `}
            </div>
            
            <!-- Explanation -->
            <div class="editor-section" style="border:none;margin-bottom:0">
                <label class="editor-section-label">
                    <span>💡</span> Explanation (Optional)
                </label>
                ${(q.explanation !== null && q.explanation !== undefined) ? `
                    <textarea 
                        class="input" 
                        rows="3" 
                        placeholder="Explain why this is the correct answer..."
                        oninput="updateQuestionField('explanation', this.value)"
                    >${escapeHtml(q.explanation)}</textarea>
                    <button onclick="updateQuestionField('explanation', null);updateEditorContent()" class="btn btn-ghost btn-sm" style="margin-top:0.75rem">
                        <span>✕</span> Remove Explanation
                    </button>
                ` : `
                    <button onclick="updateQuestionField('explanation', '');updateEditorContent()" class="btn btn-ghost btn-sm">
                        <span style="font-size:1rem">+</span> Add Explanation
                    </button>
                `}
            </div>
        </div>
    `;
}

function updateMatchPair(index, field, value) {
    const q = state.parsedQuestions[state.currentEditQuestion];
    if (field === 'text') {
        q.matchPairs[index].text = value;
    } else if (field === 'correctMatch') {
        q.matchPairs[index].correctMatch = value;
    }
}

function updateMatchTarget(index, value) {
    const q = state.parsedQuestions[state.currentEditQuestion];
    q.matchTargets[index].text = value;
}

function addMatchPair() {
    const q = state.parsedQuestions[state.currentEditQuestion];
    const newId = String.fromCharCode(65 + q.matchPairs.length);
    const newTargetId = String.fromCharCode(65 + q.matchTargets.length);
    
    q.matchPairs.push({
        id: newId,
        text: '',
        correctMatch: newTargetId
    });
    
    q.matchTargets.push({
        id: newTargetId,
        text: ''
    });
    
    render();
}

function removeMatchPair(index) {
    const q = state.parsedQuestions[state.currentEditQuestion];
    if (q.matchPairs.length <= 2) {
        showToast('Need at least 2 matching pairs', 'warning');
        return;
    }
    
    const removedPairId = q.matchPairs[index].id;
    const removedTargetId = q.matchPairs[index].correctMatch;
    
    q.matchPairs.splice(index, 1);
    
    // Remove the corresponding target
    const targetIndex = q.matchTargets.findIndex(t => t.id === removedTargetId);
    if (targetIndex > -1) {
        q.matchTargets.splice(targetIndex, 1);
    }
    
    // Re-letter remaining pairs
    q.matchPairs.forEach((pair, i) => {
        pair.id = String.fromCharCode(65 + i);
    });
    
    q.matchTargets.forEach((target, i) => {
        target.id = String.fromCharCode(65 + i);
    });
    
    // Update correct matches to new IDs
    q.matchPairs.forEach(pair => {
        const targetIndex = q.matchTargets.findIndex(t => t.text === pair.text);
        if (targetIndex > -1) {
            pair.correctMatch = q.matchTargets[targetIndex].id;
        }
    });
    
    showToast('Matching pair removed', 'info');
    render();
}
function updateQuestionField(field, value) {
    const q = state.parsedQuestions[state.currentEditQuestion];
    q[field] = value;
    
    // Real-time sidebar update for question text
    if (field === 'question') {
        updateSidebarQuestionName(state.currentEditQuestion, value);
    }
}

function updateSidebarQuestionName(index, text) {
    const buttons = document.querySelectorAll('.editor-question-list-item');
    if (buttons[index]) {
        const span = buttons[index].querySelector('.question-list-text');
        if (span) {
            const displayText = text || 'Untitled question';
            
            // Smart truncation at word boundary
            let truncated = displayText;
            if (displayText.length > 40) {
                truncated = displayText.substring(0, 40);
                // Find last space to avoid cutting mid-word
                const lastSpace = truncated.lastIndexOf(' ');
                if (lastSpace > 20) { // Only if we have enough text
                    truncated = truncated.substring(0, lastSpace);
                }
                truncated += '...';
            }
            
            span.textContent = truncated;
            // Add full text as tooltip on hover
            buttons[index].setAttribute('title', displayText);
        }
    }
}
function updateQuestionType(newType) {
    const q = state.parsedQuestions[state.currentEditQuestion];
    const oldType = q.type;
    
    // Store the previous correct answers before changing
    if (!q._previousCorrect) {
        q._previousCorrect = { choice: [], ordering: [], matching: {} };
    }
    
    // Save current state
    if (oldType === 'choice' || oldType === 'ordering') {
        q._previousCorrect[oldType] = [...q.correct];
    } else if (oldType === 'matching') {
        q._previousCorrect.matching = JSON.parse(JSON.stringify(q.matchPairs || []));
    }
    
    // Change type
    q.type = newType;
    
    // Handle conversion to matching
    if (newType === 'matching') {
        // If we have previous matching data, restore it
        if (q._previousCorrect.matching && q._previousCorrect.matching.length > 0) {
            q.matchPairs = JSON.parse(JSON.stringify(q._previousCorrect.matching));
            // Reconstruct matchTargets from matchPairs
            const targetMap = new Map();
            q.matchPairs.forEach(pair => {
                if (!targetMap.has(pair.correctMatch)) {
                    targetMap.set(pair.correctMatch, {
                        id: pair.correctMatch,
                        text: `Definition ${pair.correctMatch}`
                    });
                }
            });
            q.matchTargets = Array.from(targetMap.values());
        } else {
            // Convert existing options to matching format
            if (q.options && q.options.length >= 2) {
                q.matchPairs = q.options.slice(0, Math.min(4, q.options.length)).map((opt, i) => ({
                    id: String.fromCharCode(65 + i),
                    text: opt,
                    correctMatch: String.fromCharCode(65 + i)
                }));
                q.matchTargets = q.matchPairs.map((pair, i) => ({
                    id: String.fromCharCode(65 + i),
                    text: `Definition for ${pair.text}`
                }));
            } else {
                // Create default matching pairs
                q.matchPairs = [
                    { id: 'A', text: 'Term 1', correctMatch: 'A' },
                    { id: 'B', text: 'Term 2', correctMatch: 'B' }
                ];
                q.matchTargets = [
                    { id: 'A', text: 'Definition A' },
                    { id: 'B', text: 'Definition B' }
                ];
            }
        }
    } else if (newType === 'choice' || newType === 'ordering') {
        // Convert matching back to regular options
        if (oldType === 'matching' && q.matchPairs) {
            q.options = q.matchPairs.map(pair => pair.text);
            if (newType === 'choice') {
                q.correct = q._previousCorrect.choice && q._previousCorrect.choice.length > 0 
                    ? [...q._previousCorrect.choice] 
                    : [];
            } else {
                q.correct = q.options.map((_, i) => i);
            }
        } else {
            // Restore previous state if exists
            if (q._previousCorrect[newType] && q._previousCorrect[newType].length > 0) {
                q.correct = [...q._previousCorrect[newType]];
            } else {
                // Set defaults
                if (newType === 'ordering') {
                    q.correct = q.options.map((_, i) => i);
                } else {
                    q.correct = [];
                }
            }
        }
    }
    
    render();
}
function toggleCorrectOption(index) {
    const q = state.parsedQuestions[state.currentEditQuestion];
    const idx = q.correct.indexOf(index);
    
    if (idx > -1) {
        q.correct.splice(idx, 1);
    } else {
        q.correct.push(index);
    }
    
    render();
}

function updateOption(index, value) {
    const q = state.parsedQuestions[state.currentEditQuestion];
    q.options[index] = value;
}

function addOption() {
    const q = state.parsedQuestions[state.currentEditQuestion];
    q.options.push('');
    render();
}

function removeOption(index) {
    const q = state.parsedQuestions[state.currentEditQuestion];
    if (q.options.length <= 2) {
        showToast('Need at least 2 options', 'warning');
        return;
    }
    q.options.splice(index, 1);
    
    // Update correct answers
    q.correct = q.correct.filter(i => i !== index).map(i => i > index ? i - 1 : i);
    
    render();
}

function handleImageUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be under 5MB', 'error');
            return;
        }
        
        try {
            showLoading();
            
            // Convert to base64
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            
            updateQuestionField('image', base64);
            hideLoading();
            showToast('Image uploaded!', 'success');
            render(); // ADD THIS LINE - Force re-render to show image
        } catch (err) {
            hideLoading();
            showToast('Failed to upload image', 'error');
        }
    };
    
    input.click();
}

function removeImage() {
    updateQuestionField('image', null);
    showToast('Image removed', 'info');
    render(); // ADD THIS LINE - Force re-render to show image
}

function deleteQuestion(index) {
    if (state.parsedQuestions.length === 1) {
        showToast('Cannot delete the last question', 'warning');
        return;
    }
    
    state.parsedQuestions.splice(index, 1);
    
    if (state.currentEditQuestion >= state.parsedQuestions.length) {
        state.currentEditQuestion = state.parsedQuestions.length - 1;
    }
    
    showToast('Question deleted', 'info');
    render();
}

function addNewQuestion() {
    state.parsedQuestions.push({
        question: '',
        type: 'choice',
        options: ['', ''],
        correct: [],
        image: null,
        explanation: null,
        code: null
    });
    state.currentEditQuestion = state.parsedQuestions.length - 1;
    render();
}

// ========== DRAG & DROP FOR ORDERING OPTIONS IN EDITOR ==========
let editorDraggedIndex = null;

function handleEditorDragStart(e, index) {
    editorDraggedIndex = index;
    e.currentTarget.classList.add('dragging');
}

function handleEditorDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleEditorDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleEditorDrop(e, targetIndex) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (editorDraggedIndex !== null && editorDraggedIndex !== targetIndex) {
        const q = state.parsedQuestions[state.currentEditQuestion];
        const options = [...q.options];
        
        // Swap the options
        const [draggedItem] = options.splice(editorDraggedIndex, 1);
        options.splice(targetIndex, 0, draggedItem);
        
        q.options = options;
        
        // Update correct order (it's just the new sequence)
        q.correct = q.options.map((_, i) => i);
        
        render();
    }
}

function handleEditorDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    editorDraggedIndex = null;
}
// ========== END DRAG & DROP ==========
function renderVisualEditor() {
    const q = state.parsedQuestions[state.currentEditQuestion];
    const isValid = q.question.trim() && q.options.length >= 2 && q.correct.length > 0;
    
    return `
        <nav class="navbar">
            <div class="container">
                <div class="navbar-inner">
                    <button onclick="state.visualEditorMode=false;state.view='create';clearCreationState();render()" class="btn btn-ghost">
                        ← Back to Text
                    </button>
                    <div style="text-align:center">
                        <h2 style="font-size:1rem;font-weight:700;margin-bottom:2px">Visual Editor</h2>
                        <p class="text-xs text-muted">${state.quizTitle || 'Untitled Quiz'}</p>
                    </div>
                    <button onclick="saveFromVisualEditor()" class="btn btn-accent">
                        💾 Save Quiz
                    </button>
                </div>
            </div>
        </nav>
        
        <main style="padding:2rem 0 4rem">
            <div class="container" style="max-width:1400px">
                <div class="editor-container">
                    <!-- Question List Sidebar -->
                    <div class="editor-sidebar">
                        <div class="editor-sidebar-header">
                            <h3 class="editor-sidebar-title">Questions</h3>
                            <button onclick="addNewQuestion()" class="btn btn-icon btn-sm btn-accent" style="width:32px;height:32px">
                                <span style="font-size:1.25rem">+</span>
                            </button>
                        </div>
                        <div class="editor-question-list">
                            ${state.parsedQuestions.map((question, i) => {
                                const qValid = question.question.trim() && question.options.length >= 2 && question.correct.length > 0;
                                const displayText = question.question || 'Untitled question';
                                let truncated = displayText;
                                if (displayText.length > 40) {
                                    truncated = displayText.substring(0, 40);
                                    const lastSpace = truncated.lastIndexOf(' ');
                                    if (lastSpace > 20) {
                                        truncated = truncated.substring(0, lastSpace);
                                    }
                                    truncated += '...';
                                }
                                
                                return `
                                    <button 
                                        onclick="switchQuestion(${i})"
                                        class="editor-question-list-item ${i === state.currentEditQuestion ? 'active' : ''}"
                                        title="${escapeHtml(displayText)}"
                                    >
                                        <span class="question-number-badge">${i + 1}</span>
                                        <span class="question-list-text">${escapeHtml(truncated)}</span>
                                        <span class="question-validity-indicator">
                                            ${qValid ? '<span style="color:var(--success)">✓</span>' : '<span style="color:var(--error)">⚠</span>'}
                                        </span>
                                    </button>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    
                    <!-- Question Editor -->
                    <div class="editor-main" id="editor-main-content">
                        ${renderEditorContent(q)}
                    </div>
                </div>
            </div>
        </main>
    `;
}

function renderEditorContent(q) {
    const questionIndex = state.currentEditQuestion;
    
    return `
        <div class="editor-card">
            <div class="editor-card-header">
                <div>
                    <h2 class="editor-card-title">Question ${state.currentEditQuestion + 1}</h2>
                    <p class="text-sm text-muted">of ${state.parsedQuestions.length} total</p>
                </div>
                ${state.parsedQuestions.length > 1 ? `
                    <button onclick="deleteQuestion(${state.currentEditQuestion})" class="btn btn-ghost btn-sm" style="color:var(--error)">
                        <span style="font-size:1.125rem">🗑️</span> Delete
                    </button>
                ` : ''}
            </div>
            
            <!-- Question Text -->
            <div class="editor-section">
                <label class="editor-section-label">
                    <span>📝</span> Question Text
                </label>
                <textarea 
                    class="input" 
                    rows="3" 
                    placeholder="Enter your question here..."
                    oninput="updateQuestionField('question', this.value)"
                    style="font-size:1rem"
                >${escapeHtml(q.question)}</textarea>
            </div>
            
           // In the renderEditorContent function, find the Question Type section and update it:

<!-- Question Type -->
<div class="editor-section">
    <label class="editor-section-label">
        <span>🎯</span> Question Type
    </label>
    <div class="tabs-container">
        <button 
            class="tab-button ${q.type === 'choice' ? 'active' : ''}" 
            onclick="updateQuestionType('choice')"
        >
            <span style="font-size:1rem">✓</span> Multiple Choice
        </button>
        <button 
            class="tab-button ${q.type === 'ordering' ? 'active' : ''}" 
            onclick="updateQuestionType('ordering')"
        >
            <span style="font-size:1rem">↕</span> Ordering
        </button>
        <button 
            class="tab-button ${q.type === 'matching' ? 'active' : ''}" 
            onclick="updateQuestionType('matching')"
        >
            <span style="font-size:1rem">🔗</span> Matching
        </button>
    </div>
</div>
            
            <!-- Options -->
            <div class="editor-section">
                <div class="flex justify-between items-center" style="margin-bottom:1rem">
                    <label class="editor-section-label" style="margin-bottom:0">
                        <span>📋</span> Answer Options
                    </label>
                    <button onclick="addOption()" class="btn btn-ghost btn-sm">
                        <span style="font-size:1rem">+</span> Add Option
                    </button>
                </div>
                
                ${q.type === 'ordering' ? `
                    <div class="editor-section-hint">
                        <span class="editor-section-hint-icon">💡</span>
                        <span>Drag options to set the correct order.</span>
                    </div>
                    ${q.options.map((opt, i) => `
                        <div 
                            class="option-editor" 
                            draggable="true"
                            ondragstart="handleEditorDragStart(event, ${i})"
                            ondragover="handleEditorDragOver(event)"
                            ondragleave="handleEditorDragLeave(event)"
                            ondrop="handleEditorDrop(event, ${i})"
                            ondragend="handleEditorDragEnd(event)"
                            style="cursor:move"
                        >
                            <span class="drag-handle">⋮⋮</span>
                            <span class="option-label">${i + 1}</span>
                            <input 
                                type="text" 
                                class="input" 
                                value="${escapeHtml(opt)}"
                                placeholder="Option ${i + 1}"
                                oninput="updateOption(${i}, this.value)"
                            >
                            ${q.options.length > 2 ? `
                                <button onclick="event.stopPropagation(); removeOption(${i})" class="option-remove-btn">
                                    <span style="font-size:1.125rem">✕</span>
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
                ` : `
                    <div class="editor-section-hint">
                        <span class="editor-section-hint-icon">💡</span>
                        <span>Check boxes to mark correct answers.</span>
                    </div>
                    ${q.options.map((opt, i) => `
                        <div class="option-editor">
                            <input 
                                type="checkbox" 
                                class="option-checkbox"
                                ${q.correct.includes(i) ? 'checked' : ''}
                                onchange="toggleCorrectOption(${i})"
                            >
                            <span class="option-label">${String.fromCharCode(65 + i)}</span>
                            <input 
                                type="text" 
                                class="input" 
                                value="${escapeHtml(opt)}"
                                placeholder="Option ${String.fromCharCode(65 + i)}"
                                oninput="updateOption(${i}, this.value)"
                            >
                            ${q.options.length > 2 ? `
                                <button onclick="removeOption(${i})" class="option-remove-btn">
                                    <span style="font-size:1.125rem">✕</span>
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
                `}
            </div>
            
            <!-- Image Section -->
            <div class="editor-section">
                <label class="editor-section-label">
                    <span>🖼️</span> Image (Optional)
                </label>
                ${q.image ? `
                    <div class="image-preview-container">
                        <img src="${q.image}" alt="Question image">
                        <div class="image-preview-overlay">
                            <button onclick="removeImage()" class="image-preview-remove">
                                <span>✕</span> Remove Image
                            </button>
                        </div>
                    </div>
                ` : `
                    <div class="upload-area" onclick="handleImageUpload()">
                        <div class="upload-icon">🖼️</div>
                        <p class="font-semibold" style="margin-bottom:0.25rem">Upload an image</p>
                        <p class="text-sm text-muted">Click to browse • Max 5MB</p>
                    </div>
                `}
            </div>
            
            <!-- Code Block -->
            <div class="editor-section">
                <label class="editor-section-label">
                    <span>💻</span> Code Block (Optional)
                </label>
                ${(q.code !== null && q.code !== undefined) ? `
                    <div class="code-editor-container">
                        <div class="code-editor-header">
                            <div class="code-editor-dot" style="background:#ef4444"></div>
                            <div class="code-editor-dot" style="background:#f59e0b"></div>
                            <div class="code-editor-dot" style="background:#22c55e"></div>
                            <span class="code-editor-label">CODE</span>
                        </div>
                        <textarea 
                            class="code-editor-textarea" 
                            placeholder="Enter code here..."
                            oninput="updateQuestionField('code', this.value)"
                        >${escapeHtml(q.code)}</textarea>
                    </div>
                    <button onclick="updateQuestionField('code', null);render()" class="btn btn-ghost btn-sm" style="margin-top:0.75rem">
                        <span>✕</span> Remove Code Block
                    </button>
                ` : `
                    <button onclick="updateQuestionField('code', '');render()" class="btn btn-ghost btn-sm">
                        <span style="font-size:1rem">+</span> Add Code Block
                    </button>
                `}
            </div>
            
            <!-- Explanation -->
            <div class="editor-section" style="border:none;margin-bottom:0">
                <label class="editor-section-label">
                    <span>💡</span> Explanation (Optional)
                </label>
                ${(q.explanation !== null && q.explanation !== undefined) ? `
                    <textarea 
                        class="input" 
                        rows="3" 
                        placeholder="Explain why this is the correct answer..."
                        oninput="updateQuestionField('explanation', this.value)"
                    >${escapeHtml(q.explanation)}</textarea>
                    <button onclick="updateQuestionField('explanation', null);render()" class="btn btn-ghost btn-sm" style="margin-top:0.75rem">
                        <span>✕</span> Remove Explanation
                    </button>
                ` : `
                    <button onclick="updateQuestionField('explanation', '');render()" class="btn btn-ghost btn-sm">
                        <span style="font-size:1rem">+</span> Add Explanation
                    </button>
                `}
            </div>
        </div>
    `;
}
        function showImportModal() {
            const m = document.createElement('div');
            m.innerHTML = `<div class="modal-overlay" onclick="if(event.target===this)this.remove()"><div class="modal"><div class="modal-header"><h2>Import Quizzes</h2><button class="btn btn-icon btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button></div><div class="modal-body"><div style="margin-bottom:1rem"><label class="input-label">Select JSON File</label><input type="file" id="importFile" accept=".json" class="input"></div><div id="importProgress" style="display:none"><div class="progress-bar"><div id="importProgressFill" class="progress-fill" style="width:0%"></div></div><p id="importStatus" class="text-sm text-muted" style="margin-top:0.5rem"></p></div></div><div class="modal-footer"><button class="btn btn-ghost flex-1" onclick="this.closest('.modal-overlay').remove()">Cancel</button><button class="btn btn-accent flex-1" onclick="processImport()">Import</button></div></div></div>`;
            document.body.appendChild(m.firstElementChild);
        }
        async function processImport() {
            const f = document.getElementById('importFile')?.files[0]; if (!f) { showToast('Select a file', 'warning'); return; }
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const qs = JSON.parse(e.target.result); if (!Array.isArray(qs)) throw new Error('Invalid');
                    document.getElementById('importProgress').style.display = 'block';
                    let ok = 0;
                    for (let i = 0; i < qs.length; i++) {
                        const q = qs[i]; document.getElementById('importProgressFill').style.width = ((i + 1) / qs.length * 100) + '%';
                        document.getElementById('importStatus').textContent = `Importing ${i + 1} of ${qs.length}`;
                        try { await apiCall('/quizzes', { method: 'POST', body: JSON.stringify({ title: q.title, questions: q.questions, description: q.description || '', color: q.color || getRandomColor(), is_public: false }) }); ok++; } catch (err) {}
                    }
                    await loadQuizzes(); document.querySelector('.modal-overlay').remove(); showToast(`Imported ${ok} quizzes`, 'success'); render();
                } catch (err) { showToast('Failed to parse', 'error'); }
            };
            reader.readAsText(f);
        }
        
        function showQuizletImport() {
            const m = document.createElement('div');
            m.innerHTML = `<div class="modal-overlay" onclick="if(event.target===this)this.remove()"><div class="modal modal-lg"><div class="modal-header"><h2>Import from Quizlet</h2><button class="btn btn-icon btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button></div><div class="modal-body"><div class="card" style="padding:1rem;margin-bottom:1.5rem;background:var(--accent-glow)"><p class="font-semibold" style="margin-bottom:0.5rem">How to Import</p><ol class="text-sm text-muted" style="padding-left:1.5rem"><li>Open Quizlet set</li><li>Click "..." → Export</li><li>Copy text</li><li>Paste below</li></ol></div><div class="flex gap-md" style="margin-bottom:1rem"><div class="flex-1"><label class="input-label">Title</label><input type="text" id="quizletTitle" class="input" placeholder="Quiz title"></div><div class="flex-1"><label class="input-label">Category</label><input type="text" id="quizletCategory" class="input" placeholder="Category"></div></div><div><label class="input-label">Paste Content</label><textarea id="quizletContent" class="input" rows="8" placeholder="Term[TAB]Definition"></textarea><p class="text-sm text-muted"><span id="termCount">0</span> terms</p></div></div><div class="modal-footer"><button class="btn btn-ghost flex-1" onclick="this.closest('.modal-overlay').remove()">Cancel</button><button class="btn btn-accent flex-1" onclick="processQuizletImport()">Create Quiz</button></div></div></div>`;
            document.body.appendChild(m.firstElementChild);
            document.getElementById('quizletContent').addEventListener('input', e => { document.getElementById('termCount').textContent = e.target.value.split('\n').filter(l => l.trim() && l.includes('\t')).length; });
        }
        async function processQuizletImport() {
            const title = document.getElementById('quizletTitle').value.trim(), cat = document.getElementById('quizletCategory').value.trim(), content = document.getElementById('quizletContent').value;
            if (!title) { showToast('Enter a title', 'warning'); return; }
            const lines = content.split('\n').filter(l => l.trim() && l.includes('\t'));
            if (lines.length < 4) { showToast('Need at least 4 terms', 'warning'); return; }
            const terms = lines.map(l => { const [t, d] = l.split('\t'); return { term: t?.trim(), def: d?.trim() }; }).filter(t => t.term && t.def);
            const qs = terms.map((t, i) => {
                const wrong = terms.filter((_, j) => j !== i).sort(() => Math.random() - 0.5).slice(0, 3).map(w => w.def);
                const opts = shuffleArray([t.def, ...wrong]); const ci = opts.indexOf(t.def);
                return { question: `What is: ${t.term}?`, type: 'choice', options: opts, correct: [ci], explanation: t.def };
            });
            try { await apiCall('/quizzes', { method: 'POST', body: JSON.stringify({ title, questions: qs, description: cat, color: getRandomColor(), is_public: false }) }); await loadQuizzes(); document.querySelector('.modal-overlay').remove(); showToast(`Created ${qs.length} questions!`, 'success'); render(); } catch (e) { showToast('Failed', 'error'); }
        }
        
        function createFolder() { const n = prompt('Folder name:'); if (!n?.trim()) return; state.folders.push({ id: Date.now(), name: n.trim(), quizIds: [], color: getRandomColor() }); saveFolders(); showToast('Created', 'success'); render(); }
       function addToFolder(qid, fid) { 
    const f = state.folders.find(fo => fo.id === fid); 
    if (!f) return;
    if (f.quizIds.includes(qid)) {
        showToast('Already in folder', 'info');
        return;
    }
    f.quizIds.push(qid); 
    saveFolders(); 
    showToast(`Added to ${f.name}`, 'success'); 
    render(); // ADD render to update UI
}
        
        function showQuizOptions(id) {
    const q = state.quizzes.find(qz => qz.id === id);
    if (!q) return;
    
    // Check if there's existing progress
    const hasProgress = loadQuizProgress(id) !== null;
    
    const m = document.createElement('div');
    m.innerHTML = `
        <div class="modal-overlay" onclick="if(event.target===this)this.remove()">
            <div class="modal">
                <div class="modal-header">
                    <h2>${hasProgress ? '⚠️ Resume or Start Over?' : 'Start Quiz'}</h2>
                    <button class="btn btn-icon btn-ghost" onclick="this.closest('.modal-overlay').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <h3 style="margin-bottom:0.25rem">${escapeHtml(q.title)}</h3>
                    <p class="text-sm text-muted" style="margin-bottom:2rem">${q.questions?.length || 0} questions</p>
                    
                    ${hasProgress ? `
                        <div class="card" style="padding:1rem;background:var(--accent-glow);margin-bottom:1.5rem;border:2px solid var(--accent)">
                            <p class="text-sm font-semibold" style="margin-bottom:0.25rem">📝 You have progress saved</p>
                            <p class="text-xs text-muted">You can continue where you left off or start fresh</p>
                        </div>
                    ` : ''}
                    
                    <div class="flex flex-col gap-md">
                        <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer">
                            <input type="checkbox" id="optShuffle" class="checkbox">
                            <span>Shuffle questions</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer">
                            <input type="checkbox" id="optTimer" class="checkbox" onchange="document.getElementById('timerSettings').style.display=this.checked?'block':'none'">
                            <span>Enable timer</span>
                        </label>
                        <div id="timerSettings" style="display:none;padding-left:2rem">
                            <label class="input-label">Minutes</label>
                            <input type="number" id="optMinutes" class="input" value="15" min="1" max="180" style="width:100px">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost flex-1" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    ${hasProgress ? `
                        <button class="btn btn-ghost flex-1" onclick="startQuizFresh(${id},false)">🔄 Start Fresh</button>
                        <button class="btn btn-accent flex-1" onclick="continueQuiz(${id})">▶️ Continue</button>
                    ` : `
                        <button class="btn btn-primary flex-1" onclick="startQuizFromModal(${id},false)">Quiz</button>
                        <button class="btn btn-accent flex-1" onclick="startQuizFromModal(${id},true)">Study</button>
                    `}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(m.firstElementChild);
}
        function startQuizFromModal(id, study) {
    const sh = document.getElementById('optShuffle')?.checked;
    const tm = document.getElementById('optTimer')?.checked;
    const mn = parseInt(document.getElementById('optMinutes')?.value) || 15;
    document.querySelector('.modal-overlay')?.remove();
    startQuiz(id, {
        studyMode: study,
        shuffleQuestions: sh,
        timerEnabled: tm && !study,
        timerMinutes: mn,
        forceNew: false
    });
}
        function startQuizFresh(id, study) {
    clearQuizProgress(id);
    const sh = document.getElementById('optShuffle')?.checked;
    const tm = document.getElementById('optTimer')?.checked;
    const mn = parseInt(document.getElementById('optMinutes')?.value) || 15;
    document.querySelector('.modal-overlay')?.remove();
    startQuiz(id, {
        studyMode: study,
        shuffleQuestions: sh,
        timerEnabled: tm && !study,
        timerMinutes: mn,
        forceNew: true
    });
}
        function render() {
            let html = '';
            if (!state.isAuthenticated) html = renderAuth();
            else { 
                switch (state.view) { 
                    case 'library': html = renderLibrary(); break; 
                    case 'create': html = renderCreate(); break; 
                    case 'quiz': html = renderQuiz(); break; 
                    case 'results': html = renderResults(); break; 
                    case 'review': html = renderReview(); break;
                    case 'multiplayer-lobby': html = renderMultiplayerLobby(); break;
                    case 'multiplayer-game': 
                        if (state.multiplayer.phase === 'finished') {
                            html = renderMultiplayerResults();
                        } else {
                            html = renderMultiplayerGame();
                        }
                        break;
                    default: html = renderLibrary(); 
                } 
            }
            document.getElementById('app').innerHTML = html;
            bindEvents();

            // Save creation state after rendering
    if (state.isAuthenticated && state.view === 'create') {
        saveCreationState();}
        }
        
        function renderQuizGrid() {
            console.log('renderQuizGrid called');
    const gridContainer = document.getElementById('quiz-grid');
    if (!gridContainer) return;
    
    const fq = getFilteredQuizzes();
    
    if (fq.length > 0) {
        gridContainer.className = 'grid grid-3';
        gridContainer.innerHTML = fq.map(q => {
            const qs = getQuizStats(q);
            const isDraggable = state.sortBy === 'custom' && !state.searchQuery && state.categoryFilter === 'all';
            return `
                <div class="quiz-card ${isDraggable ? 'draggable' : ''}" 
                    ${isDraggable ? `draggable="true" 
                    ondragstart="handleQuizDragStart(event, ${q.id})"
                    ondragover="handleQuizDragOver(event)"
                    ondragleave="handleQuizDragLeave(event)"
                    ondrop="handleQuizDrop(event, ${q.id})"
                    ondragend="handleQuizDragEnd(event)"` : ''}
                    onclick="showQuizOptions(${q.id})" style="position:relative">
                    ${isDraggable ? '<span class="drag-handle">⋮⋮</span>' : ''}
                    <div class="flex items-start gap-md" style="margin-bottom:1rem;min-width:0">
                        <div class="quiz-card-icon" style="background:${q.color || 'var(--cream)'}20;color:${q.color || 'var(--accent)'}">📚</div>
                        <div style="flex:1;min-width:0;overflow:hidden">
                            <h3 class="quiz-card-title">${state.searchQuery ? highlightText(q.title, state.searchQuery) : escapeHtml(q.title)}</h3>
                            <p class="quiz-card-meta">${q.description || 'No category'}</p>
                        </div>
                        <button onclick="toggleQuizDropdown(event, ${q.id})" class="btn btn-icon btn-ghost btn-sm">⋮</button>
                    </div>
                    <div class="quiz-card-stats">
                        <div class="quiz-card-stat"><span>📝</span><span>${q.questions?.length || 0}</span></div>
                        ${qs ? `<div class="quiz-card-stat"><span>🏆</span><span>${qs.best}%</span></div>` : `<div class="quiz-card-stat"><span>✨</span><span>New</span></div>`}
                        ${getDueCount(q.id, q.questions) > 0 ? `<span class="due-badge">${getDueCount(q.id, q.questions)} due</span>` : ''}
                    </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        gridContainer.className = '';
        gridContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📚</div>
                <h2 class="empty-state-title">${state.searchQuery || state.categoryFilter !== 'all' ? 'No quizzes found' : 'No quizzes yet'}</h2>
                <p class="empty-state-desc">${state.searchQuery || state.categoryFilter !== 'all' ? 'Try adjusting your search' : 'Create your first quiz'}</p>
                ${!state.searchQuery && state.categoryFilter === 'all' ? `<button onclick="state.view='create';render()" class="btn btn-accent">Create Quiz</button>` : ''}
            </div>
        `;
    }
}
        
function bindEvents() {
    if (state.view === 'create' && !state.visualEditorMode && state.isAuthenticated) {
        setTimeout(() => {
            const ti = document.getElementById('quizTitle'), 
                  ci = document.getElementById('quizCategory'), 
                  di = document.getElementById('quizData');
            
            if (ti) { 
                ti.value = state.quizTitle; 
                ti.addEventListener('input', e => state.quizTitle = e.target.value); 
            }
            if (ci) { 
                ci.value = state.quizCategory; 
                ci.addEventListener('input', e => state.quizCategory = e.target.value); 
            }
            if (di) { 
                di.value = state.quizData; 
                di.addEventListener('input', e => state.quizData = e.target.value); 
            }
        }, 0);
    }
    
    // Combine all library view event bindings
    if (state.view === 'library') {
        setTimeout(() => {
            // Search input
            const searchInput = document.getElementById('quiz-search');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    state.searchQuery = e.target.value;
                    renderQuizGrid();
                });
            }
            
            // Close dropdowns when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.dropdown')) {
                    document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
                }
            });
        }, 0);
        
        renderQuizGrid();
    }
// ===== ADD THIS SECTION HERE =====
    // Initialize matching question drag-drop
    if (state.view === 'quiz' && state.currentQuiz) {
        const currentQ = state.currentQuiz.questions[state.currentQuestionIndex];
        if (currentQ && currentQ.type === 'matching') {
            setTimeout(() => {
                initMatchingDragDrop();
            }, 100);
        }
    }
    // ===== END NEW SECTION =====
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
    if (state.view === 'quiz' && state.currentQuiz) {
        const quizContent = document.querySelector('.quiz-content');
        if (quizContent && 'ontouchstart' in window) {
            quizContent.addEventListener('touchstart', handleTouchStart, { passive: true });
            quizContent.addEventListener('touchend', handleTouchEnd, { passive: true });
        }
    }
}

function loadQuizProgress(quizId = null) {
    try {
        const stored = localStorage.getItem('quiz-progress-all');
        if (!stored) return quizId ? null : {};
        
        const allProgress = JSON.parse(stored);
        
        // If specific quiz requested, return that
        if (quizId) {
            const progress = allProgress[quizId];
            if (!progress) return null;
            
            // Validate essential data
            if (!progress.quizId || !progress.questions || !Array.isArray(progress.questions) || progress.questions.length === 0) {
                delete allProgress[quizId];
                localStorage.setItem('quiz-progress-all', JSON.stringify(allProgress));
                return null;
            }
            
            // Check if expired (older than 7 days)
            const daysSinceStart = (Date.now() - (progress.startTime || Date.now())) / (1000 * 60 * 60 * 24);
            if (daysSinceStart > 7) {
                delete allProgress[quizId];
                localStorage.setItem('quiz-progress-all', JSON.stringify(allProgress));
                return null;
            }
            
            return progress;
        }
        
        // Otherwise return all valid progress
        const validProgress = {};
        Object.entries(allProgress).forEach(([qid, progress]) => {
            if (progress && progress.quizId && progress.questions && Array.isArray(progress.questions) && progress.questions.length > 0) {
                const daysSinceStart = (Date.now() - (progress.startTime || Date.now())) / (1000 * 60 * 60 * 24);
                if (daysSinceStart <= 7) {
                    validProgress[qid] = progress;
                }
            }
        });
        
        return validProgress;
    } catch (e) {
        console.error('Failed to load quiz progress:', e);
        localStorage.removeItem('quiz-progress-all');
        return quizId ? null : {};
    }
}

function getAllInProgressQuizzes() {
    const allProgress = loadQuizProgress();
    if (!allProgress || typeof allProgress !== 'object') return [];
    
    return Object.values(allProgress)
        .filter(p => p && p.quizId && p.questions && Array.isArray(p.questions) && p.questions.length > 0)
        .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

function resumeQuiz(progress) {
    state.currentQuiz = {
        id: progress.quizId,
        title: progress.quizTitle,
        questions: progress.questions
    };
    state.currentQuestionIndex = progress.currentQuestionIndex;
    state.answers = progress.answers;
    state.studyMode = progress.studyMode;
    state.showAnswer = progress.showAnswer;
    state.flaggedQuestions = new Set(progress.flaggedQuestions || []);
    state.timerEnabled = progress.timerEnabled;
    state.timerMinutes = progress.timerMinutes || 15;
    state.timeRemaining = progress.timeRemaining || 0;
    state.startTime = progress.startTime;
    state.streak = progress.streak || 0;
    state.maxStreak = progress.maxStreak || 0;
    
    // Resume timer if it was active and time remaining
    if (state.timerEnabled && state.timeRemaining > 0) {
        startTimer();
    } else if (state.timerEnabled && state.timeRemaining <= 0) {
        state.timeExpired = true;
    }
    
    state.view = 'quiz';
    render();
}

function clearQuizProgress(quizId = null) {
    try {
        const stored = localStorage.getItem('quiz-progress-all');
        if (!stored) return;
        
        const allProgress = JSON.parse(stored);
        
        if (quizId) {
            delete allProgress[quizId];
        } else if (state.currentQuiz) {
            delete allProgress[state.currentQuiz.id];
        }
        
        localStorage.setItem('quiz-progress-all', JSON.stringify(allProgress));
    } catch (e) {
        console.error('Failed to clear quiz progress:', e);
    }
}

function showResumePrompt(progress) {
    const timeSinceStart = Date.now() - (progress.startTime || Date.now());
    const minutes = Math.floor(timeSinceStart / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    let timeAgo = 'just now';
    if (days > 0) timeAgo = `${days} day${days > 1 ? 's' : ''} ago`;
    else if (hours > 0) timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`;
    else if (minutes > 0) timeAgo = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const answeredCount = progress.answers.filter(a => a != null && (Array.isArray(a) ? a.length > 0 : true)).length;
    const totalQuestions = progress.questions.length;
    const progressPct = Math.round((answeredCount / totalQuestions) * 100);
    
    const m = document.createElement('div');
    m.innerHTML = `
        <div class="modal-overlay" style="z-index:300">
            <div class="modal">
                <div class="modal-header">
                    <h2>📝 Resume Quiz?</h2>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom:1.5rem">
                        <h3 style="margin-bottom:0.25rem">${escapeHtml(progress.quizTitle)}</h3>
                        <p class="text-sm text-muted">
                            Question ${progress.currentQuestionIndex + 1} of ${totalQuestions} • ${timeAgo}
                        </p>
                    </div>
                    
                    <div style="margin-bottom:1.5rem">
                        <div class="flex justify-between items-center" style="margin-bottom:0.5rem">
                            <span class="text-sm text-muted">Progress</span>
                            <span class="text-sm font-semibold">${progressPct}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width:${progressPct}%"></div>
                        </div>
                    </div>
                    
                    <div class="flex gap-md" style="margin-bottom:1rem">
                        <div class="stat-card flex-1" style="text-align:center;padding:1rem">
                            <div class="stat-value" style="font-size:2rem">${answeredCount}</div>
                            <div class="stat-label">Answered</div>
                        </div>
                        <div class="stat-card flex-1" style="text-align:center;padding:1rem">
                            <div class="stat-value" style="font-size:2rem">${totalQuestions - answeredCount}</div>
                            <div class="stat-label">Remaining</div>
                        </div>
                    </div>
                    
                    ${progress.timerEnabled ? `
                        <div class="card" style="padding:1rem;background:var(--info-light);margin-bottom:1rem">
                            <div class="flex items-center gap-sm">
                                <span>⏱️</span>
                                <span class="text-sm">
                                    <strong>Timer:</strong> ${Math.floor(progress.timeRemaining / 60)}:${(progress.timeRemaining % 60).toString().padStart(2, '0')} remaining
                                </span>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${progress.studyMode ? `
                        <div class="badge badge-accent" style="width:100%;justify-content:center;padding:0.5rem">
                            📖 Study Mode
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost flex-1" onclick="discardProgress(${progress.quizId})">
                        🗑️ Start Over
                    </button>
                    <button class="btn btn-accent flex-1" onclick="continueQuiz(${progress.quizId})">
                        ▶️ Continue
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(m.firstElementChild);
}

function continueQuiz(quizId) {
    const progress = loadQuizProgress(quizId);
    if (!progress) {
        showToast('Progress not found', 'error');
        document.querySelector('.modal-overlay')?.remove();
        render();
        return;
    }
    resumeQuiz(progress);
    document.querySelector('.modal-overlay')?.remove();
    showToast('Quiz resumed', 'success');
}

function discardProgress(quizId) {
    clearQuizProgress(quizId);
    document.querySelector('.modal-overlay')?.remove();
    showToast('Progress cleared', 'info');
    render();
}
					
        function renderAuth() {
            const isLogin = state.authMode === 'login';
            return `<div class="auth-page"><div class="auth-card"><div class="auth-logo"><div class="logo-mark">Q</div><span style="font-family:var(--font-display);font-size:1.5rem;font-weight:700">Quiz Master Pro</span></div><h1 class="auth-title">${isLogin ? 'Welcome back' : 'Create account'}</h1><p class="auth-subtitle">${isLogin ? 'Sign in to continue' : 'Start your journey'}</p><form onsubmit="event.preventDefault();${isLogin ? 'handleLogin()' : 'handleRegister()'}"><div style="margin-bottom:1rem"><label class="input-label">Username</label><input type="text" id="username" class="input" placeholder="Username" required></div><div style="margin-bottom:1.5rem"><label class="input-label">Password</label><input type="password" id="password" class="input" placeholder="Password" required></div><button type="submit" class="btn btn-accent btn-lg" style="width:100%">${isLogin ? 'Sign In' : 'Create Account'}</button></form><div class="auth-divider">${isLogin ? 'New here?' : 'Have an account?'}</div><button onclick="state.authMode='${isLogin ? 'register' : 'login'}';render()" class="btn btn-ghost" style="width:100%">${isLogin ? 'Create account' : 'Sign in'}</button></div></div>`;
        }
        function handleLogin() { login(document.getElementById('username').value, document.getElementById('password').value); }
        function handleRegister() { register(document.getElementById('username').value, document.getElementById('password').value); }
        
        function renderLibrary() {
            const stats = getUserStats(), cats = getCategories(), fq = getFilteredQuizzes();
            return `
                <nav class="navbar">
                    <div class="container">
                        <div class="navbar-inner">
                            <a href="#" class="logo" onclick="state.view='library';render()">
                                <div class="logo-mark">Q</div>
                                <span class="hide-mobile">Quiz Master Pro</span>
                            </a>
                            <div class="flex items-center gap-sm">
                                <button onclick="toggleDarkMode()" class="btn btn-icon btn-ghost">${state.darkMode ? '☀️' : '🌙'}</button>
                                <button onclick="showMultiplayerModal()" class="btn btn-icon btn-ghost hide-mobile" title="Multiplayer">🎮</button>
                                <button onclick="showQuizletImport()" class="btn btn-ghost btn-sm hide-mobile">Quizlet</button>
                                <button onclick="state.view='create';state.editingQuizId=null;state.quizTitle='';state.quizData='';state.quizCategory='';render()" class="btn btn-accent btn-sm">+ <span class="hide-mobile">New Quiz</span></button>
                                <div class="dropdown">
                                    <button onclick="this.parentElement.classList.toggle('open')" class="btn btn-icon btn-ghost">👤</button>
                                    <div class="dropdown-menu">
                                        <div style="padding:0.5rem 1rem;border-bottom:1px solid var(--border)"><p class="font-semibold">${state.user?.username || 'User'}</p></div>
                                        <button class="dropdown-item" onclick="showMultiplayerModal();this.closest('.dropdown').classList.remove('open')">🎮 Multiplayer</button>
                                        <button class="dropdown-item" onclick="showQuizletImport();this.closest('.dropdown').classList.remove('open')">📋 Quizlet Import</button>
                                        <button class="dropdown-item" onclick="showImportModal();this.closest('.dropdown').classList.remove('open')">📥 Import JSON</button>
                                        <button class="dropdown-item" onclick="exportQuizzes()">📤 Export</button>
                                        <button class="dropdown-item" onclick="createFolder()">📁 New Folder</button>
                                        <button class="dropdown-item danger" onclick="logout()">Sign out</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>
                
                <main style="padding:1.5rem 0 4rem">
                    <div class="container">
                        <div style="margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem">
                            <div>
                                <h1 style="margin-bottom:0.25rem">Welcome back${state.user?.username ? ', ' + state.user.username : ''}</h1>
                                <p class="text-muted">Ready to study?</p>
                            </div>
                            ${renderStreakDisplay()}
                        </div>
                        
                        ${renderDueBanner()}
                        
                        <div class="grid grid-4 gap-md" style="margin-bottom:2rem">
                            <div class="stat-card"><div class="stat-value">${stats.totalQuizzes}</div><div class="stat-label">Quizzes</div></div>
                            <div class="stat-card"><div class="stat-value">${stats.totalQuestions}</div><div class="stat-label">Questions</div></div>
                            <div class="stat-card"><div class="stat-value">${(() => { try { return StudyStats.getStats().totalReviews || 0; } catch(e) { return 0; } })()}</div><div class="stat-label">Reviews</div></div>
                            <div class="stat-card accent"><div class="stat-value">${(() => { try { return StudyStats.getAccuracy() || stats.avgScore; } catch(e) { return stats.avgScore; } })()}%</div><div class="stat-label">Accuracy</div></div>
                        </div>
                        
                        ${state.folders.length > 0 ? `
                            <div style="margin-bottom:1.5rem">
                                <div class="flex items-center gap-sm flex-wrap">
                                    <button onclick="state.selectedFolder='all';render()" class="btn ${state.selectedFolder === 'all' ? 'btn-primary' : 'btn-ghost'} btn-sm">All</button>
                                    ${state.folders.map(f => `
                                        <div class="folder-btn">
                                            <button onclick="state.selectedFolder='${f.id}';render()" class="btn btn-sm" style="background:${state.selectedFolder == f.id ? f.color : 'transparent'};color:${state.selectedFolder == f.id ? 'white' : 'var(--ink)'};border:2px solid ${f.color}">
                                                📁 ${escapeHtml(f.name)} (${f.quizIds.length})
                                            </button>
                                            <button onclick="event.stopPropagation();deleteFolder(${f.id})" class="folder-delete">✕</button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        ${(() => {
    const allProgress = getAllInProgressQuizzes();
    if (allProgress.length === 0) return '';
    
    // Show all in-progress quizzes
    return allProgress.map(progress => {
        const quizExists = state.quizzes.some(q => q.id === progress.quizId);
        if (!quizExists) return ''; // Skip deleted quizzes
        
        const answeredCount = progress.answers.filter(a => a != null && (Array.isArray(a) ? a.length > 0 : true)).length;
        const progressPct = Math.round((answeredCount / progress.questions.length) * 100);
        
        const timeSinceStart = Date.now() - (progress.startTime || Date.now());
        const minutes = Math.floor(timeSinceStart / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        let timeAgo = 'just now';
        if (days > 0) timeAgo = `${days} day${days > 1 ? 's' : ''} ago`;
        else if (hours > 0) timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`;
        else if (minutes > 0) timeAgo = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        
        return `
            <div class="card" style="padding:1.5rem;margin-bottom:1rem;background:var(--accent-glow);border:2px solid var(--accent);cursor:pointer" onclick="continueQuiz(${progress.quizId})">
                <div class="flex items-center justify-between gap-md">
                    <div class="flex items-center gap-md flex-1" style="min-width:0">
                        <div style="width:48px;height:48px;background:var(--accent);color:white;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0">▶️</div>
                        <div style="flex:1;min-width:0;overflow:hidden">
                            <h3 style="margin-bottom:0.25rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Resume: ${escapeHtml(progress.quizTitle)}</h3>
                            <p class="text-sm text-muted">${answeredCount}/${progress.questions.length} answered • ${timeAgo}</p>
                        </div>
                    </div>
                    <div style="text-align:right;flex-shrink:0">
                        <div class="badge badge-accent" style="font-size:0.875rem;padding:0.5rem 1rem">${progressPct}%</div>
                        <button onclick="event.stopPropagation();if(confirm('Discard this progress?'))discardProgress(${progress.quizId})" class="btn btn-ghost btn-sm" style="margin-top:0.5rem">🗑️ Discard</button>
                    </div>
                </div>
                <div class="progress-bar" style="margin-top:1rem">
                    <div class="progress-fill" style="width:${progressPct}%"></div>
                </div>
            </div>
        `;
    }).join('');
})()}
                        <div class="flex gap-md items-center flex-wrap" style="margin-bottom:1.5rem">
                            <div class="search-wrapper" style="flex:1;min-width:200px">
                                <span class="search-icon">🔍</span>
                                <input type="text" id="quiz-search" class="input search-input" placeholder="Search..." value="${state.searchQuery}">
                            </div>
                            <select class="input" style="width:auto" onchange="state.categoryFilter=this.value;render()">
                                <option value="all">All Categories</option>
                                ${cats.map(c => `<option value="${escapeHtml(c)}" ${state.categoryFilter === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
                            </select>
                            <div class="tabs">
                                <button class="tab ${state.sortBy === 'custom' ? 'active' : ''}" onclick="state.sortBy='custom';render()">Custom</button>
                                <button class="tab ${state.sortBy === 'recent' ? 'active' : ''}" onclick="state.sortBy='recent';render()">Recent</button>
                                <button class="tab ${state.sortBy === 'alpha' ? 'active' : ''}" onclick="state.sortBy='alpha';render()">A-Z</button>
                            </div>
                        </div>
                        
                        ${fq.length > 0 ? `
                            <div class="grid grid-3" id="quiz-grid">
                                ${fq.map(q => {
                                    const qs = getQuizStats(q);
                                    const isDraggable = state.sortBy === 'custom' && !state.searchQuery && state.categoryFilter === 'all';
                                    return `
                                        <div class="quiz-card ${isDraggable ? 'draggable' : ''}" 
                                            ${isDraggable ? `draggable="true" 
                                            ondragstart="handleQuizDragStart(event, ${q.id})"
                                            ondragover="handleQuizDragOver(event)"
                                            ondragleave="handleQuizDragLeave(event)"
                                            ondrop="handleQuizDrop(event, ${q.id})"
                                            ondragend="handleQuizDragEnd(event)"` : ''}
                                            onclick="showQuizOptions(${q.id})" style="position:relative">
                                            ${isDraggable ? '<span class="drag-handle">⋮⋮</span>' : ''}
                                            <div class="flex items-start gap-md" style="margin-bottom:1rem;min-width:0">
                                                <div class="quiz-card-icon" style="background:${q.color || 'var(--cream)'}20;color:${q.color || 'var(--accent)'}">📚</div>
                                                <div style="flex:1;min-width:0;overflow:hidden">
                                                    <h3 class="quiz-card-title">${state.searchQuery ? highlightText(q.title, state.searchQuery) : escapeHtml(q.title)}</h3>
                                                    <p class="quiz-card-meta">${q.description || 'No category'}</p>
                                                </div>
                                                <button onclick="toggleQuizDropdown(event, ${q.id})" class="btn btn-icon btn-ghost btn-sm">⋮</button>
                                            </div>
                                            <div class="quiz-card-stats">
                                                <div class="quiz-card-stat"><span>📝</span><span>${q.questions?.length || 0}</span></div>
                                                ${qs ? `<div class="quiz-card-stat"><span>🏆</span><span>${qs.best}%</span></div>` : `<div class="quiz-card-stat"><span>✨</span><span>New</span></div>`}
                                                ${getDueCount(q.id, q.questions) > 0 ? `<span class="due-badge">${getDueCount(q.id, q.questions)} due</span>` : ''}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            ${state.sortBy === 'custom' && !state.searchQuery && state.categoryFilter === 'all' ? '<p class="text-sm text-muted" style="margin-top:1rem;text-align:center">💡 Drag quizzes to reorder</p>' : ''}
                        ` : `
                            <div class="empty-state">
                                <div class="empty-state-icon">📚</div>
                                <h2 class="empty-state-title">${state.searchQuery || state.categoryFilter !== 'all' ? 'No quizzes found' : 'No quizzes yet'}</h2>
                                <p class="empty-state-desc">${state.searchQuery || state.categoryFilter !== 'all' ? 'Try adjusting your search' : 'Create your first quiz'}</p>
                                ${!state.searchQuery && state.categoryFilter === 'all' ? `<button onclick="state.view='create';render()" class="btn btn-accent">Create Quiz</button>` : ''}
                            </div>
                        `}
                    </div>
                </main>
            `;
        }
        
       function renderCreate() {
    const isEdit = state.editingQuizId !== null;

    // If in visual editor mode
    if (state.visualEditorMode && state.parsedQuestions && state.parsedQuestions.length > 0) {
        return renderVisualEditor();
    }
    
    // Otherwise show text input
    return `
        <nav class="navbar">
            <div class="container">
                <div class="navbar-inner">
                    <button onclick="state.view='library';state.editingQuizId=null;state.quizTitle='';state.quizData='';state.quizCategory='';state.visualEditorMode=false;state.parsedQuestions=null;clearCreationState();render()" class="btn btn-ghost">← Back</button>
                    <h2 style="font-size:1.125rem">${isEdit ? 'Edit Quiz' : 'Create Quiz'}</h2>
                    <button onclick="proceedToVisualEditor()" class="btn btn-accent">Next: Visual Editor →</button>
                </div>
            </div>
        </nav>
        
        <main style="padding:2rem 0">
            <div class="container-narrow">
                <div class="card" style="padding:2rem">
                    <div style="margin-bottom:1.5rem">
                        <label class="input-label">Title</label>
                        <input type="text" id="quizTitle" class="input" placeholder="Quiz title">
                    </div>
                    <div style="margin-bottom:1.5rem">
                        <label class="input-label">Category</label>
                        <input type="text" id="quizCategory" class="input" placeholder="e.g., Networking">
                    </div>
                    <div>
                        <div class="flex justify-between items-center" style="margin-bottom:0.5rem">
                            <label class="input-label">Questions</label>
                            <button onclick="state.showFormatHelp=!state.showFormatHelp;render()" class="btn btn-ghost btn-sm">${state.showFormatHelp ? 'Hide' : 'Show'} help</button>
                        </div>
                        ${state.showFormatHelp ? `
                            <div class="card" style="padding:1.5rem;margin-bottom:1rem;background:var(--cream)">
                                <p class="font-semibold" style="margin-bottom:1.5rem">📝 Question Format Guide</p>

                                <p class="text-sm font-semibold" style="margin-bottom:0.5rem">Single Choice:</p>
                                <div class="format-example" style="margin-bottom:1rem">1. What is the capital of France?
A. London
B. Paris *
C. Berlin</div>

                                <p class="text-sm font-semibold" style="margin-bottom:0.5rem">Multiple Choice (Select All):</p>
                                <div class="format-example" style="margin-bottom:1rem">2. Which are valid IPv4 classes?
A. Class A *
B. Class B *
C. Class E *
D. Class Z</div>

                                <p class="text-sm font-semibold" style="margin-bottom:0.5rem">Ordering Questions:</p>
                                <div class="format-example" style="margin-bottom:1rem">3. [order] Put the OSI layers in order (top to bottom)
1) Application
2) Presentation
3) Session
4) Transport</div>

                                <p class="text-sm font-semibold" style="margin-bottom:0.5rem">Matching Questions:</p>
                                <div class="format-example" style="margin-bottom:1rem">4. [matching] Match protocols with their functions:
A. DNS = B *
B. DHCP = A *
C. FTP = C *
Definitions:
A) Assigns IP addresses automatically
B) Translates domain names to IP addresses
C) Transfers files between systems</div>

                                <p class="text-sm font-semibold" style="margin-bottom:0.5rem">With Code Block:</p>
                                <div class="format-example" style="margin-bottom:1rem">5. What does this command display?
[code]
show ip route
[/code]
A. Routing table *
B. Interface list
C. ARP cache</div>

                                <p class="text-sm font-semibold" style="margin-bottom:0.5rem">With Image:</p>
                                <div class="format-example" style="margin-bottom:1rem">6. What topology is shown in this diagram?
[image: https://example.com/network.png]
A. Star *
B. Ring
C. Mesh</div>

                                <p class="text-sm font-semibold" style="margin-bottom:0.5rem">With Explanation:</p>
                                <div class="format-example" style="margin-bottom:1rem">7. What is the default admin distance for OSPF?
A. 90
B. 110 *
C. 120
[explanation: OSPF has an admin distance of 110. EIGRP is 90, RIP is 120.]</div>

                                <div style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--cream)">
                                    <p class="text-sm font-semibold" style="margin-bottom:0.5rem">Quick Reference:</p>
                                    <ul class="text-xs text-muted" style="padding-left:1.25rem;line-height:1.8">
                                        <li><code>*</code> after an option marks it as correct</li>
                                        <li>Multiple <code>*</code> = "select all that apply"</li>
                                        <li><code>[order]</code> after question number = ordering question</li>
                                        <li><code>[matching]</code> after question number = matching question</li>
                                        <li>In matching: <code>A. Term = B *</code> means Term A matches Definition B</li>
                                        <li><code>[code]...[/code]</code> = code block</li>
                                        <li><code>[image: URL]</code> = include an image</li>
                                        <li><code>[explanation: text]</code> = show after answering</li>
                                    </ul>
                                </div>
                            </div>
                        ` : ''}
                        <textarea id="quizData" class="input" rows="20" placeholder="Enter questions..." style="font-family:monospace;font-size:0.875rem"></textarea>
                    </div>
                </div>
            </div>
        </main>
    `;
}
        
function renderQuiz() {
    const q = state.currentQuiz.questions[state.currentQuestionIndex];
    console.log('Question type:', q.type, 'Full question:', q); // DEBUG
    const prog = ((state.currentQuestionIndex + 1) / state.currentQuiz.questions.length) * 100;
    const flagged = state.flaggedQuestions.has(state.currentQuestionIndex);
    const ua = state.answers[state.currentQuestionIndex] || [];
    let isCorrect = false;
    if (state.studyMode && state.showAnswer) {
        if (q.type === 'choice') { 
            const as = new Set(ua), cs = new Set(q.correct); 
            isCorrect = as.size === cs.size && [...as].every(a => cs.has(a)); 
        }
        else if (q.type === 'ordering') {
            isCorrect = JSON.stringify(ua) === JSON.stringify(q.correct);
        }
        else if (q.type === 'matching') {
            isCorrect = true;
            for (const pair of q.matchPairs) {
                if (ua[pair.id] !== pair.correctMatch) {
                    isCorrect = false;
                    break;
                }
            }
        }
    }
    
    let optHTML = '';
    if (q.type === 'ordering') {
        const order = state.answers[state.currentQuestionIndex] || q.options.map((_, i) => i);
        optHTML = `<div class="flex flex-col gap-sm">${order.map((oi, pos) => `<div draggable="true" class="draggable-item ${state.studyMode && state.showAnswer ? (q.correct[pos] === oi ? 'correct' : 'incorrect') : ''}" data-position="${pos}"><span class="drag-handle">☰</span><span class="drag-number">${pos + 1}</span><span style="flex:1">${escapeHtml(q.options[oi])}</span></div>`).join('')}</div><p class="text-sm text-muted" style="margin-top:1rem">${state.studyMode && !state.showAnswer ? '💡 Drag to reorder, then click Check Answer' : '💡 Drag to reorder'}</p>`;
    } else if (q.type === 'matching') {
        optHTML = renderMatchingQuestion(q, state.currentQuestionIndex);
    } else if (q.type !== 'ios' && q.options && q.options.length > 0) {
        optHTML = q.options.map((opt, i) => {
            const sel = ua.includes(i), corr = q.correct.includes(i);
            let cls = 'option-btn';
            if (state.studyMode && state.showAnswer) { 
                cls += ' answered';
                if (corr) cls += ' correct'; 
                else if (sel) cls += ' incorrect'; 
            }
            else if (sel) cls += ' selected';
            return `<button class="${cls}" onclick="selectAnswer(${i})" ${state.studyMode && state.showAnswer ? 'disabled' : ''}><span class="option-letter">${String.fromCharCode(65 + i)}</span><span style="flex:1">${escapeHtml(opt)}</span>${state.studyMode && state.showAnswer && corr ? '<span class="badge badge-success">✓</span>' : ''}${state.studyMode && state.showAnswer && sel && !corr ? '<span class="badge badge-error">✗</span>' : ''}</button>`;
        }).join('');
    }
    
    return `
        <div style="min-height:100vh;background:var(--paper)">
            <header class="quiz-header">
                <div class="container">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-md">
                            <div class="flex gap-sm">
                                <button onclick="saveAndExitQuiz()" class="btn btn-ghost btn-sm">💾 Save & Exit</button>
                            </div>
                            <div>
                                <h2 style="font-size:1rem;margin-bottom:2px">${escapeHtml(state.currentQuiz.title)}</h2>
                                <p class="text-xs text-muted">${state.studyMode ? '📖 Study' : '🎯 Quiz'}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-sm">
                            ${state.timerEnabled ? `<div class="badge" style="font-family:monospace;font-size:1rem;padding:0.5rem 1rem">⏱️ <span id="timer">${Math.floor(state.timeRemaining / 60)}:${(state.timeRemaining % 60).toString().padStart(2, '0')}</span></div>` : ''}
                            ${state.studyMode && state.streak > 0 ? `<div class="streak-badge">🔥 ${state.streak}</div>` : ''}
                            <button onclick="toggleFlag()" class="btn btn-icon ${flagged ? 'btn-accent' : 'btn-ghost'}">${flagged ? '🚩' : '⚑'}</button>
                        </div>
                    </div>
                </div>
            </header>
            
            <div class="quiz-progress-section">
                <div class="container">
                    <div class="flex justify-between items-center" style="margin-bottom:0.5rem">
                        <span class="text-sm text-muted">Question ${state.currentQuestionIndex + 1} of ${state.currentQuiz.questions.length}</span>
                        <span class="text-sm font-semibold" style="color:var(--accent)">${Math.round(prog)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width:${prog}%"></div>
                    </div>
                </div>
            </div>
            
            <div class="quiz-content">
                <div class="container-narrow">
                    ${state.studyMode && state.showAnswer ? `
                        <div class="feedback-banner ${isCorrect ? 'correct' : 'incorrect'}" style="margin-bottom:1.5rem">
                            <span style="font-size:1.25rem">${isCorrect ? '✓' : '✗'}</span>
                            <span>${isCorrect ? 'Correct!' : 'Incorrect'}</span>
                            ${isCorrect && state.streak > 1 ? `<span class="streak-badge" style="margin-left:auto">🔥 ${state.streak}</span>` : ''}
                        </div>
                    ` : ''}
                    
                    <div class="card" style="padding:2rem;margin-bottom:1.5rem">
                        <div class="flex items-start gap-md" style="margin-bottom:2rem">
                            <div class="question-number">${state.currentQuestionIndex + 1}</div>
                            <h2 class="question-text">${escapeHtml(q.question)}</h2>
                            ${q.type === 'ios' ? '<span class="question-type-ios">Cisco IOS</span>' : ''}
                        </div>
                        
                        ${q.type === 'ios' ? renderIOSTerminal(q, state.currentQuestionIndex) : ''}
                        
                        ${q.code && q.type !== 'ios' ? renderExecutableCodeBlock(q, state.currentQuestionIndex) : ''}
                        
                        ${q.image ? `<img src="${escapeHtml(q.image)}" alt="Question image" style="max-width:100%;max-height:300px;border-radius:var(--radius-md);margin-bottom:1.5rem">` : ''}
                        
                        ${q.type === 'choice' && q.correct && q.correct.length > 1 ? `<div class="badge badge-accent" style="margin-bottom:1rem">Select all that apply (${q.correct.length} answers)</div>` : ''}
                        
                        ${q.type === 'matching' ? optHTML : q.type !== 'ios' ? `<div class="flex flex-col gap-sm">${optHTML}</div>` : ''}

${state.studyMode && !state.showAnswer && q.type === 'matching' && state.answers[state.currentQuestionIndex] && Object.keys(state.answers[state.currentQuestionIndex]).length === q.matchPairs.length ? `
    <button onclick="checkStudyAnswer();render()" class="btn btn-accent" style="margin-top:1.5rem;width:100%">Check Answer</button>
` : ''}
                        
                        ${q.type === 'ios' ? `<button onclick="submitIOSAnswer(${state.currentQuestionIndex})" class="btn btn-accent" style="margin-top:1rem;width:100%">Submit Answer</button>` : ''}
                        
                        ${state.studyMode && !state.showAnswer && q.correct && (q.correct.length > 1 || q.type === 'ordering') ? `<button onclick="checkStudyAnswer();render()" class="btn btn-accent" style="margin-top:1.5rem;width:100%">Check Answer</button>` : ''}
                        
                        ${state.studyMode && state.showAnswer && q.explanation ? `
                            <div class="explanation-box" style="margin-top:1.5rem">
                                <p class="font-semibold" style="margin-bottom:0.25rem">💡 Explanation</p>
                                <p>${escapeHtml(q.explanation)}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <footer class="quiz-footer">
                <div class="container">
                    <div class="flex justify-between items-center gap-md">
                        <button onclick="prevQuestion()" class="btn btn-ghost btn-sm" ${state.currentQuestionIndex === 0 ? 'disabled' : ''}>
                            ← Prev
                        </button>
                        
                        <!-- Mobile: Show current question and total -->
                        <div class="show-mobile" style="text-align:center">
                            <div style="font-size:0.875rem;font-weight:600;color:var(--text-primary)">
                                ${state.currentQuestionIndex + 1} / ${state.currentQuiz.questions.length}
                            </div>
                            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">
                                👆 Swipe to navigate
                            </div>
                        </div>
                        
                        <!-- Desktop: Show question dots -->
                        <div class="flex gap-xs hide-mobile">
                            ${Array.from({length: Math.min(state.currentQuiz.questions.length, 10)}, (_, i) => { 
                                const idx = state.currentQuiz.questions.length <= 10 ? i : Math.max(0, Math.min(state.currentQuestionIndex - 4, state.currentQuiz.questions.length - 10)) + i; 
                                const cur = idx === state.currentQuestionIndex;
                                const ans = state.answers[idx] != null;
                                const fl = state.flaggedQuestions.has(idx); 
                                return `<button onclick="state.currentQuestionIndex=${idx};state.showAnswer=false;render()" class="btn btn-icon btn-sm" style="width:32px;height:32px;font-size:0.75rem;background:${cur ? 'var(--accent)' : ans ? 'var(--cream)' : 'transparent'};color:${cur ? 'white' : 'var(--ink)'};border:${fl ? '2px solid var(--accent)' : '1px solid var(--cream)'}">${idx + 1}</button>`; 
                            }).join('')}
                        </div>
                        
                        ${state.currentQuestionIndex === state.currentQuiz.questions.length - 1 ? 
                            `<button onclick="submitQuiz()" class="btn btn-accent btn-sm">Submit</button>` : 
                            `<button onclick="nextQuestion()" class="btn btn-primary btn-sm">Next →</button>`
                        }
                    </div>
                </div>
            </footer>
        </div>
    `;
}

        function saveAndExitQuiz() {
    saveQuizProgress();
    stopTimer();
    showToast('Progress saved!', 'success');
    state.view = 'library';
    state.currentQuiz = null;
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
    loadQuizzes().then(() => {
        // Check for saved creation state first
        const hasCreationState = loadCreationState();
        if (hasCreationState) {
            state.view = 'create';
        } else {
            state.view = 'library';
        }
        
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
} else { 
    render(); 
}