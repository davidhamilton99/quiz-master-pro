/* AI Wizard - Two-step AI-powered quiz creation */
import { getState, setState } from '../state.js';
import { createQuiz, generateQuizAI, uploadMaterial } from '../services/api.js';
import { parseQuizData } from '../utils/parser.js';
import { showToast } from '../utils/toast.js';
import { escapeHtml } from '../utils/dom.js';
import { icon } from '../utils/icons.js';

// Loading messages shown during AI generation
const LOADING_MESSAGES = [
    'Analyzing your study material...',
    'Identifying key concepts...',
    'Creating questions and answer options...',
    'Crafting plausible distractors...',
    'Writing explanations...',
    'Finalizing your quiz...'
];

// Wizard state
let wizardState = {
    step: 1,
    title: '',
    category: '',
    questionTypes: ['choice', 'truefalse'],
    questionCount: 15,
    includeCode: false,
    studyMaterial: '',
    // File upload
    uploadedFileName: null,
    isUploading: false,
    // Step 2: review
    generatedQuestions: [],
    generateError: null,
    isGenerating: false,
    loadingMessageIndex: 0,
    loadingInterval: null,
    // Manual fallback
    manualMode: false,
    pastedContent: '',
    parsedQuestions: [],
    parseError: null
};

export function resetWizard() {
    clearLoadingInterval();
    wizardState = {
        step: 1,
        title: '',
        category: '',
        questionTypes: ['choice', 'truefalse'],
        questionCount: 15,
        includeCode: false,
        studyMaterial: '',
        uploadedFileName: null,
        isUploading: false,
        generatedQuestions: [],
        generateError: null,
        isGenerating: false,
        loadingMessageIndex: 0,
        loadingInterval: null,
        manualMode: false,
        pastedContent: '',
        parsedQuestions: [],
        parseError: null
    };
}

function clearLoadingInterval() {
    if (wizardState.loadingInterval) {
        clearInterval(wizardState.loadingInterval);
        wizardState.loadingInterval = null;
    }
}

export function renderWizard() {
    const s = wizardState;

    // Manual fallback mode renders the old paste-based flow
    if (s.manualMode) {
        return renderManualMode();
    }

    return `
    <div class="wizard-page">
        <header class="wizard-header">
            <button class="btn btn-ghost" onclick="window.app.exitWizard()">
                ${icon('arrowLeft')} Back
            </button>
            <div class="wizard-progress">
                <div class="progress-step ${s.step >= 1 ? 'active' : ''} ${s.step > 1 ? 'completed' : ''}">
                    <div class="step-dot">1</div>
                    <span>Setup</span>
                </div>
                <div class="progress-line ${s.step > 1 ? 'completed' : ''}"></div>
                <div class="progress-step ${s.step >= 2 ? 'active' : ''}">
                    <div class="step-dot">2</div>
                    <span>Review</span>
                </div>
            </div>
            <div style="width: 100px;"></div>
        </header>

        <main class="wizard-main">
            ${s.step === 1 ? renderStep1() : ''}
            ${s.step === 2 ? renderStep2() : ''}
        </main>
    </div>
    `;
}

function renderStep1() {
    const s = wizardState;
    const canGenerate = s.title.trim() && s.questionTypes.length > 0 && s.studyMaterial.trim().length >= 100;
    const materialLength = s.studyMaterial.trim().length;

    return `
    <div class="wizard-card wizard-card-wide">
        <div class="wizard-card-header">
            <h1>Create Your Quiz</h1>
            <p>Paste your study material and we'll generate questions instantly.</p>
        </div>

        <div class="wizard-card-body">
            <div class="form-group">
                <label class="label">Quiz Title</label>
                <input
                    type="text"
                    class="input input-lg"
                    placeholder="e.g., Chapter 5 - Network Security"
                    value="${escapeHtml(s.title)}"
                    oninput="window.app.wizardSetTitle(this.value)"
                    autofocus
                >
                <p class="helper-text">Give your quiz a descriptive name</p>
            </div>

            <div class="form-group">
                <label class="label">Category <span class="optional">(optional)</span></label>
                <input
                    type="text"
                    class="input"
                    placeholder="e.g., Networking, Biology, History"
                    value="${escapeHtml(s.category)}"
                    oninput="window.app.wizardSetCategory(this.value)"
                >
            </div>

            <div class="form-group">
                <label class="label">Study Material</label>

                <div class="upload-drop-zone" id="upload-drop-zone"
                     ondragover="event.preventDefault(); this.classList.add('drag-over')"
                     ondragleave="this.classList.remove('drag-over')"
                     ondrop="event.preventDefault(); this.classList.remove('drag-over'); window.app.wizardUploadFile(event.dataTransfer.files[0])">
                    <input type="file" id="wizard-file-input" style="display:none"
                           accept=".pdf,.docx,.doc,.txt,.md,.csv,.rtf"
                           onchange="if(this.files[0]) window.app.wizardUploadFile(this.files[0])">
                    ${s.isUploading ? `
                        <div class="upload-loading">
                            <div class="ai-generating-spinner" style="width:28px;height:28px;border-width:3px;margin-bottom:0.5rem"></div>
                            <span>Extracting text...</span>
                        </div>
                    ` : s.uploadedFileName ? `
                        <div class="upload-success">
                            <span class="upload-file-badge">${icon('fileText')} ${escapeHtml(s.uploadedFileName)}</span>
                            <button class="btn btn-ghost btn-sm" onclick="window.app.wizardClearUpload()">Remove</button>
                        </div>
                    ` : `
                        <div class="upload-prompt" onclick="document.getElementById('wizard-file-input').click()">
                            ${icon('fileText')}
                            <span><strong>Upload a file</strong> or drag and drop</span>
                            <span class="upload-formats">PDF, DOCX, TXT, MD, CSV (max 10MB)</span>
                        </div>
                    `}
                </div>

                <div class="upload-divider"><span>or paste text directly</span></div>

                <textarea
                    class="textarea textarea-lg"
                    rows="6"
                    placeholder="Paste your notes, textbook content, or study material here..."
                    oninput="window.app.wizardSetStudyMaterial(this.value)"
                    id="wizard-study-textarea"
                >${escapeHtml(s.studyMaterial)}</textarea>
                <p class="helper-text">${materialLength > 0 ? `${materialLength} characters` : 'Minimum 100 characters'}${materialLength > 0 && materialLength < 100 ? ` (need ${100 - materialLength} more)` : ''}</p>
            </div>

            <div class="form-group">
                <label class="label">Question Types</label>
                <p class="helper-text mb-2">Select all types you want the AI to generate</p>
                <div class="checkbox-group">
                    <label class="checkbox-label">
                        <input
                            type="checkbox"
                            ${s.questionTypes.includes('choice') ? 'checked' : ''}
                            onchange="window.app.wizardToggleType('choice')"
                        >
                        <span class="checkbox-text">
                            <span class="checkbox-icon">${icon('circleCheck')}</span>
                            <span>Multiple Choice</span>
                        </span>
                        <span class="checkbox-desc">One correct answer from 4 options</span>
                    </label>
                    <label class="checkbox-label">
                        <input
                            type="checkbox"
                            ${s.questionTypes.includes('multiselect') ? 'checked' : ''}
                            onchange="window.app.wizardToggleType('multiselect')"
                        >
                        <span class="checkbox-text">
                            <span class="checkbox-icon">${icon('check')}</span>
                            <span>Multi-Select</span>
                        </span>
                        <span class="checkbox-desc">Multiple correct answers possible</span>
                    </label>
                    <label class="checkbox-label">
                        <input
                            type="checkbox"
                            ${s.questionTypes.includes('truefalse') ? 'checked' : ''}
                            onchange="window.app.wizardToggleType('truefalse')"
                        >
                        <span class="checkbox-text">
                            <span class="checkbox-icon">${icon('toggleLeft')}</span>
                            <span>True/False</span>
                        </span>
                        <span class="checkbox-desc">Simple binary questions</span>
                    </label>
                    <label class="checkbox-label">
                        <input
                            type="checkbox"
                            ${s.questionTypes.includes('matching') ? 'checked' : ''}
                            onchange="window.app.wizardToggleType('matching')"
                        >
                        <span class="checkbox-text">
                            <span class="checkbox-icon">${icon('link')}</span>
                            <span>Matching</span>
                        </span>
                        <span class="checkbox-desc">Connect terms with definitions</span>
                    </label>
                    <label class="checkbox-label">
                        <input
                            type="checkbox"
                            ${s.questionTypes.includes('ordering') ? 'checked' : ''}
                            onchange="window.app.wizardToggleType('ordering')"
                        >
                        <span class="checkbox-text">
                            <span class="checkbox-icon">${icon('listOrdered')}</span>
                            <span>Ordering</span>
                        </span>
                        <span class="checkbox-desc">Arrange items in correct sequence</span>
                    </label>
                </div>
            </div>

            <div class="form-group">
                <label class="label">Include Code Questions?</label>
                <label class="checkbox-label">
                    <input
                        type="checkbox"
                        ${s.includeCode ? 'checked' : ''}
                        onchange="window.app.wizardToggleCode()"
                    >
                    <span class="checkbox-text">
                        <span class="checkbox-icon">${icon('terminal')}</span>
                        <span>Yes, include code snippets</span>
                    </span>
                    <span class="checkbox-desc">Great for programming, scripting, or technical subjects</span>
                </label>
            </div>

            <div class="form-group">
                <label class="label">Number of Questions</label>
                <div class="number-input-group">
                    <button class="btn btn-ghost" onclick="window.app.wizardAdjustCount(-5)">-5</button>
                    <button class="btn btn-ghost" onclick="window.app.wizardAdjustCount(-1)">-</button>
                    <input type="number" class="question-count-input" value="${s.questionCount}"
                           min="1" max="300" id="question-count-input"
                           onchange="window.app.wizardSetCount(Math.min(300, Math.max(1, parseInt(this.value) || 15)))"
                           onclick="this.select()">
                    <button class="btn btn-ghost" onclick="window.app.wizardAdjustCount(1)">+</button>
                    <button class="btn btn-ghost" onclick="window.app.wizardAdjustCount(5)">+5</button>
                </div>
                <p class="helper-text">1-50 questions per generation</p>
            </div>
        </div>

        <div class="wizard-card-footer">
            <div>
                <button class="btn btn-ghost btn-sm" onclick="window.app.wizardEnterManualMode()" style="opacity: 0.6; font-size: 0.85rem;">
                    Create manually instead
                </button>
            </div>
            <button
                class="btn btn-primary btn-lg"
                onclick="window.app.wizardGenerate()"
                ${!canGenerate ? 'disabled' : ''}
                id="wizard-generate-btn"
            >
                ${icon('sparkles')} Generate Quiz
            </button>
            <p class="wizard-hint" style="${canGenerate ? 'display:none' : ''}" id="wizard-hint">
                ${!s.title.trim() ? 'Enter a quiz title' : s.questionTypes.length === 0 ? 'Select at least one question type' : materialLength < 100 ? 'Add more study material' : ''}
            </p>
        </div>
    </div>
    `;
}

function renderStep2() {
    const s = wizardState;

    // Loading state
    if (s.isGenerating) {
        return renderGenerating();
    }

    // Error state
    if (s.generateError) {
        return `
        <div class="wizard-card wizard-card-wide">
            <div class="wizard-card-header">
                <h1>Generation Failed</h1>
                <p>Something went wrong, but you can try again.</p>
            </div>
            <div class="wizard-card-body">
                <div class="parse-preview error">
                    <div class="preview-header">
                        <span class="preview-icon">${icon('alertTriangle')}</span>
                        <span class="preview-title">Error</span>
                    </div>
                    <p class="preview-message">${escapeHtml(s.generateError)}</p>
                </div>
            </div>
            <div class="wizard-card-footer">
                <button class="btn btn-secondary" onclick="window.app.wizardBack()">
                    &#8592; Back to Setup
                </button>
                <button class="btn btn-primary btn-lg" onclick="window.app.wizardGenerate()">
                    ${icon('sparkles')} Try Again
                </button>
            </div>
        </div>
        `;
    }

    // Review state — show generated questions
    return renderReviewQuestions();
}

function renderGenerating() {
    const msg = LOADING_MESSAGES[wizardState.loadingMessageIndex] || LOADING_MESSAGES[0];

    return `
    <div class="wizard-card wizard-card-wide">
        <div class="wizard-card-header" style="text-align: center;">
            <h1>Generating Your Quiz</h1>
            <p>${wizardState.questionCount} questions from your study material</p>
        </div>
        <div class="wizard-card-body" style="display: flex; flex-direction: column; align-items: center; padding: 3rem 2rem;">
            <div class="ai-generating-spinner"></div>
            <p class="ai-generating-message" id="ai-loading-msg">${escapeHtml(msg)}</p>
            <p class="helper-text" style="margin-top: 1rem;">This usually takes 5-15 seconds</p>
        </div>
    </div>
    `;
}

function renderReviewQuestions() {
    const s = wizardState;
    const questions = s.generatedQuestions;

    return `
    <div class="wizard-card wizard-card-wide">
        <div class="wizard-card-header">
            <h1>Review Your Questions</h1>
            <p>Generated ${questions.length}${questions.length < s.questionCount ? ` of ${s.questionCount} requested` : ''} questions. Review and save to your library.</p>
        </div>

        <div class="wizard-card-body">
            <div class="parse-preview success" style="margin-bottom: 1.5rem;">
                <div class="preview-header">
                    <span class="preview-icon">${icon('circleCheck')}</span>
                    <span class="preview-title">${questions.length} questions ready</span>
                </div>
                <div class="preview-breakdown">
                    ${getQuestionBreakdown(questions)}
                </div>
            </div>

            <div class="wizard-review-list">
                ${questions.map((q, i) => renderQuestionPreview(q, i)).join('')}
            </div>
        </div>

        <div class="wizard-card-footer">
            <button class="btn btn-secondary" onclick="window.app.wizardBack()">
                &#8592; Back to Setup
            </button>
            <div style="display: flex; gap: 0.75rem;">
                <button class="btn btn-secondary" onclick="window.app.wizardGenerate()">
                    ${icon('sparkles')} Regenerate
                </button>
                <button
                    class="btn btn-primary btn-lg"
                    onclick="window.app.wizardFinish()"
                    ${questions.length === 0 ? 'disabled' : ''}
                >
                    Save to Library (${questions.length})
                </button>
            </div>
        </div>
    </div>
    `;
}

function renderQuestionPreview(q, index) {
    const typeLabels = {
        choice: 'Multiple Choice',
        truefalse: 'True/False',
        matching: 'Matching',
        ordering: 'Ordering'
    };
    const typeLabel = typeLabels[q.type] || 'Multiple Choice';

    let optionsHtml = '';

    if (q.type === 'matching' && q.pairs) {
        optionsHtml = q.pairs.map((p, j) =>
            `<div class="review-option review-pair">
                <span class="pair-left">${escapeHtml(p.left)}</span>
                <span class="pair-arrow">&#8594;</span>
                <span class="pair-right">${escapeHtml(p.right)}</span>
            </div>`
        ).join('');
    } else if (q.type === 'ordering' && q.options) {
        optionsHtml = q.options.map((opt, j) =>
            `<div class="review-option review-order">
                <span class="order-num">${j + 1}.</span>
                <span>${escapeHtml(opt)}</span>
            </div>`
        ).join('');
    } else if (q.options) {
        optionsHtml = q.options.map((opt, j) => {
            const isCorrect = q.correct && q.correct.includes(j);
            return `<div class="review-option ${isCorrect ? 'review-correct' : ''}">
                <span class="option-letter">${String.fromCharCode(65 + j)}</span>
                <span>${escapeHtml(opt)}</span>
                ${isCorrect ? `<span class="correct-badge">${icon('circleCheck')}</span>` : ''}
            </div>`;
        }).join('');
    }

    return `
    <div class="review-question-card">
        <div class="review-question-header">
            <span class="review-question-num">Q${index + 1}</span>
            <span class="review-type-badge">${typeLabel}</span>
            <button class="btn btn-ghost btn-sm review-delete-btn" onclick="window.app.wizardRemoveQuestion(${index})" title="Remove question">
                ${icon('trash2')}
            </button>
        </div>
        <p class="review-question-text">${escapeHtml(q.question)}</p>
        ${q.code ? `<pre class="review-code-block"><code>${escapeHtml(q.code)}</code></pre>` : ''}
        <div class="review-options">
            ${optionsHtml}
        </div>
        ${q.explanation ? `
        <details class="review-explanation">
            <summary>Explanation</summary>
            <p>${escapeHtml(q.explanation)}</p>
        </details>
        ` : ''}
    </div>
    `;
}

// === Manual fallback mode ===

function renderManualMode() {
    const s = wizardState;

    return `
    <div class="wizard-page">
        <header class="wizard-header">
            <button class="btn btn-ghost" onclick="window.app.wizardExitManualMode()">
                ${icon('arrowLeft')} Back to AI Wizard
            </button>
            <div class="wizard-progress">
                <div class="progress-step active">
                    <div class="step-dot">1</div>
                    <span>Paste Questions</span>
                </div>
            </div>
            <div style="width: 100px;"></div>
        </header>

        <main class="wizard-main">
            <div class="wizard-card wizard-card-wide">
                <div class="wizard-card-header">
                    <h1>Create Quiz Manually</h1>
                    <p>Paste questions from any AI tool or write them yourself.</p>
                </div>

                <div class="wizard-card-body">
                    <div class="form-group">
                        <label class="label">Quiz Title</label>
                        <input
                            type="text"
                            class="input input-lg"
                            placeholder="e.g., Chapter 5 - Network Security"
                            value="${escapeHtml(s.title)}"
                            oninput="window.app.wizardSetTitle(this.value)"
                        >
                    </div>

                    <div class="form-group">
                        <label class="label">Questions</label>
                        <textarea
                            class="textarea textarea-lg"
                            rows="12"
                            placeholder="Paste your questions here...

Example format:
1. What is the capital of France?
A. London
B. Paris *
C. Berlin
D. Madrid

2. [tf] The Earth is flat.
False"
                            onchange="window.app.wizardSetContent(this.value)"
                            oninput="window.app.wizardPreviewContent(this.value)"
                        >${escapeHtml(s.pastedContent)}</textarea>
                    </div>

                    ${s.parsedQuestions.length > 0 ? `
                    <div class="parse-preview success">
                        <div class="preview-header">
                            <span class="preview-icon">${icon('circleCheck')}</span>
                            <span class="preview-title">Found ${s.parsedQuestions.length} questions!</span>
                        </div>
                        <div class="preview-breakdown">
                            ${getQuestionBreakdown(s.parsedQuestions)}
                        </div>
                    </div>
                    ` : ''}

                    ${s.parseError ? `
                    <div class="parse-preview error">
                        <div class="preview-header">
                            <span class="preview-icon">${icon('alertTriangle')}</span>
                            <span class="preview-title">Couldn't parse questions</span>
                        </div>
                        <p class="preview-message">${escapeHtml(s.parseError)}</p>
                        <p class="preview-help">Make sure the format uses numbered questions and lettered options.</p>
                    </div>
                    ` : ''}

                    ${!s.pastedContent && !s.parseError ? `
                    <div class="parse-preview waiting">
                        <div class="preview-header">
                            <span class="preview-icon">${icon('fileText')}</span>
                            <span class="preview-title">Waiting for questions...</span>
                        </div>
                        <p class="preview-message">Paste your questions above</p>
                    </div>
                    ` : ''}
                </div>

                <div class="wizard-card-footer">
                    <div></div>
                    <button
                        class="btn btn-primary btn-lg"
                        onclick="window.app.wizardFinishManual()"
                        ${s.parsedQuestions.length === 0 || !s.title.trim() ? 'disabled' : ''}
                    >
                        ${icon('sparkles')} Create Quiz
                    </button>
                </div>
            </div>
        </main>
    </div>
    `;
}

// === Helper functions ===

function getQuestionBreakdown(questions) {
    const counts = { choice: 0, truefalse: 0, matching: 0, ordering: 0 };

    questions.forEach(q => {
        const t = q.type || 'choice';
        if (t in counts) counts[t]++;
        else counts.choice++;
    });

    // Count multi-select (choice type with multiple correct answers)
    let multiCount = 0;
    questions.forEach(q => {
        if ((q.type === 'choice' || !q.type) && q.correct && q.correct.length > 1) {
            multiCount++;
            counts.choice--;
        }
    });

    const parts = [];
    if (counts.choice) parts.push(`${counts.choice} Multiple Choice`);
    if (multiCount) parts.push(`${multiCount} Multi-Select`);
    if (counts.truefalse) parts.push(`${counts.truefalse} True/False`);
    if (counts.matching) parts.push(`${counts.matching} Matching`);
    if (counts.ordering) parts.push(`${counts.ordering} Ordering`);

    return parts.join(' &bull; ');
}

function getRandomColor() {
    const colors = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#0891b2', '#7c3aed', '#c2410c', '#0d9488', '#4f46e5', '#059669'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// === Exported wizard actions ===

export function wizardSetTitle(title) {
    wizardState.title = title;
    updateGenerateButtonState();
}

export function wizardSetCategory(category) {
    wizardState.category = category;
}

export function wizardSetStudyMaterial(text) {
    wizardState.studyMaterial = text;
    updateGenerateButtonState();
}

function updateGenerateButtonState() {
    const btn = document.getElementById('wizard-generate-btn');
    const hint = document.getElementById('wizard-hint');
    if (!btn) return;

    const s = wizardState;
    const canGenerate = s.title.trim() && s.questionTypes.length > 0 && s.studyMaterial.trim().length >= 100;
    btn.disabled = !canGenerate;

    if (hint) {
        if (!s.title.trim()) {
            hint.textContent = 'Enter a quiz title';
            hint.style.display = 'block';
        } else if (s.questionTypes.length === 0) {
            hint.textContent = 'Select at least one question type';
            hint.style.display = 'block';
        } else if (s.studyMaterial.trim().length < 100) {
            const remaining = 100 - s.studyMaterial.trim().length;
            hint.textContent = `Add more study material (${remaining} more characters needed)`;
            hint.style.display = 'block';
        } else {
            hint.style.display = 'none';
        }
    }
}

export async function wizardUploadFile(file) {
    if (!file) return;

    wizardState.isUploading = true;
    wizardState.uploadedFileName = null;
    setState({ view: 'wizard' });

    try {
        const result = await uploadMaterial(file);
        wizardState.isUploading = false;
        wizardState.uploadedFileName = result.filename || file.name;

        // Append extracted text to existing material (or replace if empty)
        if (wizardState.studyMaterial.trim()) {
            wizardState.studyMaterial += '\n\n' + result.text;
        } else {
            wizardState.studyMaterial = result.text;
        }

        if (result.truncated) {
            showToast('File was large — text was truncated to fit.', 'warning');
        } else {
            showToast(`Extracted ${result.char_count.toLocaleString()} characters from ${result.filename}`, 'success');
        }

        setState({ view: 'wizard' });
    } catch (err) {
        wizardState.isUploading = false;
        wizardState.uploadedFileName = null;
        showToast(err.message || 'Failed to process file', 'error');
        setState({ view: 'wizard' });
    }
}

export function wizardClearUpload() {
    wizardState.uploadedFileName = null;
    // Don't clear study material — user may want to keep it
    setState({ view: 'wizard' });
}

export function wizardToggleType(type) {
    const types = wizardState.questionTypes;
    if (types.includes(type)) {
        if (types.length > 1) {
            wizardState.questionTypes = types.filter(t => t !== type);
        }
    } else {
        wizardState.questionTypes = [...types, type];
    }
    setState({ view: 'wizard' });
}

export function wizardToggleCode() {
    wizardState.includeCode = !wizardState.includeCode;
    setState({ view: 'wizard' });
}

export function wizardSetCount(count) {
    wizardState.questionCount = count;
    const input = document.getElementById('question-count-input');
    if (input) input.value = count;
}

export function wizardAdjustCount(delta) {
    const newCount = Math.min(300, Math.max(1, wizardState.questionCount + delta));
    wizardState.questionCount = newCount;
    const input = document.getElementById('question-count-input');
    if (input) input.value = newCount;
}

export function wizardBack() {
    if (wizardState.step > 1) {
        wizardState.step = 1;
        wizardState.generateError = null;
        wizardState.isGenerating = false;
        clearLoadingInterval();
        setState({ view: 'wizard' });
    }
}

export async function wizardGenerate() {
    const s = wizardState;

    // Move to step 2 and show loading
    s.step = 2;
    s.isGenerating = true;
    s.generateError = null;
    s.generatedQuestions = [];
    s.loadingMessageIndex = 0;
    setState({ view: 'wizard' });

    // Start cycling loading messages
    clearLoadingInterval();
    wizardState.loadingInterval = setInterval(() => {
        wizardState.loadingMessageIndex = (wizardState.loadingMessageIndex + 1) % LOADING_MESSAGES.length;
        const msgEl = document.getElementById('ai-loading-msg');
        if (msgEl) {
            msgEl.textContent = LOADING_MESSAGES[wizardState.loadingMessageIndex];
        }
    }, 2500);

    try {
        const result = await generateQuizAI({
            study_material: s.studyMaterial,
            question_count: s.questionCount,
            question_types: s.questionTypes,
            category: s.category,
            include_code: s.includeCode
        });

        clearLoadingInterval();
        wizardState.isGenerating = false;
        wizardState.generatedQuestions = result.questions || [];

        if (result.warnings && result.warnings.length > 0) {
            console.warn('[AI Wizard] Generation warnings:', result.warnings);
        }
        if (result.truncated) {
            showToast('Some questions may be missing due to response length limits.', 'warning');
        }

        setState({ view: 'wizard' });

    } catch (err) {
        clearLoadingInterval();
        wizardState.isGenerating = false;
        wizardState.generateError = err.message || 'An unexpected error occurred.';

        if (err.status === 429 && err.retryAfter) {
            const minutes = Math.ceil(err.retryAfter / 60);
            wizardState.generateError = `Rate limit reached. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
        }

        setState({ view: 'wizard' });
    }
}

export function wizardRemoveQuestion(index) {
    wizardState.generatedQuestions.splice(index, 1);
    setState({ view: 'wizard' });
}

export async function wizardFinish() {
    const questions = wizardState.generatedQuestions;
    if (questions.length === 0) {
        showToast('No questions to save!', 'error');
        return;
    }

    try {
        const quizData = {
            title: wizardState.title || 'Untitled Quiz',
            description: wizardState.category,
            questions: questions,
            color: getRandomColor()
        };

        await createQuiz(quizData);
        showToast(`Quiz created with ${questions.length} questions!`, 'success');
        resetWizard();
        setState({ view: 'library' });
    } catch (e) {
        showToast('Failed to save quiz: ' + e.message, 'error');
    }
}

// === Manual mode actions ===

export function wizardEnterManualMode() {
    wizardState.manualMode = true;
    setState({ view: 'wizard' });
}

export function wizardExitManualMode() {
    wizardState.manualMode = false;
    wizardState.pastedContent = '';
    wizardState.parsedQuestions = [];
    wizardState.parseError = null;
    setState({ view: 'wizard' });
}

export function wizardSetContent(content) {
    wizardState.pastedContent = content;
    wizardPreviewContent(content);
}

export function wizardPreviewContent(content) {
    wizardState.pastedContent = content;

    if (!content.trim()) {
        wizardState.parsedQuestions = [];
        wizardState.parseError = null;
        setState({ view: 'wizard' });
        return;
    }

    try {
        const questions = parseQuizData(content);
        if (questions && questions.length > 0) {
            wizardState.parsedQuestions = questions;
            wizardState.parseError = null;
        } else {
            wizardState.parsedQuestions = [];
            wizardState.parseError = 'No valid questions found. Check the format.';
        }
    } catch (e) {
        wizardState.parsedQuestions = [];
        wizardState.parseError = e.message || 'Failed to parse questions.';
    }

    setState({ view: 'wizard' });
}

export async function wizardFinishManual() {
    const s = wizardState;

    if (s.parsedQuestions.length === 0) {
        showToast('No questions to save!', 'error');
        return;
    }

    try {
        const quizData = {
            title: s.title || 'Untitled Quiz',
            description: s.category,
            questions: s.parsedQuestions,
            color: getRandomColor()
        };

        await createQuiz(quizData);
        showToast(`Quiz created with ${s.parsedQuestions.length} questions!`, 'success');
        resetWizard();
        setState({ view: 'library' });
    } catch (e) {
        showToast('Failed to save quiz: ' + e.message, 'error');
    }
}

export function exitWizard() {
    resetWizard();
    setState({ view: 'mission-control' });
}
