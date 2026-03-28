import React, { useState, useEffect } from 'react';
import { Users, Package, Heart, ShieldAlert, ArrowUpRight, Minus } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import './Analytics.css';

interface TopSeller {
  owner_id: string;
  firstname: string;
  lastname: string;
  email: string;
  count: number;
}

interface TopFavProduct {
  id_product: number;
  name: string;
  count: number;
}

const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);

  // --- USERS ---
  const [totalUsers, setTotalUsers] = useState(0);
  const [newUsersMonth, setNewUsersMonth] = useState(0);

  // --- PRODUCTS ---
  const [totalProducts, setTotalProducts] = useState(0);
  const [productsByState, setProductsByState] = useState<Record<string, number>>({});
  const [productsByCategory, setProductsByCategory] = useState<{ name: string; count: number }[]>([]);
  const [avgPrice, setAvgPrice] = useState(0);

  // --- FAVOURITES ---
  const [totalFavs, setTotalFavs] = useState(0);
  const [topFavProducts, setTopFavProducts] = useState<TopFavProduct[]>([]);

  // --- REPORTS ---
  const [totalReports, setTotalReports] = useState(0);
  const [reportsByCategory, setReportsByCategory] = useState<{ name: string; count: number }[]>([]);

  // --- TOP SELLERS ---
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchProducts(),
      fetchFavourites(),
      fetchReports(),
    ]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('id, firstname, lastname, email, created_at, is_admin');
    if (error || !data) return;

    const nonAdmin = data.filter(u => !u.is_admin);
    setTotalUsers(nonAdmin.length);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = nonAdmin.filter(u => new Date(u.created_at) >= startOfMonth).length;
    setNewUsersMonth(newThisMonth);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('product').select('id_product, name, price, category, state, owner_id, created_at');
    if (error || !data) return;

    setTotalProducts(data.length);

    // Par statut
    const byState: Record<string, number> = {};
    data.forEach(p => {
      const s = p.state || 'unknown';
      byState[s] = (byState[s] || 0) + 1;
    });
    setProductsByState(byState);

    // Par catégorie
    const byCat: Record<string, number> = {};
    data.forEach(p => {
      const c = p.category || 'Non catégorisé';
      byCat[c] = (byCat[c] || 0) + 1;
    });
    const catArray = Object.entries(byCat)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    setProductsByCategory(catArray);

    // Prix moyen
    const prices = data.filter(p => p.price && p.price > 0).map(p => p.price);
    const avg = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    setAvgPrice(avg);

    // Top 30 vendeurs
    const sellerCount: Record<string, number> = {};
    data.forEach(p => {
      if (p.owner_id) {
        sellerCount[p.owner_id] = (sellerCount[p.owner_id] || 0) + 1;
      }
    });

    const { data: usersData } = await supabase.from('users').select('id, firstname, lastname, email');
    const usersMap = new Map((usersData || []).map(u => [u.id, u]));

    const sellers: TopSeller[] = Object.entries(sellerCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 30)
      .map(([owner_id, count]) => {
        const u = usersMap.get(owner_id);
        return {
          owner_id,
          firstname: u?.firstname || 'Utilisateur',
          lastname: u?.lastname || '',
          email: u?.email || 'N/A',
          count,
        };
      });
    setTopSellers(sellers);
  };

  const fetchFavourites = async () => {
    const { data, error } = await supabase.from('favourite_product').select('id_product');
    if (error || !data) return;

    setTotalFavs(data.length);

    // Top produits favoris
    const favCount: Record<number, number> = {};
    data.forEach(f => {
      favCount[f.id_product] = (favCount[f.id_product] || 0) + 1;
    });

    const topIds = Object.entries(favCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    if (topIds.length > 0) {
      const ids = topIds.map(([id]) => parseInt(id));
      const { data: products } = await supabase.from('product').select('id_product, name').in('id_product', ids);
      const prodMap = new Map((products || []).map(p => [p.id_product, p.name]));

      const topFav: TopFavProduct[] = topIds.map(([id, count]) => ({
        id_product: parseInt(id),
        name: prodMap.get(parseInt(id)) || `Produit #${id}`,
        count,
      }));
      setTopFavProducts(topFav);
    }
  };

  const fetchReports = async () => {
    const { data, error } = await supabase.from('report_user').select('id_user, category_report');
    if (error || !data) return;

    setTotalReports(data.length);

    const byCat: Record<string, number> = {};
    data.forEach(r => {
      const c = r.category_report || 'Autre';
      byCat[c] = (byCat[c] || 0) + 1;
    });
    const catArray = Object.entries(byCat)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    setReportsByCategory(catArray);
  };

  const stateLabels: Record<string, string> = {
    approved: 'Approuvées',
    pending: 'En attente',
    declined: 'Refusées',
    unknown: 'Inconnu',
  };

  // Couleurs élégantes et modernes (pas trop flashy)
  const stateColors: Record<string, string> = {
    approved: '#0ea5e9',    // Ocean Blue
    pending: '#f59e0b',     // Amber
    declined: '#f43f5e',    // Rose
    unknown: '#cbd5e1',
  };

  const categoryPalette = [
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316'  // Orange
  ];

  const renderDonut = () => {
    let offset = 25;
    let hasData = false;

    const elements = Object.entries(productsByState).map(([state, count]) => {
      if (count === 0 || totalProducts === 0) return null;
      hasData = true;
      const pct = (count / totalProducts) * 100;
      const strokeDashoffset = offset;
      offset -= pct;
      return <circle key={state} cx="18" cy="18" r="15.9155" fill="none"
        stroke={stateColors[state] || '#94a3b8'} strokeWidth="3"
        strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={strokeDashoffset}
        strokeLinecap="round" style={{ transition: 'all 1s ease' }}
      />;
    });

    if (!hasData) {
      return (
        <svg viewBox="0 0 36 36" className="donut-ring empty">
          <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" strokeWidth="3" />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 36 36" className="donut-ring">
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="3" />
        {elements}
      </svg>
    );
  }

  if (loading) {
    return (
      <div className="content-container">
        <div className="loading-container" style={{ height: '100%', background: 'transparent' }}>
          <div className="loading-content">
            <div className="spinner" style={{ borderColor: 'rgba(15, 23, 42, 0.1)', borderTopColor: '#0f172a' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-analytics-page">
      <div className="min-header">
        <div>
          <h1 className="min-title">Statistiques</h1>
          <p className="min-subtitle">Vue d'ensemble et analytique de la plateforme</p>
        </div>
        <div className="min-status-badge">
          <span className="sync-dot"></span> Données synchronisées
        </div>
      </div>

      {/* KPI Section - Huge numbers, strict minimalist */}
      <section className="min-kpi-band">
        <div className="min-kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Utilisateurs</span>
            <Users size={16} className="kpi-icon" />
          </div>
          <div className="kpi-val">{totalUsers.toLocaleString('fr-FR')}</div>
          <div className="kpi-bot">
            <span className="trend-arrow up"><ArrowUpRight size={14} /></span>
            <span>+{newUsersMonth} ce mois</span>
          </div>
        </div>

        <div className="min-kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Annonces Actives</span>
            <Package size={16} className="kpi-icon" />
          </div>
          <div className="kpi-val">{totalProducts.toLocaleString('fr-FR')}</div>
          <div className="kpi-bot">
            <span className="trend-arrow neutral"><Minus size={14} /></span>
            <span>Prix moyen : {avgPrice.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>

        <div className="min-kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Interactions Favoris</span>
            <Heart size={16} className="kpi-icon" />
          </div>
          <div className="kpi-val">{totalFavs.toLocaleString('fr-FR')}</div>
          <div className="kpi-bot neutral-text">
            Total des produits marqués
          </div>
        </div>

        <div className="min-kpi-card">
          <div className="kpi-top">
            <span className="kpi-label">Signalements</span>
            <ShieldAlert size={16} className="kpi-icon" />
          </div>
          <div className="kpi-val">{totalReports}</div>
          <div className="kpi-bot neutral-text">
            Dossiers de modération
          </div>
        </div>
      </section>

      {/* Charts Section - 2 columns, taller */}
      <section className="min-charts-grid">
        {/* Left: Product Status */}
        <div className="min-panel">
          <div className="panel-head">
            <h2 className="panel-title-sm">Répartition des annonces</h2>
          </div>
          <div className="donut-showcase">
            <div className="donut-wrap">
              {renderDonut()}
              <div className="donut-center-info">
                <span className="d-val">{totalProducts}</span>
                <span className="d-lbl">Total</span>
              </div>
            </div>
            <div className="donut-legends">
              {Object.entries(productsByState).map(([state, count]) => (
                <div key={state} className="legend-row">
                  <div className="legend-dot" style={{ background: stateColors[state] || '#e2e8f0' }}></div>
                  <span className="legend-name">{stateLabels[state] || state}</span>
                  <span className="legend-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Top Categories */}
        <div className="min-panel">
          <div className="panel-head">
            <h2 className="panel-title-sm">Top 5 Catégories</h2>
          </div>
          <div className="min-bar-list">
            {productsByCategory.map((item, idx) => {
              const maxCount = productsByCategory[0]?.count || 1;
              const pct = (item.count / maxCount) * 100;
              const barColor = categoryPalette[idx % categoryPalette.length];
              return (
                <div key={idx} className="min-bar-item">
                  <div className="bar-labels">
                    <span className="b-name">{item.name}</span>
                    <span className="b-val">{item.count}</span>
                  </div>
                  <div className="b-track">
                    <div className="b-fill" style={{ width: `${pct}%`, backgroundColor: barColor }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Second Row of Charts: Favourites + Reports */}
      <section className="min-charts-grid">
        {/* Left: Top Favourites */}
        <div className="min-panel">
          <div className="panel-head">
            <h2 className="panel-title-sm">Top Produits Favoris</h2>
          </div>
          <div className="elegant-list">
            {topFavProducts.map((item, idx) => (
              <div key={item.id_product} className="elegant-row">
                <div className={`elegant-rank rank-${idx + 1}`}>{idx + 1}</div>
                <div className="elegant-name">{item.name}</div>
                <div className="elegant-score">
                  <Heart size={14} />
                  <span>{item.count} intéractions</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Reports Breakdown */}
        <div className="min-panel">
          <div className="panel-head">
            <h2 className="panel-title-sm">Alertes & Signalements</h2>
          </div>
          <div className="elegant-list">
            {reportsByCategory.length > 0 ? reportsByCategory.map((item, idx) => (
              <div key={idx} className="elegant-row">
                <div className="elegant-dot danger"></div>
                <div className="elegant-name">{item.name}</div>
                <div className="elegant-badge danger">{item.count} cas</div>
              </div>
            )) : (
              <div className="neutral-text" style={{ padding: '2rem 0', textAlign: 'center' }}>Aucun signalement actif.</div>
            )}
          </div>
        </div>
      </section>

      {/* Table Section - Full width */}
      <section className="min-table-section">
        <div className="min-panel padding-0">
          <div className="panel-head padded">
            <h2 className="panel-title-sm">Leaderboard : Top Vendeurs</h2>
            <span className="table-count-badge">{topSellers.length} profils analysés</span>
          </div>

          <div className="min-table-wrapper">
            <table className="min-data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Rank</th>
                  <th>Vendeur</th>
                  <th>Email</th>
                  <th style={{ textAlign: 'right' }}>Annonces publiées</th>
                </tr>
              </thead>
              <tbody>
                {topSellers.map((seller, idx) => {
                  return (
                    <tr key={seller.owner_id}>
                      <td className="rank-cell">
                        {idx + 1}
                      </td>
                      <td>
                        <div className="min-user-card">
                          <div className="min-avatar">
                            {seller.firstname.charAt(0).toUpperCase()}
                          </div>
                          <span className="min-user-name">{seller.firstname} {seller.lastname}</span>
                        </div>
                      </td>
                      <td className="min-email-cell">
                        {seller.email}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="score-badge">{seller.count}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Analytics;
