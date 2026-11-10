import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { artisans, archive, crafts } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import LoomIntro, { shouldPlayIntro } from '../components/home/LoomIntro.jsx';
import PrintedHeadline from '../components/home/PrintedHeadline.jsx';
import HeroArt from '../components/home/HeroArt.jsx';
import FadingCrafts from '../components/home/FadingCrafts.jsx';
import StoryPanels from '../components/home/StoryPanels.jsx';
import StampButton from '../components/ui/StampButton.jsx';
import Divider, { HandUnderline } from '../components/ui/Divider.jsx';
import { AsyncView, EmptyScene } from '../components/ui/Scenes.jsx';
import { ArtisanTicket, StoryTicket } from '../components/Tickets.jsx';
import s from './Home.module.css';

export default function Home() {
  const { t } = useTranslation();
  usePageTitle(null);
  const [intro, setIntro] = useState(shouldPlayIntro);
  const endIntro = useCallback(() => setIntro(false), []);
  const types = useAsync(() => crafts.types(), []);
  const featured = useAsync(() => artisans.featured(), []);
  const latest = useAsync(() => archive.list({ limit: 3 }), []);

  return (
    <>
      {intro && <LoomIntro onDone={endIntro} />}

      <section className={`page ${s.hero}`} aria-labelledby="hero-title">
        <div className={s.heroText}>
          <p className={s.kicker}>{t('home.kicker')}</p>
          <div id="hero-title">
            <PrintedHeadline text={t('home.headline')} play={!intro} />
          </div>
          <p className={s.lede}>{t('home.lede')}</p>
          <div className={s.ctas}>
            <StampButton to="/archive" size="lg">
              {t('home.ctaListen')}
            </StampButton>
            <StampButton to="/gallery" variant="ghost" size="lg">
              {t('home.ctaGallery')}
            </StampButton>
          </div>
          <p className={`hand ${s.margin}`}>{t('home.marginNote')}</p>
        </div>
        <div className={s.heroArt}>
          <HeroArt />
        </div>
      </section>

      <section className={`${s.fading} deckle-bottom`} aria-labelledby="fading-title">
        <div className="page">
          <div className={s.fadingHead}>
            <h2 id="fading-title" className="ink">
              {t('home.fadingTitle')}
            </h2>
            <p className={s.fadingNote}>{t('home.fadingNote')}</p>
          </div>
          <AsyncView state={types}>
            {(list) => <FadingCrafts craftTypes={list} />}
          </AsyncView>
        </div>
      </section>

      <section className={`page ${s.story}`} aria-labelledby="story-title">
        <h2 id="story-title" className={`${s.storyTitle} ink`}>
          {t('home.storyTitle')}
        </h2>
        <HandUnderline />
        <StoryPanels />
      </section>

      <section className={`page ${s.people}`} aria-labelledby="people-title">
        <div className={s.peopleHead}>
          <h2 id="people-title" className="ink">
            {t('home.peopleTitle')}
          </h2>
          <p className="hand">{t('home.peopleNote')}</p>
        </div>
        <AsyncView
          state={featured}
          empty={<EmptyScene art="chisel" title={t('empty.artisans')} />}
        >
          {(list) => (
            <ul className={s.wall}>
              {list.map((a) => (
                <li key={a.id}>
                  <ArtisanTicket artisan={a} />
                </li>
              ))}
            </ul>
          )}
        </AsyncView>
      </section>

      <section className={`page ${s.latest}`} aria-labelledby="latest-title">
        <Divider />
        <div className={s.latestGrid}>
          <div>
            <h2 id="latest-title" className="ink">
              {t('home.latestTitle')}
            </h2>
            <p className="muted">{t('home.latestBody')}</p>
            <StampButton to="/archive" variant="ghost">
              {t('home.latestLink')}
            </StampButton>
          </div>
          <AsyncView
            state={latest}
            empty={<EmptyScene art="wheel" title={t('empty.stories')} />}
          >
            {(page) => (
              <ul className={s.tapes}>
                {page.items.map((st) => (
                  <li key={st.id}>
                    <StoryTicket story={st} />
                  </li>
                ))}
              </ul>
            )}
          </AsyncView>
        </div>
      </section>
    </>
  );
}
