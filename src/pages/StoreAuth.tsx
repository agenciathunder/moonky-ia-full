import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { buildStorePath } from "@/utils/subdomain";
import { useStoreSlug } from "@/hooks/useStoreSlug";
import { ArrowLeft, Loader2, Mail, Lock, User, Phone, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface EstablishmentData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface EstablishmentSettings {
  primary_color: string | null;
}

const StoreAuth = () => {
  const slug = useStoreSlug();
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpStep, setSignUpStep] = useState(1);
  const [establishment, setEstablishment] = useState<EstablishmentData | null>(null);
  const [settings, setSettings] = useState<EstablishmentSettings | null>(null);
  const [loadingEst, setLoadingEst] = useState(true);
  const { signIn, signUp: authSignUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get the return URL from sessionStorage or default to store home
  const getReturnUrl = () => {
    const savedUrl = sessionStorage.getItem('auth_return_url');
    if (savedUrl && slug && savedUrl.includes(buildStorePath(slug, ''))) {
      sessionStorage.removeItem('auth_return_url');
      return savedUrl;
    }
    return buildStorePath(slug, '');
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      const returnUrl = getReturnUrl();
      navigate(returnUrl, { replace: true });
    }
  }, [user, loading, navigate, slug]);

  useEffect(() => {
    const fetchEstablishment = async () => {
      if (!slug) return;
      
      try {
        const { data: estData, error: estError } = await supabase
          .from("establishments")
          .select("id, name, slug, logo_url")
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();

        if (estError) throw estError;
        setEstablishment(estData);

        if (estData) {
          const { data: settingsData } = await supabase
            .from("establishment_settings")
            .select("primary_color")
            .eq("establishment_id", estData.id)
            .maybeSingle();

          setSettings(settingsData);
        }
      } catch (error) {
        console.error("Error fetching establishment:", error);
      } finally {
        setLoadingEst(false);
      }
    };

    fetchEstablishment();
  }, [slug]);

  const primaryColor = settings?.primary_color || "#3834ED";

  // Transform email to be unique per establishment
  const getIsolatedEmail = (userEmail: string) => {
    if (!establishment?.slug) return userEmail;
    const [localPart, domain] = userEmail.split('@');
    return `${localPart}__${establishment.slug}@${domain}`;
  };

  const normalizeEmail = (value: string) => value.trim().toLowerCase();

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const ensureUserBelongsToCurrentEstablishment = async () => {
    if (!establishment?.id) throw new Error("Estabelecimento inválido");

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error("Falha ao autenticar");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("establishment_id")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile?.establishment_id || profile.establishment_id !== establishment.id) {
      await supabase.auth.signOut();
      throw new Error("Este usuário não tem acesso a esta loja");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const originalEmail = normalizeEmail(email);
      const isolatedEmail = getIsolatedEmail(originalEmail);

      const attemptLogin = async (authEmail: string) => {
        const { error } = await signIn(authEmail, password);
        if (error) throw error;
        await ensureUserBelongsToCurrentEstablishment();
      };

      try {
        await attemptLogin(isolatedEmail);
      } catch (err: any) {
        if (err?.message === "Invalid login credentials") {
          await attemptLogin(originalEmail);
        } else {
          throw err;
        }
      }

      toast({ title: "Bem-vindo!" });
      const returnUrl = getReturnUrl();
      navigate(returnUrl, { replace: true });
    } catch (error: any) {
      const errorMessage = error.message === "Invalid login credentials" 
        ? "Email ou senha incorretos" 
        : error.message;
      toast({ title: "Erro", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);

    try {
      const originalEmail = normalizeEmail(email);
      const isolatedEmail = getIsolatedEmail(originalEmail);
      
      const { error } = await authSignUp(isolatedEmail, password, fullName, {
        phone,
        establishment_id: establishment?.id,
        original_email: originalEmail
      });
      
      if (error) throw error;

      toast({ 
        title: "Conta criada!", 
        description: "Você já pode fazer login." 
      });
      
      await signIn(isolatedEmail, password);
      const returnUrl = getReturnUrl();
      navigate(returnUrl, { replace: true });
    } catch (error: any) {
      const errorMessage = error.message.includes("already registered")
        ? "Este email já está cadastrado nesta loja"
        : error.message;
      toast({ title: "Erro", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Validation for each step
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!fullName.trim()) {
          toast({ title: "Nome obrigatório", description: "Por favor, informe seu nome completo", variant: "destructive" });
          return false;
        }
        if (!phone || phone.replace(/\D/g, '').length < 10) {
          toast({ title: "WhatsApp obrigatório", description: "Por favor, informe um número de WhatsApp válido", variant: "destructive" });
          return false;
        }
        return true;
      case 2:
        if (!email.trim() || !email.includes('@')) {
          toast({ title: "Email inválido", description: "Por favor, informe um email válido", variant: "destructive" });
          return false;
        }
        if (email !== confirmEmail) {
          toast({ title: "Emails não conferem", description: "Os emails digitados são diferentes", variant: "destructive" });
          return false;
        }
        return true;
      case 3:
        if (password.length < 6) {
          toast({ title: "Senha muito curta", description: "A senha deve ter no mínimo 6 caracteres", variant: "destructive" });
          return false;
        }
        if (password !== confirmPassword) {
          toast({ title: "Senhas não conferem", description: "As senhas digitadas são diferentes", variant: "destructive" });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (validateStep(signUpStep)) {
      if (signUpStep === 3) {
        handleSignUp();
      } else {
        setSignUpStep(signUpStep + 1);
      }
    }
  };

  const handlePrevStep = () => {
    if (signUpStep > 1) {
      setSignUpStep(signUpStep - 1);
    }
  };

  const resetSignUpForm = () => {
    setFullName("");
    setPhone("");
    setEmail("");
    setConfirmEmail("");
    setPassword("");
    setConfirmPassword("");
    setSignUpStep(1);
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    if (!isSignUp) {
      resetSignUpForm();
    }
  };

  if (loadingEst) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-border" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!establishment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <p className="text-muted-foreground mb-4">Estabelecimento não encontrado</p>
        <Link to="/">
          <Button variant="outline">Voltar ao início</Button>
        </Link>
      </div>
    );
  }

  const stepTitles = ["Dados pessoais", "Email", "Senha"];
  const totalSteps = 3;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header with back link */}
      <header className="p-4 sm:p-6">
        <Link 
          to={buildStorePath(slug, '')} 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para a loja</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-md">
          {/* Logo and branding */}
          <div className="text-center mb-8">
            {establishment.logo_url ? (
              <div className="flex justify-center mb-5">
                <img 
                  src={establishment.logo_url} 
                  alt={establishment.name} 
                  className="max-h-28 max-w-[220px] w-auto h-auto object-contain"
                />
              </div>
            ) : (
              <div 
                className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                {establishment.name.charAt(0)}
              </div>
            )}
            
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              {isSignUp ? "Criar conta" : "Entrar"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isSignUp 
                ? `Cadastre-se para comprar na ${establishment.name}` 
                : `Acesse sua conta na ${establishment.name}`
              }
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 sm:p-8">
            
            {/* Sign Up Multi-Step */}
            {isSignUp ? (
              <div className="space-y-6">
                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  {Array.from({ length: totalSteps }).map((_, index) => (
                    <div key={index} className="flex items-center">
                      <div 
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                          index + 1 < signUpStep 
                            ? "text-white" 
                            : index + 1 === signUpStep 
                              ? "text-white" 
                              : "bg-muted text-muted-foreground"
                        )}
                        style={{ 
                          backgroundColor: index + 1 <= signUpStep ? primaryColor : undefined 
                        }}
                      >
                        {index + 1 < signUpStep ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      {index < totalSteps - 1 && (
                        <div 
                          className={cn(
                            "w-8 h-0.5 mx-1 transition-all",
                            index + 1 < signUpStep ? "" : "bg-muted"
                          )}
                          style={{ 
                            backgroundColor: index + 1 < signUpStep ? primaryColor : undefined 
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-center mb-4">
                  <h2 className="text-lg font-medium">{stepTitles[signUpStep - 1]}</h2>
                  <p className="text-sm text-muted-foreground">Passo {signUpStep} de {totalSteps}</p>
                </div>

                {/* Step 1: Name and WhatsApp */}
                {signUpStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Nome completo *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          type="text" 
                          value={fullName} 
                          onChange={(e) => setFullName(e.target.value)} 
                          placeholder="Seu nome completo"
                          className="pl-10 h-12 bg-muted/30 border-border/50 focus-visible:ring-0 focus-visible:border-2 transition-colors"
                          style={{ 
                            '--focus-color': primaryColor 
                          } as React.CSSProperties}
                          onFocus={(e) => e.target.style.borderColor = primaryColor}
                          onBlur={(e) => e.target.style.borderColor = ''}
                          autoFocus
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        WhatsApp *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          type="tel" 
                          value={phone} 
                          onChange={(e) => setPhone(formatPhone(e.target.value))} 
                          placeholder="(00) 00000-0000"
                          className="pl-10 h-12 bg-muted/30 border-border/50 focus-visible:ring-0 focus-visible:border-2 transition-colors"
                          onFocus={(e) => e.target.style.borderColor = primaryColor}
                          onBlur={(e) => e.target.style.borderColor = ''}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Email */}
                {signUpStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Email *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          placeholder="seu@email.com"
                          className="pl-10 h-12 bg-muted/30 border-border/50 focus-visible:ring-0 focus-visible:border-2 transition-colors"
                          onFocus={(e) => e.target.style.borderColor = primaryColor}
                          onBlur={(e) => e.target.style.borderColor = ''}
                          autoFocus
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Confirme o email *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          type="email" 
                          value={confirmEmail} 
                          onChange={(e) => setConfirmEmail(e.target.value)} 
                          placeholder="Digite novamente seu email"
                          className="pl-10 h-12 bg-muted/30 border-border/50 focus-visible:ring-0 focus-visible:border-2 transition-colors"
                          onFocus={(e) => e.target.style.borderColor = primaryColor}
                          onBlur={(e) => e.target.style.borderColor = ''}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Password */}
                {signUpStep === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Senha *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          type="password" 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          placeholder="Mínimo 6 caracteres"
                          className="pl-10 h-12 bg-muted/30 border-border/50 focus-visible:ring-0 focus-visible:border-2 transition-colors"
                          onFocus={(e) => e.target.style.borderColor = primaryColor}
                          onBlur={(e) => e.target.style.borderColor = ''}
                          autoFocus
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Confirme a senha *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          type="password" 
                          value={confirmPassword} 
                          onChange={(e) => setConfirmPassword(e.target.value)} 
                          placeholder="Digite novamente sua senha"
                          className="pl-10 h-12 bg-muted/30 border-border/50 focus-visible:ring-0 focus-visible:border-2 transition-colors"
                          onFocus={(e) => e.target.style.borderColor = primaryColor}
                          onBlur={(e) => e.target.style.borderColor = ''}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-3 pt-2">
                  {signUpStep > 1 && (
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={handlePrevStep}
                      className="flex-1 h-12"
                      disabled={loading}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Voltar
                    </Button>
                  )}
                  
                  <Button 
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1 h-12 text-white font-medium transition-all duration-200 hover:opacity-90"
                    disabled={loading}
                    style={{ 
                      backgroundColor: primaryColor,
                      boxShadow: `0 4px 14px 0 ${primaryColor}40`
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : signUpStep === 3 ? (
                      "Criar conta"
                    ) : (
                      <>
                        Próximo
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* Login Form */
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="seu@email.com"
                      required 
                      disabled={loading}
                      className="pl-10 h-12 bg-muted/30 border-border/50 focus-visible:ring-0 focus-visible:border-2 transition-colors"
                      onFocus={(e) => e.target.style.borderColor = primaryColor}
                      onBlur={(e) => e.target.style.borderColor = ''}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="••••••••"
                      required 
                      minLength={6}
                      disabled={loading}
                      className="pl-10 h-12 bg-muted/30 border-border/50 focus-visible:ring-0 focus-visible:border-2 transition-colors"
                      onFocus={(e) => e.target.style.borderColor = primaryColor}
                      onBlur={(e) => e.target.style.borderColor = ''}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-white font-medium text-base transition-all duration-200 hover:opacity-90 hover:shadow-lg" 
                  disabled={loading}
                  style={{ 
                    backgroundColor: primaryColor,
                    boxShadow: `0 4px 14px 0 ${primaryColor}40`
                  }}
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
            )}

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-3 text-muted-foreground">ou</span>
              </div>
            </div>

            {/* Toggle between login/signup */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {isSignUp ? "Já tem uma conta?" : "Não tem uma conta?"}
              </p>
              <button
                type="button"
                onClick={toggleMode}
                className="mt-1 text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: primaryColor }}
              >
                {isSignUp ? "Fazer login" : "Criar conta grátis"}
              </button>
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-muted-foreground mt-6 text-center">
            Ao continuar, você concorda com os{" "}
            <span className="underline cursor-pointer">termos de uso</span>
          </p>
        </div>
      </main>
    </div>
  );
};

export default StoreAuth;
