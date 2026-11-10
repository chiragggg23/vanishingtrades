// Real provider on Groq's free tier: Whisper for speech-to-text, an LLM for the English
// translation and summary. Every call has a timeout; files over 20 MB are refused.
import { config } from '../../config/env.js';
import { splitSentences, timeSegments } from '../../../../shared/mockAi.js';

const BASE = 'https://api.groq.com/openai/v1';
const MAX_AUDIO = 20 * 1024 * 1024;
const LANG_NAME = { kn: 'Kannada', hi: 'Hindi', en: 'English' };

async function call(path, init) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${config.ai.groqKey}`, ...(init.headers || {}) },
    signal: AbortSignal.timeout(config.ai.timeoutMs),
  });
  if (!res.ok) throw new Error(`Groq ${path} returned ${res.status}`);
  return res.json();
}

async function transcribe(audio, language) {
  if (audio.buffer.length > MAX_AUDIO) throw new Error('audio is over the 20 MB guard');
  const form = new FormData();
  form.append('file', new Blob([audio.buffer], { type: audio.mimetype }), 'story');
  form.append('model', config.ai.groqSpeechModel);
  form.append('language', language);
  form.append('response_format', 'verbose_json');
  const out = await call('/audio/transcriptions', { method: 'POST', body: form });
  const segs = (out.segments || [])
    .map((s, i) => ({
      id: `seg-${i + 1}`,
      start: Math.round(s.start * 10) / 10,
      end: Math.round(s.end * 10) / 10,
      text: String(s.text).trim(),
    }))
    .filter((s) => s.text);
  if (segs.length) return segs.slice(0, 200);
  return timeSegments(splitSentences(out.text || ''), null);
}

async function translateAndSummarise(segments, language) {
  const lines = segments.map((s, i) => `${i + 1}. ${s.text}`).join('\n');
  const prompt =
    `You are helping archive the oral history of an Indian craftsperson. The numbered lines below are in ${LANG_NAME[language]}. ` +
    'Translate each line into plain, faithful English, keeping the same numbering, then write a two-sentence summary. ' +
    'Reply with JSON only: {"lines": ["..."], "summary": "..."}.\n\n' +
    lines;
  const out = await call('/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.ai.groqTextModel,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const parsed = JSON.parse(out.choices?.[0]?.message?.content || '{}');
  const english = Array.isArray(parsed.lines) ? parsed.lines : [];
  if (english.length !== segments.length) throw new Error('translation line count did not match');
  return {
    translation: segments.map((s, i) => ({ ...s, text: String(english[i]).slice(0, 1000) })),
    summary: { en: String(parsed.summary || '').slice(0, 600) },
  };
}

export const groqProvider = {
  name: 'groq',
  async process(story, { loadAudio } = {}) {
    let transcript;
    if (story.audioUrl && loadAudio) {
      const audio = await loadAudio(story.audioUrl);
      if (!audio) throw new Error('could not read the stored audio');
      transcript = await transcribe(audio, story.language);
    } else {
      transcript = timeSegments(splitSentences(story.text), null);
    }
    if (!transcript.length) throw new Error('nothing to transcribe');
    const { translation, summary } =
      story.language === 'en'
        ? {
            translation: transcript,
            summary: {
              en: transcript
                .slice(0, 2)
                .map((s) => s.text)
                .join(' ')
                .slice(0, 600),
            },
          }
        : await translateAndSummarise(transcript, story.language);
    return {
      transcript,
      translation,
      summary,
      ai: { provider: 'groq', isSample: false, processedAt: new Date().toISOString() },
    };
  },
};
