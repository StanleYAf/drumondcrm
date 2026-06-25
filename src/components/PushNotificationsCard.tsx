import { useEffect, useState, useCallback } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { disablePush, enablePush, getPushState } from "@/lib/onesignal";

export function PushNotificationsCard() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "default">("default");
  const [optedIn, setOptedIn] = useState(false);

  const refresh = useCallback(async () => {
    const s = await getPushState();
    setSupported(s.supported);
    setPermission(s.permission);
    setOptedIn(s.optedIn);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleToggle = async () => {
    setBusy(true);
    try {
      if (optedIn) {
        await disablePush();
        toast.success("Notificações desativadas");
      } else {
        const ok = await enablePush();
        if (!ok) {
          toast.error("Permissão negada pelo navegador");
        } else {
          toast.success("Notificações ativadas");
        }
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="ios-section-title">NOTIFICAÇÕES PUSH</p>
      <div className="ios-list-group">
        <div className="ios-list-item">
          <div className="flex items-center gap-3">
            {optedIn ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
            <div>
              <p className="text-sm text-foreground">Receber notificações no navegador</p>
              <p className="text-[11px] text-muted-foreground">
                {!supported
                  ? "Indisponível neste ambiente. Acesse a versão publicada para ativar."
                  : permission === "denied"
                  ? "Permissão bloqueada — libere nas configurações do navegador."
                  : optedIn
                  ? "Você receberá avisos de novas demandas e mudanças de status."
                  : "Ative para receber avisos de demandas em tempo real."}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggle}
            disabled={loading || busy || !supported || permission === "denied"}
            className={`px-3 h-8 rounded-full text-xs font-medium transition ${
              optedIn
                ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                : "bg-primary/15 text-primary hover:bg-primary/25"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {busy ? "..." : optedIn ? "Desativar" : "Ativar"}
          </button>
        </div>
      </div>
    </div>
  );
}