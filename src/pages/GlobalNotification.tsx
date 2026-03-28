import React, { useState, type ChangeEvent } from 'react';
import './GlobalNotification.css';

const GlobalNotification: React.FC = () => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [responseMsg, setResponseMsg] = useState('');
  const [responseType, setResponseType] = useState<'success' | 'error' | ''>('');

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
    <div className="content-container">
      <div className="notification-gn-form-container">
        
        <div className="notification-header">
          <h3>Envoyer une notification globale</h3>
          <p>
            Ce message sera envoyé immédiatement à tous les utilisateurs enregistrés avec notifications activées.
          </p>
        </div>

        <div className="notification-gn-form-body">
          <div className="gn-form-group">
            <label className="gn-form-label">
              Titre <span className="required-star">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={handleInputChange(setTitle)}
              maxLength={100}
              className="gn-form-input"
              placeholder="Naria - Nouvelle mise à jour !"
            />
            <div className="char-counter-row">
              <span className="char-counter-hint">100 caractères max</span>
              <span className="char-count">{titleCount}/100</span>
            </div>
          </div>

          <div className="gn-form-group">
            <label className="gn-form-label">
              Sous-titre <span className="optional-text">(optionnel)</span>
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={handleInputChange(setSubtitle)}
              maxLength={100}
              className="gn-form-input"
              placeholder="Découvre les nouveautés 🔥"
            />
          </div>

          <div className="gn-form-group">
            <label className="gn-form-label">
              Message <span className="required-star">*</span>
            </label>
            <textarea
              value={message}
              onChange={handleInputChange(setMessage)}
              rows={5}
              maxLength={500}
              className="gn-form-input gn-form-textarea"
              placeholder="L'application Naria a été mise à jour avec de nouvelles fonctionnalités..."
            />
            <div className="char-counter-row">
              <span className="char-counter-hint">Soyez concis et engageant</span>
              <span className={`char-count ${charCount > 450 ? 'warning' : ''}`}>
                {charCount}/500
              </span>
            </div>
          </div>

          {(title || subtitle || message) && (
            <div className="preview-box">
              <p className="preview-title-bar">Aperçu de la notification APNs</p>
              <div className="preview-content-card">
                 {title && <p className="preview-title-text">{title}</p>}
                 {subtitle && <p className="preview-subtitle-text">{subtitle}</p>}
                 {message && <p className="preview-body-text">{message}</p>}
              </div>
            </div>
          )}

          <div className="gn-form-actions">
            {responseMsg && (
              <div className={`alert-message ${responseType === 'success' ? 'alert-success' : 'alert-error'}`}>
                {responseMsg}
              </div>
            )}

            <button
              onClick={sendGlobalNotification}
              disabled={isSending || !title.trim() || !message.trim()}
              className="btn-submit"
            >
              {isSending ? (
                <>
                  <div className="spinner-icon"></div>
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <span>Envoyer la notification globale</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalNotification;
