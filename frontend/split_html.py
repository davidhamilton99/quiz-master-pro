#!/usr/bin/env python3
"""
Split monolithic HTML file into organized structure
Run this in: /home/davidhamilton/quiz-master-pro/frontend/
"""
import os
import re

def create_directories():
    """Create directory structure"""
    dirs = ['css', 'js/components', 'js/utils']
    for d in dirs:
        os.makedirs(d, exist_ok=True)
    print("✅ Created directory structure")

def extract_css(content):
    """Extract CSS between <style> tags"""
    match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
    if match:
        return match.group(1).strip()
    return ''

def extract_js(content):
    """Extract JS between <script> tags (not external scripts)"""
    # Find the main script block (not the external script tags)
    match = re.search(r'<script>\s*const API_URL(.*?)</script>', content, re.DOTALL)
    if match:
        return 'const API_URL' + match.group(1).strip()
    return ''

def split_javascript(js_content):
    """Split JavaScript into separate files"""
    files = {}
    
    # 1. Extract API_URL and state
    state_match = re.search(r'(const API_URL = .*?;.*?const state = \{.*?\};)', js_content, re.DOTALL)
    if state_match:
        files['js/state.js'] = state_match.group(1).strip()
    
    # 2. Extract utility functions
    helpers = []
    for func_name in ['toggleDarkMode', 'showToast', 'formatDate', 'getRandomColor', 'shuffleArray', 'escapeHtml']:
        pattern = rf'(function {func_name}\([^)]*\).*?^\}})'
        match = re.search(pattern, js_content, re.MULTILINE | re.DOTALL)
        if match:
            helpers.append(match.group(1))
    
    if helpers:
        files['js/utils/helpers.js'] = '\n\n'.join(helpers)
    
    # 3. Extract storage functions
    storage_funcs = []
    for func_name in ['saveQuizProgress', 'loadQuizProgress', 'getAllInProgressQuizzes', 'resumeQuiz', 
                      'clearQuizProgress', 'showResumePrompt', 'continueQuiz', 'discardProgress',
                      'saveAuth', 'loadAuth', 'loadFolders', 'saveFolders', 'loadCustomOrder', 
                      'saveCustomOrder', 'validateAndCleanData']:
        pattern = rf'(function {func_name}\([^)]*\).*?^\}})'
        match = re.search(pattern, js_content, re.MULTILINE | re.DOTALL)
        if match:
            storage_funcs.append(match.group(1))
    
    if storage_funcs:
        files['js/utils/storage.js'] = '\n\n'.join(storage_funcs)
    
    # 4. Extract validation/parsing
    validation_funcs = []
    for func_name in ['parseQuizData']:
        pattern = rf'(function {func_name}\([^)]*\).*?^\}})'
        match = re.search(pattern, js_content, re.MULTILINE | re.DOTALL)
        if match:
            validation_funcs.append(match.group(1))
    
    if validation_funcs:
        files['js/utils/validation.js'] = '\n\n'.join(validation_funcs)
    
    # 5. Extract API functions
    api_funcs = []
    for func_name in ['apiCall', 'login', 'register', 'logout', 'loadQuizzes']:
        pattern = rf'(async function {func_name}\([^)]*\).*?^\}})'
        match = re.search(pattern, js_content, re.MULTILINE | re.DOTALL)
        if match:
            api_funcs.append(match.group(1))
    
    if api_funcs:
        files['js/api.js'] = '\n\n'.join(api_funcs)
    
    # 6. Extract auth components
    auth_funcs = []
    for func_name in ['renderAuth', 'handleLogin', 'handleRegister']:
        pattern = rf'(function {func_name}\([^)]*\).*?^\}})'
        match = re.search(pattern, js_content, re.MULTILINE | re.DOTALL)
        if match:
            auth_funcs.append(match.group(1))
    
    if auth_funcs:
        files['js/components/auth.js'] = '\n\n'.join(auth_funcs)
    
    # 7. Extract library component
    library_funcs = []
    for func_name in ['renderLibrary', 'getUserStats', 'getQuizStats', 'getCategories', 'getFilteredQuizzes',
                      'handleQuizDragStart', 'handleQuizDragOver', 'handleQuizDragLeave', 
                      'handleQuizDrop', 'handleQuizDragEnd', 'showQuizOptions', 'startQuizFromModal',
                      'startQuizFresh', 'createFolder', 'deleteFolder', 'addToFolder']:
        pattern = rf'(function {func_name}\([^)]*\).*?^\}})'
        match = re.search(pattern, js_content, re.MULTILINE | re.DOTALL)
        if match:
            library_funcs.append(match.group(1))
    
    if library_funcs:
        files['js/components/library.js'] = '\n\n'.join(library_funcs)
    
    # 8. Extract create component
    create_funcs = []
    for func_name in ['renderCreate', 'saveQuiz', 'editQuiz', 'deleteQuiz', 'exportQuizzes',
                      'showImportModal', 'processImport', 'showQuizletImport', 'processQuizletImport']:
        pattern = rf'(function {func_name}\([^)]*\).*?^\}})'
        match = re.search(pattern, js_content, re.MULTILINE | re.DOTALL)
        if match:
            create_funcs.append(match.group(1))
    
    if create_funcs:
        files['js/components/create.js'] = '\n\n'.join(create_funcs)
    
    # 9. Extract quiz component
    quiz_funcs = []
    for func_name in ['startQuiz', 'startTimer', 'stopTimer', 'updateTimerDisplay', 'renderQuiz',
                      'selectAnswer', 'checkStudyAnswer', 'nextQuestion', 'prevQuestion', 
                      'toggleFlag', 'submitQuiz', 'saveAndExitQuiz',
                      'handleDragStart', 'handleDragOver', 'handleDragLeave', 'handleDrop', 'handleDragEnd']:
        pattern = rf'(function {func_name}\([^)]*\).*?^\}})'
        match = re.search(pattern, js_content, re.MULTILINE | re.DOTALL)
        if match:
            quiz_funcs.append(match.group(1))
    
    # Also get draggedIndex variable
    if 'let draggedIndex = null;' in js_content:
        quiz_funcs.insert(0, 'let draggedIndex = null;')
    
    if quiz_funcs:
        files['js/components/quiz.js'] = '\n\n'.join(quiz_funcs)
    
    # 10. Extract results component
    results_funcs = []
    for func_name in ['calculateScore', 'renderResults', 'renderReview']:
        pattern = rf'(function {func_name}\([^)]*\).*?^\}})'
        match = re.search(pattern, js_content, re.MULTILINE | re.DOTALL)
        if match:
            results_funcs.append(match.group(1))
    
    if results_funcs:
        files['js/components/results.js'] = '\n\n'.join(results_funcs)
    
    # 11. Extract main app logic (render, bindEvents, initialization)
    app_code = []
    
    # Get render function
    pattern = r'(function render\(\).*?^\})'
    match = re.search(pattern, js_content, re.MULTILINE | re.DOTALL)
    if match:
        app_code.append(match.group(1))
    
    # Get bindEvents function
    pattern = r'(function bindEvents\(\).*?^\})'
    match = re.search(pattern, js_content, re.MULTILINE | re.DOTALL)
    if match:
        app_code.append(match.group(1))
    
    # Get initialization code (after all function definitions)
    pattern = r'(// Initialize.*?render\(\);)'
    match = re.search(pattern, js_content, re.DOTALL)
    if match:
        app_code.append(match.group(1))
    
    if app_code:
        files['js/app.js'] = '\n\n'.join(app_code)
    
    return files

def create_new_html():
    """Create new minimal HTML file"""
    html = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Quiz Master Pro - Smart study tool for students and educators">
    <title>Quiz Master Pro | Smart Study Platform</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:wght@600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <div id="app"></div>
    <div id="toast-container" class="toast-container"></div>

    <!-- Load JavaScript files in order (dependencies first) -->
    <script src="js/state.js"></script>
    <script src="js/utils/helpers.js"></script>
    <script src="js/utils/storage.js"></script>
    <script src="js/utils/validation.js"></script>
    <script src="js/api.js"></script>
    <script src="js/components/auth.js"></script>
    <script src="js/components/library.js"></script>
    <script src="js/components/create.js"></script>
    <script src="js/components/quiz.js"></script>
    <script src="js/components/results.js"></script>
    <script src="js/app.js"></script>
</body>
</html>'''
    return html

def main():
    """Main function to split the HTML file"""
    print("🚀 Starting HTML file splitter...")
    
    # Check if index.html exists
    if not os.path.exists('index.html'):
        print("❌ ERROR: index.html not found in current directory")
        print("Please run this script from: /home/davidhamilton/quiz-master-pro/frontend/")
        return
    
    # Read the HTML file
    print("📖 Reading index.html...")
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Create backup
    print("💾 Creating backup: index.html.backup")
    with open('index.html.backup', 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Create directory structure
    create_directories()
    
    # Extract CSS
    print("🎨 Extracting CSS...")
    css = extract_css(content)
    if css:
        with open('css/styles.css', 'w', encoding='utf-8') as f:
            f.write(css)
        print(f"   ✅ Created css/styles.css ({len(css)} chars)")
    
    # Extract and split JavaScript
    print("📦 Extracting JavaScript...")
    js_content = extract_js(content)
    
    if not js_content:
        print("❌ ERROR: Could not extract JavaScript content")
        return
    
    print("✂️  Splitting JavaScript into modules...")
    js_files = split_javascript(js_content)
    
    # Write JavaScript files
    for filepath, code in js_files.items():
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(code)
        print(f"   ✅ Created {filepath} ({len(code)} chars)")
    
    # Create new minimal HTML
    print("📄 Creating new index.html...")
    new_html = create_new_html()
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_html)
    print(f"   ✅ Created new index.html ({len(new_html)} chars)")
    
    # Summary
    print("\n" + "="*60)
    print("✅ SUCCESS! Files have been split")
    print("="*60)
    print(f"\n📁 Created {len(js_files) + 1} new files:")
    print("   - css/styles.css")
    for filepath in sorted(js_files.keys()):
        print(f"   - {filepath}")
    print("   - index.html (replaced with new version)")
    
    print("\n💾 Backup saved as: index.html.backup")
    
    print("\n🔍 File Structure:")
    print("""
    frontend/
    ├── index.html (NEW - just structure)
    ├── index.html.backup (your original file)
    ├── css/
    │   └── styles.css
    └── js/
        ├── state.js
        ├── api.js
        ├── app.js
        ├── components/
        │   ├── auth.js
        │   ├── library.js
        │   ├── create.js
        │   ├── quiz.js
        │   └── results.js
        └── utils/
            ├── helpers.js
            ├── storage.js
            └── validation.js
    """)
    
    print("\n🚀 Next Steps:")
    print("1. Test your site: https://davidhamilton.pythonanywhere.com")
    print("2. Check browser console (F12) for any errors")
    print("3. If everything works:")
    print("   cd ~/quiz-master-pro")
    print("   git add .")
    print('   git commit -m "Split HTML into modular files"')
    print("   git push origin main")
    print("\n4. If there are issues:")
    print("   cp index.html.backup index.html  (restore backup)")
    
    print("\n✨ Happy coding!")

if __name__ == '__main__':
    main()
