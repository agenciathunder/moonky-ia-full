import { useState, useEffect } from "react";
import { ShoppingCart, User, Moon, Sun, Settings, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { buildStorePath } from "@/utils/subdomain";
import { useStoreSlug } from "@/hooks/useStoreSlug";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useTheme } from "@/components/ThemeProvider";
import { useEstablishment } from "@/contexts/EstablishmentContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
  onSearchChange?: (value: string) => void;
  cartCount: number;
  onLogoClick?: () => void;
}

const Header = ({ cartCount, onLogoClick }: HeaderProps) => {
  const slug = useStoreSlug();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { theme, setTheme } = useTheme();
  const { establishment, settings, loading } = useEstablishment();
  const [displayEmail, setDisplayEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isCurrentEstablishmentMember, setIsCurrentEstablishmentMember] = useState(false);
  
  // Fetch original_email and avatar_url from profile
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.id) {
        setDisplayEmail(null);
        setAvatarUrl(null);
        return;
      }
      
      const { data } = await supabase
        .from('profiles')
        .select('original_email, email, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      
      // Prefer original_email, fallback to email, then user.email
      setDisplayEmail(data?.original_email || data?.email || user.email || null);
      setAvatarUrl(data?.avatar_url || null);
    };
    
    fetchProfileData();

    // Listen for profile changes to update avatar in real-time
    const channel = supabase
      .channel('header-profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user?.id}`,
        },
        (payload) => {
          const newData = payload.new as { avatar_url?: string; original_email?: string; email?: string };
          setAvatarUrl(newData.avatar_url || null);
          setDisplayEmail(newData.original_email || newData.email || user?.email || null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.email]);

  // Check if user is a member of the CURRENT establishment (from URL)
  useEffect(() => {
    const checkCurrentEstablishmentMembership = async () => {
      if (!user?.id || !establishment?.id) {
        setIsCurrentEstablishmentMember(false);
        return;
      }

      const { data, error } = await supabase
        .from('establishment_members')
        .select('id, role')
        .eq('user_id', user.id)
        .eq('establishment_id', establishment.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking establishment membership:', error);
        setIsCurrentEstablishmentMember(false);
      } else {
        setIsCurrentEstablishmentMember(!!data);
      }
    };

    checkCurrentEstablishmentMembership();
  }, [user?.id, establishment?.id]);
  
  // Show admin panel if user is master admin OR member of THIS establishment
  const showAdminPanel = isAdmin || isCurrentEstablishmentMember;

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const showAgeRestriction = settings?.show_age_restriction ?? false;
  
  // Build store-specific paths
  const storeSlug = slug || establishment?.slug;
  const basePath = buildStorePath(storeSlug, '');
  const authPath = buildStorePath(storeSlug, '/auth');
  const ordersPath = buildStorePath(storeSlug, '/orders');
  const cartPath = buildStorePath(storeSlug, '/cart');
  const profilePath = storeSlug ? buildStorePath(storeSlug, '/profile') : '/auth';
  const ticketsPath = buildStorePath(storeSlug, '/tickets');

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 shadow-elegant bg-background/95 backdrop-blur-md">
      <div className="container mx-auto px-3 py-3 max-w-7xl">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <Link to={basePath || "/"} className="flex items-center gap-2 group" onClick={onLogoClick}>
            {loading ? (
              <Skeleton className="h-10 w-24 sm:h-12 sm:w-28 rounded-lg" />
            ) : establishment?.logo_url ? (
              <img 
                src={establishment.logo_url} 
                alt={establishment.name}
                className="h-10 w-auto sm:h-12 object-contain group-hover:scale-105 transition-all duration-200"
              />
            ) : establishment?.name ? (
              <span className="text-lg sm:text-xl font-bold text-primary truncate max-w-[150px]">
                {establishment.name}
              </span>
            ) : (
              <Skeleton className="h-10 w-24 sm:h-12 sm:w-28 rounded-lg" />
            )}
            {showAgeRestriction && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-amber-500/50 text-amber-600 dark:text-amber-400 hidden sm:flex">
                +18
              </Badge>
            )}
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full p-0"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-500" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700" />
              )}
            </Button>

            {/* Cart */}
            <Link to={cartPath} className="hidden md:block">
              <Button variant="outline" size="sm" className="relative hover:shadow-glow hover:border-primary/50 p-2 h-8 sm:h-9">
                <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-gradient-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full p-0">
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border-2 border-primary/20">
                      <AvatarImage src={avatarUrl || undefined} alt="Avatar" className="object-cover" />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="p-3 border-b border-border">
                    <p className="font-medium text-sm truncate">{displayEmail || user.email}</p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link to={profilePath} className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Meu Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={ordersPath} className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Meus Pedidos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={ticketsPath} className="flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      Meus Ingressos
                    </Link>
                  </DropdownMenuItem>
                  {showAdminPanel && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2 text-primary">
                          <Settings className="h-4 w-4" />
                          Painel Admin
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0" asChild>
                <Link to={authPath}>
                  <Avatar className="h-7 w-7 border-2 border-border">
                    <AvatarFallback className="bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
