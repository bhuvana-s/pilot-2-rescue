'use strict';

/**
 * Store-agnostic retrieval. Embeds the problem text, runs the store's vector
 * search over failurePatterns, and attaches each pattern's canonical
 * recommendations. Works identically for mock and Atlas stores.
 */
const store = require('../data/store');
const { embed } = require('../utils/embeddings');
const config = require('../../config');

async function retrieve(problemText, k = config.TOP_K) {
  const queryVector = embed(problemText);
  const patterns = await store.vectorSearchPatterns(queryVector, k);

  const keys = patterns.map((p) => p.key);
  const recommendations = await store.getRecommendations(keys);

  return { patterns, recommendations };
}

module.exports = { retrieve };
