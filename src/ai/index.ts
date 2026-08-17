// The swap point. To go live, change the one line below to
// `new ClaudeAIService(...)` - every screen imports `ai` from here, so nothing
// else in the app needs to change.

import { MockAIService } from './MockAIService';
import type { AIService } from './types';

export const ai: AIService = new MockAIService({ latencyMs: 450 });

export * from './types';
