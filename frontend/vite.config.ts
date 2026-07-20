import {
  defineConfig,
} from 'vite';

import react from
  '@vitejs/plugin-react';

export default defineConfig({
  //Enables React support in Vite.
  plugins: [react()],

  /*
  This is used only while running:
  npm run dev
  A frontend request to:
  http://localhost:5173/api/register
  is forwarded to:
  http://localhost:5000/api/register
  */
 
  server: {
    proxy: {
      '/api': {
        target:
          'http://localhost:5000',

        changeOrigin: true,
      },
    },
  },
});