import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Cassette from './Cassette.jsx';
import { formatDuration } from '../../lib/format.js';
import {
  canRecord,
  extensionFor,
  levelFromBytes,
  measureFileDuration,
  micErrorKey,
  pickMimeType,
} from './recorderUtils.js';
import s from './StoryRecorder.module.css';

const MAX_SECONDS = 15 * 60;
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Cassette deck recorder. Really records with MediaRecorder, shows the live microphone level from
 * a Web Audio AnalyserNode, measures duration (excluding pauses), and offers a file-upload
 * fallback. Calls onReady({ file, durationSec }) when the artisan chooses to keep a take.
 */
export default function StoryRecorder({ onReady, busy = false }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState('idle'); // idle | asking | recording | paused | stopped
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState(null);
  const [take, setTake] = useState(null); // { blob, url, durationSec, mime }
  const [previewing, setPreviewing] = useState(false);
  const supported = canRecord();

  const rec = useRef(null);
  const stream = useRef(null);
  const chunks = useRef([]);
  const audioCtx = useRef(null);
  const raf = useRef(0);
  const clock = useRef({ started: 0, acc: 0 });
  const tick = useRef(0);
  const preview = useRef(null);

  const cleanupMedia = () => {
    cancelAnimationFrame(raf.current);
    clearInterval(tick.current);
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
    audioCtx.current?.close?.().catch(() => {});
    audioCtx.current = null;
    setLevel(0);
  };
  useEffect(
    () => () => {
      cleanupMedia();
      if (take?.url) URL.revokeObjectURL(take.url);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const runClock = () => {
    clearInterval(tick.current);
    tick.current = setInterval(() => {
      const c = clock.current;
      const secs = (c.acc + (performance.now() - c.started)) / 1000;
      setElapsed(secs);
      if (secs >= MAX_SECONDS) stop();
    }, 200);
  };

  const meter = (analyser) => {
    const buf = new Uint8Array(analyser.fftSize);
    let last = 0;
    const loop = (ts) => {
      analyser.getByteTimeDomainData(buf);
      if (ts - last > 60) {
        setLevel(levelFromBytes(buf));
        last = ts;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };

  const start = async () => {
    setError(null);
    setPhase('asking');
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      stream.current = media;
      const mime = pickMimeType();
      const recorder = mime ? new MediaRecorder(media, { mimeType: mime }) : new MediaRecorder(media);
      chunks.current = [];
      recorder.ondataavailable = (e) => e.data && e.data.size > 0 && chunks.current.push(e.data);
      recorder.onstop = () => {
        const type = recorder.mimeType || mime || 'audio/webm';
        const blob = new Blob(chunks.current, { type });
        const c = clock.current;
        const durationSec = Math.max(1, Math.round((c.acc / 1000) * 10) / 10);
        setTake((old) => {
          if (old?.url) URL.revokeObjectURL(old.url);
          return { blob, url: URL.createObjectURL(blob), durationSec, mime: type };
        });
        cleanupMedia();
        setPhase('stopped');
      };
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        audioCtx.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        ctx.createMediaStreamSource(media).connect(analyser);
        meter(analyser);
      }
      rec.current = recorder;
      recorder.start(1000);
      clock.current = { started: performance.now(), acc: 0 };
      setElapsed(0);
      runClock();
      setPhase('recording');
    } catch (err) {
      cleanupMedia();
      setError(t(micErrorKey(err)));
      setPhase('idle');
    }
  };

  const pause = () => {
    const r = rec.current;
    if (!r || r.state !== 'recording') return;
    r.pause();
    clock.current.acc += performance.now() - clock.current.started;
    clearInterval(tick.current);
    setPhase('paused');
  };
  const resume = () => {
    const r = rec.current;
    if (!r || r.state !== 'paused') return;
    r.resume();
    clock.current.started = performance.now();
    runClock();
    setPhase('recording');
  };
  function stop() {
    const r = rec.current;
    if (!r || r.state === 'inactive') return;
    if (r.state === 'recording') clock.current.acc += performance.now() - clock.current.started;
    clearInterval(tick.current);
    r.stop();
  }
  const reRecord = () => {
    preview.current?.pause();
    if (take?.url) URL.revokeObjectURL(take.url);
    setTake(null);
    setElapsed(0);
    setPhase('idle');
  };
  const togglePreview = () => {
    const a = preview.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setError(t('player.cannotPlay')));
    else a.pause();
  };
  const keep = () => {
    if (!take) return;
    if (take.blob.size > MAX_BYTES) {
      setError(t('recorder.tooBig'));
      return;
    }
    const file = new File([take.blob], `story.${extensionFor(take.mime)}`, { type: take.mime });
    onReady({ file, durationSec: take.durationSec });
  };
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError(t('recorder.tooBig'));
      return;
    }
    setError(null);
    const durationSec = await measureFileDuration(file);
    onReady({ file, durationSec });
  };

  const recording = phase === 'recording';
  const statusText = {
    idle: take ? t('recorder.ready') : t('recorder.idle'),
    asking: t('recorder.asking'),
    recording: t('recorder.recording'),
    paused: t('recorder.paused'),
    stopped: t('recorder.stopped'),
  }[phase];

  return (
    <div className={s.deck}>
      <div className={s.top}>
        <Cassette
          spinning={recording || previewing}
          progress={take && phase === 'stopped' ? 1 : Math.min(1, elapsed / 300)}
          label={t('recorder.tapeLabel')}
          level={level}
        />
        <div className={s.readout}>
          <p className={s.time} aria-hidden="true">
            {formatDuration(phase === 'stopped' && take ? take.durationSec : elapsed)}
          </p>
          <p className={s.status} role="status" aria-live="polite">
            {statusText}
          </p>
          <div className={s.meter} aria-hidden="true">
            <span style={{ transform: `scaleX(${Math.max(0.02, level)})` }} />
          </div>
          {recording && <span className={s.rec}>{t('recorder.recDot')}</span>}
        </div>
      </div>

      {supported ? (
        <div className={s.buttons}>
          {(phase === 'idle' || phase === 'asking') && !take && (
            <button
              type="button"
              className={`${s.btn} ${s.record}`}
              onClick={start}
              disabled={phase === 'asking' || busy}
            >
              <span className={s.dot} aria-hidden="true" /> {t('recorder.record')}
            </button>
          )}
          {phase === 'recording' && (
            <button type="button" className={s.btn} onClick={pause}>
              {t('recorder.pause')}
            </button>
          )}
          {phase === 'paused' && (
            <button type="button" className={s.btn} onClick={resume}>
              {t('recorder.resume')}
            </button>
          )}
          {(phase === 'recording' || phase === 'paused') && (
            <button type="button" className={`${s.btn} ${s.stop}`} onClick={stop}>
              {t('recorder.stop')}
            </button>
          )}
          {take && phase === 'stopped' && (
            <>
              <button type="button" className={s.btn} onClick={togglePreview}>
                {previewing ? t('recorder.pausePreview') : t('recorder.play')}
              </button>
              <button type="button" className={s.btn} onClick={reRecord} disabled={busy}>
                {t('recorder.reRecord')}
              </button>
              <button
                type="button"
                className={`${s.btn} ${s.keep}`}
                onClick={keep}
                disabled={busy}
                aria-busy={busy || undefined}
              >
                {busy ? t('recorder.saving') : t('recorder.keep')}
              </button>
              <audio
                ref={preview}
                src={take.url}
                preload="metadata"
                onPlay={() => setPreviewing(true)}
                onPause={() => setPreviewing(false)}
                onEnded={() => setPreviewing(false)}
              >
                <track kind="captions" />
              </audio>
            </>
          )}
        </div>
      ) : (
        <p className={s.notice}>{t('recorder.unsupported')}</p>
      )}

      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}

      <div className={s.fallback}>
        <label className={s.upload}>
          <span>{t('recorder.uploadInstead')}</span>
          <input
            type="file"
            accept="audio/webm,audio/mp4,audio/x-m4a,audio/m4a,audio/ogg,audio/mpeg,audio/wav,audio/*"
            onChange={onFile}
            disabled={busy}
          />
        </label>
        <p className={s.hint}>{t('recorder.uploadHint')}</p>
      </div>
    </div>
  );
}
