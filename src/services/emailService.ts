/**
 * Service d'envoi d'emails via Supabase Edge Function
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface RejectionEmailParams {
  recipientEmail: string;
  recipientName: string;
  productName: string;
  rejectionReason: string;
}

interface AccountStatusEmailParams {
  recipientEmail: string;
  recipientName: string;
  statusAction: 'suspended' | 'banned' | 'reactivated';
  reason: string;
  bannedUntil?: string | null;
}

/**
 * Envoie un email de refus à l'utilisateur via la Edge Function Mailjet
 */
export const sendRejectionEmail = async (params: RejectionEmailParams): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-rejection-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(params),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('Erreur envoi email de refus:', result);
      return { success: false, error: result.error || "Échec de l'envoi de l'email" };
    }

    console.log('✅ Email de refus envoyé avec succès');
    return { success: true };
  } catch (error) {
    console.error('Erreur inattendue envoi email:', error);
    return { success: false, error: "Erreur réseau lors de l'envoi de l'email" };
  }
};

/**
 * Envoie un email de suspension / bannissement / réactivation de compte
 */
export const sendAccountStatusEmail = async (
  params: AccountStatusEmailParams
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-account-status-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(params),
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      console.error('Erreur envoi email statut compte:', result);
      return { success: false, error: result.error || "Échec de l'envoi de l'email" };
    }

    return { success: true };
  } catch (error) {
    console.error('Erreur inattendue envoi email statut compte:', error);
    return { success: false, error: "Erreur réseau lors de l'envoi de l'email" };
  }
};
