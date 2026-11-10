import { useTranslation } from 'react-i18next';
import { enquiries } from '../../../api/index.js';
import { useAsync } from '../../../hooks/useAsync.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { Panel } from '../../../components/dash/DashShell.jsx';
import EnquiryThread from '../../../components/dash/EnquiryThread.jsx';
import { AsyncView, EmptyScene } from '../../../components/ui/Scenes.jsx';
import s from '../../../components/dash/Dash.module.css';

/** Enquiry inbox, shared by the artisan inbox and the buyer's list. */
export default function InboxTab({ title }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const state = useAsync(() => enquiries.list({ limit: 50 }), []);
  const replace = (e) =>
    state.setData((page) => ({ ...page, items: page.items.map((x) => (x.id === e.id ? e : x)) }));
  return (
    <Panel title={title || t('inbox.title')} id="inbox-title">
      <AsyncView
        state={state}
        empty={
          <EmptyScene
            art="spinning"
            title={user.role === 'buyer' ? t('inbox.emptyBuyer') : t('inbox.empty')}
          />
        }
      >
        {(page) => (
          <ul className={s.list}>
            {page.items.map((e) => (
              <EnquiryThread key={e.id} enquiry={e} me={user} onChange={replace} />
            ))}
          </ul>
        )}
      </AsyncView>
    </Panel>
  );
}
