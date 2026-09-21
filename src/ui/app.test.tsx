import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../App';
import { msg } from '../i18n/message';
import { procurementStore } from '../modules/procurement/store';
import { appStore } from '../store/appStore';
import { seedStore } from '../test/seedStore';

// Canvas charts do not run in jsdom; render a labelled placeholder instead.
vi.mock('./charts/EChart', () => ({
  EChart: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
}));

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

async function renderPage(path: string) {
  const router = renderAt(path);
  await screen.findByText('Phase funnel');
  return router;
}

beforeEach(seedStore);

describe('dashboard app', () => {
  it('renders the shell and the overview', async () => {
    await renderPage('/procurement');
    expect(screen.getByText('PMS - PEIW')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask PMS - PEIW/)).toBeInTheDocument();
    expect(screen.getByText('Phase funnel')).toBeInTheDocument();
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe(appStore.getState().theme));
  });

  it('filters through a KPI tile and shows the row count', async () => {
    const router = await renderPage('/procurement');
    fireEvent.click(screen.getByRole('button', { name: /ROS at risk/ }));
    await waitFor(() => expect(router.state.location.search).toContain('flag=rosRisk'));
    await waitFor(() => expect(screen.getAllByText((_, el) => el?.textContent === '1 / 6 dòng').length).toBeGreaterThan(0));
  });

  it('drills into a discipline and opens a package drawer', async () => {
    const router = await renderPage('/procurement');
    fireEvent.click(screen.getByRole('link', { name: /MECHANICAL/ }));
    await screen.findByRole('table');
    await waitFor(() => expect(router.state.location.pathname).toBe('/procurement/discipline/MECHANICAL'));
    fireEvent.click(within(screen.getByRole('table')).getByText('Centrifugal Pump'));
    await waitFor(() => expect(router.state.location.search).toContain('pkg=MEC-001'));
    expect(await within(await screen.findByRole('dialog')).findByText('Chi tiết mốc')).toBeInTheDocument();
  });

  it('scrolls to the top when moving to another page, but not when filters change', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const router = await renderPage('/procurement');
    // Let the first page's mount effect run before watching for new scrolls.
    await waitFor(() => expect(scrollTo).toHaveBeenCalled());
    scrollTo.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /ROS at risk/ }));
    await waitFor(() => expect(router.state.location.search).toContain('flag=rosRisk'));
    await waitFor(() => expect(screen.getAllByText((_, el) => el?.textContent === '1 / 6 dòng').length).toBeGreaterThan(0));
    expect(scrollTo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('link', { name: /MECHANICAL/ }));
    await screen.findByRole('table');
    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 0));
    scrollTo.mockRestore();
  });

  it('toggles the theme', async () => {
    await renderPage('/procurement');
    const before = appStore.getState().theme;
    fireEvent.click(screen.getByRole('button', { name: /Chuyển sang giao diện/ }));
    await waitFor(() => expect(appStore.getState().theme).not.toBe(before));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe(appStore.getState().theme));
  });

  it('shows the error screen when loading failed', async () => {
    act(() => {
      procurementStore.setState({
        status: 'error',
        data: undefined,
        error: { title: msg('error.title.source'), detail: msg('error.source.accessDenied'), code: 'ACCESS_DENIED' },
      });
    });
    renderAt('/procurement');
    expect(await screen.findByText('Không tải được dữ liệu')).toBeInTheDocument();
    expect(screen.getByText(/Anyone with the link/)).toBeInTheDocument();
  });

  it('opens Data Health with grouped warnings', async () => {
    await renderPage('/procurement');
    fireEvent.click(screen.getByTitle('Data Health'));
    expect(await screen.findByText('Package Code trống / bằng 0')).toBeInTheDocument();
  });

  it('switches the whole UI to English and back to Vietnamese with the language switch', async () => {
    act(() => appStore.setState({ lang: 'en' }));
    await renderPage('/procurement');
    expect(screen.getByText('By schedule: which phase a line should be in at cut-off')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask PMS - PEIW/).getAttribute('placeholder')).toBe('Ask PMS - PEIW…  e.g. PS2R LOA Q2-2027');
    await waitFor(() => expect(document.documentElement.lang).toBe('en'));

    fireEvent.click(screen.getByRole('button', { name: 'VI' }));
    expect(await screen.findByText('Theo kế hoạch: dòng đáng lẽ đang ở phase nào tại cut-off')).toBeInTheDocument();
    await waitFor(() => expect(document.documentElement.lang).toBe('vi'));
  });
});
