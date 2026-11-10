import { useTranslation } from 'react-i18next';
import { artisans } from '../../../api/index.js';
import { useAsync } from '../../../hooks/useAsync.js';
import { useForm } from '../../../hooks/useForm.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { schemas } from '../../../../../shared/validation.js';
import { CRAFT_KEYS, LANGS } from '../../../../../shared/constants.js';
import { Panel } from '../../../components/dash/DashShell.jsx';
import ImageUpload from '../../../components/dash/ImageUpload.jsx';
import { FormErrors, FormField } from '../../../components/ui/Form.jsx';
import StampButton from '../../../components/ui/StampButton.jsx';
import { AsyncView } from '../../../components/ui/Scenes.jsx';
import s from '../../../components/dash/Dash.module.css';

function ProfileForm({ profile }) {
  const { t } = useTranslation();
  const toast = useToast();
  const form = useForm(
    {
      name: profile.name,
      craftType: profile.craftType,
      village: profile.village === '—' ? '' : profile.village,
      district: profile.district === '—' ? '' : profile.district,
      bioEn: profile.bio.en || '',
      bioKn: profile.bio.kn || '',
      bioHi: profile.bio.hi || '',
      yearsOfPractice: String(profile.yearsOfPractice ?? 0),
      languages: profile.languages || [],
      avatarUrl: profile.avatarUrl,
    },
    // The shared schema checks the API body (built by toBody), not the flat form state.
    { schema: schemas.artisan, partial: true },
  );
  const v = form.values;
  const toBody = () => ({
    name: v.name,
    craftType: v.craftType,
    village: v.village,
    district: v.district,
    bio: { en: v.bioEn, kn: v.bioKn || null, hi: v.bioHi || null },
    yearsOfPractice: v.yearsOfPractice === '' ? 0 : Number(v.yearsOfPractice),
    languages: v.languages,
    avatarUrl: v.avatarUrl || null,
  });
  const errs = {
    ...form.errors,
    bioEn: form.errors['bio.en'],
    bioKn: form.errors['bio.kn'],
    bioHi: form.errors['bio.hi'],
  };
  const onSubmit = async (e) => {
    e.preventDefault();
    const body = toBody();
    const r = await form.submit((b) => artisans.updateMine(b), body);
    if (r.ok) toast.success(t('profile.saved'));
  };
  const toggleLang = (l) =>
    form.set(
      'languages',
      v.languages.includes(l) ? v.languages.filter((x) => x !== l) : [...v.languages, l],
    );

  return (
    <form onSubmit={onSubmit} noValidate>
      <FormErrors message={form.message} />
      <div className={s.formGrid}>
        <div>
          <ImageUpload
            label={t('profile.photo')}
            value={v.avatarUrl}
            onChange={(url) => form.set('avatarUrl', url)}
            error={form.errors.avatarUrl}
          />
        </div>
        <div>
          <FormField
            label={t('profile.name')}
            error={errs.name}
            count={v.name.length}
            max={80}
            required
          >
            <input type="text" {...form.bind('name')} />
          </FormField>
          <FormField label={t('profile.craft')} error={errs.craftType}>
            <select {...form.bind('craftType')}>
              {CRAFT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {t(`craft.${k}`)}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <FormField
          label={t('profile.village')}
          error={errs.village}
          count={v.village.length}
          max={60}
        >
          <input type="text" {...form.bind('village')} />
        </FormField>
        <FormField
          label={t('profile.district')}
          error={errs.district}
          count={v.district.length}
          max={60}
        >
          <input type="text" {...form.bind('district')} />
        </FormField>
        <FormField label={t('profile.years')} error={errs.yearsOfPractice} className="">
          <input
            type="number"
            min={0}
            max={90}
            inputMode="numeric"
            {...form.bind('yearsOfPractice')}
          />
        </FormField>
        <fieldset className={s.checks}>
          <legend>{t('profile.languages')}</legend>
          {LANGS.map((l) => (
            <label key={l} className={s.check} lang={l}>
              <input
                type="checkbox"
                checked={v.languages.includes(l)}
                onChange={() => toggleLang(l)}
              />
              {t(`lang.name.${l}`)}
            </label>
          ))}
        </fieldset>
        <FormField
          label={t('profile.bioEn')}
          hint={t('profile.bioHint')}
          error={errs.bioEn}
          count={v.bioEn.length}
          max={600}
          className={s.full}
        >
          <textarea rows={4} {...form.bind('bioEn')} />
        </FormField>
        <FormField label={t('profile.bioKn')} error={errs.bioKn} count={v.bioKn.length} max={600}>
          <textarea rows={4} lang="kn" {...form.bind('bioKn')} />
        </FormField>
        <FormField label={t('profile.bioHi')} error={errs.bioHi} count={v.bioHi.length} max={600}>
          <textarea rows={4} lang="hi" {...form.bind('bioHi')} />
        </FormField>
      </div>
      <StampButton type="submit" busy={form.submitting}>
        {t('profile.save')}
      </StampButton>
    </form>
  );
}

export default function ProfileTab() {
  const { t } = useTranslation();
  const state = useAsync(() => artisans.mine(), []);
  return (
    <Panel title={t('profile.title')} id="profile-title">
      <AsyncView state={state}>{(p) => <ProfileForm profile={p} />}</AsyncView>
    </Panel>
  );
}
