import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Create floating shapes
    const shapesContainer = document.querySelector('.shapes-container');
    if (shapesContainer) {
      for (let i = 0; i < 8; i++) {
        const shape = document.createElement('div');
        shape.className = 'floating-shape';
        shape.style.left = Math.random() * 100 + '%';
        shape.style.top = Math.random() * 100 + '%';
        shape.style.animationDelay = Math.random() * 10 + 's';
        shape.style.animationDuration = (Math.random() * 15 + 15) + 's';
        shapesContainer.appendChild(shape);
      }
    }

    return () => {
      if (shapesContainer) {
        shapesContainer.innerHTML = '';
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError("Identifiants incorrects ou problème réseau.");
      setLoading(false);
    } else {
      navigate('/admin');
    }
  };

  return (
    <div className="login-container">
      <div className="shapes-container"></div>
      
      <div className="login-card">
        <div className="brand-section">
          <div className="brand-icon">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" className="brand-circle"/>
              <path d="M30 50 L45 35 L60 50 L75 30" className="brand-path" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="brand-title">Toumai</h1>
          <p className="brand-subtitle">Administration</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              id="email"
              className="form-input"
              placeholder=" "
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <label htmlFor="email" className="form-label">Adresse email</label>
            <div className="input-border"></div>
          </div>

          <div className="form-group">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              className="form-input"
              placeholder=" "
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <label htmlFor="password" className="form-label">Mot de passe</label>
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
            <div className="input-border"></div>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <span className="btn-loader"></span>
            ) : (
              'Connexion'
            )}
          </button>

          <div className="form-footer">
            <a href="#" className="forgot-link">Mot de passe oublié ?</a>
          </div>
        </form>
      </div>

      <div className="footer-text">© 2024 Toumai Admin</div>
    </div>
  );
};

export default Login;