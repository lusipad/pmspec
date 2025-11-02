# Feature List Management Specification

## ADDED Requirements

### Requirement: CSV Import for Bulk Feature Creation

The system must allow users to import features from a CSV file for bulk creation and updates.

#### Scenario: Import valid CSV file

**Given** a CSV file with columns: ID, Epic, Title, Status, Assignee, Estimate, Actual, Skills Required
**And** all rows contain valid data
**When** the user uploads the CSV file via `/api/csv/import`
**Then** the response is 200 OK
**And** all features from the CSV are created as markdown files
**And** the response body contains a summary: {created: 10, updated: 0, errors: []}

#### Scenario: Import CSV with updates to existing features

**Given** a CSV file containing feature FEAT-001 which already exists
**And** the CSV has updated values for FEAT-001
**When** the user uploads the CSV file
**Then** feature FEAT-001 is updated with new values
**And** the response summary shows: {created: 0, updated: 1, errors: []}

#### Scenario: Import CSV with validation errors

**Given** a CSV file with invalid data in row 3 (missing required field)
**When** the user uploads the CSV file
**Then** the response is 400 Bad Request
**And** the response body contains errors for row 3
**And** the error message specifies the field name and validation issue
**And** no features are created (transaction-like behavior)

#### Scenario: Import CSV with invalid Epic reference

**Given** a CSV file where row 2 references EPIC-999 which doesn't exist
**When** the user uploads the CSV file
**Then** the response is 400 Bad Request
**And** the error message shows "Epic EPIC-999 not found (row 2)"
**And** provides a list of valid Epic IDs

#### Scenario: Import CSV with duplicate IDs

**Given** a CSV file with duplicate feature ID FEAT-001 in rows 2 and 5
**When** the user uploads the CSV file
**Then** the response is 400 Bad Request
**And** the error message shows "Duplicate ID FEAT-001 found in rows 2 and 5"

### Requirement: CSV Export for Backup and Analysis

The system must allow users to export all features to a CSV file.

#### Scenario: Export all features

**Given** the project has 50 features
**When** a GET request is made to `/api/csv/export`
**Then** the response is 200 OK
**And** the Content-Type header is `text/csv`
**And** the Content-Disposition header is `attachment; filename="features-{date}.csv"`
**And** the CSV contains 51 rows (1 header + 50 features)
**And** all feature data is included (ID, Epic, Title, Status, etc.)

#### Scenario: Export with filters

**Given** the user wants to export only features for EPIC-001
**When** a GET request is made to `/api/csv/export?epic=EPIC-001`
**Then** the CSV contains only features belonging to EPIC-001
**And** the filename is `features-EPIC-001-{date}.csv`

#### Scenario: Export empty project

**Given** the project has no features
**When** a GET request is made to `/api/csv/export`
**Then** the response is 200 OK
**And** the CSV contains only the header row

### Requirement: Feature Table View with Sorting and Filtering

The frontend must display all features in a table with sorting, filtering, and search capabilities.

#### Scenario: Display features table

**Given** the user navigates to the Feature List page
**When** the page loads
**Then** a table is displayed with columns: ID, Epic, Title, Status, Assignee, Estimate, Actual
**And** all features are listed
**And** default sort is by ID ascending

#### Scenario: Sort by column

**Given** the feature table is displayed
**When** the user clicks the "Estimate" column header
**Then** the table is sorted by Estimate descending
**When** the user clicks "Estimate" again
**Then** the table is sorted by Estimate ascending

#### Scenario: Filter by status

**Given** the feature table is displayed
**When** the user selects "in-progress" from the Status filter dropdown
**Then** only features with status "in-progress" are shown
**And** the filter count shows "Filtered: 5 of 20"

#### Scenario: Filter by assignee

**Given** the feature table is displayed
**When** the user selects "Alice" from the Assignee filter dropdown
**Then** only features assigned to Alice are shown

#### Scenario: Combined filters

**Given** the user has selected Status filter "todo"
**When** they additionally select Assignee filter "Bob"
**Then** only features with status "todo" AND assignee "Bob" are shown

#### Scenario: Search features

**Given** the feature table is displayed
**When** the user types "login" in the search box
**Then** only features with "login" in the title or description are shown
**And** the search is case-insensitive
**And** the search updates as the user types (debounced)

### Requirement: Inline Editing in Feature Table

The frontend must allow users to edit feature properties directly in the table.

#### Scenario: Edit feature title

**Given** the feature table is displayed
**When** the user double-clicks on FEAT-001's title cell
**Then** the cell becomes an editable input field
**When** the user types a new title and presses Enter
**Then** the API is called to update FEAT-001
**And** the cell returns to read-only mode showing the new title
**And** a success toast notification is shown

#### Scenario: Edit feature status via dropdown

**Given** the user clicks on a status cell
**When** they select a new status from the dropdown
**Then** the feature status is updated immediately (optimistic update)
**And** the API call is made in the background
**And** if the API call fails, the status reverts with an error toast

#### Scenario: Edit feature assignee

**Given** the user clicks on an assignee cell
**When** they select a team member from the dropdown
**Then** the assignee is updated
**And** the team member's avatar/name is shown in the cell

#### Scenario: Cancel edit

**Given** the user is editing a cell
**When** they press Escape key
**Then** the edit is canceled
**And** the cell returns to its original value
**And** no API call is made

#### Scenario: Validation error during inline edit

**Given** the user is editing the estimate field
**When** they enter a negative number
**Then** the input shows a red border
**And** an error message appears "Estimate must be a positive number"
**And** the Save action is disabled

### Requirement: Bulk Operations on Features

The frontend must support batch operations on multiple selected features.

#### Scenario: Select multiple features

**Given** the feature table is displayed
**When** the user clicks checkboxes for FEAT-001, FEAT-002, and FEAT-003
**Then** a bulk actions toolbar appears
**And** shows "3 features selected"
**And** displays action buttons: "Update Status", "Assign", "Delete"

#### Scenario: Bulk status update

**Given** 3 features are selected
**When** the user clicks "Update Status" and selects "in-progress"
**Then** a confirmation modal appears "Update status to 'in-progress' for 3 features?"
**When** the user confirms
**Then** all 3 features are updated to "in-progress"
**And** a success toast shows "3 features updated"
**And** the table refreshes

#### Scenario: Bulk assign

**Given** 5 features are selected
**When** the user clicks "Assign" and selects "Alice"
**Then** all 5 features are assigned to Alice
**And** the assignee column updates for all 5 rows

#### Scenario: Bulk delete

**Given** 2 features are selected
**When** the user clicks "Delete"
**Then** a warning modal appears "Delete 2 features? This cannot be undone."
**When** the user confirms
**Then** both features are deleted
**And** the markdown files are removed
**And** the table refreshes without those features

#### Scenario: Select all features

**Given** the feature table is displayed
**When** the user clicks the "Select All" checkbox in the header
**Then** all visible features are selected
**And** the bulk actions toolbar shows the total count

#### Scenario: Deselect all

**Given** multiple features are selected
**When** the user clicks the "Select All" checkbox again
**Then** all features are deselected
**And** the bulk actions toolbar is hidden

### Requirement: Pagination for Large Feature Lists

The frontend must paginate the feature table when there are many features.

#### Scenario: Default pagination

**Given** the project has 100 features
**When** the user views the feature table
**Then** only the first 25 features are shown
**And** pagination controls are displayed at the bottom
**And** shows "Showing 1-25 of 100"

#### Scenario: Navigate to next page

**Given** the user is on page 1
**When** they click "Next" or page number "2"
**Then** features 26-50 are displayed
**And** shows "Showing 26-50 of 100"
**And** the URL updates to include `?page=2`

#### Scenario: Change page size

**Given** the default page size is 25
**When** the user selects "50 per page" from the dropdown
**Then** the first 50 features are displayed
**And** the pagination updates accordingly

#### Scenario: Maintain filters across pages

**Given** the user has applied a status filter
**And** is on page 2 of the filtered results
**When** they navigate to page 3
**Then** the filter remains applied
**And** page 3 shows the next set of filtered features

### Requirement: CSV Template Download

The system must provide a CSV template to help users understand the import format.

#### Scenario: Download template

**Given** the user is on the Feature List page
**When** they click "Download CSV Template"
**Then** a CSV file is downloaded
**And** the filename is `pmspec-features-template.csv`
**And** the CSV contains the header row with all required columns
**And** the CSV contains 2-3 example rows with sample data
**And** includes comments or a second header explaining each column

### Requirement: Import Progress Feedback

The frontend must show progress feedback during CSV import for large files.

#### Scenario: Import large CSV

**Given** the user uploads a CSV with 500 features
**When** the upload starts
**Then** a progress modal is displayed
**And** shows "Importing features... 0 of 500"
**When** the import processes
**Then** the progress updates in real-time
**And** shows "Importing features... 250 of 500"
**When** the import completes
**Then** shows "Successfully imported 500 features"
**And** the table refreshes automatically

#### Scenario: Import errors with details

**Given** a CSV import fails on 3 rows out of 100
**When** the import completes
**Then** 97 features are created successfully
**And** an error modal shows the 3 failed rows with details
**And** allows the user to download an error report CSV
**And** the error CSV contains only the failed rows with error messages
