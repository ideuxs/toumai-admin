import React, { useEffect, useMemo, useState } from 'react';
import { Ban, Clock, Filter, Mail, Phone, Search, ShieldAlert, UserCheck, Users, X } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { recordAdminAction } from '../services/authService';
import { sendAccountStatusEmail } from '../services/emailService';
import './UsersManagement.css';

type UserStatus = 'active' | 'suspended' | 'banned';
type ModerationAction = 'suspend' | 'ban' | 'activate';

interface ManagedUser {
  id: string;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  status: UserStatus | null;
  last_login_at: string | null;
  last_seen_at: string | null;
  banned_until: string | null;
  ban_reason: string | null;
  is_admin: boolean | null;
  token_apn: string | null;
  productsCount: number;
  reportsCount: number;
}

interface ReasonPreset {
  id: string;
  label: string;
  message: string;
}

const SUSPENSION_DURATIONS = [
  { label: '7 jours', value: 7 },
  { label: '30 jours', value: 30 },
  { label: '90 jours', value: 90 },
];

const SUSPENSION_REASON_PRESETS: ReasonPreset[] = [
  {
    id: 'suspicious_activity',
    label: 'Activité suspecte',
    message: "Votre compte a été suspendu temporairement en raison d'une activité inhabituelle détectée. Cette mesure préventive vise à protéger la plateforme et les utilisateurs, veuillez vérifier vos mails pour plus de détails (pensez au spams).",
  },
  {
    id: 'repeated_reports',
    label: 'Signalements répétés',
    message: "Votre compte a été suspendu temporairement suite à des signalements répétés liés à vos annonces ou à vos interactions sur la plateforme, veuillez vérifier vos mails pour plus de détails (pensez au spams).",
  },
  {
    id: 'content_non_compliant',
    label: 'Contenu non conforme',
    message: "Votre compte a été suspendu temporairement car plusieurs contenus publiés ne respectent pas les règles de la communauté et de modération, veuillez vérifier vos mails pour plus de détails (pensez au spams).",
  },
  {
    id: 'harassment',
    label: 'Comportement abusif',
    message: "Votre compte a été suspendu temporairement en raison d'un comportement inapproprié envers d'autres utilisateurs, , veuillez vérifier vos mails pour plus de détails (pensez au spams).",
  },
];

const BAN_REASON_PRESETS: ReasonPreset[] = [
  {
    id: 'fraud',
    label: 'Fraude / Arnaque',
    message: "Votre compte a été banni définitivement pour fraude avérée ou tentative d'arnaque sur la plateforme.",
  },
  {
    id: 'prohibited_goods',
    label: 'Produits interdits',
    message: "Votre compte a été banni définitivement suite à la publication répétée de produits strictement interdits par les conditions d'utilisation.",
  },
  {
    id: 'identity_abuse',
    label: 'Usurpation / Faux compte',
    message: "Votre compte a été banni définitivement en raison d'une usurpation d'identité ou de la création de faux profils.",
  },
  {
    id: 'severe_harassment',
    label: 'Abus grave',
    message: "Votre compte a été banni définitivement en raison d'un comportement grave ou dangereux envers la communauté.",
  },
];

const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [actionType, setActionType] = useState<ModerationAction>('suspend');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [customContext, setCustomContext] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [durationDays, setDurationDays] = useState(7);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);

    const [{ data: usersData, error: usersError }, { data: productsData }, { data: reportsData }] = await Promise.all([
      supabase
        .from('users')
        .select('id, firstname, lastname, email, phone, created_at, status, last_login_at, last_seen_at, banned_until, ban_reason, is_admin, token_apn')
        .order('created_at', { ascending: false }),
      supabase.from('product').select('owner_id'),
      supabase.from('report_user').select('id_user'),
    ]);

    if (usersError || !usersData) {
      console.error('Erreur chargement utilisateurs:', usersError);
      setLoading(false);
      return;
    }

    const productCount = (productsData || []).reduce<Record<string, number>>((acc, product) => {
      if (product.owner_id) acc[product.owner_id] = (acc[product.owner_id] || 0) + 1;
      return acc;
    }, {});

    const reportCount = (reportsData || []).reduce<Record<string, number>>((acc, report) => {
      if (report.id_user) acc[report.id_user] = (acc[report.id_user] || 0) + 1;
      return acc;
    }, {});

    setUsers(
      usersData
        .filter(user => !user.is_admin)
        .map(user => ({
          ...user,
          status: (user.status as UserStatus | null) || 'active',
          productsCount: productCount[user.id] || 0,
          reportsCount: reportCount[user.id] || 0,
        }))
    );
    setLoading(false);
  };

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(user => getEffectiveStatus(user) === 'active').length,
      suspended: users.filter(user => getEffectiveStatus(user) === 'suspended').length,
      banned: users.filter(user => getEffectiveStatus(user) === 'banned').length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return users.filter(user => {
      const status = getEffectiveStatus(user);
      const fullName = `${user.firstname || ''} ${user.lastname || ''}`.trim().toLowerCase();
      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        (user.email || '').toLowerCase().includes(query) ||
        (user.phone || '').toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [users, searchQuery, statusFilter]);

  function getEffectiveStatus(user: ManagedUser): UserStatus {
    if (user.status === 'banned') return 'banned';
    if (user.status === 'suspended' && user.banned_until && new Date(user.banned_until) > new Date()) {
      return 'suspended';
    }
    return 'active';
  }

  const openModerationModal = (user: ManagedUser, action: ModerationAction) => {
    setSelectedUser(user);
    setActionType(action);
    setDurationDays(7);
    setSendEmail(action !== 'activate');
    setCustomContext('');

    const defaults =
      action === 'suspend'
        ? SUSPENSION_REASON_PRESETS[0]
        : action === 'ban'
          ? BAN_REASON_PRESETS[0]
          : null;

    setSelectedPresetId(defaults?.id || '');
    setReason(action === 'activate' ? 'Compte réactivé par un administrateur.' : defaults?.message || '');
  };

  const closeModal = () => {
    setSelectedUser(null);
    setSelectedPresetId('');
    setReason('');
    setCustomContext('');
    setSendEmail(true);
    setDurationDays(7);
    setSaving(false);
  };

  const getCurrentReasonPresets = () => {
    if (actionType === 'suspend') return SUSPENSION_REASON_PRESETS;
    if (actionType === 'ban') return BAN_REASON_PRESETS;
    return [];
  };

  const handleSelectPreset = (preset: ReasonPreset) => {
    setSelectedPresetId(preset.id);
    setReason(preset.message);
  };

  const getComposedReason = () => {
    const base = reason.trim();
    const extra = customContext.trim();

    if (!extra) return base;
    return `${base}\n\nInformations complémentaires:\n${extra}`;
  };

  const getSuspensionEndDateLabel = (isoDate: string | null) => {
    if (!isoDate) return null;
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEmailDetailedMessage = (action: 'suspend' | 'ban', moderationReason: string, suspensionEndIso: string | null) => {
    if (!selectedUser) return moderationReason;

    const displayName = getDisplayName(selectedUser);
    const endDateLabel = getSuspensionEndDateLabel(suspensionEndIso);

    if (action === 'suspend') {
      return [
        `Bonjour ${displayName},`,
        '',
        "Nous vous informons qu'une suspension temporaire a été appliquée à votre compte Naria suite à un contrôle de modération.",
        endDateLabel
          ? `Durée de suspension: ${durationDays} jours (jusqu'au ${endDateLabel}).`
          : `Durée de suspension: ${durationDays} jours.`,
        '',
        'Motif principal:',
        moderationReason,
        '',
        "Pendant cette période, certaines fonctionnalités peuvent être restreintes (publication, interactions, visibilité).",
        "À l'expiration de la suspension, l'accès peut être rétabli automatiquement selon la politique de la plateforme.",
        '',
        "Si vous souhaitez demander un réexamen, contacter l'équipe Naria avec les informations utiles.",
        '',
        "L'équipe Naria",
      ].join('\n');
    }

    return [
      `Bonjour ${displayName},`,
      '',
      "Nous vous informons qu'un bannissement a été appliqué à votre compte Naria à la suite d'une décision de modération.",
      'Ce bannissement est effectif immédiatement.',
      '',
      'Motif principal:',
      moderationReason,
      '',
      "Votre compte ne pourra plus utiliser la plateforme tant que cette décision n'est pas levée par un administrateur.",
      "Si vous estimez qu'il s'agit d'une erreur, vous pouvez demander un réexamen en répondant à cet email.",
      '',
      "L'équipe Naria",
    ].join('\n');
  };

  const handleSubmitAction = async () => {
    if (!selectedUser) return;

    const trimmedReason = getComposedReason().trim();
    if (actionType !== 'activate' && !trimmedReason) return;

    setSaving(true);

    const now = new Date();
    const bannedUntil = new Date(now);
    bannedUntil.setDate(now.getDate() + durationDays);

    const updatePayload =
      actionType === 'suspend'
        ? {
            status: 'suspended',
            banned_until: bannedUntil.toISOString(),
            ban_reason: trimmedReason,
          }
        : actionType === 'ban'
          ? {
              status: 'banned',
              banned_until: null,
              ban_reason: trimmedReason,
            }
          : {
              status: 'active',
              banned_until: null,
              ban_reason: null,
          };

    const emailDetailedMessage =
      actionType === 'suspend' || actionType === 'ban'
        ? getEmailDetailedMessage(actionType, trimmedReason, updatePayload.banned_until)
        : trimmedReason;

    const { error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', selectedUser.id);

    if (error) {
      console.error('Erreur mise à jour utilisateur:', error);
      alert("Impossible de modifier le statut de l'utilisateur.");
      setSaving(false);
      return;
    }

    await recordAdminAction({
      action: actionType === 'suspend' ? 'user_suspended' : actionType === 'ban' ? 'user_banned' : 'user_reactivated',
      targetType: 'users',
      targetId: selectedUser.id,
      reason: trimmedReason || undefined,
      metadata: {
        email: selectedUser.email,
        reason_preset_id: selectedPresetId || null,
        previous_status: selectedUser.status || 'active',
        new_status: updatePayload.status,
        banned_until: updatePayload.banned_until,
      },
    });

    if ((actionType === 'suspend' || actionType === 'ban') && sendEmail && selectedUser.email) {
      await sendAccountStatusEmail({
        recipientEmail: selectedUser.email,
        recipientName: getDisplayName(selectedUser),
        statusAction: actionType === 'suspend' ? 'suspended' : 'banned',
        reason: emailDetailedMessage,
        bannedUntil: updatePayload.banned_until,
      });
    }

    if ((actionType === 'suspend' || actionType === 'ban') && selectedUser.token_apn) {
      const pushBody =
        actionType === 'ban'
          ? 'Votre compte a été banni, consulter mail pour plus d\'indication.'
          : 'Votre compte a été suspendu, consulter mail pour plus d\'indication.';

      try {
        await fetch('https://rywcekthoiykxecltmhq.supabase.co/functions/v1/send-apn-notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            deviceToken: selectedUser.token_apn,
            title: 'Naria',
            subtitle: 'Statut du compte',
            body: pushBody,
          }),
        });
      } catch (pushError) {
        console.error('Erreur notification suspension/ban:', pushError);
      }
    }

    await fetchUsers();
    closeModal();
  };

  const getDisplayName = (user: ManagedUser) => {
    return `${user.firstname || ''} ${user.lastname || ''}`.trim() || 'Utilisateur';
  };

  const formatDate = (value: string | null) => {
    if (!value) return 'Jamais';
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return 'Jamais';
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLiftActionLabel = (status: UserStatus) => {
    if (status === 'suspended') return 'Lever suspension';
    if (status === 'banned') return 'Lever bannissement';
    return 'Réactiver';
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ height: '100%', background: 'transparent' }}>
        <div className="loading-content">
          <div className="spinner" style={{ borderColor: 'rgba(15, 23, 42, 0.2)', borderTopColor: 'var(--accent-blue)' }}></div>
          <p className="loading-text" style={{ color: 'var(--navy-main)' }}>Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-container users-page">
      <div className="users-stats-grid">
        <div className="user-stat-card">
          <Users size={18} />
          <span>Total</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="user-stat-card">
          <UserCheck size={18} />
          <span>Actifs</span>
          <strong>{stats.active}</strong>
        </div>
        <div className="user-stat-card">
          <Clock size={18} />
          <span>Suspendus</span>
          <strong>{stats.suspended}</strong>
        </div>
        <div className="user-stat-card danger">
          <Ban size={18} />
          <span>Bannis</span>
          <strong>{stats.banned}</strong>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-search-wrap">
          <Search className="filter-search-icon" size={16} />
          <input
            className="filter-search-input"
            type="text"
            placeholder="Rechercher nom, email, téléphone..."
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
          />
          {searchQuery && (
            <button className="filter-clear-btn" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-select-wrap">
          <Filter size={14} className="filter-select-icon" />
          <select
            className="filter-select"
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value as 'all' | UserStatus)}
          >
            <option value="all">Tous statuts</option>
            <option value="active">Actifs</option>
            <option value="suspended">Suspendus</option>
            <option value="banned">Bannis</option>
          </select>
        </div>

        <span className="filter-count">{filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}</span>
      </div>

      <div className="recent-section">
        <div className="supervision-table-container">
          <table className="supervision-table users-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Contact</th>
                <th>Statut</th>
                <th>Activité</th>
                <th>Annonces</th>
                <th>Signalements</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => {
                const status = getEffectiveStatus(user);

                return (
                  <tr key={user.id} className="table-row">
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar-sm">{getDisplayName(user).charAt(0).toUpperCase()}</div>
                        <div>
                          <strong>{getDisplayName(user)}</strong>
                          <span>Inscrit le {formatDate(user.created_at)}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="user-contact-stack">
                        <span><Mail size={13} /> {user.email || 'Email absent'}</span>
                        <span><Phone size={13} /> {user.phone || 'Téléphone absent'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`user-status-badge status-${status}`}>
                        {status === 'active' ? 'Actif' : status === 'suspended' ? 'Suspendu' : 'Banni'}
                      </span>
                      {status === 'suspended' && (
                        <div className="status-subtext">jusqu'au {formatDate(user.banned_until)}</div>
                      )}
                    </td>
                    <td>
                      <div className="user-contact-stack">
                        <span>Vu: {formatDateTime(user.last_seen_at)}</span>
                        <span>Login: {formatDate(user.last_login_at)}</span>
                      </div>
                    </td>
                    <td className="metric-cell">{user.productsCount}</td>
                    <td className="metric-cell">{user.reportsCount}</td>
                    <td className="cell-actions users-actions">
                      {status !== 'active' ? (
                        <button className="btn-user-action restore" onClick={() => openModerationModal(user, 'activate')}>
                          {getLiftActionLabel(status)}
                        </button>
                      ) : (
                        <>
                          <button className="btn-user-action" onClick={() => openModerationModal(user, 'suspend')}>
                            Suspendre
                          </button>
                          <button className="btn-user-action danger" onClick={() => openModerationModal(user, 'ban')}>
                            Bannir
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <div className="user-modal-overlay" onClick={closeModal}>
          <div className="user-modal" onClick={event => event.stopPropagation()}>
            <div className="user-modal-header">
              <div>
                <h3>
                  {actionType === 'suspend'
                    ? 'Suspendre utilisateur'
                    : actionType === 'ban'
                      ? 'Bannir utilisateur'
                      : 'Réactiver utilisateur'}
                </h3>
                <p>{getDisplayName(selectedUser)} · {selectedUser.email}</p>
              </div>
              <button onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            {actionType === 'suspend' && (
              <div className="user-modal-field">
                <label>Durée</label>
                <div className="duration-grid">
                  {SUSPENSION_DURATIONS.map(duration => (
                    <button
                      key={duration.value}
                      className={durationDays === duration.value ? 'selected' : ''}
                      onClick={() => setDurationDays(duration.value)}
                    >
                      {duration.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(actionType === 'suspend' || actionType === 'ban') && (
              <div className="user-modal-field">
                <label>Catégorie du motif</label>
                <div className="reason-presets-grid">
                  {getCurrentReasonPresets().map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`reason-preset-btn ${selectedPresetId === preset.id ? 'selected' : ''}`}
                      onClick={() => handleSelectPreset(preset)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="user-modal-field">
              <label>{actionType === 'activate' ? 'Note interne' : 'Motif principal'}</label>
              <textarea
                value={reason}
                onChange={event => setReason(event.target.value)}
                rows={5}
                maxLength={900}
                placeholder={
                  actionType === 'activate'
                    ? 'Pourquoi ce compte est réactivé ?'
                    : 'Explique la raison de cette décision...'
                }
              />
              <span>{reason.length}/900</span>
            </div>

            {(actionType === 'suspend' || actionType === 'ban') && (
              <>
                <div className="user-modal-field">
                  <label>Détails additionnels (optionnel)</label>
                  <textarea
                    value={customContext}
                    onChange={event => setCustomContext(event.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Ajoute des détails spécifiques à ce dossier..."
                  />
                  <span>{customContext.length}/500</span>
                </div>

                <div className="user-modal-field">
                  <label className="mail-toggle-label">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={event => setSendEmail(event.target.checked)}
                    />
                    Envoyer le motif par email à l'utilisateur
                  </label>
                </div>

                <div className="mail-preview">
                  <label>Texte envoyé par mail</label>
                  <div className="mail-preview-box">
                    {actionType === 'suspend' || actionType === 'ban'
                      ? getEmailDetailedMessage(
                          actionType,
                          getComposedReason(),
                          actionType === 'suspend'
                            ? (() => {
                                const now = new Date();
                                now.setDate(now.getDate() + durationDays);
                                return now.toISOString();
                              })()
                            : null
                        )
                      : getComposedReason() || 'Aucun texte'}
                  </div>
                </div>
              </>
            )}

            {selectedUser.ban_reason && (
              <div className="previous-reason">
                <ShieldAlert size={15} />
                <span>Motif actuel: {selectedUser.ban_reason}</span>
              </div>
            )}

            <div className="user-modal-actions">
              <button className="btn-modal-secondary" onClick={closeModal}>
                Annuler
              </button>
              <button
                className={`btn-modal-primary ${actionType === 'ban' ? 'danger' : ''}`}
                onClick={handleSubmitAction}
                disabled={saving || (actionType !== 'activate' && !getComposedReason().trim())}
              >
                {saving ? 'Enregistrement...' : actionType === 'activate' ? 'Réactiver' : actionType === 'ban' ? 'Bannir' : 'Suspendre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
