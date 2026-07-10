# Feature List Management - Visual Priority Enhancement

## ADDED Requirements

### Requirement: Priority Field in Feature Data Model

The system must support a priority field for features to enable visual prioritization.

#### Scenario: Priority field in Feature interface

**Given** a Feature data structure is being defined
**When** the Feature interface is created
**Then** it must include a `priority` field
**And** priority type is `'critical' | 'high' | 'medium' | 'low'`
**And** the default priority is `'medium'` when not specified

#### Scenario: Backward compatibility with existing features

**Given** existing feature markdown files without priority field
**When** the features are loaded
**Then** they are assigned default priority `'medium'`
**And** all existing features load without errors
**And** no manual migration is required

### Requirement: Priority in CSV Import and Export

The system must support priority field in CSV import and export operations.

#### Scenario: Import CSV with priority column

**Given** a CSV file with columns including "Priority"
**And** priority values are "critical", "high", "medium", or "low"
**When** the user uploads the CSV file
**Then** features are created with the specified priority
**And** the response is 200 OK

#### Scenario: Import CSV without priority column (backward compatibility)

**Given** a CSV file without "Priority" column
**When** the user uploads the CSV file
**Then** all features are created with default priority "medium"
**And** the import succeeds without errors
**And** the response is 200 OK

#### Scenario: Import CSV with invalid priority value

**Given** a CSV file where row 2 has priority "urgent" (invalid)
**When** the user uploads the CSV file
**Then** the response is 400 Bad Request
**And** the error message shows "Invalid priority 'urgent' in row 2. Must be: critical, high, medium, or low"

#### Scenario: Export CSV includes priority

**Given** the project has features with various priorities
**When** a GET request is made to `/api/csv/export`
**Then** the CSV contains a "Priority" column
**And** each feature row shows its priority value
**And** the column is positioned after "Status" column

### Requirement: Bulk Priority Operations

The frontend must support batch priority updates on multiple selected features.

#### Scenario: Bulk update priority

**Given** 5 features are selected in the table
**When** the user clicks "Set Priority" and selects "high"
**Then** a confirmation modal appears "Set priority to 'high' for 5 features?"
**When** the user confirms
**Then** all 5 features are updated to priority "high"
**And** a success toast shows "5 features updated"
**And** the table refreshes with updated priority indicators

#### Scenario: Quick priority update in table

**Given** the feature table is displayed
**When** the user clicks on a priority cell
**Then** a dropdown menu appears with: "Critical", "High", "Medium", "Low"
**When** they select a new priority
**Then** the feature priority is updated immediately (optimistic update)
**And** the priority badge color changes
**And** the API call is made in the background

## MODIFIED Requirements

### Requirement: Feature Table View with Sorting and Filtering

The frontend must display all features in a table with sorting, filtering, and search capabilities, including priority-based operations.

#### Scenario: Display features table with priority column

**Given** the user navigates to the Feature List page
**When** the page loads
**Then** a table is displayed with columns: ID, Epic, Title, Priority, Status, Assignee, Estimate, Actual
**And** all features are listed
**And** default sort is by priority (critical first) then ID ascending
**And** priority column shows colored badges

#### Scenario: Sort by priority

**Given** the feature table is displayed
**When** the user clicks the "Priority" column header
**Then** the table is sorted by priority: critical > high > medium > low
**When** the user clicks "Priority" again
**Then** the sort order reverses: low > medium > high > critical

#### Scenario: Filter by priority

**Given** the feature table is displayed
**When** the user selects "high" from the Priority filter dropdown
**Then** only features with priority "high" are shown
**And** the filter count shows "Filtered: X of Y"

#### Scenario: Combined filters with priority

**Given** the user has selected Priority filter "critical"
**When** they additionally select Status filter "in-progress"
**Then** only features with priority "critical" AND status "in-progress" are shown
**And** the filters stack correctly

#### Scenario: Sort by column (existing functionality preserved)

**Given** the feature table is displayed
**When** the user clicks the "Estimate" column header
**Then** the table is sorted by Estimate descending
**When** the user clicks "Estimate" again
**Then** the table is sorted by Estimate ascending

#### Scenario: Filter by status (existing functionality preserved)

**Given** the feature table is displayed
**When** the user selects "in-progress" from the Status filter dropdown
**Then** only features with status "in-progress" are shown
**And** the filter count shows "Filtered: 5 of 20"

#### Scenario: Filter by assignee (existing functionality preserved)

**Given** the feature table is displayed
**When** the user selects "Alice" from the Assignee filter dropdown
**Then** only features assigned to Alice are shown

#### Scenario: Combined filters (existing functionality preserved)

**Given** the user has selected Status filter "todo"
**When** they additionally select Assignee filter "Bob"
**Then** only features with status "todo" AND assignee "Bob" are shown

#### Scenario: Search features (existing functionality preserved)

**Given** the feature table is displayed
**When** the user types "login" in the search box
**Then** only features with "login" in the title or description are shown
**And** the search is case-insensitive
**And** the search updates as the user types (debounced)

### Requirement: CSV Import for Bulk Feature Creation

The system must allow users to import features from a CSV file for bulk creation and updates, including priority field.

#### Scenario: Import valid CSV file with priority

**Given** a CSV file with columns: ID, Epic, Title, Status, Assignee, Estimate, Actual, Skills Required, Priority
**And** all rows contain valid data including priority
**When** the user uploads the CSV file via `/api/csv/import`
**Then** the response is 200 OK
**And** all features from the CSV are created as markdown files with priority
**And** the response body contains a summary: {created: 10, updated: 0, errors: []}

#### Scenario: Import CSV with updates to existing features (existing functionality preserved)

**Given** a CSV file containing feature FEAT-001 which already exists
**And** the CSV has updated values for FEAT-001
**When** the user uploads the CSV file
**Then** feature FEAT-001 is updated with new values
**And** the response summary shows: {created: 0, updated: 1, errors: []}

#### Scenario: Import CSV with validation errors (existing functionality preserved)

**Given** a CSV file with invalid data in row 3 (missing required field)
**When** the user uploads the CSV file
**Then** the response is 400 Bad Request
**And** the response body contains errors for row 3
**And** the error message specifies the field name and validation issue
**And** no features are created (transaction-like behavior)

#### Scenario: Import CSV with invalid Epic reference (existing functionality preserved)

**Given** a CSV file where row 2 references EPIC-999 which doesn't exist
**When** the user uploads the CSV file
**Then** the response is 400 Bad Request
**And** the error message shows "Epic EPIC-999 not found (row 2)"
**And** provides a list of valid Epic IDs

#### Scenario: Import CSV with duplicate IDs (existing functionality preserved)

**Given** a CSV file with duplicate feature ID FEAT-001 in rows 2 and 5
**When** the user uploads the CSV file
**Then** the response is 400 Bad Request
**And** the error message shows "Duplicate ID FEAT-001 found in rows 2 and 5"

### Requirement: CSV Template Download

The system must provide a CSV template to help users understand the import format, including the priority field.

#### Scenario: Download template with priority column

**Given** the user is on the Feature List page
**When** they click "Download CSV Template"
**Then** a CSV file is downloaded
**And** the filename is `pmspec-features-template.csv`
**And** the CSV contains the header row with all required columns including "Priority"
**And** the CSV contains 2-3 example rows with sample priority values (critical, high, medium, low)
**And** includes comments explaining the priority field values
