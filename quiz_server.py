#!/usr/bin/env python3
"""Quiz Master Pro - Backend Server"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import hashlib
import secrets
import json
import os
from datetime import datetime, timedelta
from functools import wraps
from services.study_guide import register_study_guide_routes
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

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
register_study_guide_routes(app, db)
