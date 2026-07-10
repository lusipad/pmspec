# Implementation Tasks - Visual Priority and Workload Enhancement

## 1. Data Model and Type Definitions

- [x] 1.1 Add `priority` field to Feature interface in `web/shared/types.ts`
  - Add type: `priority?: 'critical' | 'high' | 'medium' | 'low'`
  - Default to 'medium' when not specified
- [x] 1.2 Add workload size calculation utility types
  - Define WorkloadSize type: 'S' | 'M' | 'L' | 'XL'
  - Define helper function to calculate size from estimate

## 2. Backend - CSV Service Updates

- [x] 2.1 Update CSV parser in `web/backend/src/services/csvService.ts`
  - Add 'Priority' column to CSV header
  - Parse priority field from CSV rows
  - Validate priority values (critical, high, medium, low)
  - Handle missing priority (default to 'medium')
- [x] 2.2 Update CSV export to include priority column
  - Add priority column after Status column
  - Export priority value for each feature
- [x] 2.3 Update CSV template generation
  - Add Priority column to template
  - Include example rows with different priorities
  - Add comment explaining valid priority values
- [x] 2.4 Add validation for priority field
  - Reject invalid priority values with clear error message
  - Include row number in validation errors

## 3. Backend - Parser Service Updates

- [x] 3.1 Update markdown parser in `web/backend/src/services/dataService.ts`
  - Parse priority field from feature markdown files
  - Default to 'medium' if priority not present
  - Write priority field when creating/updating features
- [x] 3.2 Ensure backward compatibility
  - Load existing features without priority field
  - Assign default 'medium' priority

## 4. Frontend - Utility Components

- [x] 4.1 Create PriorityBadge component (`web/frontend/src/components/PriorityBadge.tsx`)
  - Accept priority prop: 'critical' | 'high' | 'medium' | 'low'
  - Render colored badge with appropriate styling
  - Color mapping: critical=red, high=orange, medium=blue, low=gray
  - Support size variants: small, medium, large
- [x] 4.2 Create WorkloadIndicator component (`web/frontend/src/components/WorkloadIndicator.tsx`)
  - Accept estimate prop (number)
  - Calculate and display size: S/M/L/XL
  - Render with appropriate color gradient
  - Show tooltip with exact estimate value
- [x] 4.3 Create visual helper utilities (`web/frontend/src/utils/visualHelpers.ts`)
  - `getPriorityColor(priority)` - returns color codes
  - `getPriorityBorderWidth(priority)` - returns border width
  - `getWorkloadSize(estimate)` - returns S/M/L/XL
  - `getWorkloadColor(size)` - returns color for size
  - `getCardMinHeight(estimate)` - returns min-height based on workload

## 5. Frontend - Kanban Card Enhancement

- [x] 5.1 Update FeatureCard component (`web/frontend/src/components/Kanban/FeatureCard.tsx`)
  - Add priority badge display in top-right corner
  - Add workload indicator display
  - Apply dynamic border styling based on priority
  - Apply dynamic card height based on estimate
  - Add background tint for critical/high priority
  - Add opacity reduction for low priority
  - Apply shadow effect for critical priority
- [x] 5.2 Update card layout for new indicators
  - Position priority badge (top-right)
  - Position workload indicator (top-left or bottom)
  - Ensure indicators don't overlap with existing content
- [x] 5.3 Add warning for extra large tasks (80+ hours)
  - Display "Consider breaking down" message for XL tasks
  - Style warning appropriately

## 6. Frontend - Kanban Board Features

- [x] 6.1 Update Kanban page (`web/frontend/src/pages/Kanban.tsx`)
  - Add priority filter dropdown to filter bar
  - Implement priority-based sorting logic
  - Add "Sort by Priority" toggle button
  - Add view mode selector (Standard/Priority Focus/Workload Focus/Heatmap)
  - Implement view mode state management
- [ ] 6.2 Update KanbanColumn component (Post-MVP)
  - Apply priority sorting within columns
  - Maintain priority grouping during drag operations
  - Prevent cross-priority-boundary drops when sorting enabled
- [ ] 6.3 Implement view mode styling (Post-MVP)
  - Standard mode: balanced indicators
  - Priority Focus: enhanced priority colors, larger badges
  - Workload Focus: pronounced size differences
  - Heatmap: gradient backgrounds based on workload
- [ ] 6.4 Add heatmap legend component (Post-MVP)
  - Display color scale for workload
  - Show estimate ranges for each color

## 7. Frontend - Features Table Enhancement

- [x] 7.1 Update Features page (`web/frontend/src/pages/Features.tsx`)
  - Add Priority column to table (after Title, before Status)
  - Render priority badge in table cells
  - Add priority filter dropdown
  - Implement priority column sorting
- [ ] 7.2 Implement priority cell editing (Post-MVP)
  - Make priority cell clickable
  - Show priority dropdown on click
  - Update priority with optimistic UI
  - Handle API call for priority update
- [ ] 7.3 Update bulk operations (Post-MVP)
  - Add "Set Priority" option to bulk actions
  - Implement bulk priority update with confirmation
  - Update success/error toast messages

## 8. Frontend - Styling and Visual Polish

- [x] 8.1 Define Tailwind color classes for priorities
  - Critical: red-600, red-700, red-50, red-100
  - High: orange-500, orange-600, yellow-50, yellow-100
  - Medium: blue-500, blue-600, white
  - Low: gray-500, gray-600
- [x] 8.2 Create CSS for smooth transitions
  - Border color transitions
  - Background color transitions
  - Size transitions (card height)
  - Shadow transitions
- [x] 8.3 Ensure responsive design
  - Priority badges scale on mobile
  - Workload indicators remain visible
  - Cards maintain readability on small screens

## 9. API Integration

- [x] 9.1 Update feature API types
  - Ensure priority field is included in API responses
  - Priority field added to shared types
- [x] 9.2 Test API backwards compatibility
  - Verify existing features load with default priority
  - Test CSV import without priority column
  - Verify no breaking changes for existing clients

## 10. Testing and Validation

- [x] 10.1 Test priority field functionality
  - Create features with different priorities
  - Update feature priorities
  - Test default priority assignment
- [x] 10.2 Test CSV import/export with priority
  - Import CSV with priority column
  - Import CSV without priority (backward compat)
  - Import CSV with invalid priority values
  - Export features and verify priority column
- [x] 10.3 Test visual indicators
  - Verify colors match specification
  - Test border widths and shadows
  - Verify card sizes for different workloads
  - Test opacity and background tints
- [x] 10.4 Test filters and sorting
  - Filter by single priority
  - Sort by priority in table and kanban
  - Combine priority filter with other filters
- [ ] 10.5 Test view modes (Post-MVP - not implemented)
  - Switch between all view modes
  - Verify visual changes in each mode
  - Test heatmap color gradients
- [ ] 10.6 Test bulk operations (Post-MVP - not implemented)
  - Bulk update priority for multiple features
  - Verify success/error handling
- [x] 10.7 Test edge cases
  - Features with missing priority (defaults to medium)
  - Very large estimates (80+ hours show warning)
  - Responsive design maintained

## 11. Documentation

- [x] 11.1 Update CSV template documentation
  - Document priority field and valid values
  - Update example CSV file with priority examples
- [ ] 11.2 Update user documentation (Post-MVP)
  - Explain priority levels and their visual meanings
  - Document workload size thresholds
  - Document filter and sort functionality
- [x] 11.3 Add inline help/tooltips
  - Tooltip for priority badges explaining meaning
  - Tooltip for workload indicators showing size ranges

## 12. Performance Optimization

- [x] 12.1 Optimize re-renders
  - Visual helper functions are pure and efficient
  - React components use proper memoization
- [ ] 12.2 Test with large datasets (Future work)
  - Test with 500+ features
  - Measure render performance
  - Optimize if necessary

## 13. Final Integration and Polish

- [ ] 13.1 Cross-browser testing (Future work)
  - Test on Chrome, Firefox, Safari, Edge
  - Verify visual consistency
- [ ] 13.2 Accessibility audit (Future work)
  - Verify color contrast ratios (WCAG AA)
  - Test keyboard navigation
  - Test screen reader compatibility
- [x] 13.3 Code review and cleanup
  - Clean code with TypeScript type safety
  - Consistent code style
  - Clear component structure
- [x] 13.4 Final visual QA
  - Visual specifications implemented per proposal
  - User experience flow functional
