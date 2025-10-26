import React, { useState, useEffect } from 'react';
import type { Announcement } from '../types';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { getFirstImageForProduct, getProductImageWithFallback } from '../services/imageService';

interface AnnouncementCardProps {
  announcement: Announcement;
  onAction: (id: number, action: 'approved' | 'declined') => void;
  onClick: () => void;
}

const AnnouncementCard: React.FC<AnnouncementCardProps> = ({ 
  announcement, 
  onAction, 
  onClick 
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    loadImage();
  }, [announcement.id_product]);

  const loadImage = async () => {
    setImageLoading(true);
    try {
      // Essayer d'abord la table product_images, puis le bucket
      let url = await getFirstImageForProduct(announcement.id_product);
      
      if (!url) {
        // Fallback vers le bucket
        url = await getProductImageWithFallback(announcement.id_product, 0);
      }
      
      setImageUrl(url);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'image:', error);
    } finally {
      setImageLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="icon-sm" />;
      case 'declined': return <XCircle className="icon-sm" />;
      case 'pending': return <Clock className="icon-sm" />;
      default: return null;
    }
  };

  return (
    <div className="card" onClick={onClick}>
      <div className="card-image">
        {imageLoading ? (
          <div className="card-image-loading">
            <div className="spinner"></div>
          </div>
        ) : (
          <img 
            src={imageUrl} 
            alt={announcement.titre || announcement.name} 
            className="card-image-img"
            onError={() => {
              setImageUrl('https://via.placeholder.com/400x300?text=Image+non+disponible');
            }}
          />
        )}
      </div>
      
      <div className="card-content">
        <div className="card-header">
          <h3 className="card-title">{announcement.titre || announcement.name}</h3>
          <span className={`badge badge-${announcement.state}`}>
            {getStatusIcon(announcement.state)}
            <span className="badge-text">{announcement.state}</span>
          </span>
        </div>
        
        <p className="card-description">{announcement.description}</p>
        
        <div className="card-footer">
          <div className="card-price">{announcement.prix || announcement.price} FCFA</div>
          <div className="card-category">{announcement.category}</div>
        </div>
        
        {announcement.state === 'pending' && (
          <div className="card-actions">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction(announcement.id_product, 'approved');
              }}
              className="btn btn-approve"
            >
              <CheckCircle className="icon-sm" />
              Approuver
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction(announcement.id_product, 'declined');
              }}
              className="btn btn-decline"
            >
              <XCircle className="icon-sm" />
              Refuser
            </button>
          </div>
        )}
        
        {announcement.state !== 'pending' && (
          <div className="card-status-text">
            Annonce {announcement.state === 'approved' ? 'approuvée' : 'refusée'}
          </div>
        )}
      </div>
    </div>
  );
};

/*const styles: { [key: string]: React.CSSProperties } = {
  card: {
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
    width: '300px',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '1rem',
  },
  button: {
    padding: '0.5rem 1rem',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};*/

export default AnnouncementCard;
