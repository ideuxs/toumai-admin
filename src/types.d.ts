export interface Announcement {
    id_product: number;
    name: string;
    titre?: string; // Titre alternatif
    description: string;
    price: number;
    prix?: number; // Prix alternatif
    state: 'approved' | 'declined' | 'pending';
    etat?: 'approved' | 'declined' | 'pending'; // État alternatif
    created_at?: string;
    category?: string;
    localisation?: string;
    owner_id?: string;
    nom_vendeur?: string;
    image_url?: string[];
  }