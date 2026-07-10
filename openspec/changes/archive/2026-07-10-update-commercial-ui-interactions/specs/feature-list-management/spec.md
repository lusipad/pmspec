## ADDED Requirements

### Requirement: Server-Side Feature Query

The system SHALL support server-side filtering, sorting, and pagination for feature lists.

#### Scenario: Query features with pagination

- **WHEN** the client calls `GET /api/features?page=1&pageSize=25&sortBy=priority&sortOrder=asc`
- **THEN** the API returns `{ data, total, page, pageSize, totalPages }`
- **AND** `data` contains only the requested page records
- **AND** records are sorted by the requested sort options

#### Scenario: Backward compatibility without pagination params

- **WHEN** the client calls `GET /api/features` without `page/pageSize`
- **THEN** the API returns a plain feature array
- **AND** existing consumers continue to work without modification

### Requirement: Inline Feature Editing

The frontend SHALL support inline editing for feature table fields with immediate persistence.

#### Scenario: Inline edit feature title

- **WHEN** the user edits a title cell and confirms
- **THEN** the frontend calls `PATCH /api/features/:id`
- **AND** the row updates after mutation success
- **AND** failure shows an error feedback message

### Requirement: Batch Feature Updates

The system SHALL support batch updates for status, priority, and assignee.

#### Scenario: Batch update selected features

- **GIVEN** multiple feature rows are selected
- **WHEN** the user confirms a batch update action
- **THEN** the frontend calls `POST /api/features/batch`
- **AND** the API returns updated count and failed list
- **AND** the frontend displays structured success/failure feedback
