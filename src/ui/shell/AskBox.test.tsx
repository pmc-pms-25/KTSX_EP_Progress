import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { AskBox } from './AskBox';

const VOCAB = { disciplines: [], facilities: [] };

function Harness() {
  const [q, setQ] = useState('');
  return (
    <>
      <AskBox value={q} vocab={VOCAB} onChange={(next) => setQ(next.trim())} />
      <p data-testid="committed">{q}</p>
    </>
  );
}

describe('AskBox', () => {
  it('does not eat the trailing space while typing a second word', () => {
    vi.useFakeTimers();
    render(<Harness />);
    const input = screen.getByPlaceholderText(/Ask PMS - PEIW/) as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'PS2R ' } });
    act(() => vi.advanceTimersByTime(300));
    // The committed value is trimmed, but the draft (with the trailing space) must survive.
    expect(input.value).toBe('PS2R ');

    fireEvent.change(input, { target: { value: 'PS2R LOA' } });
    act(() => vi.advanceTimersByTime(300));
    expect(input.value).toBe('PS2R LOA');
    expect(screen.getByTestId('committed').textContent).toBe('PS2R LOA');

    vi.useRealTimers();
  });
});
