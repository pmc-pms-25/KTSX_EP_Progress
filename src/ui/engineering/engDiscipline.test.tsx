import { fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../../App';
import { seedEngineering, seedStore } from '../../test/seedStore';

vi.mock('../charts/EChart', () => ({
  EChart: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
}));

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  seedStore();
  seedEngineering();
});

describe('Engineering discipline page', () => {
  it('lists the discipline documents, overdue first, and opens one', async () => {
    const router = renderAt('/engineering/discipline/PIP');
    expect(await screen.findByRole('heading', { name: 'PIP' })).toBeInTheDocument();
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('PQ-CLQ0-PIP-ISO-MPC-00002-00'),
      expect.stringContaining('PQ-CLQ0-PIP-CAL-MPC-00003-00'),
      expect.stringContaining('PQ-CLQ0-PIP-LAY-MPC-00001-00'),
    ]);
    fireEvent.click(rows[0]);
    expect(router.state.location.search).toContain('doc=PQ-CLQ0-PIP-ISO-MPC-00002-00');
    expect(await screen.findByRole('dialog')).toHaveTextContent('ISOMETRIC');
  });

  it('says so for an unknown discipline', async () => {
    renderAt('/engineering/discipline/NOPE');
    expect(await screen.findByText('Không tìm thấy discipline “NOPE”.')).toBeInTheDocument();
  });
});

describe('DocumentDrawer', () => {
  it('shows a document and its steps from the URL, whatever the filters', async () => {
    renderAt('/engineering?discipline=STR&doc=PQ-CLQ0-PIP-LAY-MPC-00001-00');
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('PIPING LAYOUT');
    expect(dialog).toHaveTextContent('TRM-1');
    expect(dialog).toHaveTextContent('Hoàn tất (IFC/IFU)');
    expect(within(dialog).getAllByRole('row')).toHaveLength(4);
  });

  it('reports an unknown document', async () => {
    renderAt('/engineering?doc=NOPE');
    expect(await screen.findByText('Không tìm thấy tài liệu NOPE.')).toBeInTheDocument();
  });
});
