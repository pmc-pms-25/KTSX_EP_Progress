import { act, render, screen } from '@testing-library/react';
import { appStore } from '../store/appStore';
import { msg } from './message';
import { useT } from './useT';

function Demo() {
  const { t, lang } = useT();
  return (
    <p data-testid="out">
      {lang}:{t('error.title.unknown')}:{t(msg('header.synced', { time: '5 min ago' }))}
    </p>
  );
}

describe('useT', () => {
  it('renders English by default and Vietnamese after setLang', () => {
    render(<Demo />);
    expect(screen.getByTestId('out').textContent).toBe('en:Unknown error:Synced 5 min ago');

    act(() => appStore.getState().setLang('vi'));
    expect(screen.getByTestId('out').textContent).toBe('vi:Lỗi không xác định:Đồng bộ 5 min ago');
  });
});
