-- Migração para adicionar as configurações do Robô de WhatsApp na tabela de estabelecimentos
ALTER TABLE public.establishments
ADD COLUMN IF NOT EXISTS whatsapp_instance_name text,
ADD COLUMN IF NOT EXISTS whatsapp_status text DEFAULT 'disconnected',
ADD COLUMN IF NOT EXISTS whatsapp_ai_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_ai_prompt text,
ADD COLUMN IF NOT EXISTS whatsapp_agent_name text DEFAULT 'Assistente Virtual';

-- Comentários para documentação do banco
COMMENT ON COLUMN public.establishments.whatsapp_instance_name IS 'Nome da instância na Evolution API (geralmente o ID da loja)';
COMMENT ON COLUMN public.establishments.whatsapp_status IS 'Status da conexão: disconnected, connected, qr_ready';
COMMENT ON COLUMN public.establishments.whatsapp_ai_enabled IS 'Se a IA deve responder automaticamente as mensagens';
COMMENT ON COLUMN public.establishments.whatsapp_ai_prompt IS 'Instruções personalizadas para a IA (prompt)';
COMMENT ON COLUMN public.establishments.whatsapp_agent_name IS 'Nome do robô/atendente virtual';
