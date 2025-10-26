import { supabase } from './supabaseClient';


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