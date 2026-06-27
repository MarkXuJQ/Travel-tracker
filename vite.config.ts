import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function vercelApiDevPlugin(): Plugin {
  const apiHandlers = {
    '/api/travel-record': path.resolve(__dirname, './api/travel-record.js'),
  };

  return {
    name: 'vercel-api-dev',
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, __dirname, ''));

      Object.entries(apiHandlers).forEach(([route, filePath]) => {
        server.middlewares.use(route, async (req, res, next) => {
          try {
            const handlerModule = await import(`${pathToFileURL(filePath).href}?t=${Date.now()}`);
            const handler = typeof handlerModule.default === 'function'
              ? handlerModule.default
              : null;

            if (!handler) {
              return next(new Error(`API handler not found for ${route}`));
            }

            await handler(req, res);

            if (!res.writableEnded) {
              next();
            }
          } catch (error) {
            next(error instanceof Error ? error : new Error(String(error)));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), vercelApiDevPlugin()],
  server: {
    port: 5173,
  },
});
