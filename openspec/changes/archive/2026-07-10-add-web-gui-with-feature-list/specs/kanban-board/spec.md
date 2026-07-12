# Kanban Board Specification

## ADDED Requirements

### Requirement: Three-Column Kanban Layout

The frontend must display a Kanban board with three columns representing feature statuses: Todo, In Progress, and Done.

#### Scenario: Display empty Kanban board

**Given** the project has no features
**When** the user navigates to the Kanban page
**Then** three empty columns are displayed: "Todo", "In Progress", "Done"
**And** each column shows "No features" placeholder
**And** each column has an "Add Feature" button

#### Scenario: Display features in columns

**Given** the project has 10 features: 5 todo, 3 in-progress, 2 done
**When** the user navigates to the Kanban page
**Then** the "Todo" column shows 5 feature cards
**And** the "In Progress" column shows 3 feature cards
**And** the "Done" column shows 2 feature cards
**And** each column header shows the count (e.g., "Todo (5)")

### Requirement: Feature Card Display

Each feature must be displayed as a card showing key information.

#### Scenario: Feature card content

**Given** a feature FEAT-001 exists with assignee Alice, estimate 16h, actual 10h
**When** the feature card is rendered
**Then** the card shows the feature ID "FEAT-001"
**And** shows the feature title
**And** shows the assignee name "Alice" with avatar
**And** shows the estimate "16h"
**And** shows the actual hours "10h"
**And** shows a progress bar at 62.5% (10/16)
**And** shows the Epic badge "EPIC-001"
**And** shows skill tags (e.g., "React", "TypeScript")

#### Scenario: Overdue feature indicator

**Given** a feature has actual hours > estimate hours
**When** the feature card is rendered
**Then** the card has a red border or warning indicator
**And** shows "Over budget: +4h" in red

#### Scenario: Unassigned feature

**Given** a feature has no assignee
**When** the feature card is rendered
**Then** shows "Unassigned" in gray
**And** shows a generic user icon

### Requirement: Drag and Drop Status Update

Users must be able to drag feature cards between columns to update their status.

#### Scenario: Drag feature from Todo to In Progress

**Given** feature FEAT-001 is in the "Todo" column
**When** the user drags FEAT-001 card to the "In Progress" column
**And** drops it
**Then** the card moves to the "In Progress" column
**And** an API call is made to update FEAT-001 status to "in-progress"
**And** the Todo column count decreases by 1
**And** the In Progress column count increases by 1
**And** a success toast shows "FEAT-001 moved to In Progress"

#### Scenario: Drag within same column to reorder

**Given** the "Todo" column has 5 features
**When** the user drags a feature to a different position in the same column
**Then** the card position changes
**And** the order is saved (persist in file or local state)
**And** no status update API call is made

#### Scenario: Optimistic update on drag

**Given** the user drags a feature to a new column
**When** the drop occurs
**Then** the UI updates immediately (optimistic)
**And** the API call is made in the background
**When** the API call succeeds
**Then** the update is confirmed
**When** the API call fails
**Then** the card reverts to its original column
**And** an error toast shows "Failed to update FEAT-001"

#### Scenario: Visual feedback during drag

**Given** the user is dragging a feature card
**When** the card is being dragged
**Then** the card has a semi-transparent appearance
**And** valid drop zones are highlighted with a dashed border
**And** the cursor shows a "grabbing" icon

### Requirement: Feature Card Quick Actions

Each feature card must have a quick actions menu for common operations.

#### Scenario: Open quick actions menu

**Given** a feature card is displayed
**When** the user hovers over the card
**Then** a three-dot menu icon appears in the top-right corner
**When** the user clicks the menu icon
**Then** a dropdown menu appears with options: "Edit", "Delete", "View Details"

#### Scenario: Edit feature from card

**Given** the user opens the quick actions menu
**When** they click "Edit"
**Then** a modal or side panel opens
**And** shows an edit form for the feature
**And** allows editing title, description, assignee, estimate

#### Scenario: Delete feature from card

**Given** the user opens the quick actions menu
**When** they click "Delete"
**Then** a confirmation modal appears "Delete FEAT-001?"
**When** the user confirms
**Then** the feature is deleted
**And** the card disappears from the board with animation
**And** the column count updates

#### Scenario: View feature details

**Given** the user clicks "View Details" or clicks on the card
**Then** a detailed view modal opens
**And** shows all feature information (including user stories, acceptance criteria)
**And** shows edit and delete buttons
**And** allows closing with "X" button or Escape key

### Requirement: Kanban Board Filters

The Kanban board must support filtering features by Epic, Assignee, and search.

#### Scenario: Filter by Epic

**Given** the project has features from multiple Epics
**When** the user selects "EPIC-001" from the Epic filter dropdown
**Then** only features belonging to EPIC-001 are shown
**And** all three columns update to show only filtered features
**And** column counts reflect filtered totals

#### Scenario: Filter by Assignee

**Given** features are assigned to multiple team members
**When** the user selects "Alice" from the Assignee filter
**Then** only features assigned to Alice are shown
**And** unassigned features are hidden

#### Scenario: Combined filters

**Given** the user has selected Epic filter "EPIC-001"
**When** they additionally select Assignee filter "Bob"
**Then** only features that match both filters are shown
**And** the filter bar shows "Filtered by: EPIC-001, Bob"

#### Scenario: Search features on Kanban

**Given** the Kanban board is displayed
**When** the user types "login" in the search box
**Then** only features with "login" in the title are shown
**And** the search is applied across all columns

#### Scenario: Clear all filters

**Given** multiple filters are active
**When** the user clicks "Clear Filters" button
**Then** all filters are removed
**And** all features are displayed
**And** the URL query params are cleared

### Requirement: Add Feature from Kanban Board

Users must be able to create new features directly from the Kanban board.

#### Scenario: Add feature to specific column

**Given** the user is viewing the Kanban board
**When** they click the "+ Add Feature" button in the "Todo" column
**Then** a modal or inline form appears
**And** the Status field is pre-filled with "todo"
**When** the user fills in required fields (ID, Title, Epic, Estimate)
**And** submits the form
**Then** a new feature is created
**And** a new card appears in the "Todo" column
**And** a success toast shows "FEAT-015 created"

#### Scenario: Add feature validation

**Given** the user is adding a new feature
**When** they submit with missing required fields
**Then** validation errors are shown
**And** the form is not submitted
**And** error messages highlight the invalid fields

### Requirement: Kanban Column Customization

Users must be able to customize column visibility and ordering (future enhancement scope).

#### Scenario: Collapse/Expand columns

**Given** the Kanban board is displayed
**When** the user clicks the collapse icon on the "Done" column
**Then** the "Done" column is minimized
**And** shows only the column name and count
**When** the user clicks expand
**Then** the column expands to show all cards

#### Scenario: Responsive layout for columns

**Given** the viewport width is < 768px (mobile)
**When** the user views the Kanban board
**Then** columns are stacked vertically
**And** each column takes full width
**And** drag and drop still works

### Requirement: WIP Limits (Work In Progress)

The system must support WIP limits to prevent overloading the "In Progress" column.

#### Scenario: Set WIP limit

**Given** the user is configuring the Kanban board
**When** they set the WIP limit for "In Progress" to 5
**Then** the column header shows "In Progress (3/5)"
**And** the limit is saved to configuration

#### Scenario: Warn when approaching WIP limit

**Given** the WIP limit for "In Progress" is 5
**And** currently 5 features are in progress
**When** the user tries to drag another feature to "In Progress"
**Then** a warning tooltip appears "WIP limit reached (5/5)"
**But** the drop is still allowed (soft limit)

#### Scenario: Hard WIP limit (optional strict mode)

**Given** strict WIP limit is enabled
**And** the "In Progress" column is at limit (5/5)
**When** the user tries to drop a feature
**Then** the drop is rejected
**And** an error toast shows "Cannot exceed WIP limit of 5"
**And** the card returns to its original column

### Requirement: Kanban Board Refresh

The Kanban board must auto-refresh when data changes externally.

#### Scenario: Real-time update via WebSocket

**Given** the user is viewing the Kanban board
**And** WebSocket connection is active
**When** another user or CLI updates a feature status
**Then** the Kanban board receives a WebSocket event
**And** the affected card moves to the new column
**And** a subtle notification appears "Board updated"

#### Scenario: Manual refresh

**Given** the user wants to refresh the board
**When** they click the "Refresh" button
**Then** the API is called to fetch latest data
**And** the board updates with current state
**And** a loading indicator is shown during refresh

### Requirement: Keyboard Navigation

The Kanban board must support keyboard shortcuts for efficiency.

#### Scenario: Navigate between cards

**Given** the user is focused on a card
**When** they press the arrow keys (Up/Down/Left/Right)
**Then** focus moves to the adjacent card in that direction
**And** the focused card has a visible focus indicator

#### Scenario: Quick edit with Enter

**Given** a card is focused
**When** the user presses Enter
**Then** the feature detail modal opens

#### Scenario: Quick delete with Delete key

**Given** a card is focused
**When** the user presses Delete key
**Then** the delete confirmation modal appears

#### Scenario: Escape to clear filters

**Given** filters are active
**When** the user presses Escape
**Then** all filters are cleared
