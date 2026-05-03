
CREATE OR REPLACE FUNCTION public.delete_establishment_cascade(_establishment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete tickets (depends on ticket_sales and events)
  DELETE FROM public.tickets WHERE event_id IN (SELECT id FROM public.events WHERE establishment_id = _establishment_id);
  
  -- Delete ticket_sales
  DELETE FROM public.ticket_sales WHERE establishment_id = _establishment_id;
  DELETE FROM public.ticket_sales WHERE event_id IN (SELECT id FROM public.events WHERE establishment_id = _establishment_id);

  -- Delete ticket_types (depends on ticket_batches and events)
  DELETE FROM public.ticket_types WHERE event_id IN (SELECT id FROM public.events WHERE establishment_id = _establishment_id);

  -- Delete ticket_batches
  DELETE FROM public.ticket_batches WHERE event_id IN (SELECT id FROM public.events WHERE establishment_id = _establishment_id);

  -- Delete events
  DELETE FROM public.events WHERE establishment_id = _establishment_id;

  -- Delete order_items (depends on orders and products)
  DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE establishment_id = _establishment_id);
  DELETE FROM public.order_items WHERE product_id IN (SELECT id FROM public.products WHERE establishment_id = _establishment_id);

  -- Delete orders
  DELETE FROM public.orders WHERE establishment_id = _establishment_id;

  -- Delete product_images
  DELETE FROM public.product_images WHERE product_id IN (SELECT id FROM public.products WHERE establishment_id = _establishment_id);

  -- Delete product_variants
  DELETE FROM public.product_variants WHERE product_id IN (SELECT id FROM public.products WHERE establishment_id = _establishment_id);

  -- Delete favorites referencing products
  DELETE FROM public.favorites WHERE product_id IN (SELECT id FROM public.products WHERE establishment_id = _establishment_id);

  -- Delete products
  DELETE FROM public.products WHERE establishment_id = _establishment_id;

  -- Delete brands
  DELETE FROM public.brands WHERE establishment_id = _establishment_id;

  -- Delete product_categories
  DELETE FROM public.product_categories WHERE establishment_id = _establishment_id;

  -- Delete banners
  DELETE FROM public.banners WHERE establishment_id = _establishment_id;

  -- Delete coupons
  DELETE FROM public.coupons WHERE establishment_id = _establishment_id;

  -- Delete wallet_transactions
  DELETE FROM public.wallet_transactions WHERE establishment_id = _establishment_id;

  -- Delete withdrawal_requests
  DELETE FROM public.withdrawal_requests WHERE establishment_id = _establishment_id;

  -- Delete expenses
  DELETE FROM public.expenses WHERE establishment_id = _establishment_id;

  -- Delete manual_entries
  DELETE FROM public.manual_entries WHERE establishment_id = _establishment_id;

  -- Delete establishment_settings
  DELETE FROM public.establishment_settings WHERE establishment_id = _establishment_id;

  -- Delete establishment_members
  DELETE FROM public.establishment_members WHERE establishment_id = _establishment_id;

  -- Delete activity_logs
  DELETE FROM public.activity_logs WHERE establishment_id = _establishment_id;

  -- Delete user_sessions
  DELETE FROM public.user_sessions WHERE establishment_id = _establishment_id;

  -- Delete security_alerts
  DELETE FROM public.security_alerts WHERE establishment_id = _establishment_id;

  -- Delete profiles linked to establishment
  UPDATE public.profiles SET establishment_id = NULL WHERE establishment_id = _establishment_id;

  -- Finally delete the establishment
  DELETE FROM public.establishments WHERE id = _establishment_id;
END;
$$;
