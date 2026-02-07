/* Study Guide Builder Component for Quiz Master Pro */
import { getState, setState } from '../state.js';
import { escapeHtml } from '../utils/dom.js';

// Study guide state
let uploadedFile = null;
let previewData = null;
let generatedHtml = null;
let isProcessing = false;

export function renderStudyGuide() {
    const state = getState();
    
    return `
    <nav class="navbar">
        <div class="container">
            <div class="navbar-inner">
                <div class="navbar-brand">
                    <div class="navbar-logo">Q</div>
                    <span class="hide-mobile">Quiz Master Pro</span>
                </div>
                <div class="flex items-center gap-2">
                    <button class="btn btn-ghost" onclick="window.app.navigate('library')">← Back</button>
                </div>
            </div>
        </div>
    </nav>
    
    <main class="container" style="padding: 2rem; max-width: 800px;">
        <div class="study-guide-header">
            <div class="study-guide-icon">📚</div>
            <div>
                <h1 class="study-guide-title">Study Guide Builder</h1>
                <p class="text-muted">Upload your lecture notes and get a beautiful, interactive study guide</p>
            </div>
        </div>
        
        ${generatedHtml ? renderViewMode() : renderUploadMode()}
    </main>
    `;
}

function renderUploadMode() {
    return `
    <div class="upload-section">
        <div class="upload-dropzone ${uploadedFile ? 'has-file' : ''}" 
             id="dropzone"
             ondragover="event.preventDefault(); this.classList.add('dragover')"
             ondragleave="this.classList.remove('dragover')"
             ondrop="window.app.handleStudyGuideDrop(event)">
            
            ${uploadedFile ? `
                <div class="uploaded-file">
                    <div class="file-icon">${uploadedFile.name.endsWith('.pdf') ? '📄' : '📝'}</div>
                    <div class="file-info">
                        <div class="file-name">${escapeHtml(uploadedFile.name)}</div>
                        <div class="file-size">${formatFileSize(uploadedFile.size)}</div>
                    </div>
                    <button class="btn btn-ghost btn-sm" onclick="window.app.clearStudyGuideFile()">✕</button>
                </div>
            ` : `
                <div class="upload-prompt">
                    <div class="upload-icon">📤</div>
                    <div class="upload-text">
                        <strong>Drop your file here</strong>
                        <span class="text-muted">or click to browse</span>
                    </div>
                    <div class="upload-formats">Supports DOCX and PDF</div>
                </div>
            `}
            
            <input type="file" 
                   id="file-input" 
                   accept=".docx,.pdf" 
                   onchange="window.app.handleStudyGuideFile(event)"
                   style="display: none">
        </div>
        
        ${!uploadedFile ? `
            <button class="btn btn-secondary btn-block mt-3" onclick="document.getElementById('file-input').click()">
                📁 Choose File
            </button>
        ` : ''}
    </div>
    
    ${previewData ? renderPreview() : ''}
    
    ${uploadedFile && !isProcessing ? `
        <div class="action-buttons">
            <button class="btn btn-primary btn-lg btn-block" onclick="window.app.generateStudyGuide()">
                ✨ Generate Study Guide
            </button>
        </div>
    ` : ''}
    
    ${isProcessing ? `
        <div class="processing-indicator">
            <div class="spinner"></div>
            <div class="processing-text">Generating your study guide...</div>
        </div>
    ` : ''}
    `;
}

function renderPreview() {
    if (!previewData) return '';
    
    return `
    <div class="preview-card">
        <div class="preview-header">
            <h3>📋 Preview</h3>
        </div>
        <div class="preview-content">
            <div class="preview-title">${escapeHtml(previewData.title)}</div>
            
            <div class="preview-stats">
                <div class="preview-stat">
                    <div class="preview-stat-value">${previewData.sections?.length || 0}</div>
                    <div class="preview-stat-label">Sections</div>
                </div>
                <div class="preview-stat">
                    <div class="preview-stat-value">${previewData.key_terms?.length || 0}</div>
                    <div class="preview-stat-label">Key Terms</div>
                </div>
            </div>
            
            ${previewData.sections?.length ? `
                <div class="preview-sections">
                    <div class="preview-section-title">Detected Sections:</div>
                    <ul class="preview-section-list">
                        ${previewData.sections.map(s => `
                            <li>
                                <span class="section-name">${escapeHtml(s.title)}</span>
                                <span class="section-items">${s.items} items</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${previewData.key_terms?.length ? `
                <div class="preview-terms">
                    <div class="preview-section-title">Sample Key Terms:</div>
                    <div class="terms-preview">
                        ${previewData.key_terms.slice(0, 10).map(t => 
                            `<span class="term-badge">${escapeHtml(t)}</span>`
                        ).join('')}
                        ${previewData.key_terms.length > 10 ? 
                            `<span class="term-more">+${previewData.key_terms.length - 10} more</span>` : ''}
                    </div>
                </div>
            ` : ''}
        </div>
    </div>
    `;
}

function renderViewMode() {
    return `
    <div class="view-mode-header">
        <h2>✅ Study Guide Generated!</h2>
        <div class="view-mode-actions">
            <button class="btn btn-primary" onclick="window.app.openStudyGuide()">
                🔗 Open in New Tab
            </button>
            <button class="btn btn-secondary" onclick="window.app.downloadStudyGuide()">
                💾 Download HTML
            </button>
            <button class="btn btn-ghost" onclick="window.app.resetStudyGuide()">
                🔄 Create Another
            </button>
        </div>
    </div>
    
    <div class="preview-frame-container">
        <iframe id="study-guide-preview" class="study-guide-preview" srcdoc="${escapeHtml(generatedHtml)}"></iframe>
    </div>
    `;
}

// File handling
export function handleStudyGuideFile(event) {
    const file = event.target.files?.[0];
    if (file) {
        processFile(file);
    }
}

export function handleStudyGuideDrop(event) {
    event.preventDefault();
    event.target.classList.remove('dragover');
    
    const file = event.dataTransfer?.files?.[0];
    if (file) {
        processFile(file);
    }
}

async function processFile(file) {
    const validTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf'
    ];
    const validExtensions = ['.docx', '.pdf'];
    
    const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!hasValidExtension) {
        alert('Please upload a DOCX or PDF file');
        return;
    }
    
    uploadedFile = file;
    previewData = null;
    generatedHtml = null;
    setState({ view: 'studyGuide' }); // Trigger re-render
    
    // Get preview
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/study-guide/preview', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            previewData = data;
            setState({ view: 'studyGuide' }); // Trigger re-render
        }
    } catch (err) {
        console.error('Preview error:', err);
    }
}

export function clearStudyGuideFile() {
    uploadedFile = null;
    previewData = null;
    generatedHtml = null;
    document.getElementById('file-input').value = '';
    setState({ view: 'studyGuide' });
}

export async function generateStudyGuide() {
    if (!uploadedFile) return;
    
    isProcessing = true;
    setState({ view: 'studyGuide' });
    
    try {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        
        const response = await fetch('/api/study-guide/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            generatedHtml = data.html;
        } else {
            alert(data.error || 'Failed to generate study guide');
        }
    } catch (err) {
        console.error('Generation error:', err);
        alert('Failed to generate study guide. Please try again.');
    } finally {
        isProcessing = false;
        setState({ view: 'studyGuide' });
    }
}

export function openStudyGuide() {
    if (!generatedHtml) return;
    
    const blob = new Blob([generatedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
}

export function downloadStudyGuide() {
    if (!generatedHtml) return;
    
    const blob = new Blob([generatedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${previewData?.title || 'Study_Guide'}.html`.replace(/[^a-zA-Z0-9_.-]/g, '_');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function resetStudyGuide() {
    uploadedFile = null;
    previewData = null;
    generatedHtml = null;
    isProcessing = false;
    setState({ view: 'studyGuide' });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// CSS for the component
export const studyGuideStyles = `
/* Study Guide Builder Styles */
.study-guide-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--border);
}

.study-guide-icon {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--primary), #06b6d4);
    border-radius: 16px;
    font-size: 2rem;
    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.3);
}

.study-guide-title {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
}

/* Upload Section */
.upload-section {
    margin-bottom: 2rem;
}

.upload-dropzone {
    border: 2px dashed var(--border);
    border-radius: 16px;
    padding: 3rem 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;
    background: var(--bg-secondary);
}

.upload-dropzone:hover,
.upload-dropzone.dragover {
    border-color: var(--primary);
    background: rgba(99, 102, 241, 0.05);
}

.upload-dropzone.has-file {
    padding: 1.5rem;
    cursor: default;
}

.upload-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
}

.upload-icon {
    font-size: 3rem;
    opacity: 0.7;
}

.upload-text {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.upload-formats {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.5rem;
}

/* Uploaded File */
.uploaded-file {
    display: flex;
    align-items: center;
    gap: 1rem;
    text-align: left;
}

.file-icon {
    font-size: 2.5rem;
}

.file-info {
    flex: 1;
}

.file-name {
    font-weight: 600;
    margin-bottom: 0.25rem;
}

.file-size {
    font-size: 0.875rem;
    color: var(--text-muted);
}

/* Preview Card */
.preview-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    margin-bottom: 2rem;
}

.preview-header {
    padding: 1rem 1.5rem;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border);
}

.preview-header h3 {
    margin: 0;
    font-size: 1rem;
}

.preview-content {
    padding: 1.5rem;
}

.preview-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: var(--primary);
}

.preview-stats {
    display: flex;
    gap: 2rem;
    margin-bottom: 1.5rem;
}

.preview-stat {
    text-align: center;
}

.preview-stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary);
}

.preview-stat-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
}

.preview-section-title {
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: var(--text-muted);
}

.preview-section-list {
    list-style: none;
    padding: 0;
    margin: 0 0 1.5rem;
}

.preview-section-list li {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border);
}

.preview-section-list li:last-child {
    border-bottom: none;
}

.section-name {
    font-weight: 500;
}

.section-items {
    color: var(--text-muted);
    font-size: 0.875rem;
}

.terms-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.term-badge {
    background: rgba(99, 102, 241, 0.15);
    border: 1px solid rgba(99, 102, 241, 0.3);
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    color: var(--primary);
}

.term-more {
    color: var(--text-muted);
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
}

/* Action Buttons */
.action-buttons {
    margin-top: 1.5rem;
}

/* Processing Indicator */
.processing-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 3rem;
    text-align: center;
}

.spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.processing-text {
    color: var(--text-muted);
}

/* View Mode */
.view-mode-header {
    text-align: center;
    margin-bottom: 2rem;
}

.view-mode-header h2 {
    color: var(--success);
    margin-bottom: 1rem;
}

.view-mode-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
}

.preview-frame-container {
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    background: #0a0a0f;
}

.study-guide-preview {
    width: 100%;
    height: 600px;
    border: none;
}

/* Responsive */
@media (max-width: 640px) {
    .study-guide-header {
        flex-direction: column;
        text-align: center;
    }
    
    .preview-stats {
        justify-content: center;
    }
    
    .view-mode-actions {
        flex-direction: column;
    }
    
    .view-mode-actions .btn {
        width: 100%;
    }
}
`;
