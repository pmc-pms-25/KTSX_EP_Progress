import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { routes } from '../../App';
import { engineeringStore } from '../../modules/engineering/store';
import { appStore } from '../../store/appStore';
import { sampleRegister } from '../../test/engFixture';
import { seedStore } from '../../test/seedStore';
import { filterQuery } from './ModuleRoute';

vi.mock('../charts/EChart', () => ({
  EChart: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
}));

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(seedStore);

describe('routing', () => {
  it('sends the root to procurement for now', async () => {
    const router = renderAt('/');
    await waitFor(() => expect(router.state.location.pathname).toBe('/procurement'));
    expect(await screen.findByText('Phase funnel')).toBeInTheDocument();
  });

  describe('default facility', () => {
    beforeEach(() => {
      const config = appStore.getState().config!;
      appStore.setState({ config: { ...config, dataSources: { procurement: { type: 'google-sheet', url: 'x', defaultFacility: 'BF' } } } });
    });

    it('selects it on the first visit without filters', async () => {
      const router = renderAt('/');
      await waitFor(() => expect(router.state.location.search).toBe('?facility=BF'));
      expect(router.state.location.pathname).toBe('/procurement');
      expect(await screen.findByText('Phase funnel')).toBeInTheDocument();
    });

    it('keeps the filters of a shared link', async () => {
      const router = renderAt('/procurement?discipline=PIPING');
      await screen.findByText('Phase funnel');
      expect(router.state.location.search).toBe('?discipline=PIPING');
    });

    it('does not come back after the user clears it', async () => {
      const router = renderAt('/procurement');
      await waitFor(() => expect(router.state.location.search).toBe('?facility=BF'));
      await act(() => router.navigate('/procurement'));
      await screen.findByText('Phase funnel');
      expect(router.state.location.search).toBe('');
    });
  });

  it('translates old filter links', async () => {
    const router = renderAt('/?d=MECHANICAL,PIPING&pkg=MEC-001');
    await waitFor(() => expect(router.state.location.pathname).toBe('/procurement'));
    await waitFor(() => expect(router.state.location.search).toBe('?discipline=MECHANICAL&discipline=PIPING&pkg=MEC-001'));
  });

  it('translates old discipline links', async () => {
    const router = renderAt('/discipline/MECHANICAL?f=BF');
    await waitFor(() => expect(router.state.location.pathname).toBe('/procurement/discipline/MECHANICAL'));
    await waitFor(() => expect(router.state.location.search).toBe('?facility=BF'));
  });

  it('shows a 404 page for unknown paths', async () => {
    renderAt('/nope');
    expect(await screen.findByText('Không tìm thấy trang.')).toBeInTheDocument();
  });

  it('shows the 404 page inside the module for unknown module sub-paths', async () => {
    engineeringStore.setState({ status: 'ready', data: sampleRegister(), warnings: [] });
    for (const [path, module] of [['/procurement/foo', 'procurement'], ['/engineering/foo/bar', 'engineering']]) {
      const router = renderAt(path);
      expect(await screen.findByText('Không tìm thấy trang.')).toBeInTheDocument();
      expect(router.state.matches.map((m) => m.route.path)).toEqual(['/', module, '*']);
      cleanup();
    }
  });

  it('does not load the engineering source while on procurement', async () => {
    renderAt('/procurement');
    await screen.findByText('Phase funnel');
    expect(engineeringStore.getState().status).toBe('idle');
  });

  it('explains a module without a configured source', async () => {
    renderAt('/engineering');
    expect(await screen.findByText('Chưa cấu hình nguồn dữ liệu')).toBeInTheDocument();
    expect(await screen.findByText('Thêm "dataSources.engineering" vào config.json để tải dashboard Engineering.')).toBeInTheDocument();
  });

  it('remembers only the filter keys of the module', async () => {
    renderAt('/procurement?discipline=MECHANICAL&pkg=MEC-001');
    await screen.findByText('Phase funnel');
    await waitFor(() => expect(appStore.getState().lastQuery.procurement).toBe('?discipline=MECHANICAL'));
  });
});

describe('filterQuery', () => {
  it('keeps listed keys in order and drops the rest', () => {
    expect(filterQuery('?pkg=X&discipline=A&q=loa&discipline=B', ['discipline', 'q'])).toBe('?discipline=A&q=loa&discipline=B');
    expect(filterQuery('?pkg=X', ['discipline'])).toBe('');
  });
});

describe('route errors', () => {
  /** The real root route (shell, errorElement, HydrateFallback) around test pages. */
  function withRoot(children: RouteObject[]): RouteObject[] {
    const [{ path, element, errorElement, HydrateFallback }] = routes;
    return [{ path, element, errorElement, HydrateFallback, children }];
  }

  it('shows a translated reload screen when a page chunk fails to load', async () => {
    const broken = withRoot([{ path: 'boom', lazy: () => Promise.reject(new Error('Failed to fetch dynamically imported module')) }]);
    const router = createMemoryRouter(broken, { initialEntries: ['/boom'] });
    render(<RouterProvider router={router} />);
    expect(await screen.findByText('Không tải được trang này')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tải lại trang' })).toBeInTheDocument();
    expect(screen.queryByText(/Unexpected Application Error/)).not.toBeInTheDocument();
  });

  it('shows the loading screen while the first page chunk loads', async () => {
    let resolve!: () => void;
    const pending = new Promise<void>((r) => (resolve = r));
    const slow = withRoot([{ path: 'slow', lazy: () => pending.then(() => ({ Component: () => <p>slow page</p> })) }]);
    const router = createMemoryRouter(slow, { initialEntries: ['/slow'] });
    render(<RouterProvider router={router} />);
    expect(await screen.findByText('Đọc cấu hình…')).toBeInTheDocument();
    resolve();
    expect(await screen.findByText('slow page')).toBeInTheDocument();
  });
});
