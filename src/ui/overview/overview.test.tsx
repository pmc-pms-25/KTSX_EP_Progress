import { fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { seedStore } from '../../test/seedStore';
import { OverviewPage } from './OverviewPage';

// Canvas charts do not run in jsdom; render a labelled placeholder instead.
vi.mock('../charts/EChart', () => ({
  EChart: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
}));

function renderOverview(path = '/') {
  const router = createMemoryRouter([{ path: '/', element: <OverviewPage /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(seedStore);

describe('OverviewPage', () => {
  it('shows the headline cards and the widgets, without AI Insights or the facility heatmap', () => {
    renderOverview();
    expect(screen.getAllByText('Packages')[0].parentElement).toHaveTextContent('4');
    expect(screen.getByText('Tiến độ tổng thể').parentElement).toHaveTextContent('—%');
    expect(screen.queryByRole('button', { name: /ROS at risk/ })).not.toBeInTheDocument();
    expect(screen.getByText('Phase funnel')).toBeInTheDocument();
    expect(screen.getByText('Discipline health')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Số mốc đến hạn theo tháng' })).toBeInTheDocument();
    expect(screen.queryByText('AI Insights')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Heatmap số mốc theo facility và tháng' })).not.toBeInTheDocument();
  });

  it('lists the riskiest lines by forecast Buffer and opens the package drawer', () => {
    const router = renderOverview();
    const card = screen.getByRole('region', { name: 'Top 10 rủi ro' });
    const rows = within(card).getAllByRole('button');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('MEC-001');
    expect(rows[0]).toHaveTextContent('PS2R');
    expect(rows[0]).toHaveTextContent('-19');
    expect(within(card).getByText('Facility')).toBeInTheDocument();
    fireEvent.click(rows[0]);
    expect(router.state.location.search).toContain('pkg=MEC-001');
  });

  it('names the facility and drops its column when exactly one facility is filtered', () => {
    renderOverview('/?facility=PS2R');
    const card = screen.getByRole('region', { name: 'Top 10 rủi ro · PS2R' });
    expect(within(card).queryByText('Facility')).not.toBeInTheDocument();
    expect(within(card).getByRole('button')).toHaveTextContent('MEC-001');
  });

  it('says so when no line is at risk', () => {
    renderOverview('/?facility=BF');
    expect(within(screen.getByRole('region', { name: 'Top 10 rủi ro · BF' })).getByText('Không có gói rủi ro')).toBeInTheDocument();
  });

  it('shows the empty state when filters match nothing', () => {
    renderOverview('/?q=zzzz');
    expect(screen.getByText('Không có dòng nào khớp bộ lọc hiện tại.')).toBeInTheDocument();
  });
});
