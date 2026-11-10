import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { artisans } from '../../api/index.js';
import { useAsync } from '../../hooks/useAsync.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import DashShell from '../../components/dash/DashShell.jsx';
import SdgStamp from '../../components/ui/SdgStamp.jsx';
import ProfileTab from './artisan/ProfileTab.jsx';
import WorksTab from './artisan/WorksTab.jsx';
import StoriesTab from './artisan/StoriesTab.jsx';
import InboxTab from './artisan/InboxTab.jsx';
import OpeningsTab from './artisan/OpeningsTab.jsx';

const TABS = ['stories', 'works', 'enquiries', 'openings', 'profile'];

export default function ArtisanDashboard() {
  const { tab = 'stories' } = useParams();
  const { t } = useTranslation();
  usePageTitle(t('dash.artisanTitle'));
  const me = useAsync(() => artisans.mine(), []);
  if (!TABS.includes(tab)) return <Navigate to="/dashboard/artisan" replace />;
  const craftType = me.data?.craftType;
  return (
    <DashShell
      title={t('dash.artisanTitle')}
      lede={me.data ? t('dash.artisanLede', { name: me.data.name }) : ''}
      aside={<SdgStamp goal={8} size={78} rotate={6} caption={false} />}
      tabs={TABS.map((k) => ({
        to: k === 'stories' ? '/dashboard/artisan' : `/dashboard/artisan/${k}`,
        end: true,
        label: t(`dash.tab.${k}`),
      }))}
    >
      {tab === 'stories' && <StoriesTab />}
      {tab === 'works' && <WorksTab craftType={craftType} />}
      {tab === 'enquiries' && <InboxTab />}
      {tab === 'openings' && <OpeningsTab craftType={craftType} />}
      {tab === 'profile' && <ProfileTab />}
    </DashShell>
  );
}
