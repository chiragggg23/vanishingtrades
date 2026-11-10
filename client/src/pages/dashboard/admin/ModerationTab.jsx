import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { admin, archive, crafts, stories } from '../../../api/index.js';
import { useAsync } from '../../../hooks/useAsync.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { localize } from '../../../i18n/index.js';
import { formatDate } from '../../../lib/format.js';
import { Panel } from '../../../components/dash/DashShell.jsx';
import { SearchBox, SelectFilter } from '../../../components/Filters.jsx';
import Pagination from '../../../components/ui/Pagination.jsx';
import StampButton from '../../../components/ui/StampButton.jsx';
import { StatusBadge } from '../../../components/ui/Badges.jsx';
import { AsyncView, EmptyScene } from '../../../components/ui/Scenes.jsx';
import s from '../../../components/dash/Dash.module.css';
import A from './Admin.module.css';

const targetLink = (f) =>
  f.targetType === 'story'
    ? `/dashboard/reviewer/${f.targetId}`
    : f.targetType === 'artisan'
      ? `/artisans/${f.targetId}`
      : null;

function Flags() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const state = useAsync(() => admin.flags({ status, page }), [status, page]);
  const [busy, setBusy] = useState(null);
  const resolve = async (f, action) => {
    setBusy(f.id + action);
    try {
      await admin.resolveFlag(f.id, action);
      toast.success(action === 'remove' ? t('admin.flagRemoved') : t('admin.flagDismissed'));
      state.reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <Panel
      title={t('admin.flagsTitle')}
      id="flags-title"
      actions={
        <div style={{ minWidth: '12rem' }}>
          <SelectFilter
            label={t('admin.show')}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={['open', 'resolved', 'all'].map((v) => ({
              value: v,
              label: t(`admin.flagStatus.${v}`),
            }))}
          />
        </div>
      }
    >
      <AsyncView state={state} empty={<EmptyScene art="loom" title={t('admin.noFlags')} />}>
        {(data) => (
          <>
            <ul className={s.list}>
              {data.items.map((f) => (
                <li key={f.id} className={s.row}>
                  <div className={s.rowMain}>
                    <p className={s.rowTitle}>
                      {t(`admin.target.${f.targetType}`)}:{' '}
                      {targetLink(f) ? (
                        <Link to={targetLink(f)}>{f.targetLabel || f.targetId}</Link>
                      ) : (
                        f.targetLabel || f.targetId
                      )}
                    </p>
                    <p>{f.reason}</p>
                    <p className={s.rowMeta}>
                      {t('admin.reportedBy', {
                        name: f.reporter.name,
                        date: formatDate(f.createdAt, i18n.language),
                      })}
                    </p>
                  </div>
                  <StatusBadge status={f.status} />
                  {f.status === 'open' ? (
                    <div className={s.actions}>
                      <StampButton
                        size="sm"
                        variant="ghost"
                        busy={busy === f.id + 'dismiss'}
                        onClick={() => resolve(f, 'dismiss')}
                      >
                        {t('admin.dismiss')}
                      </StampButton>
                      <StampButton
                        size="sm"
                        variant="danger"
                        busy={busy === f.id + 'remove'}
                        onClick={() => resolve(f, 'remove')}
                      >
                        {f.targetType === 'artisan' ? t('admin.pauseArtisan') : t('admin.remove')}
                      </StampButton>
                    </div>
                  ) : (
                    <p className={s.rowMeta}>{t(`admin.resolution.${f.resolution}`)}</p>
                  )}
                </li>
              ))}
            </ul>
            <Pagination pagination={data.pagination} onPage={setPage} />
          </>
        )}
      </AsyncView>
    </Panel>
  );
}

/** Find any public story or craft and take it down. */
function TakeDown() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [kind, setKind] = useState('story');
  const [q, setQ] = useState('');
  const state = useAsync(
    () => (kind === 'story' ? archive.list({ q, limit: 8 }) : crafts.list({ q, limit: 8 })),
    [kind, q],
  );
  const [confirm, setConfirm] = useState(null);
  const takeDown = async (item) => {
    try {
      if (kind === 'story') await stories.remove(item.id);
      else await crafts.remove(item.id);
      toast.success(t('admin.takenDown'));
      setConfirm(null);
      state.reload();
    } catch (err) {
      toast.error(err.message);
    }
  };
  return (
    <Panel title={t('admin.takeDownTitle')} id="takedown-title">
      <p className="muted">{t('admin.takeDownLede')}</p>
      <div className={A.filters}>
        <SelectFilter
          label={t('admin.kind')}
          value={kind}
          onChange={setKind}
          options={[
            { value: 'story', label: t('admin.target.story') },
            { value: 'craft', label: t('admin.target.craft') },
          ]}
        />
        <SearchBox value={q} onSearch={setQ} label={t('admin.findContent')} />
      </div>
      <AsyncView state={state} empty={<p className="muted">{t('admin.nothingFound')}</p>}>
        {(page) => (
          <ul className={s.list}>
            {page.items.map((item) => {
              const label = kind === 'story' ? item.title : localize(item.title, i18n.language);
              return (
                <li key={item.id} className={s.row}>
                  <div className={s.rowMain}>
                    <p className={s.rowTitle}>
                      <Link
                        to={
                          kind === 'story'
                            ? `/archive/${item.id}`
                            : `/artisans/${item.artisanId}?craft=${item.id}`
                        }
                      >
                        {label}
                      </Link>
                    </p>
                    <p className={s.rowMeta}>{item.artisan?.name}</p>
                  </div>
                  {confirm === item.id ? (
                    <div className={s.actions}>
                      <StampButton size="sm" variant="danger" onClick={() => takeDown(item)}>
                        {t('admin.confirmTakeDown')}
                      </StampButton>
                      <button type="button" className={s.linkBtn} onClick={() => setConfirm(null)}>
                        {t('common.keep')}
                      </button>
                    </div>
                  ) : (
                    <StampButton size="sm" variant="ghost" onClick={() => setConfirm(item.id)}>
                      {t('admin.takeDown')}
                      <span className="visually-hidden"> {label}</span>
                    </StampButton>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </AsyncView>
    </Panel>
  );
}

export default function ModerationTab() {
  return (
    <>
      <Flags />
      <TakeDown />
    </>
  );
}
