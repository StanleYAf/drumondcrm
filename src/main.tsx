import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const BUILD_STORAGE_KEY = "drumond:last-build-id";
const BUILD_RELOAD_KEY = "drumond:build-reload-id";
const BUILD_CLEANUP_KEY = "drumond:build-cleanup-id";

async function cleanupRuntimeCaches() {
  if ("caches" in window) {
    const keys = await window.caches.keys();
    await Promise.all(keys.map((key) => window.caches.delete(key)));
  }

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => {
        if (registration.active?.scriptURL.includes("OneSignalSDKWorker.js")) {
          return registration.update();
        }
        return registration.unregister();
      }),
    );
  }
}

async function refreshStaleRuntime(buildId: string) {
  if (typeof window === "undefined" || import.meta.env.DEV) return;

  const previousBuildId = window.localStorage.getItem(BUILD_STORAGE_KEY);
  const previousCleanupId = window.localStorage.getItem(BUILD_CLEANUP_KEY);

  if (previousCleanupId !== buildId) {
    try {
      await cleanupRuntimeCaches();
      window.localStorage.setItem(BUILD_CLEANUP_KEY, buildId);
    } catch (error) {
      console.warn("[runtime-refresh] cache cleanup failed", error);
    }
  }

  if (!previousBuildId || previousBuildId === buildId) {
    window.localStorage.setItem(BUILD_STORAGE_KEY, buildId);
    return;
  }

  window.localStorage.setItem(BUILD_STORAGE_KEY, buildId);

  try {
    await cleanupRuntimeCaches();
  } catch (error) {
    console.warn("[runtime-refresh] cache cleanup failed", error);
  }

  if (window.sessionStorage.getItem(BUILD_RELOAD_KEY) !== buildId) {
    window.sessionStorage.setItem(BUILD_RELOAD_KEY, buildId);
    window.location.reload();
  }
}

void refreshStaleRuntime(__APP_BUILD_ID__);

// Reinforce no-translate at runtime in case extensions tamper with the head.
if (typeof document !== "undefined") {
  document.documentElement.setAttribute("translate", "no");
  document.documentElement.classList.add("notranslate");
  const root = document.getElementById("root");
  if (root) {
    root.setAttribute("translate", "no");
    root.classList.add("notranslate");
  }
}

createRoot(document.getElementById("root")!).render(<App />);
