import { render, screen } from '@testing-library/react';
import PrintedHeadline from '../components/home/PrintedHeadline.jsx';

describe('PrintedHeadline', () => {
  it('keeps the sentence intact for assistive technology (the madder plate is hidden)', () => {
    render(<PrintedHeadline text="Hear the hands before they go quiet." />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Hear the hands before they go quiet.' }),
    ).toBeInTheDocument();
  });
  it('splits on whitespace only, in every script', () => {
    const { container } = render(<PrintedHeadline text="ಕೈಗಳು ಮೌನವಾಗುವ ಮುನ್ನ" />);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
  });
});
