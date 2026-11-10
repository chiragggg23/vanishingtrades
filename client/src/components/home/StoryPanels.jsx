import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SdgStamp from '../ui/SdgStamp.jsx';
import { Chisel, Loom, PottersWheel } from '../art/Illustrations.jsx';
import s from './StoryPanels.module.css';

const PANELS = [
  { key: 'record', goal: 11, Art: PottersWheel, to: '/archive' },
  { key: 'keep', goal: 8, Art: Chisel, to: '/gallery' },
  { key: 'pass', goal: 4, Art: Loom, to: '/apprenticeships' },
];

/**
 * Sticky scroll story. The left column holds the stamp for the panel you are reading; each panel
 * also carries its own stamp, so everything reads fine with no motion and on small screens.
 */
export default function StoryPanels() {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const refs = useRef([]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number(e.target.dataset.index));
        });
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className={s.wrap}>
      <div className={s.rail} aria-hidden="true">
        <div className={s.sticky}>
          <SdgStamp key={active} goal={PANELS[active].goal} size={150} rotate={-6} animated />
          <ol className={s.steps}>
            {PANELS.map((p, i) => (
              <li key={p.key} data-on={i === active}>
                {t(`home.panel.${p.key}.title`)}
              </li>
            ))}
          </ol>
        </div>
      </div>
      <ol className={s.panels}>
        {PANELS.map((p, i) => (
          <li
            key={p.key}
            ref={(el) => (refs.current[i] = el)}
            data-index={i}
            className={`${s.panel} ${s[`p${i}`]}`}
          >
            <div className={s.inlineStamp}>
              <SdgStamp goal={p.goal} size={92} rotate={i % 2 ? 5 : -5} caption={false} />
            </div>
            <p className={s.step}>{t('home.panel.step', { n: i + 1 })}</p>
            <h3 className={`${s.title} ink`}>{t(`home.panel.${p.key}.title`)}</h3>
            <p className={s.body}>{t(`home.panel.${p.key}.body`)}</p>
            <p className={s.goal}>{t(`home.panel.${p.key}.goal`)}</p>
            <Link to={p.to} className={s.more}>
              {t(`home.panel.${p.key}.link`)}
            </Link>
            <div className={s.art}>
              <p.Art />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
