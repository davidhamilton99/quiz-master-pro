/* Create/Edit Component */
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
        <div class="form-group"><label class="label">Title</label><input type="text" id="q-title" class="input" placeholder="Quiz title" value="${escapeHtml(state.quizTitle)}" oninput="window.app.setTitle(this.value)"></div>
        <div class="form-group"><label class="label">Category</label><input type="text" id="q-cat" class="input" placeholder="e.g., Networking" value="${escapeHtml(state.quizCategory)}" oninput="window.app.setCat(this.value)"></div>
        <div class="form-group"><div class="flex items-center justify-between mb-2"><label class="label" style="margin:0">Questions</label><button class="btn btn-sm btn-ghost" onclick="window.app.toggleHelp()">${state.showFormatHelp ? 'Hide' : 'Show'} Format</button></div>
            <textarea id="q-data" class="textarea" rows="12" placeholder="Enter questions..." oninput="window.app.setData(this.value)">${escapeHtml(state.quizData)}</textarea>
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
C. FTP => 21

[explanation: Optional note]</pre></div>` : ''}
        <div class="flex gap-3 mt-6"><button class="btn btn-secondary flex-1" onclick="window.app.openVisual()">🎨 Visual</button><button class="btn btn-primary flex-1" onclick="window.app.saveQuiz()">💾 Save</button></div>
    </main></div>`;
}

function renderVisual() {
    const state = getState(), questions = state.parsedQuestions || [], q = questions[state.currentEditQuestion] || {};
    return `<div class="create-page"><header class="create-header"><div class="create-header-inner">
        <button class="btn btn-ghost" onclick="window.app.closeVisual()">← Text</button><h2>Visual Editor</h2><button class="btn btn-primary" onclick="window.app.saveVisual()">Save</button>
    </div></header><div class="editor-layout">
        <aside class="editor-sidebar"><div class="flex items-center justify-between mb-4"><span class="text-sm font-medium">Questions</span><button class="btn btn-sm btn-ghost" onclick="window.app.addQ()">+</button></div>
            <div class="editor-list">${questions.map((item, i) => `<div class="editor-item${i === state.currentEditQuestion ? ' active' : ''}" onclick="window.app.selectQ(${i})"><span class="editor-item-num">${i + 1}</span><span class="truncate text-sm">${escapeHtml(item.question) || 'Untitled'}</span></div>`).join('')}</div>
        </aside>
        <main class="editor-main"><div class="editor-card card">
            <div class="flex items-center justify-between mb-4"><div><h3>Q${state.currentEditQuestion + 1}</h3></div>${questions.length > 1 ? `<button class="btn btn-sm btn-ghost text-error" onclick="window.app.deleteQ(${state.currentEditQuestion})">🗑️</button>` : ''}</div>
            <div class="form-group"><label class="label">Question</label><textarea class="textarea" rows="3" oninput="window.app.updateQ('question',this.value)">${escapeHtml(q.question || '')}</textarea></div>
            
            <div class="type-tabs">
                <button class="type-tab${q.type === 'choice' ? ' active' : ''}" onclick="window.app.updateQ('type','choice')">✓ Choice</button>
                <button class="type-tab${q.type === 'ordering' ? ' active' : ''}" onclick="window.app.updateQ('type','ordering')">↕️ Order</button>
                <button class="type-tab${q.type === 'truefalse' ? ' active' : ''}" onclick="window.app.updateQ('type','truefalse')">T/F</button>
                <button class="type-tab${q.type === 'matching' ? ' active' : ''}" onclick="window.app.updateQ('type','matching')">🔗 Match</button>
            </div>
            
            ${renderOptionsEditor(q)}
            
            <div class="form-group"><label class="label">Explanation</label><textarea class="textarea" rows="2" oninput="window.app.updateQ('explanation',this.value)">${escapeHtml(q.explanation || '')}</textarea></div>
        </div></main>
    </div></div>`;
}

function renderOptionsEditor(q) {
    // True/False - simple toggle
    if (q.type === 'truefalse') {
        const isTrue = q.correct && q.correct[0] === 0;
        return `<div class="form-group">
            <label class="label">Correct Answer</label>
            <div class="tf-toggle">
                <button class="tf-btn${isTrue ? ' active' : ''}" onclick="window.app.setTFAnswer(true)">✓ True</button>
                <button class="tf-btn${!isTrue ? ' active' : ''}" onclick="window.app.setTFAnswer(false)">✗ False</button>
            </div>
        </div>`;
    }
    
    // Matching - pairs editor
    if (q.type === 'matching') {
        const pairs = q.pairs || [];
        return `<div class="form-group">
            <label class="label">Match Pairs (Term → Definition)</label>
            ${pairs.map((pair, i) => `
                <div class="match-pair-row">
                    <span class="match-pair-letter">${String.fromCharCode(65 + i)}</span>
                    <input type="text" class="input" placeholder="Term" value="${escapeHtml(pair.left || '')}" oninput="window.app.updatePair(${i},'left',this.value)">
                    <span class="match-pair-arrow">→</span>
                    <input type="text" class="input" placeholder="Definition" value="${escapeHtml(pair.right || '')}" oninput="window.app.updatePair(${i},'right',this.value)">
                    ${pairs.length > 2 ? `<button class="btn btn-icon btn-ghost btn-sm" onclick="window.app.removePair(${i})">✕</button>` : ''}
                </div>
            `).join('')}
            <button class="btn btn-sm btn-ghost mt-2" onclick="window.app.addPair()">+ Add Pair</button>
        </div>`;
    }
    
    // Ordering - numbered items
    if (q.type === 'ordering') {
        return `<div class="form-group">
            <label class="label">Items (in correct order)</label>
            ${(q.options || []).map((opt, i) => `
                <div class="opt-row">
                    <span style="width:24px">${i + 1}</span>
                    <input type="text" class="input" value="${escapeHtml(opt)}" oninput="window.app.updateOpt(${i},this.value)">
                    ${(q.options || []).length > 2 ? `<button class="btn btn-icon btn-ghost btn-sm" onclick="window.app.removeOpt(${i})">✕</button>` : ''}
                </div>
            `).join('')}
            <button class="btn btn-sm btn-ghost mt-2" onclick="window.app.addOpt()">+ Add Item</button>
        </div>`;
    }
    
    // Multiple choice (default)
    return `<div class="form-group">
        <label class="label">Options</label>
        ${(q.options || []).map((opt, i) => `
            <div class="opt-row">
                <span style="width:24px">${String.fromCharCode(65 + i)}</span>
                <input type="text" class="input" value="${escapeHtml(opt)}" oninput="window.app.updateOpt(${i},this.value)">
                <button class="opt-check${(q.correct || []).includes(i) ? ' active' : ''}" onclick="window.app.toggleCorrect(${i})">✓</button>
                ${(q.options || []).length > 2 ? `<button class="btn btn-icon btn-ghost btn-sm" onclick="window.app.removeOpt(${i})">✕</button>` : ''}
            </div>
        `).join('')}
        <button class="btn btn-sm btn-ghost mt-2" onclick="window.app.addOpt()">+ Option</button>
    </div>`;
}

export function setTitle(v) { setState({ quizTitle: v }); }
export function setCat(v) { setState({ quizCategory: v }); }
export function setData(v) { setState({ quizData: v }); }
export function toggleHelp() { setState({ showFormatHelp: !getState().showFormatHelp }); }

export async function saveQuiz() {
    const state = getState();
    if (!state.quizTitle.trim()) return showToast('Enter title', 'warning');
    if (!state.quizData.trim()) return showToast('Add questions', 'warning');
    showLoading();
    try {
        const questions = parseQuizData(state.quizData);
        if (!questions.length) { hideLoading(); return showToast('No valid questions', 'warning'); }
        const invalid = questions.filter(q => {
            if (q.type === 'truefalse') return false; // TF always valid
            if (q.type === 'matching') return !q.pairs || q.pairs.length < 2;
            return (q.type === 'choice' && !q.correct.length) || q.options.length < 2;
        });
        if (invalid.length) { hideLoading(); return showToast('Some questions incomplete', 'error'); }
        const payload = { title: state.quizTitle, questions, description: state.quizCategory, color: getRandomColor() };
        if (state.editingQuizId) await updateQuiz(state.editingQuizId, payload); else await createQuiz(payload);
        setState({ view: 'library', quizTitle: '', quizData: '', quizCategory: '', editingQuizId: null, visualEditorMode: false, parsedQuestions: null }); hideLoading();
    } catch (e) { hideLoading(); showToast(e.message || 'Failed', 'error'); }
}

export async function editQuiz(id) {
    showLoading();
    try { const quiz = await getQuiz(id); setState({ view: 'create', quizTitle: quiz.title, quizData: questionsToText(quiz.questions), quizCategory: quiz.description || '', editingQuizId: id, visualEditorMode: false }); hideLoading(); }
    catch { hideLoading(); showToast('Failed to load', 'error'); }
}

export function openVisual() {
    const state = getState();
    if (!state.quizTitle.trim()) return showToast('Enter title first', 'warning');
    let questions = state.quizData.trim() ? parseQuizData(state.quizData) : [];
    if (!questions.length) questions = [createEmptyQuestion('choice')];
    setState({ visualEditorMode: true, parsedQuestions: questions, currentEditQuestion: 0 });
}

function createEmptyQuestion(type) {
    const base = { question: '', type, explanation: null };
    if (type === 'truefalse') {
        return { ...base, options: ['True', 'False'], correct: [0] };
    }
    if (type === 'matching') {
        return { ...base, pairs: [{ left: '', right: '' }, { left: '', right: '' }], options: [], correct: [] };
    }
    return { ...base, options: ['', ''], correct: [] };
}

export function closeVisual() { 
    const s = getState(); 
    if (s.parsedQuestions) setState({ quizData: questionsToText(s.parsedQuestions) }); 
    setState({ visualEditorMode: false }); 
}

export function selectQ(i) { setState({ currentEditQuestion: i }); }

export function addQ() { 
    const s = getState(), q = [...(s.parsedQuestions || []), createEmptyQuestion('choice')]; 
    setState({ parsedQuestions: q, currentEditQuestion: q.length - 1 }); 
}

export function deleteQ(i) { 
    const s = getState(); 
    if (s.parsedQuestions.length <= 1) return showToast('Need 1 question', 'warning'); 
    const q = s.parsedQuestions.filter((_, j) => j !== i); 
    setState({ parsedQuestions: q, currentEditQuestion: Math.min(s.currentEditQuestion, q.length - 1) }); 
}

export function updateQ(field, val) { 
    const s = getState(), q = [...s.parsedQuestions], item = { ...q[s.currentEditQuestion] }; 
    
    // Handle type change
    if (field === 'type' && val !== item.type) {
        if (val === 'truefalse') {
            item.options = ['True', 'False'];
            item.correct = [0];
            item.pairs = [];
        } else if (val === 'matching') {
            item.pairs = [{ left: '', right: '' }, { left: '', right: '' }];
            item.options = [];
            item.correct = [];
        } else if (val === 'ordering') {
            item.options = item.options?.length >= 2 ? item.options : ['', ''];
            item.correct = item.options.map((_, i) => i);
            item.pairs = [];
        } else {
            // choice
            item.options = item.options?.length >= 2 ? item.options : ['', ''];
            item.correct = [];
            item.pairs = [];
        }
    }
    
    item[field] = val; 
    q[s.currentEditQuestion] = item; 
    setState({ parsedQuestions: q }); 
}

// True/False answer
export function setTFAnswer(isTrue) {
    const s = getState(), q = [...s.parsedQuestions];
    q[s.currentEditQuestion] = { ...q[s.currentEditQuestion], correct: [isTrue ? 0 : 1] };
    setState({ parsedQuestions: q });
}

// Matching pairs
export function updatePair(i, side, val) {
    const s = getState(), q = [...s.parsedQuestions];
    const item = { ...q[s.currentEditQuestion], pairs: [...(q[s.currentEditQuestion].pairs || [])] };
    item.pairs[i] = { ...item.pairs[i], [side]: val };
    // Update options and correct to match pairs
    item.options = item.pairs.map(p => p.right);
    item.correct = item.pairs.map((_, idx) => idx);
    q[s.currentEditQuestion] = item;
    setState({ parsedQuestions: q });
}

export function addPair() {
    const s = getState(), q = [...s.parsedQuestions];
    const item = { ...q[s.currentEditQuestion], pairs: [...(q[s.currentEditQuestion].pairs || []), { left: '', right: '' }] };
    item.options = item.pairs.map(p => p.right);
    item.correct = item.pairs.map((_, idx) => idx);
    q[s.currentEditQuestion] = item;
    setState({ parsedQuestions: q });
}

export function removePair(i) {
    const s = getState();
    const item = s.parsedQuestions[s.currentEditQuestion];
    if ((item.pairs || []).length <= 2) return showToast('Need at least 2 pairs', 'warning');
    const q = [...s.parsedQuestions];
    const newItem = { ...item, pairs: item.pairs.filter((_, j) => j !== i) };
    newItem.options = newItem.pairs.map(p => p.right);
    newItem.correct = newItem.pairs.map((_, idx) => idx);
    q[s.currentEditQuestion] = newItem;
    setState({ parsedQuestions: q });
}

// Multiple choice / Ordering options
export function updateOpt(i, val) { 
    const s = getState(), q = [...s.parsedQuestions], item = { ...q[s.currentEditQuestion], options: [...q[s.currentEditQuestion].options] }; 
    item.options[i] = val; 
    q[s.currentEditQuestion] = item; 
    setState({ parsedQuestions: q }); 
}

export function addOpt() { 
    const s = getState(), q = [...s.parsedQuestions], item = { ...q[s.currentEditQuestion], options: [...q[s.currentEditQuestion].options, ''] }; 
    if (item.type === 'ordering') item.correct = [...item.correct, item.options.length - 1]; 
    q[s.currentEditQuestion] = item; 
    setState({ parsedQuestions: q }); 
}

export function removeOpt(i) { 
    const s = getState(), item = s.parsedQuestions[s.currentEditQuestion]; 
    if (item.options.length <= 2) return showToast('Need 2 options', 'warning'); 
    const q = [...s.parsedQuestions], newItem = { ...item, options: item.options.filter((_, j) => j !== i), correct: item.correct.filter(c => c !== i).map(c => c > i ? c - 1 : c) }; 
    q[s.currentEditQuestion] = newItem; 
    setState({ parsedQuestions: q }); 
}

export function toggleCorrect(i) { 
    const s = getState(), q = [...s.parsedQuestions], item = { ...q[s.currentEditQuestion], correct: [...q[s.currentEditQuestion].correct] }; 
    item.correct = item.correct.includes(i) ? item.correct.filter(c => c !== i) : [...item.correct, i]; 
    q[s.currentEditQuestion] = item; 
    setState({ parsedQuestions: q }); 
}

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
        if (state.editingQuizId) await updateQuiz(state.editingQuizId, payload); else await createQuiz(payload); 
        setState({ view: 'library', quizTitle: '', quizData: '', quizCategory: '', editingQuizId: null, visualEditorMode: false, parsedQuestions: null }); 
        hideLoading(); 
    }
    catch (e) { hideLoading(); showToast(e.message || 'Failed', 'error'); }
}
