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
