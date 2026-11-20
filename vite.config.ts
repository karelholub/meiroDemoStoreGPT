import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In `npm run dev` the Netlify function is not running; proxy the Profile API to the deployed site.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/meiro-profile": { target: "https://dmostoregpt.netlify.app", changeOrigin: true },
    },
  },
});
