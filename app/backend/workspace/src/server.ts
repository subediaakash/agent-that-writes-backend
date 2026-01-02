import express, { Application, Request, Response, NextFunction } from 'express';
import http, { Server as HTTPServer } from 'http';

const PORT: number = parseInt(process.env.PORT || '3000', 10);

function createApp(): Application {
  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Healthcheck route
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // Error handler
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const status = (err as any)?.status || 500;
    const message = (err as any)?.message || 'Internal Server Error';
    res.status(status).json({ error: message });
  });

  return app;
}

function startServer(): HTTPServer {
  const app = createApp();
  const server = http.createServer(app);

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`HTTP server listening on port ${PORT}`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof PORT === 'string' ? `Pipe ${PORT}` : `Port ${PORT}`;

    switch (error.code) {
      case 'EACCES':
        console.error(`${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(`${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  return server;
}

if (require.main === module) {
  startServer();
}

export { createApp, startServer };