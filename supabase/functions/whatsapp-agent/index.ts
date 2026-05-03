import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { OpenAI } from "https://esm.sh/openai@4.24.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Evolution API Webhook Payload
    const payload = await req.json();
    
    // Check if it's a message upsert event
    if (payload.event !== "messages.upsert") {
      return new Response(JSON.stringify({ message: "Ignored event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const messageData = payload.data?.message;
    if (!messageData || messageData.fromMe) {
      // Ignore messages sent by the bot itself
      return new Response(JSON.stringify({ message: "Ignored self message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const instanceName = payload.instance; // Should match whatsapp_instance_name in DB
    const senderNumber = messageData.remoteJid; // The customer's number
    const textMessage = messageData.conversation || messageData.extendedTextMessage?.text;

    if (!textMessage) {
      return new Response(JSON.stringify({ message: "No text content" }), { status: 200 });
    }

    // 1. Fetch Establishment Settings
    const { data: establishment, error: estError } = await supabase
      .from("establishments")
      .select("id, whatsapp_ai_enabled, whatsapp_ai_prompt, whatsapp_agent_name, name")
      .eq("whatsapp_instance_name", instanceName)
      .single();

    if (estError || !establishment) {
      console.error("Establishment not found for instance:", instanceName);
      return new Response(JSON.stringify({ error: "Establishment not found" }), { status: 404 });
    }

    if (!establishment.whatsapp_ai_enabled) {
      return new Response(JSON.stringify({ message: "AI disabled for this establishment" }), { status: 200 });
    }

    // 2. Fetch the Store Menu (Products) to feed to the AI
    const { data: products } = await supabase
      .from("products")
      .select("name, description, price, is_available")
      .eq("establishment_id", establishment.id)
      .eq("is_available", true)
      .limit(50); // Get top 50 products

    const menuContext = products 
      ? products.map(p => `- ${p.name}: R$ ${p.price} (${p.description || 'sem desc.'})`).join("\n")
      : "Cardápio não disponível.";

    // 3. Call OpenAI/Gemini
    const openai = new OpenAI({
      apiKey: Deno.env.get("OPENAI_API_KEY"),
    });

    const systemPrompt = `Você é ${establishment.whatsapp_agent_name}, o assistente virtual da loja ${establishment.name}.
Você deve atender os clientes de forma educada e rápida no WhatsApp.
Instruções personalizadas do dono da loja: ${establishment.whatsapp_ai_prompt || "Nenhuma"}

Aqui está o cardápio atual da loja:
${menuContext}

Regras:
1. Responda de forma curta e objetiva (é WhatsApp).
2. Se o cliente quiser pedir, ajude-o a montar o pedido.
3. Não invente produtos ou preços que não estão no cardápio.
`;

    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: textMessage }
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 300,
    });

    const replyText = chatCompletion.choices[0].message.content;

    // 4. Send the reply back via Evolution API
    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");

    if (evolutionApiUrl && evolutionApiKey && replyText) {
      await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": evolutionApiKey
        },
        body: JSON.stringify({
          number: senderNumber,
          text: replyText
        })
      });
    }

    return new Response(JSON.stringify({ success: true, reply: replyText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
