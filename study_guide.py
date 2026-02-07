"""
Study Guide Builder - Backend Service for Quiz Master Pro
Parses DOCX/PDF files and generates beautiful HTML study guides

Add to your Flask app:
    from services.study_guide import register_study_guide_routes
    register_study_guide_routes(app, db)

Required packages:
    pip install python-docx PyPDF2
"""

import re
import html
import io
from datetime import datetime
from typing import Dict, List

# Document parsing - handle missing packages gracefully
try:
    from docx import Document
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False


class StudyGuideBuilder:
    """Parses documents and generates HTML study guides."""
    
    ICONS = ['🔐', '🧮', '📊', '#️⃣', '⚛️', '🔒', '📝', '💡', '🎯', '🔍', '📚', '🌐', '⚙️', '🔧', '📡']
    
    def __init__(self):
        self.key_terms = set()
        
    def parse_docx(self, file_stream) -> Dict:
        """Parse DOCX file and extract structured content."""
        if not DOCX_AVAILABLE:
            raise ImportError("python-docx required. Install: pip install python-docx")
        
        doc = Document(file_stream)
        content = {'title': '', 'subtitle': '', 'sections': [], 'key_terms': [], 'created_at': datetime.utcnow().isoformat()}
        
        current_section = None
        current_subsection = None
        
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
                
            style = para.style.name if para.style else 'Normal'
            
            # Extract bold/highlighted text as key terms
            for run in para.runs:
                if run.bold or run.font.highlight_color:
                    term = run.text.strip()
                    if 2 < len(term) < 80:
                        self.key_terms.add(term)
            
            if style == 'Title':
                content['title'] = text
            elif style == 'Subtitle':
                content['subtitle'] = text
            elif 'Heading 1' in style:
                current_section = {'title': text, 'level': 1, 'content': [], 'subsections': []}
                content['sections'].append(current_section)
                current_subsection = None
            elif 'Heading 2' in style:
                if current_section:
                    current_subsection = {'title': text, 'level': 2, 'content': []}
                    current_section['subsections'].append(current_subsection)
            elif 'Heading 3' in style:
                target = current_subsection or current_section
                if target:
                    target['content'].append({'type': 'subheading', 'text': text})
            elif 'List' in style:
                target = current_subsection or current_section
                if target:
                    if target['content'] and target['content'][-1].get('type') == 'list':
                        target['content'][-1]['items'].append(self._process_text(text))
                    else:
                        target['content'].append({'type': 'list', 'items': [self._process_text(text)]})
            else:
                target = current_subsection or current_section
                if target:
                    if self._is_formula(text):
                        target['content'].append({'type': 'formula', 'text': text})
                    elif self._is_important(text):
                        target['content'].append({'type': 'info', 'box_type': 'important', 'title': '⚠️ Important', 'text': self._process_text(text)})
                    else:
                        target['content'].append({'type': 'paragraph', 'text': self._process_text(text)})
        
        content['key_terms'] = list(self.key_terms)
        return content
    
    def parse_pdf(self, file_stream) -> Dict:
        """Parse PDF file and extract content."""
        if not PDF_AVAILABLE:
            raise ImportError("PyPDF2 required. Install: pip install PyPDF2")
        
        reader = PyPDF2.PdfReader(file_stream)
        content = {'title': 'Imported PDF', 'subtitle': '', 'sections': [], 'key_terms': [], 'created_at': datetime.utcnow().isoformat()}
        
        full_text = []
        for page in reader.pages:
            full_text.append(page.extract_text() or '')
        
        text = '\n'.join(full_text)
        lines = text.split('\n')
        
        current_section = None
        current_content = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            if self._looks_like_heading(line):
                if current_section:
                    current_section['content'] = current_content
                    content['sections'].append(current_section)
                current_section = {'title': line.title() if line.isupper() else line, 'level': 1, 'content': [], 'subsections': []}
                current_content = []
            elif current_section:
                if line.startswith(('•', '-', '*', '·')):
                    if current_content and current_content[-1].get('type') == 'list':
                        current_content[-1]['items'].append(self._process_text(line[1:].strip()))
                    else:
                        current_content.append({'type': 'list', 'items': [self._process_text(line[1:].strip())]})
                else:
                    current_content.append({'type': 'paragraph', 'text': self._process_text(line)})
        
        if current_section:
            current_section['content'] = current_content
            content['sections'].append(current_section)
        
        if not content['sections'] and full_text:
            content['sections'].append({'title': 'Document Content', 'level': 1, 'content': [{'type': 'paragraph', 'text': self._process_text(text[:5000])}], 'subsections': []})
        
        if content['sections']:
            content['title'] = content['sections'][0]['title']
        
        content['key_terms'] = list(self.key_terms)
        return content
    
    def _process_text(self, text: str) -> str:
        text = html.escape(text)
        for term in sorted(self.key_terms, key=len, reverse=True):
            escaped = html.escape(term)
            if escaped.lower() in text.lower():
                pattern = re.compile(re.escape(escaped), re.IGNORECASE)
                text = pattern.sub(lambda m: f'<span class="key-term">{m.group()}</span>', text, count=1)
        return text
    
    def _is_formula(self, text: str) -> bool:
        return any(x in text for x in ['=', '(mod', '×', '÷', '^']) and len(text) < 200
    
    def _is_important(self, text: str) -> bool:
        return any(text.lower().startswith(s) for s in ['important:', 'note:', 'warning:'])
    
    def _looks_like_heading(self, line: str) -> bool:
        if not line:
            return False
        if line.isupper() and 3 < len(line) < 60:
            return True
        if re.match(r'^(\d+\.)+\s+[A-Z]', line):
            return True
        return len(line) < 50 and not line.endswith('.') and line[0].isupper()
    
    def _slugify(self, text: str) -> str:
        text = re.sub(r'[^\w\s-]', '', text.lower())
        return re.sub(r'[\s_]+', '-', text)[:50]
    
    def generate_html(self, content: Dict) -> str:
        """Generate complete HTML study guide."""
        title = content.get('title', 'Study Guide')
        subtitle = content.get('subtitle', '')
        sections = content.get('sections', [])
        key_terms = content.get('key_terms', [])
        
        total_items = sum(len(s.get('content', [])) + sum(len(sub.get('content', [])) for sub in s.get('subsections', [])) for s in sections)
        read_time = max(5, total_items // 3)
        
        nav = '\n'.join(f'<a href="#{self._slugify(s["title"])}" class="nav-link">{self.ICONS[i % len(self.ICONS)]} {html.escape(s["title"][:30])}</a>' for i, s in enumerate(sections))
        nav += '\n<a href="#terms" class="nav-link">📋 Terms</a>'
        
        sections_html = self._render_sections(sections)
        terms_html = self._render_terms(key_terms)
        
        return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html.escape(title)} | Study Guide</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>{self._get_css()}</style>
</head>
<body>
<svg width="0" height="0"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#8b5cf6"/><stop offset="100%" style="stop-color:#06b6d4"/></linearGradient></defs></svg>

<header class="hero">
<div class="hero-content">
<div class="course-tag">📚 Study Guide</div>
<h1>{html.escape(title)}</h1>
{f'<p class="hero-subtitle">{html.escape(subtitle)}</p>' if subtitle else ''}
<div class="hero-stats">
<div class="stat"><div class="stat-value">{len(sections)}</div><div class="stat-label">Sections</div></div>
<div class="stat"><div class="stat-value">{len(key_terms)}</div><div class="stat-label">Key Terms</div></div>
<div class="stat"><div class="stat-value">~{read_time}</div><div class="stat-label">Min Read</div></div>
</div>
</div>
</header>

<nav class="nav-container"><div class="nav-scroll"><div class="nav-links">{nav}</div></div></nav>

<main class="main-content">{sections_html}{terms_html}</main>

<div class="progress-tracker">
<svg class="progress-ring" viewBox="0 0 48 48"><circle class="bg" cx="24" cy="24" r="20"/><circle class="progress" cx="24" cy="24" r="20" stroke-dasharray="125.6" stroke-dashoffset="125.6"/></svg>
<div class="progress-text"><div class="progress-percent">0%</div><div style="color:var(--text-muted);font-size:0.7rem">Complete</div></div>
</div>
<button class="print-btn" onclick="window.print()" title="Print">🖨️</button>

<script>{self._get_js()}</script>
</body>
</html>'''

    def _render_sections(self, sections: List[Dict]) -> str:
        parts = []
        for i, s in enumerate(sections):
            sid = self._slugify(s['title'])
            icon = self.ICONS[i % len(self.ICONS)]
            content = self._render_content(s.get('content', []))
            subs = ''.join(f'<div id="{self._slugify(sub["title"])}" class="subsection"><h3 class="subsection-title">{html.escape(sub["title"])}</h3>{self._render_content(sub.get("content", []))}</div>' for sub in s.get('subsections', []))
            parts.append(f'''<section id="{sid}" class="section"><div class="section-header"><div class="section-icon">{icon}</div><div class="section-meta"><div class="section-number">Section {i+1:02d}</div><h2 class="section-title">{html.escape(s["title"])}</h2></div></div>{content}{subs}</section>''')
        return '\n'.join(parts)
    
    def _render_content(self, content: List[Dict]) -> str:
        parts = []
        for b in content:
            t = b.get('type', 'paragraph')
            if t == 'paragraph':
                parts.append(f'<p>{b["text"]}</p>')
            elif t == 'subheading':
                parts.append(f'<h4 class="content-subheading">{html.escape(b["text"])}</h4>')
            elif t == 'list':
                items = ''.join(f'<li>{item}</li>' for item in b['items'])
                parts.append(f'<ul class="bullet-list">{items}</ul>')
            elif t == 'formula':
                parts.append(f'<div class="formula"><code>{html.escape(b["text"])}</code></div>')
            elif t == 'info':
                parts.append(f'<div class="info-box {b.get("box_type", "tip")}"><div class="info-box-header">{b.get("title", "Note")}</div><p>{b["text"]}</p></div>')
        return '\n'.join(parts)
    
    def _render_terms(self, terms: List[str]) -> str:
        if not terms:
            return ''
        chips = ''.join(f'<div class="term-chip">{html.escape(t)}</div>' for t in sorted(set(terms))[:40])
        return f'<section id="terms" class="quick-ref"><h2>📋 Key Terms Reference</h2><div class="terms-cloud">{chips}</div></section>'
    
    def _get_css(self) -> str:
        return ''':root{--bg-dark:#0a0a0f;--bg-card:#13131a;--bg-elevated:#1a1a24;--text-primary:#f5f5f7;--text-secondary:#a1a1aa;--text-muted:#71717a;--primary:#8b5cf6;--primary-light:#a78bfa;--primary-glow:rgba(139,92,246,0.4);--accent:#06b6d4;--success:#10b981;--warning:#f59e0b;--danger:#ef4444;--border:rgba(255,255,255,0.08)}*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}body{font-family:'Inter',-apple-system,sans-serif;background:var(--bg-dark);color:var(--text-primary);line-height:1.7}.hero{position:relative;padding:4rem 2rem 3rem;background:linear-gradient(135deg,rgba(139,92,246,0.15),rgba(6,182,212,0.1));border-bottom:1px solid var(--border);overflow:hidden}.hero::before{content:'';position:absolute;inset:-50%;background:radial-gradient(circle at 30% 50%,var(--primary-glow),transparent 50%);opacity:0.3;animation:pulse 8s ease-in-out infinite}@keyframes pulse{0%,100%{transform:scale(1);opacity:0.3}50%{transform:scale(1.1);opacity:0.4}}.hero-content{position:relative;max-width:1000px;margin:0 auto}.course-tag{display:inline-flex;padding:0.5rem 1rem;background:linear-gradient(135deg,var(--primary),var(--accent));border-radius:2rem;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:1rem}.hero h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;line-height:1.1;margin-bottom:0.5rem;background:linear-gradient(135deg,#fff,var(--primary-light),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent}.hero-subtitle{font-size:1.1rem;color:var(--text-secondary);margin-bottom:2rem}.hero-stats{display:flex;gap:2rem;flex-wrap:wrap}.stat{text-align:center}.stat-value{font-size:2rem;font-weight:700;background:linear-gradient(135deg,var(--primary-light),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent}.stat-label{font-size:0.75rem;color:var(--text-muted);text-transform:uppercase}.nav-container{position:sticky;top:0;z-index:100;background:rgba(10,10,15,0.9);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}.nav-scroll{max-width:1200px;margin:0 auto;padding:0 1rem;overflow-x:auto}.nav-scroll::-webkit-scrollbar{display:none}.nav-links{display:flex;gap:0.25rem;padding:0.75rem 0;min-width:max-content}.nav-link{padding:0.5rem 1rem;color:var(--text-secondary);text-decoration:none;font-size:0.875rem;font-weight:500;border-radius:0.5rem;transition:all 0.2s;white-space:nowrap}.nav-link:hover{color:var(--text-primary);background:var(--bg-elevated)}.nav-link.active{color:var(--primary-light);background:rgba(139,92,246,0.15)}.main-content{max-width:900px;margin:0 auto;padding:2rem 1.5rem 4rem}.section{margin-bottom:4rem;scroll-margin-top:80px}.section-header{display:flex;align-items:flex-start;gap:1rem;margin-bottom:2rem}.section-icon{width:56px;height:56px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--primary),var(--accent));border-radius:16px;font-size:1.75rem;flex-shrink:0;box-shadow:0 8px 32px var(--primary-glow)}.section-meta{flex:1}.section-number{font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:var(--primary-light);margin-bottom:0.25rem}.section-title{font-size:1.75rem;font-weight:700;line-height:1.2}.subsection{margin:2rem 0;padding-left:1rem;border-left:3px solid var(--border)}.subsection-title{color:var(--accent);font-size:1.1rem;margin-bottom:1rem}.content-subheading{color:var(--primary-light);margin:1.5rem 0 0.75rem}p{margin:1rem 0;color:var(--text-secondary)}.key-term{background:linear-gradient(135deg,rgba(139,92,246,0.2),rgba(6,182,212,0.15));border:1px solid rgba(139,92,246,0.3);padding:0.1rem 0.5rem;border-radius:4px;font-weight:600;color:var(--primary-light)}.bullet-list{list-style:none;margin:1.5rem 0;padding:0}.bullet-list li{position:relative;padding:0.875rem 0 0.875rem 2rem;border-bottom:1px solid var(--border);color:var(--text-secondary)}.bullet-list li:last-child{border-bottom:none}.bullet-list li::before{content:'';position:absolute;left:0;top:1.25rem;width:8px;height:8px;background:linear-gradient(135deg,var(--primary),var(--accent));border-radius:50%}.formula{font-family:'JetBrains Mono',monospace;background:var(--bg-elevated);border:1px solid var(--border);border-radius:12px;padding:1.25rem 1.5rem;margin:1.5rem 0;overflow-x:auto;color:var(--accent)}.info-box{background:var(--bg-card);border-radius:12px;padding:1.25rem 1.5rem;margin:1.5rem 0;border-left:4px solid var(--primary)}.info-box.important{border-color:var(--warning);background:rgba(245,158,11,0.08)}.info-box.tip{border-color:var(--success);background:rgba(16,185,129,0.08)}.info-box.danger{border-color:var(--danger);background:rgba(239,68,68,0.08)}.info-box-header{display:flex;align-items:center;gap:0.5rem;font-weight:600;margin-bottom:0.5rem;color:var(--primary-light)}.info-box.important .info-box-header{color:var(--warning)}.info-box.tip .info-box-header{color:var(--success)}.info-box p{color:var(--text-secondary);margin:0}.quick-ref{margin-top:4rem;padding-top:2rem;border-top:1px solid var(--border)}.quick-ref h2{font-size:1.5rem;margin-bottom:1.5rem}.terms-cloud{display:flex;flex-wrap:wrap;gap:0.75rem}.term-chip{padding:0.625rem 1.25rem;background:var(--bg-card);border:1px solid var(--border);border-radius:2rem;font-size:0.875rem;color:var(--text-secondary);transition:all 0.2s}.term-chip:hover{border-color:var(--primary);color:var(--primary-light);transform:translateY(-2px)}.progress-tracker{position:fixed;bottom:2rem;right:2rem;background:var(--bg-card);border:1px solid var(--border);border-radius:1rem;padding:1rem 1.25rem;display:flex;align-items:center;gap:1rem;box-shadow:0 20px 40px rgba(0,0,0,0.4);z-index:100}.progress-ring{width:48px;height:48px;transform:rotate(-90deg)}.progress-ring circle{fill:none;stroke-width:4}.progress-ring .bg{stroke:var(--border)}.progress-ring .progress{stroke:url(#grad);stroke-linecap:round;transition:stroke-dashoffset 0.5s}.progress-percent{font-size:1.25rem;font-weight:700;background:linear-gradient(135deg,var(--primary-light),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent}.print-btn{position:fixed;bottom:2rem;left:2rem;width:48px;height:48px;background:var(--bg-card);border:1px solid var(--border);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.25rem;cursor:pointer;transition:all 0.2s;z-index:100}.print-btn:hover{background:var(--primary);border-color:var(--primary);transform:translateY(-2px)}@media(max-width:768px){.hero{padding:2rem 1rem}.section-header{flex-direction:column;gap:0.75rem}.section-icon{width:48px;height:48px;font-size:1.5rem}.progress-tracker{bottom:1rem;right:1rem;padding:0.75rem 1rem}.print-btn{bottom:1rem;left:1rem;width:40px;height:40px}}@media print{.nav-container,.progress-tracker,.print-btn{display:none!important}body{background:#fff;color:#000}.hero{background:none;border:none}.hero::before{display:none}.hero h1{-webkit-text-fill-color:#000}.section{page-break-inside:avoid}.key-term{background:#eee;border-color:#ccc;color:#333}}'''
    
    def _get_js(self) -> str:
        return '''const sections=document.querySelectorAll('.section'),navLinks=document.querySelectorAll('.nav-link'),progressCircle=document.querySelector('.progress-ring .progress'),progressText=document.querySelector('.progress-percent'),circumference=125.6;function update(){const scrollHeight=document.documentElement.scrollHeight-window.innerHeight,progress=scrollHeight>0?(window.scrollY/scrollHeight)*100:0;progressCircle.style.strokeDashoffset=circumference-(progress/100)*circumference;progressText.textContent=Math.round(progress)+'%';let current='';sections.forEach(s=>{if(window.scrollY>=s.offsetTop-100)current=s.id});navLinks.forEach(l=>{l.classList.remove('active');if(l.getAttribute('href')==='#'+current)l.classList.add('active')})}window.addEventListener('scroll',update);update();navLinks.forEach(l=>l.addEventListener('click',e=>{e.preventDefault();document.querySelector(l.getAttribute('href'))?.scrollIntoView({behavior:'smooth'})}))'''


def register_study_guide_routes(app, db):
    """Register study guide API routes with Flask app."""
    from flask import request, jsonify
    from werkzeug.utils import secure_filename
    
    ALLOWED = {'docx', 'pdf'}
    
    def allowed(fn):
        return '.' in fn and fn.rsplit('.', 1)[1].lower() in ALLOWED
    
    @app.route('/api/study-guide/upload', methods=['POST'])
    def upload_study_guide():
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if not file.filename or not allowed(file.filename):
            return jsonify({'error': 'File type not supported. Use DOCX or PDF.'}), 400
        
        try:
            builder = StudyGuideBuilder()
            ext = secure_filename(file.filename).rsplit('.', 1)[1].lower()
            
            content = builder.parse_docx(file.stream) if ext == 'docx' else builder.parse_pdf(file.stream)
            html_content = builder.generate_html(content)
            
            return jsonify({
                'success': True,
                'title': content.get('title', 'Study Guide'),
                'sections': len(content.get('sections', [])),
                'key_terms': len(content.get('key_terms', [])),
                'html': html_content
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/study-guide/preview', methods=['POST'])
    def preview_study_guide():
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if not file.filename or not allowed(file.filename):
            return jsonify({'error': 'Unsupported file type'}), 400
        
        try:
            builder = StudyGuideBuilder()
            ext = secure_filename(file.filename).rsplit('.', 1)[1].lower()
            content = builder.parse_docx(file.stream) if ext == 'docx' else builder.parse_pdf(file.stream)
            
            return jsonify({
                'success': True,
                'title': content.get('title', 'Study Guide'),
                'sections': [{'title': s['title'], 'items': len(s.get('content', []))} for s in content.get('sections', [])],
                'key_terms': content.get('key_terms', [])[:20]
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
