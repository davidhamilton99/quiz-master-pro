/* Import/Export Service */

import { escapeHtml } from '../utils/dom.js';
import { showToast } from '../utils/toast.js';

export const ExportService = {
    // Export to Anki format (tab-separated)
    toAnki(quiz) {
        let output = '';
        quiz.questions.forEach(q => {
            const front = q.question + (q.code ? '\n```\n' + q.code + '\n```' : '');
            let back = '';
            
            if (q.type === 'choice' && q.options) {
                back = q.options.filter((_, i) => q.correct.includes(i)).join(', ');
            } else if (q.type === 'ordering') {
                back = q.correct.map(i => q.options[i]).join(' → ');
            }
            
            if (q.explanation) back += '\n\n' + q.explanation;
            
            output += front.replace(/\t/g, '  ').replace(/\n/g, '<br>') + '\t' +
                     back.replace(/\t/g, '  ').replace(/\n/g, '<br>') + '\n';
        });
        return output;
    },
    
    // Export to CSV
    toCSV(quiz) {
        let csv = 'Question,Type,Options,Correct,Explanation\n';
        quiz.questions.forEach(q => {
            const question = '"' + q.question.replace(/"/g, '""') + '"';
            const type = q.type;
            const options = q.options ? '"' + q.options.join('; ').replace(/"/g, '""') + '"' : '';
            const correct = q.options ?
                '"' + q.options.filter((_, i) => q.correct.includes(i)).join('; ').replace(/"/g, '""') + '"' : '';
            const explanation = q.explanation ? '"' + q.explanation.replace(/"/g, '""') + '"' : '';
            csv += `${question},${type},${options},${correct},${explanation}\n`;
        });
        return csv;
    },
    
    // Export to Markdown
    toMarkdown(quiz) {
        let md = `# ${quiz.title}\n\n`;
        if (quiz.description) md += `*${quiz.description}*\n\n`;
        md += '---\n\n';
        
        quiz.questions.forEach((q, i) => {
            md += `## Question ${i + 1}\n\n${q.question}\n\n`;
            
            if (q.code) md += '```\n' + q.code + '\n```\n\n';
            
            if (q.type === 'ordering') {
                md += '**Correct order:**\n';
                q.correct.forEach((idx, pos) => {
                    md += `${pos + 1}. ${q.options[idx]}\n`;
                });
            } else {
                q.options.forEach((opt, j) => {
                    const mark = q.correct.includes(j) ? '✓' : '○';
                    md += `${mark} ${String.fromCharCode(65 + j)}. ${opt}\n`;
                });
            }
            
            if (q.explanation) md += `\n> 💡 ${q.explanation}\n`;
            md += '\n---\n\n';
        });
        
        return md;
    },
    
    // Export to JSON (for backup/import)
    toJSON(quiz) {
        return JSON.stringify({
            title: quiz.title,
            description: quiz.description || '',
            questions: quiz.questions,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        }, null, 2);
    },
    
    // Download file
    download(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    // Export quiz
    exportQuiz(quiz, format) {
        const filename = quiz.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        switch (format) {
            case 'anki':
                this.download(this.toAnki(quiz), `${filename}_anki.txt`, 'text/plain');
                showToast('Exported for Anki', 'success');
                break;
            case 'csv':
                this.download(this.toCSV(quiz), `${filename}.csv`, 'text/csv');
                showToast('Exported as CSV', 'success');
                break;
            case 'markdown':
                this.download(this.toMarkdown(quiz), `${filename}.md`, 'text/markdown');
                showToast('Exported as Markdown', 'success');
                break;
            case 'json':
                this.download(this.toJSON(quiz), `${filename}.json`, 'application/json');
                showToast('Exported as JSON', 'success');
                break;
        }
    }
};

export const ImportService = {
    // Parse JSON import
    parseJSON(content) {
        try {
            const data = JSON.parse(content);
            if (!data.title || !data.questions || !Array.isArray(data.questions)) {
                throw new Error('Invalid quiz format');
            }
            return {
                title: data.title,
                description: data.description || '',
                questions: data.questions
            };
        } catch (err) {
            throw new Error('Invalid JSON file');
        }
    },
    
    // Parse CSV import
    parseCSV(content) {
        const lines = content.split('\n').filter(l => l.trim());
        if (lines.length < 2) throw new Error('CSV file is empty');
        
        const questions = [];
        
        // Skip header
        for (let i = 1; i < lines.length; i++) {
            const parts = this.parseCSVLine(lines[i]);
            if (parts.length < 4) continue;
            
            const [question, type, optionsStr, correctStr, explanation] = parts;
            const options = optionsStr.split(';').map(o => o.trim()).filter(o => o);
            const correctAnswers = correctStr.split(';').map(c => c.trim()).filter(c => c);
            
            const correct = correctAnswers.map(ans => options.indexOf(ans)).filter(i => i >= 0);
            
            questions.push({
                question: question.trim(),
                type: type === 'ordering' ? 'ordering' : 'choice',
                options,
                correct: correct.length ? correct : [0],
                explanation: explanation?.trim() || null
            });
        }
        
        if (questions.length === 0) throw new Error('No valid questions found');
        
        return { title: 'Imported Quiz', description: '', questions };
    },
    
    // Helper to parse CSV line with quotes
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        
        return result;
    },
    
    // Import from file
    async importFile(file) {
        const content = await file.text();
        const ext = file.name.split('.').pop().toLowerCase();
        
        if (ext === 'json') {
            return this.parseJSON(content);
        } else if (ext === 'csv') {
            return this.parseCSV(content);
        } else {
            throw new Error('Unsupported file format. Use .json or .csv');
        }
    }
};

// Show export modal
export function showExportModal(quiz) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'export-modal';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>📤 Export Quiz</h2>
                <button class="btn btn-icon btn-ghost" onclick="document.getElementById('export-modal').remove()">✕</button>
            </div>
            <div class="modal-body">
                <p class="text-muted mb-4">${escapeHtml(quiz.title)}</p>
                <div class="export-grid">
                    <button class="export-opt" onclick="window.app.exportAs('${quiz.id}', 'json')">
                        <span class="export-icon">📦</span>
                        <span class="export-label">JSON</span>
                        <span class="export-desc">Backup / Import</span>
                    </button>
                    <button class="export-opt" onclick="window.app.exportAs('${quiz.id}', 'anki')">
                        <span class="export-icon">🎴</span>
                        <span class="export-label">Anki</span>
                        <span class="export-desc">Flashcards</span>
                    </button>
                    <button class="export-opt" onclick="window.app.exportAs('${quiz.id}', 'csv')">
                        <span class="export-icon">📊</span>
                        <span class="export-label">CSV</span>
                        <span class="export-desc">Excel / Sheets</span>
                    </button>
                    <button class="export-opt" onclick="window.app.exportAs('${quiz.id}', 'markdown')">
                        <span class="export-icon">📝</span>
                        <span class="export-label">Markdown</span>
                        <span class="export-desc">Notion / Obsidian</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Show import modal
export function showImportModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'import-modal';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
    
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>📥 Import Quiz</h2>
                <button class="btn btn-icon btn-ghost" onclick="document.getElementById('import-modal').remove()">✕</button>
            </div>
            <div class="modal-body">
                <p class="text-muted mb-4">Import a quiz from JSON or CSV file</p>
                
                <label class="card card-hover" style="display:block;cursor:pointer;text-align:center;padding:2rem">
                    <input type="file" accept=".json,.csv" style="display:none" onchange="window.app.handleImportFile(this.files[0])">
                    <div style="font-size:2rem;margin-bottom:0.5rem">📁</div>
                    <div class="font-medium">Click to select file</div>
                    <div class="text-sm text-muted mt-1">.json or .csv</div>
                </label>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}
