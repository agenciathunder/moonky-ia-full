import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVOLUTION_API_URL = "http://142.93.251.83:8080";
const EVOLUTION_API_KEY = "moonky_admin_123";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, instanceName } = await req.json();

    if (action === "create") {
      const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        }),
      });

      const data = await response.json();

      if (data?.qrcode?.base64) {
        return new Response(JSON.stringify({ qrcode: data.qrcode.base64 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Instance already exists, fetch QR
      const connectResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
        method: "GET",
        headers: { "apikey": EVOLUTION_API_KEY },
      });

      const connectData = await connectResponse.json();
      const qr = connectData?.base64 || connectData?.qrcode?.base64;

      if (qr) {
        return new Response(JSON.stringify({ qrcode: qr }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error("Não foi possível gerar o QR Code");
    }

    throw new Error("Ação inválida");
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
