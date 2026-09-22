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
    expect(screen.getByRole('button', { name: 'Under-Production: đã xong 1 trên 1' })).toHaveTextContent('FAT');
    // No Plan milestone drives these any more.
    expect(screen.queryByRole('button', { name: /^Ready Ex-Works:|^Arrived at Site:/ })).not.toBeInTheDocument();
  });

  it('holds a place for the steps whose dates come from the Expediting Report or the Warehouse module', () => {
    renderOverview();
    const steps = [
      ['Ready Ex-Works', 'Chờ dữ liệu từ Expediting Report', 'Expediting Report'],
      ['Arrived at Site', 'Chờ dữ liệu từ Expediting Report', 'Expediting Report'],
      ['Inspected at Worksite', 'Chờ dữ liệu từ module Kho', 'module Kho'],
      ['Issued to Construction', 'Chờ dữ liệu từ module Kho', 'module Kho'],
    ];
    for (const [label, note, source] of steps) {
      const node = screen.getByText(label).closest('li')!;
      expect(node).toHaveTextContent(note);
      fireEvent.focus(within(node).getByRole('button', { name: `Cách tính ${label}` }));
      expect(screen.getByRole('tooltip')).toHaveTextContent(source);
      fireEvent.blur(within(node).getByRole('button', { name: `Cách tính ${label}` }));
    }
    // In process order after Under-Production.
    const order = screen.getAllByRole('listitem').map((li) => li.textContent ?? '');
    const at = (label: string) => order.findIndex((text) => text.includes(label));
    expect(at('Under-Production')).toBeLessThan(at('Ready Ex-Works'));
    expect(at('Ready Ex-Works')).toBeLessThan(at('Arrived at Site'));
    expect(at('Arrived at Site')).toBeLessThan(at('Inspected at Worksite'));
    expect(at('Inspected at Worksite')).toBeLessThan(at('Issued to Construction'));
  });

  it('explains on hover or focus which date each phase uses and how it counts', () => {
    renderOverview();
    const help = screen.getByRole('button', { name: 'Cách tính TR / Pre-RFQ' });
    fireEvent.mouseEnter(help.parentElement!);
    const tip = screen.getByRole('tooltip');
    expect(help).toHaveAttribute('aria-describedby', tip.id);
    expect(tip).toHaveTextContent('cột "MTO/ TR Approval"');
    expect(tip).toHaveTextContent('≤ cut-off (18-Sep-2026)');
    expect(tip).toHaveTextContent('Tổng: 5 gói');
    fireEvent.mouseLeave(help.parentElement!);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.focus(screen.getByRole('button', { name: 'Cách tính Under-Production' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('cột "FAT/ Final Inspection Completed"');
  });

  it('keeps the help apart from the milestone, which still opens the drawer', () => {
    const router = renderOverview();
    fireEvent.click(screen.getByRole('button', { name: 'Cách tính RFQ / Bidding' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Bids Due');
    expect(router.state.location.search).not.toContain('milestone=');
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
