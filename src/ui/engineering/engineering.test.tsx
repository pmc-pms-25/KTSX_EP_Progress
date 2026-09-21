import { render, screen } from '@testing-library/react';
import { engineeringStore } from '../../modules/engineering/store';
import { seedStore } from '../../test/seedStore';
import { EngineeringPage } from './EngineeringPage';

beforeEach(seedStore);

describe('EngineeringPage', () => {
  it('shows what was loaded from the engineering source', () => {
    engineeringStore.setState({ status: 'ready', data: { sheetName: 'ENG', sheets: ['ENG'], rowCount: 42 } });
    render(<EngineeringPage />);
    expect(screen.getByText('Đã tải 42 dòng từ sheet “ENG”. Nội dung dashboard Engineering sẽ được thiết kế ở buổi sau.')).toBeInTheDocument();
  });
});
