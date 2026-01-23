/* Import/Export Service */
import { escapeHtml } from '../utils/dom.js';
import { showToast } from '../utils/toast.js';

export const ExportService = {
    toAnki(quiz) {
        return quiz.questions.map(q => {
            const front = q.question + (q.code ? '\n```\n' + q.code + '\n```' : '');
            let back = q.options ? q.options.filter((_, i) => q.correct.includes(i)).join(', ') : '';
            if (q.explanation) back += '\n\n' + q.explanation;
            return front.replace(/\t/g, '  ').replace(/\n/g, '<br>') + '\t' + back.replace(/\t/g, '  ').replace(/\n/g, '<br>');
        }).join('\n');
    },
    toCSV(quiz) {
        let csv = 'Question,Type,Options,Correct,Explanation\n';
        quiz.questions.forEach(q => {
            csv += `"${q.question.replace(/"/g, '""')}",${q.type},"${(q.options||[]).join('; ').replace(/"/g, '""')}","${q.options ? q.options.filter((_, i) => q.correct.includes(i)).join('; ').replace(/"/g, '""') : ''}","${(q.explanation||'').replace(/"/g, '""')}"\n`;
        });
        return csv;
    },
    toMarkdown(quiz) {
        let md = `# ${quiz.title}\n\n`;
        quiz.questions.forEach((q, i) => {
            md += `## Question ${i + 1}\n\n${q.question}\n\n`;
            if (q.code) md += '```\n' + q.code + '\n```\n\n';
            if (q.options) q.options.forEach((opt, j) => { md += `${q.correct.includes(j) ? '✓' : '○'} ${String.fromCharCode(65 + j)}. ${opt}\n`; });
            if (q.explanation) md += `\n> 💡 ${q.explanation}\n`;
            md += '\n---\n\n';
        });
        return md;
    },
    toJSON(quiz) {
        return JSON.stringify({ title: quiz.title, description: quiz.description || '', questions: quiz.questions, exportedAt: new Date().toISOString() }, null, 2);
    },
    download(content, filename, mime) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([content], { type: mime }));
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    },
    export(quiz, format) {
        const name = quiz.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const formats = {
            anki: [this.toAnki(quiz), `${name}_anki.txt`, 'text/plain'],
            csv: [this.toCSV(quiz), `${name}.csv`, 'text/csv'],
            markdown: [this.toMarkdown(quiz), `${name}.md`, 'text/markdown'],
            json: [this.toJSON(quiz), `${name}.json`, 'application/json']
        };
        if (formats[format]) { this.download(...formats[format]); showToast(`Exported as ${format.toUpperCase()}`, 'success'); }
    }
};

export const ImportService = {
    parseJSON(content) {
        const data = JSON.parse(content);
        if (!data.title || !data.questions) throw new Error('Invalid format');
        return data;
    },
    parseCSV(content) {
        const lines = content.split('\n').filter(l => l.trim());
        const questions = [];
        for (let i = 1; i < lines.length; i++) {
            const [question, type, optionsStr, correctStr, explanation] = this.parseCSVLine(lines[i]);
            const options = optionsStr.split(';').map(o => o.trim()).filter(o => o);
            const correctAnswers = correctStr.split(';').map(c => c.trim());
            const correct = correctAnswers.map(ans => options.indexOf(ans)).filter(i => i >= 0);
            if (question && options.length >= 2) questions.push({ question, type: type === 'ordering' ? 'ordering' : 'choice', options, correct: correct.length ? correct : [0], explanation: explanation || null });
        }
        return { title: 'Imported Quiz', questions };
    },
    parseCSVLine(line) {
        const result = []; let current = '', inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') { if (inQuotes && line[i+1] === '"') { current += '"'; i++; } else inQuotes = !inQuotes; }
            else if (line[i] === ',' && !inQuotes) { result.push(current); current = ''; }
            else current += line[i];
        }
        result.push(current);
        return result;
    },
    async fromFile(file) {
        const content = await file.text();
        return file.name.endsWith('.json') ? this.parseJSON(content) : this.parseCSV(content);
    }
};

export function showExportModal(quiz) {
    const m = document.createElement('div');
    m.className = 'modal-overlay'; m.id = 'export-modal';
    m.onclick = e => { if (e.target === m) m.remove(); };
    m.innerHTML = `<div class="modal"><div class="modal-header"><h2>📤 Export</h2><button class="btn btn-icon btn-ghost" onclick="document.getElementById('export-modal').remove()">✕</button></div><div class="modal-body"><p class="text-muted mb-4">${escapeHtml(quiz.title)}</p><div class="export-grid"><button class="export-opt" onclick="window.app.exportAs(${quiz.id},'json')"><span class="export-icon">📦</span><span class="export-label">JSON</span></button><button class="export-opt" onclick="window.app.exportAs(${quiz.id},'anki')"><span class="export-icon">🎴</span><span class="export-label">Anki</span></button><button class="export-opt" onclick="window.app.exportAs(${quiz.id},'csv')"><span class="export-icon">📊</span><span class="export-label">CSV</span></button><button class="export-opt" onclick="window.app.exportAs(${quiz.id},'markdown')"><span class="export-icon">📝</span><span class="export-label">Markdown</span></button></div></div></div>`;
    document.body.appendChild(m);
}

export function showImportModal() {
    const m = document.createElement('div');
    m.className = 'modal-overlay'; m.id = 'import-modal';
    m.onclick = e => { if (e.target === m) m.remove(); };
    m.innerHTML = `<div class="modal"><div class="modal-header"><h2>📥 Import</h2><button class="btn btn-icon btn-ghost" onclick="document.getElementById('import-modal').remove()">✕</button></div><div class="modal-body"><label class="card" style="display:block;cursor:pointer;text-align:center;padding:2rem"><input type="file" accept=".json,.csv" style="display:none" onchange="window.app.handleImport(this.files[0])"><div style="font-size:2rem">📁</div><div class="font-medium">Select file</div><div class="text-sm text-muted">.json or .csv</div></label></div></div>`;
    document.body.appendChild(m);
}
