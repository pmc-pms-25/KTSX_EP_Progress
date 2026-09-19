import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { appStore } from '../../store/appStore';
import { FloatBadge } from './Chip';
import { ErrorBoundary } from './ErrorBoundary';
import { MultiSelect } from './MultiSelect';

// These components render Vietnamese text below; keep the store's default 'en' from masking it.
beforeEach(() => appStore.setState({ lang: 'vi' }));

function Harness() {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <>
      <MultiSelect
        label="Facility"
        options={[
          { value: 'BF', label: 'BF' },
          { value: 'PS2R', label: 'PS2R' },
        ]}
        selected={selected}
        onChange={setSelected}
      />
      <p data-testid="selected">{selected.join(',')}</p>
    </>
  );
}

function Boom(): never {
  throw new Error('kaboom');
}

describe('MultiSelect', () => {
  it('toggles options and clears them', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /Facility/ }));
    fireEvent.click(screen.getByLabelText('PS2R'));
    fireEvent.click(screen.getByLabelText('BF'));
    expect(screen.getByTestId('selected').textContent).toBe('PS2R,BF');
    fireEvent.click(screen.getByText('Bỏ chọn tất cả'));
    expect(screen.getByTestId('selected').textContent).toBe('');
  });

  it('closes on Escape', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /Facility/ }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('ErrorBoundary', () => {
  it('contains a failing widget', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary label="Biểu đồ">
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Không hiển thị được “Biểu đồ”');
    expect(screen.getByRole('alert')).toHaveTextContent('kaboom');
    spy.mockRestore();
  });

  it('re-renders the fallback text when the language changes, keeping the error shown', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary label="Biểu đồ">
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Không hiển thị được “Biểu đồ”');

    act(() => appStore.setState({ lang: 'en' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Could not display “Biểu đồ”');
    expect(screen.getByRole('alert')).toHaveTextContent('kaboom');
    spy.mockRestore();
  });
});

describe('FloatBadge', () => {
  it('marks negative float as risk', () => {
    render(<FloatBadge days={-19} />);
    expect(screen.getByText(/-19d/)).toHaveClass('text-critical');
  });

  it('shows a dash without data', () => {
    render(<FloatBadge days={undefined} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
