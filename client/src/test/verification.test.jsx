import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import ProfileTab from '../pages/dashboard/artisan/ProfileTab.jsx';
import VerifyTab from '../pages/dashboard/admin/VerifyTab.jsx';
import ArtisanProfile from '../pages/ArtisanProfile.jsx';
import { ArtisanTicket } from '../components/Tickets.jsx';
import { oid } from '../../../shared/seed.js';
import { renderApp, signInAs } from './utils.jsx';

const KEMPAMMA = oid('a2', 1);
const profileRoute = {
  route: `/artisans/${KEMPAMMA}`,
  routes: [['/artisans/:id', <ArtisanProfile key="p" />]],
};

describe('verified-artisan badge', () => {
  it('shows on a card only when the artisan is verified', async () => {
    const artisan = {
      id: KEMPAMMA,
      name: 'Kempamma',
      craftType: 'channapatna',
      village: 'Kalanagara',
      district: 'Ramanagara',
      bio: { en: 'Turns toys on a lathe.' },
      yearsOfPractice: 34,
      worksCount: 3,
      seed: 'artisan-1',
      avatarUrl: null,
    };
    await renderApp({ ui: <ArtisanTicket artisan={{ ...artisan, verified: false }} /> });
    expect(screen.queryByText('verified')).not.toBeInTheDocument();
    cleanup();
    const { container } = await renderApp({
      ui: <ArtisanTicket artisan={{ ...artisan, verified: true }} />,
    });
    expect(screen.getByText('verified')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('goes from an artisan asking, to an admin approving, to the public page', async () => {
    const user = userEvent.setup();

    // 1. Not verified yet: no mark on the public page.
    await renderApp(profileRoute);
    expect(await screen.findByRole('heading', { level: 1, name: 'Kempamma' })).toBeInTheDocument();
    expect(screen.queryByText('Verified artisan')).not.toBeInTheDocument();
    cleanup();

    // 2. The artisan asks, with a card number only admins will see.
    await signInAs('artisan');
    const asking = await renderApp({ ui: <ProfileTab /> });
    const panel = (await screen.findByRole('heading', { name: 'Get verified' })).closest('section');
    await user.click(within(panel).getByRole('button', { name: 'Ask to be verified' }));
    expect(await within(panel).findByRole('alert')).toHaveTextContent(
      'A few fields need another look',
    );
    expect(within(panel).getByLabelText(/Card or reference number/)).toBeInvalid();
    await user.type(within(panel).getByLabelText(/Card or reference number/), 'KA-UI-TEST-77');
    await user.click(within(panel).getByRole('button', { name: 'Ask to be verified' }));
    expect(await within(panel).findByText('Waiting for an admin')).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Ask to be verified' })).toBeNull();
    expect(await axe(asking.container)).toHaveNoViolations();
    cleanup();

    // 3. The admin sees the request with the number, and approves it.
    await signInAs('admin');
    const queue = await renderApp({ ui: <VerifyTab /> });
    expect(await screen.findByText(/KA-UI-TEST-77/)).toBeInTheDocument();
    expect(await axe(queue.container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'Approve Kempamma' }));
    expect(await screen.findByText('Kempamma is now verified.')).toBeInTheDocument();
    cleanup();

    // 4. The public page now carries the mark, and never the number.
    const page = await renderApp(profileRoute);
    expect(await screen.findByText('Verified artisan')).toBeInTheDocument();
    expect(page.container).not.toHaveTextContent('KA-UI-TEST-77');
  });

  it('makes an admin give a reason before turning a request down', async () => {
    const user = userEvent.setup();
    await signInAs('admin');
    await renderApp({ ui: <VerifyTab /> });
    await user.click(await screen.findByRole('button', { name: 'Turn down Shivalingaiah' }));
    const send = screen.getByRole('button', { name: 'Send' });
    expect(send).toBeDisabled();
    await user.type(screen.getByLabelText('Reason (the artisan will see this)'), 'Photo unclear');
    expect(send).toBeEnabled();
    await user.click(send);
    expect(
      await screen.findByText('Shivalingaiah was turned down and can ask again.'),
    ).toBeInTheDocument();
  });
});
