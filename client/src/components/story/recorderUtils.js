// Pure helpers for the recorder, kept separate so they can be unit tested.

export const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2', // Safari
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/aac',
];

/** First mimeType this browser's MediaRecorder can produce, or '' to let the browser choose. */
export function pickMimeType(MR = typeof MediaRecorder !== 'undefined' ? MediaRecorder : null) {
  if (!MR || typeof MR.isTypeSupported !== 'function') return '';
  return MIME_CANDIDATES.find((t) => MR.isTypeSupported(t)) || '';
}

export function extensionFor(mime) {
  const base = String(mime || '').split(';')[0];
  return (
    {
      'audio/webm': 'webm',
      'audio/mp4': 'm4a',
      'audio/ogg': 'ogg',
      'audio/aac': 'aac',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
    }[base] || 'webm'
  );
}

/** Can this browser record at all? */
export function canRecord(w = typeof window !== 'undefined' ? window : {}) {
  return Boolean(w.navigator?.mediaDevices?.getUserMedia && w.MediaRecorder);
}

/** RMS level 0..1 from a time-domain byte buffer (128 = silence). */
export function levelFromBytes(bytes) {
  let sum = 0;
  for (let i = 0; i < bytes.length; i++) {
    const v = (bytes[i] - 128) / 128;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / (bytes.length || 1));
  return Math.min(1, rms * 3.2);
}

/** Map getUserMedia errors to a message key. */
export function micErrorKey(err) {
  const name = err?.name || '';
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError')
    return 'recorder.blocked';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'recorder.noMic';
  if (name === 'NotReadableError') return 'recorder.busy';
  return 'recorder.failed';
}

/** Read a file's duration through an <audio> element. Resolves to seconds (>= 1). */
export function measureFileDuration(file) {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const a = new Audio();
      a.preload = 'metadata';
      const done = (d) => {
        URL.revokeObjectURL(url);
        resolve(Math.max(1, Math.min(1800, Number.isFinite(d) && d > 0 ? d : 1)));
      };
      a.onloadedmetadata = () => {
        if (Number.isFinite(a.duration)) return done(a.duration);
        // Chrome reports Infinity for some webm files until it seeks to the end.
        a.currentTime = 1e7;
        a.ontimeupdate = () => {
          a.ontimeupdate = null;
          done(a.duration);
        };
      };
      a.onerror = () => done(1);
      a.src = url;
    } catch {
      resolve(1);
    }
  });
}
