#!/usr/bin/env python3
"""
Quiz Master Pro - Backend Server (Complete Fixed Version)
"""
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import hashlib
import secrets
import json
import os
from datetime import datetime, timedelta
from functools import wraps

# Create Flask app
app = Flask(__name__, static_folder='/home/davidhamilton/quiz-master-pro/static')
CORS(app)

# Gemini API setup
GEMINI_API_KEY = "AIzaSyAyshCARQ4odmz1U4mCiH-9EQwZ5Sm3JoQ"

# Database path
DATABASE = '/home/davidhamilton/quiz-master-pro/quiz_master.db'

# ============== DATABASE ==============
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with all required tables"""
    conn = get_db()
    cursor = conn.cursor()

    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    ''')

    # Sessions table for token-based auth
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')

    # Quizzes table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS quizzes (
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
        )
    ''')

    # Quiz attempts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attempts (
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
        )
    ''')

    # Create indexes
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_quizzes_user ON quizzes(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_attempts_quiz ON attempts(quiz_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id)')

    conn.commit()
    conn.close()
    print("✅ Database initialized successfully!")

# ============== PASSWORD HASHING ==============
def hash_password(password, salt=None):
    """Hash password with salt using SHA-256"""
    if salt is None:
        salt = secrets.token_hex(32)
    password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return password_hash, salt

def verify_password(password, password_hash, salt):
    """Verify password against stored hash"""
    computed_hash, _ = hash_password(password, salt)
    return computed_hash == password_hash

# ============== AUTHENTICATION MIDDLEWARE ==============
def token_required(f):
    """Decorator to require valid authentication token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        if token.startswith('Bearer '):
            token = token[7:]

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT s.user_id, u.username, u.email
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1
        ''', (token, datetime.now()))

        session = cursor.fetchone()
        conn.close()

        if not session:
            return jsonify({'error': 'Invalid or expired token'}), 401

        request.user_id = session['user_id']
        request.username = session['username']
        request.email = session['email']

        return f(*args, **kwargs)
    return decorated

# ============== AI EXPLANATION ENDPOINT (FIXED) ==============
@app.route('/api/generate-explanation', methods=['POST'])
@token_required
def generate_explanation():
    """Generate AI explanation for a flashcard term"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        term = data.get('term', '').strip()
        definition = data.get('definition', '').strip()
        
        print(f"🤖 AI REQUEST: term='{term}', definition='{definition}'")
        
        if not term or not definition:
            return jsonify({'error': 'Term and definition required'}), 400
        
        # Try to import and use Gemini
        try:
            import google.generativeai as genai
            
            # Configure Gemini
            genai.configure(api_key=GEMINI_API_KEY)
            
            # Create model - use correct model name
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            # Generate explanation
            prompt = f"""Create a clear, educational explanation for this flashcard term. 
Keep it concise (2-3 sentences) and suitable for students studying.

Term: {term}
Definition: {definition}

Provide ONLY the explanation text, no preamble or extra formatting."""
            
            response = model.generate_content(prompt)
            explanation = response.text.strip()
            
            print(f"✅ AI RESPONSE: {explanation[:100]}...")
            
            return jsonify({
                'explanation': explanation,
                'fallback': False
            })
            
        except ImportError:
            print("❌ google.generativeai not installed")
            return jsonify({
                'explanation': definition,
                'fallback': True,
                'error': 'Gemini library not installed'
            }), 200
            
        except Exception as gemini_error:
            print(f"❌ Gemini API error: {str(gemini_error)}")
            return jsonify({
                'explanation': definition,
                'fallback': True,
                'error': str(gemini_error)
            }), 200
        
    except Exception as e:
        print(f"❌ Server error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'explanation': data.get('definition', 'Error generating explanation'),
            'fallback': True,
            'error': str(e)
        }), 200

# ============== STATIC FILES ==============
@app.route('/')
def landing():
    return send_from_directory('/home/davidhamilton/quiz-master-pro/static', 'landing.html')

@app.route('/app')
def app_page():
    return send_from_directory('/home/davidhamilton/quiz-master-pro/static', 'index.html')

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('/home/davidhamilton/quiz-master-pro/static', filename)

# ============== AUTH ROUTES ==============
@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not username or len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters'}), 400
    if not email or '@' not in email:
        return jsonify({'error': 'Valid email is required'}), 400
    if not password or len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    password_hash, salt = hash_password(password)

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            INSERT INTO users (username, email, password_hash, salt)
            VALUES (?, ?, ?, ?)
        ''', (username, email, password_hash, salt))

        user_id = cursor.lastrowid

        token = secrets.token_hex(32)
        expires_at = datetime.now() + timedelta(days=7)

        cursor.execute('''
            INSERT INTO sessions (user_id, token, expires_at)
            VALUES (?, ?, ?)
        ''', (user_id, token, expires_at))

        conn.commit()
        conn.close()

        return jsonify({
            'message': 'Registration successful',
            'token': token,
            'user': {'id': user_id, 'username': username, 'email': email}
        }), 201

    except sqlite3.IntegrityError as e:
        conn.close()
        if 'username' in str(e):
            return jsonify({'error': 'Username already taken'}), 409
        elif 'email' in str(e):
            return jsonify({'error': 'Email already registered'}), 409
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user and return session token"""
    data = request.get_json()
    username_or_email = data.get('username', '').strip()
    password = data.get('password', '')

    if not username_or_email or not password:
        return jsonify({'error': 'Username/email and password are required'}), 400

    conn = get_db()
    cursor = conn.cursor()

    if '@' in username_or_email:
        cursor.execute('SELECT * FROM users WHERE email = ? AND is_active = 1', (username_or_email.lower(),))
    else:
        cursor.execute('SELECT * FROM users WHERE username = ? AND is_active = 1', (username_or_email,))

    user = cursor.fetchone()

    if not user or not verify_password(password, user['password_hash'], user['salt']):
        conn.close()
        return jsonify({'error': 'Invalid credentials'}), 401

    token = secrets.token_hex(32)
    expires_at = datetime.now() + timedelta(days=7)

    cursor.execute('''
        INSERT INTO sessions (user_id, token, expires_at)
        VALUES (?, ?, ?)
    ''', (user['id'], token, expires_at))

    cursor.execute('UPDATE users SET last_login = ? WHERE id = ?', (datetime.now(), user['id']))

    conn.commit()
    conn.close()

    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': {'id': user['id'], 'username': user['username'], 'email': user['email']}
    })

@app.route('/api/auth/logout', methods=['POST'])
@token_required
def logout():
    """Logout user and invalidate token"""
    token = request.headers.get('Authorization')
    if token.startswith('Bearer '):
        token = token[7:]

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM sessions WHERE token = ?', (token,))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user():
    """Get current user info"""
    return jsonify({
        'user': {
            'id': request.user_id,
            'username': request.username,
            'email': request.email
        }
    })

# ============== QUIZ ROUTES ==============
@app.route('/api/quizzes', methods=['GET'])
@token_required
def get_quizzes():
    """Get all quizzes for current user"""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT q.*,
               COUNT(a.id) as attempt_count,
               MAX(a.percentage) as best_score,
               AVG(a.percentage) as avg_score
        FROM quizzes q
        LEFT JOIN attempts a ON q.id = a.quiz_id AND a.user_id = ?
        WHERE q.user_id = ?
        GROUP BY q.id
        ORDER BY q.last_modified DESC
    ''', (request.user_id, request.user_id))

    quizzes = []
    for row in cursor.fetchall():
        quiz = dict(row)
        quiz['questions'] = json.loads(quiz['questions'])
        quizzes.append(quiz)

    conn.close()
    return jsonify({'quizzes': quizzes})

@app.route('/api/quizzes', methods=['POST'])
@token_required
def create_quiz():
    """Create a new quiz"""
    data = request.get_json()

    title = data.get('title', '').strip()
    questions = data.get('questions', [])
    description = data.get('description', '')
    color = data.get('color', '#6366f1')
    is_public = data.get('is_public', False)

    if not title:
        return jsonify({'error': 'Quiz title is required'}), 400
    if not questions:
        return jsonify({'error': 'Quiz must have at least one question'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
        INSERT INTO quizzes (user_id, title, description, questions, color, is_public)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (request.user_id, title, description, json.dumps(questions), color, is_public))

    quiz_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({
        'message': 'Quiz created successfully',
        'quiz_id': quiz_id
    }), 201

@app.route('/api/quizzes/<int:quiz_id>', methods=['GET'])
@token_required
def get_quiz(quiz_id):
    """Get a specific quiz"""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM quizzes WHERE id = ? AND user_id = ?', (quiz_id, request.user_id))
    quiz = cursor.fetchone()

    if not quiz:
        conn.close()
        return jsonify({'error': 'Quiz not found'}), 404

    quiz_dict = dict(quiz)
    quiz_dict['questions'] = json.loads(quiz_dict['questions'])

    cursor.execute('''
        SELECT * FROM attempts WHERE quiz_id = ? AND user_id = ? ORDER BY created_at DESC
    ''', (quiz_id, request.user_id))

    attempts = []
    for row in cursor.fetchall():
        attempt = dict(row)
        attempt['answers'] = json.loads(attempt['answers'])
        attempts.append(attempt)

    quiz_dict['attempts'] = attempts
    conn.close()

    return jsonify({'quiz': quiz_dict})

@app.route('/api/quizzes/<int:quiz_id>', methods=['PUT'])
@token_required
def update_quiz(quiz_id):
    """Update an existing quiz"""
    data = request.get_json()

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT id FROM quizzes WHERE id = ? AND user_id = ?', (quiz_id, request.user_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Quiz not found'}), 404

    title = data.get('title', '').strip()
    questions = data.get('questions', [])
    description = data.get('description', '')
    color = data.get('color', '#6366f1')
    is_public = data.get('is_public', False)

    cursor.execute('''
        UPDATE quizzes
        SET title = ?, description = ?, questions = ?, color = ?, is_public = ?, last_modified = ?
        WHERE id = ? AND user_id = ?
    ''', (title, description, json.dumps(questions), color, is_public, datetime.now(), quiz_id, request.user_id))

    conn.commit()
    conn.close()

    return jsonify({'message': 'Quiz updated successfully'})

@app.route('/api/quizzes/<int:quiz_id>', methods=['DELETE'])
@token_required
def delete_quiz(quiz_id):
    """Delete a quiz"""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('DELETE FROM quizzes WHERE id = ? AND user_id = ?', (quiz_id, request.user_id))

    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Quiz not found'}), 404

    conn.commit()
    conn.close()

    return jsonify({'message': 'Quiz deleted successfully'})

@app.route('/api/quizzes/<int:quiz_id>/attempts', methods=['POST'])
@token_required
def record_attempt(quiz_id):
    """Record a quiz attempt"""
    data = request.get_json()

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT id FROM quizzes WHERE id = ? AND (user_id = ? OR is_public = 1)',
                   (quiz_id, request.user_id))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Quiz not found'}), 404

    cursor.execute('''
        INSERT INTO attempts (quiz_id, user_id, score, total, percentage, answers, study_mode, timed, max_streak, time_taken)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        quiz_id,
        request.user_id,
        data.get('score', 0),
        data.get('total', 0),
        data.get('percentage', 0),
        json.dumps(data.get('answers', {})),
        data.get('study_mode', False),
        data.get('timed', False),
        data.get('max_streak', 0),
        data.get('time_taken')
    ))

    attempt_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({
        'message': 'Attempt recorded',
        'attempt_id': attempt_id
    }), 201

# ============== HEALTH CHECK ==============
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        import google.generativeai as genai
        gemini_available = True
    except ImportError:
        gemini_available = False
    
    return jsonify({
        'status': 'healthy',
        'database': os.path.exists(DATABASE),
        'gemini_available': gemini_available,
        'gemini_key_set': bool(GEMINI_API_KEY)
    })

# ============== MAIN ==============
if __name__ == '__main__':
    init_db()
    print("🚀 Starting Quiz Master Pro Server...")
    print(f"   API: http://172.17.28.77:5000/api")
    print(f"   Gemini API Key: {'✓ Set' if GEMINI_API_KEY else '✗ Not Set'}")
    app.run(host='0.0.0.0', port=5000, debug=True)