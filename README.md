Smart study platform for students and educators.

## Features
- 📚 Create and manage quizzes
- 🎯 Multiple question types (single/multiple choice, ordering)
- 📖 Study mode with instant feedback
- ⏱️ Timed quiz mode
- 📊 Progress tracking and statistics
- 🌙 Dark mode support
- 💾 Save & resume quiz progress

## Tech Stack
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Backend:** Python Flask
- **Database:** SQLite
- **Hosting:** PythonAnywhere

## Project Structure
quiz-master-pro/
├── frontend/
│   └── index.html          # Single-page application
├── backend/
│   ├── quiz_server.py      # Flask API server
│   └── quiz_master.db      # SQLite database (not in Git)
└── README.md

## Setup Instructions

### 1. Clone Repository
```bash
git clone git@github.com:YOUR_USERNAME/quiz-master-pro.git
cd quiz-master-pro
```

### 2. Install Dependencies
```bash
pip install flask flask-cors
```

### 3. Initialize Database
```bash
cd backend
python quiz_server.py
```

### 4. Configuration
Update `quiz_server.py` with your database path if needed.

## Deployment (PythonAnywhere)

### Web App Configuration
- Source code: `/home/yourusername/quiz-master-pro`
- Working directory: `/home/yourusername/quiz-master-pro/backend`
- Static files: `/` → `/home/yourusername/quiz-master-pro/frontend`

### WSGI Configuration
See setup guide for WSGI file configuration.

## Development

### Making Changes
```bash
# Make your edits
git add .
git commit -m "Description of changes"
git push origin main
```

### Deploying Updates
```bash
cd ~/quiz-master-pro
git pull origin main
# Reload web app via PythonAnywhere dashboard
```

## Author
David Hamilton

## License
Private Project
