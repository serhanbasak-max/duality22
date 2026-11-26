import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' : derlenen dosyalar sunucunun herhangi bir klasörüne yüklenebilir.
export default defineConfig({ plugins: [react()], base: './' })
