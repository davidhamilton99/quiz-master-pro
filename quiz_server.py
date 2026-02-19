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
    
    # NEW: User profiles for gamification data sync
    c.execute('''CREATE TABLE IF NOT EXISTS user_profiles (
        user_id INTEGER PRIMARY KEY,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        gems INTEGER DEFAULT 0,
        daily_streak INTEGER DEFAULT 0,
        last_active_date TEXT,
        achievements TEXT DEFAULT '[]',
        total_answered INTEGER DEFAULT 0,
        total_correct INTEGER DEFAULT 0,
        quizzes_completed INTEGER DEFAULT 0,
        perfect_scores INTEGER DEFAULT 0,
        settings TEXT DEFAULT '{"soundEnabled":true,"animationsEnabled":true}',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )''')
    
    # NEW: In-progress quiz state for cross-device sync
    c.execute('''CREATE TABLE IF NOT EXISTS quiz_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        quiz_id INTEGER NOT NULL,
        question_index INTEGER DEFAULT 0,
        answers TEXT DEFAULT '[]',
        flagged TEXT DEFAULT '[]',
        study_mode BOOLEAN DEFAULT 1,
        randomize_options BOOLEAN DEFAULT 0,
        option_shuffles TEXT DEFAULT '{}',
        quiz_streak INTEGER DEFAULT 0,
        max_quiz_streak INTEGER DEFAULT 0,
        timer_enabled BOOLEAN DEFAULT 0,
        time_remaining INTEGER,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, quiz_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    )''')
    
    c.execute('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_quizzes_user ON quizzes(user_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_progress_user_quiz ON quiz_progress(user_id, quiz_id)')
    
    conn.commit()
    conn.close()

# === Auth Helpers ===

# Try to use bcrypt for secure password hashing
try:
    import bcrypt
    BCRYPT_AVAILABLE = True
except ImportError:
    BCRYPT_AVAILABLE = False
    print("Warning: bcrypt not installed. Using PBKDF2 fallback. Install with: pip install bcrypt")

def hash_password(password, salt=None):
    """
    Hash password securely.
    - Uses bcrypt if available (recommended)
    - Falls back to PBKDF2 with SHA256 (still secure)
    - Legacy SHA256+salt support for existing passwords
    """
    if BCRYPT_AVAILABLE:
        # bcrypt handles salt internally
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))
        return hashed.decode(), 'bcrypt'
    else:
        # PBKDF2 fallback - much better than plain SHA256
        import hashlib
        if salt is None:
            salt = secrets.token_hex(32)
        # 100,000 iterations of PBKDF2
        h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
        return h, salt

def verify_password(password, stored_hash, salt):
    """
    Verify password against stored hash.
    Supports:
    - bcrypt hashes (salt == 'bcrypt')
    - PBKDF2 hashes (salt is hex string, hash is 64 chars)
    - Legacy SHA256 hashes (for backward compatibility)
    """
    if salt == 'bcrypt' and BCRYPT_AVAILABLE:
        # bcrypt verification
        try:
            return bcrypt.checkpw(password.encode(), stored_hash.encode())
        except:
            return False
    elif len(stored_hash) == 64 and len(salt) == 64:
        # PBKDF2 hash (64 hex chars = 32 bytes)
        import hashlib
        computed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
        return secrets.compare_digest(computed, stored_hash)
    else:
        # Legacy SHA256 fallback for old passwords
        computed = hashlib.sha256((password + salt).encode()).hexdigest()
        return secrets.compare_digest(computed, stored_hash)

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

# === Profile & Stats (Synced to Database) ===

@app.route('/api/profile', methods=['GET'])
@token_required
def get_profile():
    conn = get_db()
    c = conn.cursor()
    
    # Get user info
    c.execute('SELECT id, username, email, created_at FROM users WHERE id = ?', (request.user_id,))
    user = dict(c.fetchone())
    
    # Get or create profile
    c.execute('SELECT * FROM user_profiles WHERE user_id = ?', (request.user_id,))
    profile_row = c.fetchone()
    
    if profile_row:
        profile = dict(profile_row)
        profile['achievements'] = json.loads(profile['achievements'] or '[]')
        profile['settings'] = json.loads(profile['settings'] or '{}')
    else:
        # Create default profile
        c.execute('''INSERT INTO user_profiles (user_id) VALUES (?)''', (request.user_id,))
        conn.commit()
        profile = {
            'xp': 0, 'level': 1, 'gems': 0, 'daily_streak': 0,
            'last_active_date': None, 'achievements': [],
            'total_answered': 0, 'total_correct': 0,
            'quizzes_completed': 0, 'perfect_scores': 0,
            'settings': {'soundEnabled': True, 'animationsEnabled': True}
        }
    
    # Get quiz count
    c.execute('SELECT COUNT(*) as count FROM quizzes WHERE user_id = ?', (request.user_id,))
    user['quiz_count'] = c.fetchone()['count']
    
    conn.close()
    
    return jsonify({
        'user': user,
        'profile': profile
    })

@app.route('/api/profile', methods=['PUT'])
@token_required
def update_profile():
    data = request.get_json()
    conn = get_db()
    c = conn.cursor()
    
    # Upsert profile
    c.execute('''INSERT INTO user_profiles (user_id, xp, level, gems, daily_streak, last_active_date,
                 achievements, total_answered, total_correct, quizzes_completed, perfect_scores, settings, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(user_id) DO UPDATE SET
                 xp=excluded.xp, level=excluded.level, gems=excluded.gems,
                 daily_streak=excluded.daily_streak, last_active_date=excluded.last_active_date,
                 achievements=excluded.achievements, total_answered=excluded.total_answered,
                 total_correct=excluded.total_correct, quizzes_completed=excluded.quizzes_completed,
                 perfect_scores=excluded.perfect_scores, settings=excluded.settings, updated_at=excluded.updated_at''',
        (request.user_id,
         data.get('xp', 0),
         data.get('level', 1),
         data.get('gems', 0),
         data.get('daily_streak', 0),
         data.get('last_active_date'),
         json.dumps(data.get('achievements', [])),
         data.get('total_answered', 0),
         data.get('total_correct', 0),
         data.get('quizzes_completed', 0),
         data.get('perfect_scores', 0),
         json.dumps(data.get('settings', {})),
         datetime.now()))
    
    conn.commit()
    conn.close()
    return jsonify({'message': 'Profile updated'})

@app.route('/api/stats', methods=['GET'])
@token_required
def get_stats():
    conn = get_db()
    c = conn.cursor()
    
    # Recent attempts (last 10)
    c.execute('''
        SELECT a.*, q.title as quiz_title 
        FROM attempts a 
        JOIN quizzes q ON a.quiz_id = q.id 
        WHERE a.user_id = ? 
        ORDER BY a.created_at DESC 
        LIMIT 10
    ''', (request.user_id,))
    recent = [dict(r) for r in c.fetchall()]
    
    # Best scores per quiz
    c.execute('''
        SELECT q.id, q.title, MAX(a.percentage) as best_score, COUNT(a.id) as attempts
        FROM quizzes q
        LEFT JOIN attempts a ON q.id = a.quiz_id
        WHERE q.user_id = ?
        GROUP BY q.id
        ORDER BY q.last_modified DESC
    ''', (request.user_id,))
    quizzes = [dict(r) for r in c.fetchall()]
    
    conn.close()
    return jsonify({
        'recent_attempts': recent,
        'quiz_stats': quizzes
    })

# === Quiz Progress Sync ===

@app.route('/api/progress/<int:quiz_id>', methods=['GET'])
@token_required
def get_quiz_progress(quiz_id):
    conn = get_db()
    c = conn.cursor()
    
    c.execute('SELECT * FROM quiz_progress WHERE user_id = ? AND quiz_id = ?', 
              (request.user_id, quiz_id))
    row = c.fetchone()
    conn.close()
    
    if not row:
        return jsonify({'progress': None})
    
    progress = dict(row)
    progress['answers'] = json.loads(progress['answers'] or '[]')
    progress['flagged'] = json.loads(progress['flagged'] or '[]')
    progress['option_shuffles'] = json.loads(progress['option_shuffles'] or '{}')
    
    return jsonify({'progress': progress})

@app.route('/api/progress/<int:quiz_id>', methods=['PUT'])
@token_required
def save_quiz_progress(quiz_id):
    data = request.get_json()
    conn = get_db()
    c = conn.cursor()
    
    c.execute('''INSERT INTO quiz_progress 
                 (user_id, quiz_id, question_index, answers, flagged, study_mode, 
                  randomize_options, option_shuffles, quiz_streak, max_quiz_streak,
                  timer_enabled, time_remaining, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(user_id, quiz_id) DO UPDATE SET
                 question_index=excluded.question_index, answers=excluded.answers,
                 flagged=excluded.flagged, study_mode=excluded.study_mode,
                 randomize_options=excluded.randomize_options, option_shuffles=excluded.option_shuffles,
                 quiz_streak=excluded.quiz_streak, max_quiz_streak=excluded.max_quiz_streak,
                 timer_enabled=excluded.timer_enabled, time_remaining=excluded.time_remaining,
                 updated_at=excluded.updated_at''',
        (request.user_id, quiz_id,
         data.get('question_index', 0),
         json.dumps(data.get('answers', [])),
         json.dumps(data.get('flagged', [])),
         data.get('study_mode', True),
         data.get('randomize_options', False),
         json.dumps(data.get('option_shuffles', {})),
         data.get('quiz_streak', 0),
         data.get('max_quiz_streak', 0),
         data.get('timer_enabled', False),
         data.get('time_remaining'),
         datetime.now()))
    
    conn.commit()
    conn.close()
    return jsonify({'message': 'Progress saved'})

@app.route('/api/progress/<int:quiz_id>', methods=['DELETE'])
@token_required
def clear_quiz_progress(quiz_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('DELETE FROM quiz_progress WHERE user_id = ? AND quiz_id = ?',
              (request.user_id, quiz_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Progress cleared'})

@app.route('/api/progress', methods=['GET'])
@token_required
def get_all_progress():
    """Get all in-progress quizzes for the library display."""
    conn = get_db()
    c = conn.cursor()
    
    c.execute('''
        SELECT p.*, q.title as quiz_title, 
               json_array_length(q.questions) as total_questions
        FROM quiz_progress p
        JOIN quizzes q ON p.quiz_id = q.id
        WHERE p.user_id = ?
        ORDER BY p.updated_at DESC
    ''', (request.user_id,))
    
    rows = c.fetchall()
    conn.close()
    
    progress_list = []
    for row in rows:
        p = dict(row)
        p['answers'] = json.loads(p['answers'] or '[]')
        p['flagged'] = json.loads(p['flagged'] or '[]')
        progress_list.append(p)
    
    return jsonify({'progress': progress_list})

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
        # Articles, prepositions, conjunctions
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
        'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
        # Modal/auxiliary verbs
        'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
        'shall', 'can', 'need', 'dare', 'ought', 'used', 'being', 'having',
        # Pronouns
        'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
        'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'me', 'him', 'her',
        # Quantifiers
        'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
        'any', 'none', 'either', 'neither', 'enough', 'less', 'least', 'little',
        # Negation and emphasis
        'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
        'also', 'now', 'here', 'there', 'then', 'once', 'still', 'already', 'ever',
        # Conjunctions and transitions  
        'if', 'unless', 'until', 'while', 'although', 'because', 'since', 'about',
        'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under',
        'again', 'further', 'always', 'never', 'often', 'sometimes', 'usually',
        # Common generic words
        'example', 'examples', 'way', 'ways', 'much', 'many', 'several', 'eve', 'even',
        'first', 'second', 'third', 'one', 'two', 'three', 'new', 'old', 'good', 'best',
        'like', 'well', 'back', 'over', 'such', 'only', 'come', 'make', 'made', 'know',
        'take', 'get', 'got', 'see', 'saw', 'look', 'think', 'thought', 'want', 'give',
        'use', 'find', 'tell', 'ask', 'work', 'seem', 'feel', 'try', 'leave', 'call',
        'keep', 'let', 'begin', 'began', 'begun', 'show', 'hear', 'play', 'run', 'move',
        'live', 'believe', 'hold', 'bring', 'happen', 'write', 'provide', 'sit', 'stand',
        'lose', 'pay', 'meet', 'include', 'continue', 'set', 'learn', 'change', 'lead',
        'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read', 'allow',
        'add', 'spend', 'grow', 'open', 'walk', 'win', 'offer', 'remember', 'love',
        'consider', 'appear', 'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build',
        'stay', 'fall', 'cut', 'reach', 'kill', 'remain', 'using', 'another', 'goes',
        # Common phrases that get picked up
        'however', 'therefore', 'thus', 'hence', 'otherwise', 'moreover', 'furthermore',
        'nonetheless', 'nevertheless', 'meanwhile', 'instead', 'indeed', 'certainly',
        'simply', 'actually', 'basically', 'generally', 'usually', 'typically', 'probably',
        'possibly', 'perhaps', 'maybe', 'likely', 'unlikely', 'clearly', 'obviously',
        # Filler/connector words
        'really', 'quite', 'rather', 'somewhat', 'almost', 'nearly', 'completely',
        'exactly', 'especially', 'particularly', 'specifically', 'mainly', 'mostly',
        'kind', 'sort', 'type', 'thing', 'things', 'stuff', 'part', 'parts', 'point',
        'fact', 'case', 'issue', 'problem', 'problems', 'question', 'answer', 'result',
        'able', 'sure', 'true', 'false', 'real', 'right', 'wrong', 'different', 'similar',
        # Generic action/technical words that aren't terms
        'divide', 'solve', 'grouping', 'regular', 'process', 'system', 'systems',
        'input', 'output', 'inputs', 'outputs', 'message', 'messages', 'data',
        'value', 'values', 'number', 'numbers', 'function', 'functions', 'method',
        'easy', 'hard', 'simple', 'complex', 'basic', 'advanced', 'standard',
        'alice', 'bob', 'eve',  # Cryptography placeholder names
        'homework', 'review', 'note', 'notes', 'section', 'chapter', 'appendix'
    }
    
    def __init__(self):
        self.key_terms = set()
        
    def _is_valid_term(self, term):
        """Check if a term is worth highlighting."""
        term = term.strip()
        
        # Too short or too long
        if len(term) < 5 or len(term) > 45:
            return False
        
        # Skip things that look like math/calculations
        if any(x in term for x in ['=', '+', '×', '÷', '/', '*', ' x ', '(mod', 'mod ']):
            return False
        
        # Skip things starting with numbers
        if term[0].isdigit():
            return False
        
        # Skip things with colons, quotes (embedded quotes are messy)
        if any(x in term for x in [':', '"', '"', '"', "'"]):
            return False
        
        # Skip things that look like hex/hashes or random alphanumeric
        if re.match(r'^[A-Z0-9]{6,}$', term):  # Like OEG20021111S0036
            return False
        if re.match(r'^[a-f0-9]{8,}$', term.lower()):
            return False
        
        # Skip URLs and URL fragments
        if any(x in term.lower() for x in ['http', 'www.', '.com', '.org', '.pdf', 'youtube', '.html']):
            return False
        
        # Single word checks
        words = term.lower().split()
        if len(words) == 1:
            # Single word must be at least 5 chars and not a stop word
            if term.lower() in self.STOP_WORDS:
                return False
            # Must contain letters (not just numbers/symbols)
            if not re.search(r'[a-zA-Z]{3,}', term):
                return False
            # Skip ALL CAPS words that are likely emphasis or section titles
            if term.isupper():
                # Allow known acronyms but skip generic caps words
                allowed_caps = {'SHA-256', 'SSL-TLS', 'SHA256', 'MD5', 'AES', 'RSA', 'PKI', 'PFS', 
                               'TLS', 'SSL', 'QEC', 'DHM', 'ECDH', 'HMAC', 'SHA1', 'SHA3', 'SAM'}
                if term not in allowed_caps and len(term) < 10:
                    return False
            return True
        
        # Multi-word phrase checks
        # Max 5 words (avoid sentence fragments)
        if len(words) > 5:
            return False
        
        # Filter out phrases that are mostly stop words
        non_stop_words = [w for w in words if w not in self.STOP_WORDS and len(w) > 2]
        if len(non_stop_words) < 2:  # Need at least 2 meaningful words
            return False
        
        # Skip phrases starting with bad words
        bad_starts = ['perform', 'divide', 'thus', 'note', 'determine', 'review', 'read', 
                      'make', 'take', 'when', 'what', 'where', 'which', 'this', 'that',
                      'there', 'these', 'those', 'here', 'they', 'your', 'first', 'most',
                      'above', 'below', 'essentially', 'input', 'output', 'easy', 'hard',
                      'can', 'cannot', 'should', 'would', 'could', 'will', 'shall']
        if words[0] in bad_starts:
            return False
        
        # Skip phrases ending with generic words
        bad_ends = ['way', 'ways', 'used', 'them', 'this', 'that', 'here', 'there',
                    'states', 'related', 'needed', 'required', 'done', 'help']
        if words[-1] in bad_ends:
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
                    target['content'].append({'type': 'paragraph', 'text': text})
        
        # Extract acronyms from all text (but be selective)
        full_text = ' '.join(all_text)
        acronyms = self._extract_acronyms(full_text)
        # Common acronyms/caps words to skip (not technical terms)
        skip_acronyms = {
            # General
            'DNA', 'RNA', 'USA', 'UK', 'EU', 'UN', 'TV', 'PC', 'IT', 'ID', 
            'OK', 'AM', 'PM', 'VS', 'IE', 'EG', 'AKA', 'FAQ', 'DIY', 'CEO',
            'NOT', 'AND', 'THE', 'FOR', 'BUT', 'ARE', 'WAS', 'HAS', 'HAD',
            # Document/section markers
            'HOMEWORK', 'NOTE', 'NOTES', 'TODO', 'TBD', 'NB', 'PS', 'FYI',
            # Generic technical words
            'SYSTEM', 'SOLVE', 'SALT', 'UNIX', 'SAM', 'NSA', 'CIA', 'FBI',
            # Action words that get caps'd
            'READ', 'WRITE', 'SEND', 'RECEIVE', 'GET', 'SET', 'PUT', 'POST',
            'TRUE', 'FALSE', 'NULL', 'VOID', 'INT', 'CHAR', 'BOOL'
        }
        for acr in acronyms:
            if len(acr) >= 3 and acr not in skip_acronyms:
                self.key_terms.add(acr)
        
        # Deduplicate case-insensitively (keep first occurrence's casing)
        seen_lower = {}
        for term in self.key_terms:
            lower = term.lower()
            if lower not in seen_lower:
                seen_lower[lower] = term
        self.key_terms = set(seen_lower.values())
        
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
        
        # Linkify URLs
        url_pattern = r'(https?://[^\s<>"\']+)'
        text = re.sub(url_pattern, r'<a href="\1" target="_blank" rel="noopener" class="link">\1</a>', text)
        
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
    
    def _truncate_title(self, title, max_len=35):
        """Truncate title at word boundary."""
        if len(title) <= max_len:
            return title
        # Find last space before max_len
        truncated = title[:max_len]
        last_space = truncated.rfind(' ')
        if last_space > max_len * 0.5:  # Only truncate at space if reasonable
            return truncated[:last_space] + '…'
        return truncated + '…'
    
    def generate_html(self, content):
        title = content.get('title', 'Study Guide')
        subtitle = content.get('subtitle', '')
        sections = content.get('sections', [])
        key_terms = content.get('key_terms', [])
        
        total_items = sum(len(s.get('content', [])) + sum(len(sub.get('content', [])) for sub in s.get('subsections', [])) for s in sections)
        read_time = max(5, total_items // 3)
        
        nav = '\n'.join(f'<a href="#{self._slugify(s["title"])}" class="nav-link">{self.ICONS[i % len(self.ICONS)]} {html_module.escape(self._truncate_title(s["title"]))}</a>' for i, s in enumerate(sections))
        nav += '\n<a href="#terms" class="nav-link">📋 Key Terms</a>'
        
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
<header class="hero"><div class="hero-content"><div class="course-tag">📚 Study Guide</div><h1>{html_module.escape(title)}</h1>{f'<p class="hero-subtitle">{html_module.escape(subtitle)}</p>' if subtitle else ''}<div class="hero-stats"><div class="stat"><div class="stat-value">{len(sections)}</div><div class="stat-label">Sections</div></div><div class="stat"><div class="stat-value">{len(key_terms)}</div><div class="stat-label">Key Terms</div></div><div class="stat"><div class="stat-value">~{read_time}</div><div class="stat-label">Min Read</div></div></div></div></header>
<nav class="nav-container"><div class="nav-scroll"><div class="nav-links">{nav}</div></div></nav>
<main class="main-content">{sections_html}{terms_html}</main>
<div class="progress-tracker"><svg class="progress-ring" viewBox="0 0 44 44"><circle class="bg" cx="22" cy="22" r="18"/><circle class="progress" cx="22" cy="22" r="18" stroke-dasharray="113" stroke-dashoffset="113"/></svg><span class="progress-percent">0%</span></div>
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
        return ''':root{--bg-dark:#0f0f14;--bg-card:#16161e;--bg-elevated:#1e1e28;--text-primary:#e4e4e7;--text-secondary:#a1a1aa;--text-muted:#71717a;--primary:#a78bfa;--primary-soft:#c4b5fd;--accent:#67e8f9;--accent-soft:#a5f3fc;--success:#34d399;--border:rgba(255,255,255,0.06);--glow:rgba(167,139,250,0.15)}*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:var(--bg-dark);color:var(--text-primary);line-height:1.8;font-size:16px;-webkit-font-smoothing:antialiased}.hero{position:relative;padding:4rem 2rem 3rem;background:linear-gradient(180deg,rgba(167,139,250,0.08) 0%,transparent 100%);border-bottom:1px solid var(--border)}.hero-content{position:relative;max-width:800px;margin:0 auto}.course-tag{display:inline-block;padding:0.4rem 1rem;background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.2);border-radius:2rem;font-size:0.75rem;font-weight:600;color:var(--primary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:1.25rem}.hero h1{font-size:2.25rem;font-weight:700;line-height:1.2;margin-bottom:1rem;color:#fff}.hero-subtitle{font-size:1.05rem;color:var(--text-secondary);margin-bottom:2rem;line-height:1.6}.hero-stats{display:flex;gap:2.5rem}.stat{text-align:left}.stat-value{font-size:1.75rem;font-weight:700;color:#fff;margin-bottom:0.125rem}.stat-label{font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em}.nav-container{position:sticky;top:0;z-index:100;background:rgba(15,15,20,0.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--border)}.nav-scroll{max-width:1000px;margin:0 auto;padding:0 1.5rem;overflow-x:auto;scrollbar-width:none}.nav-scroll::-webkit-scrollbar{display:none}.nav-links{display:flex;gap:0.25rem;padding:0.625rem 0}.nav-link{padding:0.5rem 0.875rem;color:var(--text-muted);text-decoration:none;font-size:0.8rem;font-weight:500;border-radius:6px;transition:all 0.2s;white-space:nowrap}.nav-link:hover{color:var(--text-primary);background:var(--bg-elevated)}.nav-link.active{color:var(--primary);background:rgba(167,139,250,0.1)}.main-content{max-width:760px;margin:0 auto;padding:3rem 1.5rem 5rem}.section{margin-bottom:4rem;scroll-margin-top:70px}.section-header{display:flex;align-items:flex-start;gap:1rem;margin-bottom:1.75rem}.section-icon{width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(167,139,250,0.2),rgba(103,232,249,0.15));border:1px solid rgba(167,139,250,0.15);border-radius:12px;font-size:1.375rem;flex-shrink:0}.section-meta{flex:1;padding-top:0.25rem}.section-number{font-size:0.65rem;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--primary);margin-bottom:0.375rem;opacity:0.8}.section-title{font-size:1.5rem;font-weight:600;line-height:1.3;color:#fff}.subsection{margin:2.5rem 0;padding-left:1.25rem;border-left:2px solid var(--border)}.subsection-title{color:var(--accent);font-size:1.05rem;font-weight:600;margin-bottom:1rem}.content-subheading{color:var(--primary-soft);font-size:1rem;font-weight:600;margin:2rem 0 0.75rem}p{margin:1.25rem 0;color:var(--text-secondary);font-size:0.9375rem}.key-term{color:var(--text-primary);font-weight:500;border-bottom:1px dotted rgba(167,139,250,0.4)}.link{color:var(--accent);text-decoration:none;word-break:break-all}.link:hover{text-decoration:underline}.bullet-list{list-style:none;margin:1.5rem 0;padding:0}.bullet-list li{position:relative;padding:0.75rem 0 0.75rem 1.5rem;color:var(--text-secondary);font-size:0.9375rem;border-bottom:1px solid var(--border)}.bullet-list li:last-child{border-bottom:none}.bullet-list li::before{content:'';position:absolute;left:0;top:1.1rem;width:6px;height:6px;background:var(--primary);border-radius:50%;opacity:0.6}.formula{font-family:'JetBrains Mono',monospace;font-size:0.875rem;background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;padding:1rem 1.25rem;margin:1.25rem 0;overflow-x:auto;color:var(--accent-soft)}.quick-ref{margin-top:4rem;padding-top:2.5rem;border-top:1px solid var(--border)}.quick-ref h2{font-size:1.25rem;font-weight:600;margin-bottom:1.25rem;color:#fff}.terms-cloud{display:flex;flex-wrap:wrap;gap:0.5rem}.term-chip{padding:0.5rem 1rem;background:var(--bg-card);border:1px solid var(--border);border-radius:2rem;font-size:0.8rem;color:var(--text-secondary);transition:all 0.2s}.term-chip:hover{border-color:rgba(167,139,250,0.3);color:var(--primary-soft)}.progress-tracker{position:fixed;bottom:1.5rem;right:1.5rem;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:0.75rem 1rem;display:flex;align-items:center;gap:0.75rem;box-shadow:0 8px 32px rgba(0,0,0,0.4);z-index:100}.progress-ring{width:40px;height:40px;transform:rotate(-90deg)}.progress-ring circle{fill:none;stroke-width:3}.progress-ring .bg{stroke:var(--border)}.progress-ring .progress{stroke:var(--primary);stroke-linecap:round;transition:stroke-dashoffset 0.5s}.progress-percent{font-size:1rem;font-weight:600;color:var(--primary)}.print-btn{position:fixed;bottom:1.5rem;left:1.5rem;width:42px;height:42px;background:var(--bg-card);border:1px solid var(--border);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.125rem;cursor:pointer;transition:all 0.2s;z-index:100}.print-btn:hover{background:var(--bg-elevated);border-color:var(--primary)}@media(max-width:768px){.hero{padding:2rem 1.25rem}.hero h1{font-size:1.75rem}.section-header{flex-direction:column;gap:0.625rem}.section-icon{width:42px;height:42px;font-size:1.25rem}.section-title{font-size:1.25rem}.progress-tracker{bottom:1rem;right:1rem;padding:0.625rem 0.875rem}.print-btn{bottom:1rem;left:1rem}}@media print{.nav-container,.progress-tracker,.print-btn{display:none!important}body{background:#fff;color:#222;font-size:11pt}.hero{background:none;padding:1rem 0}.hero h1{color:#000;font-size:18pt}.section{page-break-inside:avoid}.key-term{color:#000;font-weight:600;border-bottom:none}.link{color:#333;text-decoration:underline}}'''
    
    def _get_js(self):
        return '''const sections=document.querySelectorAll('.section'),navLinks=document.querySelectorAll('.nav-link'),progressCircle=document.querySelector('.progress-ring .progress'),progressText=document.querySelector('.progress-percent'),circumference=113;function update(){const scrollHeight=document.documentElement.scrollHeight-window.innerHeight,progress=scrollHeight>0?(window.scrollY/scrollHeight)*100:0;progressCircle.style.strokeDashoffset=circumference-(progress/100)*circumference;progressText.textContent=Math.round(progress)+'%';let current='';sections.forEach(s=>{if(window.scrollY>=s.offsetTop-100)current=s.id});navLinks.forEach(l=>{l.classList.remove('active');if(l.getAttribute('href')==='#'+current)l.classList.add('active')})}window.addEventListener('scroll',update);update();navLinks.forEach(l=>l.addEventListener('click',e=>{e.preventDefault();document.querySelector(l.getAttribute('href'))?.scrollIntoView({behavior:'smooth'})}))'''


from werkzeug.utils import secure_filename

ALLOWED_EXTENSIONS = {'docx', 'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/study-guide/upload', methods=['POST'])
@token_required
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
@token_required
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