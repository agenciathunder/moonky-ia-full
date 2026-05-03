import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Store, ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformLogo } from "@/components/PlatformLogo";

interface Establishment {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
}

const StoreLanding = () => {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEstablishments = async () => {
      try {
        const { data, error } = await supabase
          .from("establishments")
          .select("id, name, slug, description, logo_url")
          .eq("is_active", true)
          .eq("status", "active")
          .order("name");

        if (error) throw error;
        setEstablishments(data || []);
      } catch (error) {
        console.error("Error fetching establishments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEstablishments();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-border"></div>
            <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin"></div>
          </div>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16">
          <Link to="/" className="shrink-0">
            <PlatformLogo className="h-7 sm:h-8" />
          </Link>
          <Link to="/auth">
            <Button size="sm" variant="outline" className="gap-2">
              <LogIn className="w-4 h-4" />
              Entrar
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          {establishments.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
                <Store className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Nenhum estabelecimento disponível</h2>
              <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
                Entre em contato para cadastrar seu estabelecimento na plataforma.
              </p>
              <Link to="/auth">
                <Button>Acessar painel</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                  Estabelecimentos
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha um estabelecimento para acessar
                </p>
              </div>

              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {establishments.map((establishment) => (
                  <Link
                    key={establishment.id}
                    to={`/loja/${establishment.slug}`}
                    className="group"
                  >
                    <div className="relative flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-accent/30 transition-all duration-200">
                      {/* Logo */}
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                        {establishment.logo_url ? (
                          <img
                            src={establishment.logo_url}
                            alt={establishment.name}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <Store className="h-7 w-7 text-muted-foreground/50" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">
                          {establishment.name}
                        </h3>
                        {establishment.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 mt-0.5">
                            {establishment.description}
                          </p>
                        )}
                      </div>

                      {/* Arrow */}
                      <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} Moonky. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default StoreLanding;
