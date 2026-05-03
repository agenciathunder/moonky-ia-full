import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function useFavorites() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (user) {
      loadFavorites();
    } else {
      setFavorites([]);
      setIsInitialized(true);
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("user_id", user.id);

      if (error) throw error;

      setFavorites(data.map(f => f.product_id));
    } catch (error) {
      console.error("Error loading favorites:", error);
    } finally {
      setIsInitialized(true);
    }
  };

  const toggleFavorite = useCallback(async (productId: string) => {
    if (!user) {
      toast({
        title: "Faça login",
        description: "Você precisa estar logado para favoritar produtos.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const isFav = favorites.includes(productId);

      if (isFav) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);

        if (error) throw error;

        setFavorites(prev => prev.filter(id => id !== productId));
        toast({
          title: "Removido dos favoritos",
        });
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, product_id: productId });

        if (error) throw error;

        setFavorites(prev => [...prev, productId]);
        toast({
          title: "Adicionado aos favoritos",
        });
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar favoritos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, favorites, toast]);

  const isFavorite = useCallback((productId: string) => {
    return favorites.includes(productId);
  }, [favorites]);

  return { favorites, toggleFavorite, isFavorite, loading, isInitialized };
}
