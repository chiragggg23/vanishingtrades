import { screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import Layout from '../components/layout/Layout.jsx';
import Home from '../pages/Home.jsx';
import Gallery from '../pages/Gallery.jsx';
import Archive from '../pages/Archive.jsx';
import StoryDetail from '../pages/StoryDetail.jsx';
import ArtisanProfile from '../pages/ArtisanProfile.jsx';
import Apprenticeships from '../pages/Apprenticeships.jsx';
import Impact from '../pages/Impact.jsx';
import Verify from '../pages/Verify.jsx';
import Login from '../pages/Login.jsx';
import NotFound from '../pages/NotFound.jsx';
import ArtisanDashboard from '../pages/dashboard/ArtisanDashboard.jsx';
import AdminArea from '../pages/dashboard/AdminArea.jsx';
import { oid } from '../../../shared/seed.js';
import { renderApp, signInAs } from './utils.jsx';
import { Route, Routes } from 'react-router-dom';
import { render } from '@testing-library/react';

// Colour contrast cannot be computed in jsdom (no layout); scripts/contrast.mjs covers it.
const AXE = { rules: { 'color-contrast': { enabled: false } } };

function inLayout(path, el) {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path={path} element={el} />
      </Route>
    </Routes>
  );
}

const PAGES = [
  ['Home', '/', '/', <Home key="1" />, /Six crafts, slowly losing/],
  ['Gallery', '/gallery', '/gallery', <Gallery key="2" />, /24 pieces/],
  ['Archive', '/archive', '/archive', <Archive key="3" />, /9 stories/],
  [
    'Story detail',
    '/archive/:id',
    `/archive/${oid('a4', 5)}`,
    <StoryDetail key="4" />,
    /Transcript/,
  ],
  [
    'Artisan profile',
    '/artisans/:id',
    `/artisans/${oid('a2', 3)}`,
    <ArtisanProfile key="5" />,
    /Mohammed Rafiq/,
  ],
  [
    'Apprenticeships',
    '/apprenticeships',
    '/apprenticeships',
    <Apprenticeships key="6" />,
    /5 openings/,
  ],
  ['Impact', '/impact', '/impact', <Impact key="7" />, /stories archived/],
  [
    'Verify',
    '/verify/:code',
    '/verify/VT-7K3M-9QX2',
    <Verify key="8" />,
    /This certificate is genuine/,
  ],
  ['Login', '/login', '/login', <Login key="9" />, /Try as artisan/],
  ['404', '*', '/nowhere', <NotFound key="10" />, /This craft has vanished/],
];

describe('axe: public pages have no detectable violations', () => {
  it.each(PAGES)('%s', async (_name, path, route, el, ready) => {
    const { container } = await renderApp({ route, ui: inLayout(path, el) });
    expect((await screen.findAllByText(ready)).length).toBeGreaterThan(0);
    const results = await axe(container, AXE);
    expect(results).toHaveNoViolations();
  });
});

describe('axe: dashboards', () => {
  it('artisan workbench', async () => {
    await signInAs('artisan');
    const { container } = await renderApp({
      route: '/dashboard/artisan',
      ui: inLayout('/dashboard/artisan', <ArtisanDashboard />),
    });
    await screen.findByText(/ಅಜ್ಜನ ಮೊದಲ ಗೊಂಬೆ/);
    expect(await axe(container, AXE)).toHaveNoViolations();
  });

  it('admin people table', async () => {
    await signInAs('admin');
    const { container } = await renderApp({
      route: '/admin/users',
      ui: inLayout('/admin/:tab', <AdminArea />),
    });
    await screen.findAllByText('demo-artisan@vanishingtrades.test');
    expect(await axe(container, AXE)).toHaveNoViolations();
  });
});

// keep the import used for tools that tree-shake test helpers
void render;
