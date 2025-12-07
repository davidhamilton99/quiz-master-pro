#!/usr/bin/env python3
"""
Simple 3-file splitter for Quiz Master Pro
Splits into: index.html, styles.css, app.js
"""
import os
import re

def extract_css(content):
    """Extract CSS between <style> tags"""
    match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
    if match:
        return match.group(1).strip()
    return ''

def extract_js(content):
    """Extract JS between <script> tags"""
    match = re.search(r'<script>(.*?)</script>', content, re.DOTALL)
    if match:
        return match.group(1).strip()
    return ''

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
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div id="app"></div>
    <div id="toast-container" class="toast-container"></div>

    <script src="app.js"></script>
</body>
</html>'''
    return html

def main():
    """Main function to split the HTML file into 3 files"""
    print("🚀 Starting simple 3-file splitter...")
    
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
    backup_name = 'index.html.backup'
    if os.path.exists(backup_name):
        # If backup already exists, add timestamp
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f'index.html.backup.{timestamp}'
    
    print(f"💾 Creating backup: {backup_name}")
    with open(backup_name, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Extract CSS
    print("🎨 Extracting CSS...")
    css = extract_css(content)
    if css:
        with open('styles.css', 'w', encoding='utf-8') as f:
            f.write(css)
        print(f"   ✅ Created styles.css ({len(css)} characters, ~{len(css.splitlines())} lines)")
    else:
        print("   ⚠️  WARNING: No CSS found!")
    
    # Extract JavaScript
    print("📦 Extracting JavaScript...")
    js_content = extract_js(content)
    if js_content:
        with open('app.js', 'w', encoding='utf-8') as f:
            f.write(js_content)
        print(f"   ✅ Created app.js ({len(js_content)} characters, ~{len(js_content.splitlines())} lines)")
    else:
        print("   ⚠️  WARNING: No JavaScript found!")
    
    # Create new minimal HTML
    print("📄 Creating new index.html...")
    new_html = create_new_html()
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_html)
    print(f"   ✅ Created new index.html ({len(new_html)} characters)")
    
    # Summary
    print("\n" + "="*60)
    print("✅ SUCCESS! Files have been split into 3 files")
    print("="*60)
    
    print("\n📁 File Structure:")
    print("""
    frontend/
    ├── index.html          (NEW - just HTML structure)
    ├── styles.css          (NEW - all your CSS)
    ├── app.js              (NEW - all your JavaScript)
    └── index.html.backup   (your original file)
    """)
    
    print("\n📊 File Sizes:")
    if os.path.exists('styles.css'):
        size = os.path.getsize('styles.css')
        print(f"   styles.css: {size:,} bytes (~{size/1024:.1f} KB)")
    if os.path.exists('app.js'):
        size = os.path.getsize('app.js')
        print(f"   app.js: {size:,} bytes (~{size/1024:.1f} KB)")
    
    print("\n🚀 Next Steps:")
    print("1. Test your site: https://davidhamilton.pythonanywhere.com")
    print("   Reload web app: touch /var/www/davidhamilton_pythonanywhere_com_wsgi.py")
    print("\n2. Check browser console (F12) for any errors")
    print("\n3. If everything works, commit to Git:")
    print("   cd ~/quiz-master-pro")
    print("   git add .")
    print('   git commit -m "Split into 3 files: HTML, CSS, JS"')
    print("   git push origin main")
    print("\n4. If there are issues, restore backup:")
    print(f"   cp {backup_name} index.html")
    print("   touch /var/www/davidhamilton_pythonanywhere_com_wsgi.py")
    
    print("\n✨ Done! Your code is now organized and easier to maintain.")

if __name__ == '__main__':
    main()
