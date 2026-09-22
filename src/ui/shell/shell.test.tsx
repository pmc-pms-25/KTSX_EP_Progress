import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, MemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { routes } from '../../App';
import { engineeringStore } from '../../modules/engineering/store';
import { procurementStore } from '../../modules/procurement/store';
import { sampleRegister } from '../../test/engFixture';
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

const ENG_READY = { status: 'ready' as const, data: sampleRegister(), warnings: [] };

beforeEach(seedStore);

describe('shared shell per module', () => {
  it('names the active module in the header subtitle', async () => {
    renderAt('/procurement');
    await screen.findByText('Phase funnel');
    expect(await screen.findByText('Test Project · Procurement')).toBeInTheDocument();
  });

  it('shows the engineering search, facets and document count', async () => {
    engineeringStore.setState(ENG_READY);
    renderAt('/engineering');
    await screen.findByRole('button', { name: /Chưa phát hành/ });
    expect(await screen.findByText('Test Project · Engineering')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Tìm tài liệu/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Loại tài liệu/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\/ 6 tài liệu/).length).toBeGreaterThan(0);
  });

  it('draws Facility then Discipline with their selection, hides the other facets, then Clear filters', async () => {
    renderAt('/procurement?facility=BF');
    await screen.findByText('Phase funnel');
    const facets = screen.getAllByRole('button', { name: /^(Facility|Discipline|Tagged\/Bulk|Phase|Cảnh báo)/ }).map((b) => b.textContent);
    expect(facets.slice(0, 2)).toEqual(['Facility: BF▾', 'Discipline: Tất cả▾']);
    expect(screen.queryByRole('button', { name: /Tagged\/Bulk|Phase \(kế hoạch\)|Cảnh báo/ })).not.toBeInTheDocument();
    // No "shown / total" count on Procurement; Clear filters follows the dropdowns.
    expect(screen.queryByText(/\/ 6 dòng/)).not.toBeInTheDocument();
    const discipline = screen.getAllByRole('button', { name: /^Discipline/ })[0];
    expect(discipline.parentElement!.nextElementSibling).toHaveTextContent('Xóa bộ lọc');
  });

  it('ignores URL facet values that are not among the facet options', async () => {
    renderAt('/procurement?flag=bad&type=Weird');
    await screen.findByText('Phase funnel');
    expect(await screen.findByRole('button', { name: 'Bộ lọc' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xóa bộ lọc' })).not.toBeInTheDocument();
    for (const button of screen.getAllByRole('button', { name: /^Facility/ })) expect(button).toHaveTextContent('Facility: Tất cả');
    cleanup();

    const router = renderAt('/procurement?flag=bad&type=Bulk&pkg=MEC-001');
    await screen.findByText('Phase funnel');
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
      await screen.findByRole('button', { name: /Chưa phát hành/ });
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
    await screen.findByRole('button', { name: /Chưa phát hành/ });
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
