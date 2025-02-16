import { createFilter, defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/src/",
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  plugins: [
    react(),
    dts({ outDir: "dist", entryRoot: "src", insertTypesEntry: true }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "use-join",
    },

    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
});
