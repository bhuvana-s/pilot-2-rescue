'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');

const config = require('./config');
const store = require('./src/data/store');
const apiRoutes = require('./src/routes/diagnose');

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '256kb' }));

  // Serve the single-file frontend (no build step)
  app.use(express.static(path.join(__dirname, 'public')));

  app.use('/api', apiRoutes);

  // Initialize the data layer (seed mock / connect Atlas) before listening.
  await store.init();

  app.listen(config.PORT, () => {
    console.log('');
    console.log('  Enterprise AI Pilot Rescue Kit');
    console.log(`  → http://localhost:${config.PORT}`);
    console.log(`  store: ${store.mode}   region: ${config.AWS_REGION}   model: ${config.BEDROCK_MODEL_ID}`);
    console.log('');
  });

  const shutdown = async () => {
    console.log('\nshutting down...');
    try {
      await store.close();
    } catch (_) {
      /* ignore */
    }
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
