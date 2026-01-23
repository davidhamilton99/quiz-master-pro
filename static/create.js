/* ============================================
   QUIZ MASTER PRO - Create/Edit View
   Quiz creation with text and visual editor
   ============================================ */

import { getState, setState } from '../state.js';
import { getQuiz, createQuiz, updateQuiz } from '../services/api.js';
import { escapeHtml, getRandomColor, showLoading, hideLoading } from '../utils/dom.js';
import { parseQuizData, questionsToText } from '../utils/parser.js';
import { showToast } from '../utils/toast.js';

export function renderCreate() {
    const state = getState();
    
    if (state.visualEditorMode) {
        return renderVisualEditor();
    }
    
    return `
        <div class="create-page">
            <header class="create-header">
                <div class="create-header-inner">
                    <button class="btn btn-ghost" onclick="window.app.navigate('library')">
                        ← Cancel
                    </button>
                    <h2>${state.editingQuizId ? 'Edit Quiz' : 'Create Quiz'}</h2>
                    <button class="btn btn-primary" onclick="window.app.saveQuiz()">
                        Save Quiz
                    </button>
                </div>
            </header>
            
            <main class="create-main">
                <div class="form-group">
                    <label class="label">Quiz Title</label>
                    <input 
                        type="text" 
                        id="quiz-title"
                        class="input" 
                        placeholder="e.g., CCNA Chapter 5 Review"
                        value="${escapeHtml(state.quizTitle)}"
                        oninput="window.app.updateQuizTitle(this.value)"
                    >
                </div>
                
                <div class="form-group">
                    <label class="label">Category (optional)</label>
                    <input 
                        type="text" 
                        id="quiz-category"
                        class="input" 
                        placeholder="e.g., Networking, Python, Security"
                        value="${escapeHtml(state.quizCategory)}"
                        oninput="window.app.updateQuizCategory(this.value)"
                    >
                </div>
                
                <div class="form-group">
                    <div class="flex items-center justify-between mb-2">
                        <label class="label" style="margin-bottom: 0">Questions</label>
                        <button 
                            class="btn btn-sm btn-ghost"
                            onclick="window.app.toggleFormatHelp()"
                        >
                            ${state.showFormatHelp ? 'Hide' : 'Show'} Format Help
                        </button>
                    </div>
                    
                    <textarea 
                        id="quiz-data"
                        class="textarea" 
                        rows="15"
                        placeholder="Enter your questions here..."
                        oninput="window.app.updateQuizData(this.value)"
                    >${escapeHtml(state.quizData)}</textarea>
                </div>
                
                ${state.showFormatHelp ? renderFormatHelp() : ''}
                
                <div class="flex gap-4 mt-6">
                    <button class="btn btn-secondary flex-1" onclick="window.app.openVisualEditor()">
                        🎨 Visual Editor
                    </button>
                    <button class="btn btn-primary flex-1" onclick="window.app.saveQuiz()">
                        💾 Save Quiz
                    </button>
                </div>
            </main>
        </div>
    `;
}

function renderFormatHelp() {
    return `
        <div class="format-help">
            <h4>📝 Question Format</h4>
            <pre>1. What is the capital of France?
A. London
B. Paris *
C. Berlin
D. Madrid

2. [order] Arrange in order:
1) First step
2) Second step
3) Third step

3. What does this code output?
[code]
print("Hello")
[/code]
A. Hello *
B. Error
[explanation: print() outputs text]</pre>
            <p class="text-sm text-muted mt-4">
                • Mark correct answers with * at the end<br>
                • Use [order] for ordering questions<br>
                • Use [code]...[/code] for code blocks<br>
                • Use [explanation: text] for explanations
            </p>
        </div>
    `;
}

function renderVisualEditor() {
    const state = getState();
    const questions = state.parsedQuestions || [];
    const currentQ = questions[state.currentEditQuestion] || {};
    
    return `
        <div class="create-page">
            <header class="create-header">
                <div class="create-header-inner">
                    <button class="btn btn-ghost" onclick="window.app.closeVisualEditor()">
                        ← Back to Text
                    </button>
                    <h2>Visual Editor</h2>
                    <button class="btn btn-primary" onclick="window.app.saveFromVisualEditor()">
                        Save Quiz
                    </button>
                </div>
            </header>
            
            <div class="editor-layout">
                <aside class="editor-sidebar">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-sm font-medium">Questions</span>
                        <button class="btn btn-sm btn-ghost" onclick="window.app.addQuestion()">
                            + Add
                        </button>
                    </div>
                    
                    <div class="editor-question-list">
                        ${questions.map((q, i) => `
                            <div 
                                class="editor-question-item ${i === state.currentEditQuestion ? 'active' : ''}"
                                onclick="window.app.selectEditQuestion(${i})"
                            >
                                <span class="editor-question-number">${i + 1}</span>
                                <span class="truncate text-sm">${escapeHtml(q.question) || 'Untitled'}</span>
                            </div>
                        `).join('')}
                    </div>
                </aside>
                
                <main class="editor-main">
                    <div class="editor-card card">
                        <div class="card-header">
                            <div>
                                <h3>Question ${state.currentEditQuestion + 1}</h3>
                                <span class="text-sm text-muted">of ${questions.length}</span>
                            </div>
                            ${questions.length > 1 ? `
                                <button class="btn btn-sm btn-ghost text-error" onclick="window.app.deleteQuestion(${state.currentEditQuestion})">
                                    🗑️ Delete
                                </button>
                            ` : ''}
                        </div>
                        
                        <div class="editor-section">
                            <label class="editor-section-label">📝 Question Text</label>
                            <textarea 
                                class="textarea" 
                                rows="3"
                                placeholder="Enter your question..."
                                oninput="window.app.updateQuestion('question', this.value)"
                            >${escapeHtml(currentQ.question || '')}</textarea>
                        </div>
                        
                        <div class="type-tabs">
                            <button 
                                class="type-tab ${currentQ.type === 'choice' ? 'active' : ''}"
                                onclick="window.app.updateQuestion('type', 'choice')"
                            >
                                ✓ Multiple Choice
                            </button>
                            <button 
                                class="type-tab ${currentQ.type === 'ordering' ? 'active' : ''}"
                                onclick="window.app.updateQuestion('type', 'ordering')"
                            >
                                ↕️ Ordering
                            </button>
                        </div>
                        
                        <div class="editor-section">
                            <label class="editor-section-label">
                                ${currentQ.type === 'ordering' ? '↕️ Items (drag to reorder)' : '📋 Answer Options'}
                            </label>
                            
                            ${(currentQ.options || []).map((opt, i) => `
                                <div class="option-editor">
                                    <span class="text-muted font-medium" style="width: 24px">
                                        ${currentQ.type === 'ordering' ? (i + 1) : String.fromCharCode(65 + i)}
                                    </span>
                                    <input 
                                        type="text" 
                                        class="input" 
                                        value="${escapeHtml(opt)}"
                                        placeholder="Option ${i + 1}"
                                        oninput="window.app.updateOption(${i}, this.value)"
                                    >
                                    ${currentQ.type === 'choice' ? `
                                        <button 
                                            class="option-correct-btn ${(currentQ.correct || []).includes(i) ? 'active' : ''}"
                                            onclick="window.app.toggleCorrect(${i})"
                                            title="Mark as correct"
                                        >
                                            ✓
                                        </button>
                                    ` : ''}
                                    ${(currentQ.options || []).length > 2 ? `
                                        <button class="btn btn-icon btn-ghost btn-sm" onclick="window.app.removeOption(${i})">
                                            ✕
                                        </button>
                                    ` : ''}
                                </div>
                            `).join('')}
                            
                            <button class="btn btn-sm btn-ghost mt-2" onclick="window.app.addOption()">
                                + Add Option
                            </button>
                        </div>
                        
                        <div class="editor-section">
                            <label class="editor-section-label">💡 Explanation (optional)</label>
                            <textarea 
                                class="textarea" 
                                rows="2"
                                placeholder="Explain why this is the correct answer..."
                                oninput="window.app.updateQuestion('explanation', this.value)"
                            >${escapeHtml(currentQ.explanation || '')}</textarea>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    `;
}

// ========== HANDLERS ==========

export function updateQuizTitle(value) {
    setState({ quizTitle: value });
}

export function updateQuizCategory(value) {
    setState({ quizCategory: value });
}

export function updateQuizData(value) {
    setState({ quizData: value });
}

export function toggleFormatHelp() {
    const state = getState();
    setState({ showFormatHelp: !state.showFormatHelp });
}

export async function saveQuiz() {
    const state = getState();
    
    if (!state.quizTitle.trim()) {
        showToast('Please enter a title', 'warning');
        return;
    }
    
    if (!state.quizData.trim()) {
        showToast('Please add some questions', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        const questions = parseQuizData(state.quizData);
        
        if (questions.length === 0) {
            hideLoading();
            showToast('No valid questions found', 'warning');
            return;
        }
        
        // Validate questions
        const invalid = questions.filter(q => 
            (q.type === 'choice' && q.correct.length === 0) ||
            q.options.length < 2
        );
        
        if (invalid.length > 0) {
            hideLoading();
            showToast('Some questions are missing correct answers', 'error');
            return;
        }
        
        const payload = {
            title: state.quizTitle,
            questions,
            description: state.quizCategory || '',
            color: getRandomColor()
        };
        
        if (state.editingQuizId) {
            await updateQuiz(state.editingQuizId, payload);
        } else {
            await createQuiz(payload);
        }
        
        // Reset and navigate
        setState({
            view: 'library',
            quizTitle: '',
            quizData: '',
            quizCategory: '',
            editingQuizId: null,
            visualEditorMode: false,
            parsedQuestions: null
        });
        
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast(error.message || 'Failed to save quiz', 'error');
    }
}

export async function editQuiz(id) {
    showLoading();
    
    try {
        const quiz = await getQuiz(id);
        const text = questionsToText(quiz.questions);
        
        setState({
            view: 'create',
            quizTitle: quiz.title,
            quizData: text,
            quizCategory: quiz.description || '',
            editingQuizId: id,
            visualEditorMode: false
        });
        
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast('Failed to load quiz', 'error');
    }
}

// ========== VISUAL EDITOR ==========

export function openVisualEditor() {
    const state = getState();
    
    if (!state.quizTitle.trim()) {
        showToast('Enter a title first', 'warning');
        return;
    }
    
    let questions = [];
    
    if (state.quizData.trim()) {
        questions = parseQuizData(state.quizData);
    }
    
    if (questions.length === 0) {
        questions = [{
            question: '',
            type: 'choice',
            options: ['', ''],
            correct: [],
            explanation: null
        }];
    }
    
    setState({
        visualEditorMode: true,
        parsedQuestions: questions,
        currentEditQuestion: 0
    });
}

export function closeVisualEditor() {
    const state = getState();
    
    // Convert back to text
    if (state.parsedQuestions) {
        const text = questionsToText(state.parsedQuestions);
        setState({ quizData: text });
    }
    
    setState({ visualEditorMode: false });
}

export function selectEditQuestion(index) {
    setState({ currentEditQuestion: index });
}

export function addQuestion() {
    const state = getState();
    const questions = [...(state.parsedQuestions || [])];
    
    questions.push({
        question: '',
        type: 'choice',
        options: ['', ''],
        correct: [],
        explanation: null
    });
    
    setState({
        parsedQuestions: questions,
        currentEditQuestion: questions.length - 1
    });
}

export function deleteQuestion(index) {
    const state = getState();
    const questions = [...state.parsedQuestions];
    
    if (questions.length <= 1) {
        showToast('Need at least one question', 'warning');
        return;
    }
    
    questions.splice(index, 1);
    
    setState({
        parsedQuestions: questions,
        currentEditQuestion: Math.min(state.currentEditQuestion, questions.length - 1)
    });
}

export function updateQuestion(field, value) {
    const state = getState();
    const questions = [...state.parsedQuestions];
    const q = { ...questions[state.currentEditQuestion] };
    
    if (field === 'type' && value !== q.type) {
        // Reset correct when changing type
        if (value === 'ordering') {
            q.correct = q.options.map((_, i) => i);
        } else {
            q.correct = [];
        }
    }
    
    q[field] = value;
    questions[state.currentEditQuestion] = q;
    
    setState({ parsedQuestions: questions });
}

export function updateOption(index, value) {
    const state = getState();
    const questions = [...state.parsedQuestions];
    const q = { ...questions[state.currentEditQuestion] };
    
    q.options = [...q.options];
    q.options[index] = value;
    questions[state.currentEditQuestion] = q;
    
    setState({ parsedQuestions: questions });
}

export function addOption() {
    const state = getState();
    const questions = [...state.parsedQuestions];
    const q = { ...questions[state.currentEditQuestion] };
    
    q.options = [...q.options, ''];
    
    if (q.type === 'ordering') {
        q.correct = [...q.correct, q.options.length - 1];
    }
    
    questions[state.currentEditQuestion] = q;
    setState({ parsedQuestions: questions });
}

export function removeOption(index) {
    const state = getState();
    const questions = [...state.parsedQuestions];
    const q = { ...questions[state.currentEditQuestion] };
    
    if (q.options.length <= 2) {
        showToast('Need at least 2 options', 'warning');
        return;
    }
    
    q.options = q.options.filter((_, i) => i !== index);
    q.correct = q.correct.filter(c => c !== index).map(c => c > index ? c - 1 : c);
    
    questions[state.currentEditQuestion] = q;
    setState({ parsedQuestions: questions });
}

export function toggleCorrect(index) {
    const state = getState();
    const questions = [...state.parsedQuestions];
    const q = { ...questions[state.currentEditQuestion] };
    
    q.correct = [...q.correct];
    
    if (q.correct.includes(index)) {
        q.correct = q.correct.filter(c => c !== index);
    } else {
        q.correct.push(index);
    }
    
    questions[state.currentEditQuestion] = q;
    setState({ parsedQuestions: questions });
}

export async function saveFromVisualEditor() {
    const state = getState();
    
    // Validate
    const invalid = state.parsedQuestions.filter(q =>
        !q.question.trim() ||
        (q.type === 'choice' && q.correct.length === 0) ||
        q.options.filter(o => o.trim()).length < 2
    );
    
    if (invalid.length > 0) {
        showToast('Some questions are incomplete', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const payload = {
            title: state.quizTitle,
            questions: state.parsedQuestions,
            description: state.quizCategory || '',
            color: getRandomColor()
        };
        
        if (state.editingQuizId) {
            await updateQuiz(state.editingQuizId, payload);
        } else {
            await createQuiz(payload);
        }
        
        setState({
            view: 'library',
            quizTitle: '',
            quizData: '',
            quizCategory: '',
            editingQuizId: null,
            visualEditorMode: false,
            parsedQuestions: null
        });
        
        hideLoading();
    } catch (error) {
        hideLoading();
        showToast(error.message || 'Failed to save', 'error');
    }
}

export default {
    renderCreate,
    updateQuizTitle,
    updateQuizCategory,
    updateQuizData,
    toggleFormatHelp,
    saveQuiz,
    editQuiz,
    openVisualEditor,
    closeVisualEditor,
    selectEditQuestion,
    addQuestion,
    deleteQuestion,
    updateQuestion,
    updateOption,
    addOption,
    removeOption,
    toggleCorrect,
    saveFromVisualEditor
};
