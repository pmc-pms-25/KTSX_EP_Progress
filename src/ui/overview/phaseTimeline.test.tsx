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
  it('shows packages completed / planned for every phase, with its milestone', () => {
    renderOverview();
    expect(screen.getByText('Tiến độ theo phase')).toBeInTheDocument();
    const tr = screen.getByRole('button', { name: 'TR / Pre-RFQ: đã xong 2 trên 2' });
    expect(tr).toHaveTextContent('TR');
    expect(screen.getByRole('button', { name: 'RFQ / Bidding: đã xong 1 trên 2' })).toHaveTextContent('Bids');
    expect(screen.getByRole('button', { name: 'Logistics: đã xong 1 trên 1' })).toBeInTheDocument();
  });

  it('opens the phase drawer on click and puts the phase in the URL', () => {
    const router = renderOverview();
    fireEvent.click(screen.getByRole('button', { name: 'RFQ / Bidding: đã xong 1 trên 2' }));
    expect(router.state.location.search).toContain('milestone=rfq');
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Đã xong 1 / 2 gói tính đến cut-off · 5 gói có kế hoạch trong phase này')).toBeInTheDocument();
    expect(within(dialog).getByText('Bids Due')).toBeInTheDocument();
  });
});

describe('PhaseProgressDrawer', () => {
  it('lists late packages first and switches tabs', () => {
    renderOverview('/?milestone=rfq');
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('tab', { name: /Trễ/ })).toHaveAttribute('aria-selected', 'true');
    let rows = within(dialog).getAllByRole('button', { name: /@/ });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('MEC-002');
    expect(rows[0]).toHaveTextContent('+29');

    fireEvent.click(within(dialog).getByRole('tab', { name: /Đã xong/ }));
    rows = within(dialog).getAllByRole('button', { name: /@/ });
    expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual(['PIP-002 @ WHJs']);

    // MEC-001 is one package across two facilities.
    fireEvent.click(within(dialog).getByRole('tab', { name: /Tất cả/ }));
    rows = within(dialog).getAllByRole('button', { name: /@/ });
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.getAttribute('aria-label'))).toContain('MEC-001 @ PS2K TS, PS2R');
  });

  it('opens the package drawer from a row', () => {
    const router = renderOverview('/?milestone=rfq');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'MEC-002 @ BF' }));
    expect(router.state.location.search).toContain('pkg=MEC-002');
  });

  it('ignores an unknown phase in the URL', () => {
    renderOverview('/?milestone=bogus');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
