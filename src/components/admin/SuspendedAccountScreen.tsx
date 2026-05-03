import { AlertTriangle, CreditCard, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import moonkyLogo from "@/assets/moonky-logo.png";

interface SuspendedAccountScreenProps {
  establishmentName?: string;
}

export function SuspendedAccountScreen({ establishmentName }: SuspendedAccountScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0f]">
      {/* Subtle gradient overlay */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: "radial-gradient(ellipse at 50% 30%, rgba(239, 68, 68, 0.15) 0%, transparent 50%)"
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
        {/* Logo */}
        <img 
          src={moonkyLogo} 
          alt="Moonky" 
          className="h-10 w-auto mb-10 opacity-80"
        />
        
        {/* Warning icon */}
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        
        {/* Status badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs font-medium tracking-widest uppercase text-zinc-500">
            Conta Suspensa
          </span>
        </div>
        
        {/* Main message */}
        <h1 className="text-2xl font-semibold text-zinc-100 mb-3">
          Plano suspenso
        </h1>
        
        {establishmentName && (
          <p className="text-sm text-zinc-400 mb-2">
            {establishmentName}
          </p>
        )}
        
        <p className="text-sm text-zinc-500 leading-relaxed mb-8 max-w-md">
          O acesso ao painel administrativo está temporariamente bloqueado 
          devido a pendências no pagamento do seu plano. Regularize sua 
          situação para voltar a gerenciar sua loja normalmente.
        </p>
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button 
            className="h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => window.open('mailto:suporte@moonky.com.br?subject=Regularização de Plano', '_blank')}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Regularizar pagamento
          </Button>
          
          <Button 
            variant="outline"
            className="h-11 px-6 border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-100 hover:border-zinc-700"
            onClick={() => window.open('mailto:suporte@moonky.com.br', '_blank')}
          >
            <Mail className="w-4 h-4 mr-2" />
            Falar com suporte
          </Button>
        </div>
        
        {/* Info box */}
        <div className="mt-10 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 text-left max-w-md">
          <p className="text-xs text-zinc-500 leading-relaxed">
            <strong className="text-zinc-400">Importante:</strong> Sua loja permanecerá 
            fora do ar para os clientes até que o pagamento seja confirmado. Todos os 
            seus dados estão seguros e serão restaurados após a regularização.
          </p>
        </div>
      </div>
      
      {/* Footer branding */}
      <div className="absolute bottom-6 text-xs text-zinc-700">
        Powered by Moonky
      </div>
    </div>
  );
}