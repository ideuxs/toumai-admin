import React, { useState, useEffect } from 'react';
import { AlertCircle, Eye, Trash2, X, AlertTriangle, User, Package, Calendar } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
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

  useEffect(() => {
    fetchReports();

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

  const handleDeleteReport = async (reportId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce signalement ? Cette action est irréversible.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('report_user')
        .delete()
        .eq('id', reportId);

      if (error) {
        console.error('Erreur lors de la suppression du signalement:', error);
        alert('Erreur lors de la suppression du signalement');
      } else {
        alert('Signalement supprimé avec succès');
        handleCloseModal();
        fetchReports();
      }
    } catch (err) {
      console.error('Erreur inattendue:', err);
      alert('Erreur inattendue');
    }
  };

  const renderMobileCards = () => (
    <div className="reports-mobile-grid">
      {reports.map((report) => (
        <div key={report.id} className="modern-report-card">
          <div className="card-top-row">
            <div className="report-id-badge">
              <AlertCircle size={14} className="id-icon" />
              <span>Signalement #{report.id}</span>
            </div>
            <span className="card-category-pill">{report.category_report}</span>
          </div>

          <div className="card-main-info">
            <div className="info-item">
              <div className="info-icon">
                <User size={16} />
              </div>
              <div className="info-content">
                <span className="info-label">Utilisateur</span>
                <span className="info-val">{report.user?.firstname} {report.user?.lastname}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon">
                <Package size={16} />
              </div>
              <div className="info-content">
                <span className="info-label">Annonce concernée</span>
                <span className="info-val">{report.product?.name}</span>
              </div>
            </div>
          </div>

          <div className="card-reason-box">
            <div className="reason-header">
              <AlertTriangle size={12} />
              <span>Motif du signalement</span>
            </div>
            <p className="reason-text-mobile">{report.reason}</p>
          </div>

          <div className="card-action-footer">
            <div className="report-date-mobile">
              <Calendar size={14} />
              <span>{new Date(report.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            <button
              className="btn-modern-view"
              onClick={() => handleViewDetails(report)}
            >
              <Eye size={16} />
              Détails
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderDesktopTable = () => (
    <div className="supervision-table-container">
      <table className="supervision-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Utilisateur</th>
            <th>Annonce</th>
            <th>Catégorie</th>
            <th>Raison</th>
            <th>Date</th>
            <th className="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id} className="table-row">
              <td style={{ fontWeight: 600, color: 'var(--navy-main)' }}>#{report.id}</td>
              <td style={{ whiteSpace: 'nowrap', color: 'var(--text-main)' }}>
                {report.user?.firstname} {report.user?.lastname}
              </td>
              <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{report.product?.name}</td>
              <td>
                <span className="badge-pill" style={{ whiteSpace: 'nowrap' }}>
                  {report.category_report}
                </span>
              </td>
              <td
                style={{
                  color: '#64748b',
                  maxWidth: '350px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={report.reason}
              >
                {report.reason}
              </td>
              <td style={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                {new Date(report.created_at).toLocaleDateString('fr-FR')}
              </td>
              <td className="cell-actions" style={{ textAlign: 'right' }}>
                <button
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#e2e8f0',
                    color: '#0f172a',
                    padding: '0.4rem 0.6rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  title="Voir les détails"
                  onClick={() => handleViewDetails(report)}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#cbd5e1')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
                >
                  <Eye size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="content-container">
      <div className="recent-section">
        {loading ? (
          <div className="loading-container" style={{ height: '100%', background: 'transparent' }}>
            <div className="loading-content">
              <div className="spinner" style={{ borderColor: 'rgba(15, 23, 42, 0.2)', borderTopColor: 'var(--accent-blue)' }}></div>
              <p className="loading-text" style={{ color: 'var(--navy-main)' }}>Chargement des signalements...</p>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="empty-state premium-empty">
            <AlertCircle className="empty-icon" style={{ color: '#94a3b8' }} />
            <h3 className="empty-title">Aucun signalement</h3>
            <p className="empty-text">Aucun utilisateur n'a encore signalé une annonce.</p>
          </div>
        ) : (
          isMobile ? renderMobileCards() : renderDesktopTable()
        )}
      </div>

      {isModalOpen && selectedReport && (
        <div className="modal-ultra-overlay" onClick={handleCloseModal}>
          <div className="modal-ultra-container" onClick={(e) => e.stopPropagation()}>

            {/* Header lumineux et épuré */}
            <div className="ultra-split-layout">
              
              {/* --- SIDEBAR (CONTEXT) --- */}
              <div className="ultra-sidebar-context">
                <div className="ultra-sidebar-header">
                  <button className="ultra-back-btn" onClick={handleCloseModal}>
                    <X size={18} />
                  </button>
                  <div className="ultra-id-block">
                    <span className="ultra-label-small">Dossier</span>
                    <h2 className="ultra-case-id">#{selectedReport.id}</h2>
                    <div className="ultra-tag-category">
                      {selectedReport.category_report}
                    </div>
                  </div>
                </div>

                <div className="ultra-sidebar-section">
                  <div className="ultra-section-title">
                    <Package size={14} /> <span>Annonce</span>
                  </div>
                  <h3 className="ultra-entity-name">{selectedReport.product?.name}</h3>
                  <p className="ultra-entity-sub">ID: {selectedReport.id_product}</p>
                </div>

                <div className="ultra-sidebar-section">
                  <div className="ultra-section-title">
                    <User size={14} /> <span>Plaignant</span>
                  </div>
                  <h3 className="ultra-entity-name">{selectedReport.user?.firstname} {selectedReport.user?.lastname}</h3>
                  <p className="ultra-entity-sub">{selectedReport.user?.email}</p>
                </div>

                <div className="ultra-sidebar-footer">
                  <Calendar size={12} /> {new Date(selectedReport.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>

              {/* --- MAIN CONTENT (MOTIF & ACTIONS) --- */}
              <div className="ultra-main-panel">
                <div className="ultra-panel-content">
                  <span className="ultra-label-muted">Motif du signalement</span>
                  <div className="ultra-reason-container">
                    <span className="ultra-quote-mark">“</span>
                    <p className="ultra-reason-text">
                      {selectedReport.reason}
                    </p>
                  </div>
                </div>

                <div className="ultra-panel-actions">
                  <button className="btn-ultra-ghost" onClick={handleCloseModal}>
                    Ignorer
                  </button>
                  <button className="btn-ultra-secondary-alt">
                    <AlertTriangle size={18} /> Contacter
                  </button>
                  <button className="btn-ultra-danger-full" onClick={() => handleDeleteReport(selectedReport.id)}>
                    <Trash2 size={18} /> Supprimer l'annonce
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;