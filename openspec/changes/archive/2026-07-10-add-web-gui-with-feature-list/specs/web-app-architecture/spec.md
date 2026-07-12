# Web App Architecture Specification

## ADDED Requirements

### Requirement: Web Server Startup via CLI

The system must provide a CLI command to start the web server that hosts both frontend and backend.

#### Scenario: Start web server with default settings

**Given** the user has a valid PMSpec project initialized
**When** they run `pmspec serve`
**Then** the web server starts on port 3000
**And** the frontend is accessible at `http://localhost:3000`
**And** the backend API is accessible at `http://localhost:3000/api`
**And** the console shows "PMSpec Web UI running at http://localhost:3000"

#### Scenario: Start web server with custom port

**Given** the user wants to use a different port
**When** they run `pmspec serve --port 8080`
**Then** the web server starts on port 8080
**And** the frontend is accessible at `http://localhost:8080`
**And** the console shows the custom port

#### Scenario: Auto-open browser

**Given** the user wants the browser to open automatically
**When** they run `pmspec serve --open`
**Then** the web server starts
**And** the default browser opens to `http://localhost:3000`

#### Scenario: Server startup fails when port is in use

**Given** another process is using port 3000
**When** the user runs `pmspec serve`
**Then** the command fails with error "Port 3000 is already in use"
**And** suggests using `--port` flag to specify a different port

### Requirement: RESTful API for Data Access

The backend must expose RESTful API endpoints to access PMSpec data (Epics, Features, Team).

#### Scenario: List all epics

**Given** the pmspace directory contains epic files
**When** a GET request is made to `/api/epics`
**Then** the response is 200 OK
**And** the response body is a JSON array of Epic objects
**And** each Epic includes id, title, status, owner, estimate, actual, and features list

#### Scenario: Get specific epic by ID

**Given** epic EPIC-001 exists
**When** a GET request is made to `/api/epics/EPIC-001`
**Then** the response is 200 OK
**And** the response body is the Epic object with full details
**And** includes the list of associated feature IDs

#### Scenario: Epic not found

**Given** epic EPIC-999 does not exist
**When** a GET request is made to `/api/epics/EPIC-999`
**Then** the response is 404 Not Found
**And** the response body contains error message "Epic EPIC-999 not found"

#### Scenario: List all features

**Given** the pmspace directory contains feature files
**When** a GET request is made to `/api/features`
**Then** the response is 200 OK
**And** the response body is a JSON array of Feature objects
**And** each Feature includes id, epic, title, status, assignee, estimate, actual, and skills

### Requirement: Data Mutation via API

The backend must support creating, updating, and deleting Epics and Features through API endpoints.

#### Scenario: Create new feature

**Given** valid feature data in request body
**When** a POST request is made to `/api/features`
**Then** the response is 201 Created
**And** a new feature markdown file is created in pmspace/features/
**And** the response body contains the created Feature object
**And** the response includes Location header with the feature URL

#### Scenario: Update existing feature

**Given** feature FEAT-001 exists
**When** a PUT request is made to `/api/features/FEAT-001` with updated data
**Then** the response is 200 OK
**And** the feature markdown file is updated
**And** the response body contains the updated Feature object

#### Scenario: Delete feature

**Given** feature FEAT-001 exists
**When** a DELETE request is made to `/api/features/FEAT-001`
**Then** the response is 204 No Content
**And** the feature markdown file is deleted from pmspace/features/

#### Scenario: Validation error on create

**Given** invalid feature data (missing required field)
**When** a POST request is made to `/api/features`
**Then** the response is 400 Bad Request
**And** the response body contains validation errors with field names and messages

### Requirement: CORS Configuration

The backend must handle Cross-Origin Resource Sharing (CORS) to allow frontend access.

#### Scenario: CORS headers on API requests

**Given** the web server is running
**When** a browser makes a request to `/api/features`
**Then** the response includes header `Access-Control-Allow-Origin: *`
**And** the response includes header `Access-Control-Allow-Methods: GET, POST, PUT, DELETE`
**And** the response includes header `Access-Control-Allow-Headers: Content-Type`

### Requirement: Error Handling Middleware

The backend must handle errors gracefully and return structured error responses.

#### Scenario: Internal server error

**Given** an unexpected error occurs during request processing
**When** the error is caught by error handling middleware
**Then** the response is 500 Internal Server Error
**And** the response body contains a generic error message
**And** the error is logged with stack trace

#### Scenario: File system error

**Given** pmspace directory is not accessible
**When** a GET request is made to `/api/features`
**Then** the response is 503 Service Unavailable
**And** the response body contains error message "Unable to access project files"

### Requirement: Frontend Routing

The frontend must use client-side routing to navigate between different views without full page reloads.

#### Scenario: Navigate to Kanban board

**Given** the user is on the dashboard
**When** they click the "Kanban" link in the navigation
**Then** the URL changes to `/kanban`
**And** the Kanban board view is displayed
**And** the page does not reload

#### Scenario: Direct URL access

**Given** the web server is running
**When** the user navigates directly to `http://localhost:3000/kanban`
**Then** the Kanban board view is displayed
**And** the application loads correctly (not a 404 error)

#### Scenario: 404 for invalid routes

**Given** the user navigates to an invalid route
**When** they access `http://localhost:3000/invalid-route`
**Then** a 404 page is displayed
**And** provides a link back to the dashboard

### Requirement: Responsive Layout

The frontend must adapt to different screen sizes (desktop, tablet, mobile).

#### Scenario: Desktop layout

**Given** the viewport width is >= 1024px
**When** the user views any page
**Then** the sidebar navigation is visible
**And** the content area uses the full remaining width
**And** tables and charts are displayed in full width

#### Scenario: Mobile layout

**Given** the viewport width is < 768px
**When** the user views any page
**Then** the sidebar navigation is hidden
**And** a hamburger menu icon is shown
**And** tables are scrollable horizontally
**And** charts are stacked vertically

### Requirement: Loading States

The frontend must show loading indicators while data is being fetched from the API.

#### Scenario: Initial page load

**Given** the user navigates to a page that fetches data
**When** the API request is in flight
**Then** a loading skeleton or spinner is displayed
**And** the UI is non-interactive during loading
**When** the API response is received
**Then** the loading indicator is hidden
**And** the data is displayed

#### Scenario: Loading error

**Given** the API request fails
**When** the error is received
**Then** the loading indicator is hidden
**And** an error message is displayed
**And** a "Retry" button is shown

### Requirement: Graceful Shutdown

The web server must handle shutdown signals gracefully, closing connections properly.

#### Scenario: SIGINT signal (Ctrl+C)

**Given** the web server is running
**When** the user presses Ctrl+C
**Then** the server receives SIGINT signal
**And** all active HTTP connections are closed
**And** all WebSocket connections are closed
**And** the process exits with code 0
**And** logs "Server shutting down gracefully"

#### Scenario: SIGTERM signal

**Given** the web server is running
**When** a SIGTERM signal is received
**Then** the server initiates graceful shutdown
**And** new connections are refused
**And** existing connections are allowed to complete
**And** the process exits within 30 seconds
