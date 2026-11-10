// AI provider interface: process(story) -> { transcript, translation, summary, ai }.
// AI_PROVIDER=mock (default) uses the deterministic sample provider shared with the browser mock.
// AI_PROVIDER=groq uses Groq's free tier (Whisper for speech, an LLM for translation and summary)
// and falls back to the mock provider on any failure or timeout.
import { config } from '../../config/env.js';
import { mockProvider } from './mockProvider.js';
import { groqProvider } from './groqProvider.js';

const providers = { mock: mockProvider, groq: groqProvider };

export function currentProvider() {
  const p = providers[config.ai.provider];
  if (!p || (config.ai.provider === 'groq' && !config.ai.groqKey)) return mockProvider;
  return p;
}

export async function processStory(story, { loadAudio } = {}) {
  const provider = currentProvider();
  if (provider === mockProvider) return mockProvider.process(story);
  try {
    return await provider.process(story, { loadAudio });
  } catch (err) {
    console.warn(`[ai] ${provider.name} failed, using the sample provider: ${err.message}`);
    return mockProvider.process(story);
  }
}
