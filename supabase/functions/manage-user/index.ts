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
        JSON.stringify({ error: "Apenas administradores master podem gerenciar usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const body = await req.json();
    const { action } = body;

    console.log(`[manage-user] Action: ${action}`, body);

    if (action === "create") {
      const { 
        full_name, 
        email, 
        password, 
        phone,
        establishment_id,
        establishment_role,
        is_master_admin
      } = body;

      if (!email || !password || !full_name) {
        return new Response(
          JSON.stringify({ error: "Nome, email e senha são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Determine the email to use for auth
      let authEmail = email;
      let originalEmail = email;

      // If linked to establishment, get slug and create isolated email
      if (establishment_id && !is_master_admin) {
        const { data: estData, error: estError } = await supabaseAdmin
          .from("establishments")
          .select("slug")
          .eq("id", establishment_id)
          .single();

        if (estError || !estData) {
          return new Response(
            JSON.stringify({ error: "Estabelecimento não encontrado" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create isolated email for multi-tenancy
        authEmail = createIsolatedEmail(email, estData.slug);
        console.log(`[manage-user] Creating user with isolated email: ${authEmail}`);
      }

      // 1. Create auth user with (possibly isolated) email
      const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name, phone }
      });

      if (signUpError) {
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

      // 2. Update profile with all info including original_email
      const profileUpdates: any = {
        full_name,
        email: authEmail,
        original_email: originalEmail
      };
      if (phone) profileUpdates.phone = phone;
      if (establishment_id) profileUpdates.establishment_id = establishment_id;

      await supabaseAdmin
        .from("profiles")
        .update(profileUpdates)
        .eq("id", newUserId);

      // 3. If is_master_admin, add to user_roles
      if (is_master_admin) {
        const { error: roleInsertError } = await supabaseAdmin
          .from("user_roles")
          .insert({
            user_id: newUserId,
            role: "admin"
          });

        if (roleInsertError) {
          console.error("Error adding master admin role:", roleInsertError);
        }
      }

      // 4. Add to establishment_members if it's a store admin or employee
      if (establishment_id && (establishment_role === "admin" || establishment_role === "employee")) {
        const { error: memberError } = await supabaseAdmin
          .from("establishment_members")
          .insert({
            establishment_id,
            user_id: newUserId,
            role: establishment_role
          });

        if (memberError) {
          console.error("Error adding establishment member:", memberError);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          user_id: newUserId,
          message: "Usuário criado com sucesso!" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "update") {
      const { 
        user_id,
        full_name, 
        email,
        phone,
        password,
        establishment_id,
        establishment_role,
        is_master_admin
      } = body;

      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "ID do usuário é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get current user profile
      const { data: currentProfile } = await supabaseAdmin
        .from("profiles")
        .select("email, establishment_id, original_email")
        .eq("id", user_id)
        .single();

      // 1. Update auth user if password provided
      const authUpdates: any = {};
      if (password) authUpdates.password = password;
      if (full_name) authUpdates.user_metadata = { full_name };

      if (Object.keys(authUpdates).length > 0) {
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
          user_id,
          authUpdates
        );

        if (authUpdateError) {
          return new Response(
            JSON.stringify({ error: `Erro ao atualizar usuário: ${authUpdateError.message}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // 2. Update profile
      const profileUpdates: any = {};
      if (full_name) profileUpdates.full_name = full_name;
      if (phone !== undefined) profileUpdates.phone = phone;
      if (email) profileUpdates.original_email = email;

      if (Object.keys(profileUpdates).length > 0) {
        await supabaseAdmin
          .from("profiles")
          .update(profileUpdates)
          .eq("id", user_id);
      }

      // 3. Handle master admin role
      if (is_master_admin !== undefined) {
        // First, check current role
        const { data: currentRole } = await supabaseAdmin
          .from("user_roles")
          .select("id")
          .eq("user_id", user_id)
          .eq("role", "admin")
          .maybeSingle();

        if (is_master_admin && !currentRole) {
          // Add admin role
          await supabaseAdmin
            .from("user_roles")
            .insert({ user_id, role: "admin" });
        } else if (!is_master_admin && currentRole) {
          // Remove admin role
          await supabaseAdmin
            .from("user_roles")
            .delete()
            .eq("user_id", user_id)
            .eq("role", "admin");
        }
      }

      // 4. Handle establishment membership
      if (establishment_id !== undefined) {
        // Remove old memberships if changing establishment
        await supabaseAdmin
          .from("establishment_members")
          .delete()
          .eq("user_id", user_id);

        if (establishment_id) {
          // Update profile with establishment_id
          await supabaseAdmin
            .from("profiles")
            .update({ establishment_id })
            .eq("id", user_id);

          // Add to establishment_members if it's admin or employee
          if (establishment_role === "admin" || establishment_role === "employee") {
            await supabaseAdmin
              .from("establishment_members")
              .insert({
                establishment_id,
                user_id,
                role: establishment_role
              });
          }
        } else {
          // Clear establishment from profile
          await supabaseAdmin
            .from("profiles")
            .update({ establishment_id: null })
            .eq("id", user_id);
        }
      } else if (establishment_role === "admin" || establishment_role === "employee") {
        // Check if user has an establishment and update their membership
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("establishment_id")
          .eq("id", user_id)
          .single();

        if (profile?.establishment_id) {
          // Remove old memberships
          await supabaseAdmin
            .from("establishment_members")
            .delete()
            .eq("user_id", user_id);

          // Add with appropriate role
          await supabaseAdmin
            .from("establishment_members")
            .insert({
              establishment_id: profile.establishment_id,
              user_id,
              role: establishment_role
            });
        }
      } else if (establishment_role === "user") {
        // Remove from establishment_members if downgrading to regular user
        await supabaseAdmin
          .from("establishment_members")
          .delete()
          .eq("user_id", user_id);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Usuário atualizado com sucesso!" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "delete") {
      const { user_id } = body;

      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "ID do usuário é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete auth user (cascade will handle other records)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: `Erro ao excluir usuário: ${deleteError.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Usuário excluído com sucesso!" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: "Ação inválida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
