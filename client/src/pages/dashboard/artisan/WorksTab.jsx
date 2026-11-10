import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { crafts } from '../../../api/index.js';
import { useAsync } from '../../../hooks/useAsync.js';
import { useForm } from '../../../hooks/useForm.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { schemas } from '../../../../../shared/validation.js';
import { CRAFT_KEYS } from '../../../../../shared/constants.js';
import { localize } from '../../../i18n/index.js';
import { formatPrice } from '../../../lib/format.js';
import { Panel } from '../../../components/dash/DashShell.jsx';
import ImageUpload from '../../../components/dash/ImageUpload.jsx';
import { FormErrors, FormField } from '../../../components/ui/Form.jsx';
import StampButton from '../../../components/ui/StampButton.jsx';
import { AsyncView, EmptyScene } from '../../../components/ui/Scenes.jsx';
import CraftArt from '../../../components/art/CraftArt.jsx';
import s from '../../../components/dash/Dash.module.css';

const blank = (craftType) => ({
  titleEn: '',
  titleKn: '',
  craftType,
  descEn: '',
  materials: '',
  priceMin: '',
  priceMax: '',
  imageUrl: null,
});
const fromCraft = (c) => ({
  titleEn: c.title.en,
  titleKn: c.title.kn || '',
  craftType: c.craftType,
  descEn: c.description.en,
  materials: c.materials.join(', '),
  priceMin: c.priceMin ?? '',
  priceMax: c.priceMax ?? '',
  imageUrl: c.imageUrl,
});

function CraftForm({ craft, defaultType, onSaved, onCancel }) {
  const { t } = useTranslation();
  const toast = useToast();
  const form = useForm(craft ? fromCraft(craft) : blank(defaultType), { schema: schemas.craft });
  const v = form.values;
  const body = () => ({
    title: { en: v.titleEn, kn: v.titleKn || null },
    craftType: v.craftType,
    description: { en: v.descEn },
    materials: String(v.materials)
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean),
    priceMin: v.priceMin === '' ? null : Number(v.priceMin),
    priceMax: v.priceMax === '' ? null : Number(v.priceMax),
    imageUrl: v.imageUrl || null,
  });
  const e = form.errors;
  const onSubmit = async (ev) => {
    ev.preventDefault();
    const r = await form.submit(
      (b) => (craft ? crafts.update(craft.id, b) : crafts.create(b)),
      body(),
    );
    if (r.ok) {
      toast.success(craft ? t('works.updated') : t('works.added'));
      onSaved(r.result);
    }
  };
  const materialsErr = Object.entries(e).find(([k]) => k.startsWith('materials'))?.[1];
  return (
    <form onSubmit={onSubmit} noValidate>
      <FormErrors message={form.message} />
      <div className={s.formGrid}>
        <FormField
          label={t('works.titleEn')}
          error={e['title.en']}
          count={v.titleEn.length}
          max={80}
          required
        >
          <input type="text" {...form.bind('titleEn')} />
        </FormField>
        <FormField
          label={t('works.titleKn')}
          error={e['title.kn']}
          count={v.titleKn.length}
          max={80}
        >
          <input type="text" lang="kn" {...form.bind('titleKn')} />
        </FormField>
        <FormField label={t('works.craft')} error={e.craftType}>
          <select {...form.bind('craftType')}>
            {CRAFT_KEYS.map((k) => (
              <option key={k} value={k}>
                {t(`craft.${k}`)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label={t('works.materials')}
          hint={t('works.materialsHint')}
          error={materialsErr}
        >
          <input type="text" {...form.bind('materials')} />
        </FormField>
        <FormField
          label={t('works.description')}
          error={e['description.en']}
          count={v.descEn.length}
          max={1000}
          required
          className={s.full}
        >
          <textarea rows={4} {...form.bind('descEn')} />
        </FormField>
        <FormField label={t('works.priceMin')} error={e.priceMin}>
          <input type="number" min={0} inputMode="numeric" {...form.bind('priceMin')} />
        </FormField>
        <FormField label={t('works.priceMax')} error={e.priceMax}>
          <input type="number" min={0} inputMode="numeric" {...form.bind('priceMax')} />
        </FormField>
        <div className={s.full}>
          <ImageUpload
            label={t('works.photo')}
            value={v.imageUrl}
            onChange={(url) => form.set('imageUrl', url)}
            error={e.imageUrl}
          />
        </div>
      </div>
      <div className={s.actions}>
        <StampButton type="submit" busy={form.submitting}>
          {craft ? t('works.saveChanges') : t('works.add')}
        </StampButton>
        <StampButton variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </StampButton>
      </div>
    </form>
  );
}

export default function WorksTab({ craftType }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const state = useAsync(() => crafts.mine(), []);
  const [editing, setEditing] = useState(null); // null | 'new' | craft
  const [confirm, setConfirm] = useState(null);

  const saved = (c) => {
    state.setData((list) => {
      const rest = (list || []).filter((x) => x.id !== c.id);
      return [c, ...rest];
    });
    setEditing(null);
  };
  const remove = async (c) => {
    try {
      await crafts.remove(c.id);
      state.setData((list) => list.filter((x) => x.id !== c.id));
      toast.success(t('works.deleted'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setConfirm(null);
    }
  };

  return (
    <Panel
      title={t('works.title')}
      id="works-title"
      actions={
        !editing && (
          <StampButton size="sm" onClick={() => setEditing('new')}>
            {t('works.new')}
          </StampButton>
        )
      }
    >
      {editing && (
        <div style={{ marginBottom: 'var(--s6)' }}>
          <h3>{editing === 'new' ? t('works.newTitle') : t('works.editTitle')}</h3>
          <CraftForm
            craft={editing === 'new' ? null : editing}
            defaultType={craftType || 'pottery'}
            onSaved={saved}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}
      <AsyncView state={state} empty={<EmptyScene art="chisel" title={t('works.empty')} />}>
        {(list) => (
          <ul className={s.list}>
            {list.map((c) => (
              <li key={c.id} className={s.row}>
                <div style={{ width: 64 }} aria-hidden="true">
                  <CraftArt craftType={c.craftType} seed={c.seed} />
                </div>
                <div className={s.rowMain}>
                  <p className={s.rowTitle}>{localize(c.title, i18n.language)}</p>
                  <p className={s.rowMeta}>
                    {t(`craft.${c.craftType}`)} —{' '}
                    {formatPrice(c.priceMin, c.priceMax, i18n.language, t)}
                  </p>
                </div>
                <div className={s.actions}>
                  <StampButton size="sm" variant="ghost" onClick={() => setEditing(c)}>
                    {t('common.edit')}
                    <span className="visually-hidden"> {c.title.en}</span>
                  </StampButton>
                  {confirm === c.id ? (
                    <>
                      <StampButton size="sm" variant="danger" onClick={() => remove(c)}>
                        {t('common.confirmDelete')}
                      </StampButton>
                      <button type="button" className={s.linkBtn} onClick={() => setConfirm(null)}>
                        {t('common.keep')}
                      </button>
                    </>
                  ) : (
                    <StampButton size="sm" variant="ghost" onClick={() => setConfirm(c.id)}>
                      {t('common.delete')}
                      <span className="visually-hidden"> {c.title.en}</span>
                    </StampButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </AsyncView>
    </Panel>
  );
}
