import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient'; // adapte le chemin selon ton projet
import './ForgotPassword.css'; // optionnel pour ton style admin

const ForgotPassword: React.FC = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [disabled, setDisabled] = useState(false);

  // 1️⃣ Vérifier si on a un access_token dans l’URL
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', '?'));
    const token = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    

    if (token) {
      setAccessToken(token);
      supabase.auth.setSession({
        access_token: token,
        refresh_token: refreshToken || '',
      });
    }
  }, []);

  // 2️⃣ Mettre à jour le mot de passe
  const handleResetPassword = async () => {
    const MAX_SIZE_CHAR_PASSWORD = 6;
    if (!newPassword || newPassword.length < MAX_SIZE_CHAR_PASSWORD) {
      setMessage('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setMessage(`❌ ${error.message}`);
    } else {
      setMessage('Mot de passe mis à jour avec succès ! ✅ \nVous pouvez désormais vous connecter avec votre nouveau mot de passe.');
    }
    if (!error) {
        setDisabled(true);
    }
  };

  // 3️⃣ Si aucun token : accès interdit
  if (!accessToken) {
    return (
      <div className="forbidden">
        <h2>Accès interdit 🚫</h2>
        <p>Cette page n’est accessible que via le lien de réinitialisation envoyé par e-mail.</p>
      </div>
    );
  }

  return (
    <div className="reset-container">
      <h2>Réinitialiser le mot de passe</h2>
      <p>Veuillez saisir un nouveau mot de passe.</p>

      <input
        type="password"
        placeholder="Nouveau mot de passe"
        className="password-input"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />

      <button className="confirm-btn" disabled={disabled} onClick={handleResetPassword}>
        Confirmer
      </button>

      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default ForgotPassword;
