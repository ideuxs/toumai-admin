import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Package, Filter, ChevronRight, Eye, Search, X as XIcon, ArrowUpDown } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import AnnouncementCard from '../components/AnnouncementCard';
import AnnouncementModal from '../components/AnnouncementModal';
import RejectionModal from '../components/RejectionModal';
import { sendRejectionEmail } from '../services/emailService';
import type { Announcement } from '../types';

const Dashboard: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'declined'>('pending');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, declined: 0 });
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [pendingDeclineId, setPendingDeclineId] = useState<number | null>(null);
  const [pendingDeclineName, setPendingDeclineName] = useState<string>('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'price_asc' | 'price_desc'>('newest');

  const location = useLocation();
  const currentView = location.pathname === '/admin/all' ? 'all' : 'dashboard';

  useEffect(() => {
    fetchAnnounces();
  }, []);

  useEffect(() => {
    const total = announcements.length;
    const pending = announcements.filter(a => a.state === 'pending').length;
    const approved = announcements.filter(a => a.state === 'approved').length;
    const declined = announcements.filter(a => a.state === 'declined').length;
    setStats({ total, pending, approved, declined });
  }, [announcements]);

  const fetchAnnounces = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('product').select('*');
    if (error) {
      console.error('Erreur lors du chargement:', error);
    } else {
      setAnnouncements(data || []);
    }
    setLoading(false);
  };

  const handleAction = async (id: number, action: 'approved' | 'declined') => {
    if (action === 'declined') {
      const announcement = announcements.find(a => a.id_product === id);
      setPendingDeclineId(id);
      setPendingDeclineName(announcement?.titre || announcement?.name || 'Annonce');
      setShowRejectionModal(true);
      return;
    }
    await executeAction(id, action);
  };

  const executeAction = async (id: number, action: 'approved' | 'declined', rejectionReason?: string) => {
    try {
      const { data: product, error: fetchError } = await supabase
        .from('product')
        .select('owner_id')
        .eq('id_product', id)
        .maybeSingle();

      if (fetchError || !product) return;

      const { data: updatedProduct, error: updateError } = await supabase
        .from('product')
        .update({ state: action })
        .eq('id_product', id)
        .select('owner_id, state, id_product, name')
        .single();

      if (updateError) return;

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('firstname, email')
        .eq('id', updatedProduct.owner_id)
        .single();

      if (userError) return;

      let message = '';
      let title = 'Naria';
      let subtitle = '';

      if (action === 'approved') {
        subtitle = "Excellente nouvelle ! 🥳";
        message = `Ton annonce "${updatedProduct.name}" a été validée et est en ligne et visible par les acheteurs sur Naria.`;
      } else if (action === 'declined') {
        subtitle = "Publication refusée";
        message = `Bonjour ${user.firstname}, ton annonce "${updatedProduct.name}" a été refusée. Vérifie les conditions et retente ta chance !`;

        if (user.email && rejectionReason) {
          try {
            await sendRejectionEmail({
              recipientEmail: user.email,
              recipientName: user.firstname,
              productName: updatedProduct.name,
              rejectionReason: rejectionReason,
            });
          } catch (emailError) {}
        }
      }

      try {
        const { data: userTokens } = await supabase
          .from('users')
          .select('token_apn')
          .eq('id', updatedProduct.owner_id)
          .single();

        const deviceToken = userTokens?.token_apn;
        if (deviceToken) {
          await fetch('https://rywcekthoiykxecltmhq.supabase.co/functions/v1/send-apn-notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ deviceToken, title, subtitle, body: message }),
          });
        }
      } catch (notifyError) {}

      fetchAnnounces();
    } catch (err) {}
  };

  const handleDeclineWithReason = async (reason: string) => {
    setShowRejectionModal(false);
    if (pendingDeclineId !== null) {
      setIsModalOpen(false);
      setSelectedAnnouncement(null);
      await executeAction(pendingDeclineId, 'declined', reason);
      setPendingDeclineId(null);
      setPendingDeclineName('');
    }
  };

  const handleCancelDecline = () => {
    setShowRejectionModal(false);
    setPendingDeclineId(null);
    setPendingDeclineName('');
  };

  const handleCardClick = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedAnnouncement(null);
  };

  const handleDelete = async (id: number) => {
    try {
      // Simplification des logs pour la lisibilité
      const { data: product } = await supabase.from('product').select('owner_id, name').eq('id_product', id).maybeSingle();
      
      let userFirstname = '';
      if (product?.owner_id) {
        const { data: user } = await supabase.from('users').select('firstname').eq('id', product.owner_id).single();
        userFirstname = user?.firstname || '';
        
        const { data: userTokens } = await supabase.from('users').select('token_apn').eq('id', product.owner_id).single();
        if (userTokens?.token_apn) {
          await fetch('https://rywcekthoiykxecltmhq.supabase.co/functions/v1/send-apn-notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              deviceToken: userTokens.token_apn,
              title: 'Naria',
              subtitle: 'Annonce supprimée',
              body: `Bonjour ${userFirstname}, ton annonce "${product.name}" a été supprimée par un administrateur.`,
            }),
          });
        }
      }

      const { data: files } = await supabase.storage.from('product-images').list(`products/product-${id}`);
      if (files && files.length > 0) {
        const filePaths = files.map(file => `products/product-${id}/${file.name}`);
        await supabase.storage.from('product-images').remove(filePaths);
      }

      await supabase.from('product_images').delete().eq('product_id', id);
      const { error } = await supabase.from('product').delete().eq('id_product', id);

      if (error) {
        alert('Erreur lors de la suppression de l\'annonce');
      } else {
        alert('Annonce supprimée avec succès');
        fetchAnnounces();
      }
    } catch (err) {}
  };

  // Derive unique categories from all announcements
  const categories = useMemo(() => {
    const cats = announcements
      .map(a => a.category)
      .filter((c): c is string => !!c);
    return ['all', ...Array.from(new Set(cats)).sort()];
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    let result = activeTab === 'all' ? announcements : announcements.filter(a => a.state === activeTab);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        (a.titre || a.name || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'all') {
      result = result.filter(a => a.category === selectedCategory);
    }

    result = [...result].sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      if (sortOrder === 'oldest') return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
      if (sortOrder === 'price_asc') return (a.prix ?? a.price ?? 0) - (b.prix ?? b.price ?? 0);
      if (sortOrder === 'price_desc') return (b.prix ?? b.price ?? 0) - (a.prix ?? a.price ?? 0);
      return 0;
    });

    return result;
  }, [announcements, activeTab, searchQuery, selectedCategory, sortOrder]);

  const recentPending = announcements
    .filter(a => a.state === 'pending')
    .slice(0, 5);

  if (loading) {
    return (
      <div className="loading-container" style={{height: '100%', background: 'transparent'}}>
        <div className="loading-content">
          <div className="spinner" style={{borderColor: 'rgba(15, 23, 42, 0.2)', borderTopColor: 'var(--accent-blue)'}}></div>
          <p className="loading-text" style={{color: 'var(--navy-main)'}}>Chargement des annonces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-container">
      {currentView === 'dashboard' ? (
        <>
          {/* Stats Cards (Option B: Desaturated / Monochrome Theme) */}
          <div className="stats-grid premium">
            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{background: '#f1f5f9', color: '#64748b'}}>
                <Package className="stat-icon" />
              </div>
              <div>
                <p className="stat-label">Total</p>
                <p className="stat-value">{stats.total}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{background: '#f1f5f9', color: '#64748b'}}>
                <Clock className="stat-icon" />
              </div>
              <div>
                <p className="stat-label">En attente</p>
                <p className="stat-value">{stats.pending}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon-wrapper" style={{background: '#f1f5f9', color: '#64748b'}}>
                <CheckCircle className="stat-icon" />
              </div>
              <div>
                <p className="stat-label">Approuvées</p>
                <p className="stat-value">{stats.approved}</p>
              </div>
            </div>
            <div className="stat-card">
              {/* Point de rouge extrêmement léger et désaturé (Option B dictée par l'user) */}
              <div className="stat-icon-wrapper" style={{background: '#f8fafc', color: '#94a3b8', border: '1px solid #f1f5f9'}}>
                <XCircle className="stat-icon" style={{color: '#9f1239'}} />
              </div>
              <div>
                <p className="stat-label">Refusées</p>
                <p className="stat-value">{stats.declined}</p>
              </div>
            </div>
          </div>

          {/* Supervision Table for Recent Pending */}
          <div className="recent-section">
            <div className="section-header">
              <h3 className="section-title">Annonces récentes en attente</h3>
              <a href="/admin/all" className="btn-view-all">
                Voir tout <ChevronRight className="icon-xs" />
              </a>
            </div>
            
            {recentPending.length === 0 ? (
              <div className="empty-state premium-empty">
                <CheckCircle className="empty-icon text-green-500" style={{color: '#475569'}} />
                <h3 className="empty-title">Tout est à jour !</h3>
                <p className="empty-text">Aucune nouvelle annonce en attente de validation.</p>
              </div>
            ) : (
              <div className="supervision-table-container">
                <table className="supervision-table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Titre</th>
                      <th>Catégorie</th>
                      <th>Prix</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPending.map(announcement => (
                        <tr key={announcement.id_product} className="table-row">
                          <td className="cell-image">
                            <div className="mini-thumb placeholder" style={{background: '#f1f5f9', color: '#94a3b8'}}><Package className="icon-xs" /></div>
                          </td>
                          <td className="cell-title font-medium">{announcement.titre || announcement.name}</td>
                          <td className="cell-category">
                            <span className="badge-pill">{announcement.category || 'Général'}</span>
                          </td>
                          <td className="cell-price">{announcement.prix || announcement.price} FCFA</td>
                          <td className="cell-actions">
                            <button title="Voir les détails" className="btn-action btn-view" onClick={() => handleCardClick(announcement)}>
                              <Eye className="icon-sm" />
                            </button>
                            <button title="Valider" className="btn-action btn-approve" onClick={() => handleAction(announcement.id_product, 'approved')} style={{background: '#f8fafc', borderColor: '#e2e8f0', color: '#475569'}}>
                              <CheckCircle className="icon-sm" />
                            </button>
                            <button title="Refuser" className="btn-action btn-decline" onClick={() => handleAction(announcement.id_product, 'declined')} style={{background: '#f8fafc', borderColor: '#e2e8f0', color: '#9f1239'}}>
                              <XCircle className="icon-sm" />
                            </button>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Full Announcements View */}
          <div className="tabs-container">
            <div className="tabs">
              <button onClick={() => setActiveTab('pending')} className={`tab ${activeTab === 'pending' ? 'tab-active' : ''}`}>
                <Clock className="icon-sm" />
                <span className="tab-text">En attente</span>
                <span className="tab-count">({stats.pending})</span>
              </button>
              <button onClick={() => setActiveTab('approved')} className={`tab ${activeTab === 'approved' ? 'tab-active' : ''}`}>
                <CheckCircle className="icon-sm" />
                <span className="tab-text">Approuvées</span>
                <span className="tab-count">({stats.approved})</span>
              </button>
              <button onClick={() => setActiveTab('declined')} className={`tab ${activeTab === 'declined' ? 'tab-active' : ''}`}>
                <XCircle className="icon-sm" />
                <span className="tab-text">Refusées</span>
                <span className="tab-count">({stats.declined})</span>
              </button>
              <button onClick={() => setActiveTab('all')} className={`tab ${activeTab === 'all' ? 'tab-active' : ''}`}>
                <Filter className="icon-sm" />
                <span className="tab-text">Toutes</span>
                <span className="tab-count">({stats.total})</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="filter-search-wrap">
              <Search className="filter-search-icon" size={16} />
              <input
                className="filter-search-input"
                type="text"
                placeholder="Rechercher une annonce..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="filter-clear-btn" onClick={() => setSearchQuery('')}>
                  <XIcon size={14} />
                </button>
              )}
            </div>

            <div className="filter-select-wrap">
              <Filter size={14} className="filter-select-icon" />
              <select
                className="filter-select"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
              >
                <option value="all">Toutes catégories</option>
                {categories.filter(c => c !== 'all').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="filter-select-wrap">
              <ArrowUpDown size={14} className="filter-select-icon" />
              <select
                className="filter-select"
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as typeof sortOrder)}
              >
                <option value="newest">Plus récentes</option>
                <option value="oldest">Plus anciennes</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
              </select>
            </div>

            {(searchQuery || selectedCategory !== 'all' || sortOrder !== 'newest') && (
              <button
                className="filter-reset-btn"
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setSortOrder('newest'); }}
              >
                <XIcon size={13} /> Réinitialiser
              </button>
            )}

            <span className="filter-count">{filteredAnnouncements.length} résultat{filteredAnnouncements.length !== 1 ? 's' : ''}</span>
          </div>

          {filteredAnnouncements.length === 0 ? (
            <div className="empty-state premium-empty">
              <Package className="empty-icon" />
              <h3 className="empty-title">Aucune annonce</h3>
              <p className="empty-text">Rien à afficher dans cette catégorie pour le moment.</p>
            </div>
          ) : (
            <div className="cards-grid">
              {filteredAnnouncements.map(announcement => (
                <AnnouncementCard
                  key={announcement.id_product}
                  announcement={announcement}
                  onAction={handleAction}
                  onClick={() => handleCardClick(announcement)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <AnnouncementModal
        announcement={selectedAnnouncement}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onAction={handleAction}
        onDelete={handleDelete}
      />

      <RejectionModal
        isOpen={showRejectionModal}
        productName={pendingDeclineName}
        onConfirm={handleDeclineWithReason}
        onCancel={handleCancelDecline}
      />
    </div>
  );
};

export default Dashboard;
