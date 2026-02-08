#!/usr/bin/env python3
"""Quiz Master Pro - Backend Server"""

import sys
sys.path.insert(0, '/home/davidhamilton/.local/lib/python3.13/site-packages')

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import hashlib
import secrets
import json
import os
from datetime import datetime, timedelta
from functools import wraps

app = Flask(__name__, static_folder='/home/davidhamilton/quiz-master-pro/static')
CORS(app)

DATABASE = '/home/davidhamilton/quiz-master-pro/quiz_master.db'

# === Static Routes ===

@app.route('/')
def index():
    return send_from_directory('/home/davidhamilton/quiz-master-pro', 'index.html')

@app.route('/app')
def app_page():
    return send_from_directory('/home/davidhamilton/quiz-master-pro', 'index.html')

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('/home/davidhamilton/quiz-master-pro/static', filename)

# === Database ===

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        questions TEXT NOT NULL,
        color TEXT DEFAULT '#6366f1',
        is_public BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        total INTEGER NOT NULL,
        percentage INTEGER NOT NULL,
        answers TEXT NOT NULL,
        study_mode BOOLEAN DEFAULT 0,
        timed BOOLEAN DEFAULT 0,
        max_streak INTEGER DEFAULT 0,
        time_taken INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )''')
    
    c.execute('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_quizzes_user ON quizzes(user_id)')
    
    conn.commit()
    conn.close()

# === Auth Helpers ===

def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(32)
    h = hashlib.sha256((password + salt).encode()).hexdigest()
    return h, salt

def verify_password(password, hash, salt):
    computed, _ = hash_password(password, salt)
    return computed == hash

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '')
        if token.startswith('Bearer '):
            token = token[7:]
        if not token:
            return jsonify({'error': 'Token missing'}), 401
        
        conn = get_db()
        c = conn.cursor()
        c.execute('''SELECT s.user_id, u.username, u.email FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1''',
            (token, datetime.now()))
        session = c.fetchone()
        conn.close()
        
        if not session:
            return jsonify({'error': 'Invalid token'}), 401
        
        request.user_id = session['user_id']
        request.username = session['username']
        return f(*args, **kwargs)
    return decorated

# === Auth Routes ===

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not username or len(username) < 3:
        return jsonify({'error': 'Username must be 3+ characters'}), 400
    if not password or len(password) < 4:
        return jsonify({'error': 'Password must be 4+ characters'}), 400
    
    h, salt = hash_password(password)
    conn = get_db()
    c = conn.cursor()
    
    try:
        c.execute('INSERT INTO users (username, email, password_hash, salt) VALUES (?, ?, ?, ?)',
            (username, email or f'{username}@quiz.local', h, salt))
        user_id = c.lastrowid
        
        token = secrets.token_hex(32)
        c.execute('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
            (user_id, token, datetime.now() + timedelta(days=7)))
        
        conn.commit()
        return jsonify({'token': token, 'user': {'id': user_id, 'username': username}}), 201
    except sqlite3.IntegrityError as e:
        return jsonify({'error': 'Username taken'}), 409
    finally:
        conn.close()

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT id, username, password_hash, salt, is_active FROM users WHERE username = ?', (username,))
    user = c.fetchone()
    
    if not user or not user['is_active'] or not verify_password(password, user['password_hash'], user['salt']):
        conn.close()
        return jsonify({'error': 'Invalid credentials'}), 401
    
    token = secrets.token_hex(32)
    c.execute('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
        (user['id'], token, datetime.now() + timedelta(days=7)))
    c.execute('UPDATE users SET last_login = ? WHERE id = ?', (datetime.now(), user['id']))
    conn.commit()
    conn.close()
    
    return jsonify({'token': token, 'user': {'id': user['id'], 'username': user['username']}})

# === Quiz Routes ===

@app.route('/api/quizzes', methods=['GET'])
@token_required
def get_quizzes():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM quizzes WHERE user_id = ? ORDER BY last_modified DESC', (request.user_id,))
    quizzes = [dict(r) for r in c.fetchall()]
    for q in quizzes:
        q['questions'] = json.loads(q['questions'])
    conn.close()
    return jsonify({'quizzes': quizzes})

@app.route('/api/quizzes', methods=['POST'])
@token_required
def create_quiz():
    data = request.get_json()
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Title required'}), 400
    
    conn = get_db()
    c = conn.cursor()
    c.execute('INSERT INTO quizzes (user_id, title, description, questions, color) VALUES (?, ?, ?, ?, ?)',
        (request.user_id, title, data.get('description', ''), json.dumps(data.get('questions', [])), data.get('color', '#6366f1')))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Created', 'quiz_id': c.lastrowid}), 201

@app.route('/api/quizzes/<int:id>', methods=['GET'])
@token_required
def get_quiz(id):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM quizzes WHERE id = ? AND user_id = ?', (id, request.user_id))
    quiz = c.fetchone()
    conn.close()
    
    if not quiz:
        return jsonify({'error': 'Not found'}), 404
    
    q = dict(quiz)
    q['questions'] = json.loads(q['questions'])
    return jsonify({'quiz': q})

@app.route('/api/quizzes/<int:id>', methods=['PUT'])
@token_required
def update_quiz(id):
    data = request.get_json()
    conn = get_db()
    c = conn.cursor()
    c.execute('UPDATE quizzes SET title=?, description=?, questions=?, color=?, last_modified=? WHERE id=? AND user_id=?',
        (data.get('title'), data.get('description', ''), json.dumps(data.get('questions', [])), data.get('color', '#6366f1'), datetime.now(), id, request.user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Updated'})

@app.route('/api/quizzes/<int:id>', methods=['DELETE'])
@token_required
def delete_quiz(id):
    conn = get_db()
    c = conn.cursor()
    c.execute('DELETE FROM quizzes WHERE id = ? AND user_id = ?', (id, request.user_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Deleted'})

@app.route('/api/quizzes/<int:id>/attempts', methods=['POST'])
@token_required
def record_attempt(id):
    data = request.get_json()
    conn = get_db()
    c = conn.cursor()
    c.execute('''INSERT INTO attempts (quiz_id, user_id, score, total, percentage, answers, study_mode, timed, max_streak, time_taken)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (id, request.user_id, data.get('score', 0), data.get('total', 0), data.get('percentage', 0),
         json.dumps(data.get('answers', {})), data.get('study_mode', False), data.get('timed', False),
         data.get('max_streak', 0), data.get('time_taken')))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Recorded'}), 201

# === Study Guide Builder ===

import re
import html as html_module
from io import BytesIO

# Try to import document parsing libraries
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
    ICONS = ['🔐', '🧮', '📊', '#️⃣', '⚛️', '🔒', '📝', '💡', '🎯', '🔍', '📚', '🌐', '⚙️', '🔧', '📡']
    
    # Common words to ignore as key terms
    STOP_WORDS = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
        'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
        'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
        'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that',
        'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who',
        'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both',
        'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
        'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then',
        'once', 'if', 'unless', 'until', 'while', 'although', 'because', 'since', 'about',
        'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under',
        'again', 'further', 'once', 'always', 'never', 'often', 'sometimes', 'usually',
        'example', 'examples', 'way', 'ways', 'much', 'many', 'several', 'eve', 'even',
        'first', 'second', 'third', 'one', 'two', 'three', 'new', 'old', 'good', 'best'
    }
    
    def __init__(self):
        self.key_terms = set()
        
    def _is_valid_term(self, term):
        """Check if a term is worth highlighting."""
        term = term.strip()
        
        # Too short or too long
        if len(term) < 4 or len(term) > 100:
            return False
        
        # Single word checks
        words = term.lower().split()
        if len(words) == 1:
            # Single word must be at least 4 chars and not a stop word
            if term.lower() in self.STOP_WORDS:
                return False
            # Must contain letters
            if not any(c.isalpha() for c in term):
                return False
            return True
        
        # Multi-word phrase checks
        # Filter out phrases that are mostly stop words
        non_stop_words = [w for w in words if w not in self.STOP_WORDS]
        if len(non_stop_words) < len(words) * 0.4:  # Less than 40% meaningful words
            return False
        
        # Must have at least one substantial word
        if not any(len(w) >= 4 for w in non_stop_words):
            return False
            
        return True
    
    def _clean_term(self, term):
        """Clean up a term for consistency."""
        term = term.strip()
        # Remove trailing punctuation
        term = term.rstrip('.,;:!?')
        # Remove leading/trailing quotes
        term = term.strip('"\'""''')
        return term
    
    def _extract_key_terms_from_paragraph(self, para):
        """Extract key terms from bold/highlighted runs, combining adjacent runs."""
        terms = []
        current_term_parts = []
        
        for run in para.runs:
            is_key = run.bold or run.font.highlight_color
            text = run.text
            
            if is_key and text.strip():
                current_term_parts.append(text)
            else:
                # End of a key term sequence
                if current_term_parts:
                    full_term = ''.join(current_term_parts)
                    full_term = self._clean_term(full_term)
                    if self._is_valid_term(full_term):
                        terms.append(full_term)
                    current_term_parts = []
        
        # Don't forget the last term
        if current_term_parts:
            full_term = ''.join(current_term_parts)
            full_term = self._clean_term(full_term)
            if self._is_valid_term(full_term):
                terms.append(full_term)
        
        return terms
    
    def _extract_acronyms(self, text):
        """Extract acronyms like PKI, PFS, D-H, SHA-256, etc."""
        # Pattern for acronyms: 2+ uppercase letters, optionally with numbers/hyphens
        acronym_pattern = r'\b[A-Z][A-Z0-9][-A-Z0-9]*[A-Z0-9]\b'
        matches = re.findall(acronym_pattern, text)
        return [m for m in matches if len(m) >= 2 and m not in {'II', 'III', 'IV'}]
    
    def parse_docx(self, file_stream):
        if not DOCX_AVAILABLE:
            raise ImportError("python-docx required")
        
        doc = Document(file_stream)
        content = {'title': '', 'subtitle': '', 'sections': [], 'key_terms': []}
        current_section = None
        current_subsection = None
        all_text = []  # Collect all text for acronym extraction
        
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            
            all_text.append(text)
            style = para.style.name if para.style else 'Normal'
            
            # Extract key terms from bold/highlighted runs
            para_terms = self._extract_key_terms_from_paragraph(para)
            for term in para_terms:
                self.key_terms.add(term)
            
            if style == 'Title':
                content['title'] = text
            elif style == 'Subtitle':
                content['subtitle'] = text
            elif 'Heading 1' in style:
                current_section = {'title': text, 'level': 1, 'content': [], 'subsections': []}
                content['sections'].append(current_section)
                current_subsection = None
            elif 'Heading 2' in style and current_section:
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
                        target['content'][-1]['items'].append(text)  # Store raw, process later
                    else:
                        target['content'].append({'type': 'list', 'items': [text]})
            else:
                target = current_subsection or current_section
                if target:
                    if any(x in text for x in ['=', '(mod', '×', '÷']) and len(text) < 200:
                        target['content'].append({'type': 'formula', 'text': text})
                    else:
                        target['content'].append({'type': 'paragraph', 'text': text})
        
        # Extract acronyms from all text
        full_text = ' '.join(all_text)
        acronyms = self._extract_acronyms(full_text)
        for acr in acronyms:
            if len(acr) >= 2:
                self.key_terms.add(acr)
        
        # Now process all text with final key terms
        self._process_all_content(content)
        
        content['key_terms'] = sorted(list(self.key_terms), key=lambda x: (-len(x), x.lower()))
        return content
    
    def _process_all_content(self, content):
        """Process all content to add key term highlighting."""
        for section in content.get('sections', []):
            new_content = []
            for item in section.get('content', []):
                if item['type'] == 'paragraph':
                    item['text'] = self._process_text(item['text'])
                elif item['type'] == 'list':
                    item['items'] = [self._process_text(i) for i in item['items']]
                new_content.append(item)
            section['content'] = new_content
            
            for sub in section.get('subsections', []):
                new_sub_content = []
                for item in sub.get('content', []):
                    if item['type'] == 'paragraph':
                        item['text'] = self._process_text(item['text'])
                    elif item['type'] == 'list':
                        item['items'] = [self._process_text(i) for i in item['items']]
                    new_sub_content.append(item)
                sub['content'] = new_sub_content
    
    def parse_pdf(self, file_stream):
        if not PDF_AVAILABLE:
            raise ImportError("PyPDF2 required")
        
        reader = PyPDF2.PdfReader(file_stream)
        content = {'title': 'Imported PDF', 'sections': [], 'key_terms': []}
        
        full_text = '\n'.join(page.extract_text() or '' for page in reader.pages)
        
        # Extract acronyms
        acronyms = self._extract_acronyms(full_text)
        for acr in acronyms:
            self.key_terms.add(acr)
        
        lines = full_text.split('\n')
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
                    text = line[1:].strip()
                    if current_content and current_content[-1].get('type') == 'list':
                        current_content[-1]['items'].append(self._process_text(text))
                    else:
                        current_content.append({'type': 'list', 'items': [self._process_text(text)]})
                else:
                    current_content.append({'type': 'paragraph', 'text': self._process_text(line)})
        
        if current_section:
            current_section['content'] = current_content
            content['sections'].append(current_section)
        
        if not content['sections'] and full_text:
            content['sections'].append({'title': 'Document Content', 'level': 1, 'content': [{'type': 'paragraph', 'text': self._process_text(full_text[:5000])}], 'subsections': []})
        
        if content['sections']:
            content['title'] = content['sections'][0]['title']
        
        content['key_terms'] = sorted(list(self.key_terms), key=lambda x: (-len(x), x.lower()))
        return content
    
    def _process_text(self, text):
        """Add key term highlighting to text."""
        text = html_module.escape(text)
        
        # Track which positions are already highlighted to avoid overlaps
        highlighted = set()
        
        # Sort terms by length (longest first) to avoid partial matches
        sorted_terms = sorted(self.key_terms, key=len, reverse=True)
        
        for term in sorted_terms:
            escaped_term = html_module.escape(term)
            # Use word boundaries to avoid partial matches
            pattern = re.compile(r'\b' + re.escape(escaped_term) + r'\b', re.IGNORECASE)
            
            # Find all matches
            for match in pattern.finditer(text):
                start, end = match.start(), match.end()
                
                # Check if this region is already highlighted
                if any(start < h_end and end > h_start for h_start, h_end in highlighted):
                    continue
                
                # Only highlight first occurrence
                original = match.group()
                replacement = f'<span class="key-term">{original}</span>'
                text = text[:start] + replacement + text[end:]
                
                # Update highlighted positions (accounting for added HTML)
                added_len = len(replacement) - len(original)
                highlighted = {(s + added_len if s >= end else s, e + added_len if e >= end else e) for s, e in highlighted}
                highlighted.add((start, start + len(replacement)))
                
                break  # Only highlight first occurrence per term
        
        return text
    
    def _looks_like_heading(self, line):
        if not line:
            return False
        if line.isupper() and 3 < len(line) < 60:
            return True
        if re.match(r'^(\d+\.)+\s+[A-Z]', line):
            return True
        return len(line) < 50 and not line.endswith('.') and line[0].isupper()
    
    def _slugify(self, text):
        text = re.sub(r'[^\w\s-]', '', text.lower())
        return re.sub(r'[\s_]+', '-', text)[:50]
    
    def generate_html(self, content):
        title = content.get('title', 'Study Guide')
        subtitle = content.get('subtitle', '')
        sections = content.get('sections', [])
        key_terms = content.get('key_terms', [])
        
        total_items = sum(len(s.get('content', [])) + sum(len(sub.get('content', [])) for sub in s.get('subsections', [])) for s in sections)
        read_time = max(5, total_items // 3)
        
        nav = '\n'.join(f'<a href="#{self._slugify(s["title"])}" class="nav-link">{self.ICONS[i % len(self.ICONS)]} {html_module.escape(s["title"][:30])}</a>' for i, s in enumerate(sections))
        nav += '\n<a href="#terms" class="nav-link">📋 Terms</a>'
        
        sections_html = self._render_sections(sections)
        terms_html = self._render_terms(key_terms)
        
        return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html_module.escape(title)} | Study Guide</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>{self._get_css()}</style>
</head>
<body>
<svg width="0" height="0"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#8b5cf6"/><stop offset="100%" style="stop-color:#06b6d4"/></linearGradient></defs></svg>
<header class="hero"><div class="hero-content"><div class="course-tag">📚 Study Guide</div><h1>{html_module.escape(title)}</h1>{f'<p class="hero-subtitle">{html_module.escape(subtitle)}</p>' if subtitle else ''}<div class="hero-stats"><div class="stat"><div class="stat-value">{len(sections)}</div><div class="stat-label">Sections</div></div><div class="stat"><div class="stat-value">{len(key_terms)}</div><div class="stat-label">Key Terms</div></div><div class="stat"><div class="stat-value">~{read_time}</div><div class="stat-label">Min Read</div></div></div></div></header>
<nav class="nav-container"><div class="nav-scroll"><div class="nav-links">{nav}</div></div></nav>
<main class="main-content">{sections_html}{terms_html}</main>
<div class="progress-tracker"><svg class="progress-ring" viewBox="0 0 48 48"><circle class="bg" cx="24" cy="24" r="20"/><circle class="progress" cx="24" cy="24" r="20" stroke-dasharray="125.6" stroke-dashoffset="125.6"/></svg><div class="progress-text"><div class="progress-percent">0%</div><div style="color:var(--text-muted);font-size:0.7rem">Complete</div></div></div>
<button class="print-btn" onclick="window.print()" title="Print">🖨️</button>
<script>{self._get_js()}</script>
</body>
</html>'''

    def _render_sections(self, sections):
        parts = []
        for i, s in enumerate(sections):
            sid = self._slugify(s['title'])
            icon = self.ICONS[i % len(self.ICONS)]
            content = self._render_content(s.get('content', []))
            subs = ''.join(f'<div id="{self._slugify(sub["title"])}" class="subsection"><h3 class="subsection-title">{html_module.escape(sub["title"])}</h3>{self._render_content(sub.get("content", []))}</div>' for sub in s.get('subsections', []))
            parts.append(f'<section id="{sid}" class="section"><div class="section-header"><div class="section-icon">{icon}</div><div class="section-meta"><div class="section-number">Section {i+1:02d}</div><h2 class="section-title">{html_module.escape(s["title"])}</h2></div></div>{content}{subs}</section>')
        return '\n'.join(parts)
    
    def _render_content(self, content):
        parts = []
        for b in content:
            t = b.get('type', 'paragraph')
            if t == 'paragraph':
                parts.append(f'<p>{b["text"]}</p>')
            elif t == 'subheading':
                parts.append(f'<h4 class="content-subheading">{html_module.escape(b["text"])}</h4>')
            elif t == 'list':
                items = ''.join(f'<li>{item}</li>' for item in b['items'])
                parts.append(f'<ul class="bullet-list">{items}</ul>')
            elif t == 'formula':
                parts.append(f'<div class="formula"><code>{html_module.escape(b["text"])}</code></div>')
        return '\n'.join(parts)
    
    def _render_terms(self, terms):
        if not terms:
            return ''
        chips = ''.join(f'<div class="term-chip">{html_module.escape(t)}</div>' for t in sorted(set(terms))[:40])
        return f'<section id="terms" class="quick-ref"><h2>📋 Key Terms Reference</h2><div class="terms-cloud">{chips}</div></section>'
    
    def _get_css(self):
        return ''':root{--bg-dark:#0a0a0f;--bg-card:#13131a;--bg-elevated:#1a1a24;--text-primary:#f5f5f7;--text-secondary:#a1a1aa;--text-muted:#71717a;--primary:#8b5cf6;--primary-light:#a78bfa;--primary-glow:rgba(139,92,246,0.4);--accent:#06b6d4;--success:#10b981;--warning:#f59e0b;--danger:#ef4444;--border:rgba(255,255,255,0.08)}*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}body{font-family:'Inter',-apple-system,sans-serif;background:var(--bg-dark);color:var(--text-primary);line-height:1.7}.hero{position:relative;padding:4rem 2rem 3rem;background:linear-gradient(135deg,rgba(139,92,246,0.15),rgba(6,182,212,0.1));border-bottom:1px solid var(--border);overflow:hidden}.hero::before{content:'';position:absolute;inset:-50%;background:radial-gradient(circle at 30% 50%,var(--primary-glow),transparent 50%);opacity:0.3;animation:pulse 8s ease-in-out infinite}@keyframes pulse{0%,100%{transform:scale(1);opacity:0.3}50%{transform:scale(1.1);opacity:0.4}}.hero-content{position:relative;max-width:1000px;margin:0 auto}.course-tag{display:inline-flex;padding:0.5rem 1rem;background:linear-gradient(135deg,var(--primary),var(--accent));border-radius:2rem;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:1rem}.hero h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;line-height:1.1;margin-bottom:0.5rem;background:linear-gradient(135deg,#fff,var(--primary-light),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent}.hero-subtitle{font-size:1.1rem;color:var(--text-secondary);margin-bottom:2rem}.hero-stats{display:flex;gap:2rem;flex-wrap:wrap}.stat{text-align:center}.stat-value{font-size:2rem;font-weight:700;background:linear-gradient(135deg,var(--primary-light),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent}.stat-label{font-size:0.75rem;color:var(--text-muted);text-transform:uppercase}.nav-container{position:sticky;top:0;z-index:100;background:rgba(10,10,15,0.9);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}.nav-scroll{max-width:1200px;margin:0 auto;padding:0 1rem;overflow-x:auto}.nav-scroll::-webkit-scrollbar{display:none}.nav-links{display:flex;gap:0.25rem;padding:0.75rem 0;min-width:max-content}.nav-link{padding:0.5rem 1rem;color:var(--text-secondary);text-decoration:none;font-size:0.875rem;font-weight:500;border-radius:0.5rem;transition:all 0.2s;white-space:nowrap}.nav-link:hover{color:var(--text-primary);background:var(--bg-elevated)}.nav-link.active{color:var(--primary-light);background:rgba(139,92,246,0.15)}.main-content{max-width:900px;margin:0 auto;padding:2rem 1.5rem 4rem}.section{margin-bottom:4rem;scroll-margin-top:80px}.section-header{display:flex;align-items:flex-start;gap:1rem;margin-bottom:2rem}.section-icon{width:56px;height:56px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--primary),var(--accent));border-radius:16px;font-size:1.75rem;flex-shrink:0;box-shadow:0 8px 32px var(--primary-glow)}.section-meta{flex:1}.section-number{font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.15em;color:var(--primary-light);margin-bottom:0.25rem}.section-title{font-size:1.75rem;font-weight:700;line-height:1.2}.subsection{margin:2rem 0;padding-left:1rem;border-left:3px solid var(--border)}.subsection-title{color:var(--accent);font-size:1.1rem;margin-bottom:1rem}.content-subheading{color:var(--primary-light);margin:1.5rem 0 0.75rem}p{margin:1rem 0;color:var(--text-secondary)}.key-term{background:linear-gradient(135deg,rgba(139,92,246,0.2),rgba(6,182,212,0.15));border:1px solid rgba(139,92,246,0.3);padding:0.1rem 0.5rem;border-radius:4px;font-weight:600;color:var(--primary-light)}.bullet-list{list-style:none;margin:1.5rem 0;padding:0}.bullet-list li{position:relative;padding:0.875rem 0 0.875rem 2rem;border-bottom:1px solid var(--border);color:var(--text-secondary)}.bullet-list li:last-child{border-bottom:none}.bullet-list li::before{content:'';position:absolute;left:0;top:1.25rem;width:8px;height:8px;background:linear-gradient(135deg,var(--primary),var(--accent));border-radius:50%}.formula{font-family:'JetBrains Mono',monospace;background:var(--bg-elevated);border:1px solid var(--border);border-radius:12px;padding:1.25rem 1.5rem;margin:1.5rem 0;overflow-x:auto;color:var(--accent)}.quick-ref{margin-top:4rem;padding-top:2rem;border-top:1px solid var(--border)}.quick-ref h2{font-size:1.5rem;margin-bottom:1.5rem}.terms-cloud{display:flex;flex-wrap:wrap;gap:0.75rem}.term-chip{padding:0.625rem 1.25rem;background:var(--bg-card);border:1px solid var(--border);border-radius:2rem;font-size:0.875rem;color:var(--text-secondary);transition:all 0.2s}.term-chip:hover{border-color:var(--primary);color:var(--primary-light);transform:translateY(-2px)}.progress-tracker{position:fixed;bottom:2rem;right:2rem;background:var(--bg-card);border:1px solid var(--border);border-radius:1rem;padding:1rem 1.25rem;display:flex;align-items:center;gap:1rem;box-shadow:0 20px 40px rgba(0,0,0,0.4);z-index:100}.progress-ring{width:48px;height:48px;transform:rotate(-90deg)}.progress-ring circle{fill:none;stroke-width:4}.progress-ring .bg{stroke:var(--border)}.progress-ring .progress{stroke:url(#grad);stroke-linecap:round;transition:stroke-dashoffset 0.5s}.progress-percent{font-size:1.25rem;font-weight:700;background:linear-gradient(135deg,var(--primary-light),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent}.print-btn{position:fixed;bottom:2rem;left:2rem;width:48px;height:48px;background:var(--bg-card);border:1px solid var(--border);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.25rem;cursor:pointer;transition:all 0.2s;z-index:100}.print-btn:hover{background:var(--primary);border-color:var(--primary);transform:translateY(-2px)}@media(max-width:768px){.hero{padding:2rem 1rem}.section-header{flex-direction:column;gap:0.75rem}.section-icon{width:48px;height:48px;font-size:1.5rem}.progress-tracker{bottom:1rem;right:1rem;padding:0.75rem 1rem}.print-btn{bottom:1rem;left:1rem;width:40px;height:40px}}@media print{.nav-container,.progress-tracker,.print-btn{display:none!important}body{background:#fff;color:#000}.hero{background:none;border:none}.hero::before{display:none}.hero h1{-webkit-text-fill-color:#000}.section{page-break-inside:avoid}.key-term{background:#eee;border-color:#ccc;color:#333}}'''
    
    def _get_js(self):
        return '''const sections=document.querySelectorAll('.section'),navLinks=document.querySelectorAll('.nav-link'),progressCircle=document.querySelector('.progress-ring .progress'),progressText=document.querySelector('.progress-percent'),circumference=125.6;function update(){const scrollHeight=document.documentElement.scrollHeight-window.innerHeight,progress=scrollHeight>0?(window.scrollY/scrollHeight)*100:0;progressCircle.style.strokeDashoffset=circumference-(progress/100)*circumference;progressText.textContent=Math.round(progress)+'%';let current='';sections.forEach(s=>{if(window.scrollY>=s.offsetTop-100)current=s.id});navLinks.forEach(l=>{l.classList.remove('active');if(l.getAttribute('href')==='#'+current)l.classList.add('active')})}window.addEventListener('scroll',update);update();navLinks.forEach(l=>l.addEventListener('click',e=>{e.preventDefault();document.querySelector(l.getAttribute('href'))?.scrollIntoView({behavior:'smooth'})}))'''


from werkzeug.utils import secure_filename

ALLOWED_EXTENSIONS = {'docx', 'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/study-guide/upload', methods=['POST'])
def upload_study_guide():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if not file.filename or not allowed_file(file.filename):
        return jsonify({'error': 'File type not supported. Use DOCX or PDF.'}), 400
    
    try:
        builder = StudyGuideBuilder()
        ext = secure_filename(file.filename).rsplit('.', 1)[1].lower()
        
        file_stream = BytesIO(file.read())
        content = builder.parse_docx(file_stream) if ext == 'docx' else builder.parse_pdf(file_stream)
        html_content = builder.generate_html(content)
        
        return jsonify({
            'success': True,
            'title': content.get('title', 'Study Guide'),
            'sections': len(content.get('sections', [])),
            'key_terms': len(content.get('key_terms', [])),
            'html': html_content
        })
    except ImportError as e:
        return jsonify({'error': str(e) + '. Install with: pip install python-docx PyPDF2'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/study-guide/preview', methods=['POST'])
def preview_study_guide():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if not file.filename or not allowed_file(file.filename):
        return jsonify({'error': 'Unsupported file type'}), 400
    
    try:
        builder = StudyGuideBuilder()
        ext = secure_filename(file.filename).rsplit('.', 1)[1].lower()
        
        file_stream = BytesIO(file.read())
        content = builder.parse_docx(file_stream) if ext == 'docx' else builder.parse_pdf(file_stream)
        
        return jsonify({
            'success': True,
            'title': content.get('title', 'Study Guide'),
            'sections': [{'title': s['title'], 'items': len(s.get('content', []))} for s in content.get('sections', [])],
            'key_terms': content.get('key_terms', [])[:20]
        })
    except ImportError as e:
        return jsonify({'error': str(e) + '. Install with: pip install python-docx PyPDF2'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)