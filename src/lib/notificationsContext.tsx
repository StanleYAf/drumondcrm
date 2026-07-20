import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  created_at: string;
};

type NotificationsContextValue = {
  items: Notification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  removeOne: (id: string) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  // Evita criar um segundo canal caso o Provider seja remontado rapidamente
  // (ex: hot-reload em dev) enquanto o anterior ainda não terminou o cleanup.
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    let ativo = true;

    const load = async () => {
      const { data } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (ativo && data) setItems(data as Notification[]);
    };
    load();

    // Se por algum motivo já existir um canal de uma montagem anterior
    // que não foi limpo a tempo, remove ele antes de criar um novo.
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setItems((prev) => [payload.new as Notification, ...prev].slice(0, 30));
          } else if (payload.eventType === "UPDATE") {
            setItems((prev) =>
              prev.map((n) =>
                n.id === (payload.new as Notification).id
                  ? (payload.new as Notification)
                  : n
              )
            );
          } else if (payload.eventType === "DELETE") {
            setItems((prev) => prev.filter((n) => n.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      ativo = false;
      supabase.removeChannel(channel);
      if (channelRef.current === channel) {
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  const unreadCount = items.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (!user || unreadCount === 0) return;
    await (supabase as any)
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
  };

  const markRead = async (id: string) => {
    await (supabase as any).from("notifications").update({ read: true }).eq("id", id);
  };

  const removeOne = async (id: string) => {
    await (supabase as any).from("notifications").delete().eq("id", id);
  };

  return (
    <NotificationsContext.Provider
      value={{ items, unreadCount, markAllRead, markRead, removeOne }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications precisa ser usado dentro de <NotificationsProvider>");
  }
  return ctx;
}
