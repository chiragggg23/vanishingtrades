import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { admin } from '../../../api/index.js';
import { useAsync } from '../../../hooks/useAsync.js';
import { formatDate } from '../../../lib/format.js';
import { Panel } from '../../../components/dash/DashShell.jsx';
import Pagination from '../../../components/ui/Pagination.jsx';
import { AsyncView, EmptyScene } from '../../../components/ui/Scenes.jsx';

const describe = (e, t) => {
  const d = e.details || {};
  switch (e.action) {
    case 'user.role':
      return t('audit.role', { name: d.name, from: t(`role.${d.from}`), to: t(`role.${d.to}`) });
    case 'user.pause':
      return t('audit.pause', { name: d.name });
    case 'user.reactivate':
      return t('audit.reactivate', { name: d.name });
    case 'flag.dismiss':
      return t('audit.flagDismiss', { label: d.label || e.targetId });
    case 'flag.remove':
      return t('audit.flagRemove', { label: d.label || e.targetId });
    case 'story.remove':
      return t('audit.storyRemove', { label: d.title || e.targetId });
    case 'craft.remove':
      return t('audit.craftRemove', { label: d.title || e.targetId });
    default:
      return `${e.action} ${e.targetType} ${e.targetId}`;
  }
};

export default function AuditTab() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const state = useAsync(() => admin.audit({ page, limit: 20 }), [page]);
  return (
    <Panel title={t('admin.auditTitle')} id="audit-title">
      <AsyncView state={state} empty={<EmptyScene art="chisel" title={t('admin.noAudit')} />}>
        {(data) => (
          <>
            <div className="table-wrap">
              <table className="ledger">
                <caption className="visually-hidden">{t('admin.auditTitle')}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t('admin.when')}</th>
                    <th scope="col">{t('admin.who')}</th>
                    <th scope="col">{t('admin.what')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((e) => (
                    <tr key={e.id}>
                      <td>
                        {formatDate(e.createdAt, i18n.language, {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <th scope="row">{e.actor.name}</th>
                      <td>{describe(e, t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={data.pagination} onPage={setPage} />
          </>
        )}
      </AsyncView>
    </Panel>
  );
}
