'use strict';

/**
 * THE SWAP POINT.
 *
 * Both stores implement the same interface:
 *   init(), vectorSearchPatterns(queryVector, k), getRecommendations(keys),
 *   savePilotProfile(p), saveRescueLog(l), getRescueLogs(limit), close()
 *
 * Flip USE_REAL_ATLAS in .env to move from mock to real Atlas — nothing else
 * in the app changes.
 */
const config = require('../../config');

module.exports = config.USE_REAL_ATLAS
  ? require('./atlasStore')
  : require('./mockStore');
