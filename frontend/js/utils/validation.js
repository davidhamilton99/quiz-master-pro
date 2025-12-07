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