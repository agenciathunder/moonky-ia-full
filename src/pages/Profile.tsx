import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { buildStorePath } from "@/utils/subdomain";
import { useStoreSlug } from "@/hooks/useStoreSlug";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ChevronLeft, User, Mail, Phone, MapPin, LogOut, Save, Loader2, Lock, Home, Camera
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/BottomNavigation";
import { useEstablishment } from "@/contexts/EstablishmentContext";
import { DynamicThemeStyles } from "@/components/DynamicThemeStyles";
import { compressImageWithSizeLimit } from "@/utils/imageCompressor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Profile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const slug = useStoreSlug();
  const { user, signOut } = useAuth();
  const { establishment, settings, loading: establishmentLoading } = useEstablishment();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    avatar_url: null,
    cep: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Only use establishment colors - no fallback to Moonky defaults
  const primaryColor = settings?.primary_color;
  const basePath = buildStorePath(slug, '');
  const authPath = buildStorePath(slug, '/auth');

  // Redirect if no slug (profile must be accessed within store context)
  useEffect(() => {
    if (!slug) {
      navigate('/lojas');
    }
  }, [slug, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, phone, address, avatar_url, cep, street, number, neighborhood, city, state')
        .eq('id', user?.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProfile({
          full_name: data.full_name || "",
          email: data.email || user?.email || "",
          phone: data.phone || "",
          address: data.address || "",
          avatar_url: data.avatar_url || null,
          cep: data.cep || "",
          street: data.street || "",
          number: data.number || "",
          neighborhood: data.neighborhood || "",
          city: data.city || "",
          state: data.state || ""
        });
      } else {
        setProfile(prev => ({ ...prev, email: user?.email || "" }));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Use imagens JPG, PNG, WEBP ou GIF.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 10MB.",
        variant: "destructive"
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      // Compress image before upload (max 500KB, 800x800)
      const compressedBlob = await compressImageWithSizeLimit(file, 500, 800, 800);
      
      // Delete old avatar if exists
      if (profile.avatar_url) {
        try {
          const oldPath = profile.avatar_url.split('/store-assets/')[1];
          if (oldPath) {
            await supabase.storage.from('store-assets').remove([oldPath]);
          }
        } catch (deleteError) {
          console.log('Could not delete old avatar:', deleteError);
        }
      }

      // Path format: avatars/{userId}/{timestamp}.jpg (matches RLS policy)
      const fileName = `avatars/${user.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('store-assets')
        .upload(fileName, compressedBlob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('store-assets')
        .getPublicUrl(fileName);

      const newAvatarUrl = publicUrlData.publicUrl;

      // Save to profile immediately
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }

      setProfile(prev => ({ ...prev, avatar_url: newAvatarUrl }));

      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi salva."
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Erro ao enviar foto",
        description: error.message || "Não foi possível enviar a imagem. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setUploadingAvatar(false);
      // Reset input to allow same file selection
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCepChange = async (cep: string) => {
    // Remove non-numeric characters
    const cleanCep = cep.replace(/\D/g, '');
    setProfile(prev => ({ ...prev, cep: cleanCep }));

    // Auto-fetch address when CEP has 8 digits
    if (cleanCep.length === 8) {
      setFetchingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();

        if (data.erro) {
          toast({
            title: "CEP não encontrado",
            description: "Verifique o CEP digitado.",
            variant: "destructive"
          });
          return;
        }

        setProfile(prev => ({
          ...prev,
          street: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || ""
        }));

        toast({
          title: "Endereço encontrado!",
          description: "Os campos foram preenchidos automaticamente."
        });
      } catch (error) {
        console.error('Error fetching CEP:', error);
        toast({
          title: "Erro",
          description: "Não foi possível buscar o endereço.",
          variant: "destructive"
        });
      } finally {
        setFetchingCep(false);
      }
    }
  };

  const formatCep = (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length > 5) {
      return `${cleanCep.slice(0, 5)}-${cleanCep.slice(5, 8)}`;
    }
    return cleanCep;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build full address string for backward compatibility
      const fullAddress = [
        profile.street,
        profile.number ? `nº ${profile.number}` : '',
        profile.neighborhood,
        profile.city,
        profile.state
      ].filter(Boolean).join(', ');

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          address: fullAddress || profile.address,
          avatar_url: profile.avatar_url,
          cep: profile.cep,
          street: profile.street,
          number: profile.number,
          neighborhood: profile.neighborhood,
          city: profile.city,
          state: profile.state,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso."
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "A nova senha e a confirmação devem ser iguais.",
        variant: "destructive"
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso."
      });
      setShowPasswordDialog(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar a senha.",
        variant: "destructive"
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate(basePath);
  };

  // Wait for establishment to load first
  if (establishmentLoading || !primaryColor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 pb-24">
        <DynamicThemeStyles />
        <User className="h-16 w-16 mb-4" style={{ color: primaryColor }} />
        <h2 className="text-xl font-semibold mb-2">Faça login</h2>
        <p className="text-muted-foreground text-center mb-6">
          Entre para acessar seu perfil
        </p>
        <Button 
          onClick={() => navigate(authPath)} 
          className="h-12 px-8 text-white"
          style={{ backgroundColor: primaryColor }}
        >
          Entrar
        </Button>
        <BottomNavigation />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-24">
        <DynamicThemeStyles />
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-2 border-t-transparent mx-auto mb-4"
            style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}
          ></div>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(basePath);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <DynamicThemeStyles />
      <div 
        className="sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b"
        style={{ 
          backgroundColor: `${primaryColor}10`,
          borderColor: `${primaryColor}20`
        }}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={handleBack} className="p-2 -ml-2 touch-manipulation">
            <ChevronLeft className="h-6 w-6" style={{ color: primaryColor }} />
          </button>
          <h1 className="text-lg font-semibold" style={{ color: primaryColor }}>Meu Perfil</h1>
          <button onClick={() => navigate(basePath)} className="p-2 -mr-2 touch-manipulation">
            <Home className="h-5 w-5" style={{ color: primaryColor }} />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Avatar with Upload */}
        <div className="flex flex-col items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="relative group"
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="text-3xl font-bold text-white">
                  {profile.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div 
              className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </div>
          </button>
          <p className="text-xs text-muted-foreground mt-2">Toque para alterar a foto</p>
          <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm">Nome completo</Label>
            <div className="relative mt-1.5">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={profile.full_name || ""}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="Seu nome"
                className="pl-10 h-12"
                style={{ 
                  borderColor: 'hsl(var(--border))',
                }}
                onFocus={(e) => e.target.style.borderColor = primaryColor}
                onBlur={(e) => e.target.style.borderColor = 'hsl(var(--border))'}
              />
            </div>
          </div>

          <div>
            <Label className="text-sm">E-mail</Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={profile.email || ""}
                disabled
                className="pl-10 h-12 bg-muted"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm">Telefone</Label>
            <div className="relative mt-1.5">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={profile.phone || ""}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="(00) 00000-0000"
                className="pl-10 h-12"
                style={{ 
                  borderColor: 'hsl(var(--border))',
                }}
                onFocus={(e) => e.target.style.borderColor = primaryColor}
                onBlur={(e) => e.target.style.borderColor = 'hsl(var(--border))'}
              />
            </div>
          </div>

          {/* Address Section */}
          <div className="pt-2">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" style={{ color: primaryColor }} />
              Endereço de entrega
            </h3>
            
            <div className="space-y-3">
              {/* CEP */}
              <div>
                <Label className="text-sm">CEP</Label>
                <div className="relative mt-1.5">
                  <Input
                    value={formatCep(profile.cep || "")}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                    className="h-12"
                    style={{ 
                      borderColor: 'hsl(var(--border))',
                    }}
                    onFocus={(e) => e.target.style.borderColor = primaryColor}
                    onBlur={(e) => e.target.style.borderColor = 'hsl(var(--border))'}
                  />
                  {fetchingCep && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Street */}
              <div>
                <Label className="text-sm">Endereço</Label>
                <Input
                  value={profile.street || ""}
                  onChange={(e) => setProfile({ ...profile, street: e.target.value })}
                  placeholder="Rua, Avenida..."
                  className="mt-1.5 h-12"
                  style={{ 
                    borderColor: 'hsl(var(--border))',
                  }}
                  onFocus={(e) => e.target.style.borderColor = primaryColor}
                  onBlur={(e) => e.target.style.borderColor = 'hsl(var(--border))'}
                />
              </div>

              {/* Number and Neighborhood */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Número</Label>
                  <Input
                    value={profile.number || ""}
                    onChange={(e) => setProfile({ ...profile, number: e.target.value })}
                    placeholder="Nº"
                    className="mt-1.5 h-12"
                    style={{ 
                      borderColor: 'hsl(var(--border))',
                    }}
                    onFocus={(e) => e.target.style.borderColor = primaryColor}
                    onBlur={(e) => e.target.style.borderColor = 'hsl(var(--border))'}
                  />
                </div>
                <div>
                  <Label className="text-sm">Bairro</Label>
                  <Input
                    value={profile.neighborhood || ""}
                    onChange={(e) => setProfile({ ...profile, neighborhood: e.target.value })}
                    placeholder="Bairro"
                    className="mt-1.5 h-12"
                    style={{ 
                      borderColor: 'hsl(var(--border))',
                    }}
                    onFocus={(e) => e.target.style.borderColor = primaryColor}
                    onBlur={(e) => e.target.style.borderColor = 'hsl(var(--border))'}
                  />
                </div>
              </div>

              {/* City and State */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label className="text-sm">Cidade</Label>
                  <Input
                    value={profile.city || ""}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    placeholder="Cidade"
                    className="mt-1.5 h-12"
                    style={{ 
                      borderColor: 'hsl(var(--border))',
                    }}
                    onFocus={(e) => e.target.style.borderColor = primaryColor}
                    onBlur={(e) => e.target.style.borderColor = 'hsl(var(--border))'}
                  />
                </div>
                <div>
                  <Label className="text-sm">Estado</Label>
                  <Input
                    value={profile.state || ""}
                    onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                    placeholder="UF"
                    maxLength={2}
                    className="mt-1.5 h-12"
                    style={{ 
                      borderColor: 'hsl(var(--border))',
                    }}
                    onFocus={(e) => e.target.style.borderColor = primaryColor}
                    onBlur={(e) => e.target.style.borderColor = 'hsl(var(--border))'}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3 pt-4">
          <Button 
            onClick={handleSave} 
            className="w-full h-12"
            disabled={saving}
            style={{ backgroundColor: primaryColor }}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar alterações
              </>
            )}
          </Button>

          <Button 
            variant="outline" 
            onClick={() => setShowPasswordDialog(true)}
            className="w-full h-12"
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            <Lock className="h-4 w-4 mr-2" />
            Alterar senha
          </Button>

          <Button 
            variant="outline" 
            onClick={handleSignOut}
            className="w-full h-12 text-destructive hover:text-destructive border-destructive/50 hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair da conta
          </Button>
        </div>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Digite sua nova senha abaixo. A senha deve ter pelo menos 6 caracteres.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirmar senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleChangePassword} 
              disabled={changingPassword}
              style={{ backgroundColor: primaryColor }}
            >
              {changingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Alterando...
                </>
              ) : (
                "Alterar senha"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
};

export default Profile;
