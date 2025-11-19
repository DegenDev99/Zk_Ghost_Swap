import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Buffer } from "buffer";

// Polyfill Buffer for Solana packages
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
  (globalThis as any).Buffer = Buffer;
}

createRoot(document.getElementById("root")!).render(<App />);
