import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Verify the requesting user is authenticated
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const body = await req.json();
    const { 
      customer_id,
      full_name, 
      phone,
      password,
      establishment_id,
      role
    } = body;

    if (!customer_id || !establishment_id) {
      return new Response(
        JSON.stringify({ error: "ID do cliente e estabelecimento são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the requesting user is a master admin OR a member of the establishment
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isMasterAdmin = !!roleData;

    // Check if user is an establishment member (admin or manager only - not employee)
    const { data: memberData } = await supabaseAdmin
      .from("establishment_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("establishment_id", establishment_id)
      .maybeSingle();

    const isEstablishmentAdmin = memberData && (memberData.role === 'admin' || memberData.role === 'manager');

    if (!isMasterAdmin && !isEstablishmentAdmin) {
      return new Response(
        JSON.stringify({ error: "Você não tem permissão para editar este cliente" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the customer belongs to this establishment
    const { data: customerProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, establishment_id")
      .eq("id", customer_id)
      .maybeSingle();

    if (!customerProfile) {
      return new Response(
        JSON.stringify({ error: "Cliente não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure customer belongs to this establishment (unless master admin)
    if (!isMasterAdmin && customerProfile.establishment_id !== establishment_id) {
      return new Response(
        JSON.stringify({ error: "Este cliente não pertence ao seu estabelecimento" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update password if provided
    if (password && password.length >= 6) {
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        customer_id,
        { password }
      );

      if (passwordError) {
        return new Response(
          JSON.stringify({ error: `Erro ao atualizar senha: ${passwordError.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update profile data
    const profileUpdates: Record<string, unknown> = {};
    if (full_name !== undefined) profileUpdates.full_name = full_name;
    if (phone !== undefined) profileUpdates.phone = phone;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdates)
        .eq("id", customer_id);

      if (profileError) {
        return new Response(
          JSON.stringify({ error: `Erro ao atualizar perfil: ${profileError.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Handle role change (user <-> employee)
    if (role !== undefined) {
      // Check if customer already has a membership
      const { data: existingMember } = await supabaseAdmin
        .from("establishment_members")
        .select("id, role")
        .eq("user_id", customer_id)
        .eq("establishment_id", establishment_id)
        .maybeSingle();

      if (role === 'employee') {
        // Promote to employee
        if (existingMember) {
          // Update existing membership
          await supabaseAdmin
            .from("establishment_members")
            .update({ role: 'employee' })
            .eq("id", existingMember.id);
        } else {
          // Create new membership as employee
          await supabaseAdmin
            .from("establishment_members")
            .insert({
              user_id: customer_id,
              establishment_id: establishment_id,
              role: 'employee'
            });
        }
      } else if (role === 'user') {
        // Demote to user - remove from establishment_members if employee
        if (existingMember && existingMember.role === 'employee') {
          await supabaseAdmin
            .from("establishment_members")
            .delete()
            .eq("id", existingMember.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Cliente atualizado com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in update-customer:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});