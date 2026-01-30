import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PriorityBadge } from './PriorityBadge';

describe('PriorityBadge', () => {
  describe('rendering', () => {
    it('renders with default props', () => {
      render(<PriorityBadge />);
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('renders with correct title attribute', () => {
      render(<PriorityBadge priority="high" />);
      expect(screen.getByTitle('Priority: High')).toBeInTheDocument();
    });
  });

  describe('priority props', () => {
    it('renders critical priority', () => {
      render(<PriorityBadge priority="critical" />);
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    it('renders high priority', () => {
      render(<PriorityBadge priority="high" />);
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('renders medium priority', () => {
      render(<PriorityBadge priority="medium" />);
      expect(screen.getByText('Medium')).toBeInTheDocument();
    });

    it('renders low priority', () => {
      render(<PriorityBadge priority="low" />);
      expect(screen.getByText('Low')).toBeInTheDocument();
    });
  });

  describe('size props', () => {
    it('applies small size classes', () => {
      const { container } = render(<PriorityBadge priority="medium" size="small" />);
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('px-1.5', 'py-0.5', 'text-xs');
    });

    it('applies medium size classes', () => {
      const { container } = render(<PriorityBadge priority="medium" size="medium" />);
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('px-2', 'py-1', 'text-xs');
    });

    it('applies large size classes', () => {
      const { container } = render(<PriorityBadge priority="medium" size="large" />);
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });
  });

  describe('styling', () => {
    it('applies critical priority colors', () => {
      const { container } = render(<PriorityBadge priority="critical" />);
      const badge = container.querySelector('span');
      expect(badge).toHaveStyle({ backgroundColor: '#DC2626', color: '#FFFFFF' });
    });

    it('applies high priority colors', () => {
      const { container } = render(<PriorityBadge priority="high" />);
      const badge = container.querySelector('span');
      expect(badge).toHaveStyle({ backgroundColor: '#F59E0B', color: '#FFFFFF' });
    });

    it('applies medium priority colors', () => {
      const { container } = render(<PriorityBadge priority="medium" />);
      const badge = container.querySelector('span');
      expect(badge).toHaveStyle({ backgroundColor: '#3B82F6', color: '#FFFFFF' });
    });

    it('applies low priority colors', () => {
      const { container } = render(<PriorityBadge priority="low" />);
      const badge = container.querySelector('span');
      expect(badge).toHaveStyle({ backgroundColor: '#6B7280', color: '#FFFFFF' });
    });
  });
});
