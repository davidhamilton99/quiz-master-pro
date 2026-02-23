/* Study Guide Builder Component */
import { getState, setState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';
import { icon } from '../utils/icons.js';

// Component state
let studyGuideState = {
    uploadedFile: null,
    previewData: null,
    generatedHtml: null,
    isProcessing: false,
    error: null
};

export function renderStudyGuide() {
    const sg = studyGuideState;
    
    return `
    <nav class="navbar">
        <div class="container">
            <div class="navbar-inner">
                <div class="navbar-brand">
                    <div class="navbar-logo">Q</div>
                    <span class="hide-mobile">Quiz Master Pro</span>
                </div>
                <div class="flex items-center gap-2">
                    <button class="btn btn-ghost" onclick="window.app.navigate('library')">${icon('arrowLeft')} Back to Library</button>
                </div>
            </div>
        </div>
    </nav>
    
    <main class="container" style="padding: 2rem; max-width: 800px;">
        <div class="sg-header">
            <div class="sg-icon">${icon('bookOpen', 'icon-2xl')}</div>
            <div>
                <h1 class="sg-title">Study Guide Builder</h1>
                <p class="text-muted">Upload lecture notes and get a beautiful interactive study guide</p>
            </div>
        </div>
        
        ${sg.error ? `<div class="alert alert-error mb-4">${escapeHtml(sg.error)}</div>` : ''}
        
        ${sg.generatedHtml ? renderViewMode() : renderUploadMode()}
    </main>
    `;
}

function renderUploadMode() {
    const sg = studyGuideState;
    
    return `
    <div class="sg-upload-section">
        <div class="sg-dropzone ${sg.uploadedFile ? 'has-file' : ''}" 
             id="sg-dropzone"
             onclick="document.getElementById('sg-file-input').click()">
            
            ${sg.uploadedFile ? `
                <div class="sg-uploaded-file">
                    <div class="sg-file-icon">${icon('fileText', 'icon-lg')}</div>
                    <div class="sg-file-info">
                        <div class="sg-file-name">${escapeHtml(sg.uploadedFile.name)}</div>
                        <div class="sg-file-size">${formatFileSize(sg.uploadedFile.size)}</div>
                    </div>
                    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); window.app.sgClearFile()">✕</button>
                </div>
            ` : `
                <div class="sg-upload-prompt">
                    <div class="sg-upload-icon">${icon('upload', 'icon-2xl')}</div>
                    <div class="sg-upload-text">
                        <strong>Drop your file here</strong>
                        <span class="text-muted">or click to browse</span>
                    </div>
                    <div class="sg-upload-formats">Supports DOCX and PDF</div>
                </div>
            `}
            
            <input type="file" 
                   id="sg-file-input" 
                   accept=".docx,.pdf" 
                   onchange="window.app.sgHandleFile(event)"
                   style="display: none">
        </div>
    </div>
    
    ${sg.previewData ? renderPreview() : ''}
    
    ${sg.uploadedFile && !sg.isProcessing ? `
        <div class="sg-actions">
            <button class="btn btn-primary btn-lg btn-block" onclick="window.app.sgGenerate()">
                ${icon('sparkles')} Generate Study Guide
            </button>
        </div>
    ` : ''}
    
    ${sg.isProcessing ? `
        <div class="sg-processing">
            <div class="spinner"></div>
            <div class="sg-processing-text">Generating your study guide...</div>
        </div>
    ` : ''}
    `;
}

function renderPreview() {
    const sg = studyGuideState;
    if (!sg.previewData) return '';
    
    return `
    <div class="sg-preview-card">
        <div class="sg-preview-header">
            <h3>${icon('fileText')} Document Preview</h3>
        </div>
        <div class="sg-preview-content">
            <div class="sg-preview-title">${escapeHtml(sg.previewData.title)}</div>
            
            <div class="sg-preview-stats">
                <div class="sg-stat">
                    <div class="sg-stat-value">${sg.previewData.sections?.length || 0}</div>
                    <div class="sg-stat-label">Sections</div>
                </div>
                <div class="sg-stat">
                    <div class="sg-stat-value">${sg.previewData.key_terms?.length || 0}</div>
                    <div class="sg-stat-label">Key Terms</div>
                </div>
            </div>
            
            ${sg.previewData.sections?.length ? `
                <div class="sg-sections-list">
                    <div class="sg-section-title">Detected Sections:</div>
                    <ul>
                        ${sg.previewData.sections.map(s => `
                            <li>
                                <span class="sg-section-name">${escapeHtml(s.title)}</span>
                                <span class="sg-section-items">${s.items} items</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${sg.previewData.key_terms?.length ? `
                <div class="sg-terms-preview">
                    <div class="sg-section-title">Sample Key Terms:</div>
                    <div class="sg-terms-list">
                        ${sg.previewData.key_terms.slice(0, 8).map(t => 
                            `<span class="sg-term-badge">${escapeHtml(t)}</span>`
                        ).join('')}
                        ${sg.previewData.key_terms.length > 8 ? 
                            `<span class="sg-term-more">+${sg.previewData.key_terms.length - 8} more</span>` : ''}
                    </div>
                </div>
            ` : ''}
        </div>
    </div>
    `;
}

function renderViewMode() {
    return `
    <div class="sg-success-header">
        <h2>${icon('circleCheck')} Study Guide Generated!</h2>
        <div class="sg-success-actions">
            <button class="btn btn-primary" onclick="window.app.sgOpen()">
                ${icon('share')} Open in New Tab
            </button>
            <button class="btn btn-secondary" onclick="window.app.sgDownload()">
                ${icon('download')} Download HTML
            </button>
            <button class="btn btn-ghost" onclick="window.app.sgReset()">
                ${icon('rotateCcw')} Create Another
            </button>
        </div>
    </div>
    
    <div class="sg-preview-frame">
        <iframe id="sg-preview-iframe" class="sg-iframe" srcdoc="${escapeAttr(studyGuideState.generatedHtml)}"></iframe>
    </div>
    `;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Event handlers
export function sgHandleFile(event) {
    const file = event.target.files?.[0];
    if (file) processFile(file);
}

async function processFile(file) {
    const validExtensions = ['.docx', '.pdf'];
    if (!validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
        studyGuideState.error = 'Please upload a DOCX or PDF file';
        setState({ view: 'studyGuide' });
        return;
    }
    
    studyGuideState.uploadedFile = file;
    studyGuideState.previewData = null;
    studyGuideState.generatedHtml = null;
    studyGuideState.error = null;
    setState({ view: 'studyGuide' });
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/study-guide/preview', { method: 'POST', body: formData });
        const data = await response.json();
        
        if (data.success) {
            studyGuideState.previewData = data;
        } else {
            studyGuideState.error = data.error || 'Failed to preview file';
        }
        setState({ view: 'studyGuide' });
    } catch (err) {
        console.error('Preview error:', err);
        studyGuideState.error = 'Failed to preview file';
        setState({ view: 'studyGuide' });
    }
}

export function sgClearFile() {
    studyGuideState = { uploadedFile: null, previewData: null, generatedHtml: null, isProcessing: false, error: null };
    const input = document.getElementById('sg-file-input');
    if (input) input.value = '';
    setState({ view: 'studyGuide' });
}

export async function sgGenerate() {
    if (!studyGuideState.uploadedFile) return;
    
    studyGuideState.isProcessing = true;
    studyGuideState.error = null;
    setState({ view: 'studyGuide' });
    
    try {
        const formData = new FormData();
        formData.append('file', studyGuideState.uploadedFile);
        
        const response = await fetch('/api/study-guide/upload', { method: 'POST', body: formData });
        const data = await response.json();
        
        if (data.success) {
            studyGuideState.generatedHtml = data.html;
        } else {
            studyGuideState.error = data.error || 'Failed to generate study guide';
        }
    } catch (err) {
        console.error('Generation error:', err);
        studyGuideState.error = 'Failed to generate study guide. Please try again.';
    } finally {
        studyGuideState.isProcessing = false;
        setState({ view: 'studyGuide' });
    }
}

export function sgOpen() {
    if (!studyGuideState.generatedHtml) return;
    const blob = new Blob([studyGuideState.generatedHtml], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
}

export function sgDownload() {
    if (!studyGuideState.generatedHtml) return;
    const title = studyGuideState.previewData?.title || 'Study_Guide';
    const blob = new Blob([studyGuideState.generatedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = title.replace(/[^a-zA-Z0-9_.-]/g, '_') + '.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function sgReset() {
    studyGuideState = { uploadedFile: null, previewData: null, generatedHtml: null, isProcessing: false, error: null };
    setState({ view: 'studyGuide' });
}

export function initStudyGuideDragDrop() {
    const dropzone = document.getElementById('sg-dropzone');
    if (!dropzone) return;
    
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => { dropzone.classList.remove('dragover'); });
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer?.files?.[0];
        if (file) processFile(file);
    });
}
