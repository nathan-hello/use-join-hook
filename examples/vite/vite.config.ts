import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],

  base: "./",
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  esbuild: {
    supported: {
      "top-level-await": true,
    },
  },
});
