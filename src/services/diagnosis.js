'use strict';

/**
 * Orchestrator for the core flow:
 *   save profile -> retrieve patterns + recs -> Nova diagnosis -> persist log.
 */
const store = require('../data/store');
const config = require('../../config');
const { retrieve } = require('./retriever');
const bedrock = require('./bedrock');

async function runDiagnosis({ problemText, industry, useCase, stage }) {
  if (!problemText || !problemText.trim()) {
    const err = new Error('problemText is required');
    err.statusCode = 400;
    throw err;
  }

  const profile = await store.savePilotProfile({ problemText, industry, useCase, stage });

  const { patterns, recommendations } = await retrieve(problemText);

  const { diagnosis } = await bedrock.diagnose(problemText, patterns, recommendations);

  const matchedPatternKeys = patterns.map((p) => p.key);
  const log = await store.saveRescueLog({
    pilotProfileId: profile._id,
    problemText,
    matchedPatternKeys,
    diagnosis,
    model: config.BEDROCK_MODEL_ID,
  });

  return {
    pilotProfileId: profile._id,
    rescueLogId: log._id,
    matchedPatterns: patterns,
    diagnosis,
  };
}

module.exports = { runDiagnosis };
