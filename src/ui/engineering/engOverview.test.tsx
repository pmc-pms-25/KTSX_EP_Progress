import { fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { engineeringStore } from '../../modules/engineering/store';
import { doc } from '../../test/engFixture';
import { seedEngineering, seedStore } from '../../test/seedStore';
import { EngOverviewPage } from './EngOverviewPage';

// Canvas charts do not run in jsdom; render a labelled placeholder instead.
vi.mock('../charts/EChart', () => ({
  EChart: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
}));

function renderPage(path = '/') {
  const router = createMemoryRouter([{ path: '/', element: <EngOverviewPage /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  seedStore();
  seedEngineering();
});

describe('EngOverviewPage', () => {
  it('shows the KPI tiles', () => {
    renderPage();
    expect(screen.getByText('Tài liệu trong register').parentElement).toHaveTextContent('6');
    expect(screen.getByRole('button', { name: /Chưa phát hành/ })).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: /Quá hạn/ })).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: /Bị từ chối/ })).toHaveTextContent('1');
  });

  it('toggles flag and stage filters from the tiles', () => {
    const router = renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Chưa phát hành/ }));
    expect(router.state.location.search).toContain('flag=notIssued');
    fireEvent.click(screen.getByRole('button', { name: /IFC \/ IFU/ }));
    expect(router.state.location.search).toContain('phase=final');
  });

  it('hides Overdue without planned dates and Rejected without Code 3/4', () => {
    engineeringStore.setState({ data: { documents: [doc('PQ-CLQ0-PIP-LAY-MPC-00001-00', { rev: 'K01' })] } });
    renderPage();
    expect(screen.queryByRole('button', { name: /Quá hạn/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Bị từ chối/ })).not.toBeInTheDocument();
  });

  it('shows the empty state when filters match nothing', () => {
    renderPage('/?q=zzzz');
    expect(screen.getByText('Không có dòng nào khớp bộ lọc hiện tại.')).toBeInTheDocument();
  });

  it('draws the Phase E timeline and opens a stage drawer, late documents first', async () => {
    const router = renderPage();
    expect(screen.getByText('Tiến độ Phase E')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đang review (IFI/IFR): 4 / 6 tài liệu' }));
    expect(router.state.location.search).toContain('stage=review');
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('4 / 6 tài liệu đã đạt bước này · 1 trễ');
    const rows = within(dialog).getAllByRole('button', { name: /^PQ-/ });
    expect(rows[0]).toHaveAccessibleName('PQ-CPC0-STR-BOD-MPC-00006-00');
    fireEvent.click(rows[0]);
    expect(router.state.location.search).toContain('doc=PQ-CPC0-STR-BOD-MPC-00006-00');
  });

  it('opens the stage drawer from the URL', async () => {
    renderPage('/?stage=final');
    expect(await screen.findByRole('dialog')).toHaveTextContent('1 / 6 tài liệu đã đạt bước này · 0 trễ');
  });
});
