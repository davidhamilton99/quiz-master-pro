/* Landing Page - First thing users see */
import { icon } from '../utils/icons.js';

export function renderLanding() {
    return `
    <div class="landing-page">
        <!-- Hero Section -->
        <header class="landing-hero">
            <nav class="landing-nav">
                <div class="landing-logo">
                    <span class="logo-icon">${icon('graduationCap', 'icon-lg')}</span>
                    <span class="logo-text">Quiz Master Pro</span>
                </div>
                <div class="landing-nav-links">
                    <button class="btn btn-ghost" onclick="window.app.navigate('login')">Log In</button>
                    <button class="btn btn-primary" onclick="window.app.navigate('register')">Get Started Free</button>
                </div>
            </nav>

            <div class="hero-content">
                <div class="hero-badge">Used by students preparing for CCNA, CompTIA, and more</div>
                <h1 class="hero-title">
                    Study Smarter.<br>
                    <span class="gradient-text">Pass Your Exam.</span>
                </h1>
                <p class="hero-subtitle">
                    Quiz Master Pro helps you prepare for IT certification exams
                    with practice quizzes, spaced repetition, and progress tracking
                    &mdash; all in one place.
                </p>
                <div class="hero-cta">
                    <button class="btn btn-primary btn-lg" onclick="window.app.navigate('register')">
                        ${icon('rocket')} Create Free Account
                    </button>
                    <button class="btn btn-secondary btn-lg" onclick="window.app.scrollToHowItWorks()">
                        See How It Works
                    </button>
                </div>
                <p class="hero-note">100% free &bull; No credit card &bull; Works on any device</p>
            </div>

            <div class="hero-visual">
                <div class="floating-card card-1">
                    <div class="mini-question">What protocol uses port 443?</div>
                    <div class="mini-options">
                        <div class="mini-option">HTTP</div>
                        <div class="mini-option correct">HTTPS ${icon('check')}</div>
                        <div class="mini-option">FTP</div>
                    </div>
                </div>
                <div class="floating-card card-2">
                    <div class="score-badge">92%</div>
                    <div class="score-label">Great job!</div>
                </div>
                <div class="floating-card card-3">
                    <span class="streak-icon">${icon('flame', 'icon-lg')}</span>
                    <div class="streak-count">5 day streak</div>
                </div>
            </div>
        </header>

        <!-- What Is This Section - for confused new users -->
        <section class="landing-section what-is-section">
            <h2 class="section-title">What Is Quiz Master Pro?</h2>
            <p class="section-subtitle">
                Think of it as your personal study coach. You create practice questions
                from your study material, and the app helps you review them until you've mastered every topic.
            </p>

            <div class="what-is-grid">
                <div class="what-is-card">
                    <div class="what-is-icon">${icon('notepadText', 'icon-2xl')}</div>
                    <h3>Create Practice Tests</h3>
                    <p>Build quizzes from your notes, textbooks, or use AI to generate questions automatically. Supports multiple choice, true/false, matching, and more.</p>
                </div>
                <div class="what-is-card">
                    <div class="what-is-icon">${icon('brain', 'icon-2xl')}</div>
                    <h3>Learn With Repetition</h3>
                    <p>The app remembers what you got wrong and brings those questions back at the perfect time. This is called spaced repetition &mdash; the most effective way to memorize anything.</p>
                </div>
                <div class="what-is-card">
                    <div class="what-is-icon">${icon('barChart', 'icon-2xl')}</div>
                    <h3>Track Your Readiness</h3>
                    <p>See exactly which topics you're strong in and which need more work. Take practice exams that mirror the real thing, so you know when you're ready.</p>
                </div>
            </div>
        </section>

        <!-- Who Is It For -->
        <section class="landing-section use-case-section">
            <h2 class="section-title">Built For Students Like You</h2>

            <div class="use-case-grid">
                <div class="use-case-card">
                    <div class="use-case-emoji">${icon('shield', 'icon-xl')}</div>
                    <h3>IT Certification Prep</h3>
                    <p>Studying for CompTIA Security+, CCNA, A+, or any IT cert? Create domain-specific practice exams and track your readiness score per objective.</p>
                </div>
                <div class="use-case-card">
                    <div class="use-case-emoji">${icon('bookOpen', 'icon-xl')}</div>
                    <h3>College Courses</h3>
                    <p>Turn lecture notes and textbook chapters into practice quizzes. Review before midterms and finals with study mode and flashcards.</p>
                </div>
                <div class="use-case-card">
                    <div class="use-case-emoji">${icon('users', 'icon-xl')}</div>
                    <h3>Study Groups</h3>
                    <p>Share your quizzes with classmates through the Community library. Copy quizzes others have shared and add them to your own study plan.</p>
                </div>
            </div>
        </section>

        <!-- How It Works Section -->
        <section id="how-it-works" class="landing-section">
            <h2 class="section-title">Get Started in 3 Simple Steps</h2>
            <p class="section-subtitle">No complicated setup. You can be studying within minutes.</p>

            <div class="steps-container">
                <div class="step">
                    <div class="step-number">1</div>
                    <div class="step-icon">${icon('userPlus', 'icon-3xl')}</div>
                    <h3>Sign Up Free</h3>
                    <p>Create your account in seconds. Just pick a username and password &mdash; that's it.</p>
                </div>

                <div class="step-arrow">${icon('arrowRight', 'icon-xl')}</div>

                <div class="step">
                    <div class="step-number">2</div>
                    <div class="step-icon">${icon('plus', 'icon-3xl')}</div>
                    <h3>Add Your Questions</h3>
                    <p>Type questions yourself, paste them in bulk, or use AI (like ChatGPT) to generate them from your notes. We'll walk you through it.</p>
                </div>

                <div class="step-arrow">${icon('arrowRight', 'icon-xl')}</div>

                <div class="step">
                    <div class="step-number">3</div>
                    <div class="step-icon">${icon('target', 'icon-3xl')}</div>
                    <h3>Study & Track Progress</h3>
                    <p>Take quizzes, review flashcards, and watch your scores improve. The app tracks everything so you know exactly where you stand.</p>
                </div>
            </div>
        </section>

        <!-- Features Section -->
        <section class="landing-section features-section">
            <h2 class="section-title">Everything You Need to Study Smarter</h2>

            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">${icon('brain', 'icon-2xl')}</div>
                    <h3>6 Question Types</h3>
                    <p>Multiple choice, true/false, matching, ordering, multi-select, and code questions. Test yourself in every way.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">${icon('rotateCcw', 'icon-2xl')}</div>
                    <h3>Spaced Repetition</h3>
                    <p>Wrong answers automatically become review cards. The app brings them back at the right time so you don't forget.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">${icon('barChart', 'icon-2xl')}</div>
                    <h3>Readiness Dashboard</h3>
                    <p>See your score for each exam domain. Know exactly which topics need more work before test day.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">${icon('zap', 'icon-2xl')}</div>
                    <h3>Study Mode</h3>
                    <p>Get instant feedback after each question. See the correct answer and explanation right away so you learn as you go.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">${icon('clock', 'icon-2xl')}</div>
                    <h3>Timed Practice Exams</h3>
                    <p>Simulate real exam conditions with timed quizzes. Build confidence and time management skills.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">${icon('trophy', 'icon-2xl')}</div>
                    <h3>XP & Streaks</h3>
                    <p>Earn XP for every quiz, level up, and maintain daily streaks. A little gamification goes a long way.</p>
                </div>
            </div>
        </section>

        <!-- CTA Section -->
        <section class="landing-section cta-section">
            <div class="cta-content">
                <h2>Ready to Start Studying?</h2>
                <p>Create your free account and build your first quiz today. It takes less than a minute.</p>
                <button class="btn btn-primary btn-lg" onclick="window.app.navigate('register')">
                    Get Started Free
                </button>
            </div>
        </section>

        <!-- Footer -->
        <footer class="landing-footer">
            <div class="footer-content">
                <div class="footer-logo">
                    <span class="logo-icon">${icon('graduationCap', 'icon-lg')}</span>
                    <span class="logo-text">Quiz Master Pro</span>
                </div>
                <p class="footer-tagline">Turn knowledge into mastery.</p>
            </div>
        </footer>
    </div>
    `;
}

export function scrollToHowItWorks() {
    const section = document.getElementById('how-it-works');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}
