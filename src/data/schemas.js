'use strict';

/**
 * Mongoose schemas — the canonical shape of the four Atlas collections.
 * The mock store produces objects of the same shape, so swapping stores never
 * changes the documents callers see.
 */
const mongoose = require('mongoose');

const { Schema } = mongoose;

const pilotProfileSchema = new Schema(
  {
    industry: String,
    useCase: String,
    stage: String,
    problemText: { type: String, required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false }, collection: 'pilotProfiles' }
);

const failurePatternSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    name: String,
    severity: String,
    signals: [String],
    description: String,
    // Vector field — the Atlas Vector Search index `failurePatterns_vec` is built on this.
    embedding: [Number],
  },
  { collection: 'failurePatterns' }
);

const recommendationSchema = new Schema(
  {
    patternKey: { type: String, required: true, index: true },
    action: String,
    rationale: String,
    effort: String,
    impact: String,
  },
  { collection: 'recommendations' }
);

const rescueLogSchema = new Schema(
  {
    pilotProfileId: { type: Schema.Types.Mixed },
    problemText: String,
    matchedPatternKeys: [String],
    diagnosis: { type: Schema.Types.Mixed },
    model: String,
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false }, collection: 'rescueLogs' }
);

module.exports = {
  pilotProfileSchema,
  failurePatternSchema,
  recommendationSchema,
  rescueLogSchema,
};
