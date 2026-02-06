import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store';
import { showGlobalSnackbar } from '@/contexts/SnackbarContext';

export function useFavorites() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  const favoritesQuery = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          vehicle_id,
          created_at,
          vehicles (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((fav: any) => ({
        ...fav,
        vehicle: fav.vehicles,
      }));
    },
    enabled: !!user,
  });

  const favoriteIdsQuery = useQuery({
    queryKey: ['favoriteIds', user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();

      const { data, error } = await supabase
        .from('favorites')
        .select('vehicle_id')
        .eq('user_id', user.id);

      if (error) throw error;

      return new Set(data.map((f) => f.vehicle_id));
    },
    enabled: !!user,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (vehicleId: string) => {
      if (!user) throw new Error('Must be logged in');

      const isFavorite = favoriteIdsQuery.data?.has(vehicleId);

      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('vehicle_id', vehicleId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, vehicle_id: vehicleId });

        if (error) throw error;
      }

      return !isFavorite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['favoriteIds'] });
    },
  });

  // Wrapper function that checks authentication before toggling
  const handleToggleFavorite = (vehicleId: string) => {
    if (!user) {
      showGlobalSnackbar({
        message: 'Connectez-vous pour ajouter des favoris',
        type: 'warning',
        icon: 'heart',
        duration: 5000,
        action: {
          label: 'Connexion',
          onPress: () => router.push('/(auth)/login'),
        },
      });
      return;
    }
    toggleFavoriteMutation.mutate(vehicleId);
  };

  return {
    favorites: favoritesQuery.data || [],
    favoriteIds: favoriteIdsQuery.data || new Set<string>(),
    isLoading: favoritesQuery.isLoading,
    isFavorite: (vehicleId: string) => favoriteIdsQuery.data?.has(vehicleId) || false,
    toggleFavorite: handleToggleFavorite,
    isToggling: toggleFavoriteMutation.isPending,
  };
}
