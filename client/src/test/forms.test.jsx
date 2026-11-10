import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Register from '../pages/Register.jsx';
import Login from '../pages/Login.jsx';
import ArtisanProfile from '../pages/ArtisanProfile.jsx';
import { renderApp, signInAs } from './utils.jsx';
import { oid } from '../../../shared/seed.js';

describe('form errors', () => {
  it('shows inline, announced errors before sending an invalid registration', async () => {
    const user = userEvent.setup();
    await renderApp({ route: '/register', routes: [['/register', <Register key="r" />]] });
    await user.type(screen.getByLabelText(/Your name/), 'A');
    await user.type(screen.getByLabelText(/^Email/), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Make my account' }));

    const name = screen.getByLabelText(/Your name/);
    expect(name).toHaveAttribute('aria-invalid', 'true');
    const errId = name
      .getAttribute('aria-describedby')
      .split(' ')
      .find((x) => x.endsWith('-err'));
    const err = document.getElementById(errId);
    expect(err).toHaveTextContent('Use at least 2 characters.');
    expect(err).toHaveAttribute('aria-live', 'polite');
    expect(
      screen
        .getAllByRole('alert')
        .some((el) => /A few fields need another look/.test(el.textContent)),
    ).toBe(true);
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('maps an API error (409 duplicate email) onto the email field', async () => {
    const user = userEvent.setup();
    await renderApp({ route: '/register', routes: [['/register', <Register key="r" />]] });
    await user.type(screen.getByLabelText(/Your name/), 'Asha Rao');
    await user.type(screen.getByLabelText(/^Email/), 'demo-buyer@vanishingtrades.test');
    await user.type(screen.getByLabelText(/^Password/), 'longenough');
    await user.click(screen.getByRole('button', { name: 'Make my account' }));
    expect(await screen.findByText('Already registered.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the server message when sign-in fails', async () => {
    const user = userEvent.setup();
    await renderApp({ route: '/login', routes: [['/login', <Login key="l" />]] });
    await user.type(screen.getByLabelText(/^Email/), 'demo-buyer@vanishingtrades.test');
    await user.type(screen.getByLabelText(/^Password/), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Email or password is wrong.')).toBeInTheDocument();
  });

  it('counts characters and validates the enquiry form for a buyer', async () => {
    const user = userEvent.setup();
    await signInAs('buyer');
    const id = oid('a2', 1);
    await renderApp({
      route: `/artisans/${id}`,
      routes: [['/artisans/:id', <ArtisanProfile key="p" />]],
    });
    const form = (await screen.findByRole('heading', { name: /Write to Kempamma/ })).closest(
      'section',
    );
    const subject = within(form).getByLabelText(/Subject/);
    await user.type(subject, 'Hi');
    expect(within(form).getByText('2 of 120')).toBeInTheDocument();
    await user.click(within(form).getByRole('button', { name: 'Send enquiry' }));
    expect(subject).toHaveAttribute('aria-invalid', 'true');
    await user.clear(subject);
    await user.type(subject, 'Toys for a library');
    await user.type(
      within(form).getByLabelText(/Your message/),
      'Could you make ten small rocking horses for our reading corner?',
    );
    await user.click(within(form).getByRole('button', { name: 'Send enquiry' }));
    expect(await within(form).findByText('Sent to Kempamma.')).toBeInTheDocument();
  });
});
