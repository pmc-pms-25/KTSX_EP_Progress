import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../../App';
import { engineeringStore } from '../../modules/engineering/store';
import { appStore } from '../../store/appStore';
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
    expect(await screen.findByText('AI Insights')).toBeInTheDocument();
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

  it('does not load the engineering source while on procurement', async () => {
    renderAt('/procurement');
    await screen.findByText('AI Insights');
    expect(engineeringStore.getState().status).toBe('idle');
  });

  it('explains a module without a configured source', async () => {
    renderAt('/engineering');
    expect(await screen.findByText('Chưa cấu hình nguồn dữ liệu')).toBeInTheDocument();
    expect(await screen.findByText('Thêm "dataSources.engineering" vào config.json để tải dashboard Engineering.')).toBeInTheDocument();
  });

  it('remembers only the filter keys of the module', async () => {
    renderAt('/procurement?discipline=MECHANICAL&pkg=MEC-001');
    await screen.findByText('AI Insights');
    await waitFor(() => expect(appStore.getState().lastQuery.procurement).toBe('?discipline=MECHANICAL'));
  });
});

describe('filterQuery', () => {
  it('keeps listed keys in order and drops the rest', () => {
    expect(filterQuery('?pkg=X&discipline=A&q=loa&discipline=B', ['discipline', 'q'])).toBe('?discipline=A&q=loa&discipline=B');
    expect(filterQuery('?pkg=X', ['discipline'])).toBe('');
  });
});
