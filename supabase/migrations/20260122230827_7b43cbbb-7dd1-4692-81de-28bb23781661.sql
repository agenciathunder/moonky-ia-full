-- Create withdrawal_requests table
CREATE TABLE public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wallet_transactions table for tracking all money movements
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sale', 'withdrawal', 'refund', 'fee')),
  amount NUMERIC NOT NULL,
  description TEXT,
  reference_id UUID, -- order_id, withdrawal_id, etc.
  available_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), -- for credit card D+14
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for withdrawal_requests
CREATE POLICY "Master admins can manage all withdrawals" 
ON public.withdrawal_requests 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view own establishment withdrawals" 
ON public.withdrawal_requests 
FOR SELECT 
USING (is_establishment_member(auth.uid(), establishment_id));

CREATE POLICY "Members can insert withdrawal requests" 
ON public.withdrawal_requests 
FOR INSERT 
WITH CHECK (is_establishment_member(auth.uid(), establishment_id));

-- RLS policies for wallet_transactions
CREATE POLICY "Master admins can manage all transactions" 
ON public.wallet_transactions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can view own establishment transactions" 
ON public.wallet_transactions 
FOR SELECT 
USING (is_establishment_member(auth.uid(), establishment_id));

-- Add triggers for updated_at
CREATE TRIGGER update_withdrawal_requests_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add has_wallet to plans table
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS has_wallet BOOLEAN DEFAULT false;