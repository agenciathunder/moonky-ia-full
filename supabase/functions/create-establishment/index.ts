import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to create isolated email for multi-tenancy
function createIsolatedEmail(originalEmail: string, slug: string): string {
  const [localPart, domain] = originalEmail.split('@');
  return `${localPart}__${slug}@${domain}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create clients
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    });

    // Verify the requesting user is a master admin
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Apenas administradores master podem criar estabelecimentos" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const body = await req.json();
    const { 
      name, 
      slug, 
      description, 
      logo_url, 
      email, 
      password, 
      cnpj_cpf, 
      plan_id, 
      status, 
      due_date 
    } = body;

    // Sanitize slug: remove leading/trailing slashes and spaces, lowercase
    const cleanSlug = slug ? slug.replace(/^\/+|\/+$/g, '').trim().toLowerCase() : '';

    if (!name || !email || !password || !cleanSlug) {
      return new Response(
        JSON.stringify({ error: "Nome, slug, email e senha são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create isolated email for multi-tenancy
    const isolatedEmail = createIsolatedEmail(email, cleanSlug);
    console.log(`[create-establishment] Creating admin with isolated email: ${isolatedEmail}`);

    // 1. Create auth user for the establishment with isolated email
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: isolatedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: name }
    });

    if (signUpError) {
      // Check for duplicate email error
      if (signUpError.message.includes("already been registered") || signUpError.message.includes("email_exists")) {
        return new Response(
          JSON.stringify({ error: "Este email já está cadastrado neste estabelecimento. Use outro email." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário: ${signUpError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = authData.user.id;

    // 2. Create establishment
    const { data: establishment, error: estError } = await supabaseAdmin
      .from("establishments")
      .insert({
        name,
        slug: cleanSlug,
        description: description || null,
        logo_url: logo_url || null,
        email, // Store original email for display
        cnpj_cpf: cnpj_cpf || null,
        plan_id: plan_id || null,
        status: status || "active",
        due_date: due_date || null,
        is_active: true,
        owner_id: newUserId
      })
      .select()
      .single();

    if (estError) {
      // Rollback: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: `Erro ao criar estabelecimento: ${estError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Update profile with establishment_id and original_email
    await supabaseAdmin
      .from("profiles")
      .update({
        establishment_id: establishment.id,
        email: isolatedEmail,
        original_email: email,
        full_name: name
      })
      .eq("id", newUserId);

    // 4. Create establishment member (link user to establishment as admin)
    const { error: memberError } = await supabaseAdmin
      .from("establishment_members")
      .insert({
        establishment_id: establishment.id,
        user_id: newUserId,
        role: "admin"
      });

    if (memberError) {
      // Rollback
      await supabaseAdmin.from("establishments").delete().eq("id", establishment.id);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: `Erro ao vincular usuário: ${memberError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Create default establishment settings
    const { error: settingsError } = await supabaseAdmin
      .from("establishment_settings")
      .insert({
        establishment_id: establishment.id,
        primary_color: "#3834ED",
        delivery_fee: 5.00,
        free_delivery_threshold: 100.00
      });

    if (settingsError) {
      console.error("Error creating settings:", settingsError);
      // Non-critical, continue
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        establishment,
        message: "Estabelecimento criado com sucesso!" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
