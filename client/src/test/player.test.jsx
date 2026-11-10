import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import StoryPlayer from '../components/story/StoryPlayer.jsx';
import { archive } from '../api/index.js';
import { oid } from '../../../shared/seed.js';
import { renderApp } from './utils.jsx';

async function setup(onFirstPlay = vi.fn()) {
  const story = await archive.getOne(oid('a4', 1)); // Kannada, sample audio, timed segments
  await renderApp({ ui: <StoryPlayer story={story} onFirstPlay={onFirstPlay} /> });
  const deck = screen.getByRole('group', { name: /Player for/ });
  const audio = document.querySelector('audio');
  return { story, deck, audio, onFirstPlay };
}

describe('StoryPlayer', () => {
  beforeEach(() => {
    HTMLMediaElement.prototype.play.mockClear();
  });

  it('never autoplays and does not preload', async () => {
    const { audio } = await setup();
    expect(audio).toHaveAttribute('preload', 'none');
    expect(audio.autoplay).toBe(false);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it('Space plays and pauses, and the first play is counted once', async () => {
    const { deck, onFirstPlay } = await setup();
    fireEvent.keyDown(deck, { key: ' ' });
    expect(await screen.findByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(onFirstPlay).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(deck, { key: ' ' });
    expect(await screen.findByRole('button', { name: 'Play' })).toBeInTheDocument();
    fireEvent.keyDown(deck, { key: 'k' });
    await screen.findByRole('button', { name: 'Pause' });
    expect(onFirstPlay).toHaveBeenCalledTimes(1);
  });

  it('arrow keys skip 5 seconds and M mutes', async () => {
    const { deck, audio } = await setup();
    fireEvent.keyDown(deck, { key: 'ArrowRight' });
    expect(audio.currentTime).toBe(5);
    fireEvent.keyDown(deck, { key: 'ArrowRight' });
    fireEvent.keyDown(deck, { key: 'ArrowLeft' });
    expect(audio.currentTime).toBe(5);
    fireEvent.keyDown(deck, { key: 'm' });
    expect(audio.muted).toBe(true);
    expect(screen.getByRole('button', { name: 'Unmute' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('highlights the current transcript segment and toggles the original text', async () => {
    const user = userEvent.setup();
    const { story, audio } = await setup();
    // English translation is shown first for a Kannada story.
    const first = screen.getByText(story.translation[0].text);
    audio.currentTime = story.translation[1].start + 0.1;
    fireEvent.timeUpdate(audio);
    const second = screen.getByText(story.translation[1].text).closest('li');
    expect(second.className).toMatch(/current/);
    expect(first.closest('li').className).not.toMatch(/current/);

    await user.click(screen.getByRole('button', { name: /Kannada \(original\)/ }));
    expect(screen.getByText(story.transcript[0].text)).toBeInTheDocument();
    expect(screen.getByText(story.transcript[0].text).closest('ol')).toHaveAttribute('lang', 'kn');
  });

  it('shows segments without times as plain text', async () => {
    const story = await archive.getOne(oid('a4', 4)); // English, text only
    await renderApp({ ui: <StoryPlayer story={story} /> });
    expect(
      screen.getByText('This story was written down rather than recorded.'),
    ).toBeInTheDocument();
    expect(screen.getByText(story.transcript[0].text).tagName).toBe('P');
  });
});
