/* AI Wizard - Step-by-step guided quiz creation */
import { getState, setState } from '../state.js';
import { createQuiz } from '../services/api.js';
import { parseQuizData } from '../utils/parser.js';
import { showToast } from '../utils/toast.js';
import { escapeHtml } from '../utils/dom.js';

// Wizard state
let wizardState = {
    step: 1,
    title: '',
    category: '',
    questionTypes: ['choice', 'truefalse'],
    questionCount: 15,
    difficulty: 'medium',
    includeCode: false,
    pastedContent: '',
    parsedQuestions: [],
    parseError: null
};

export function resetWizard() {
    wizardState = {
        step: 1,
        title: '',
        category: '',
        questionTypes: ['choice', 'truefalse'],
        questionCount: 15,
        difficulty: 'medium',
        includeCode: false,
        pastedContent: '',
        parsedQuestions: [],
        parseError: null
    };
}

export function renderWizard() {
    const s = wizardState;
    
    return `
    <div class="wizard-page">
        <header class="wizard-header">
            <button class="btn btn-ghost" onclick="window.app.exitWizard()">
                ← Back to Library
            </button>
            <div class="wizard-progress">
                <div class="progress-step ${s.step >= 1 ? 'active' : ''} ${s.step > 1 ? 'completed' : ''}">
                    <div class="step-dot">1</div>
                    <span>Setup</span>
                </div>
                <div class="progress-line ${s.step > 1 ? 'completed' : ''}"></div>
                <div class="progress-step ${s.step >= 2 ? 'active' : ''} ${s.step > 2 ? 'completed' : ''}">
                    <div class="step-dot">2</div>
                    <span>AI Prompt</span>
                </div>
                <div class="progress-line ${s.step > 2 ? 'completed' : ''}"></div>
                <div class="progress-step ${s.step >= 3 ? 'active' : ''}">
                    <div class="step-dot">3</div>
                    <span>Create</span>
                </div>
            </div>
            <div style="width: 100px;"></div>
        </header>
        
        <main class="wizard-main">
            ${s.step === 1 ? renderStep1() : ''}
            ${s.step === 2 ? renderStep2() : ''}
            ${s.step === 3 ? renderStep3() : ''}
        </main>
    </div>
    `;
}

function renderStep1() {
    const s = wizardState;
    
    return `
    <div class="wizard-card wizard-card-wide">
        <div class="wizard-card-header">
            <h1>Let's Create Your Quiz</h1>
            <p>First, tell us about what you're studying.</p>
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
                            <span class="checkbox-icon">✓</span>
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
                            <span class="checkbox-icon">☑️</span>
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
                            <span class="checkbox-icon">⚡</span>
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
                            <span class="checkbox-icon">🔗</span>
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
                            <span class="checkbox-icon">↕️</span>
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
                        <span class="checkbox-icon">💻</span>
                        <span>Yes, include code snippets</span>
                    </span>
                    <span class="checkbox-desc">Great for programming, scripting, or technical subjects</span>
                </label>
            </div>
            
            <div class="form-group">
                <label class="label">Number of Questions</label>
                <div class="number-input-group">
                    <button class="btn btn-ghost" onclick="window.app.wizardAdjustCount(-10)">−10</button>
                    <button class="btn btn-ghost" onclick="window.app.wizardAdjustCount(-1)">−</button>
                    <input type="number" class="question-count-input" value="${s.questionCount}" 
                           min="5" max="2000" id="question-count-input"
                           onchange="window.app.wizardSetCount(Math.min(2000, Math.max(5, parseInt(this.value) || 15)))"
                           onclick="this.select()">
                    <button class="btn btn-ghost" onclick="window.app.wizardAdjustCount(1)">+</button>
                    <button class="btn btn-ghost" onclick="window.app.wizardAdjustCount(10)">+10</button>
                </div>
                <p class="helper-text">Type a number or use buttons (5-2000)</p>
            </div>
        </div>
        
        <div class="wizard-card-footer">
            <div></div>
            <button 
                class="btn btn-primary btn-lg" 
                onclick="window.app.wizardNext()"
                ${!s.title.trim() || s.questionTypes.length === 0 ? 'disabled' : ''}
            >
                Next: Get Your AI Prompt →
            </button>
            <p class="wizard-hint" style="${s.title.trim() && s.questionTypes.length > 0 ? 'display:none' : ''}">
                ${!s.title.trim() ? 'Enter a quiz title to continue' : 'Select at least one question type'}
            </p>
        </div>
    </div>
    `;
}

function renderStep2() {
    const s = wizardState;
    const prompt = generatePrompt();
    
    return `
    <div class="wizard-card wizard-card-wide">
        <div class="wizard-card-header">
            <h1>Copy This Prompt to Your AI</h1>
            <p>Use ChatGPT, Claude, or any AI assistant to generate your questions.</p>
        </div>
        
        <div class="wizard-card-body">
            <div class="prompt-section">
                <div class="prompt-header">
                    <span class="prompt-label">📋 Your AI Prompt</span>
                    <button class="btn btn-sm btn-primary" onclick="window.app.wizardCopyPrompt()">
                        Copy Prompt
                    </button>
                </div>
                <div class="prompt-box" id="ai-prompt">
                    <pre>${escapeHtml(prompt)}</pre>
                </div>
            </div>
            
            <div class="instructions-section">
                <h3>📝 Instructions</h3>
                <ol class="instruction-list">
                    <li>
                        <strong>Copy the prompt above</strong>
                        <span>Click "Copy Prompt" or select all and copy</span>
                    </li>
                    <li>
                        <strong>Open your AI assistant</strong>
                        <span>ChatGPT, Claude, Gemini, or any other AI</span>
                    </li>
                    <li>
                        <strong>Paste the prompt</strong>
                        <span>Then add your study material below it</span>
                    </li>
                    <li>
                        <strong>Send and wait</strong>
                        <span>The AI will generate formatted questions</span>
                    </li>
                    <li>
                        <strong>Copy the AI's response</strong>
                        <span>Select all the questions it created</span>
                    </li>
                </ol>
            </div>
            
            <div class="ai-tip">
                <span class="tip-icon">💡</span>
                <div class="tip-content">
                    <strong>Pro Tip:</strong> The more detailed your study material, the better the questions! 
                    Include definitions, key concepts, and important facts.
                </div>
            </div>
        </div>
        
        <div class="wizard-card-footer">
            <button class="btn btn-secondary" onclick="window.app.wizardBack()">
                ← Back
            </button>
            <button class="btn btn-primary btn-lg" onclick="window.app.wizardNext()">
                I Have My Questions →
            </button>
        </div>
    </div>
    `;
}

function renderStep3() {
    const s = wizardState;
    
    return `
    <div class="wizard-card wizard-card-wide">
        <div class="wizard-card-header">
            <h1>Paste Your Questions</h1>
            <p>Paste the AI's response below and we'll create your quiz.</p>
        </div>
        
        <div class="wizard-card-body">
            <div class="form-group">
                <label class="label">AI-Generated Questions</label>
                <textarea 
                    class="textarea textarea-lg" 
                    rows="12"
                    placeholder="Paste the questions from ChatGPT/Claude here...

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
                    <span class="preview-icon">✅</span>
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
                    <span class="preview-icon">⚠️</span>
                    <span class="preview-title">Couldn't parse questions</span>
                </div>
                <p class="preview-message">${escapeHtml(s.parseError)}</p>
                <p class="preview-help">Make sure the AI used the correct format with numbered questions and lettered options.</p>
            </div>
            ` : ''}
            
            ${!s.pastedContent && !s.parseError ? `
            <div class="parse-preview waiting">
                <div class="preview-header">
                    <span class="preview-icon">📋</span>
                    <span class="preview-title">Waiting for questions...</span>
                </div>
                <p class="preview-message">Paste the AI's response above</p>
            </div>
            ` : ''}
        </div>
        
        <div class="wizard-card-footer">
            <button class="btn btn-secondary" onclick="window.app.wizardBack()">
                ← Back
            </button>
            <button 
                class="btn btn-primary btn-lg" 
                onclick="window.app.wizardFinish()"
                ${s.parsedQuestions.length === 0 ? 'disabled' : ''}
            >
                🎉 Create Quiz
            </button>
        </div>
    </div>
    `;
}

function generatePrompt() {
    const s = wizardState;
    
    const typeInstructions = [];
    
    if (s.questionTypes.includes('choice')) {
        typeInstructions.push(`MULTIPLE CHOICE - Format:
1. Question text here?
A. Wrong answer
B. Correct answer *
C. Wrong answer
D. Wrong answer
[explanation: Explain why B is correct and why other options are wrong]`);
    }
    
    if (s.questionTypes.includes('multiselect')) {
        typeInstructions.push(`MULTI-SELECT (multiple correct answers) - Format:
2. [multi] Which of the following are true? (Select all that apply)
A. Correct answer *
B. Wrong answer
C. Correct answer *
D. Wrong answer
[explanation: Explain why A and C are correct]`);
    }
    
    if (s.questionTypes.includes('truefalse')) {
        typeInstructions.push(`TRUE/FALSE - Format:
3. [tf] Statement that is true or false.
True
[explanation: Explain why this is true]

4. [tf] Another statement.
False
[explanation: Explain why this is false and what the correct fact is]`);
    }
    
    if (s.questionTypes.includes('matching')) {
        typeInstructions.push(`MATCHING - Format:
5. [match] Match the terms with their definitions:
A. Term 1 => Definition 1
B. Term 2 => Definition 2
C. Term 3 => Definition 3
D. Term 4 => Definition 4
[explanation: Brief explanation of these relationships]`);
    }
    
    if (s.questionTypes.includes('ordering')) {
        typeInstructions.push(`ORDERING (put in correct sequence) - Format:
6. [order] Arrange these steps in the correct order:
1) First step (this is the correct position)
2) Second step
3) Third step
4) Fourth step
[explanation: Explain why this order is correct]`);
    }
    
    // Code question example if relevant
    const codeExample = s.includeCode ? `
CODE-BASED QUESTION EXAMPLE:
7. What does this code output?
[code:python]
x = [1, 2, 3]
print(x[1])
[/code]
A. 1
B. 2 *
C. 3
D. Error
[explanation: Python lists are zero-indexed, so x[1] returns the second element, which is 2]` : '';
    
    return `Create ${s.questionCount} quiz questions from the study material I'll provide below.

CRITICAL FORMAT RULES:
- Number each question (1, 2, 3, etc.)
- Mark correct answers with * at the end of the line
- ALWAYS include [explanation: ...] after each question explaining the answer
- For multi-select questions with multiple correct answers, mark ALL correct options with *

QUESTION TYPE FORMATS:

${typeInstructions.join('\n\n')}
${codeExample}

OPTIONAL ENHANCEMENTS (use when relevant):
- Add images: [image: https://url.com/diagram.png | Description]
- Add code blocks: [code:language]code here[/code]
  Supported languages: python, javascript, powershell, bash, sql, java, csharp, html, css, json, yaml

QUALITY GUIDELINES:
- Write clear, unambiguous questions
- Make wrong answers plausible (avoid obvious distractors)
- Explanations should teach, not just state the answer
- Cover different difficulty levels
- Test understanding, not just memorization
- For code questions, include realistic snippets

Here is my study material:
---
[PASTE YOUR NOTES/TEXTBOOK CONTENT HERE]
---`;
}

function getQuestionBreakdown(questions) {
    const counts = {
        choice: 0,
        truefalse: 0,
        matching: 0,
        ordering: 0,
        multiselect: 0
    };
    
    questions.forEach(q => {
        if (counts.hasOwnProperty(q.type)) {
            counts[q.type]++;
        } else {
            counts.choice++;
        }
    });
    
    const parts = [];
    if (counts.choice) parts.push(`${counts.choice} Multiple Choice`);
    if (counts.truefalse) parts.push(`${counts.truefalse} True/False`);
    if (counts.matching) parts.push(`${counts.matching} Matching`);
    if (counts.ordering) parts.push(`${counts.ordering} Ordering`);
    if (counts.multiselect) parts.push(`${counts.multiselect} Multi-Select`);
    
    return parts.join(' • ');
}

// Wizard actions
export function wizardSetTitle(title) {
    wizardState.title = title;
    updateNextButtonState();
}

export function wizardSetCategory(category) {
    wizardState.category = category;
}

function updateNextButtonState() {
    // Update button state without full re-render
    const btn = document.querySelector('.wizard-card-footer .btn-primary');
    const hint = document.querySelector('.wizard-hint');
    
    if (btn) {
        const isValid = wizardState.title.trim() && wizardState.questionTypes.length > 0;
        btn.disabled = !isValid;
        
        if (hint) {
            if (!wizardState.title.trim()) {
                hint.textContent = 'Enter a quiz title to continue';
                hint.style.display = 'block';
            } else if (wizardState.questionTypes.length === 0) {
                hint.textContent = 'Select at least one question type';
                hint.style.display = 'block';
            } else {
                hint.style.display = 'none';
            }
        }
    }
}

export function wizardToggleType(type) {
    const types = wizardState.questionTypes;
    if (types.includes(type)) {
        // Don't allow removing all types
        if (types.length > 1) {
            wizardState.questionTypes = types.filter(t => t !== type);
        }
    } else {
        wizardState.questionTypes = [...types, type];
    }
    setState({ view: 'wizard' }); // Re-render
}

export function wizardToggleCode() {
    wizardState.includeCode = !wizardState.includeCode;
    setState({ view: 'wizard' }); // Re-render
}

export function wizardSetCount(count) {
    wizardState.questionCount = count;
    // Update just the input, not full re-render
    const input = document.getElementById('question-count-input');
    if (input) input.value = count;
}

export function wizardAdjustCount(delta) {
    const newCount = Math.min(2000, Math.max(5, wizardState.questionCount + delta));
    wizardState.questionCount = newCount;
    const input = document.getElementById('question-count-input');
    if (input) input.value = newCount;
}

export function wizardNext() {
    if (wizardState.step < 3) {
        wizardState.step++;
        setState({ view: 'wizard' }); // Re-render
    }
}

export function wizardBack() {
    if (wizardState.step > 1) {
        wizardState.step--;
        setState({ view: 'wizard' }); // Re-render
    }
}

export function wizardCopyPrompt() {
    const prompt = generatePrompt();
    navigator.clipboard.writeText(prompt).then(() => {
        showToast('Prompt copied! Now paste it into ChatGPT or Claude.', 'success');
    }).catch(() => {
        showToast('Failed to copy. Please select and copy manually.', 'error');
    });
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

export async function wizardFinish() {
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
        showToast(`Quiz created with ${s.parsedQuestions.length} questions! 🎉`, 'success');
        resetWizard();
        setState({ view: 'library' });
    } catch (e) {
        showToast('Failed to save quiz: ' + e.message, 'error');
    }
}

export function exitWizard() {
    resetWizard();
    setState({ view: 'library' });
}

function getRandomColor() {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];
    return colors[Math.floor(Math.random() * colors.length)];
}