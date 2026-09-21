import { fireEvent, render, screen } from '@testing-library/react';
import { generateInsights } from '../../analytics/insights/registry';
import { sampleMetrics, TEST_CTX } from '../../test/planFixture';
import { seedStore } from '../../test/seedStore';
import { InsightsPanel } from './InsightsPanel';

beforeEach(seedStore);

function renderPanel() {
  const metrics = sampleMetrics();
  const onApply = vi.fn();
  render(<InsightsPanel insights={generateInsights({ metrics, ctx: TEST_CTX })} metrics={metrics} onApply={onApply} onOpenPackage={vi.fn()} />);
  return onApply;
}

describe('InsightsPanel (hidden on the overview, kept for later)', () => {
  it('reveals insight evidence with Why?', () => {
    renderPanel();
    expect(screen.getByText('1 dòng có nguy cơ trễ ROS')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Why?' })[0]);
    expect(screen.getByText(/@ PS2R · dòng 7/)).toBeInTheDocument();
  });

  it('applies an insight filter', () => {
    const onApply = renderPanel();
    fireEvent.click(screen.getAllByRole('button', { name: 'Lọc theo insight' })[0]);
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ flags: ['rosRisk'] }));
  });
});
