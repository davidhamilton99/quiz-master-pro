function renderCreate() {
            const isEdit = state.editingQuizId !== null;
            return `<nav class="navbar"><div class="container"><div class="navbar-inner"><button onclick="state.view='library';state.editingQuizId=null;state.quizTitle='';state.quizData='';state.quizCategory='';render()" class="btn btn-ghost">← Back</button><h2 style="font-size:1.125rem">${isEdit ? 'Edit Quiz' : 'Create Quiz'}</h2><button onclick="saveQuiz()" class="btn btn-accent">${isEdit ? 'Save' : 'Create'}</button></div></div></nav>
            <main style="padding:2rem 0"><div class="container-narrow"><div class="card" style="padding:2rem"><div style="margin-bottom:1.5rem"><label class="input-label">Title</label><input type="text" id="quizTitle" class="input" placeholder="Quiz title"></div><div style="margin-bottom:1.5rem"><label class="input-label">Category</label><input type="text" id="quizCategory" class="input" placeholder="e.g., Networking"></div><div><div class="flex justify-between items-center" style="margin-bottom:0.5rem"><label class="input-label">Questions</label><button onclick="state.showFormatHelp=!state.showFormatHelp;render()" class="btn btn-ghost btn-sm">${state.showFormatHelp ? 'Hide' : 'Show'} help</button></div>${state.showFormatHelp ? `<div class="card" style="padding:1.5rem;margin-bottom:1rem;background:var(--cream)">
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

<p class="text-sm font-semibold" style="margin-bottom:0.5rem">With Code Block:</p>
<div class="format-example" style="margin-bottom:1rem">4. What does this command display?
[code]
show ip route
[/code]
A. Routing table *
B. Interface list
C. ARP cache</div>

<p class="text-sm font-semibold" style="margin-bottom:0.5rem">With Image:</p>
<div class="format-example" style="margin-bottom:1rem">5. What topology is shown in this diagram?
[image: https://example.com/network.png]
A. Star *
B. Ring
C. Mesh</div>

<p class="text-sm font-semibold" style="margin-bottom:0.5rem">With Explanation:</p>
<div class="format-example" style="margin-bottom:1rem">6. What is the default admin distance for OSPF?
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
<li><code>[code]...[/code]</code> = code block</li>
<li><code>[image: URL]</code> = include an image</li>
<li><code>[explanation: text]</code> = show after answering</li>
</ul>
</div>
</div>` : ''}<textarea id="quizData" class="input" rows="20" placeholder="Enter questions..." style="font-family:monospace;font-size:0.875rem"></textarea></div></div></div></main>`;
        }
        
        function renderQuiz() {
            const q = state.currentQuiz.questions[state.currentQuestionIndex];
            const prog = ((state.currentQuestionIndex + 1) / state.currentQuiz.questions.length) * 100;
            const flagged = state.flaggedQuestions.has(state.currentQuestionIndex);
            const ua = state.answers[state.currentQuestionIndex] || [];
            let isCorrect = false;
            if (state.studyMode && state.showAnswer) {
                if (q.type === 'choice') { const as = new Set(ua), cs = new Set(q.correct); isCorrect = as.size === cs.size && [...as].every(a => cs.has(a)); }
                else if (q.type === 'ordering') isCorrect = JSON.stringify(ua) === JSON.stringify(q.correct);
            }
            
            let optHTML = '';
            if (q.type === 'ordering') {
                const order = state.answers[state.currentQuestionIndex] || q.options.map((_, i) => i);
                optHTML = `<div class="flex flex-col gap-sm">${order.map((oi, pos) => `<div draggable="true" class="draggable-item ${state.studyMode && state.showAnswer ? (q.correct[pos] === oi ? 'correct' : 'incorrect') : ''}" data-position="${pos}"><span class="drag-handle">☰</span><span class="drag-number">${pos + 1}</span><span style="flex:1">${escapeHtml(q.options[oi])}</span></div>`).join('')}</div><p class="text-sm text-muted" style="margin-top:1rem">${state.studyMode && !state.showAnswer ? '💡 Drag to reorder, then click Check Answer' : '💡 Drag to reorder'}</p>`;
            } else {
                optHTML = q.options.map((opt, i) => {
                    const sel = ua.includes(i), corr = q.correct.includes(i);
                    let cls = 'option-btn';
                    if (state.studyMode && state.showAnswer) { if (corr) cls += ' correct'; else if (sel) cls += ' incorrect'; }
                    else if (sel) cls += ' selected';
                    return `<button class="${cls}" onclick="selectAnswer(${i})" ${state.studyMode && state.showAnswer ? 'disabled' : ''}><span class="option-letter">${String.fromCharCode(65 + i)}</span><span style="flex:1">${escapeHtml(opt)}</span>${state.studyMode && state.showAnswer && corr ? '<span class="badge badge-success">✓</span>' : ''}${state.studyMode && state.showAnswer && sel && !corr ? '<span class="badge badge-error">✗</span>' : ''}</button>`;
                }).join('');
            }
            
            return `<div style="min-height:100vh;background:var(--paper)"><header class="quiz-header"><div class="container"><div class="flex justify-between items-center"><div class="flex items-center gap-md"><div class="flex gap-sm">
    <button onclick="saveAndExitQuiz()" class="btn btn-ghost btn-sm">💾 Save & Exit</button>
</div><div><h2 style="font-size:1rem;margin-bottom:2px">${escapeHtml(state.currentQuiz.title)}</h2><p class="text-xs text-muted">${state.studyMode ? '📖 Study' : '🎯 Quiz'}</p></div></div><div class="flex items-center gap-sm">${state.timerEnabled ? `<div class="badge" style="font-family:monospace;font-size:1rem;padding:0.5rem 1rem">⏱️ <span id="timer">${Math.floor(state.timeRemaining / 60)}:${(state.timeRemaining % 60).toString().padStart(2, '0')}</span></div>` : ''}${state.studyMode && state.streak > 0 ? `<div class="streak-badge">🔥 ${state.streak}</div>` : ''}<button onclick="toggleFlag()" class="btn btn-icon ${flagged ? 'btn-accent' : 'btn-ghost'}">${flagged ? '🚩' : '⚑'}</button></div></div></div></header>
            <div class="quiz-progress-section"><div class="container"><div class="flex justify-between items-center" style="margin-bottom:0.5rem"><span class="text-sm text-muted">Question ${state.currentQuestionIndex + 1} of ${state.currentQuiz.questions.length}</span><span class="text-sm font-semibold" style="color:var(--accent)">${Math.round(prog)}%</span></div><div class="progress-bar"><div class="progress-fill" style="width:${prog}%"></div></div></div></div>
            <div class="quiz-content"><div class="container-narrow">${state.studyMode && state.showAnswer ? `<div class="feedback-banner ${isCorrect ? 'correct' : 'incorrect'}" style="margin-bottom:1.5rem"><span style="font-size:1.25rem">${isCorrect ? '✓' : '✗'}</span><span>${isCorrect ? 'Correct!' : 'Incorrect'}</span>${isCorrect && state.streak > 1 ? `<span class="streak-badge" style="margin-left:auto">🔥 ${state.streak}</span>` : ''}</div>` : ''}
            <div class="card" style="padding:2rem;margin-bottom:1.5rem"><div class="flex items-start gap-md" style="margin-bottom:2rem"><div class="question-number">${state.currentQuestionIndex + 1}</div><h2 class="question-text">${escapeHtml(q.question)}</h2></div>${q.code ? `<div class="code-block" style="margin-bottom:1.5rem"><div class="code-header"><div class="code-dot" style="background:#ef4444"></div><div class="code-dot" style="background:#f59e0b"></div><div class="code-dot" style="background:#22c55e"></div><span class="text-xs" style="margin-left:0.5rem;opacity:0.7">Code</span></div><div class="code-body">${escapeHtml(q.code)}</div></div>` : ''}${q.image ? `<img src="${escapeHtml(q.image)}" alt="Question image" style="max-width:100%;max-height:300px;border-radius:var(--radius-md);margin-bottom:1.5rem">` : ''}${q.correct.length > 1 && q.type === 'choice' ? `<div class="badge badge-accent" style="margin-bottom:1rem">Select all that apply (${q.correct.length} answers)</div>` : ''}<div class="flex flex-col gap-sm">${optHTML}</div>${state.studyMode && !state.showAnswer && (q.correct.length > 1 || q.type === 'ordering') ? `<button onclick="checkStudyAnswer();render()" class="btn btn-accent" style="margin-top:1.5rem;width:100%">Check Answer</button>` : ''}${state.studyMode && state.showAnswer && q.explanation ? `<div class="explanation-box" style="margin-top:1.5rem"><p class="font-semibold" style="margin-bottom:0.25rem">💡 Explanation</p><p>${escapeHtml(q.explanation)}</p></div>` : ''}</div></div></div>
            <footer class="quiz-footer"><div class="container"><div class="flex justify-between items-center gap-md"><button onclick="prevQuestion()" class="btn btn-ghost" ${state.currentQuestionIndex === 0 ? 'disabled' : ''}>← Prev</button><div class="flex gap-xs">${Array.from({length: Math.min(state.currentQuiz.questions.length, 10)}, (_, i) => { const idx = state.currentQuiz.questions.length <= 10 ? i : Math.max(0, Math.min(state.currentQuestionIndex - 4, state.currentQuiz.questions.length - 10)) + i; const cur = idx === state.currentQuestionIndex, ans = state.answers[idx] != null, fl = state.flaggedQuestions.has(idx); return `<button onclick="state.currentQuestionIndex=${idx};state.showAnswer=false;render()" class="btn btn-icon btn-sm" style="width:32px;height:32px;font-size:0.75rem;background:${cur ? 'var(--accent)' : ans ? 'var(--cream)' : 'transparent'};color:${cur ? 'white' : 'var(--ink)'};border:${fl ? '2px solid var(--accent)' : '1px solid var(--cream)'}">${idx + 1}</button>`; }).join('')}</div>${state.currentQuestionIndex === state.currentQuiz.questions.length - 1 ? `<button onclick="submitQuiz()" class="btn btn-accent">Submit</button>` : `<button onclick="nextQuestion()" class="btn btn-primary">Next →</button>`}</div></div></footer></div>`;
        }
        function saveAndExitQuiz() {
    saveQuizProgress();
    stopTimer();
    showToast('Progress saved!', 'success');
    state.view = 'library';
    state.currentQuiz = null;
    render();
}

function saveQuiz() {
    const title = state.quizTitle.trim();
    const data = state.quizData.trim();
    
    if (!title) { 
        showToast('Please enter a title', 'warning'); 
        return; 
    }
    if (!data) { 
        showToast('Please enter questions', 'warning'); 
        return; 
    }
    
    try {
        const qs = parseQuizData(data);
        if (qs.length === 0) { 
            showToast('Could not parse any questions. Check format.', 'error'); 
            return; 
        }
        
        // Validate each question
        const invalid = qs.find((q, i) => {
            if (q.type === 'choice' && q.correct.length === 0) return true;
            if (q.type === 'ordering' && q.correct.length !== q.options.length) return true;
            if (q.options.length < 2) return true;
            return false;
        });
        
        if (invalid) {
            showToast('Some questions are invalid (need correct answers & 2+ options)', 'error');
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
        
        state.quizTitle = ''; 
        state.quizData = ''; 
        state.quizCategory = ''; 
        state.editingQuizId = null; 
        state.view = 'library'; 
        await loadQuizzes(); 
        render();
    } catch (e) { 
        showToast('Failed to save quiz', 'error'); 
    }
}

function editQuiz(id) {
            try {
                const d = await apiCall(`/quizzes/${id}`); const qd = d.quiz || d;
                const txt = qd.questions.map((q, i) => {
                    let t = `${i + 1}. ${q.type === 'ordering' ? '[order] ' : ''}${q.question}\n`;
                    if (q.code) t += `[code]\n${q.code}\n[/code]\n`;
                    if (q.image) t += `[image: ${q.image}]\n`;
                    if (q.type === 'ordering') q.options.forEach((o, j) => t += `${q.correct[j] + 1}) ${o}\n`);
                    else q.options.forEach((o, j) => t += `${String.fromCharCode(65 + j)}. ${o}${q.correct.includes(j) ? ' *' : ''}\n`);
                    if (q.explanation) t += `[explanation: ${q.explanation}]\n`;
                    return t;
                }).join('\n');
                state.quizTitle = qd.title; state.quizData = txt; state.quizCategory = qd.description || ''; state.editingQuizId = id; state.view = 'create'; render();
            } catch (e) { showToast('Failed to load', 'error'); }
        }
        
        function parseQuizData(data) {
            const lines = data.split('\n').filter(l => l.trim()), questions = [];
            let i = 0;
            while (i < lines.length) {
                let line = lines[i].trim();
                if (line.match(/^\d+\./)) {
                    const isOrder = line.includes('[order]');
                    const qText = line.replace(/^\d+\./, '').replace('[order]', '').trim();
                    let q = { question: qText, type: isOrder ? 'ordering' : 'choice', options: [], correct: [], image: null, explanation: null, code: null };
                    i++;
                    if (i < lines.length && lines[i].trim() === '[code]') { i++; let cl = []; while (i < lines.length && lines[i].trim() !== '[/code]') { cl.push(lines[i]); i++; } if (i < lines.length) { q.code = cl.join('\n'); i++; } }
                    if (i < lines.length && lines[i].trim().match(/^\[image:\s*(.+?)\]/i)) { q.image = lines[i].trim().match(/^\[image:\s*(.+?)\]/i)[1]; i++; }
                    if (isOrder) { while (i < lines.length && lines[i].match(/^\d+\)/)) { const n = parseInt(lines[i].match(/^(\d+)\)/)[1]); q.options.push(lines[i].replace(/^\d+\)/, '').trim()); q.correct.push(n - 1); i++; } }
                    else { while (i < lines.length && lines[i].match(/^[A-Z]\./)) { const ot = lines[i].substring(2).trim(), ha = ot.endsWith('*'); q.options.push(ha ? ot.slice(0, -1).trim() : ot); if (ha) q.correct.push(q.options.length - 1); i++; } }
                    if (i < lines.length && lines[i].trim().match(/^\[explanation:\s*(.+?)\]/i)) { q.explanation = lines[i].trim().match(/^\[explanation:\s*(.+?)\]/i)[1]; i++; }
                    questions.push(q);
                } else i++;
            }
            return questions;
        }
        
        function exportQuizzes() { const d = state.quizzes.map(q => ({ title: q.title, description: q.description, questions: q.questions, color: q.color })); const b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `quiz-export-${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(u); showToast('Exported!', 'success'); }
        
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
function deleteFolder(id) { 
    if (!confirm('Delete folder? Quizzes will not be deleted.')) return; 
    state.folders = state.folders.filter(f => f.id !== id); 
    if (state.selectedFolder == id) state.selectedFolder = 'all'; 
    saveFolders(); 
    showToast('Deleted', 'success'); 
    render(); 
}

function deleteQuiz(id) { 
    if (!confirm('Delete this quiz?')) return; 
    try { 
        await apiCall(`/quizzes/${id}`, { method: 'DELETE' }); 
        
        // Remove from folders
        state.folders.forEach(f => {
            const idx = f.quizIds.indexOf(id);
            if (idx > -1) f.quizIds.splice(idx, 1);
        });
        saveFolders();
        
        // Remove from custom order
        const idx = state.customOrder.indexOf(id);
        if (idx > -1) state.customOrder.splice(idx, 1);
        saveCustomOrder();
        
        // Clear any saved progress
        clearQuizProgress(id);
        
        await loadQuizzes(); 
        showToast('Deleted', 'success'); 
        render(); 
    } catch (e) { 
        showToast('Failed to delete', 'error'); 
    } 
}

function exportQuizzes() { const d = state.quizzes.map(q => ({ title: q.title, description: q.description, questions: q.questions, color: q.color })); const b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `quiz-export-${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(u); showToast('Exported!', 'success'); }
        
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
function deleteFolder(id) { 
    if (!confirm('Delete folder? Quizzes will not be deleted.')) return; 
    state.folders = state.folders.filter(f => f.id !== id); 
    if (state.selectedFolder == id) state.selectedFolder = 'all'; 
    saveFolders(); 
    showToast('Deleted', 'success'); 
    render(); 
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
function deleteFolder(id) { 
    if (!confirm('Delete folder? Quizzes will not be deleted.')) return; 
    state.folders = state.folders.filter(f => f.id !== id); 
    if (state.selectedFolder == id) state.selectedFolder = 'all'; 
    saveFolders(); 
    showToast('Deleted', 'success'); 
    render(); 
}

function processImport() {
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
function deleteFolder(id) { 
    if (!confirm('Delete folder? Quizzes will not be deleted.')) return; 
    state.folders = state.folders.filter(f => f.id !== id); 
    if (state.selectedFolder == id) state.selectedFolder = 'all'; 
    saveFolders(); 
    showToast('Deleted', 'success'); 
    render(); 
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
function deleteFolder(id) { 
    if (!confirm('Delete folder? Quizzes will not be deleted.')) return; 
    state.folders = state.folders.filter(f => f.id !== id); 
    if (state.selectedFolder == id) state.selectedFolder = 'all'; 
    saveFolders(); 
    showToast('Deleted', 'success'); 
    render(); 
}

function processQuizletImport() {
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
function deleteFolder(id) { 
    if (!confirm('Delete folder? Quizzes will not be deleted.')) return; 
    state.folders = state.folders.filter(f => f.id !== id); 
    if (state.selectedFolder == id) state.selectedFolder = 'all'; 
    saveFolders(); 
    showToast('Deleted', 'success'); 
    render(); 
}