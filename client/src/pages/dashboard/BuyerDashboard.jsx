import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import DashShell from '../../components/dash/DashShell.jsx';
import StampButton from '../../components/ui/StampButton.jsx';
import InboxTab from './artisan/InboxTab.jsx';

export default function BuyerDashboard() {
  const { t } = useTranslation();
  usePageTitle(t('dash.buyerTitle'));
  return (
    <DashShell
      title={t('dash.buyerTitle')}
      lede={t('dash.buyerLede')}
      aside={
        <StampButton to="/gallery" variant="ghost" size="sm">
          {t('dash.findMore')}
        </StampButton>
      }
    >
      <InboxTab title={t('inbox.buyerTitle')} />
    </DashShell>
  );
}
