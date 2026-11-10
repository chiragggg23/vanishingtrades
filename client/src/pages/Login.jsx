import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { demo } from '../api/index.js';
import { useAuth, homeFor } from '../context/AuthContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useForm } from '../hooks/useForm.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { schemas } from '../../../shared/validation.js';
import { DEMO_PASSWORD } from '../../../shared/constants.js';
import StampButton from '../components/ui/StampButton.jsx';
import { FormErrors, FormField } from '../components/ui/Form.jsx';
import { Loom } from '../components/art/Illustrations.jsx';
import s from './Auth.module.css';

const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : null);

export default function Login() {
  const { t } = useTranslation();
  usePageTitle(t('auth.signInTitle'));
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next')) || safeNext(location.state?.from);
  const form = useForm({ email: '', password: '' }, { schema: schemas.login });
  const demoState = useAsync(() => demo.status().catch(() => ({ enabled: false })), []);
  const [demoBusy, setDemoBusy] = useState(null);

  if (user) return <Navigate to={next || homeFor(user.role)} replace />;

  const go = (u) => navigate(next || homeFor(u.role), { replace: true });
  const onSubmit = async (e) => {
    e.preventDefault();
    const r = await form.submit((v) => login(v.email, v.password));
    if (r.ok) go(r.result);
  };
  const tryAs = async (account) => {
    setDemoBusy(account.role);
    form.setMessage('');
    try {
      go(await login(account.email, DEMO_PASSWORD));
    } catch (err) {
      form.setMessage(err.message);
    } finally {
      setDemoBusy(null);
    }
  };

  return (
    <div className={`page ${s.wrap}`}>
      <section className={s.card} aria-labelledby="login-title">
        <h1 id="login-title" className="ink">
          {t('auth.signInTitle')}
        </h1>
        <p className="muted">{t('auth.signInLede')}</p>
        <form onSubmit={onSubmit} noValidate>
          <FormErrors message={form.message} />
          <FormField label={t('auth.email')} error={form.errors.email} required>
            <input type="email" autoComplete="email" {...form.bind('email')} />
          </FormField>
          <FormField label={t('auth.password')} error={form.errors.password} required>
            <input type="password" autoComplete="current-password" {...form.bind('password')} />
          </FormField>
          <StampButton type="submit" busy={form.submitting} size="lg">
            {t('auth.signIn')}
          </StampButton>
        </form>
        <p className={s.switch}>
          {t('auth.noAccount')} <Link to="/register">{t('auth.makeOne')}</Link>
        </p>
      </section>

      <aside className={s.side}>
        {demoState.data?.enabled ? (
          <section className={s.demo} aria-labelledby="demo-title">
            <h2 id="demo-title" className={s.demoTitle}>
              {t('auth.demoTitle')}
            </h2>
            <p>{t('auth.demoLede')}</p>
            <ul className={s.demoList}>
              {demoState.data.accounts.map((a) => (
                <li key={a.role}>
                  <StampButton
                    variant="ghost"
                    size="sm"
                    busy={demoBusy === a.role}
                    onClick={() => tryAs(a)}
                  >
                    {t('auth.tryAs', { role: t(`role.${a.role}`) })}
                  </StampButton>
                  <span className={s.demoEmail}>{a.email}</span>
                </li>
              ))}
            </ul>
            <p className={s.demoPw}>{t('auth.demoPassword', { password: DEMO_PASSWORD })}</p>
          </section>
        ) : (
          <div className={s.art} aria-hidden="true">
            <Loom />
          </div>
        )}
      </aside>
    </div>
  );
}
