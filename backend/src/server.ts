import 'dotenv/config';

import { createApp } from './app';
import { loadConfig } from './config';
import { createDatabasePool } from './db';

async function main() {
  const config = loadConfig();
  const pool = createDatabasePool(config);
  const app = createApp(config, pool);

  const server = app.listen(config.port, config.host, () => {
    console.info(`LiftFuel API listening on ${config.host}:${config.port}`);
  });

  const shutdown = async (signal: NodeJS.Signals) => {
    console.info(`Received ${signal}; shutting down LiftFuel API.`);
    server.close(async (closeError) => {
      if (closeError) {
        console.error('HTTP server shutdown failed', closeError);
        process.exitCode = 1;
      }

      try {
        await pool.end();
      } catch (poolError) {
        console.error('Database pool shutdown failed', poolError);
        process.exitCode = 1;
      } finally {
        process.exit();
      }
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Failed to start LiftFuel API', {
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : typeof error,
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exit(1);
});
