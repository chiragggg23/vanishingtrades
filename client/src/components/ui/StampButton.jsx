import { Link } from 'react-router-dom';
import s from './StampButton.module.css';

/**
 * Ink-stamp button. Renders a <button>, a router <Link> (to) or an <a> (href).
 * variant: primary | madder | ghost | danger | leaf; size: md | sm | lg
 */
export default function StampButton({
  to,
  href,
  variant = 'primary',
  size = 'md',
  busy = false,
  className = '',
  children,
  type = 'button',
  ...rest
}) {
  const cls = `${s.stamp} ${s[variant] || ''} ${s[size] || ''} ${className}`;
  const inner = (
    <>
      <span className={s.label}>{children}</span>
      {busy && <span className={s.thread} aria-hidden="true" />}
    </>
  );
  if (to)
    return (
      <Link to={to} className={cls} {...rest}>
        {inner}
      </Link>
    );
  if (href)
    return (
      <a href={href} className={cls} {...rest}>
        {inner}
      </a>
    );
  return (
    <button
      type={type}
      className={cls}
      aria-busy={busy || undefined}
      {...rest}
      disabled={busy || rest.disabled}
    >
      {inner}
    </button>
  );
}
