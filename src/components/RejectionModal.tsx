import React, { useState } from 'react';
import { X, AlertTriangle, Send } from 'lucide-react';
import './RejectionModal.css';

interface RejectionModalProps {
  isOpen: boolean;
  productName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const PREDEFINED_REASONS = [
  "Photos de mauvaise qualité ou non conformes",
  "Description insuffisante ou trompeuse",
  "Prix irréaliste ou incorrect",
  "Produit interdit ou non autorisé",
  "Annonce en doublon",
  "Contenu inapproprié ou offensant",
];

const RejectionModal: React.FC<RejectionModalProps> = ({
  isOpen,
  productName,
  onConfirm,
  onCancel,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  if (!isOpen) return null;

  const handleSelectReason = (reason: string) => {
    setSelectedReason(reason);
    setIsCustom(false);
    setCustomReason('');
  };

  const handleSelectCustom = () => {
    setSelectedReason('');
    setIsCustom(true);
  };

  const handleConfirm = () => {
    const reason = isCustom ? customReason.trim() : selectedReason;
    if (reason) {
      onConfirm(reason);
      // Reset state
      setSelectedReason('');
      setCustomReason('');
      setIsCustom(false);
    }
  };

  const handleCancel = () => {
    setSelectedReason('');
    setCustomReason('');
    setIsCustom(false);
    onCancel();
  };

  const isValid = isCustom ? customReason.trim().length > 0 : selectedReason.length > 0;

  return (
    <div className="rejection-overlay" onClick={handleCancel}>
      <div className="rejection-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rejection-header">
          <div className="rejection-header-icon">
            <AlertTriangle size={24} />
          </div>
          <div className="rejection-header-text">
            <h2>Refuser l'annonce</h2>
            <p className="rejection-product-name">"{productName}"</p>
          </div>
          <button className="rejection-close" onClick={handleCancel}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="rejection-body">
          <p className="rejection-instruction">
            Sélectionnez le motif du refus. L'utilisateur recevra un email avec cette explication.
          </p>

          <div className="rejection-reasons-list">
            {PREDEFINED_REASONS.map((reason) => (
              <label
                key={reason}
                className={`rejection-reason-item ${selectedReason === reason ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="rejection-reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={() => handleSelectReason(reason)}
                />
                <span className="rejection-radio-custom"></span>
                <span className="rejection-reason-text">{reason}</span>
              </label>
            ))}

            {/* Option "Autre" */}
            <label
              className={`rejection-reason-item ${isCustom ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="rejection-reason"
                value="custom"
                checked={isCustom}
                onChange={handleSelectCustom}
              />
              <span className="rejection-radio-custom"></span>
              <span className="rejection-reason-text">Autre motif (personnalisé)</span>
            </label>
          </div>

          {/* Textarea pour motif personnalisé */}
          {isCustom && (
            <div className="rejection-custom-container">
              <textarea
                className="rejection-custom-textarea"
                placeholder="Décrivez le motif du refus..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={4}
                maxLength={500}
                autoFocus
              />
              <div className="rejection-char-count">
                {customReason.length}/500
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="rejection-footer">
          <button className="rejection-btn-cancel" onClick={handleCancel}>
            Annuler
          </button>
          <button
            className="rejection-btn-confirm"
            onClick={handleConfirm}
            disabled={!isValid}
          >
            <Send size={16} />
            Confirmer le refus
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectionModal;
