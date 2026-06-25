'use strict';

/**
 * Real MongoDB Atlas data layer. Same interface as mockStore.js.
 *
 * Activated when USE_REAL_ATLAS=true. Connects at init(), seeds the reference
 * collections on first run, and uses Atlas $vectorSearch for retrieval.
 *
 * One-time setup required in Atlas: create a Vector Search index named
 * `failurePatterns_vec` on the `failurePatterns` collection over the
 * `embedding` field (see README / .env.example).
 */
const mongoose = require('mongoose');

const config = require('../../config');
const { embed } = require('../utils/embeddings');
const {
  pilotProfileSchema,
  failurePatternSchema,
  recommendationSchema,
  rescueLogSchema,
} = require('./schemas');

const seedFailurePatterns = require('./seed/failurePatterns.json');
const seedRecommendations = require('./seed/recommendations.json');

let PilotProfile;
let FailurePattern;
let Recommendation;
let RescueLog;

async function init() {
  if (!config.MONGODB_URI) {
    throw new Error('USE_REAL_ATLAS=true but MONGODB_URI is empty');
  }

  await mongoose.connect(config.MONGODB_URI);
  console.log('[atlasStore] connected to MongoDB Atlas');

  PilotProfile = mongoose.model('PilotProfile', pilotProfileSchema);
  FailurePattern = mongoose.model('FailurePattern', failurePatternSchema);
  Recommendation = mongoose.model('Recommendation', recommendationSchema);
  RescueLog = mongoose.model('RescueLog', rescueLogSchema);

  await seedIfEmpty();
}

async function seedIfEmpty() {
  const patternCount = await FailurePattern.estimatedDocumentCount();
  if (patternCount === 0) {
    const docs = seedFailurePatterns.map((p) => ({
      ...p,
      embedding: embed([p.name, ...(p.signals || []), p.description].join(' ')),
    }));
    await FailurePattern.insertMany(docs);
    console.log(`[atlasStore] seeded ${docs.length} failurePatterns`);
  }

  const recCount = await Recommendation.estimatedDocumentCount();
  if (recCount === 0) {
    await Recommendation.insertMany(seedRecommendations);
    console.log(`[atlasStore] seeded ${seedRecommendations.length} recommendations`);
  }
}

/**
 * Atlas $vectorSearch. Falls back to an in-DB cosine scan if the vector index
 * is not yet created, so the app still works before the index exists.
 */
async function vectorSearchPatterns(queryVector, k = 3) {
  try {
    const results = await FailurePattern.aggregate([
      {
        $vectorSearch: {
          index: config.ATLAS_VECTOR_INDEX,
          path: 'embedding',
          queryVector,
          numCandidates: 100,
          limit: k,
        },
      },
      {
        $project: {
          key: 1,
          name: 1,
          severity: 1,
          signals: 1,
          description: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]);
    if (results.length > 0) return results;
    // empty result may mean the index is missing/not ready -> fall through
  } catch (err) {
    console.warn('[atlasStore] $vectorSearch unavailable, using cosine fallback:', err.message);
  }
  return cosineFallback(queryVector, k);
}

async function cosineFallback(queryVector, k) {
  const { cosineSimilarity } = require('../utils/embeddings');
  const all = await FailurePattern.find({}).lean();
  return all
    .map((p) => {
      const { embedding, ...rest } = p;
      return { ...rest, score: cosineSimilarity(queryVector, embedding) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

async function getRecommendations(patternKeys) {
  return Recommendation.find({ patternKey: { $in: patternKeys } }).lean();
}

async function savePilotProfile(profile) {
  const doc = await PilotProfile.create(profile);
  return doc.toObject();
}

async function saveRescueLog(log) {
  const doc = await RescueLog.create(log);
  return doc.toObject();
}

async function getRescueLogs(limit = 20) {
  return RescueLog.find({}).sort({ createdAt: -1 }).limit(limit).lean();
}

async function close() {
  await mongoose.disconnect();
}

module.exports = {
  mode: 'atlas',
  init,
  vectorSearchPatterns,
  getRecommendations,
  savePilotProfile,
  saveRescueLog,
  getRescueLogs,
  close,
};
