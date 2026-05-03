-- Create expenses table for financial report
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create manual entries table for additional income
CREATE TABLE public.manual_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for expenses
CREATE POLICY "Users can view expenses of their establishment" 
ON public.expenses FOR SELECT 
USING (public.is_establishment_member(auth.uid(), establishment_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create expenses for their establishment" 
ON public.expenses FOR INSERT 
WITH CHECK (public.is_establishment_member(auth.uid(), establishment_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update expenses of their establishment" 
ON public.expenses FOR UPDATE 
USING (public.is_establishment_member(auth.uid(), establishment_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete expenses of their establishment" 
ON public.expenses FOR DELETE 
USING (public.is_establishment_member(auth.uid(), establishment_id) OR public.has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for manual_entries
CREATE POLICY "Users can view entries of their establishment" 
ON public.manual_entries FOR SELECT 
USING (public.is_establishment_member(auth.uid(), establishment_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create entries for their establishment" 
ON public.manual_entries FOR INSERT 
WITH CHECK (public.is_establishment_member(auth.uid(), establishment_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update entries of their establishment" 
ON public.manual_entries FOR UPDATE 
USING (public.is_establishment_member(auth.uid(), establishment_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete entries of their establishment" 
ON public.manual_entries FOR DELETE 
USING (public.is_establishment_member(auth.uid(), establishment_id) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_manual_entries_updated_at
BEFORE UPDATE ON public.manual_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();