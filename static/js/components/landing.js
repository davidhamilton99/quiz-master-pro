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
                <h1 class="hero-title">
                    Turn Your Notes Into<br>
                    <span class="gradient-text">Interactive Quizzes</span>
                </h1>
                <p class="hero-subtitle">
                    Use AI to instantly create practice quizzes from any study material.
                    Track your progress, master the content, ace your exams.
                </p>
                <div class="hero-cta">
                    <button class="btn btn-primary btn-lg" onclick="window.app.navigate('register')">
                        ${icon('rocket')} Start Creating Quizzes
                    </button>
                    <button class="btn btn-secondary btn-lg" onclick="window.app.scrollToHowItWorks()">
                        ${icon('bookOpen')} See How It Works
                    </button>
                </div>
                <p class="hero-note">Free forever &bull; No credit card required</p>
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

        <!-- How It Works Section -->
        <section id="how-it-works" class="landing-section">
            <h2 class="section-title">How It Works</h2>
            <p class="section-subtitle">Create your first quiz in under 5 minutes</p>

            <div class="steps-container">
                <div class="step">
                    <div class="step-number">1</div>
                    <div class="step-icon">${icon('notepadText', 'icon-3xl')}</div>
                    <h3>Gather Your Material</h3>
                    <p>Copy text from your notes, textbooks, lecture slides, or any study material you want to learn.</p>
                </div>

                <div class="step-arrow">${icon('arrowRight', 'icon-xl')}</div>

                <div class="step">
                    <div class="step-number">2</div>
                    <div class="step-icon">${icon('bot', 'icon-3xl')}</div>
                    <h3>AI Creates Questions</h3>
                    <p>Use our guided wizard with ChatGPT or Claude. We give you the exact prompt — just paste and go.</p>
                </div>

                <div class="step-arrow">${icon('arrowRight', 'icon-xl')}</div>

                <div class="step">
                    <div class="step-number">3</div>
                    <div class="step-icon">${icon('target', 'icon-3xl')}</div>
                    <h3>Study & Master</h3>
                    <p>Practice with interactive quizzes. Get instant feedback, track progress, and ace your exams.</p>
                </div>
            </div>
        </section>

        <!-- Features Section -->
        <section class="landing-section features-section">
            <h2 class="section-title">Everything You Need to Study Smarter</h2>

            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">${icon('brain', 'icon-2xl')}</div>
                    <h3>Multiple Question Types</h3>
                    <p>Multiple choice, true/false, matching, and ordering questions to test different skills.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">${icon('barChart', 'icon-2xl')}</div>
                    <h3>Progress Tracking</h3>
                    <p>See your scores over time, identify weak areas, and watch yourself improve.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">${icon('cloudUpload', 'icon-2xl')}</div>
                    <h3>Cloud Sync</h3>
                    <p>Your quizzes and progress are saved securely. Access from any device, anytime.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">${icon('bookOpen', 'icon-2xl')}</div>
                    <h3>Study Guide Builder</h3>
                    <p>Turn documents into beautiful, interactive study guides with key terms highlighted.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">${icon('zap', 'icon-2xl')}</div>
                    <h3>Instant Feedback</h3>
                    <p>Study mode shows you the right answer immediately so you learn as you go.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-icon">${icon('trophy', 'icon-2xl')}</div>
                    <h3>Achievements & Streaks</h3>
                    <p>Stay motivated with XP, levels, daily streaks, and achievement badges.</p>
                </div>
            </div>
        </section>

        <!-- AI Section -->
        <section class="landing-section ai-section">
            <div class="ai-content">
                <h2 class="section-title">Works With Any AI</h2>
                <p class="section-subtitle">Use your favorite AI assistant to generate questions</p>

                <div class="ai-logos">
                    <div class="ai-logo">
                        <span class="ai-icon">${icon('messageSquare', 'icon-xl')}</span>
                        <span>ChatGPT</span>
                    </div>
                    <div class="ai-logo">
                        <span class="ai-icon">${icon('brain', 'icon-xl')}</span>
                        <span>Claude</span>
                    </div>
                    <div class="ai-logo">
                        <span class="ai-icon">${icon('hexagon', 'icon-xl')}</span>
                        <span>Gemini</span>
                    </div>
                    <div class="ai-logo">
                        <span class="ai-icon">${icon('terminal', 'icon-xl')}</span>
                        <span>Llama</span>
                    </div>
                </div>

                <p class="ai-note">
                    We provide the exact prompt format. You just paste your notes,
                    copy the AI's response, and you're ready to study.
                </p>
            </div>
        </section>

        <!-- CTA Section -->
        <section class="landing-section cta-section">
            <div class="cta-content">
                <h2>Ready to Study Smarter?</h2>
                <p>Join thousands of students who've transformed their study habits.</p>
                <button class="btn btn-primary btn-lg" onclick="window.app.navigate('register')">
                    Create Your Free Account
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
