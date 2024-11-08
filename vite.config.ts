import path from "path"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import RailsPlugin from 'vite-plugin-rails'
// import RubyPlugin from 'vite-plugin-ruby'

export default defineConfig({
  plugins: [
    react(),
    RailsPlugin({ fullReload: { additionalPaths: ["./app/views/**/*.{erb,haml,html,slim}"] } })
    // RubyPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./app/frontend"),
      "@/components/*": path.resolve(__dirname, "./app/frontend/components"),
      "@/lib/*": path.resolve(__dirname, "./app/frontend/lib"),
      "@/styles/*": path.resolve(__dirname, "./app/frontend/styles"),
      "@/assets/*": path.resolve(__dirname, "./app/assets")
    },
  },
})
