import React, { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import './GlobalNotification.css';

const GlobalNotification: React.FC = () => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [responseMsg, setResponseMsg] = useState('');
  const [responseType, setResponseType] = useState<'success' | 'error' | ''>('');
  const navigate = useNavigate();

  const sendGlobalNotification = async () => {
    if (!title.trim() || !message.trim()) {
      setResponseMsg('Veuillez remplir au minimum le titre et le message.');
      setResponseType('error');
      return;
    }

    setIsSending(true);
    setResponseMsg('');
    setResponseType('');

    try {
      const response = await fetch(
        'https://rywcekthoiykxecltmhq.supabase.co/functions/v1/send-global-apn-notifications',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ title, subtitle, body: message }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setResponseMsg(`Notification envoyée à ${result.count ?? 'plusieurs'} utilisateurs`);
        setResponseType('success');
        setTitle('');
        setSubtitle('');
        setMessage('');
      } else {
        setResponseMsg(`Erreur: ${result.error || "Échec de l'envoi"}`);
        setResponseType('error');
      }
    } catch (err) {
      console.error(err);
      setResponseMsg("Une erreur est survenue pendant l'envoi");
      setResponseType('error');
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value);
    };

  const charCount = message.length;
  const titleCount = title.length;

  return (
    <div className="notification-container">
      <div className="background-effects">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="content-wrapper">
        <header className="header">
          <div className="icon-container">
            <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <h1 className="title">Notifications Globales</h1>
          <p className="subtitle">
            <svg className="sparkle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
            Envoyez des messages à tous vos utilisateurs
          </p>
        </header>

        <div className="card">
          <div className="card-content">
            <div className="form-group">
              <label className="label">
                Titre <span className="required">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={handleInputChange(setTitle)}
                maxLength={100}
                className="input"
                placeholder="Naria - Nouvelle mise à jour !"
              />
              <div className="char-counter">{titleCount}/100</div>
            </div>

            <div className="form-group">
              <label className="label">
                Sous-titre <span className="optional">(optionnel)</span>
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={handleInputChange(setSubtitle)}
                maxLength={100}
                className="input"
                placeholder="Découvre les nouveautés 🔥"
              />
            </div>

            <div className="form-group">
              <label className="label">
                Message <span className="required">*</span>
              </label>
              <textarea
                value={message}
                onChange={handleInputChange(setMessage)}
                rows={5}
                maxLength={500}
                className="input textarea"
                placeholder="L'application Naria a été mise à jour avec de nouvelles fonctionnalités..."
              />
              <div className="char-counter-row">
                <span className="hint">Soyez concis et engageant</span>
                <span className={`char-counter ${charCount > 450 ? 'warning' : ''}`}>
                  {charCount}/500
                </span>
              </div>
            </div>

            {(title || subtitle || message) && (
              <div className="preview">
                <div className="preview-content">
                  <div className="preview-icon">
                    <svg className="preview-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                  </div>
                  <div className="preview-text">
                    <p className="preview-label">APERÇU</p>
                    {title && <p className="preview-title">{title}</p>}
                    {subtitle && <p className="preview-subtitle">{subtitle}</p>}
                    {message && <p className="preview-message">{message}</p>}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={sendGlobalNotification}
              disabled={isSending || !title.trim() || !message.trim()}
              className={`button ${isSending || !title.trim() || !message.trim() ? 'button-disabled' : ''}`}
            >
              {isSending ? (
                <>
                  <div className="spinner"></div>
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Envoyer la notification</span>
                </>
              )}
            </button>

            <button
              onClick={() => navigate('/')}
              className="button button-secondary"
            >
              <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour à l’accueil
            </button>

            {responseMsg && (
              <div className={`alert ${responseType === 'success' ? 'alert-success' : 'alert-error'}`}>
                <svg className="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {responseType === 'success' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                <p className="alert-text">{responseMsg}</p>
              </div>
            )}
          </div>

          <footer className="footer">
            <p className="footer-text">
              💡 Astuce : Les notifications sont envoyées immédiatement à tous les utilisateurs actifs
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default GlobalNotification;
