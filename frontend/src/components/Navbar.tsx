import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import './Navbar.css';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" aria-label="Home">
          <span className="navbar-icon" aria-hidden>📍</span>
          <span className="navbar-title">Common Table</span>
        </Link>
        <nav className="navbar-links" aria-label="Main">
          <NavLink to="/" className={({ isActive }) => `navbar-link ${isActive ? 'navbar-link-active' : ''}`} end>Home</NavLink>
          <NavLink to="/food-rescue" className={({ isActive }) => `navbar-link ${isActive ? 'navbar-link-active' : ''}`}>Food Rescue</NavLink>
          <NavLink to="/community" className={({ isActive }) => `navbar-link ${isActive ? 'navbar-link-active' : ''}`} end>Community</NavLink>
          <NavLink to="/community/chat" className={({ isActive }) => `navbar-link ${isActive ? 'navbar-link-active' : ''}`}>Chat</NavLink>
        </nav>
      </div>
    </header>
  );
}
