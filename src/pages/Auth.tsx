import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import moonkyLogo from "@/assets/moonky-logo.png";

// Same isolation strategy used on backend when creating establishment admins
const createIsolatedEmail = (originalEmail: string, slug: string): string => {
  const [localPart, domain] = originalEmail.split("@");
  if (!localPart || !domain) return originalEmail;
  return `${localPart}__${slug}@${domain}`;
};

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, try direct login (for master admins or already isolated emails)
      let { error } = await signIn(email, password);
      
      // If direct login fails, try to resolve establishment slug from public establishment data
      // and retry with the isolated email format.
      if (error && error.message === "Invalid login credentials") {
        const { data: establishment, error: estError } = await supabase
          .from("establishments")
          .select("slug, created_at")
          .eq("email", email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (estError || !establishment?.slug) {
          throw error;
        }

        const isolatedEmail = createIsolatedEmail(email, establishment.slug);
        const result = await signIn(isolatedEmail, password);
        if (result.error) throw result.error;
      } else if (error) {
        throw error;
      }

      // After successful login, check user type and redirect accordingly
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Erro ao obter dados do usuário");
      }

      // Check if user is master admin (has 'admin' role in user_roles)
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (adminRole) {
        toast({ title: "Bem-vindo, Admin Master!" });
        navigate("/admin-master");
        return;
      }

      // Check if user is establishment member (admin or employee)
      const { data: membership } = await supabase
        .from('establishment_members')
        .select(`
          establishment_id,
          role,
          establishment:establishments(slug, is_active)
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (membership?.establishment) {
        const establishment = Array.isArray(membership.establishment) 
          ? membership.establishment[0] 
          : membership.establishment;
        
        // Check if establishment is active
        if (!establishment.is_active) {
          await supabase.auth.signOut();
          toast({ 
            title: "Conta suspensa", 
            description: "Seu estabelecimento está suspenso. Entre em contato com o suporte.",
            variant: "destructive" 
          });
          return;
        }
        
        const roleLabel = membership.role === 'admin' ? 'Administrador' : 
                         membership.role === 'employee' ? 'Funcionário' : 'Membro';
        toast({ title: `Bem-vindo, ${roleLabel}!` });
        navigate(`/admin`);
        return;
      }

      // User not associated with any establishment
      await supabase.auth.signOut();
      toast({ 
        title: "Acesso negado", 
        description: "Sua conta não está vinculada a nenhum estabelecimento.",
        variant: "destructive" 
      });
    } catch (error: any) {
      const errorMessage = error.message === "Invalid login credentials" 
        ? "Email ou senha incorretos" 
        : error.message;
      toast({ title: "Erro", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          <img src={moonkyLogo} alt="Moonky" className="h-12 mx-auto mb-4" />
          <CardTitle className="text-xl">Área Administrativa</CardTitle>
          <CardDescription>
            Acesso exclusivo para administradores de estabelecimentos
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="seu@email.com"
                required 
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                required 
                minLength={6}
                disabled={loading}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary-dark" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
          
          <div className="mt-6 pt-4 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Acesso exclusivo para estabelecimentos cadastrados.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
