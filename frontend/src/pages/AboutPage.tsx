import React from 'react';
import './AboutPage.css';

export function AboutPage() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="about-hero-inner">
          <h1 className="about-hero-title">Common Table</h1>
          <p className="about-hero-tagline">Connecting people with food, every day</p>
        </div>
      </section>

      {/* Section 1: The Problem */}
      <section className="about-section about-problem" aria-labelledby="about-problem-title">
        <div className="about-inner">
          <h2 id="about-problem-title" className="about-section-title">
            1 in 4 college students in Minnesota face food insecurity
          </h2>
          <div className="about-stats-grid">
            <div className="about-big-stat">
              <span className="about-big-number">1 in 4</span>
              <span className="about-big-label">Minnesota college students face food insecurity</span>
            </div>
            <div className="about-big-stat">
              <span className="about-big-number">902</span>
              <span className="about-big-label">Individuals served by Tommie Shelf in 2024-25</span>
            </div>
            <div className="about-big-stat">
              <span className="about-big-number">77%</span>
              <span className="about-big-label">Growth in Tommie Shelf usage since 2019</span>
            </div>
            <div className="about-big-stat">
              <span className="about-big-number">9 million</span>
              <span className="about-big-label">Visits to Minnesota food shelves in 2024 (1.4M more than 2023)</span>
            </div>
            <div className="about-big-stat">
              <span className="about-big-number">Once a month</span>
              <span className="about-big-label">How often campus food shelves run</span>
            </div>
          </div>
          <p className="about-problem-para">
            Food insecurity doesn't take a month off between distributions. Students face hunger every day — but existing
            resources are fragmented across 10+ different websites, closed during January and summer, and offer no way
            to know what's available before making the trip. For marginalized students — first-generation, students of
            color, international students — the rates are even higher.
          </p>
        </div>
      </section>

      {/* Section 2: The Solution */}
      <section className="about-section about-solution" aria-labelledby="about-solution-title">
        <div className="about-inner">
          <h2 id="about-solution-title" className="about-section-title">
            Common Table connects people with food, every day
          </h2>
          <div className="about-features-list">
            <div className="about-feature-block">
              <span className="about-feature-icon" aria-hidden>🗓️</span>
              <h3 className="about-feature-heading">Find food any day of the week</h3>
              <p className="about-feature-desc">
                We aggregated 15+ food shelves near St. Paul and Minneapolis into one weekly calendar. See what's open
                today, tomorrow, or any day — with hours, eligibility, and directions.
              </p>
            </div>
            <div className="about-feature-block">
              <span className="about-feature-icon" aria-hidden>📸</span>
              <h3 className="about-feature-heading">AI-powered live inventory</h3>
              <p className="about-feature-desc">
                Community members upload photos of food shelf stock. Our AI (Claude by Anthropic) detects what food is
                available and estimates quantities in real time — so you know what's there before you go.
              </p>
            </div>
            <div className="about-feature-block">
              <span className="about-feature-icon" aria-hidden>🚨</span>
              <h3 className="about-feature-heading">Surplus food rescue</h3>
              <p className="about-feature-desc">
                Weddings, corporate lunches, church potlucks — huge amounts of good food go to waste every day. Common
                Table lets anyone post surplus food for food banks or community members to claim before it expires.
              </p>
            </div>
            <div className="about-feature-block">
              <span className="about-feature-icon" aria-hidden>💬</span>
              <h3 className="about-feature-heading">Community, not just a directory</h3>
              <p className="about-feature-desc">
                Chat rooms for SNAP help, recipes, transportation, and support. An AI assistant that answers questions
                about food near you. A moderated, dignity-first space where nobody has to navigate hunger alone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Built At */}
      <section className="about-section about-built" aria-labelledby="about-built-title">
        <div className="about-inner">
          <h2 id="about-built-title" className="about-section-title">
            Built in 24 hours at Tommie Buildfest 2026
          </h2>
          <p className="about-built-sub">In partnership with:</p>
          <ul className="about-partners-list">
            <li>Loaves and Fishes</li>
            <li>The Food Group</li>
            <li>Center for the Common Good</li>
            <li>Tommie Shelf / University of St. Thomas</li>
          </ul>
          <p className="about-built-para">
            Common Table is open source and designed to scale to any campus or city. The same model works for any
            community — just plug in local food shelf data.
          </p>
        </div>
      </section>

      {/* Section 4: The Team */}
      <section className="about-section about-team" aria-labelledby="about-team-title">
        <div className="about-inner">
          <h2 id="about-team-title" className="about-section-title">
            The Team
          </h2>
          <p className="about-team-placeholder">Team member names and roles — placeholder</p>
          <p className="about-team-tagline">Built with 💜 for the common good.</p>
        </div>
      </section>
    </div>
  );
}
