// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Heart } from 'lucide-react';
import { Icon } from '@/design-system/foundations/icons/Icon';

describe('Icon', () => {
  it('applies the class for the requested size', () => {
    const { container } = render(<Icon icon={Heart} size="lg" aria-hidden />);

    expect(container.querySelector('svg')).toHaveClass('w-6', 'h-6');
  });

  it('defaults to size md when no size is given', () => {
    const { container } = render(<Icon icon={Heart} aria-hidden />);

    expect(container.querySelector('svg')).toHaveClass('w-5', 'h-5');
  });

  it('does not hardcode a color, leaving currentColor for the surrounding context to control', () => {
    const { container } = render(<Icon icon={Heart} aria-hidden />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg?.className.baseVal ?? svg?.getAttribute('class')).not.toMatch(/text-/);
  });

  it('hides a decorative icon from assistive technology', () => {
    const { container } = render(<Icon icon={Heart} aria-hidden />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('gives an informative icon an accessible name instead of hiding it', () => {
    render(<Icon icon={Heart} aria-label="Favorito" />);

    const svg = screen.getByLabelText('Favorito');
    expect(svg).not.toHaveAttribute('aria-hidden');
  });

  it('forwards additional svg props, such as strokeWidth, to the underlying icon', () => {
    const { container } = render(<Icon icon={Heart} aria-hidden strokeWidth={1.5} />);

    expect(container.querySelector('svg')).toHaveAttribute('stroke-width', '1.5');
  });

  it('merges a caller-provided className with the size class', () => {
    const { container } = render(<Icon icon={Heart} aria-hidden className="opacity-40" />);

    expect(container.querySelector('svg')).toHaveClass('w-5', 'h-5', 'opacity-40');
  });
});
