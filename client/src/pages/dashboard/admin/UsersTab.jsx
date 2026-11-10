import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { admin } from '../../../api/index.js';
import { useAsync } from '../../../hooks/useAsync.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { ROLES } from '../../../../../shared/constants.js';
import { Panel } from '../../../components/dash/DashShell.jsx';
import { SearchBox, SelectFilter } from '../../../components/Filters.jsx';
import Pagination from '../../../components/ui/Pagination.jsx';
import StampButton from '../../../components/ui/StampButton.jsx';
import { StatusBadge } from '../../../components/ui/Badges.jsx';
import { AsyncView, EmptyScene } from '../../../components/ui/Scenes.jsx';
import A from './Admin.module.css';

function UserRow({ u, me, onChange }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [role, setRole] = useState(u.role);
  const [busy, setBusy] = useState(null);
  const self = u.id === me.id;
  const act = async (name, fn, msg) => {
    setBusy(name);
    try {
      const next = await fn();
      onChange(next);
      toast.success(msg(next));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <tr>
      <th scope="row">
        {u.name}
        {self && <span className="muted"> {t('admin.you')}</span>}
      </th>
      <td className={A.email}>{u.email}</td>
      <td>
        <label className="visually-hidden" htmlFor={`role-${u.id}`}>
          {t('admin.roleFor', { name: u.name })}
        </label>
        <div className={A.inline}>
          <select
            id={`role-${u.id}`}
            className="field-input"
            value={role}
            disabled={self}
            onChange={(e) => setRole(e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`role.${r}`)}
              </option>
            ))}
          </select>
          {role !== u.role && (
            <StampButton
              size="sm"
              busy={busy === 'role'}
              onClick={() =>
                act('role', () => admin.setRole(u.id, role), (n) => t('admin.roleChanged', { name: n.name, role: t(`role.${n.role}`) }))
              }
            >
              {t('admin.saveRole')}
            </StampButton>
          )}
        </div>
      </td>
      <td>
        <StatusBadge status={u.active ? 'active' : 'paused'} />
      </td>
      <td>
        {!self && (
          <StampButton
            size="sm"
            variant={u.active ? 'danger' : 'leaf'}
            busy={busy === 'active'}
            onClick={() =>
              act('active', () => admin.setActive(u.id, !u.active), (n) =>
                n.active ? t('admin.reactivated', { name: n.name }) : t('admin.paused', { name: n.name }),
              )
            }
          >
            {u.active ? t('admin.pause') : t('admin.reactivate')}
            <span className="visually-hidden"> {u.name}</span>
          </StampButton>
        )}
      </td>
    </tr>
  );
}

export default function UsersTab() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const [f, setF] = useState({ q: '', role: '', active: '', page: 1 });
  const state = useAsync(() => admin.users(f), [f.q, f.role, f.active, f.page]);
  const replace = (u) =>
    state.setData((page) => ({ ...page, items: page.items.map((x) => (x.id === u.id ? u : x)) }));
  return (
    <Panel title={t('admin.usersTitle')} id="users-title">
      <div className={A.filters}>
        <SearchBox value={f.q} onSearch={(q) => setF({ ...f, q, page: 1 })} label={t('admin.searchUsers')} />
        <SelectFilter
          label={t('admin.role')}
          value={f.role}
          allLabel={t('admin.allRoles')}
          onChange={(role) => setF({ ...f, role, page: 1 })}
          options={ROLES.map((r) => ({ value: r, label: t(`role.${r}`) }))}
        />
        <SelectFilter
          label={t('admin.state')}
          value={f.active}
          allLabel={t('admin.allStates')}
          onChange={(active) => setF({ ...f, active, page: 1 })}
          options={[
            { value: 'true', label: t('status.active') },
            { value: 'false', label: t('status.paused') },
          ]}
        />
      </div>
      <AsyncView state={state} empty={<EmptyScene art="emptyLoom" title={t('admin.noUsers')} />}>
        {(page) => (
          <>
            <div className="table-wrap">
              <table className="ledger">
                <caption className="visually-hidden">{t('admin.usersTitle')}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t('admin.name')}</th>
                    <th scope="col">{t('admin.email')}</th>
                    <th scope="col">{t('admin.role')}</th>
                    <th scope="col">{t('admin.state')}</th>
                    <th scope="col">{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {page.items.map((u) => (
                    <UserRow key={u.id} u={u} me={me} onChange={replace} />
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={page.pagination} onPage={(p) => setF({ ...f, page: p })} />
          </>
        )}
      </AsyncView>
    </Panel>
  );
}
