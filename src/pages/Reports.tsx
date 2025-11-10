import React, { useState, useEffect } from 'react';
import { AlertCircle, Eye, ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import './Reports.css';

interface Report {
  id: number;
  id_user: string;
  id_product: number;
  reason: string;
  category_report: string;
  created_at: string;
  user?: { firstname: string; lastname: string; email: string };
  product?: { name: string; description: string; category: string; price: number };
}

const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReports();
    
    // Détection du redimensionnement pour le responsive
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchReports = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('report_user')
      .select(`
        *,
        user: id_user (
            firstname,
            lastname,
            email
        ),
        product: id_product (
            name
        )
        `);
    if (error) {
      console.error('Erreur lors du chargement des signalements:', error);
    } else {
      const formatted = (data || []).map((item: any) => ({
        ...item,
        user: item.user,
        product: item.product
      }));
      console.log(formatted);
      setReports(formatted);
    }

    setLoading(false);
  };

  const handleViewDetails = (report: Report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedReport(null);
    setIsModalOpen(false);
  };

  // Affichage mobile en cartes
  const renderMobileCards = () => (
    <>
      {reports.map((report) => (
        <div key={report.id} className="reports-mobile-card">
          <div className="reports-mobile-header">
            <span className="reports-mobile-id">#{report.id}</span>
            <span className="reports-mobile-category">{report.category_report}</span>
          </div>
          
          <div className="reports-mobile-info">
            <div className="reports-mobile-label">Utilisateur</div>
            <div className="reports-mobile-value">
              {report.user?.firstname} {report.user?.lastname}
            </div>
          </div>

          <div className="reports-mobile-info">
            <div className="reports-mobile-label">Annonce</div>
            <div className="reports-mobile-value">{report.product?.name}</div>
          </div>

          <div className="reports-mobile-reason">
            <strong>Raison :</strong> {report.reason}
          </div>

          <div className="reports-mobile-footer">
            <span className="reports-mobile-date">
              {new Date(report.created_at).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </span>
            <button
              className="view-btn"
              onClick={() => handleViewDetails(report)}
            >
              <Eye size={16} />
              Voir
            </button>
          </div>
        </div>
      ))}
    </>
  );

  // Affichage desktop en tableau
  const renderDesktopTable = () => (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Utilisateur</th>
          <th>Annonce</th>
          <th>Catégorie</th>
          <th>Raison</th>
          <th>Date</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {reports.map((report) => (
          <tr key={report.id}>
            <td>{report.id}</td>
            <td>{report.user?.firstname} {report.user?.lastname}</td>
            <td>{report.product?.name}</td>
            <td>{report.category_report}</td>
            <td>{report.reason}</td>
            <td>{new Date(report.created_at).toLocaleString('fr-FR')}</td>
            <td>
              <button
                className="view-btn"
                onClick={() => handleViewDetails(report)}
              >
                <Eye size={16} />
                Voir
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="reports-page">
      <header className="reports-header">
        <button className="back-btn" onClick={() => navigate('/admin')}>
          <ArrowLeft size={18} />
          Retour
        </button>

        <h1>Signalements utilisateurs</h1>
        <p>Consultez tous les signalements effectués sur les annonces</p>
      </header>

      {loading ? (
        <div className="loading-state">Chargement des signalements...</div>
      ) : reports.length === 0 ? (
        <div className="empty-state">
          <AlertCircle className="empty-icon" />
          <h3>Aucun signalement</h3>
          <p>Aucun utilisateur n'a encore signalé une annonce.</p>
        </div>
      ) : (
        <div className="reports-table">
          {isMobile ? renderMobileCards() : renderDesktopTable()}
        </div>
      )}

      {/* Modal de détails */}
      {isModalOpen && selectedReport && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Détails du signalement</h2>

            <div className="modal-section">
              <h3>Annonce concernée</h3>
              <p><strong>Nom :</strong> {selectedReport.product?.name}</p>
              {selectedReport.product?.description && (
                <p><strong>Description :</strong> {selectedReport.product?.description}</p>
              )}
              {selectedReport.product?.category && (
                <p><strong>Catégorie :</strong> {selectedReport.product?.category}</p>
              )}
              {selectedReport.product?.price && (
                <p><strong>Prix :</strong> {selectedReport.product?.price} €</p>
              )}
            </div>
            
            <div className="modal-section">
              <h3>Signalement</h3>
              <p><strong>ID :</strong> #{selectedReport.id}</p>
              <p><strong>Catégorie :</strong> {selectedReport.category_report}</p>
              <p><strong>Raison :</strong>{selectedReport.reason}</p>
              <p><strong>Date :</strong> {new Date(selectedReport.created_at).toLocaleString('fr-FR')}</p>
            </div>

            <div className="modal-section">
              <h3>Utilisateur</h3>
              <p><strong>Nom :</strong> {selectedReport.user?.firstname} {selectedReport.user?.lastname}</p>
              <p><strong>Email :</strong> {selectedReport.user?.email}</p>
            </div>

            <button className="close-btn" onClick={handleCloseModal}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;