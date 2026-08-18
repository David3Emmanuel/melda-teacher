// The swap point. Every screen imports `ai` from here, so choosing the real
// model vs the mock happens once, in this file, and nothing else changes.
//
// Put a key in .env (git-ignored) to go live:
//   EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
//   EXPO_PUBLIC_ANTHROPIC_MODEL=claude-sonnet-5   # optional
// With no key we stay on the deterministic mock, so the demo runs fully offline.

import { ClaudeAIService } from './ClaudeAIService';
import { MockAIService } from './MockAIService';
import type { AIService } from './types';

const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
const model = process.env.EXPO_PUBLIC_ANTHROPIC_MODEL;

export const ai: AIService = apiKey
  ? new ClaudeAIService({ apiKey, model })
  : new MockAIService({ latencyMs: 450 });

export * from './types';
