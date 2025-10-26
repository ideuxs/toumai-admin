import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Package, User, Calendar } from 'lucide-react';
import { getImagesForProduct } from '../services/imageService';
import { getNameOfUser } from '../services/authService';
import type { Announcement } from '../types';
import './AnnouncementModal.css';

interface AnnouncementModalProps {
  announcement: Announcement | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (id: number, action: 'approved' | 'declined') => void;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  announcement,
  isOpen,
  onClose,
  onAction,
}) => {
  const [images, setImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const [nameOfUser, setNameOfUser] = useState<string | null>(null);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  // --------------------------
  // Load images & user name
  // --------------------------
  useEffect(() => {
    if (announcement && isOpen) {
      loadImages();
      loadNameOfUser();
    } else {
      // reset when modal closed
      setImages([]);
      setCurrentImageIndex(0);
      setNameOfUser(null);
      setLoading(false);
      setIsImageZoomed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcement, isOpen]);

  const loadNameOfUser = async () => {
    if (!announcement?.owner_id) return;
    try {
      const name = await getNameOfUser(announcement.owner_id);
      setNameOfUser(name ?? null);
    } catch (err) {
      console.error('Erreur getNameOfUser:', err);
      setNameOfUser(null);
    }
  };

  const loadImages = async () => {
    if (!announcement) return;
    setLoading(true);
    try {
      const productImages = await getImagesForProduct(announcement.id_product);
      setImages(Array.isArray(productImages) ? productImages : []);
      setCurrentImageIndex(0);
    } catch (error) {
      console.error('Erreur lors du chargement des images:', error);
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------
  // Navigation safe (évite modulo 0)
  // --------------------------
  const nextImage = useCallback(() => {
    setCurrentImageIndex((prev) => {
      if (!images.length) return 0;
      return (prev + 1) % images.length;
    });
  }, [images.length]);

  const prevImage = useCallback(() => {
    setCurrentImageIndex((prev) => {
      if (!images.length) return 0;
      return (prev - 1 + images.length) % images.length;
    });
  }, [images.length]);

  // --------------------------
  // Actions
  // --------------------------
  const handleAction = (action: 'approved' | 'declined') => {
    if (announcement) {
      onAction(announcement.id_product, action);
      onClose();
    }
  };

  // --------------------------
  // Close zoom with Escape + block scroll on zoom
  // --------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isImageZoomed) {
        setIsImageZoomed(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isImageZoomed]);

  useEffect(() => {
    document.body.style.overflow = isImageZoomed ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isImageZoomed]);

  // --------------------------
  // Helpers
  // --------------------------
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen || !announcement) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-header">
          {/* Image principale - conteneur NE gère PAS l'ouverture du zoom */}
          <div className="modal-image" onClick={(e) => e.stopPropagation()}>
            {loading ? (
              <div className="modal-image-loading">
                <div className="spinner" />
                <p>Chargement des images...</p>
              </div>
            ) : images.length > 0 ? (
              <>
                {/* Image (SEULE la balise <img> ouvre le zoom au clic) */}
                <img
                  src={images[currentImageIndex]}
                  alt={`Produit ${announcement.id_product}`}
                  className="modal-image-img"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsImageZoomed(true);
                  }}
                />

                {images.length > 1 && (
                  <>
                    <button
                      className="modal-nav modal-nav-left"
                      onClick={(e) => {
                        e.stopPropagation();
                        prevImage();
                      }}
                    >
                      <ChevronLeft size={24} />
                    </button>

                    <button
                      className="modal-nav modal-nav-right"
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImage();
                      }}
                    >
                      <ChevronRight size={24} />
                    </button>

                    <div className="modal-image-counter">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="modal-image-placeholder">
                <Package size={64} />
                <p>Aucune image disponible</p>
              </div>
            )}
          </div>

          {/* Titre et statut */}
          <div className="modal-title-section">
            <h2 className="modal-title">{announcement.titre || announcement.name}</h2>
            <div className={`modal-status status-${announcement.state || announcement.etat}`}>
              {(announcement.state || announcement.etat) === 'approved' && 'Approuvé'}
              {(announcement.state || announcement.etat) === 'declined' && 'Refusé'}
              {(announcement.state || announcement.etat) === 'pending' && 'En attente'}
            </div>
          </div>
        </div>

        <div className="modal-body">
          {/* Prix et ID */}
          <div className="modal-price-section">
            <div className="modal-price">{announcement.prix || announcement.price} FCFA</div>
            <div className="modal-id">ID: {announcement.id_product}</div>
          </div>

          {/* Informations du produit */}
          <div className="modal-info-grid">
            <div className="modal-info-item">
              <Package className="modal-info-icon" />
              <div>
                <div className="modal-info-label">Catégorie</div>
                <div className="modal-info-value">{announcement.category}</div>
              </div>
            </div>
            <div className="modal-info-item">
              <User className="modal-info-icon" />
              <div>
                <div className="modal-info-label">Vendeur</div>
                <div className="modal-info-value">{nameOfUser || 'Non spécifié'}</div>
              </div>
            </div>
            <div className="modal-info-item">
              <Calendar className="modal-info-icon" />
              <div>
                <div className="modal-info-label">Date de publication</div>
                <div className="modal-info-value">
                  {announcement.created_at ? formatDate(announcement.created_at) : 'Non spécifiée'}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="modal-description-section">
            <h3 className="modal-section-title">Description</h3>
            <p className="modal-description">{announcement.description}</p>
          </div>

          {/* Miniatures */}
          {images.length > 1 && (
            <div className="modal-images-grid">
              {images.map((image, index) => (
                <div
                  key={index}
                  className={`modal-thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                  onClick={() => setCurrentImageIndex(index)}
                >
                  <img src={image} alt={`Miniature ${index + 1}`} />
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button
              className="modal-btn modal-btn-approve"
              onClick={() => handleAction('approved')}
              disabled={(announcement.state || announcement.etat) === 'approved'}
            >
              <Package size={20} />
              Approuver
            </button>
            <button
              className="modal-btn modal-btn-decline"
              onClick={() => handleAction('declined')}
              disabled={(announcement.state || announcement.etat) === 'declined'}
            >
              <X size={20} />
              Refuser
            </button>
          </div>
        </div>

        {/* Zoom overlay — placé à la fin pour être rendu au-dessus */}
        {isImageZoomed && images[currentImageIndex] && (
          <div
            className="modal-image-zoomed"
            onClick={() => setIsImageZoomed(false)} // clic sur l'overlay ferme
            role="dialog"
            aria-modal="true"
          >
            <img
              src={images[currentImageIndex]}
              alt={`Produit ${announcement.id_product} - zoom`}
              className="modal-image-img"
              onClick={(e) => e.stopPropagation()} // clic sur l'image ne ferme pas
            />
            <div className="modal-zoom-hint">Cliquez en dehors ou ESC pour fermer</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementModal;
