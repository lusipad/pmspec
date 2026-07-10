# Kanban Board - Visual Priority and Workload Enhancement

## ADDED Requirements

### Requirement: Priority Visual Indicators on Feature Cards

Feature cards must display visual indicators based on priority level using color, border, and size differentiation.

#### Scenario: Critical priority card styling

**Given** a feature has priority "critical"
**When** the feature card is rendered on the Kanban board
**Then** the card has a red border (3px, #DC2626)
**And** the card has a subtle red shadow effect
**And** a red "Critical" badge is displayed prominently
**And** the card background has a light red tint (#FEE2E2)

#### Scenario: High priority card styling

**Given** a feature has priority "high"
**When** the feature card is rendered
**Then** the card has an orange border (2px, #F59E0B)
**And** an orange "High" badge is displayed
**And** the card background has a light orange tint (#FEF3C7)

#### Scenario: Medium priority card styling

**Given** a feature has priority "medium"
**When** the feature card is rendered
**Then** the card has a blue border (1px, #3B82F6)
**And** a blue "Medium" badge is displayed
**And** the card background is standard white

#### Scenario: Low priority card styling

**Given** a feature has priority "low"
**When** the feature card is rendered
**Then** the card has a gray border (1px, #6B7280)
**And** a gray "Low" badge is displayed
**And** the card has slightly reduced opacity (0.85)
**And** the card background is white

#### Scenario: Priority badge positioning

**Given** any feature card is rendered
**When** displaying priority information
**Then** the priority badge is positioned in the top-right corner of the card
**And** the badge has rounded corners and appropriate padding
**And** the badge text is uppercase and bold

### Requirement: Workload Visual Indicators

Feature cards must display visual size differentiation based on estimate (workload).

#### Scenario: Small workload card (0-8 hours)

**Given** a feature has estimate between 0 and 8 hours
**When** the feature card is rendered
**Then** the card uses compact size class
**And** the card min-height is 120px
**And** a small "S" workload indicator is displayed

#### Scenario: Medium workload card (8-40 hours)

**Given** a feature has estimate between 8 and 40 hours
**When** the feature card is rendered
**Then** the card uses standard size class
**And** the card min-height is 160px
**And** a medium "M" workload indicator is displayed

#### Scenario: Large workload card (40-80 hours)

**Given** a feature has estimate between 40 and 80 hours
**When** the feature card is rendered
**Then** the card uses large size class
**And** the card min-height is 200px
**And** a large "L" workload indicator is displayed
**And** the card has slightly expanded content area

#### Scenario: Extra large workload card (80+ hours)

**Given** a feature has estimate greater than 80 hours
**When** the feature card is rendered
**Then** the card uses extra-large size class
**And** the card min-height is 240px
**And** an extra large "XL" workload indicator is displayed
**And** the card has a warning message "Consider breaking down this large task"

#### Scenario: Workload indicator with color gradient

**Given** a feature card displays workload indicator
**When** rendering the indicator
**Then** small tasks (S) have green indicator (#10B981)
**And** medium tasks (M) have blue indicator (#3B82F6)
**And** large tasks (L) have orange indicator (#F59E0B)
**And** extra large tasks (XL) have red indicator (#EF4444)

### Requirement: Priority-Based Sorting on Kanban Board

The Kanban board must support sorting features by priority within each column.

#### Scenario: Default priority sorting

**Given** the user navigates to the Kanban board
**When** the board loads
**Then** features in each column are sorted by priority (critical > high > medium > low)
**And** within the same priority, features are sorted by ID
**And** critical features appear at the top of each column

#### Scenario: Toggle priority sorting

**Given** the Kanban board has priority sorting enabled
**When** the user clicks the "Sort by Priority" toggle button
**Then** the sorting is disabled
**And** features are sorted by their default order (ID or manual order)
**When** the user clicks the toggle again
**Then** priority sorting is re-enabled

#### Scenario: Manual reorder within priority group

**Given** priority sorting is enabled
**And** multiple features have the same priority "high" in the "Todo" column
**When** the user drags a high-priority feature to reorder within the high-priority group
**Then** the feature position changes within the group
**And** the feature cannot be moved below medium-priority features
**And** a visual indicator shows the valid drop zone boundaries

### Requirement: Priority Filter on Kanban Board

The Kanban board must support filtering features by priority level.

#### Scenario: Single priority filter

**Given** the Kanban board is displayed
**When** the user selects "critical" from the Priority filter dropdown
**Then** only features with priority "critical" are shown across all columns
**And** column counts reflect filtered totals
**And** the filter bar shows "Filtered by: Priority=Critical"

#### Scenario: Multiple priority filter

**Given** the Priority filter dropdown supports multi-select
**When** the user selects both "critical" and "high"
**Then** features with priority "critical" or "high" are shown
**And** other priority features are hidden

#### Scenario: Combined priority and epic filters

**Given** the user has selected Priority filter "high"
**When** they additionally select Epic filter "EPIC-001"
**Then** only features with priority "high" AND epic "EPIC-001" are shown
**And** all columns update accordingly

### Requirement: View Mode Toggle for Visual Emphasis

The Kanban board must support different view modes to emphasize priority or workload.

#### Scenario: Standard view mode

**Given** the Kanban board is displayed
**When** the view mode is set to "Standard"
**Then** cards show both priority and workload indicators
**And** cards use standard visual styling with subtle differences

#### Scenario: Priority-focused view mode

**Given** the user selects "Priority Focus" view mode
**When** the board renders
**Then** priority visual indicators are enhanced (brighter colors, larger badges)
**And** workload indicators are de-emphasized (smaller, muted)
**And** cards are sorted by priority by default

#### Scenario: Workload-focused view mode

**Given** the user selects "Workload Focus" view mode
**When** the board renders
**Then** workload visual indicators are enhanced (size differences more pronounced)
**And** priority badges are de-emphasized (smaller, muted colors)
**And** cards show relative size comparison more clearly

#### Scenario: Heatmap view mode

**Given** the user selects "Heatmap" view mode
**When** the board renders
**Then** cards use background color gradients based on workload
**And** larger estimates have darker/warmer colors
**And** smaller estimates have lighter/cooler colors
**And** a legend shows the color scale mapping

## MODIFIED Requirements

### Requirement: Feature Card Display

Each feature must be displayed as a card showing key information, including priority and workload indicators.

#### Scenario: Feature card content with priority and workload

**Given** a feature FEAT-001 exists with priority "high", assignee Alice, estimate 16h, actual 10h
**When** the feature card is rendered
**Then** the card shows the feature ID "FEAT-001"
**And** shows the feature title
**And** shows priority badge "High" in orange
**And** shows workload indicator "M" (medium, 16h)
**And** shows the assignee name "Alice" with avatar
**And** shows the estimate "16h"
**And** shows the actual hours "10h"
**And** shows a progress bar at 62.5% (10/16)
**And** shows the Epic badge "EPIC-001"
**And** shows skill tags (e.g., "React", "TypeScript")
**And** the card has orange border (2px) for high priority

#### Scenario: Overdue feature indicator (existing functionality preserved)

**Given** a feature has actual hours > estimate hours
**When** the feature card is rendered
**Then** the card has a red border or warning indicator
**And** shows "Over budget: +4h" in red

#### Scenario: Unassigned feature (existing functionality preserved)

**Given** a feature has no assignee
**When** the feature card is rendered
**Then** shows "Unassigned" in gray
**And** shows a generic user icon

### Requirement: Kanban Board Filters

The Kanban board must support filtering features by Epic, Assignee, Priority, and search.

#### Scenario: Filter by Epic (existing functionality preserved)

**Given** the project has features from multiple Epics
**When** the user selects "EPIC-001" from the Epic filter dropdown
**Then** only features belonging to EPIC-001 are shown
**And** all three columns update to show only filtered features
**And** column counts reflect filtered totals

#### Scenario: Filter by Assignee (existing functionality preserved)

**Given** features are assigned to multiple team members
**When** the user selects "Alice" from the Assignee filter
**Then** only features assigned to Alice are shown
**And** unassigned features are hidden

#### Scenario: Filter by Priority (new)

**Given** the Kanban board is displayed
**When** the user selects "critical" from the Priority filter dropdown
**Then** only features with priority "critical" are shown
**And** all three columns update accordingly

#### Scenario: Combined filters with priority

**Given** the user has selected Epic filter "EPIC-001"
**And** they have selected Priority filter "high"
**When** they additionally select Assignee filter "Bob"
**Then** only features that match all three filters are shown
**And** the filter bar shows "Filtered by: EPIC-001, Priority=High, Bob"

#### Scenario: Search features on Kanban (existing functionality preserved)

**Given** the Kanban board is displayed
**When** the user types "login" in the search box
**Then** only features with "login" in the title are shown
**And** the search is applied across all columns

#### Scenario: Clear all filters (existing functionality preserved)

**Given** multiple filters are active including priority filter
**When** the user clicks "Clear Filters" button
**Then** all filters are removed including priority filter
**And** all features are displayed
**And** the URL query params are cleared
