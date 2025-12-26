import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Package, Filter } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import AnnouncementCard from './components/AnnouncementCard';
import AnnouncementModal from './components/AnnouncementModal';
import type { Announcement } from './types';
import { useNavigate } from 'react-router-dom';
import './App.css';

const App: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'declined'>('pending');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, declined: 0 });
  const [session, setSession] = useState<any>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Vérifie la session actuelle au chargement
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/'); // 🔁 Redirige vers la page de login
      } else {
        setSession(session);
      }
    });

    // Écoute les changements de session (connexion / déconnexion)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
      } else {
        setSession(null);
        navigate('/'); // 🔁 redirection propre seulement si déconnexion réelle
      }
    });

    return () => subscription.unsubscribe();

  }, [navigate]);

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
      setAnnouncements(data || []);
    }
    setLoading(false);
  };

  /**
   * Modification de l'etat du produit et envoi de la notification
   * 
   * @param id 
   * @param action 
   * @returns 
   */
  const handleAction = async (id: number, action: 'approved' | 'declined') => {
    try {
      console.log('ID du produit reçu :', id);

      // Récupération du produit
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

      // Mise à jour d'action de la table product
      const { data: updatedProduct, error: updateError } = await supabase
        .from('product')
        .update({ state: action })
        .eq('id_product', id)
        .select('owner_id, state, id_product, name')
        .single();

      if (updateError) {
        console.error('Erreur lors de la mise à jour du produit :', updateError);
        return;
      }

      // Récupération du prénom de la personne ayant posté l'annonce
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('firstname')
        .eq('id', updatedProduct.owner_id)
        .single();

      if (userError) {
        console.error('Erreur lors de la récupération du propriétaire :', userError);
        return;
      }

      // Préparation du message à envoyer en notification
      let message = '';
      let title = 'Naria';
      let subtitle = '';

      if (action === 'approved') {
        subtitle = "Excellente nouvelle ! 🥳";
        message = `Ton annonce "${updatedProduct.name}" a été validée et est en ligne et visible par les acheteurs sur Naria.`;
      } else if (action === 'declined') {
        subtitle = "Publication refusée";
        message = `Bonjour ${user.firstname}, ton annonce "${updatedProduct.name}" a été refusée. Vérifie les conditions et retente ta chance !`;
      }

      // Envoi de la notification en appelant la Edge functions qui permet d'appeler le service apple.
      try {
        const { data: userTokens, error: tokenError } = await supabase
          .from('users')
          .select('token_apn')
          .eq('id', updatedProduct.owner_id)
          .single();

        if (tokenError) {
          console.error('Erreur récupération token:', tokenError);
          return;
        }

        const deviceToken = userTokens?.token_apn;
        if (!deviceToken) {
          console.log(`⚠️ Aucun token APNs trouvé pour ${user.firstname}`);
          return;
        }

        await fetch('https://rywcekthoiykxecltmhq.supabase.co/functions/v1/send-apn-notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            deviceToken,
            title,
            subtitle,
            body: message,
          }),
        });

      } catch (notifyError) {
        console.error('Erreur lors de l’envoi notification APNs:', notifyError);
      }

      fetchAnnounces();

    } catch (err) {
      console.error('Erreur inattendue dans handleAction :', err);
    }
  };

  if (!session) {
    // Pendant le check de session, on peut afficher un loader
    return <div className="loading">Chargement...</div>;
  }

  const goToReports = () => {
    navigate('/reports');
  };

  const goToNotifications = () => {
    navigate('/global-notifications');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    navigate('/');
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

  const handleDelete = async (id: number) => {
    try {
      // Récupération des informations du produit et de l'utilisateur avant suppression
      const { data: product, error: fetchError } = await supabase
        .from('product')
        .select('owner_id, name')
        .eq('id_product', id)
        .maybeSingle();

      if (fetchError) {
        console.error('Erreur lors de la récupération du produit:', fetchError);
      }

      // Récupération du prénom de l'utilisateur
      let userFirstname = '';
      if (product?.owner_id) {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('firstname')
          .eq('id', product.owner_id)
          .single();

        if (userError) {
          console.error('Erreur lors de la récupération de l\'utilisateur:', userError);
        } else {
          userFirstname = user?.firstname || '';
        }
      }

      // Envoi de la notification avant suppression
      if (product?.owner_id) {
        try {
          const { data: userTokens, error: tokenError } = await supabase
            .from('users')
            .select('token_apn')
            .eq('id', product.owner_id)
            .single();

          if (tokenError) {
            console.error('Erreur récupération token:', tokenError);
          } else {
            const deviceToken = userTokens?.token_apn;
            if (deviceToken) {
              const title = 'Naria';
              const subtitle = 'Annonce supprimée';
              const message = `Bonjour ${userFirstname}, ton annonce "${product.name}" a été supprimée par un administrateur.`;

              await fetch('https://rywcekthoiykxecltmhq.supabase.co/functions/v1/send-apn-notifications', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                  deviceToken,
                  title,
                  subtitle,
                  body: message,
                }),
              });
              console.log('✅ Notification de suppression envoyée avec succès');
            } else {
              console.log(`⚠️ Aucun token APNs trouvé pour l'utilisateur`);
            }
          }
        } catch (notifyError) {
          console.error('Erreur lors de l\'envoi de la notification:', notifyError);
        }
      }

      // 1. Lister tous les fichiers du dossier `products/product-{id}`
      const { data: files, error: listError } = await supabase
        .storage
        .from('product-images')
        .list(`products/product-${id}`);

      if (listError) {
        console.error('Erreur lors de la récupération des fichiers du storage:', listError);
      } else if (files && files.length > 0) {
        // Créer un tableau avec tous les chemins complets des fichiers
        const filePaths = files.map(file => `products/product-${id}/${file.name}`);

        // 2. Supprimer tous les fichiers
        const { error: deleteError } = await supabase
          .storage
          .from('product-images')
          .remove(filePaths);

        if (deleteError) {
          console.error('Erreur lors de la suppression des fichiers du storage:', deleteError);
        }
      }

      const { error: imagesError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', id);

      if (imagesError) {
        console.error('Erreur lors de la suppression des liens d’images:', imagesError);
      }

      const { error: productError } = await supabase
        .from('product')
        .delete()
        .eq('id_product', id);

      if (productError) {
        console.error('Erreur lors de la suppression:', productError);
        alert('Erreur lors de la suppression de l\'annonce');
      } else {
        alert('Annonce supprimée avec succès');
        fetchAnnounces(); // Refresh the list
      }
    } catch (err) {
      console.error('Erreur inattendue lors de la suppression: ', err);
      alert('Erreur inattendue lors de la suppression');
    }
  };

  const filteredAnnouncements = activeTab === 'all'
    ? announcements
    : announcements.filter(a => a.state === activeTab);


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
            <h1 className="header-title">Naria Admin</h1>
            <p className="header-subtitle">Gérez vos annonces en toute simplicité</p>
          </div>
          <div className="header-actions">
            <button className="header-btn" onClick={goToReports}>
              📋 Voir les signalements
            </button>
            <button className="header-btn" onClick={goToNotifications}>
              Envoyer une notification
            </button>
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
        onDelete={handleDelete}
      />
    </div>
  );
};

export default App;