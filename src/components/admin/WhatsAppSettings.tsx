import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Bot, QrCode, RefreshCw, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const WhatsAppSettings = ({ establishmentId }: { establishmentId: string | null }) => {
  const [isActive, setIsActive] = useState(false);
  const [agentName, setAgentName] = useState("Assistente Virtual");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (establishmentId) {
      loadSettings();
    }
  }, [establishmentId]);

  const loadSettings = async () => {
    setFetchingData(true);
    try {
      const { data, error } = await supabase
        .from('establishments')
        .select('whatsapp_ai_enabled, whatsapp_agent_name, whatsapp_ai_prompt, whatsapp_status')
        .eq('id', establishmentId)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setIsActive(data.whatsapp_ai_enabled || false);
        setAgentName(data.whatsapp_agent_name || "Assistente Virtual");
        setAgentPrompt(data.whatsapp_ai_prompt || "");
      }
    } catch (error) {
      console.error("Error loading whatsapp settings:", error);
    } finally {
      setFetchingData(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!establishmentId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('establishments')
        .update({
          whatsapp_ai_enabled: isActive,
          whatsapp_agent_name: agentName,
          whatsapp_ai_prompt: agentPrompt,
        })
        .eq('id', establishmentId);
        
      if (error) throw error;
      
      toast({
        title: "Sucesso!",
        description: "Configurações do WhatsApp salvas com sucesso.",
      });
    } catch (error) {
      console.error("Error saving whatsapp settings:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async () => {
    if (!establishmentId) return;
    setLoading(true);
    try {
      const instanceName = `loja-${establishmentId}`;
      
      // Attempt to create the instance
      const response = await fetch(`http://142.93.251.83:8080/instance/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": "moonky_admin_123"
        },
        body: JSON.stringify({
          instanceName: instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS"
        })
      });
      
      const data = await response.json();
      
      if (data && data.qrcode && data.qrcode.base64) {
        setQrCode(data.qrcode.base64);
        
        // Save the instanceName in the database
        await supabase
          .from('establishments')
          .update({ whatsapp_instance_name: instanceName })
          .eq('id', establishmentId);
          
      } else {
        // If it already exists or didn't return QR on creation, let's try to fetch the connection QR
        const connectResponse = await fetch(`http://142.93.251.83:8080/instance/connect/${instanceName}`, {
           method: "GET",
           headers: { "apikey": "moonky_admin_123" }
        });
        const connectData = await connectResponse.json();
        if (connectData && connectData.base64) {
           setQrCode(connectData.base64);
        } else {
           throw new Error("Não foi possível gerar o QR Code");
        }
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível conectar ao servidor do WhatsApp. Verifique se ele está rodando.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Agente de WhatsApp</h2>
          <p className="text-muted-foreground">
            Conecte o número da sua loja e deixe a Inteligência Artificial atender seus clientes 24h.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-500" />
              Conexão do WhatsApp
            </CardTitle>
            <CardDescription>
              Escaneie o QR Code abaixo com o WhatsApp do seu estabelecimento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex flex-col items-center justify-center min-h-[250px]">
            {qrCode ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-white rounded-xl border">
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
                </div>
                <p className="text-sm text-green-600 font-medium">Pronto para conectar!</p>
                <Button variant="outline" size="sm" onClick={() => setQrCode(null)}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Gerar Novo QR Code
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="w-32 h-32 bg-muted rounded-full flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-muted-foreground" />
                </div>
                <Button onClick={handleConnect} disabled={loading}>
                  {loading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <QrCode className="w-4 h-4 mr-2" />
                  )}
                  {loading ? "Gerando QR Code..." : "Conectar WhatsApp"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Você precisa estar com o celular logado na conta da loja.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Configuração da Inteligência
            </CardTitle>
            <CardDescription>
              Ajuste como a IA deve responder aos seus clientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="space-y-0.5">
                <Label className="text-base">Ativar Atendimento Automático</Label>
                <p className="text-sm text-muted-foreground">
                  A IA vai responder todas as mensagens recebidas.
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="space-y-2">
              <Label>Nome do Atendente (Robô)</Label>
              <Input 
                placeholder="Ex: Júlia (Assistente Virtual)" 
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Instruções Personalizadas (Prompt)</Label>
              <Textarea 
                placeholder="Ex: Você é um atendente simpático de uma pizzaria. Responda sempre de forma curta. Ofereça promoções de terça-feira."
                className="h-32 resize-none"
                value={agentPrompt}
                onChange={(e) => setAgentPrompt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Dê instruções claras de como a IA deve agir e falar. O cardápio será lido automaticamente.
              </p>
            </div>

            <Button className="w-full" onClick={handleSaveSettings} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
