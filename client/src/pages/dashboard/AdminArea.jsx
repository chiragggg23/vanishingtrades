import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import DashShell from '../../components/dash/DashShell.jsx';
import StampButton from '../../components/ui/StampButton.jsx';
import UsersTab from './admin/UsersTab.jsx';
import ModerationTab from './admin/ModerationTab.jsx';
import AuditTab from './admin/AuditTab.jsx';
import ImpactTab from './admin/ImpactTab.jsx';

const TABS = ['impact', 'users', 'moderation', 'audit'];

export default function AdminArea() {
  const { tab = 'impact' } = useParams();
  const { t } = useTranslation();
  usePageTitle(t('dash.adminTitle'));
  if (!TABS.includes(tab)) return <Navigate to="/admin" replace />;
  return (
    <DashShell
      title={t('dash.adminTitle')}
      lede={t('dash.adminLede')}
      aside={
        <StampButton to="/dashboard/reviewer" variant="ghost" size="sm">
          {t('dash.reviewQueue')}
        </StampButton>
      }
      tabs={TABS.map((k) => ({
        to: k === 'impact' ? '/admin' : `/admin/${k}`,
        end: true,
        label: t(`admin.tab.${k}`),
      }))}
    >
      {tab === 'impact' && <ImpactTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'moderation' && <ModerationTab />}
      {tab === 'audit' && <AuditTab />}
    </DashShell>
  );
}
