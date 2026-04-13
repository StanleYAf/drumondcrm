import { AlertTriangle, RefreshCw, WifiOff, ServerCrash, ShieldX } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  variant?: "default" | "network" | "server" | "permission";
}

const VARIANTS = {
  default: { icon: AlertTriangle, title: "Erro ao carregar dados", color: "text-destructive", bg: "bg-destructive/10" },
  network: { icon: WifiOff, title: "Sem conexão", color: "text-warning", bg: "bg-warning/10" },
  server: { icon: ServerCrash, title: "Erro no servidor", color: "text-destructive", bg: "bg-destructive/10" },
  permission: { icon: ShieldX, title: "Acesso negado", color: "text-orange-500", bg: "bg-orange-500/10" },
};

export function ErrorState({ message, onRetry, variant = "default" }: ErrorStateProps) {
  const { icon: Icon, title, color, bg } = VARIANTS[variant];

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] p-6 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className={`w-16 h-16 rounded-2xl ${bg} flex items-center justify-center mb-5`}>
        <Icon className={`h-8 w-8 ${color}`} />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs leading-relaxed">
        {message || "Ocorreu um erro inesperado. Verifique sua conexão e tente novamente."}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
