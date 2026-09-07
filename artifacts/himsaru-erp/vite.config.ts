import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

// Compute __dirname for environments where import.meta.dirname is unavailable
const __dirname = typeof import.meta.dirname === "string"
  ? import.meta.dirname
  : path.dirname(fileURLToPath(import.meta.url));

const rawPort = process.env.PORT ?? "5173";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

// Replit-specific plugins are loaded dynamically so the build doesn't crash
// when their packages aren't installed (e.g. on Vercel or local dev outside Replit).
const isReplit =
  process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined;

async function loadReplitPlugins() {
  if (!isReplit) return [];
  try {
    const [runtimeErrorOverlay, cartographer, devBanner] = await Promise.all([
      import("@replit/vite-plugin-runtime-error-modal").then((m) => m.default),
      import("@replit/vite-plugin-cartographer").then((m) =>
        m.cartographer({ root: path.resolve(__dirname, "..") }),
      ),
      import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
    ]);
    return [runtimeErrorOverlay(), cartographer, devBanner];
  } catch {
    return [];
  }
}

export default defineConfig(async () => {
  const replitPlugins = await loadReplitPlugins();

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      ...replitPlugins,
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@assets": path.resolve(__dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(__dirname),
    build: {
      outDir: path.resolve(__dirname, "..", "..", "dist"),
      emptyOutDir: true,
      chunkSizeWarningLimit: 2000,
    },
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
