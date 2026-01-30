import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { KanbanColumn } from './KanbanColumn';

// Mock dnd-kit
vi.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
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

import type { Feature, FeatureStatus } from '@pmspec/types';

const createMockFeature = (overrides: Partial<Feature> = {}): Feature => ({
  id: 'F-001',
  epic: 'Epic 1',
  title: 'Test Feature',
  status: 'todo' as FeatureStatus,
  assignee: 'John Doe',
  estimate: 20,
  actual: 10,
  skillsRequired: ['React'],
  ...overrides,
});

describe('KanbanColumn', () => {
  describe('rendering', () => {
    it('renders column title', () => {
      render(
        <KanbanColumn title="To Do" status="todo" features={[]} count={0} />
      );
      expect(screen.getByText('To Do')).toBeInTheDocument();
    });

    it('renders feature count', () => {
      render(
        <KanbanColumn title="In Progress" status="in-progress" features={[]} count={5} />
      );
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('renders empty state when no features', () => {
      render(
        <KanbanColumn title="Done" status="done" features={[]} count={0} />
      );
      expect(screen.getByText('No features')).toBeInTheDocument();
    });

    it('renders features when provided', () => {
      const features = [
        createMockFeature({ id: 'F-001', title: 'Feature 1' }),
        createMockFeature({ id: 'F-002', title: 'Feature 2' }),
      ];
      render(
        <KanbanColumn title="To Do" status="todo" features={features} count={2} />
      );
      expect(screen.getByText('Feature 1')).toBeInTheDocument();
      expect(screen.getByText('Feature 2')).toBeInTheDocument();
    });
  });

  describe('status styling', () => {
    it('applies todo status colors', () => {
      const { container } = render(
        <KanbanColumn title="To Do" status="todo" features={[]} count={0} />
      );
      const header = container.querySelector('.rounded-lg.border-2.p-3.mb-4');
      expect(header).toHaveClass('bg-gray-100', 'border-gray-300');
    });

    it('applies in-progress status colors', () => {
      const { container } = render(
        <KanbanColumn title="In Progress" status="in-progress" features={[]} count={0} />
      );
      const header = container.querySelector('.rounded-lg.border-2.p-3.mb-4');
      expect(header).toHaveClass('bg-yellow-50', 'border-yellow-300');
    });

    it('applies done status colors', () => {
      const { container } = render(
        <KanbanColumn title="Done" status="done" features={[]} count={0} />
      );
      const header = container.querySelector('.rounded-lg.border-2.p-3.mb-4');
      expect(header).toHaveClass('bg-green-50', 'border-green-300');
    });

    it('applies default colors for unknown status', () => {
      const { container } = render(
        <KanbanColumn title="Unknown" status="unknown" features={[]} count={0} />
      );
      const header = container.querySelector('.rounded-lg.border-2.p-3.mb-4');
      expect(header).toHaveClass('bg-gray-100', 'border-gray-300');
    });
  });

  describe('feature count variations', () => {
    it('shows 0 count correctly', () => {
      render(
        <KanbanColumn title="Empty" status="todo" features={[]} count={0} />
      );
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('shows large count correctly', () => {
      render(
        <KanbanColumn title="Many" status="todo" features={[]} count={99} />
      );
      expect(screen.getByText('99')).toBeInTheDocument();
    });
  });

  describe('column structure', () => {
    it('has minimum height for drop zone', () => {
      const { container } = render(
        <KanbanColumn title="To Do" status="todo" features={[]} count={0} />
      );
      const dropZone = container.querySelector('.min-h-\\[400px\\]');
      expect(dropZone).toBeInTheDocument();
    });

    it('has minimum width for column', () => {
      const { container } = render(
        <KanbanColumn title="To Do" status="todo" features={[]} count={0} />
      );
      const column = container.querySelector('.min-w-\\[300px\\]');
      expect(column).toBeInTheDocument();
    });
  });

  describe('multiple features', () => {
    it('renders all features in correct order', () => {
      const features = [
        createMockFeature({ id: 'F-001', title: 'First Feature' }),
        createMockFeature({ id: 'F-002', title: 'Second Feature' }),
        createMockFeature({ id: 'F-003', title: 'Third Feature' }),
      ];
      
      render(
        <KanbanColumn title="To Do" status="todo" features={features} count={3} />
      );
      
      const featureTitles = screen.getAllByText(/Feature$/);
      expect(featureTitles).toHaveLength(3);
    });

    it('does not show empty state when features exist', () => {
      const features = [createMockFeature()];
      render(
        <KanbanColumn title="To Do" status="todo" features={features} count={1} />
      );
      expect(screen.queryByText('No features')).not.toBeInTheDocument();
    });
  });
});
