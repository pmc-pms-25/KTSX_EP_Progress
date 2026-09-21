import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../../App';
import { appStore } from '../../store/appStore';
import { seedStore } from '../../test/seedStore';

vi.mock('../charts/EChart', () => ({
  EChart: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
}));

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

const sidebar = () => screen.getAllByRole('navigation', { name: 'Dashboard' })[0];

beforeEach(() => {
  seedStore();
  appStore.setState({ sidebarCollapsed: false });
});

describe('Sidebar', () => {
  it('lists ENGINEERING then PROCUREMENT and marks the active module by path prefix', async () => {
    renderAt('/procurement/discipline/MECHANICAL');
    await screen.findByRole('table');
    const links = within(sidebar()).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['⚙Engineering', '▦Procurement']);
    await waitFor(() => expect(links[1]).toHaveAttribute('aria-current', 'page'));
    expect(links[0]).not.toHaveAttribute('aria-current');
  });

  it('restores the filters of a module when coming back to it', async () => {
    const router = renderAt('/procurement?discipline=MECHANICAL&pkg=MEC-001');
    await screen.findByText('AI Insights');
    fireEvent.click(within(sidebar()).getByRole('link', { name: /Engineering/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/engineering'));
    fireEvent.click(within(sidebar()).getByRole('link', { name: /Procurement/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/procurement'));
    await waitFor(() => expect(router.state.location.search).toBe('?discipline=MECHANICAL'));
  });

  it('collapses to icons and remembers it', async () => {
    renderAt('/procurement');
    await screen.findByText('AI Insights');
    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn thanh bên' }));
    await waitFor(() => expect(appStore.getState().sidebarCollapsed).toBe(true));
    const link = await within(sidebar()).findByRole('link', { name: 'Procurement' });
    await waitFor(() => expect(link).toHaveAttribute('title', 'Procurement'));
    await waitFor(() => expect(link.textContent).toBe('▦'));
    const expand = await screen.findByRole('button', { name: 'Mở rộng thanh bên' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    expect(expand).toHaveAttribute('aria-controls', sidebar().id);
    expect(sidebar().id).not.toBe('');
  });

  it('opens as a drawer from the header menu button on phones and closes after choosing', async () => {
    const router = renderAt('/procurement');
    await screen.findByText('AI Insights');
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('link', { name: /Engineering/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/engineering'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
