import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Package, Trash2, Heart, ShieldAlert, Phone, Mail } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { getImagesForProduct } from '../services/imageService';
import type { Announcement } from '../types';
import './AnnouncementModal.css';

interface AnnouncementModalProps {
  announcement: Announcement | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (id: number, action: 'approved' | 'declined') => void;
  onDelete: (id: number) => void;
}

interface SellerInfo {
  firstname: string;
  lastname: string;
  email: string;
  phone: string | null;
  created_at: string;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  announcement,
  isOpen,
  onClose,
  onAction,
  onDelete,
}) => {
  const [images, setImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Extra Data
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [favCount, setFavCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [loadingData, setLoadingData] = useState(false);

  const [isImageZoomed, setIsImageZoomed] = useState(false);

  useEffect(() => {
    if (announcement && isOpen) {
      loadImages();
      loadExtraData();
    } else {
      setImages([]);
      setCurrentImageIndex(0);
      setSeller(null);
      setFavCount(0);
      setReportCount(0);
      setIsImageZoomed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcement, isOpen]);

  const loadExtraData = async () => {
    if (!announcement) return;
    setLoadingData(true);
    try {
      // 1. Fetch Seller
      if (announcement.owner_id) {
        const { data: userData } = await supabase
          .from('users')
          .select('firstname, lastname, email, phone, created_at')
          .eq('id', announcement.owner_id)
          .single();
        if (userData) setSeller(userData as SellerInfo);
      }

      // 2. Fetch Favourites Count
      const { count: fCount } = await supabase
        .from('favourite_product')
        .select('*', { count: 'exact', head: true })
        .eq('id_product', announcement.id_product);
      setFavCount(fCount || 0);

      // 3. Fetch Reports Count
      const { count: rCount } = await supabase
        .from('report_user')
        .select('*', { count: 'exact', head: true })
        .eq('id_product', announcement.id_product);
      setReportCount(rCount || 0);

    } catch (err) {
      console.error('Error fetching extra data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadImages = async () => {
    if (!announcement) return;
    setLoadingMedia(true);
    try {
      const productImages = await getImagesForProduct(announcement.id_product);
      setImages(Array.isArray(productImages) ? productImages : []);
      setCurrentImageIndex(0);
    } catch (error) {
      console.error('Erreur lors du chargement des images:', error);
      setImages([]);
    } finally {
      setLoadingMedia(false);
    }
  };

  const nextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (!images.length ? 0 : (prev + 1) % images.length));
  }, [images.length]);

  const prevImage = useCallback(() => {
    setCurrentImageIndex((prev) => (!images.length ? 0 : (prev - 1 + images.length) % images.length));
  }, [images.length]);

  const handleAction = (action: 'approved' | 'declined') => {
    if (announcement) {
      onAction(announcement.id_product, action);
      onClose();
    }
  };

  const handleDelete = () => {
    if (announcement && window.confirm('Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible.')) {
      onDelete(announcement.id_product);
      onClose();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isImageZoomed) setIsImageZoomed(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isImageZoomed, onClose]);

  useEffect(() => {
    document.body.style.overflow = (isOpen || isImageZoomed) ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen, isImageZoomed]);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Date inconnue';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  if (!isOpen || !announcement) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modern-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modern-modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modern-modal-split">

          {/* L E F T   S I D E :   G A L L E R Y */}
          <div className="modern-gallery-section">
            <div className="gallery-main-view" onClick={() => images.length > 0 && setIsImageZoomed(true)}>
              {loadingMedia ? (
                <div className="gallery-placeholder">
                  <div className="spinner" />
                </div>
              ) : images.length > 0 ? (
                <>
                  <img src={images[currentImageIndex]} alt="Produit" className="gallery-main-img" />
                  {images.length > 1 && (
                    <>
                      <button className="gallery-nav left" onClick={(e) => { e.stopPropagation(); prevImage(); }}>
                        <ChevronLeft size={20} />
                      </button>
                      <button className="gallery-nav right" onClick={(e) => { e.stopPropagation(); nextImage(); }}>
                        <ChevronRight size={20} />
                      </button>
                      <div className="gallery-counter">{currentImageIndex + 1} / {images.length}</div>
                    </>
                  )}
                </>
              ) : (
                <div className="gallery-placeholder">
                  <Package size={48} />
                  <p>Aucune image</p>
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="gallery-thumbnails">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`thumbnail-item ${idx === currentImageIndex ? 'active' : ''}`}
                    onClick={() => setCurrentImageIndex(idx)}
                  >
                    <img src={img} alt={`Thumb ${idx}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* R I G H T   S I D E :   D E T A I L S */}
          <div className="modern-details-section">

            <div className="details-scroll-area">
              <div className="details-header">
                <div className="header-tags">
                  <span className="modern-badge category">{announcement.category}</span>
                  <span className={`modern-badge status-${announcement.state || announcement.etat}`}>
                    {announcement.state === 'approved' ? 'Approuvée' : announcement.state === 'declined' ? 'Refusée' : 'En attente'}
                  </span>
                </div>
                <h1 className="modern-title">{announcement.titre || announcement.name}</h1>
                <div className="modern-price">{announcement.prix || announcement.price} FCFA</div>
                <div className="modern-date">Publié le {formatDate(announcement.created_at)} • ID: {announcement.id_product}</div>
              </div>

              <div className="modern-stats-grid">
                <div className="stat-box">
                  <Heart size={18} className="stat-icon heart" />
                  <div className="stat-info">
                    <span className="stat-val">{favCount}</span>
                    <span className="stat-lbl">Favoris</span>
                  </div>
                </div>
                <div className="stat-box">
                  <ShieldAlert size={18} className={`stat-icon ${reportCount > 0 ? 'danger' : 'safe'}`} />
                  <div className="stat-info">
                    <span className="stat-val">{reportCount}</span>
                    <span className="stat-lbl">Signalements</span>
                  </div>
                </div>
              </div>

              <div className="modern-seller-card">
                <h3 className="section-title">Informations Vendeur</h3>
                {loadingData ? (
                  <div className="seller-loading">Chargement du profil...</div>
                ) : seller ? (
                  <div className="seller-profile">
                    <div className="seller-avatar">
                      {seller.firstname.charAt(0).toUpperCase()}
                    </div>
                    <div className="seller-info-list">
                      <div className="seller-name">{seller.firstname} {seller.lastname}</div>
                      <div className="seller-contact">
                        <Mail size={12} /> {seller.email}
                      </div>
                      {seller.phone && (
                        <div className="seller-contact">
                          <Phone size={12} /> {seller.phone}
                        </div>
                      )}
                      <div className="seller-joined">
                        Membre depuis {formatDate(seller.created_at)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="seller-not-found">Vendeur introuvable ou supprimé.</div>
                )}
              </div>

              <div className="modern-description">
                <h3 className="section-title">Description</h3>
                <p className="description-text">{announcement.description}</p>
              </div>
            </div>{/* end details-scroll-area */}

            <div className="modern-actions">
              <button
                className="btn-modern btn-danger-outline"
                onClick={handleDelete}
              >
                <Trash2 size={16} /> Supprimer
              </button>

              <div className="action-group">
                <button
                  className="btn-modern btn-decline"
                  onClick={() => handleAction('declined')}
                  disabled={(announcement.state || announcement.etat) === 'declined'}
                >
                  <X size={16} /> Refuser
                </button>
                <button
                  className="btn-modern btn-approve"
                  onClick={() => handleAction('approved')}
                  disabled={(announcement.state || announcement.etat) === 'approved'}
                >
                  <Package size={16} /> Approuver
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Zoom Overlay */}
        {isImageZoomed && images[currentImageIndex] && (
          <div className="zoom-overlay" onClick={() => setIsImageZoomed(false)}>
            <img src={images[currentImageIndex]} alt="Zoom" className="zoom-image" onClick={(e) => e.stopPropagation()} />
            <div className="zoom-hint">Cliquez ailleurs pour fermer</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementModal;
