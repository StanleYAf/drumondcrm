import { useEffect } from "react";
import { useAuth } from "@/lib/authContext";
import { ensureOneSignal, loginOneSignal, logoutOneSignal } from "@/lib/onesignal";

export function OneSignalInit() {
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await ensureOneSignal();
      if (cancelled || !ok) return;
      if (user?.id) await loginOneSignal(user.id);
      else await logoutOneSignal();
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return null;
}