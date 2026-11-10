import s from './PageHeader.module.css';

/** Left-aligned page masthead: big ink title, a lede, and an optional marginal note and art. */
export default function PageHeader({ title, lede, note, art, children, id }) {
  return (
    <header className={`${s.head} ${art ? s.withArt : ''}`}>
      <div className={s.text}>
        <h1 id={id} className={`${s.title} ink`}>
          {title}
        </h1>
        {lede && <p className={s.lede}>{lede}</p>}
        {children}
      </div>
      {note && <p className={`hand ${s.note}`}>{note}</p>}
      {art && (
        <div className={s.art} aria-hidden="true">
          {art}
        </div>
      )}
    </header>
  );
}
