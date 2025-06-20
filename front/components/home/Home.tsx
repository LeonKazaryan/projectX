import { Outlet, Link, useNavigate } from "react-router-dom";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/telegram");
  };

  const handleDemo = () => {
    // Можно добавить демо или тоже вести на телеграм
    navigate("/telegram");
  };

  return (
    <div className="home-container">
      {/* Navigation Header */}
      <nav className="navigation">
        <div className="nav-content">
          <div className="nav-logo">
            <span className="logo-text">Communication AI</span>
          </div>
          <div className="nav-links">
            <Link to="/telegram" className="nav-link telegram-link">
              🚀 Try Telegram Client
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Master Your Communication with
            <span className="gradient-text"> AI-Powered Insights</span>
          </h1>
          <p className="hero-subtitle">
            Get real-time message analysis and smart response suggestions for
            Telegram, WhatsApp, and Instagram. Never struggle with what to say
            again.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary" onClick={handleGetStarted}>
              Start with Telegram
            </button>
            <button className="btn btn-secondary" onClick={handleDemo}>
              Try Demo
            </button>
          </div>
        </div>
        <div className="hero-image">
          <div className="phone-mockup">
            <div className="phone-screen">
              <div className="chat-bubble">
                <div className="message received-message">
                  <span>Hey, can we reschedule our meeting tomorrow?</span>
                </div>
                <div className="typing-indicator">
                  <span>You're typing...</span>
                </div>
                <div className="ai-suggestions">
                  <div className="suggestion-header">💡 Smart Suggestions:</div>
                  <div className="suggestion-item">
                    <span className="suggestion-text">
                      "Of course! What time works better for you?"
                    </span>
                    <span className="suggestion-tone">
                      Friendly & Professional
                    </span>
                  </div>
                  <div className="suggestion-item">
                    <span className="suggestion-text">
                      "Sure, let me check my calendar and get back to you."
                    </span>
                    <span className="suggestion-tone">Professional</span>
                  </div>
                  <div className="suggestion-item">
                    <span className="suggestion-text">
                      "No problem! When would be more convenient?"
                    </span>
                    <span className="suggestion-tone">Casual & Helpful</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="features-container">
          <h2 className="section-title">Communicate Like a Pro Everywhere</h2>
          <div className="features-grid">
            <div className="feature-card telegram" onClick={handleGetStarted}>
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-.38.24-1.27.84-.12.08-.64.42-1.67.85-.22.06-.37.04-.51-.05-.32-.2-.72-.32-1.17-.42-.56-.12-.37-.24-.37-.24s.93-.3 1.81-.62c1.55-.57 3.1-1.2 4.11-1.55.17-.06.28-.05.37.05.08.09.05.24-.01.28z" />
                </svg>
              </div>
              <h3>Telegram</h3>
              <p>
                Get instant writing suggestions for group chats, channels, and
                private messages. Analyze tone and improve your Telegram
                communication.
              </p>
              <div className="feature-cta">
                <span className="cta-text">Try Now →</span>
              </div>
            </div>

            <div className="feature-card whatsapp">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                </svg>
              </div>
              <h3>WhatsApp</h3>
              <p>
                Craft perfect responses for personal and business conversations.
                Real-time analysis helps you maintain the right tone for every
                contact.
              </p>
              <div className="feature-cta coming-soon">
                <span className="cta-text">Coming Soon</span>
              </div>
            </div>

            <div className="feature-card instagram">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </div>
              <h3>Instagram</h3>
              <p>
                Engage authentically with followers and respond to DMs like a
                social media pro. Get suggestions that match your brand voice.
              </p>
              <div className="feature-cta coming-soon">
                <span className="cta-text">Coming Soon</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="how-it-works-container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Real-Time Analysis</h3>
              <p>
                Our AI analyzes incoming messages instantly, understanding
                context, tone, and intent behind every conversation.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Smart Suggestions</h3>
              <p>
                Get multiple response options tailored to your style - from
                professional to casual, helping you find the perfect words.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Learn & Improve</h3>
              <p>
                The more you use it, the better it gets at understanding your
                communication style and preferences.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="cta-content">
          <h2>Ready to Transform Your Communication?</h2>
          <p>
            Join thousands of users who've already improved their messaging
            skills and built better relationships through smarter communication.
          </p>
          <div className="cta-buttons">
            <button
              className="btn btn-primary btn-large"
              onClick={handleGetStarted}
            >
              Try Telegram Client Now
            </button>
            <button className="btn btn-outline btn-large" onClick={handleDemo}>
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <p>&copy; 2024 Communication AI. All rights reserved.</p>
          <div className="footer-links">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#contact">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
