/* Create/Edit Component */

import { getState, setState } from '../state.js';
import { getQuiz, createQuiz, updateQuiz } from '../services/api.js';
import { escapeHtml, getRandomColor, showLoading, hideLoading } from '../utils/dom.js';
import { parseQuizData, questionsToText } from '../utils/parser.js';
import { showToast } from '../utils/toast.js';

export function renderCreate() {
    const state = getState();
    
    if (state.visualEditorMode) return renderVisualEditor();
    
    return `
        <div class="create-page">
            <header class="create-header">
                <div class="create-header-inner">
                    <button class="btn btn-ghost" onclick="window.app.navigate('library')">← Cancel</button>
                    <h2>${state.editingQuizId ? 'Edit Quiz' : 'Create Quiz'}</h2>
                    <button class="btn btn-primary" onclick="window.app.saveQuiz()">Save</button>
                </div>
            </header>
            
            <main class="create-main">
                <div class="form-group">
                    <label class="label">Quiz Title</label>
                    <input type="text" id="q-title" class="input" placeholder="e.g., CCNA Chapter 5" value="${escapeHtml(state.quizTitle)}" oninput="window.app.setTitle(this.value)">
                </div>
                
                <div class="form-group">
                    <label class="label">Category (optional)</label>
                    <input type="text" id="q-cat" class="input" placeholder="e.g., Networking" value="${escapeHtml(state.quizCategory)}" oninput="window.app.setCategory(this.value)">
                </div>
                
                <div class="form-group">
                    <div class="flex items-center justify-between mb-2">
                        <label class="label" style="margin:0">Questions</label>
                        <button class="btn btn-sm btn-ghost" onclick="window.app.toggleHelp()">${state.showFormatHelp ? 'Hide' : 'Show'} Format</button>
                    </div>
                    <textarea id="q-data" class="textarea" rows="12" placeholder="Enter questions..." oninput="window.app.setData(this.value)">${escapeHtml(state.quizData)}</textarea>
                </div>
                
                ${state.showFormatHelp ? `
                    <div class="format-help">
                        <h4>📝 Question Format</h4>
                        <pre>1. What is 2+2?
A. 3
B. 4 *
C. 5

2. [order] Sort these:
1) First
2) Second
3) Third

3. Code question:
[code]
print("Hello")
[/code]
A. Hello *
B. Error
[explanation: print outputs text]</pre>
                        <p class="text-sm text-muted mt-4">Mark correct with * · Use [order] for ordering · [code]...[/code] for code</p>
                    </div>
                ` : ''}
                
                <div class="flex gap-3 mt-6">
                    <button class="btn btn-secondary flex-1" onclick="window.app.openVisual()">🎨 Visual Editor</button>
                    <button class="btn btn-primary flex-1" onclick="window.app.saveQuiz()">💾 Save Quiz</button>
                </div>
            </main>
        </div>
    `;
}

function renderVisualEditor() {
    const state = getState();
    const questions = state.parsedQuestions || [];
    const q = questions[state.currentEditQuestion] || {};
    
    return `
        <div class="create-page">
            <header class="create-header">
                <div class="create-header-inner">
                    <button class="btn btn-ghost" onclick="window.app.closeVisual()">← Text Mode</button>
                    <h2>Visual Editor</h2>
                    <button class="btn btn-primary" onclick="window.app.saveVisual()">Save</button>
                </div>
            </header>
            
            <div class="editor-layout">
                <aside class="editor-sidebar">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-sm font-medium">Questions</span>
                        <button class="btn btn-sm btn-ghost" onclick="window.app.addQ()">+ Add</button>
                    </div>
                    <div class="editor-list">
                        ${questions.map((item, i) => `
                            <div class="editor-item ${i === state.currentEditQuestion ? 'active' : ''}" onclick="window.app.selectQ(${i})">
                                <span class="editor-item-num">${i + 1}</span>
                                <span class="truncate text-sm">${escapeHtml(item.question) || 'Untitled'}</span>
                            </div>
                        `).join('')}
                    </div>
                </aside>
                
                <main class="editor-main">
                    <div class="editor-card card">
                        <div class="flex items-center justify-between mb-4">
                            <div>
                                <h3>Question ${state.currentEditQuestion + 1}</h3>
                                <span class="text-sm text-muted">of ${questions.length}</span>
                            </div>
                            ${questions.length > 1 ? `<button class="btn btn-sm btn-ghost text-error" onclick="window.app.deleteQ(${state.currentEditQuestion})">🗑️</button>` : ''}
                        </div>
                        
                        <div class="form-group">
                            <label class="label">Question Text</label>
                            <textarea class="textarea" rows="3" placeholder="Enter question..." oninput="window.app.updateQ('question', this.value)">${escapeHtml(q.question || '')}</textarea>
                        </div>
                        
                        <div class="type-tabs">
                            <button class="type-tab ${q.type === 'choice' ? 'active' : ''}" onclick="window.app.updateQ('type', 'choice')">✓ Multiple Choice</button>
                            <button class="type-tab ${q.type === 'ordering' ? 'active' : ''}" onclick="window.app.updateQ('type', 'ordering')">↕️ Ordering</button>
                        </div>
                        
                        <div class="form-group">
                            <label class="label">${q.type === 'ordering' ? 'Items (correct order)' : 'Options'}</label>
                            ${(q.options || []).map((opt, i) => `
                                <div class="opt-row">
                                    <span class="text-muted" style="width:24px">${q.type === 'ordering' ? (i + 1) : String.fromCharCode(65 + i)}</span>
                                    <input type="text" class="input" value="${escapeHtml(opt)}" placeholder="Option ${i + 1}" oninput="window.app.updateOpt(${i}, this.value)">
                                    ${q.type === 'choice' ? `<button class="opt-check ${(q.correct || []).includes(i) ? 'active' : ''}" onclick="window.app.toggleCorrect(${i})">✓</button>` : ''}
                                    ${(q.options || []).length > 2 ? `<button class="btn btn-icon btn-ghost btn-sm" onclick="window.app.removeOpt(${i})">✕</button>` : ''}
                                </div>
                            `).join('')}
                            <button class="btn btn-sm btn-ghost mt-2" onclick="window.app.addOpt()">+ Add Option</button>
                        </div>
                        
                        <div class="form-group">
                            <label class="label">Explanation (optional)</label>
                            <textarea class="textarea" rows="2" placeholder="Why is this correct..." oninput="window.app.updateQ('explanation', this.value)">${escapeHtml(q.explanation || '')}</textarea>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    `;
}

// Handlers
export function setTitle(v) { setState({ quizTitle: v }); }
export function setCategory(v) { setState({ quizCategory: v }); }
export function setData(v) { setState({ quizData: v }); }
export function toggleHelp() { setState({ showFormatHelp: !getState().showFormatHelp }); }

export async function saveQuiz() {
    const state = getState();
    if (!state.quizTitle.trim()) return showToast('Enter a title', 'warning');
    if (!state.quizData.trim()) return showToast('Add some questions', 'warning');
    
    showLoading();
    try {
        const questions = parseQuizData(state.quizData);
        if (!questions.length) { hideLoading(); return showToast('No valid questions', 'warning'); }
        
        const invalid = questions.filter(q => (q.type === 'choice' && !q.correct.length) || q.options.length < 2);
        if (invalid.length) { hideLoading(); return showToast('Some questions missing answers', 'error'); }
        
        const payload = { title: state.quizTitle, questions, description: state.quizCategory, color: getRandomColor() };
        
        if (state.editingQuizId) await updateQuiz(state.editingQuizId, payload);
        else await createQuiz(payload);
        
        setState({ view: 'library', quizTitle: '', quizData: '', quizCategory: '', editingQuizId: null, visualEditorMode: false, parsedQuestions: null });
        hideLoading();
    } catch (err) {
        hideLoading();
        showToast(err.message || 'Failed to save', 'error');
    }
}

export async function editQuiz(id) {
    showLoading();
    try {
        const quiz = await getQuiz(id);
        setState({
            view: 'create',
            quizTitle: quiz.title,
            quizData: questionsToText(quiz.questions),
            quizCategory: quiz.description || '',
            editingQuizId: id,
            visualEditorMode: false
        });
        hideLoading();
    } catch (err) {
        hideLoading();
        showToast('Failed to load quiz', 'error');
    }
}

// Visual editor
export function openVisual() {
    const state = getState();
    if (!state.quizTitle.trim()) return showToast('Enter a title first', 'warning');
    
    let questions = state.quizData.trim() ? parseQuizData(state.quizData) : [];
    if (!questions.length) questions = [{ question: '', type: 'choice', options: ['', ''], correct: [], explanation: null }];
    
    setState({ visualEditorMode: true, parsedQuestions: questions, currentEditQuestion: 0 });
}

export function closeVisual() {
    const state = getState();
    if (state.parsedQuestions) setState({ quizData: questionsToText(state.parsedQuestions) });
    setState({ visualEditorMode: false });
}

export function selectQ(i) { setState({ currentEditQuestion: i }); }

export function addQ() {
    const state = getState();
    const questions = [...(state.parsedQuestions || []), { question: '', type: 'choice', options: ['', ''], correct: [], explanation: null }];
    setState({ parsedQuestions: questions, currentEditQuestion: questions.length - 1 });
}

export function deleteQ(i) {
    const state = getState();
    if (state.parsedQuestions.length <= 1) return showToast('Need at least one question', 'warning');
    const questions = state.parsedQuestions.filter((_, idx) => idx !== i);
    setState({ parsedQuestions: questions, currentEditQuestion: Math.min(state.currentEditQuestion, questions.length - 1) });
}

export function updateQ(field, value) {
    const state = getState();
    const questions = [...state.parsedQuestions];
    const q = { ...questions[state.currentEditQuestion] };
    
    if (field === 'type' && value !== q.type) {
        q.correct = value === 'ordering' ? q.options.map((_, i) => i) : [];
    }
    
    q[field] = value;
    questions[state.currentEditQuestion] = q;
    setState({ parsedQuestions: questions });
}

export function updateOpt(i, value) {
    const state = getState();
    const questions = [...state.parsedQuestions];
    const q = { ...questions[state.currentEditQuestion], options: [...questions[state.currentEditQuestion].options] };
    q.options[i] = value;
    questions[state.currentEditQuestion] = q;
    setState({ parsedQuestions: questions });
}

export function addOpt() {
    const state = getState();
    const questions = [...state.parsedQuestions];
    const q = { ...questions[state.currentEditQuestion], options: [...questions[state.currentEditQuestion].options, ''] };
    if (q.type === 'ordering') q.correct = [...q.correct, q.options.length - 1];
    questions[state.currentEditQuestion] = q;
    setState({ parsedQuestions: questions });
}

export function removeOpt(i) {
    const state = getState();
    const q = state.parsedQuestions[state.currentEditQuestion];
    if (q.options.length <= 2) return showToast('Need at least 2 options', 'warning');
    
    const questions = [...state.parsedQuestions];
    const newQ = { ...q, options: q.options.filter((_, idx) => idx !== i), correct: q.correct.filter(c => c !== i).map(c => c > i ? c - 1 : c) };
    questions[state.currentEditQuestion] = newQ;
    setState({ parsedQuestions: questions });
}

export function toggleCorrect(i) {
    const state = getState();
    const questions = [...state.parsedQuestions];
    const q = { ...questions[state.currentEditQuestion], correct: [...questions[state.currentEditQuestion].correct] };
    q.correct = q.correct.includes(i) ? q.correct.filter(c => c !== i) : [...q.correct, i];
    questions[state.currentEditQuestion] = q;
    setState({ parsedQuestions: questions });
}

export async function saveVisual() {
    const state = getState();
    const invalid = state.parsedQuestions.filter(q => !q.question.trim() || (q.type === 'choice' && !q.correct.length) || q.options.filter(o => o.trim()).length < 2);
    if (invalid.length) return showToast('Some questions incomplete', 'error');
    
    showLoading();
    try {
        const payload = { title: state.quizTitle, questions: state.parsedQuestions, description: state.quizCategory, color: getRandomColor() };
        if (state.editingQuizId) await updateQuiz(state.editingQuizId, payload);
        else await createQuiz(payload);
        
        setState({ view: 'library', quizTitle: '', quizData: '', quizCategory: '', editingQuizId: null, visualEditorMode: false, parsedQuestions: null });
        hideLoading();
    } catch (err) {
        hideLoading();
        showToast(err.message || 'Failed to save', 'error');
    }
}
