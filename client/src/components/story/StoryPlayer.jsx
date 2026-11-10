import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mediaUrl } from '../../api/index.js';
import { synthHumWav } from '../../../../shared/wav.js';
import { formatDuration } from '../../lib/format.js';
import { SampleStamp } from '../ui/Badges.jsx';
import Cassette from './Cassette.jsx';
import s from './StoryPlayer.module.css';

const SKIP = 5;

/** Turn the API's audioUrl into something an <audio> element can play (or null). */
function resolveSource(story) {
  const url = story.audioUrl;
  if (!url) return null;
  if (url.startsWith('sample:hum:')) {
    const bytes = synthHumWav(url, story.durationSec || 20);
    return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
  }
  if (url.startsWith('mock-upload:')) return null;
  return mediaUrl(url);
}

/**
 * Cassette-style story player. Never autoplays. Keyboard: Space/K play-pause, ←/→ 5 s, M mute.
 * onFirstPlay is called once, on the first playback the listener starts.
 */
export default function StoryPlayer({ story, onFirstPlay }) {
  const { t } = useTranslation();
  const audioRef = useRef(null);
  const srcRef = useRef(null);
  const counted = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(story.durationSec || 0);
  const [muted, setMuted] = useState(false);
  const [view, setView] = useState(story.language === 'en' ? 'original' : 'translation');
  const [problem, setProblem] = useState(null);

  const hasAudio = Boolean(story.audioUrl);
  const unplayable = hasAudio && story.audioUrl.startsWith('mock-upload:');

  useEffect(
    () => () => {
      if (srcRef.current?.startsWith('blob:')) URL.revokeObjectURL(srcRef.current);
    },
    [],
  );

  const ensureSource = () => {
    const a = audioRef.current;
    if (!a || srcRef.current) return Boolean(srcRef.current);
    const src = resolveSource(story);
    if (!src) return false;
    srcRef.current = src;
    a.src = src;
    return true;
  };

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (!a.paused) {
      a.pause();
      return;
    }
    if (!ensureSource()) {
      setProblem(t('player.unplayable'));
      return;
    }
    try {
      await a.play();
      if (!counted.current) {
        counted.current = true;
        onFirstPlay?.();
      }
    } catch {
      setProblem(t('player.cannotPlay'));
    }
  };
  const seek = (to) => {
    const a = audioRef.current;
    if (!a) return;
    if (!srcRef.current) ensureSource();
    const max = a.duration && Number.isFinite(a.duration) ? a.duration : duration;
    a.currentTime = Math.max(0, Math.min(max || 0, to));
    setTime(a.currentTime);
  };
  const toggleMute = () => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = !a.muted;
    setMuted(a.muted);
  };

  const onKeyDown = (e) => {
    const tag = e.target.tagName;
    if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
      if (tag === 'BUTTON' && e.key === ' ') return; // the button handles Space itself
      e.preventDefault();
      toggle();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (tag === 'INPUT') return; // the range slider handles arrows natively
      e.preventDefault();
      seek(time + (e.key === 'ArrowLeft' ? -SKIP : SKIP));
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      toggleMute();
    }
  };

  const segments = view === 'original' ? story.transcript : story.translation;
  const timed = segments.some((x) => typeof x.start === 'number');
  const currentIdx = useMemo(
    () =>
      timed ? segments.findIndex((x) => x.start !== null && time >= x.start && time < x.end) : -1,
    [segments, time, timed],
  );
  const segLang = view === 'original' ? story.language : 'en';

  return (
    <div className={s.player}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className={s.deck}
        role="group"
        aria-label={t('player.label', { title: story.title })}
        onKeyDown={onKeyDown}
      >
        <audio
          ref={audioRef}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) =>
            Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)
          }
          onError={() => srcRef.current && setProblem(t('player.cannotPlay'))}
        >
          <track kind="captions" />
        </audio>
        <Cassette
          spinning={playing}
          progress={duration ? time / duration : 0}
          label={story.title}
        />
        {hasAudio && !unplayable ? (
          <>
            <div className={s.controls}>
              <button
                type="button"
                className={s.big}
                onClick={() => seek(time - SKIP)}
                aria-label={t('player.back')}
              >
                <span aria-hidden="true">−5</span>
              </button>
              <button type="button" className={`${s.big} ${s.play}`} onClick={toggle}>
                {playing ? t('player.pause') : t('player.play')}
              </button>
              <button
                type="button"
                className={s.big}
                onClick={() => seek(time + SKIP)}
                aria-label={t('player.forward')}
              >
                <span aria-hidden="true">+5</span>
              </button>
              <button type="button" className={s.big} aria-pressed={muted} onClick={toggleMute}>
                {muted ? t('player.unmute') : t('player.mute')}
              </button>
            </div>
            <div className={s.scrub}>
              <span className={s.time} aria-hidden="true">
                {formatDuration(time)}
              </span>
              <input
                type="range"
                min={0}
                max={Math.max(1, Math.round(duration))}
                step={1}
                value={Math.round(time)}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label={t('player.position')}
                aria-valuetext={t('player.positionText', {
                  at: formatDuration(time),
                  total: formatDuration(duration),
                })}
                className={s.range}
              />
              <span className={s.time} aria-hidden="true">
                {formatDuration(duration)}
              </span>
            </div>
            <p className={s.keys}>{t('player.keys')}</p>
            {story.audioIsSample && (
              <p className={s.note}>
                <SampleStamp /> {t('player.sampleAudio')}
              </p>
            )}
          </>
        ) : (
          <p className={s.note}>{unplayable ? t('player.unplayable') : t('player.noAudio')}</p>
        )}
        {problem && (
          <p className={s.problem} role="alert">
            {problem}
          </p>
        )}
      </div>

      {(story.transcript.length > 0 || story.translation.length > 0) && (
        <section className={s.transcript} aria-labelledby="transcript-title">
          <div className={s.tHead}>
            <h2 id="transcript-title" className={s.tTitle}>
              {t('player.transcript')}
            </h2>
            {story.language !== 'en' && (
              <div className={s.switch} role="group" aria-label={t('player.textChoice')}>
                <button
                  type="button"
                  aria-pressed={view === 'original'}
                  onClick={() => setView('original')}
                >
                  {t('player.original', { lang: t(`lang.name.${story.language}`) })}
                </button>
                <button
                  type="button"
                  aria-pressed={view === 'translation'}
                  onClick={() => setView('translation')}
                >
                  {t('player.english')}
                </button>
              </div>
            )}
          </div>
          {story.ai?.isSample && view === 'translation' && story.language !== 'en' && (
            <p className={s.note}>
              <SampleStamp /> {t('player.sampleAi')}
            </p>
          )}
          <ol className={s.segments} lang={segLang}>
            {segments.map((seg, i) => (
              <li key={seg.id} className={i === currentIdx ? s.current : undefined}>
                {typeof seg.start === 'number' && hasAudio && !unplayable ? (
                  <button type="button" className={s.segBtn} onClick={() => seek(seg.start)}>
                    <span className={s.stamp}>{formatDuration(seg.start)}</span>
                    <span>{seg.text}</span>
                  </button>
                ) : (
                  <p className={s.segText}>{seg.text}</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
