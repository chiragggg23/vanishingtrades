import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CraftArt from '../art/CraftArt.jsx';
import { SampleStamp } from '../ui/Badges.jsx';
import { useInView } from '../../hooks/useInView.js';
import { localize } from '../../i18n/index.js';
import s from './FadingCrafts.module.css';

function CraftSpecimen({ craft, index, placeholder }) {
  const { t, i18n } = useTranslation();
  const [ref, seen] = useInView({ rootMargin: '0px 0px -30% 0px' });
  const [hover, setHover] = useState(false);
  const active = !placeholder && (seen || hover);
  const name = placeholder ? t(`craft.${craft.key}`) : localize(craft.name, i18n.language);
  return (
    <li ref={ref} className={s.item} style={{ '--i': index }} data-active={active}>
      <Link
        to={`/gallery?craftType=${craft.key}`}
        className={s.link}
        onMouseEnter={() => setHover(true)}
        onFocus={() => setHover(true)}
        onTouchStart={() => setHover(true)}
        aria-describedby={`craft-cap-${craft.key}`}
      >
        <CraftArt craftType={craft.key} seed="specimen" variant="fade" active={active} />
        <span className={s.name}>{name}</span>
      </Link>
      <p id={`craft-cap-${craft.key}`} className={s.caption} aria-hidden={placeholder || undefined}>
        {placeholder ? (
          <span className={s.count}>&nbsp;</span>
        ) : (
          <>
            <span className={s.count}>{t('home.hands', { count: craft.practitioners })}</span>{' '}
            <span className={s.where}>{t('home.handsWhere', { region: craft.region })}</span>{' '}
            {craft.isSample && <SampleStamp />}
          </>
        )}
      </p>
    </li>
  );
}

/** Signature interaction: pencil outlines fill with block-print colour as they reach you. */
export default function FadingCrafts({ craftTypes, placeholder = false }) {
  return (
    <ul className={s.strip}>
      {craftTypes.map((c, i) => (
        <CraftSpecimen key={c.key} craft={c} index={i} placeholder={placeholder} />
      ))}
    </ul>
  );
}
