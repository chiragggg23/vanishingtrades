// Deterministic sample AI used by the browser mock and by the server's mock provider.
const CANNED = {
  kn: 'ಇದು ಮಾದರಿ ಪ್ರತಿಲಿಪಿ. ನಿಜವಾದ ಧ್ವನಿಯನ್ನು ಇನ್ನೂ ಓದಿಲ್ಲ.',
  hi: 'यह नमूना प्रतिलिपि है। असली आवाज़ अभी पढ़ी नहीं गई है।',
  en: 'This is a sample transcript. The real recording has not been read yet.',
};

export function splitSentences(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.slice(0, 1000))
    .slice(0, 200);
}

export function timeSegments(texts, durationSec) {
  const n = texts.length;
  return texts.map((text, i) => {
    const has = typeof durationSec === 'number' && durationSec > 0;
    const start = has ? Math.round(((durationSec * i) / n) * 10) / 10 : null;
    const end = has ? Math.round(((durationSec * (i + 1)) / n) * 10) / 10 : null;
    return { id: `seg-${i + 1}`, start, end, text };
  });
}

/** Returns { transcript, translation, summary, ai } for a story-like object. */
export function mockProcess(story, now = new Date()) {
  let sentences = splitSentences(story.text);
  if (!sentences.length) sentences = splitSentences(CANNED[story.language] || CANNED.en);
  const hasAudio = Boolean(story.audioUrl);
  const duration = hasAudio ? story.durationSec : null;
  const transcript = timeSegments(sentences, duration);
  const translation = transcript.map((s) => ({
    ...s,
    text: story.language === 'en' ? s.text : `[Sample translation] ${s.text}`.slice(0, 1000),
  }));
  const summary = { en: `Sample summary: ${translation[0]?.text || ''}`.slice(0, 600) };
  return {
    transcript,
    translation,
    summary,
    ai: { provider: 'mock', isSample: true, processedAt: now.toISOString() },
  };
}
