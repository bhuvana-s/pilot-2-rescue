'use strict';

/**
 * Deterministic, offline text embedder.
 *
 * Mirrors the *interface* of a real embedding model (text in -> fixed-length
 * numeric vector out) so it can later be swapped for Bedrock Titan
 * (amazon.titan-embed-text-v2:0) without touching the stores or retriever.
 *
 * Each dimension corresponds to an enterprise-AI failure theme. The vector is
 * the (term-frequency) signal for each theme, L2-normalized so cosine
 * similarity behaves like a real vector space.
 */

// Ordered list of dimensions. Index in this array == index in the vector.
const DIMENSIONS = [
  { key: 'adoption', terms: ['adoption', 'adopt', 'usage', 'use', 'using', 'used', 'engagement', 'engage', 'reps', 'employees', 'agents', 'users', 'onboarding', 'training', 'workflow', 'habit', 'abandon', 'stopped', 'ignored'] },
  { key: 'roi', terms: ['roi', 'return', 'value', 'business case', 'cost saving', 'savings', 'benefit', 'justify', 'budget', 'kpi', 'metric', 'measure', 'outcome', 'impact', 'revenue', 'efficiency', 'productivity'] },
  { key: 'data_quality', terms: ['data', 'quality', 'dirty', 'incomplete', 'missing', 'inconsistent', 'duplicate', 'stale', 'outdated', 'silo', 'unstructured', 'labeling', 'labelled', 'ground truth', 'dataset', 'garbage'] },
  { key: 'governance', terms: ['governance', 'compliance', 'policy', 'regulation', 'regulatory', 'legal', 'privacy', 'security', 'risk', 'audit', 'approval', 'oversight', 'pii', 'gdpr', 'guardrail'] },
  { key: 'scope', terms: ['scope', 'creep', 'requirement', 'unclear', 'ambiguous', 'too broad', 'boil the ocean', 'everything', 'unbounded', 'vague', 'undefined', 'shifting', 'expanding'] },
  { key: 'latency_cost', terms: ['latency', 'slow', 'slowness', 'response time', 'lag', 'cost', 'expensive', 'pricey', 'token', 'spend', 'bill', 'compute', 'throughput', 'scale', 'scaling', 'performance'] },
  { key: 'hallucination', terms: ['hallucination', 'hallucinate', 'wrong', 'inaccurate', 'incorrect', 'made up', 'fabricat', 'confident', 'trust', 'reliability', 'reliable', 'accuracy', 'accurate', 'factual', 'error', 'mistake'] },
  { key: 'change_mgmt', terms: ['change management', 'resistance', 'resist', 'culture', 'buy-in', 'buy in', 'stakeholder', 'sponsor', 'leadership', 'executive', 'champion', 'communication', 'fear', 'job', 'skeptic'] },
  { key: 'integration', terms: ['integration', 'integrate', 'api', 'system', 'legacy', 'crm', 'erp', 'connect', 'connector', 'plumbing', 'pipeline', 'deployment', 'production', 'infrastructure', 'tooling'] },
  { key: 'use_case_fit', terms: ['use case', 'fit', 'wrong problem', 'solution looking', 'shiny', 'pilot', 'poc', 'proof of concept', 'demo', 'prototype', 'real world', 'edge case', 'narrow', 'mismatch'] },
];

const DIM = DIMENSIONS.length;

/**
 * @param {string} text
 * @returns {number[]} L2-normalized vector of length DIMENSIONS.length
 */
function embed(text) {
  const haystack = String(text || '').toLowerCase();
  const vec = new Array(DIM).fill(0);

  DIMENSIONS.forEach((dimension, i) => {
    let hits = 0;
    for (const term of dimension.terms) {
      // count overlapping occurrences of each term
      let idx = haystack.indexOf(term);
      while (idx !== -1) {
        hits += 1;
        idx = haystack.indexOf(term, idx + term.length);
      }
    }
    vec[i] = hits;
  });

  return normalize(vec);
}

function normalize(vec) {
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  if (mag === 0) return vec.slice();
  return vec.map((v) => v / mag);
}

/**
 * Cosine similarity for two equal-length vectors.
 * (Vectors from embed() are pre-normalized, so this is a dot product, but we
 * normalize defensively so externally-supplied vectors work too.)
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    ma += a[i] * a[i];
    mb += b[i] * b[i];
  }
  if (ma === 0 || mb === 0) return 0;
  return dot / (Math.sqrt(ma) * Math.sqrt(mb));
}

module.exports = { embed, cosineSimilarity, normalize, DIMENSIONS, EMBED_DIM: DIM };
