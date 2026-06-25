import OneSignal from "react-onesignal";

export const ONESIGNAL_APP_ID = "b2a73afd-778c-4fec-b87b-aef0ad833c2d";

let initPromise: Promise<void> | null = null;
let initialized = false;

function isPreviewHost() {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname;
  return (
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
    h.endsWith(".lovableproject.com") ||
    h.endsWith(".lovableproject-dev.com") ||
    h.endsWith(".beta.lovable.dev") ||
    window.self !== window.top
  );
}

export async function ensureOneSignal(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (isPreviewHost()) return false;
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return false;
  if (initialized) return true;
  if (!initPromise) {
    initPromise = OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: "/OneSignalSDKWorker.js",
      serviceWorkerParam: { scope: "/" },
    })
      .then(() => {
        initialized = true;
      })
      .catch((err) => {
        console.warn("[OneSignal] init failed", err);
        initPromise = null;
        throw err;
      });
  }
  try {
    await initPromise;
    return true;
  } catch {
    return false;
  }
}

export async function loginOneSignal(userId: string) {
  const ok = await ensureOneSignal();
  if (!ok) return;
  try {
    await OneSignal.login(userId);
  } catch (err) {
    console.warn("[OneSignal] login failed", err);
  }
}

export async function logoutOneSignal() {
  if (!initialized) return;
  try {
    await OneSignal.logout();
  } catch (err) {
    console.warn("[OneSignal] logout failed", err);
  }
}

export async function getPushState(): Promise<{ supported: boolean; permission: NotificationPermission | "default"; optedIn: boolean }> {
  const ok = await ensureOneSignal();
  if (!ok) {
    return {
      supported: false,
      permission: typeof Notification !== "undefined" ? Notification.permission : "default",
      optedIn: false,
    };
  }
  return {
    supported: true,
    permission: OneSignal.Notifications.permission ? "granted" : (Notification.permission as NotificationPermission),
    optedIn: !!OneSignal.User?.PushSubscription?.optedIn,
  };
}

export async function enablePush(): Promise<boolean> {
  const ok = await ensureOneSignal();
  if (!ok) return false;
  try {
    if (!OneSignal.Notifications.permission) {
      await OneSignal.Notifications.requestPermission();
    }
    await OneSignal.User.PushSubscription.optIn();
    return !!OneSignal.User.PushSubscription.optedIn;
  } catch (err) {
    console.warn("[OneSignal] enable failed", err);
    return false;
  }
}

export async function disablePush(): Promise<void> {
  if (!initialized) return;
  try {
    await OneSignal.User.PushSubscription.optOut();
  } catch (err) {
    console.warn("[OneSignal] disable failed", err);
  }
}

export { OneSignal };