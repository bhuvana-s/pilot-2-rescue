'use strict';

/**
 * Amazon Bedrock Nova Pro reasoning engine, via the Converse API.
 *
 * Produces a grounded diagnosis: given the user's problem plus retrieved
 * failure patterns and canonical recommendations, it returns strict JSON
 * { rootCauses, recommendations, confidence }.
 */
const {
  BedrockRuntimeClient,
  ConverseCommand,
} = require('@aws-sdk/client-bedrock-runtime');

const config = require('../../config');

const client = new BedrockRuntimeClient({ region: config.AWS_REGION });

const SYSTEM_PROMPT = `You are an enterprise AI-adoption diagnostician. You help companies understand why their AI pilot failed or stalled and what to do next.

You are given the user's problem description plus a set of RETRIEVED failure patterns and canonical recommendations from a curated knowledge base. Ground your diagnosis in that retrieved context; do not invent unrelated causes.

Respond with STRICT JSON ONLY — no prose, no markdown, no code fences. Use exactly this schema:
{
  "rootCauses": [ { "cause": string, "evidence": string, "severity": "high"|"medium"|"low" } ],
  "recommendations": [ { "action": string, "rationale": string, "effort": "high"|"medium"|"low", "impact": "high"|"medium"|"low" } ],
  "confidence": number  // 0.0 - 1.0
}
Return 2-4 rootCauses and 3-5 recommendations.`;

function buildUserMessage(problemText, patterns, recommendations) {
  const patternBlock = patterns
    .map(
      (p, i) =>
        `${i + 1}. [${p.key}] ${p.name} (severity: ${p.severity}, match: ${(
          p.score || 0
        ).toFixed(3)})\n   ${p.description}`
    )
    .join('\n');

  const recBlock = recommendations
    .map((r) => `- (${r.patternKey}) ${r.action} — ${r.rationale} [effort:${r.effort}, impact:${r.impact}]`)
    .join('\n');

  return `USER PILOT PROBLEM:
"""
${problemText}
"""

RETRIEVED FAILURE PATTERNS (most similar first):
${patternBlock || '(none matched)'}

CANONICAL RECOMMENDATIONS FOR THOSE PATTERNS:
${recBlock || '(none)'}

Diagnose the most likely root causes and give prioritized recommendations. Respond with strict JSON only.`;
}

/** Extract a JSON object from a model response that may include stray text/fences. */
function extractJson(text) {
  if (!text) return null;
  let cleaned = text.trim();
  // strip ```json ... ``` fences if present
  cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    /* fall through to brace extraction */
  }
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(cleaned.slice(first, last + 1));
    } catch (_) {
      return null;
    }
  }
  return null;
}

/** Build a deterministic fallback diagnosis straight from retrieved data. */
function fallbackDiagnosis(patterns, recommendations) {
  return {
    rootCauses: patterns.slice(0, 3).map((p) => ({
      cause: p.name,
      evidence: p.description,
      severity: p.severity || 'medium',
    })),
    recommendations: recommendations.slice(0, 4).map((r) => ({
      action: r.action,
      rationale: r.rationale,
      effort: r.effort,
      impact: r.impact,
    })),
    confidence: 0.4,
    fallback: true,
  };
}

/**
 * @returns {Promise<{diagnosis: object, raw?: string}>}
 */
async function diagnose(problemText, patterns, recommendations) {
  const command = new ConverseCommand({
    modelId: config.BEDROCK_MODEL_ID,
    system: [{ text: SYSTEM_PROMPT }],
    messages: [
      {
        role: 'user',
        content: [{ text: buildUserMessage(problemText, patterns, recommendations) }],
      },
    ],
    inferenceConfig: {
      temperature: config.TEMPERATURE,
      maxTokens: config.MAX_TOKENS,
    },
  });

  const response = await client.send(command);
  const text = response?.output?.message?.content?.[0]?.text || '';
  const parsed = extractJson(text);

  if (parsed && Array.isArray(parsed.rootCauses)) {
    return { diagnosis: parsed, raw: text };
  }
  console.warn('[bedrock] could not parse model JSON, using fallback');
  return { diagnosis: fallbackDiagnosis(patterns, recommendations), raw: text };
}

/** Lightweight reachability check for /api/health. */
async function ping() {
  const command = new ConverseCommand({
    modelId: config.BEDROCK_MODEL_ID,
    messages: [{ role: 'user', content: [{ text: 'ping' }] }],
    inferenceConfig: { maxTokens: 5, temperature: 0 },
  });
  await client.send(command);
  return true;
}

module.exports = { diagnose, ping, extractJson, fallbackDiagnosis };
