/* Create/Edit Component - Fixed input focus issues */
import { getState, setState } from '../state.js';
import { getQuiz, createQuiz, updateQuiz } from '../services/api.js';
import { escapeHtml, getRandomColor, showLoading, hideLoading } from '../utils/dom.js';
import { parseQuizData, questionsToText } from '../utils/parser.js';
import { showToast } from '../utils/toast.js';

export function renderCreate() {
    const state = getState();
    if (state.visualEditorMode) return renderVisual();
    return `<div class="create-page"><header class="create-header"><div class="create-header-inner">
        <button class="btn btn-ghost" onclick="window.app.navigate('library')">← Cancel</button>
        <h2>${state.editingQuizId ? 'Edit' : 'Create'} Quiz</h2>
        <button class="btn btn-primary" onclick="window.app.saveQuiz()">Save</button>
    </div></header><main class="create-main">
        <div class="form-group"><label class="label">Title</label><input type="text" id="q-title" class="input" placeholder="Quiz title" value="${escapeHtml(state.quizTitle)}"></div>
        <div class="form-group"><label class="label">Category</label><input type="text" id="q-cat" class="input" placeholder="e.g., Networking" value="${escapeHtml(state.quizCategory)}"></div>
        <div class="form-group"><div class="flex items-center justify-between mb-2"><label class="label" style="margin:0">Questions</label><button class="btn btn-sm btn-ghost" onclick="window.app.toggleHelp()">${state.showFormatHelp ? 'Hide' : 'Show'} Format</button></div>
            <textarea id="q-data" class="textarea" rows="12" placeholder="Enter questions...">${escapeHtml(state.quizData)}</textarea>
        </div>
        ${state.showFormatHelp ? `<div class="format-help"><h4>Format</h4><pre>1. Multiple choice?
A. Wrong
B. Correct *
C. Wrong

2. [order] Sort these:
1) First
2) Second

3. [tf] Is the sky blue?
True

4. [match] Match terms:
A. HTTP => 80
B. SSH => 22

[explanation: Optional]</pre></div>` : ''}
        <div class="flex gap-3 mt-6"><button class="btn btn-secondary flex-1" onclick="window.app.openVisual()">🎨 Visual Editor</button><button class="btn btn-primary flex-1" onclick="window.app.saveQuiz()">💾 Save Quiz</button></div>
    </main></div>`;
}

function renderVisual() {
    const state = getState();
    const questions = state.parsedQuestions || [];
    const q = questions[state.currentEditQuestion] || {};
    const qIdx = state.currentEditQuestion;
    
    return `<div class="create-page"><header class="create-header"><div class="create-header-inner">
        <button class="btn btn-ghost" onclick="window.app.closeVisual()">← Text Mode</button>
        <h2>Visual Editor</h2>
        <button class="btn btn-primary" onclick="window.app.saveVisual()">Save Quiz</button>
    </div></header>
    <div class="editor-layout">
        <aside class="editor-sidebar">
            <div class="sidebar-header">
                <span>Questions</span>
                <button class="btn btn-sm btn-ghost" onclick="window.app.addQ()">+ Add</button>
            </div>
            <div class="editor-list">
                ${questions.map((item, i) => `
                    <div class="editor-item${i === qIdx ? ' active' : ''}" onclick="window.app.selectQ(${i})">
                        <span class="editor-item-num">${i + 1}</span>
                        <span class="editor-item-text">${escapeHtml(item.question) || 'Untitled'}</span>
                        <span class="editor-item-type">${getTypeIcon(item.type)}</span>
                    </div>
                `).join('')}
            </div>
        </aside>
        <main class="editor-main">
            <div class="editor-card">
                <div class="editor-card-header">
                    <h3>Question ${qIdx + 1}</h3>
                    ${questions.length > 1 ? `<button class="btn btn-sm btn-ghost danger" onclick="window.app.deleteQ(${qIdx})">🗑️ Delete</button>` : ''}
                </div>
                
                <div class="form-group">
                    <label class="label">Question Text</label>
                    <textarea id="ve-question-${qIdx}" class="textarea" rows="3" placeholder="Enter your question..."
                        onblur="window.app.saveField('question', this.value)">${escapeHtml(q.question || '')}</textarea>
                </div>
                
                <div class="form-group">
                    <label class="label">Question Type</label>
                    <div class="type-selector">
                        <button class="type-btn${q.type === 'choice' ? ' active' : ''}" onclick="window.app.changeType('choice')">
                            <span class="type-btn-icon">✓</span>
                            <span class="type-btn-label">Multiple Choice</span>
                        </button>
                        <button class="type-btn${q.type === 'ordering' ? ' active' : ''}" onclick="window.app.changeType('ordering')">
                            <span class="type-btn-icon">↕️</span>
                            <span class="type-btn-label">Ordering</span>
                        </button>
                        <button class="type-btn${q.type === 'truefalse' ? ' active' : ''}" onclick="window.app.changeType('truefalse')">
                            <span class="type-btn-icon">⚡</span>
                            <span class="type-btn-label">True/False</span>
                        </button>
                        <button class="type-btn${q.type === 'matching' ? ' active' : ''}" onclick="window.app.changeType('matching')">
                            <span class="type-btn-icon">🔗</span>
                            <span class="type-btn-label">Matching</span>
                        </button>
                    </div>
                </div>
                
                ${renderTypeEditor(q, qIdx)}
                
                <div class="form-group">
                    <label class="label">Explanation <span class="text-muted">(optional)</span></label>
                    <textarea id="ve-explanation-${qIdx}" class="textarea" rows="2" placeholder="Why is this correct?"
                        onblur="window.app.saveField('explanation', this.value)">${escapeHtml(q.explanation || '')}</textarea>
                </div>
            </div>
        </main>
    </div></div>`;
}

function getTypeIcon(type) {
    return { choice: '✓', ordering: '↕️', truefalse: '⚡', matching: '🔗' }[type] || '✓';
}

function renderTypeEditor(q, qIdx) {
    if (q.type === 'truefalse') {
        const isTrue = q.correct && q.correct[0] === 0;
        return `<div class="form-group">
            <label class="label">Correct Answer</label>
            <div class="tf-selector">
                <button class="tf-btn true${isTrue ? ' active' : ''}" onclick="window.app.setTFAnswer(true)">
                    <span class="tf-icon">✓</span>
                    <span>True</span>
                </button>
                <button class="tf-btn false${!isTrue ? ' active' : ''}" onclick="window.app.setTFAnswer(false)">
                    <span class="tf-icon">✗</span>
                    <span>False</span>
                </button>
            </div>
        </div>`;
    }
    
    if (q.type === 'matching') {
        const pairs = q.pairs || [];
        return `<div class="form-group">
            <label class="label">Match Pairs</label>
            <p class="helper-text">Connect terms with their definitions</p>
            <div class="match-editor">
                ${pairs.map((pair, i) => `
                    <div class="match-row">
                        <span class="match-num">${i + 1}</span>
                        <input type="text" class="input" placeholder="Term" 
                            id="match-left-${qIdx}-${i}"
                            value="${escapeHtml(pair.left || '')}" 
                            onblur="window.app.savePair(${i}, 'left', this.value)">
                        <span class="match-arrow">↔</span>
                        <input type="text" class="input" placeholder="Definition" 
                            id="match-right-${qIdx}-${i}"
                            value="${escapeHtml(pair.right || '')}"
                            onblur="window.app.savePair(${i}, 'right', this.value)">
                        ${pairs.length > 2 ? `<button class="btn btn-icon btn-ghost" onclick="window.app.removePair(${i})">✕</button>` : '<div style="width:36px"></div>'}
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-sm btn-secondary mt-3" onclick="window.app.addPair()">+ Add Pair</button>
        </div>`;
    }
    
    if (q.type === 'ordering') {
        const options = q.options || [];
        return `<div class="form-group">
            <label class="label">Items in Correct Order</label>
            <p class="helper-text">Enter items in the order they should be when correct</p>
            <div class="options-editor">
                ${options.map((opt, i) => `
                    <div class="option-row">
                        <span class="option-num">${i + 1}</span>
                        <input type="text" class="input" placeholder="Item ${i + 1}" 
                            id="opt-${qIdx}-${i}"
                            value="${escapeHtml(opt)}"
                            onblur="window.app.saveOption(${i}, this.value)">
                        ${options.length > 2 ? `<button class="btn btn-icon btn-ghost" onclick="window.app.removeOpt(${i})">✕</button>` : '<div style="width:36px"></div>'}
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-sm btn-secondary mt-3" onclick="window.app.addOpt()">+ Add Item</button>
        </div>`;
    }
    
    // Multiple choice
    const options = q.options || [];
    const correct = q.correct || [];
    return `<div class="form-group">
        <label class="label">Answer Options</label>
        <p class="helper-text">Click the circle to mark correct answer(s)</p>
        <div class="options-editor">
            ${options.map((opt, i) => `
                <div class="option-row${correct.includes(i) ? ' correct' : ''}">
                    <button class="correct-toggle${correct.includes(i) ? ' active' : ''}" onclick="window.app.toggleCorrect(${i})">
                        ${correct.includes(i) ? '✓' : ''}
                    </button>
                    <input type="text" class="input" placeholder="Option ${String.fromCharCode(65 + i)}" 
                        id="opt-${qIdx}-${i}"
                        value="${escapeHtml(opt)}"
                        onblur="window.app.saveOption(${i}, this.value)">
                    ${options.length > 2 ? `<button class="btn btn-icon btn-ghost" onclick="window.app.removeOpt(${i})">✕</button>` : '<div style="width:36px"></div>'}
                </div>
            `).join('')}
        </div>
        <button class="btn btn-sm btn-secondary mt-3" onclick="window.app.addOpt()">+ Add Option</button>
    </div>`;
}

// ========== Handlers ==========

export function setTitle(v) { setState({ quizTitle: v }); }
export function setCat(v) { setState({ quizCategory: v }); }
export function setData(v) { setState({ quizData: v }); }
export function toggleHelp() { setState({ showFormatHelp: !getState().showFormatHelp }); }

export async function saveQuiz() {
    const title = document.getElementById('q-title')?.value || getState().quizTitle;
    const data = document.getElementById('q-data')?.value || getState().quizData;
    const cat = document.getElementById('q-cat')?.value || getState().quizCategory;
    
    if (!title.trim()) return showToast('Enter a title', 'warning');
    if (!data.trim()) return showToast('Add some questions', 'warning');
    
    showLoading();
    try {
        const questions = parseQuizData(data);
        if (!questions.length) { hideLoading(); return showToast('No valid questions', 'warning'); }
        const payload = { title, questions, description: cat, color: getRandomColor() };
        if (getState().editingQuizId) await updateQuiz(getState().editingQuizId, payload); 
        else await createQuiz(payload);
        setState({ view: 'library', quizTitle: '', quizData: '', quizCategory: '', editingQuizId: null, visualEditorMode: false, parsedQuestions: null }); 
        hideLoading();
    } catch (e) { hideLoading(); showToast(e.message || 'Failed', 'error'); }
}

export async function editQuiz(id) {
    showLoading();
    try { 
        const quiz = await getQuiz(id); 
        setState({ view: 'create', quizTitle: quiz.title, quizData: questionsToText(quiz.questions), quizCategory: quiz.description || '', editingQuizId: id, visualEditorMode: false }); 
        hideLoading(); 
    } catch { hideLoading(); showToast('Failed to load', 'error'); }
}

export function openVisual() {
    const title = document.getElementById('q-title')?.value || getState().quizTitle;
    if (!title.trim()) return showToast('Enter a title first', 'warning');
    
    const data = document.getElementById('q-data')?.value || getState().quizData;
    let questions = data.trim() ? parseQuizData(data) : [];
    if (!questions.length) questions = [createEmpty('choice')];
    
    setState({ quizTitle: title, quizCategory: document.getElementById('q-cat')?.value || '', visualEditorMode: true, parsedQuestions: questions, currentEditQuestion: 0 });
}

function createEmpty(type) {
    const base = { question: '', type, explanation: null, pairs: [], options: [], correct: [] };
    if (type === 'truefalse') return { ...base, options: ['True', 'False'], correct: [0] };
    if (type === 'matching') return { ...base, pairs: [{ left: '', right: '' }, { left: '', right: '' }] };
    return { ...base, options: ['', ''], correct: type === 'ordering' ? [0, 1] : [] };
}

export function closeVisual() { 
    const s = getState(); 
    if (s.parsedQuestions) setState({ quizData: questionsToText(s.parsedQuestions) }); 
    setState({ visualEditorMode: false }); 
}

export function selectQ(i) { setState({ currentEditQuestion: i }); }
export function addQ() { 
    const s = getState();
    const q = [...(s.parsedQuestions || []), createEmpty('choice')]; 
    setState({ parsedQuestions: q, currentEditQuestion: q.length - 1 }); 
}
export function deleteQ(i) { 
    const s = getState(); 
    if (s.parsedQuestions.length <= 1) return showToast('Need at least 1 question', 'warning'); 
    const q = s.parsedQuestions.filter((_, j) => j !== i); 
    setState({ parsedQuestions: q, currentEditQuestion: Math.min(s.currentEditQuestion, q.length - 1) }); 
}

export function saveField(field, value) {
    const s = getState();
    const q = [...s.parsedQuestions];
    q[s.currentEditQuestion] = { ...q[s.currentEditQuestion], [field]: value };
    setState({ parsedQuestions: q });
}

export function changeType(newType) {
    const s = getState();
    const current = s.parsedQuestions[s.currentEditQuestion];
    if (current.type === newType) return;
    
    const q = [...s.parsedQuestions];
    const newQ = createEmpty(newType);
    newQ.question = current.question;
    newQ.explanation = current.explanation;
    q[s.currentEditQuestion] = newQ;
    setState({ parsedQuestions: q });
}

export function setTFAnswer(isTrue) {
    const s = getState();
    const q = [...s.parsedQuestions];
    q[s.currentEditQuestion] = { ...q[s.currentEditQuestion], correct: [isTrue ? 0 : 1] };
    setState({ parsedQuestions: q });
}

export function savePair(i, side, value) {
    const s = getState();
    const q = [...s.parsedQuestions];
    const current = { ...q[s.currentEditQuestion] };
    const pairs = [...(current.pairs || [])];
    pairs[i] = { ...pairs[i], [side]: value };
    current.pairs = pairs;
    current.options = pairs.map(p => p.right);
    current.correct = pairs.map((_, idx) => idx);
    q[s.currentEditQuestion] = current;
    setState({ parsedQuestions: q });
}

export function addPair() {
    const s = getState();
    const q = [...s.parsedQuestions];
    const current = { ...q[s.currentEditQuestion] };
    current.pairs = [...(current.pairs || []), { left: '', right: '' }];
    current.options = current.pairs.map(p => p.right);
    current.correct = current.pairs.map((_, i) => i);
    q[s.currentEditQuestion] = current;
    setState({ parsedQuestions: q });
}

export function removePair(i) {
    const s = getState();
    if ((s.parsedQuestions[s.currentEditQuestion].pairs || []).length <= 2) return showToast('Need at least 2 pairs', 'warning');
    const q = [...s.parsedQuestions];
    const current = { ...q[s.currentEditQuestion] };
    current.pairs = current.pairs.filter((_, j) => j !== i);
    current.options = current.pairs.map(p => p.right);
    current.correct = current.pairs.map((_, idx) => idx);
    q[s.currentEditQuestion] = current;
    setState({ parsedQuestions: q });
}

export function saveOption(i, value) {
    const s = getState();
    const q = [...s.parsedQuestions];
    const current = { ...q[s.currentEditQuestion] };
    current.options = [...current.options];
    current.options[i] = value;
    q[s.currentEditQuestion] = current;
    setState({ parsedQuestions: q });
}

export function addOpt() { 
    const s = getState();
    const q = [...s.parsedQuestions];
    const current = { ...q[s.currentEditQuestion] };
    current.options = [...current.options, ''];
    if (current.type === 'ordering') current.correct = current.options.map((_, i) => i);
    q[s.currentEditQuestion] = current;
    setState({ parsedQuestions: q }); 
}

export function removeOpt(i) { 
    const s = getState();
    if (s.parsedQuestions[s.currentEditQuestion].options.length <= 2) return showToast('Need at least 2 options', 'warning');
    const q = [...s.parsedQuestions];
    const current = { ...q[s.currentEditQuestion] };
    current.options = current.options.filter((_, j) => j !== i);
    current.correct = current.correct.filter(c => c !== i).map(c => c > i ? c - 1 : c);
    q[s.currentEditQuestion] = current;
    setState({ parsedQuestions: q }); 
}

export function toggleCorrect(i) { 
    const s = getState();
    const q = [...s.parsedQuestions];
    const current = { ...q[s.currentEditQuestion] };
    current.correct = current.correct.includes(i) ? current.correct.filter(c => c !== i) : [...current.correct, i];
    q[s.currentEditQuestion] = current;
    setState({ parsedQuestions: q }); 
}

// Compatibility
export function updateQ(f, v) { saveField(f, v); }
export function updateOpt(i, v) { saveOption(i, v); }
export function updatePair(i, s, v) { savePair(i, s, v); }

export async function saveVisual() {
    const state = getState();
    const invalid = state.parsedQuestions.filter(q => {
        if (!q.question.trim()) return true;
        if (q.type === 'truefalse') return false;
        if (q.type === 'matching') return !q.pairs || q.pairs.length < 2 || q.pairs.some(p => !p.left.trim() || !p.right.trim());
        if (q.type === 'choice' && !q.correct.length) return true;
        return q.options.filter(o => o.trim()).length < 2;
    });
    if (invalid.length) return showToast('Some questions incomplete', 'error');
    
    showLoading();
    try { 
        const payload = { title: state.quizTitle, questions: state.parsedQuestions, description: state.quizCategory, color: getRandomColor() }; 
        if (state.editingQuizId) await updateQuiz(state.editingQuizId, payload); 
        else await createQuiz(payload); 
        setState({ view: 'library', quizTitle: '', quizData: '', quizCategory: '', editingQuizId: null, visualEditorMode: false, parsedQuestions: null }); 
        hideLoading(); 
    } catch (e) { hideLoading(); showToast(e.message || 'Failed', 'error'); }
}
