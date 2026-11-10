import { useTranslation } from 'react-i18next';
import { Chisel, Loom, PottersWheel, SpinningWheel } from '../art/Illustrations.jsx';
import StampButton from './StampButton.jsx';
import s from './Scenes.module.css';

const ART = {
  wheel: PottersWheel,
  loom: Loom,
  chisel: Chisel,
  spinning: SpinningWheel,
  emptyLoom: (p) => <Loom {...p} empty />,
};

/** Empty state with its own illustration and a line of personality. */
export function EmptyScene({ art = 'loom', title, children, action }) {
  const Art = ART[art] || Loom;
  return (
    <div className={s.scene}>
      <div className={s.art}>
        <Art still />
      </div>
      <div className={s.text}>
        <p className={s.title}>{title}</p>
        {children && <div className={s.body}>{children}</div>}
        {action}
      </div>
    </div>
  );
}

/** Loading: a spinning wheel winding thread. */
export function LoadingScene({ label }) {
  const { t } = useTranslation();
  return (
    <div className={`${s.scene} ${s.loading}`} role="status" aria-live="polite">
      <div className={s.artSmall}>
        <SpinningWheel />
      </div>
      <p className={s.hand}>{label || t('state.loading')}</p>
    </div>
  );
}

/** Error with a retry. */
export function ErrorScene({ error, onRetry }) {
  const { t } = useTranslation();
  return (
    <div className={s.scene} role="alert">
      <div className={s.art}>
        <Chisel still />
      </div>
      <div className={s.text}>
        <p className={s.title}>{t('state.errorTitle')}</p>
        <p className={s.body}>{error?.message || t('state.errorBody')}</p>
        {onRetry && (
          <StampButton variant="ghost" onClick={onRetry}>
            {t('common.tryAgain')}
          </StampButton>
        )}
      </div>
    </div>
  );
}

/**
 * Render loading / error / empty / content for a useAsync() state.
 * isEmpty(data) decides emptiness (default: empty array or empty items).
 */
export function AsyncView({ state, empty, isEmpty, loadingLabel, children }) {
  if (state.loading && !state.data) return <LoadingScene label={loadingLabel} />;
  if (state.error) return <ErrorScene error={state.error} onRetry={state.reload} />;
  const data = state.data;
  const blank = isEmpty
    ? isEmpty(data)
    : Array.isArray(data)
      ? data.length === 0
      : Array.isArray(data?.items) && data.items.length === 0;
  if (blank && empty) return empty;
  return children(data);
}
