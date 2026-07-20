import { Bell, Check, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useNotifications } from "@/lib/notificationsContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

export function NotificationsBell() {
  const { user } = useAuth();
  const { items, unreadCount, markAllRead, markRead, removeOne } = useNotifications();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative h-9 w-9 grid place-items-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
          title="Notificações"
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold grid place-items-center"
              style={{ background: "#EF4444", color: "white" }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]">
          <div>
            <div className="text-[14px] font-semibold text-[#0F172A]">Notificações</div>
            <div className="text-[11px] text-[#64748B]">
              {unreadCount > 0 ? `${unreadCount} não lida(s)` : "Tudo em dia"}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="h-7 text-[11px]">
              <Check className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[420px]">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-[12px] text-[#64748B]">Nenhuma notificação ainda.</div>
          ) : (
            <ul className="divide-y divide-[#E2E8F0]">
              {items.map((n) => (
                <li key={n.id} className={`px-4 py-3 hover:bg-[#F8FAFC] ${!n.read ? "bg-[#EAF4FD]/40" : ""}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!n.read && (
                          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: "#50B9EC" }} />
                        )}
                        <span className="text-[13px] font-semibold text-[#0F172A] truncate">{n.title}</span>
                      </div>
                      <p className="text-[12px] text-[#475569] mt-0.5 break-words">{n.message}</p>
                      <p className="text-[10px] text-[#94A3B8] mt-1">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!n.read && (
                        <button
                          onClick={() => markRead(n.id)}
                          title="Marcar como lida"
                          className="h-6 w-6 grid place-items-center rounded text-[#64748B] hover:text-[#25598C] hover:bg-[#EAF4FD]"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => removeOne(n.id)}
                        title="Excluir"
                        className="h-6 w-6 grid place-items-center rounded text-[#64748B] hover:text-[#EF4444] hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
