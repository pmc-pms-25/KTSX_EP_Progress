import { fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { seedStore } from '../../test/seedStore';
import { OverviewPage } from './OverviewPage';

vi.mock('../charts/EChart', () => ({
  EChart: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
}));

function renderOverview(path = '/') {
  const router = createMemoryRouter([{ path: '/', element: <OverviewPage /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(seedStore);

describe('PhaseTimeline', () => {
  it('shows Actual / Plan for every phase', () => {
    renderOverview();
    expect(screen.getByText('Tiến độ theo phase')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TR / Pre-RFQ: đã xong 1 trên 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Logistics: đã xong 1 trên 1' })).toBeInTheDocument();
  });

  it('opens the phase drawer on click and puts the phase in the URL', () => {
    const router = renderOverview();
    fireEvent.click(screen.getByRole('button', { name: 'TR / Pre-RFQ: đã xong 1 trên 2' }));
    expect(router.state.location.search).toContain('milestone=tr');
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Đã xong 1 / 2 tính đến cut-off · 6 dòng có kế hoạch trong phase này')).toBeInTheDocument();
  });
});

describe('PhaseProgressDrawer', () => {
  it('lists late lines first and switches tabs', () => {
    renderOverview('/?milestone=tr');
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('tab', { name: /Trễ/ })).toHaveAttribute('aria-selected', 'true');
    let rows = within(dialog).getAllByRole('button', { name: /@/ });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('MEC-002');
    expect(rows[0]).toHaveTextContent('+69');

    fireEvent.click(within(dialog).getByRole('tab', { name: /Đã xong/ }));
    rows = within(dialog).getAllByRole('button', { name: /@/ });
    expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual(['PIP-002 @ WHJs']);

    fireEvent.click(within(dialog).getByRole('tab', { name: /Tất cả/ }));
    expect(within(dialog).getAllByRole('button', { name: /@/ })).toHaveLength(6);
  });

  it('opens the package drawer from a row', () => {
    const router = renderOverview('/?milestone=tr');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'MEC-002 @ BF' }));
    expect(router.state.location.search).toContain('pkg=MEC-002');
  });

  it('ignores an unknown phase in the URL', () => {
    renderOverview('/?milestone=bogus');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
