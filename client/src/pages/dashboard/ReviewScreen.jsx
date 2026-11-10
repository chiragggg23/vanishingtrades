import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { review } from '../../api/index.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useForm } from '../../hooks/useForm.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useToast } from '../../context/ToastContext.jsx';
import { schemas } from '../../../../shared/validation.js';
import DashShell, { Panel } from '../../components/dash/DashShell.jsx';
import SegmentsEditor from '../../components/story/SegmentsEditor.jsx';
import StoryPlayer from '../../components/story/StoryPlayer.jsx';
import { FormErrors, FormField } from '../../components/ui/Form.jsx';
import StampButton from '../../components/ui/StampButton.jsx';
import { SampleStamp, StatusBadge } from '../../components/ui/Badges.jsx';
import { AsyncView } from '../../components/ui/Scenes.jsx';
import s from '../../components/dash/Dash.module.css';
import R from './Review.module.css';

function Review({ story }) {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState('read'); // read | edit
  const [busy, setBusy] = useState(null);
  const edits = useForm(
    {
      title: story.title,
      transcript: story.transcript,
      translation: story.translation,
      summary: story.summary.en,
    },
  );
  const reject = useForm({ note: '' }, { schema: schemas.reject });
  const [approveNote, setApproveNote] = useState('');
  const pending = story.status === 'pending';

  const approve = async (withEdits) => {
    const strip = (segs) => segs.map(({ start, end, text }) => ({ start, end, text }));
    const body = { note: approveNote || null };
    if (withEdits)
      body.edits = {
        title: edits.values.title,
        transcript: strip(edits.values.transcript),
        translation: strip(edits.values.translation),
        summary: { en: edits.values.summary },
      };
    setBusy(withEdits ? 'edit' : 'approve');
    const r = await edits.submit((b) => review.approve(story.id, b), body);
    setBusy(null);
    if (r.ok) {
      toast.success(t('reviewer.approved'));
      navigate('/dashboard/reviewer');
    }
  };
  const onReject = async (e) => {
    e.preventDefault();
    const r = await reject.submit((v) => review.reject(story.id, v.note));
    if (r.ok) {
      toast.success(t('reviewer.rejected'));
      navigate('/dashboard/reviewer');
    }
  };
  const editErrors = Object.fromEntries(
    Object.entries(edits.errors).map(([k, v]) => [k.replace(/^edits\./, ''), v]),
  );

  return (
    <>
      <Panel
        title={story.title}
        id="review-story"
        actions={<StatusBadge status={story.status} />}
      >
        <p className="muted" lang="en">
          {t('reviewer.by', { name: story.artisan?.name, lang: t(`lang.name.${story.language}`) })}
        </p>
        {story.ai?.isSample && (
          <p>
            <SampleStamp /> {t('reviewer.sampleAi')}
          </p>
        )}
        <StoryPlayer story={story} />
      </Panel>

      <Panel
        title={t('reviewer.compare')}
        id="compare-title"
        actions={
          pending && (
            <div className={R.switch} role="group" aria-label={t('reviewer.mode')}>
              <button type="button" aria-pressed={mode === 'read'} onClick={() => setMode('read')}>
                {t('reviewer.read')}
              </button>
              <button type="button" aria-pressed={mode === 'edit'} onClick={() => setMode('edit')}>
                {t('reviewer.edit')}
              </button>
            </div>
          )
        }
      >
        <FormErrors message={edits.message} />
        {mode === 'read' ? (
          <div className={R.sideBySide}>
            <section aria-labelledby="orig-h">
              <h3 id="orig-h">{t('reviewer.original', { lang: t(`lang.name.${story.language}`) })}</h3>
              <ol className={R.text} lang={story.language}>
                {story.transcript.map((x) => (
                  <li key={x.id}>{x.text}</li>
                ))}
              </ol>
              {story.text && story.transcript.length === 0 && <p lang={story.language}>{story.text}</p>}
            </section>
            <section aria-labelledby="tr-h">
              <h3 id="tr-h">{t('reviewer.translation')}</h3>
              <ol className={R.text} lang="en">
                {story.translation.map((x) => (
                  <li key={x.id}>{x.text}</li>
                ))}
              </ol>
              <h3>{t('reviewer.summary')}</h3>
              <p lang="en">{story.summary.en || t('reviewer.noSummary')}</p>
            </section>
          </div>
        ) : (
          <>
            <FormField label={t('editor.title')} error={editErrors.title} count={edits.values.title.length} max={120}>
              <input type="text" lang={story.language} {...edits.bind('title')} />
            </FormField>
            <div className={R.sideBySide}>
              <SegmentsEditor
                legend={t('reviewer.original', { lang: t(`lang.name.${story.language}`) })}
                segments={edits.values.transcript}
                onChange={(x) => edits.set('transcript', x)}
                lang={story.language}
                errors={editErrors}
                prefix="transcript"
              />
              <SegmentsEditor
                legend={t('reviewer.translation')}
                segments={edits.values.translation}
                onChange={(x) => edits.set('translation', x)}
                lang="en"
                errors={editErrors}
                prefix="translation"
              />
            </div>
            <FormField label={t('reviewer.summary')} error={editErrors['summary.en']} count={edits.values.summary.length} max={600}>
              <textarea rows={3} lang="en" {...edits.bind('summary')} />
            </FormField>
          </>
        )}
      </Panel>

      {pending ? (
        <div className={R.decide}>
          <Panel title={t('reviewer.approveTitle')} id="approve-title">
            <FormField label={t('reviewer.approveNote')} hint={t('reviewer.approveNoteHint')} count={approveNote.length} max={500}>
              <textarea rows={2} value={approveNote} onChange={(e) => setApproveNote(e.target.value)} />
            </FormField>
            <div className={s.actions}>
              {mode === 'edit' ? (
                <StampButton variant="leaf" busy={busy === 'edit'} onClick={() => approve(true)}>
                  {t('reviewer.editApprove')}
                </StampButton>
              ) : (
                <StampButton variant="leaf" busy={busy === 'approve'} onClick={() => approve(false)}>
                  {t('reviewer.approve')}
                </StampButton>
              )}
            </div>
          </Panel>
          <Panel title={t('reviewer.rejectTitle')} id="reject-title">
            <form onSubmit={onReject} noValidate>
              <FormErrors message={reject.message} />
              <FormField
                label={t('reviewer.rejectNote')}
                hint={t('reviewer.rejectHint')}
                error={reject.errors.note}
                count={reject.values.note.length}
                max={500}
                required
              >
                <textarea rows={3} {...reject.bind('note')} />
              </FormField>
              <StampButton type="submit" variant="danger" busy={reject.submitting}>
                {t('reviewer.reject')}
              </StampButton>
            </form>
          </Panel>
        </div>
      ) : (
        <p>{t('reviewer.notPending')}</p>
      )}
    </>
  );
}

export default function ReviewScreen() {
  const { storyId } = useParams();
  const { t } = useTranslation();
  usePageTitle(t('reviewer.screenTitle'));
  const state = useAsync(() => review.getOne(storyId), [storyId]);
  return (
    <DashShell
      title={t('reviewer.screenTitle')}
      aside={
        <Link to="/dashboard/reviewer" style={{ fontWeight: 700, minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>
          {t('reviewer.back')}
        </Link>
      }
    >
      <AsyncView state={state} isEmpty={() => false}>
        {(story) => <Review key={story.id} story={story} />}
      </AsyncView>
    </DashShell>
  );
}
