import { supabase } from './supabaseClient';

/**
 * Récupère la première image d'un produit depuis la table product_images
 * @param productId - ID du produit
 * @returns URL de la première image ou null si erreur
 */
export const getFirstImageForProduct = async (productId: number): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from("product_images")
      .select("image_url")
      .eq("product_id", productId)
      .limit(1);

    if (error) {
      console.error("Erreur récupération image:", error);
      return null;
    }
    return data.length > 0 ? data[0].image_url : null;
  } catch (err) {
    console.error("Erreur inattendue:", err);
    return null;
  }
};

/**
 * Récupère toutes les images d'un produit depuis le bucket
 * @param productId - ID du produit
 * @returns Array d'URLs d'images
 */
export const getImagesForProduct = async (productId: number): Promise<string[]> => {
  try {
    // Lister uniquement le dossier du produit
    const { data: files, error } = await supabase.storage
      .from('product-images')
      .list(`products/product-${productId}`, { limit: 100, offset: 0 });

    if (error) {
      console.error('Erreur lors de la récupération des fichiers du bucket :', error.message);
      return [];
    }

    // Générer les URLs publiques
    const urls = files.map((file) => {
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(`products/product-${productId}/${file.name}`);

      return urlData.publicUrl;
    });
    return urls;
  } catch (err) {
    console.error('Erreur :', err);
    return [];
  }
};

/**
 * Récupère l'URL publique d'une image de produit depuis le bucket
 * @param productId - ID du produit
 * @param imageIndex - Index de l'image (0, 1, 2, etc.)
 * @returns URL publique de l'image ou null si erreur
 */
export const getProductImageUrl = async (productId: number, imageIndex: number = 0): Promise<string | null> => {
  try {
    // Lister les fichiers du dossier du produit
    const { data: files, error } = await supabase.storage
      .from('product-images')
      .list(`products/product-${productId}`, { limit: 100, offset: 0 });

    if (error) {
      console.error('Erreur lors de la récupération des fichiers du bucket :', error.message);
      return null;
    }

    if (!files || files.length === 0) {
      console.log(`Aucun fichier trouvé pour le produit ${productId}`);
      return null;
    }

    // Prendre le fichier à l'index demandé
    if (imageIndex >= files.length) {
      console.log(`Index ${imageIndex} non disponible pour le produit ${productId} (${files.length} fichiers)`);
      return null;
    }

    const fileName = files[imageIndex].name;
    console.log(`Récupération de l'image ${imageIndex} pour le produit ${productId}: ${fileName}`);

    // Générer l'URL publique
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(`products/product-${productId}/${fileName}`);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'image:', error);
    return null;
  }
};

/**
 * Récupère toutes les URLs d'images d'un produit (alias pour getImagesForProduct)
 * @param productId - ID du produit
 * @returns Array d'URLs d'images
 */
export const getProductImages = async (productId: number): Promise<string[]> => {
  return getImagesForProduct(productId);
};

/**
 * Récupère la liste des images disponibles pour un produit
 * @param productId - ID du produit
 * @returns Array des noms de fichiers d'images
 */
export const listProductImages = async (productId: number): Promise<string[]> => {
  try {
    const { data: files, error } = await supabase.storage
      .from('product-images')
      .list(`products/product-${productId}`, { limit: 100, offset: 0 });

    if (error) {
      console.error('Erreur lors de la liste des images:', error);
      return [];
    }

    return files.map(file => file.name);
  } catch (error) {
    console.error('Erreur lors de la liste des images:', error);
    return [];
  }
};

/**
 * Récupère l'URL d'une image avec fallback
 * @param productId - ID du produit
 * @param imageIndex - Index de l'image (commence à 0)
 * @param fallbackUrl - URL de fallback si l'image n'existe pas
 * @returns URL de l'image ou URL de fallback
 */
export const getProductImageWithFallback = async (
  productId: number, 
  imageIndex: number = 0, 
  fallbackUrl?: string
): Promise<string> => {
  const imageUrl = await getProductImageUrl(productId, imageIndex);
  
  if (imageUrl) {
    return imageUrl;
  }
  
  // URL de fallback par défaut (image placeholder)
  return fallbackUrl || `https://via.placeholder.com/400x300?text=Image+${imageIndex + 1}`;
};

/**
 * Fonction de test pour vérifier la configuration du bucket
 * @returns Informations sur le bucket et les fichiers
 */
export const testBucketConfiguration = async (): Promise<void> => {
  try {
    console.log('=== Test de configuration du bucket ===');
    
    // Test 1: Lister tous les fichiers
    const { data: allFiles, error: listError } = await supabase.storage
      .from("product-images")
      .list('');

    if (listError) {
      console.error('❌ Erreur lors de la liste des fichiers:', listError);
      return;
    }

    console.log('✅ Fichiers trouvés dans le bucket:', allFiles?.length || 0);
    console.log('📁 Fichiers:', allFiles);

    // Test 2: Vérifier les permissions
    if (allFiles && allFiles.length > 0) {
      const firstFile = allFiles[0];
      console.log('🔍 Test avec le premier fichier:', firstFile.name);

      // Test URL publique
      const { data: publicData } = supabase.storage
        .from("product-images")
        .getPublicUrl(firstFile.name);

      console.log('🌐 URL publique:', publicData.publicUrl);
    }

    console.log('=== Fin du test ===');
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
};