import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Gallery from '../pages/Gallery.jsx';
import { renderApp } from './utils.jsx';

const routes = [['/gallery', <Gallery key="g" />]];

describe('Gallery filters live in the URL', () => {
  it('reads filters from the URL on first load', async () => {
    await renderApp({ route: '/gallery?craftType=bidriware&q=silver&sort=price-asc', routes });
    expect(await screen.findByText('4 pieces')).toBeInTheDocument();
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual([
      'Bangle box with silver vine',
      'Paan box, vine pattern',
      'Surahi with poppy inlay',
      'Hookah base, fish-scale pattern',
    ]);
    expect(screen.getByLabelText('Craft')).toHaveValue('bidriware');
    expect(screen.getByLabelText('Search the gallery')).toHaveValue('silver');
  });

  it('writes filter, search, sort and page changes back to the URL', async () => {
    const user = userEvent.setup();
    await renderApp({ route: '/gallery', routes });
    expect(await screen.findByText('24 pieces')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Pages' })).toBeInTheDocument();

    await user.click(
      within(screen.getByRole('navigation', { name: 'Pages' })).getByRole('button', {
        name: 'Next',
      }),
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/gallery?page=2');

    // Changing a filter resets the page.
    await user.selectOptions(screen.getByLabelText('Craft'), 'pottery');
    expect(screen.getByTestId('location')).toHaveTextContent('/gallery?craftType=pottery');
    expect(await screen.findByText('4 pieces')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Sort by'), 'price-desc');
    expect(screen.getByTestId('location')).toHaveTextContent('craftType=pottery&sort=price-desc');

    await user.type(screen.getByLabelText('Search the gallery'), 'curd{Enter}');
    expect(screen.getByTestId('location')).toHaveTextContent('q=curd');
    expect(await screen.findByText('1 piece')).toBeInTheDocument();

    // On small screens the drawer is folded; open it to reach the clear button.
    await user.click(screen.getByRole('button', { name: 'Show filters' }));
    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/gallery$/);
  });

  it('shows the empty scene when nothing matches', async () => {
    await renderApp({ route: '/gallery?q=submarine', routes });
    expect(await screen.findByText('Nothing on the loom for that search.')).toBeInTheDocument();
  });
});
