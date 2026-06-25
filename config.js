'use strict';

require('dotenv').config();

const config = {
  AWS_REGION: process.env.AWS_REGION || 'ap-south-1',
  // ap-south-1 Nova Pro is INFERENCE_PROFILE-only -> use the APAC inference profile id.
  BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID || 'apac.amazon.nova-pro-v1:0',
  USE_REAL_ATLAS: String(process.env.USE_REAL_ATLAS).toLowerCase() === 'true',
  MONGODB_URI: process.env.MONGODB_URI || '',
  PORT: parseInt(process.env.PORT, 10) || 3000,

  // Retrieval / model tuning
  TOP_K: 3,
  TEMPERATURE: 0.2,
  MAX_TOKENS: 1500,

  // Name of the Atlas Vector Search index on failurePatterns.embedding
  ATLAS_VECTOR_INDEX: 'failurePatterns_vec',
};

module.exports = config;
