import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { applications } from '../api/index.js';
import { useAsync } from '../hooks/useAsync.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import PageHeader from '../components/PageHeader.jsx';
import StampButton from '../components/ui/StampButton.jsx';
import SdgStamp from '../components/ui/SdgStamp.jsx';
import { FormField } from '../components/ui/Form.jsx';
import { EmptyScene, LoadingScene } from '../components/ui/Scenes.jsx';
import CraftArt from '../components/art/CraftArt.jsx';
import { formatDate } from '../lib/format.js';
import s from './Verify.module.css';

function Certificate({ cert }) {
  const { t, i18n } = useTranslation();
  return (
    <article className={s.cert} aria-labelledby="cert-title">
      <div className={s.border}>
        <p className={s.small}>{t('verify.certKicker')}</p>
        <h2 id="cert-title" className={s.certTitle}>
          {t('verify.certTitle')}
        </h2>
        <p className={s.small}>{t('verify.certifies')}</p>
        <p className={s.learner}>{cert.learnerName}</p>
        <p className={s.body}>
          {t('verify.completed', {
            title: cert.apprenticeshipTitle,
            weeks: cert.durationWeeks,
            craft: t(`craft.${cert.craftType}`),
          })}
        </p>
        <div className={s.row}>
          <div>
            <p className={s.sign}>{cert.artisanName}</p>
            <p className={s.small}>{t('verify.master')}</p>
          </div>
          <div className={s.art} aria-hidden="true">
            <CraftArt craftType={cert.craftType} seed={cert.code} />
          </div>
          <div>
            <p className={s.sign}>{formatDate(cert.issuedAt, i18n.language)}</p>
            <p className={s.small}>{t('verify.issued')}</p>
          </div>
        </div>
        <p className={s.code}>
          {t('verify.codeLabel')} <strong>{cert.code}</strong>
        </p>
        <div className={s.seal}>
          <SdgStamp goal={4} size={92} rotate={-12} caption={false} />
        </div>
      </div>
    </article>
  );
}

function Lookup({ code }) {
  const { t } = useTranslation();
  const state = useAsync(() => applications.certificate(code), [code]);
  if (state.loading) return <LoadingScene label={t('verify.checking')} />;
  if (state.error)
    return (
      <EmptyScene art="emptyLoom" title={t('verify.notFound', { code })}>
        <p>{t('verify.notFoundHint')}</p>
      </EmptyScene>
    );
  return (
    <>
      <p className={s.valid} role="status">
        {t('verify.valid')}
      </p>
      <Certificate cert={state.data} />
      <div className={s.actions}>
        <StampButton variant="ghost" onClick={() => window.print()}>
          {t('verify.print')}
        </StampButton>
      </div>
    </>
  );
}

export default function Verify() {
  const { code } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [value, setValue] = useState(code || '');
  usePageTitle(t('verify.title'));
  return (
    <div className="page">
      <div className={s.noPrint}>
        <PageHeader title={t('verify.title')} lede={t('verify.lede')} />
        <form
          className={s.form}
          onSubmit={(e) => {
            e.preventDefault();
            const c = value.trim().toUpperCase();
            if (c) navigate(`/verify/${encodeURIComponent(c)}`);
          }}
        >
          <FormField label={t('verify.codeLabel')} hint={t('verify.codeHint')}>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoCapitalize="characters"
              spellCheck={false}
            />
          </FormField>
          <StampButton type="submit">{t('verify.check')}</StampButton>
        </form>
      </div>
      {code && <Lookup code={code.toUpperCase()} />}
    </div>
  );
}
