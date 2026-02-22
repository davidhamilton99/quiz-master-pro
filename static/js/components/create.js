/* Create/Edit Component */
import { getState, setState } from '../state.js';
import { getQuiz, createQuiz, updateQuiz, getCertifications, getCertification, assignQuestionDomains } from '../services/api.js';
import { escapeHtml, getRandomColor, showLoading, hideLoading } from '../utils/dom.js';
import { parseQuizData, questionsToText } from '../utils/parser.js';
import { icon } from '../utils/icons.js';
import { showToast } from '../utils/toast.js';

// Cached certs list for dropdown
let certsCache = null;
async function ensureCertsLoaded() {
    if (!certsCache) certsCache = await getCertifications();
    return certsCache;
}

/** Load domains for a certification and store in state */
export async function linkCertification(certId) {
    if (!certId) {
        setState({ editingQuizCertId: null, certDomains: [] });
        return;
    }
    try {
        const cert = await getCertification(certId);
        setState({ editingQuizCertId: certId, certDomains: cert.domains || [] });
    } catch (e) {
        showToast('Failed to load certification domains', 'error');
    }
}

/** Save domain assignments after quiz save */
async function saveDomainAssignments(quizId) {
    const state = getState();
    if (!state.editingQuizCertId || !state.parsedQuestions) return;

    const questionDomainMap = {};
    state.parsedQuestions.forEach((q, i) => {
        if (q.domainIds && q.domainIds.length > 0) {
            // Map question index to domain IDs — backend will resolve by question_index
            questionDomainMap[i] = q.domainIds;
        }
    });

    if (Object.keys(questionDomainMap).length > 0) {
        try {
            await assignQuestionDomains(quizId, questionDomainMap);
        } catch (e) {
            console.error('Failed to save domain assignments:', e);
        }
    }
}

// Code language options for the dropdown
const CODE_LANGUAGES = [
    { value: '', label: 'None' },
    { value: 'powershell', label: 'PowerShell' },
    { value: 'bash', label: 'Bash/Shell' },
    { value: 'python', label: 'Python' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'json', label: 'JSON' },
    { value: 'yaml', label: 'YAML' },
    { value: 'sql', label: 'SQL' },
    { value: 'csharp', label: 'C#' },
    { value: 'xml', label: 'XML/HTML' },
    { value: 'ini', label: 'INI/Config' },
    { value: 'plaintext', label: 'Plain Text' },
];

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
[image: https://url.com/img.png | Alt text]
[code:powershell]
Get-Service | Where-Object {$_.Status -eq "Running"}
[/code]
A. Wrong
B. Correct *
C. Wrong
[explanation: Optional]

2. [order] Sort these:
1) First
2) Second

3. [tf] Is the sky blue?
True

4. [match] Match terms:
A. HTTP => 80
B. SSH => 22</pre></div>` : ''}
        <div class="flex gap-3 mt-6"><button class="btn btn-secondary flex-1" onclick="window.app.openVisual()">${icon('edit')} Visual Editor</button><button class="btn btn-primary flex-1" onclick="window.app.saveQuiz()">${icon('check')} Save Quiz</button></div>
    </main></div>`;
}

function renderVisual() {
    const state = getState();
    const questions = state.parsedQuestions || [];
    const q = questions[state.currentEditQuestion] || {};
    const qIdx = state.currentEditQuestion;
    
    // Trigger cert list load for dropdown
    ensureCertsLoaded().then(() => { if (getState().view === 'create') setState({}); });

    return `<div class="create-page"><header class="create-header"><div class="create-header-inner">
        <button class="btn btn-ghost" onclick="window.app.closeVisual()">← Text Mode</button>
        <h2>Visual Editor</h2>
        <div style="display:flex;align-items:center;gap:0.5rem">
            <select class="input" style="width:auto;min-width:180px;font-size:0.8rem;padding:0.4rem 0.6rem"
                onchange="window.app.linkCertification(this.value ? parseInt(this.value) : null)">
                <option value="">No Certification</option>
                ${(certsCache || []).map(c => `<option value="${c.id}" ${state.editingQuizCertId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
            </select>
            <button class="btn btn-primary" onclick="window.app.saveVisual()">Save Quiz</button>
        </div>
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
                    ${questions.length > 1 ? `<button class="btn btn-sm btn-ghost danger" onclick="window.app.deleteQ(${qIdx})">${icon('trash')} Delete</button>` : ''}
                </div>
                
                <div class="form-group">
                    <label class="label">Question Text</label>
                    <textarea id="ve-question-${qIdx}" class="textarea" rows="3" placeholder="Enter your question..."
                        onblur="window.app.saveField('question', this.value)">${escapeHtml(q.question || '')}</textarea>
                </div>
                
                <!-- PHASE 2: Image URL Field -->
                <div class="form-group">
                    <label class="label">Image URL <span class="text-muted">(optional)</span></label>
                    <div class="image-input-group">
                        <input type="url" id="ve-image-${qIdx}" class="input" placeholder="https://example.com/image.png"
                            value="${escapeHtml(q.image || '')}"
                            onblur="window.app.saveField('image', this.value)"
                            oninput="window.app.previewImage(this.value)">
                        ${q.image ? `<button class="btn btn-sm btn-ghost" onclick="window.app.clearImage()">Clear</button>` : ''}
                    </div>
                    ${q.image ? `<div class="image-preview"><img src="${escapeHtml(q.image)}" alt="Preview" onerror="this.parentElement.innerHTML='<span class=\\'text-error\\'>Failed to load image</span>'"></div>` : ''}
                    <p class="helper-text">Add a diagram, screenshot, or other visual</p>
                </div>
                
                <!-- PHASE 2: Code Block Section -->
                <div class="form-group">
                    <label class="label">Code Block <span class="text-muted">(optional)</span></label>
                    <div class="code-input-group">
                        <select id="ve-codelang-${qIdx}" class="input code-lang-select" 
                            onchange="window.app.saveField('codeLanguage', this.value)">
                            ${CODE_LANGUAGES.map(lang => `
                                <option value="${lang.value}" ${q.codeLanguage === lang.value ? 'selected' : ''}>
                                    ${lang.label}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <textarea id="ve-code-${qIdx}" class="textarea code-textarea" rows="4" 
                        placeholder="Paste code here..."
                        onblur="window.app.saveField('code', this.value)">${escapeHtml(q.code || '')}</textarea>
                    <p class="helper-text">Add a code snippet with syntax highlighting</p>
                </div>
                
                <div class="form-group">
                    <label class="label">Question Type</label>
                    <div class="type-selector">
                        <button class="type-btn${q.type === 'choice' ? ' active' : ''}" onclick="window.app.changeType('choice')">
                            <span class="type-btn-icon">${icon('circleCheck')}</span>
                            <span class="type-btn-label">Multiple Choice</span>
                        </button>
                        <button class="type-btn${q.type === 'ordering' ? ' active' : ''}" onclick="window.app.changeType('ordering')">
                            <span class="type-btn-icon">${icon('listOrdered')}</span>
                            <span class="type-btn-label">Ordering</span>
                        </button>
                        <button class="type-btn${q.type === 'truefalse' ? ' active' : ''}" onclick="window.app.changeType('truefalse')">
                            <span class="type-btn-icon">${icon('toggleLeft')}</span>
                            <span class="type-btn-label">True/False</span>
                        </button>
                        <button class="type-btn${q.type === 'matching' ? ' active' : ''}" onclick="window.app.changeType('matching')">
                            <span class="type-btn-icon">${icon('link')}</span>
                            <span class="type-btn-label">Matching</span>
                        </button>
                    </div>
                </div>
                
                ${state.certDomains.length > 0 ? `
                <div class="form-group">
                    <label class="label">Exam Domain <span class="text-muted">(optional)</span></label>
                    <select class="input" onchange="window.app.setQuestionDomain(this.value ? [parseInt(this.value)] : [])">
                        <option value="">No domain</option>
                        ${state.certDomains.map(d => `<option value="${d.id}" ${(q.domainIds || []).includes(d.id) ? 'selected' : ''}>${escapeHtml(d.code || '')} ${escapeHtml(d.name)}</option>`).join('')}
                    </select>
                    <p class="helper-text">Tag this question with an exam objective for analytics</p>
                </div>` : ''}

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
    return { choice: '&#10003;', ordering: '&#8597;', truefalse: '&#9889;', matching: '&#8596;' }[type] || '&#10003;';
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
    const optExps = q.optionExplanations || {};
    const showOptExp = q._showOptionExplanations || Object.keys(optExps).length > 0;
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
                ${showOptExp ? `
                <div class="option-exp-row">
                    <input type="text" class="input input-sm opt-exp-input"
                        placeholder="Why is ${String.fromCharCode(65 + i)} ${correct.includes(i) ? 'correct' : 'incorrect'}? (optional)"
                        id="optexp-${qIdx}-${i}"
                        value="${escapeHtml(optExps[i] || optExps[String(i)] || '')}"
                        onblur="window.app.saveOptionExplanation(${i}, this.value)">
                </div>
                ` : ''}
            `).join('')}
        </div>
        <div class="flex gap-2 mt-3">
            <button class="btn btn-sm btn-secondary" onclick="window.app.addOpt()">+ Add Option</button>
            ${!showOptExp ? `<button class="btn btn-sm btn-ghost" onclick="window.app.toggleOptionExplanations()">+ Add Option Explanations</button>` : ''}
        </div>
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
        setState({ view: 'create', quizTitle: quiz.title, quizData: questionsToText(quiz.questions), quizCategory: quiz.description || '', editingQuizId: id, visualEditorMode: false, editingQuizCertId: quiz.certification_id || null });
        // Load cert domains if quiz is linked to a certification
        if (quiz.certification_id) {
            linkCertification(quiz.certification_id);
        }
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
    const base = {
        question: '',
        type,
        explanation: null,
        optionExplanations: null,
        pairs: [],
        options: [],
        correct: [],
        // PHASE 2: New fields
        image: null,
        imageAlt: null,
        code: null,
        codeLanguage: null,
        // Domain tagging
        domainIds: [],
    };
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
    q[s.currentEditQuestion] = { ...q[s.currentEditQuestion], [field]: value || null };
    setState({ parsedQuestions: q });
}

// PHASE 2: Clear image
export function clearImage() {
    saveField('image', null);
    saveField('imageAlt', null);
}

// PHASE 2: Preview image (updates preview without saving)
export function previewImage(url) {
    const preview = document.querySelector('.image-preview');
    if (preview && url) {
        preview.innerHTML = `<img src="${escapeHtml(url)}" alt="Preview" onerror="this.parentElement.innerHTML='<span class=\\'text-error\\'>Failed to load image</span>'">`;
    } else if (preview && !url) {
        preview.remove();
    }
}

export function changeType(newType) {
    const s = getState();
    const current = s.parsedQuestions[s.currentEditQuestion];
    if (current.type === newType) return;
    
    const q = [...s.parsedQuestions];
    const newQ = createEmpty(newType);
    // Preserve existing fields
    newQ.question = current.question;
    newQ.explanation = current.explanation;
    newQ.optionExplanations = current.optionExplanations;
    newQ.image = current.image;
    newQ.imageAlt = current.imageAlt;
    newQ.code = current.code;
    newQ.codeLanguage = current.codeLanguage;
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

export function setQuestionDomain(domainIds) {
    saveField('domainIds', domainIds);
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
        const payload = {
            title: state.quizTitle,
            questions: state.parsedQuestions,
            description: state.quizCategory,
            color: getRandomColor(),
            certification_id: state.editingQuizCertId || null,
        };
        let quizId = state.editingQuizId;
        if (quizId) {
            await updateQuiz(quizId, payload);
        } else {
            const result = await createQuiz(payload);
            quizId = result.quizId;
        }
        // Save domain assignments if quiz is linked to a certification
        if (quizId && state.editingQuizCertId) {
            await saveDomainAssignments(quizId);
        }
        setState({ view: 'library', quizTitle: '', quizData: '', quizCategory: '', editingQuizId: null, visualEditorMode: false, parsedQuestions: null, editingQuizCertId: null, certDomains: [] });
        hideLoading();
    } catch (e) { hideLoading(); showToast(e.message || 'Failed', 'error'); }
}