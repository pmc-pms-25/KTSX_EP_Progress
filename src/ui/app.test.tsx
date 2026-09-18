import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../App';
import { appStore } from '../store/appStore';
import { seedStore } from '../test/seedStore';

// Canvas charts do not run in jsdom; render a labelled placeholder instead.
vi.mock('./charts/EChart', () => ({
  EChart: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
}));

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(seedStore);

describe('dashboard app', () => {
  it('renders the shell and the overview', () => {
    renderAt('/');
    expect(screen.getByText('PMS - PEIW')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask PMS - PEIW/)).toBeInTheDocument();
    expect(screen.getByText('AI Insights')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe(appStore.getState().theme);
  });

  it('filters through a KPI tile and shows the row count', () => {
    const router = renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: /ROS at risk/ }));
    expect(router.state.location.search).toContain('flag=rosRisk');
    expect(screen.getAllByText((_, el) => el?.textContent === '1 / 6 dòng').length).toBeGreaterThan(0);
  });

  it('drills into a discipline and opens a package drawer', () => {
    const router = renderAt('/');
    fireEvent.click(screen.getByRole('link', { name: /MECHANICAL/ }));
    expect(router.state.location.pathname).toBe('/discipline/MECHANICAL');
    fireEvent.click(within(screen.getByRole('table')).getByText('Centrifugal Pump'));
    expect(router.state.location.search).toContain('pkg=MEC-001');
    expect(within(screen.getByRole('dialog')).getByText('Chi tiết mốc')).toBeInTheDocument();
  });

  it('toggles the theme', () => {
    renderAt('/');
    const before = appStore.getState().theme;
    fireEvent.click(screen.getByRole('button', { name: /Chuyển sang giao diện/ }));
    expect(appStore.getState().theme).not.toBe(before);
    expect(document.documentElement.dataset.theme).toBe(appStore.getState().theme);
  });

  it('shows the error screen when loading failed', () => {
    act(() => {
      appStore.setState({ status: 'error', plan: undefined, metrics: [], error: { title: 'Không tải được dữ liệu', message: 'denied', code: 'ACCESS_DENIED' } });
    });
    renderAt('/');
    expect(screen.getByText('Không tải được dữ liệu')).toBeInTheDocument();
    expect(screen.getByText(/Anyone with the link/)).toBeInTheDocument();
  });

  it('opens Data Health with grouped warnings', () => {
    renderAt('/');
    fireEvent.click(screen.getByTitle('Data Health'));
    expect(screen.getByText('Package Code trống / bằng 0')).toBeInTheDocument();
  });
});
