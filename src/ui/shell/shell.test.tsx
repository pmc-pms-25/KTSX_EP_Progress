import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, MemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { routes } from '../../App';
import { engineeringStore } from '../../modules/engineering/store';
import { procurementStore } from '../../modules/procurement/store';
import { seedStore } from '../../test/seedStore';
import { useFacetParams } from './useFacetParams';

vi.mock('../charts/EChart', () => ({
  EChart: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
}));

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

const ENG_READY = { status: 'ready' as const, data: { sheetName: 'ENG', sheets: ['ENG'], rowCount: 3 }, warnings: [] };

beforeEach(seedStore);

describe('shared shell per module', () => {
  it('names the active module in the header subtitle', async () => {
    renderAt('/procurement');
    await screen.findByText('AI Insights');
    expect(await screen.findByText('Test Project · Procurement')).toBeInTheDocument();
  });

  it('hides the AskBox and the filter bar on a module without search or facets', async () => {
    engineeringStore.setState(ENG_READY);
    renderAt('/engineering');
    await screen.findByText(/Đã tải 3 dòng/);
    expect(await screen.findByText('Test Project · Engineering')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Ask PMS - PEIW/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Discipline/ })).not.toBeInTheDocument();
  });

  it('draws the procurement facets with translated labels and the result count', async () => {
    renderAt('/procurement');
    await screen.findByText('AI Insights');
    for (const label of ['Discipline', 'Facility', 'Tagged/Bulk', 'Phase (kế hoạch)', 'Cảnh báo']) {
      expect(screen.getAllByRole('button', { name: new RegExp(label.replace(/[()]/g, '\\$&')) }).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText((_, el) => el?.textContent === '6 / 6 dòng').length).toBeGreaterThan(0);
  });

  it('ignores URL facet values that are not among the facet options', async () => {
    renderAt('/procurement?flag=bad&type=Weird');
    await screen.findByText('AI Insights');
    expect(await screen.findByRole('button', { name: 'Bộ lọc' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xóa bộ lọc' })).not.toBeInTheDocument();
    for (const button of screen.getAllByRole('button', { name: /Tagged\/Bulk|Cảnh báo/ })) expect(button.textContent).not.toMatch(/\d/);
    cleanup();

    const router = renderAt('/procurement?flag=bad&type=Bulk&pkg=MEC-001');
    await screen.findByText('AI Insights');
    expect(await screen.findByRole('button', { name: 'Bộ lọc 1' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Xóa bộ lọc' })[0]);
    // Clear still removes every filter key of the module, known or not.
    await waitFor(() => expect(router.state.location.search).toBe('?pkg=MEC-001'));
  });

  it('refreshes the store of the active module', async () => {
    const original = engineeringStore.getState().load;
    const load = vi.fn(async () => {});
    engineeringStore.setState({ ...ENG_READY, load });
    try {
      renderAt('/engineering');
      await screen.findByText(/Đã tải 3 dòng/);
      fireEvent.click(await screen.findByTitle('Tải lại dữ liệu'));
      await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    } finally {
      engineeringStore.setState({ load: original });
    }
  });

  it('hides Refresh and Data Health for a module without a configured source', async () => {
    renderAt('/engineering');
    await screen.findByText('Chưa cấu hình nguồn dữ liệu');
    await waitFor(() => expect(engineeringStore.getState().status).toBe('unconfigured'));
    await waitFor(() => expect(screen.queryByTitle('Data Health')).not.toBeInTheDocument());
    expect(screen.queryByTitle('Tải lại dữ liệu')).not.toBeInTheDocument();
  });

  it('counts Data Health warnings of the active module only', async () => {
    engineeringStore.setState(ENG_READY);
    renderAt('/engineering');
    await screen.findByText(/Đã tải 3 dòng/);
    expect(procurementStore.getState().warnings.length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByTitle('Data Health').textContent).not.toMatch(/\d/));
  });
});

describe('useFacetParams', () => {
  function wrapper(initial: string) {
    return ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>;
  }

  it('reads repeated keys, writes them back and clears only its keys', async () => {
    const { result } = renderHook(
      () => ({ facets: useFacetParams(['discipline', 'q']), location: useLocation() }),
      { wrapper: wrapper('/procurement?discipline=A&discipline=B&pkg=X&q=loa') },
    );
    expect(result.current.facets.values).toEqual({ discipline: ['A', 'B'], q: ['loa'] });
    act(() => result.current.facets.setValues('discipline', ['C', 'D, E']));
    await waitFor(() => expect(result.current.location.search).toBe('?pkg=X&q=loa&discipline=C&discipline=D%2C+E'));
    act(() => result.current.facets.clear());
    await waitFor(() => expect(result.current.location.search).toBe('?pkg=X'));
  });
});
