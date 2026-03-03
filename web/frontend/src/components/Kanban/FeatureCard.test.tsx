import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FeatureCard } from './FeatureCard';
import type { Feature } from '@pmspec/types';

// Mock dnd-kit
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => null,
    },
  },
}));

const createMockFeature = (overrides: Partial<Feature> = {}): Feature => ({
  id: 'F-001',
  epic: 'Epic 1',
  title: 'Test Feature',
  description: 'Test description',
  status: 'todo',
  priority: 'medium',
  assignee: 'John Doe',
  estimate: 20,
  actual: 10,
  skillsRequired: ['React', 'TypeScript'],
  ...overrides,
});

describe('FeatureCard', () => {
  describe('rendering', () => {
    it('renders feature title', () => {
      render(<FeatureCard feature={createMockFeature()} />);
      expect(screen.getByText('Test Feature')).toBeInTheDocument();
    });

    it('renders feature ID', () => {
      render(<FeatureCard feature={createMockFeature({ id: 'F-123' })} />);
      expect(screen.getByText('F-123')).toBeInTheDocument();
    });

    it('renders epic name', () => {
      render(<FeatureCard feature={createMockFeature({ epic: 'Authentication' })} />);
      expect(screen.getByText('Authentication')).toBeInTheDocument();
    });

    it('renders assignee', () => {
      render(<FeatureCard feature={createMockFeature({ assignee: 'Jane Smith' })} />);
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('renders Unassigned when no assignee', () => {
      render(<FeatureCard feature={createMockFeature({ assignee: '' })} />);
      expect(screen.getByText('未分配')).toBeInTheDocument();
    });

    it('renders hours information', () => {
      render(<FeatureCard feature={createMockFeature({ estimate: 40, actual: 15 })} />);
      expect(screen.getByText('15h')).toBeInTheDocument();
      expect(screen.getByText('/ 40h')).toBeInTheDocument();
    });
  });

  describe('priority badge', () => {
    it('renders critical priority badge', () => {
      render(<FeatureCard feature={createMockFeature({ priority: 'critical' })} />);
      expect(screen.getByText('紧急')).toBeInTheDocument();
    });

    it('renders high priority badge', () => {
      render(<FeatureCard feature={createMockFeature({ priority: 'high' })} />);
      expect(screen.getByText('高')).toBeInTheDocument();
    });

    it('renders medium priority badge', () => {
      render(<FeatureCard feature={createMockFeature({ priority: 'medium' })} />);
      expect(screen.getByText('中')).toBeInTheDocument();
    });

    it('renders low priority badge', () => {
      render(<FeatureCard feature={createMockFeature({ priority: 'low' })} />);
      expect(screen.getByText('低')).toBeInTheDocument();
    });
  });

  describe('workload indicator', () => {
    it('renders S size for small estimate', () => {
      render(<FeatureCard feature={createMockFeature({ estimate: 4 })} />);
      expect(screen.getByText('S')).toBeInTheDocument();
    });

    it('renders M size for medium estimate', () => {
      render(<FeatureCard feature={createMockFeature({ estimate: 20 })} />);
      expect(screen.getByText('M')).toBeInTheDocument();
    });

    it('renders L size for large estimate', () => {
      render(<FeatureCard feature={createMockFeature({ estimate: 60 })} />);
      expect(screen.getByText('L')).toBeInTheDocument();
    });

    it('renders XL size for extra large estimate', () => {
      render(<FeatureCard feature={createMockFeature({ estimate: 100 })} />);
      expect(screen.getByText('XL')).toBeInTheDocument();
    });
  });

  describe('progress and budget', () => {
    it('shows over budget warning when actual > estimate', () => {
      render(<FeatureCard feature={createMockFeature({ estimate: 20, actual: 30 })} />);
      expect(screen.getByText(/超出预估/)).toBeInTheDocument();
    });

    it('does not show over budget warning when under budget', () => {
      render(<FeatureCard feature={createMockFeature({ estimate: 20, actual: 10 })} />);
      expect(screen.queryByText(/超出预估/)).not.toBeInTheDocument();
    });

    it('renders progress bar for features with estimate', () => {
      const { container } = render(<FeatureCard feature={createMockFeature({ estimate: 20 })} />);
      expect(container.querySelector('.bg-gray-200.rounded-full.h-2')).toBeInTheDocument();
    });

    it('does not render progress bar when estimate is 0', () => {
      const { container } = render(<FeatureCard feature={createMockFeature({ estimate: 0 })} />);
      expect(container.querySelector('.bg-gray-200.rounded-full.h-2')).not.toBeInTheDocument();
    });
  });

  describe('skills', () => {
    it('renders skill tags', () => {
      render(<FeatureCard feature={createMockFeature({ skillsRequired: ['React', 'Node.js'] })} />);
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('Node.js')).toBeInTheDocument();
    });

    it('limits displayed skills to 3', () => {
      render(<FeatureCard feature={createMockFeature({ 
        skillsRequired: ['React', 'Node.js', 'TypeScript', 'GraphQL', 'Docker'] 
      })} />);
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('Node.js')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.queryByText('GraphQL')).not.toBeInTheDocument();
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('does not render skills section when no skills', () => {
      const { container } = render(<FeatureCard feature={createMockFeature({ skillsRequired: [] })} />);
      expect(container.querySelectorAll('.bg-gray-100.text-gray-700').length).toBe(0);
    });
  });

  describe('breakdown warning', () => {
    it('shows breakdown warning for XL tasks (>= 80h)', () => {
      render(<FeatureCard feature={createMockFeature({ estimate: 80 })} />);
      expect(screen.getByText(/建议拆分该大型任务/)).toBeInTheDocument();
    });

    it('does not show breakdown warning for smaller tasks', () => {
      render(<FeatureCard feature={createMockFeature({ estimate: 79 })} />);
      expect(screen.queryByText(/建议拆分/)).not.toBeInTheDocument();
    });
  });
});
