import { supabase } from './supabaseClient';

export interface AdminProfile {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    is_admin: boolean;
    status: string | null;
}

export const getCurrentAdminProfile = async (): Promise<AdminProfile | null> => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return null;
    }

    const { data, error } = await supabase
        .from('users')
        .select('id, firstname, lastname, email, is_admin, status')
        .eq('id', user.id)
        .single();

    if (error || !data || !data.is_admin || data.status === 'banned' || data.status === 'suspended') {
        return null;
    }

    return data as AdminProfile;
};

export const touchAdminLogin = async (adminId: string) => {
    await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', adminId);
};

export const recordAdminAction = async (params: {
    action: string;
    targetType: string;
    targetId: string | number;
    reason?: string;
    metadata?: Record<string, unknown>;
}) => {
    const admin = await getCurrentAdminProfile();

    if (!admin) return;

    await supabase.from('admin_action_logs').insert({
        admin_id: admin.id,
        action: params.action,
        target_type: params.targetType,
        target_id: String(params.targetId),
        reason: params.reason ?? null,
        metadata: params.metadata ?? {},
    });
};

export const recordProductModerationEvent = async (params: {
    productId: number;
    action: 'approved' | 'declined' | 'restored' | 'updated_by_admin';
    previousState?: string | null;
    newState?: string | null;
    reason?: string;
    metadata?: Record<string, unknown>;
}) => {
    const admin = await getCurrentAdminProfile();

    if (!admin) return;

    await supabase.from('product_moderation_events').insert({
        product_id: params.productId,
        admin_id: admin.id,
        action: params.action,
        previous_state: params.previousState ?? null,
        new_state: params.newState ?? null,
        reason: params.reason ?? null,
        metadata: params.metadata ?? {},
    });
};


export const getNameOfUser = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('firstname')
            .eq('id', userId)
            .single();
        if (error) {
            return error;
        }
        console.log('Nom utilisateur:', data.firstname);
        return data.firstname;
    } catch (error) {
        console.error('Erreur récupération nom utilisateur:', error);
        return null;
    }
};
