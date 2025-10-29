import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Package, Filter } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import AnnouncementCard from './components/AnnouncementCard';
import AnnouncementModal from './components/AnnouncementModal';
import Login from './pages/Login';
import type { Announcement } from './types';
import './App.css';

const App: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'declined'>('pending');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, declined: 0 });
  const [session, setSession] = useState<any>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) fetchAnnounces();
  }, [session]);

  useEffect(() => {
    const total = announcements.length;
    const pending = announcements.filter(a => a.state === 'pending').length;
    const approved = announcements.filter(a => a.state === 'approved').length;
    const declined = announcements.filter(a => a.state === 'declined').length;
    setStats({ total, pending, approved, declined });
  }, [announcements]);

  const fetchAnnounces = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('product')
      .select('*');

    if (error) {
      console.error('Erreur lors du chargement:', error);
    } else {
      console.log('Données chargées:', data);
      setAnnouncements(data || []);
    }
    setLoading(false);
  };

  const handleAction = async (id: number, action: 'approved' | 'declined') => {
    try {
      console.log('ID du produit reçu :', id);

      // 1️⃣ Récupération du produit pour obtenir son owner_id
      const { data: product, error: fetchError } = await supabase
        .from('product')
        .select('owner_id')
        .eq('id_product', id)
        .maybeSingle();

      if (fetchError) {
        console.error('Erreur lors de la récupération du produit :', fetchError);
        return;
      }

      if (!product) {
        console.error('Produit introuvable ou non autorisé.');
        return;
      }

      // 2️⃣ Mise à jour de l’état du produit
      const { data: updatedProduct, error: updateError } = await supabase
        .from('product')
        .update({ state: action })
        .eq('id_product', id)
        .select('owner_id, state, id_product,name')
        .single();

      if (updateError) {
        console.error('Erreur lors de la mise à jour du produit :', updateError);
        return;
      }

      console.log('Produit mis à jour :', updatedProduct);

      // 3️⃣ Récupération des informations du propriétaire
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('expo_push_token, firstname')
        .eq('id', updatedProduct.owner_id)
        .single();

      if (userError) {
        console.error('Erreur lors de la récupération du propriétaire :', userError);
        return;
      }

      if (!user?.expo_push_token) {
        console.warn("L'utilisateur n’a pas de jeton Expo Push enregistré.");
        return;
      }

      // 4️⃣ Préparation du message selon l’action
      let message = '';
      if (action === 'approved') {
        message = `"${updatedProduct.name}" a été approuvée ✅. Elle est maintenant visible par tous les acheteurs de Naria.`;
      } else if (action === 'declined') {
        message = `Bonjour ${user.firstname}, ton annonce n’a malheureusement pas été approuvée. 😞`;
      }

      // 5️⃣ Envoi de la notification via ta Supabase Edge Function
      const { error: notifyError } = await supabase.functions.invoke('send-notifications', {
        body: {
          expoPushToken: user.expo_push_token,
          message,
          id_product: updatedProduct.id_product
        },
        headers: { 'Accept': 'application/json' }
      });

      if (notifyError) {
        console.error('Erreur lors de l’envoi de la notification :', notifyError);
        return;
      }

      console.log(`Notification envoyée à ${user.firstname} (${action})`);

      // 6️⃣ Rafraîchissement des données après traitement
      fetchAnnounces();

    } catch (err) {
      console.error('Erreur inattendue dans handleAction :', err);
    }
  };



  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleCardClick = (announcement: Announcement) => {
    console.log('Announcement clicked:', announcement);
    setSelectedAnnouncement(announcement);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedAnnouncement(null);
  };

  const filteredAnnouncements = activeTab === 'all' 
    ? announcements 
    : announcements.filter(a => a.state === activeTab);

  if (!session) {
    return <Login onLogin={() => supabase.auth.getSession().then(({ data: { session } }) => setSession(session))} />;
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner"></div>
          <p className="loading-text">Chargement des annonces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <h1 className="header-title">Toumai Market Admin</h1>
            <p className="header-subtitle">Gérez vos annonces en toute simplicité</p>
          </div>
          <div className="header-actions">
            <button className="header-logout" onClick={handleLogout}>Déconnexion</button>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card stat-card-blue">
              <div className="stat-content">
                <div>
                  <p className="stat-label">Total</p>
                  <p className="stat-value">{stats.total}</p>
                </div>
                <Package className="stat-icon" />
              </div>
            </div>
            <div className="stat-card stat-card-yellow">
              <div className="stat-content">
                <div>
                  <p className="stat-label">En attente</p>
                  <p className="stat-value">{stats.pending}</p>
                </div>
                <Clock className="stat-icon" />
              </div>
            </div>
            <div className="stat-card stat-card-green">
              <div className="stat-content">
                <div>
                  <p className="stat-label">Approuvées</p>
                  <p className="stat-value">{stats.approved}</p>
                </div>
                <CheckCircle className="stat-icon" />
              </div>
            </div>
            <div className="stat-card stat-card-red">
              <div className="stat-content">
                <div>
                  <p className="stat-label">Refusées</p>
                  <p className="stat-value">{stats.declined}</p>
                </div>
                <XCircle className="stat-icon" />
              </div>
            </div>
          </div>
          {/* Tabs */}
          <div className="tabs-container">
            <div className="tabs">
              <button
                onClick={() => setActiveTab('pending')}
                className={`tab ${activeTab === 'pending' ? 'tab-active' : ''}`}
              >
                <Clock className="icon-sm" />
                <span className="tab-text">En attente</span>
                <span className="tab-count">({stats.pending})</span>
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`tab ${activeTab === 'approved' ? 'tab-active' : ''}`}
              >
                <CheckCircle className="icon-sm" />
                <span className="tab-text">Approuvées</span>
                <span className="tab-count">({stats.approved})</span>
              </button>
              <button
                onClick={() => setActiveTab('declined')}
                className={`tab ${activeTab === 'declined' ? 'tab-active' : ''}`}
              >
                <XCircle className="icon-sm" />
                <span className="tab-text">Refusées</span>
                <span className="tab-count">({stats.declined})</span>
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`tab ${activeTab === 'all' ? 'tab-active' : ''}`}
              >
                <Filter className="icon-sm" />
                <span className="tab-text">Toutes</span>
                <span className="tab-count">({stats.total})</span>
              </button>
            </div>
          </div>
          {/* Liste des annonces */}
          {filteredAnnouncements.length === 0 ? (
            <div className="empty-state">
              <Package className="empty-icon" />
              <h3 className="empty-title">Aucune annonce</h3>
              <p className="empty-text">
                {activeTab === 'pending' 
                  ? "Il n'y a aucune annonce en attente de traitement." 
                  : activeTab === 'approved'
                  ? "Aucune annonce approuvée pour le moment."
                  : activeTab === 'declined'
                  ? "Aucune annonce refusée pour le moment."
                  : "Aucune annonce n'a été créée pour le moment."}
              </p>
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
        </div>
      </main>

      {/* Modal de détail */}
      <AnnouncementModal
        announcement={selectedAnnouncement}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onAction={handleAction}
      />
    </div>
  );
};

export default App;