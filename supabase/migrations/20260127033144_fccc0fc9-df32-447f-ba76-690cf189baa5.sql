-- Adicionar coluna para link externo do botão CTA do plano
ALTER TABLE public.plans 
ADD COLUMN cta_link text DEFAULT NULL;