/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OperatorLogo from '../components/shared/OperatorLogo';

vi.mock('../../assets/logos/Yemen_Mobile.png', () => ({ default: '/ym-logo.png' }));
vi.mock('../../assets/logos/YOU.jpeg', () => ({ default: '/you-logo.jpeg' }));
vi.mock('../../assets/logos/Sabafon.jpeg', () => ({ default: '/sf-logo.jpeg' }));

describe('OperatorLogo', () => {
  it('renders Yemen Mobile logo', () => {
    render(<OperatorLogo provider="Yemen Mobile" />);
    const img = screen.getByAltText('Yemen Mobile');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('Yemen_Mobile');
  });

  it('renders Sabafon logo', () => {
    render(<OperatorLogo provider="Sabafon" />);
    const img = screen.getByAltText('Sabafon');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('Sabafon');
  });

  it('renders YOU logo', () => {
    render(<OperatorLogo provider="YOU" />);
    const img = screen.getByAltText('YOU');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toContain('YOU');
  });

  it('renders with custom size', () => {
    render(<OperatorLogo provider="Yemen Mobile" size="lg" />);
    const img = screen.getByAltText('Yemen Mobile');
    expect(img.parentElement).toHaveStyle({ width: '48px', height: '48px' });
  });

  it('handles unknown operator gracefully', () => {
    const { container } = render(<OperatorLogo provider="UnknownProvider" />);
    expect(container.innerHTML).toBe('');
  });
});
