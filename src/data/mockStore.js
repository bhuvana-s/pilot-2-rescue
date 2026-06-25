'use strict';

/**
 * In-memory mock of the four Atlas collections, with JSON-file persistence for
 * the write collections (pilotProfiles, rescueLogs) so history survives
 * restarts. Implements the same interface as atlasStore.js.
 *
 * vectorSearchPatterns() mirrors Atlas $vectorSearch: it embeds nothing itself
 * (callers pass a query vector), computes cosine similarity against each
 * pattern's stored `embedding`, and returns the top-k with a `score`.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { embed, cosineSimilarity } = require('../utils/embeddings');

const seedFailurePatterns = require('./seed/failurePatterns.json');
const seedRecommendations = require('./seed/recommendations.json');
const seedPilotProfiles = require('./seed/pilotProfiles.json');

const PERSIST_PATH = path.join(__dirname, 'store.local.json');

// In-memory collections
const collections = {
  failurePatterns: [],
  recommendations: [],
  pilotProfiles: [],
  rescueLogs: [],
};

function oid() {
  return crypto.randomBytes(12).toString('hex');
}

function loadPersisted() {
  try {
    if (fs.existsSync(PERSIST_PATH)) {
      const raw = JSON.parse(fs.readFileSync(PERSIST_PATH, 'utf8'));
      collections.pilotProfiles = raw.pilotProfiles || [];
      collections.rescueLogs = raw.rescueLogs || [];
      return true;
    }
  } catch (err) {
    console.warn('[mockStore] could not read persisted store, starting fresh:', err.message);
  }
  return false;
}

function persist() {
  const payload = {
    pilotProfiles: collections.pilotProfiles,
    rescueLogs: collections.rescueLogs,
  };
  try {
    fs.writeFileSync(PERSIST_PATH, JSON.stringify(payload, null, 2));
  } catch (err) {
    console.warn('[mockStore] could not persist store:', err.message);
  }
}

async function init() {
  // Read-only reference collections are always (re)seeded from JSON.
  // Embeddings are computed here so they live on the doc exactly like Atlas.
  collections.failurePatterns = seedFailurePatterns.map((p) => ({
    _id: oid(),
    ...p,
    embedding: embed([p.name, ...(p.signals || []), p.description].join(' ')),
  }));
  collections.recommendations = seedRecommendations.map((r) => ({ _id: oid(), ...r }));

  // Write collections: load from disk if present, else seed sample profiles.
  const hadPersisted = loadPersisted();
  if (!hadPersisted) {
    collections.pilotProfiles = seedPilotProfiles.map((p) => ({
      _id: oid(),
      ...p,
      createdAt: new Date().toISOString(),
    }));
    collections.rescueLogs = [];
    persist();
  }

  console.log(
    `[mockStore] ready — ${collections.failurePatterns.length} patterns, ` +
      `${collections.recommendations.length} recommendations, ` +
      `${collections.rescueLogs.length} rescue logs`
  );
}

/** Mirrors $vectorSearch: returns top-k patterns ranked by cosine similarity. */
async function vectorSearchPatterns(queryVector, k = 3) {
  const ranked = collections.failurePatterns
    .map((p) => ({ ...p, score: cosineSimilarity(queryVector, p.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  // strip the raw embedding from what we return to callers
  return ranked.map(({ embedding, ...rest }) => rest);
}

async function getRecommendations(patternKeys) {
  const set = new Set(patternKeys);
  return collections.recommendations.filter((r) => set.has(r.patternKey));
}

async function savePilotProfile(profile) {
  const doc = { _id: oid(), createdAt: new Date().toISOString(), ...profile };
  collections.pilotProfiles.push(doc);
  persist();
  return doc;
}

async function saveRescueLog(log) {
  const doc = { _id: oid(), createdAt: new Date().toISOString(), ...log };
  collections.rescueLogs.push(doc);
  persist();
  return doc;
}

async function getRescueLogs(limit = 20) {
  return collections.rescueLogs
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

async function close() {
  /* nothing to close for the mock */
}

module.exports = {
  mode: 'mock',
  init,
  vectorSearchPatterns,
  getRecommendations,
  savePilotProfile,
  saveRescueLog,
  getRescueLogs,
  close,
};
