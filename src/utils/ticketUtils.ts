import { supabase } from "@/integrations/supabase/client";

// Cache for platform fees to avoid excessive database calls
let cachedFees: { percentage: number; minimum: number } | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30000; // 30 seconds cache

/**
 * Fetch current platform fees from database
 * Uses short-lived cache for performance
 */
export const getPlatformFees = async (): Promise<{ percentage: number; minimum: number }> => {
  const now = Date.now();
  
  // Return cached value if still valid
  if (cachedFees && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedFees;
  }
  
  try {
    const { data, error } = await supabase
      .from('platform_fees')
      .select('customer_ticket_percentage, customer_ticket_minimum')
      .eq('is_active', true)
      .maybeSingle();
    
    if (!error && data) {
      cachedFees = {
        percentage: data.customer_ticket_percentage ?? 10,
        minimum: data.customer_ticket_minimum ?? 2.50
      };
      cacheTimestamp = now;
      return cachedFees;
    }
  } catch (err) {
    console.error('Error fetching platform fees:', err);
  }
  
  // Default fallback
  return { percentage: 10, minimum: 2.50 };
};

/**
 * Clear the fees cache (call after updating fees in admin)
 */
export const clearFeesCache = () => {
  cachedFees = null;
  cacheTimestamp = 0;
};

/**
 * Calculate ticket fee based on price using dynamic rates
 * Uses percentage fee with minimum threshold
 * Free tickets (price = 0) have no fee
 */
export const calculateTicketFee = (price: number, percentage: number = 10, minimum: number = 2.50): number => {
  if (price === 0) return 0;
  const percentageFee = price * (percentage / 100);
  return Math.max(percentageFee, minimum);
};

/**
 * Calculate ticket fee asynchronously using current platform rates
 */
export const calculateTicketFeeAsync = async (price: number): Promise<number> => {
  if (price === 0) return 0;
  const fees = await getPlatformFees();
  const percentageFee = price * (fees.percentage / 100);
  return Math.max(percentageFee, fees.minimum);
};

/**
 * Calculate final price with fee
 */
export const calculatePriceWithFee = (price: number, percentage: number = 10, minimum: number = 2.50): number => {
  return price + calculateTicketFee(price, percentage, minimum);
};

/**
 * Calculate final price with fee asynchronously
 */
export const calculatePriceWithFeeAsync = async (price: number): Promise<number> => {
  const fee = await calculateTicketFeeAsync(price);
  return price + fee;
};

/**
 * Generate unique QR code for a ticket
 */
export const generateQRCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const timestamp = Date.now().toString(36);
  let random = '';
  for (let i = 0; i < 12; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TKT-${timestamp}-${random}`.toUpperCase();
};

/**
 * Create individual tickets after a purchase
 */
export const createIndividualTickets = async (
  ticketSaleId: string,
  ticketTypeId: string,
  eventId: string,
  userId: string,
  quantity: number
): Promise<{ success: boolean; tickets?: any[]; error?: string }> => {
  try {
    const tickets = [];
    
    for (let i = 0; i < quantity; i++) {
      tickets.push({
        ticket_sale_id: ticketSaleId,
        ticket_type_id: ticketTypeId,
        event_id: eventId,
        user_id: userId,
        qr_code: generateQRCode(),
        is_validated: false
      });
    }

    const { data, error } = await supabase
      .from('tickets')
      .insert(tickets)
      .select();

    if (error) throw error;

    return { success: true, tickets: data };
  } catch (error: any) {
    console.error('Error creating individual tickets:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Validate a ticket by QR code
 * Supports both direct qr_code string and legacy JSON format
 */
export const validateTicketByQRCode = async (
  rawQrCode: string,
  validatedBy: string
): Promise<{ success: boolean; ticket?: any; error?: string }> => {
  try {
    // Normalize QR code: trim whitespace and handle legacy JSON format
    let qrCode = rawQrCode.trim();
    
    // Check if it's a legacy JSON format and extract ticket info
    if (qrCode.startsWith('{')) {
      try {
        const parsed = JSON.parse(qrCode);
        // Legacy format might have ticketId (which was ticket_sale id) - we need to find individual tickets
        if (parsed.ticketId) {
          // Find all tickets for this sale
          const { data: saleTickets } = await supabase
            .from('tickets')
            .select('qr_code')
            .eq('ticket_sale_id', parsed.ticketId)
            .order('created_at', { ascending: true });
          
          if (saleTickets && saleTickets.length > 0) {
            // Use the specific ticket by index if provided, otherwise first one
            const idx = typeof parsed.index === 'number' ? parsed.index : 0;
            qrCode = saleTickets[Math.min(idx, saleTickets.length - 1)]?.qr_code || qrCode;
          }
        }
      } catch {
        // Not valid JSON, use as-is
      }
    }

    // First, find the ticket (without profile join to avoid RLS issues)
    const { data: ticket, error: findError } = await supabase
      .from('tickets')
      .select(`
        *,
        ticket_type:ticket_types(name),
        event:events(name, event_date)
      `)
      .eq('qr_code', qrCode)
      .maybeSingle();

    if (findError) {
      console.error('Error finding ticket:', findError);
      return { success: false, error: 'Erro ao buscar ingresso' };
    }

    if (!ticket) {
      return { success: false, error: 'Ingresso não encontrado' };
    }

    if (ticket.is_validated) {
      return { 
        success: false, 
        error: `Este ingresso já foi validado em ${new Date(ticket.validated_at).toLocaleString('pt-BR')}`,
        ticket 
      };
    }

    // Validate the ticket
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        is_validated: true,
        validated_at: new Date().toISOString(),
        validated_by: validatedBy
      })
      .eq('id', ticket.id);

    if (updateError) throw updateError;

    // Try to get profile info separately (may fail silently due to RLS)
    let profile = null;
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', ticket.user_id)
        .maybeSingle();
      profile = profileData;
    } catch {
      // Ignore profile fetch errors
    }

    return { 
      success: true, 
      ticket: { 
        ...ticket, 
        is_validated: true, 
        validated_at: new Date().toISOString(),
        profile 
      }
    };
  } catch (error: any) {
    console.error('Error validating ticket:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get establishment ID from event
 */
export const getEventEstablishmentId = async (eventId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('establishment_id')
      .eq('id', eventId)
      .single();

    if (error) throw error;
    return data?.establishment_id || null;
  } catch (error) {
    console.error('Error getting event establishment:', error);
    return null;
  }
};
