import { fireEvent, render, screen } from '@testing-library/react';
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
  it('shows KPI tiles, insights and every widget', () => {
    renderOverview();
    expect(screen.getByRole('button', { name: /ROS at risk/ })).toHaveTextContent('1');
    expect(screen.getByText('1 dòng có nguy cơ trễ ROS')).toBeInTheDocument();
    expect(screen.getByText('Phase funnel')).toBeInTheDocument();
    expect(screen.getByText('Discipline health')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Số mốc đến hạn theo tháng' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Heatmap số mốc theo facility và tháng' })).toBeInTheDocument();
  });

  it('reveals insight evidence with Why?', () => {
    renderOverview();
    fireEvent.click(screen.getAllByRole('button', { name: 'Why?' })[0]);
    expect(screen.getByText(/@ PS2R · dòng 7/)).toBeInTheDocument();
  });

  it('applies an insight filter to the URL', () => {
    const router = renderOverview();
    fireEvent.click(screen.getAllByRole('button', { name: 'Lọc theo insight' })[0]);
    expect(router.state.location.search).toContain('flag=rosRisk');
  });

  it('shows the empty state when filters match nothing', () => {
    renderOverview('/?q=zzzz');
    expect(screen.getByText('Không có dòng nào khớp bộ lọc hiện tại.')).toBeInTheDocument();
  });
});
