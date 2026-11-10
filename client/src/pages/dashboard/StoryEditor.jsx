import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ai, artisans, stories } from '../../api/index.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useForm } from '../../hooks/useForm.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useToast } from '../../context/ToastContext.jsx';
import { schemas } from '../../../../shared/validation.js';
import { CRAFT_KEYS, STORY_LANGS } from '../../../../shared/constants.js';
import DashShell, { Panel } from '../../components/dash/DashShell.jsx';
import SegmentsEditor from '../../components/story/SegmentsEditor.jsx';
import StoryPlayer from '../../components/story/StoryPlayer.jsx';
import { FormErrors, FormField } from '../../components/ui/Form.jsx';
import StampButton from '../../components/ui/StampButton.jsx';
import { SampleStamp, StatusBadge } from '../../components/ui/Badges.jsx';
import { AsyncView, LoadingScene } from '../../components/ui/Scenes.jsx';
import { SpinningWheel } from '../../components/art/Illustrations.jsx';
import s from '../../components/dash/Dash.module.css';

// The recorder (MediaRecorder + Web Audio) is only loaded when an artisan opens a story.
const StoryRecorder = lazy(() => import('../../components/story/StoryRecorder.jsx'));

function NewStory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const me = useAsync(() => artisans.mine(), []);
  const form = useForm(
    { title: '', language: 'kn', craftType: '', text: '' },
    { schema: schemas.storyCreate },
  );
  useEffect(() => {
    if (me.data && !form.values.craftType) form.set('craftType', me.data.craftType);
  }, [me.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const onSubmit = async (e) => {
    e.preventDefault();
    const body = { ...form.values, craftType: form.values.craftType || undefined };
    const r = await form.submit((b) => stories.create(b), body);
    if (r.ok) navigate(`/dashboard/artisan/stories/${r.result.id}`, { replace: true });
  };
  const v = form.values;
  return (
    <Panel title={t('editor.newTitle')} id="new-story">
      <p className="muted">{t('editor.newLede')}</p>
      <form onSubmit={onSubmit} noValidate>
        <FormErrors message={form.message} />
        <div className={s.formGrid}>
          <FormField
            label={t('editor.title')}
            error={form.errors.title}
            count={v.title.length}
            max={120}
            required
            className={s.full}
          >
            <input type="text" lang={v.language} {...form.bind('title')} />
          </FormField>
          <FormField label={t('editor.language')} error={form.errors.language} required>
            <select {...form.bind('language')}>
              {STORY_LANGS.map((l) => (
                <option key={l} value={l}>
                  {t(`lang.name.${l}`)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t('editor.craft')} error={form.errors.craftType}>
            <select {...form.bind('craftType')}>
              {CRAFT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {t(`craft.${k}`)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label={t('editor.text')}
            hint={t('editor.textHint')}
            error={form.errors.text}
            count={v.text.length}
            max={5000}
            className={s.full}
          >
            <textarea rows={6} lang={v.language} {...form.bind('text')} />
          </FormField>
        </div>
        <StampButton type="submit" busy={form.submitting}>
          {t('editor.create')}
        </StampButton>
      </form>
    </Panel>
  );
}

function Editor({ initial }) {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const [story, setStory] = useState(initial);
  const [step, setStep] = useState(null); // 'upload' | 'ai' | 'submit' | 'delete'
  const [confirmDelete, setConfirmDelete] = useState(false);
  const toForm = (st) => ({
    title: st.title,
    language: st.language,
    craftType: st.craftType,
    text: st.text,
    transcript: st.transcript,
    translation: st.translation,
    summary: st.summary.en,
    tags: st.tags.join(', '),
  });
  const form = useForm(toForm(initial), { schema: schemas.storyUpdate, partial: true });
  const v = form.values;
  const editable = ['draft', 'rejected'].includes(story.status);
  const accept = (st) => {
    setStory(st);
    form.setValues(toForm(st));
  };
  const body = () => ({
    title: v.title,
    language: v.language,
    craftType: v.craftType,
    text: v.text,
    transcript: v.transcript.map(({ start, end, text }) => ({ start, end, text })),
    translation: v.translation.map(({ start, end, text }) => ({ start, end, text })),
    summary: { en: v.summary },
    tags: String(v.tags)
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
  });
  const save = async () => {
    const r = await form.submit((b) => stories.update(story.id, b), body());
    if (r.ok) {
      accept(r.result);
      toast.success(t('editor.saved'));
    }
    return r.ok;
  };
  const run = async (name, fn, okMsg) => {
    setStep(name);
    try {
      const st = await fn();
      if (st) accept(st);
      if (okMsg) toast.success(okMsg);
      return true;
    } catch (err) {
      if (err.errors) form.setErrors(err.errors);
      toast.error(err.message);
      return false;
    } finally {
      setStep(null);
    }
  };
  const onAudio = ({ file, durationSec }) =>
    run('upload', () => stories.uploadAudio(story.id, file, durationSec), t('editor.audioSaved'));
  const onProcess = async () => {
    // Save edits first so the AI works on what the artisan sees.
    if (!(await save())) return;
    await run('ai', () => ai.processStory(story.id), t('editor.aiDone'));
  };
  const onSubmitForReview = async () => {
    if (!(await save())) return;
    await run('submit', () => stories.submit(story.id), t('editor.submitted'));
  };
  const onDelete = async () => {
    const ok = await run(
      'delete',
      () => stories.remove(story.id).then(() => null),
      t('editor.deleted'),
    );
    if (ok) navigate('/dashboard/artisan', { replace: true });
  };

  return (
    <>
      <Panel title={story.title} id="story-head" actions={<StatusBadge status={story.status} />}>
        {story.status === 'rejected' && story.reviewNote && (
          <p className={s.note}>
            <strong>{t('myStories.reviewerSaid')}</strong> {story.reviewNote}
          </p>
        )}
        {story.status === 'pending' && <p>{t('editor.pendingNote')}</p>}
        {story.status === 'approved' && (
          <p>
            {t('editor.approvedNote')}{' '}
            <Link to={`/archive/${story.id}`}>{t('editor.seeInArchive')}</Link>
          </p>
        )}
      </Panel>

      {editable && (
        <Panel title={t('editor.recordTitle')} id="record-title">
          <p className="muted">{t('editor.recordLede')}</p>
          <Suspense fallback={<LoadingScene />}>
            <StoryRecorder onReady={onAudio} busy={step === 'upload'} />
          </Suspense>
          {story.audioUrl && (
            <p style={{ marginTop: 'var(--s4)', fontWeight: 700 }}>
              {t('editor.hasAudio', { secs: Math.round(story.durationSec || 0) })}
            </p>
          )}
        </Panel>
      )}

      {editable && (
        <Panel title={t('editor.aiTitle')} id="ai-title">
          <p className="muted">{t('editor.aiLede')}</p>
          {step === 'ai' ? (
            <div role="status" style={{ display: 'flex', gap: 'var(--s4)', alignItems: 'center' }}>
              <div style={{ width: 90 }} aria-hidden="true">
                <SpinningWheel />
              </div>
              <p className="hand">{t('editor.aiWorking')}</p>
            </div>
          ) : (
            <StampButton variant="madder" onClick={onProcess} disabled={step !== null}>
              {story.ai ? t('editor.aiAgain') : t('editor.aiRun')}
            </StampButton>
          )}
          {story.ai?.isSample && (
            <p style={{ marginTop: 'var(--s3)' }}>
              <SampleStamp /> {t('editor.aiSample')}
            </p>
          )}
        </Panel>
      )}

      {editable ? (
        <Panel title={t('editor.reviewTitle')} id="review-title">
          <p className="muted">{t('editor.reviewLede')}</p>
          <FormErrors message={form.message} />
          <div className={s.formGrid}>
            <FormField
              label={t('editor.title')}
              error={form.errors.title}
              count={v.title.length}
              max={120}
              required
              className={s.full}
            >
              <input type="text" lang={v.language} {...form.bind('title')} />
            </FormField>
            <FormField label={t('editor.language')} error={form.errors.language}>
              <select {...form.bind('language')}>
                {STORY_LANGS.map((l) => (
                  <option key={l} value={l}>
                    {t(`lang.name.${l}`)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              label={t('editor.tags')}
              hint={t('editor.tagsHint')}
              error={form.errors.tags}
            >
              <input type="text" {...form.bind('tags')} />
            </FormField>
            <FormField
              label={t('editor.text')}
              error={form.errors.text}
              count={v.text.length}
              max={5000}
              className={s.full}
            >
              <textarea rows={5} lang={v.language} {...form.bind('text')} />
            </FormField>
            <SegmentsEditor
              legend={t('editor.transcript')}
              segments={v.transcript}
              onChange={(x) => form.set('transcript', x)}
              lang={v.language}
              errors={form.errors}
              prefix="transcript"
            />
            <SegmentsEditor
              legend={t('editor.translation')}
              segments={v.translation}
              onChange={(x) => form.set('translation', x)}
              lang="en"
              errors={form.errors}
              prefix="translation"
            />
            <FormField
              label={t('editor.summary')}
              error={form.errors['summary.en']}
              count={v.summary.length}
              max={600}
              className={s.full}
            >
              <textarea rows={3} lang="en" {...form.bind('summary')} />
            </FormField>
          </div>
          {form.errors.transcript && <p className={s.note}>{form.errors.transcript}</p>}
          <div className={s.actions}>
            <StampButton variant="ghost" onClick={save} busy={form.submitting && step === null}>
              {t('editor.save')}
            </StampButton>
            <StampButton onClick={onSubmitForReview} busy={step === 'submit'}>
              {story.status === 'rejected' ? t('editor.resubmit') : t('editor.submit')}
            </StampButton>
            {confirmDelete ? (
              <>
                <StampButton variant="danger" onClick={onDelete} busy={step === 'delete'}>
                  {t('common.confirmDelete')}
                </StampButton>
                <button type="button" className={s.linkBtn} onClick={() => setConfirmDelete(false)}>
                  {t('common.keep')}
                </button>
              </>
            ) : (
              <button type="button" className={s.linkBtn} onClick={() => setConfirmDelete(true)}>
                {t('editor.delete')}
              </button>
            )}
          </div>
        </Panel>
      ) : (
        <Panel title={t('editor.preview')} id="preview-title">
          <StoryPlayer story={story} />
        </Panel>
      )}
    </>
  );
}

export default function StoryEditor() {
  const { id } = useParams();
  const { t } = useTranslation();
  usePageTitle(t('editor.pageTitle'));
  const state = useAsync(() => (id === 'new' ? Promise.resolve(null) : stories.getOne(id)), [id]);
  return (
    <DashShell
      title={id === 'new' ? t('editor.newTitle') : t('editor.pageTitle')}
      aside={
        <Link
          to="/dashboard/artisan"
          style={{ fontWeight: 700, minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
        >
          {t('editor.backToStories')}
        </Link>
      }
    >
      {id === 'new' ? (
        <NewStory />
      ) : (
        <AsyncView state={state} isEmpty={() => false}>
          {(st) => <Editor key={st.id} initial={st} />}
        </AsyncView>
      )}
    </DashShell>
  );
}
