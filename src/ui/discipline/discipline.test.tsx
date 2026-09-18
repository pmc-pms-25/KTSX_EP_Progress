import { fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { seedStore } from '../../test/seedStore';
import { PackageDrawer } from '../package/PackageDrawer';
import { DisciplinePage } from './DisciplinePage';

// Canvas charts do not run in jsdom; render a labelled placeholder instead.
vi.mock('../charts/EChart', () => ({
  EChart: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
}));

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/discipline/:name',
        element: (
          <>
            <DisciplinePage />
            <PackageDrawer />
          </>
        ),
      },
      { path: '/', element: <p>overview</p> },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const codesInTable = () =>
  within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((r) => r.querySelector('td p')?.textContent);

beforeEach(seedStore);

describe('DisciplinePage', () => {
  it('lists packages riskiest first', () => {
    renderAt('/discipline/MECHANICAL');
    expect(codesInTable()).toEqual(['MEC-001', 'MEC-002', 'UNCODED-15']);
    expect(within(screen.getByRole('table')).getAllByRole('row')[1]).toHaveTextContent('▲ ROS');
  });

  it('sorts by a column and reverses on a second click', () => {
    renderAt('/discipline/MECHANICAL');
    fireEvent.click(screen.getByRole('button', { name: /^Package/ }));
    expect(codesInTable()).toEqual(['MEC-001', 'MEC-002', 'UNCODED-15']);
    fireEvent.click(screen.getByRole('button', { name: /^Package/ }));
    expect(codesInTable()).toEqual(['UNCODED-15', 'MEC-002', 'MEC-001']);
  });

  it('reports an unknown discipline', () => {
    renderAt('/discipline/NOPE');
    expect(screen.getByText(/Không tìm thấy discipline/)).toBeInTheDocument();
  });

  it('shows risk tags on mobile cards too, not just a colored border', () => {
    renderAt('/discipline/MECHANICAL');
    const lists = screen.getAllByRole('list');
    const mobileList = lists.find((l) => within(l).queryByRole('button', { name: /MEC-001/ }));
    expect(mobileList).toBeDefined();
    expect(within(mobileList!).getByText('▲ ROS')).toBeInTheDocument();
  });
});

describe('PackageDrawer', () => {
  it('shows milestones per facility and switches facility', () => {
    renderAt('/discipline/MECHANICAL?pkg=MEC-001');
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Centrifugal Pump')).toBeInTheDocument();
    expect(within(dialog).getByText('MTO / TR Approval')).toBeInTheDocument();
    expect(within(dialog).getByRole('img', { name: 'Lịch sử điều chỉnh ROS' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /PS2R/ }));
    expect(within(dialog).getByText('Kiểm tra lại ROS')).toBeInTheDocument();
    expect(within(dialog).getByText('Không có lịch sử ROS.')).toBeInTheDocument();
  });

  it('closes with the close button', () => {
    const router = renderAt('/discipline/MECHANICAL?pkg=MEC-001');
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(router.state.location.search).not.toContain('pkg=');
  });

  it('marks overdue Gantt dots with an icon, not color alone', () => {
    renderAt('/discipline/MECHANICAL?pkg=MEC-002');
    const dots = within(screen.getByRole('dialog')).getAllByTitle(/^RFQ Issue/);
    expect(dots.some((el) => el.textContent === '!')).toBe(true);
  });
});
