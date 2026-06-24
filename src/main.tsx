import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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
