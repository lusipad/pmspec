## ADDED Requirements

### Requirement: Unified In-App Feedback Layer

The frontend SHALL provide a unified in-app feedback layer for async operations.

#### Scenario: Replace blocking alert with toast feedback

- **WHEN** import/export/update actions complete
- **THEN** the UI shows non-blocking toast messages for success and failure
- **AND** the user can continue operating without native browser alert dialogs

### Requirement: Default Landing on Dashboard

The web app SHALL use Dashboard as the default landing page.

#### Scenario: Open root route

- **WHEN** the user navigates to `/`
- **THEN** the Dashboard page is rendered as the index route
- **AND** navigation remains consistent with existing route paths
