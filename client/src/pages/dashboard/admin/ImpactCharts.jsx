// Recharts lives in its own chunk: only the admin impact tab loads it.
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import A from './Admin.module.css';

// Validated with the dataviz palette checker against #FAF5EA: lightness, CVD and contrast all pass.
export const SERIES = ['#3B5C9E', '#B8402E'];
const AXIS = { fontSize: 13, fill: '#4A4239' };

const monthLabel = (m, lng) => {
  const [y, mo] = m.split('-').map(Number);
  try {
    return new Intl.DateTimeFormat(lng === 'en' ? 'en-IN' : `${lng}-IN`, { month: 'short' }).format(
      new Date(Date.UTC(y, mo - 1, 1)),
    );
  } catch {
    return m;
  }
};

/** Visually hidden table so the numbers are available to everyone. */
function DataTable({ caption, columns, rows }) {
  return (
    // Tables ignore width:1px, so the hiding happens on a wrapper.
    <div className="visually-hidden">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c, j) =>
                j === 0 ? (
                  <th key={c.key} scope="row">
                    {r[c.key]}
                  </th>
                ) : (
                  <td key={c.key}>{r[c.key]}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Two series per month, grouped bars on one axis. */
export function MonthlyChart({ title, data, keys }) {
  const { t, i18n } = useTranslation();
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.month, i18n.language) }));
  return (
    <figure className={A.chart}>
      <figcaption className={A.chartTitle}>{title}</figcaption>
      <div className={A.chartBox} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            barGap={2}
            barCategoryGap="22%"
            margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="rgba(30,27,24,0.14)" />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: '#1E1B18' }} />
            <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(224,165,38,0.18)' }}
              contentStyle={{
                background: '#FAF5EA',
                border: '2px solid #1E1B18',
                borderRadius: 0,
                color: '#1E1B18',
              }}
            />
            <Legend wrapperStyle={{ fontSize: 14, color: '#1E1B18' }} iconType="square" />
            {keys.map((k, i) => (
              <Bar
                key={k}
                dataKey={k}
                name={t(`impact.series.${k}`)}
                fill={SERIES[i]}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable
        caption={title}
        columns={[
          { key: 'month', label: t('impact.month') },
          ...keys.map((k) => ({ key: k, label: t(`impact.series.${k}`) })),
        ]}
        rows={data}
      />
    </figure>
  );
}

/** One series breakdown, horizontal bars with direct value labels. */
export function BreakdownChart({ title, data, labelFor }) {
  const { t } = useTranslation();
  const rows = data.map((d) => ({ name: labelFor(d.key), count: d.count }));
  return (
    <figure className={A.chart}>
      <figcaption className={A.chartTitle}>{title}</figcaption>
      <div className={A.chartBox} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 28, left: 8, bottom: 0 }}
            barCategoryGap="24%"
          >
            <CartesianGrid horizontal={false} stroke="rgba(30,27,24,0.14)" />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={AXIS}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={118}
              tick={AXIS}
              tickLine={false}
              axisLine={{ stroke: '#1E1B18' }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(224,165,38,0.18)' }}
              contentStyle={{
                background: '#FAF5EA',
                border: '2px solid #1E1B18',
                borderRadius: 0,
                color: '#1E1B18',
              }}
            />
            <Bar
              dataKey="count"
              name={t('impact.count')}
              fill={SERIES[0]}
              radius={[0, 4, 4, 0]}
              maxBarSize={22}
              label={{ position: 'right', fill: '#1E1B18', fontSize: 13 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable
        caption={title}
        columns={[
          { key: 'name', label: t('impact.item') },
          { key: 'count', label: t('impact.count') },
        ]}
        rows={rows}
      />
    </figure>
  );
}
