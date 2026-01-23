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
        ${state.showFormatHelp ? `<div class="format-help"><h4>Format</h4><pre>1. Question?
A. Wrong
B. Correct *
C. Wrong

2. [order] Sort these:
1) First
2) Second
[explanation: Optional]</pre></div>` : ''}
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
            <div class="type-tabs"><button class="type-tab${q.type === 'choice' ? ' active' : ''}" onclick="window.app.updateQ('type','choice')">✓ Choice</button><button class="type-tab${q.type === 'ordering' ? ' active' : ''}" onclick="window.app.updateQ('type','ordering')">↕️ Order</button></div>
            <div class="form-group"><label class="label">Options</label>
                ${(q.options || []).map((opt, i) => `<div class="opt-row"><span style="width:24px">${q.type === 'ordering' ? i + 1 : String.fromCharCode(65 + i)}</span><input type="text" class="input" value="${escapeHtml(opt)}" oninput="window.app.updateOpt(${i},this.value)">${q.type === 'choice' ? `<button class="opt-check${(q.correct || []).includes(i) ? ' active' : ''}" onclick="window.app.toggleCorrect(${i})">✓</button>` : ''}${(q.options || []).length > 2 ? `<button class="btn btn-icon btn-ghost btn-sm" onclick="window.app.removeOpt(${i})">✕</button>` : ''}</div>`).join('')}
                <button class="btn btn-sm btn-ghost mt-2" onclick="window.app.addOpt()">+ Option</button>
            </div>
            <div class="form-group"><label class="label">Explanation</label><textarea class="textarea" rows="2" oninput="window.app.updateQ('explanation',this.value)">${escapeHtml(q.explanation || '')}</textarea></div>
        </div></main>
    </div></div>`;
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
        const invalid = questions.filter(q => (q.type === 'choice' && !q.correct.length) || q.options.length < 2);
        if (invalid.length) { hideLoading(); return showToast('Missing answers', 'error'); }
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
    if (!questions.length) questions = [{ question: '', type: 'choice', options: ['', ''], correct: [], explanation: null }];
    setState({ visualEditorMode: true, parsedQuestions: questions, currentEditQuestion: 0 });
}

export function closeVisual() { const s = getState(); if (s.parsedQuestions) setState({ quizData: questionsToText(s.parsedQuestions) }); setState({ visualEditorMode: false }); }
export function selectQ(i) { setState({ currentEditQuestion: i }); }
export function addQ() { const s = getState(), q = [...(s.parsedQuestions || []), { question: '', type: 'choice', options: ['', ''], correct: [], explanation: null }]; setState({ parsedQuestions: q, currentEditQuestion: q.length - 1 }); }
export function deleteQ(i) { const s = getState(); if (s.parsedQuestions.length <= 1) return showToast('Need 1 question', 'warning'); const q = s.parsedQuestions.filter((_, j) => j !== i); setState({ parsedQuestions: q, currentEditQuestion: Math.min(s.currentEditQuestion, q.length - 1) }); }
export function updateQ(field, val) { const s = getState(), q = [...s.parsedQuestions], item = { ...q[s.currentEditQuestion] }; if (field === 'type' && val !== item.type) item.correct = val === 'ordering' ? item.options.map((_, i) => i) : []; item[field] = val; q[s.currentEditQuestion] = item; setState({ parsedQuestions: q }); }
export function updateOpt(i, val) { const s = getState(), q = [...s.parsedQuestions], item = { ...q[s.currentEditQuestion], options: [...q[s.currentEditQuestion].options] }; item.options[i] = val; q[s.currentEditQuestion] = item; setState({ parsedQuestions: q }); }
export function addOpt() { const s = getState(), q = [...s.parsedQuestions], item = { ...q[s.currentEditQuestion], options: [...q[s.currentEditQuestion].options, ''] }; if (item.type === 'ordering') item.correct = [...item.correct, item.options.length - 1]; q[s.currentEditQuestion] = item; setState({ parsedQuestions: q }); }
export function removeOpt(i) { const s = getState(), item = s.parsedQuestions[s.currentEditQuestion]; if (item.options.length <= 2) return showToast('Need 2 options', 'warning'); const q = [...s.parsedQuestions], newItem = { ...item, options: item.options.filter((_, j) => j !== i), correct: item.correct.filter(c => c !== i).map(c => c > i ? c - 1 : c) }; q[s.currentEditQuestion] = newItem; setState({ parsedQuestions: q }); }
export function toggleCorrect(i) { const s = getState(), q = [...s.parsedQuestions], item = { ...q[s.currentEditQuestion], correct: [...q[s.currentEditQuestion].correct] }; item.correct = item.correct.includes(i) ? item.correct.filter(c => c !== i) : [...item.correct, i]; q[s.currentEditQuestion] = item; setState({ parsedQuestions: q }); }

export async function saveVisual() {
    const state = getState();
    const invalid = state.parsedQuestions.filter(q => !q.question.trim() || (q.type === 'choice' && !q.correct.length) || q.options.filter(o => o.trim()).length < 2);
    if (invalid.length) return showToast('Incomplete questions', 'error');
    showLoading();
    try { const payload = { title: state.quizTitle, questions: state.parsedQuestions, description: state.quizCategory, color: getRandomColor() }; if (state.editingQuizId) await updateQuiz(state.editingQuizId, payload); else await createQuiz(payload); setState({ view: 'library', quizTitle: '', quizData: '', quizCategory: '', editingQuizId: null, visualEditorMode: false, parsedQuestions: null }); hideLoading(); }
    catch (e) { hideLoading(); showToast(e.message || 'Failed', 'error'); }
}
