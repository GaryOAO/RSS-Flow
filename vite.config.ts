import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// Note: Using vite-bundle-visualizer would be alternative
// Run: npx vite-bundle-visualizer after build for bundle analysis

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isProduction = mode === 'production';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react()
      // Bundle analysis: Use "npx vite-bundle-visualizer" after build
      // Or check dist folder sizes manually
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      // Optimize bundles
      rollupOptions: {
        output: {
          manualChunks: {
            // React core (most stable, cache-friendly)
            'react-vendor': ['react', 'react-dom'],
            // Markdown (large but only used in readers)
            'markdown': ['react-markdown'],
            // Icons (large package ~100kb)
            'icons': ['lucide-react']
            // Note: AI and Capacitor chunks removed - let Vite handle automatically
            // to avoid empty chunk warnings
          }
        }
      },
      target: 'es2020',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction, // Remove console in production
          drop_debugger: true
        }
      },
      chunkSizeWarningLimit: 600,
      sourcemap: !isProduction // Only generate sourcemaps in dev
    },
    optimizeDeps: {
      include: ['react', 'react-dom']
    }
  };
});
