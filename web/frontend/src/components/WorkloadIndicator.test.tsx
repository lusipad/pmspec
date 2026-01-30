import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WorkloadIndicator } from './WorkloadIndicator';

describe('WorkloadIndicator', () => {
  describe('rendering', () => {
    it('renders with estimate', () => {
      render(<WorkloadIndicator estimate={4} />);
      expect(screen.getByText('S')).toBeInTheDocument();
    });

    it('renders with correct title attribute', () => {
      render(<WorkloadIndicator estimate={20} />);
      expect(screen.getByTitle('Medium (20h)')).toBeInTheDocument();
    });
  });

  describe('workload size calculation', () => {
    it('renders S for estimate <= 8h', () => {
      render(<WorkloadIndicator estimate={8} />);
      expect(screen.getByText('S')).toBeInTheDocument();
    });

    it('renders M for estimate <= 40h', () => {
      render(<WorkloadIndicator estimate={40} />);
      expect(screen.getByText('M')).toBeInTheDocument();
    });

    it('renders L for estimate <= 80h', () => {
      render(<WorkloadIndicator estimate={80} />);
      expect(screen.getByText('L')).toBeInTheDocument();
    });

    it('renders XL for estimate > 80h', () => {
      render(<WorkloadIndicator estimate={100} />);
      expect(screen.getByText('XL')).toBeInTheDocument();
    });
  });

  describe('showLabel prop', () => {
    it('does not show hours label by default', () => {
      render(<WorkloadIndicator estimate={20} />);
      expect(screen.queryByText('20h')).not.toBeInTheDocument();
    });

    it('shows hours label when showLabel is true', () => {
      render(<WorkloadIndicator estimate={20} showLabel={true} />);
      expect(screen.getByText('20h')).toBeInTheDocument();
    });

    it('does not show hours label when showLabel is false', () => {
      render(<WorkloadIndicator estimate={20} showLabel={false} />);
      expect(screen.queryByText('20h')).not.toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies S size colors (green)', () => {
      const { container } = render(<WorkloadIndicator estimate={4} />);
      const badge = container.querySelector('span');
      expect(badge).toHaveStyle({ backgroundColor: '#10B981', color: '#FFFFFF' });
    });

    it('applies M size colors (blue)', () => {
      const { container } = render(<WorkloadIndicator estimate={20} />);
      const badge = container.querySelector('span');
      expect(badge).toHaveStyle({ backgroundColor: '#3B82F6', color: '#FFFFFF' });
    });

    it('applies L size colors (orange)', () => {
      const { container } = render(<WorkloadIndicator estimate={60} />);
      const badge = container.querySelector('span');
      expect(badge).toHaveStyle({ backgroundColor: '#F59E0B', color: '#FFFFFF' });
    });

    it('applies XL size colors (red)', () => {
      const { container } = render(<WorkloadIndicator estimate={100} />);
      const badge = container.querySelector('span');
      expect(badge).toHaveStyle({ backgroundColor: '#EF4444', color: '#FFFFFF' });
    });
  });

  describe('boundary values', () => {
    it('renders S at boundary (8h)', () => {
      render(<WorkloadIndicator estimate={8} />);
      expect(screen.getByText('S')).toBeInTheDocument();
    });

    it('renders M just above S boundary (9h)', () => {
      render(<WorkloadIndicator estimate={9} />);
      expect(screen.getByText('M')).toBeInTheDocument();
    });

    it('renders M at boundary (40h)', () => {
      render(<WorkloadIndicator estimate={40} />);
      expect(screen.getByText('M')).toBeInTheDocument();
    });

    it('renders L just above M boundary (41h)', () => {
      render(<WorkloadIndicator estimate={41} />);
      expect(screen.getByText('L')).toBeInTheDocument();
    });

    it('renders L at boundary (80h)', () => {
      render(<WorkloadIndicator estimate={80} />);
      expect(screen.getByText('L')).toBeInTheDocument();
    });

    it('renders XL just above L boundary (81h)', () => {
      render(<WorkloadIndicator estimate={81} />);
      expect(screen.getByText('XL')).toBeInTheDocument();
    });
  });
});
