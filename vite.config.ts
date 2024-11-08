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
})
