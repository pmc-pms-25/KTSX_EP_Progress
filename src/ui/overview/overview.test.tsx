import { render, screen } from '@testing-library/react';
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
  it('shows KPI tiles and the widgets, without AI Insights or the facility heatmap', () => {
    renderOverview();
    expect(screen.getByRole('button', { name: /ROS at risk/ })).toHaveTextContent('1');
    expect(screen.getByText('Phase funnel')).toBeInTheDocument();
    expect(screen.getByText('Discipline health')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Số mốc đến hạn theo tháng' })).toBeInTheDocument();
    expect(screen.queryByText('AI Insights')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Heatmap số mốc theo facility và tháng' })).not.toBeInTheDocument();
  });

  it('shows the empty state when filters match nothing', () => {
    renderOverview('/?q=zzzz');
    expect(screen.getByText('Không có dòng nào khớp bộ lọc hiện tại.')).toBeInTheDocument();
  });
});
