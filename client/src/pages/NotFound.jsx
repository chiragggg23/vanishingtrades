import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { Loom } from '../components/art/Illustrations.jsx';
import StampButton from '../components/ui/StampButton.jsx';
import s from './NotFound.module.css';

export default function NotFound() {
  const { t } = useTranslation();
  usePageTitle(t('notFound.title'));
  return (
    <div className={`page ${s.wrap}`}>
      <div className={s.art} aria-hidden="true">
        <Loom empty />
      </div>
      <h1 className={`${s.title} ink`}>{t('notFound.title')}</h1>
      <p className={s.body}>{t('notFound.body')}</p>
      <div className={s.actions}>
        <StampButton to="/gallery">{t('notFound.gallery')}</StampButton>
        <StampButton to="/" variant="ghost">
          {t('notFound.home')}
        </StampButton>
      </div>
      <p className={`hand ${s.note}`}>{t('notFound.note')}</p>
    </div>
  );
}
