'use strict';

const express = require('express');

const config = require('../../config');
const store = require('../data/store');
const bedrock = require('../services/bedrock');
const { runDiagnosis } = require('../services/diagnosis');

const router = express.Router();

// POST /api/diagnose — main flow
router.post('/diagnose', async (req, res) => {
  try {
    const result = await runDiagnosis(req.body || {});
    res.json(result);
  } catch (err) {
    console.error('[diagnose] error:', err);
    res.status(err.statusCode || 500).json({ error: err.message || 'diagnosis failed' });
  }
});

// GET /api/history?limit=20 — recent rescue logs
router.get('/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const logs = await store.getRescueLogs(limit);
    res.json({ logs });
  } catch (err) {
    console.error('[history] error:', err);
    res.status(500).json({ error: err.message || 'failed to load history' });
  }
});

// GET /api/health — store mode + Bedrock reachability
router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    store: store.mode,
    region: config.AWS_REGION,
    model: config.BEDROCK_MODEL_ID,
    bedrock: 'unknown',
  };
  try {
    await bedrock.ping();
    health.bedrock = 'ok';
  } catch (err) {
    health.bedrock = 'error';
    health.bedrockError = err.name === 'AccessDeniedException'
      ? 'Model access not enabled for this account/region — enable it in the Bedrock console.'
      : err.message;
    health.status = 'degraded';
  }
  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

module.exports = router;
