import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, homeFor } from '../context/AuthContext.jsx';
import { useForm } from '../hooks/useForm.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { schemas } from '../../../shared/validation.js';
import { PUBLIC_ROLES } from '../../../shared/constants.js';
import StampButton from '../components/ui/StampButton.jsx';
import { FormErrors, FormField } from '../components/ui/Form.jsx';
import { PottersWheel } from '../components/art/Illustrations.jsx';
import s from './Auth.module.css';

export default function Register() {
  const { t } = useTranslation();
  usePageTitle(t('auth.registerTitle'));
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const form = useForm(
    { name: '', email: '', password: '', role: 'buyer' },
    { schema: schemas.register },
  );
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  const onSubmit = async (e) => {
    e.preventDefault();
    const r = await form.submit((v) => register(v));
    if (r.ok) navigate(homeFor(r.result.role), { replace: true });
  };
  return (
    <div className={`page ${s.wrap}`}>
      <section className={s.card} aria-labelledby="reg-title">
        <h1 id="reg-title" className="ink">
          {t('auth.registerTitle')}
        </h1>
        <p className="muted">{t('auth.registerLede')}</p>
        <form onSubmit={onSubmit} noValidate>
          <FormErrors message={form.message} />
          <fieldset className={s.roles}>
            <legend className={s.legend}>{t('auth.iAm')}</legend>
            {PUBLIC_ROLES.map((r) => (
              <label key={r} className={s.role} data-checked={form.values.role === r}>
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={form.values.role === r}
                  onChange={() => form.set('role', r)}
                />
                <span>
                  <strong>{t(`auth.roleTitle.${r}`)}</strong>
                  <span className={s.roleHint}>{t(`auth.roleHint.${r}`)}</span>
                </span>
              </label>
            ))}
            {form.errors.role && <p className={s.err}>{form.errors.role}</p>}
          </fieldset>
          <FormField
            label={t('auth.name')}
            error={form.errors.name}
            count={form.values.name.length}
            max={80}
            required
          >
            <input type="text" autoComplete="name" {...form.bind('name')} />
          </FormField>
          <FormField label={t('auth.email')} error={form.errors.email} required>
            <input type="email" autoComplete="email" {...form.bind('email')} />
          </FormField>
          <FormField
            label={t('auth.password')}
            hint={t('auth.passwordHint')}
            error={form.errors.password}
            required
          >
            <input type="password" autoComplete="new-password" {...form.bind('password')} />
          </FormField>
          <StampButton type="submit" busy={form.submitting} size="lg">
            {t('auth.register')}
          </StampButton>
        </form>
        <p className={s.switch}>
          {t('auth.haveAccount')} <Link to="/login">{t('auth.signIn')}</Link>
        </p>
      </section>
      <aside className={s.side} aria-hidden="true">
        <div className={s.art}>
          <PottersWheel />
        </div>
        <p className="hand">{t('auth.registerNote')}</p>
      </aside>
    </div>
  );
}
