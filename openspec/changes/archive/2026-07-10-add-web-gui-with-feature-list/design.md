# PMSpec Web GUI - Technical Design

## Context

PMSpec 当前是纯 CLI 工具，基于 Markdown 文件存储。现在需要添加 Web GUI 来支持：
- 可视化项目管理（看板、甘特图）
- 批量功能清单管理（CSV 导入导出）
- 数据分析和报表
- 团队实时协作

关键约束：
- **保持 Markdown 为唯一数据源**: 不引入数据库，所有数据仍存储在 Markdown 文件中
- **向后兼容**: CLI 功能完全保留，Web GUI 是可选功能
- **轻量级**: 避免复杂的后端逻辑，专注于可视化和交互
- **离线友好**: 支持本地部署，不依赖云服务

## Goals / Non-Goals

### Goals

- 提供直观的 Web 界面用于项目管理
- 支持 CSV 批量导入导出功能清单
- 实现看板、甘特图、报表等可视化组件
- 实时同步 Markdown 文件变更
- 保持数据完整性和一致性

### Non-Goals

- **不做**: 用户认证和权限系统（MVP 假设本地单用户或信任环境）
- **不做**: 完整的在线协作平台（如评论、通知）
- **不做**: 数据库存储（保持 Markdown 为唯一数据源）
- **不做**: 云部署和托管（仅支持本地运行）

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Frontend)                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   Kanban   │  │   Gantt    │  │  Dashboard │            │
│  │   Board    │  │   Chart    │  │  Reports   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│         │               │               │                    │
│  ┌──────────────────────────────────────────┐               │
│  │      TanStack Query (State Management)    │               │
│  └──────────────────────────────────────────┘               │
│         │                                                     │
│  ┌──────────────────────────────────────────┐               │
│  │        API Client (Fetch + WebSocket)     │               │
│  └──────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
                          │
                    HTTP + WebSocket
                          │
┌─────────────────────────────────────────────────────────────┐
│                 Backend Server (Express)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  REST API Routes                                        │ │
│  │  - GET  /api/epics, /api/features                      │ │
│  │  - POST /api/features, /api/csv/import                 │ │
│  │  - PUT  /api/features/:id                              │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  WebSocket Server                                       │ │
│  │  - File change notifications                            │ │
│  │  - Real-time updates                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Core Services                                          │ │
│  │  - FileWatcherService (Chokidar)                       │ │
│  │  - MarkdownParserService (reuse existing)              │ │
│  │  - CSVService (import/export)                          │ │
│  │  - ValidationService                                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                  File System Operations
                          │
┌─────────────────────────────────────────────────────────────┐
│                 pmspace/ (Markdown Files)                    │
│  epics/epic-001.md                                          │
│  features/feat-001.md                                       │
│  team.md                                                    │
│  project.md                                                 │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
pmspec/
├── src/                          # Existing CLI code
│   ├── cli/
│   ├── commands/
│   ├── core/
│   └── utils/
├── web/                          # New Web application
│   ├── frontend/                 # React frontend
│   │   ├── src/
│   │   │   ├── components/       # UI components
│   │   │   │   ├── Kanban/
│   │   │   │   ├── GanttChart/
│   │   │   │   ├── Dashboard/
│   │   │   │   ├── FeatureList/
│   │   │   │   └── shared/
│   │   │   ├── hooks/            # Custom React hooks
│   │   │   ├── services/         # API client
│   │   │   ├── types/            # TypeScript types
│   │   │   └── utils/            # Utilities
│   │   ├── public/
│   │   └── vite.config.ts
│   ├── backend/                  # Express backend
│   │   ├── routes/               # API routes
│   │   ├── services/             # Business logic
│   │   ├── middleware/           # Express middleware
│   │   └── websocket/            # WebSocket handlers
│   └── shared/                   # Shared types between FE/BE
│       └── types.ts
└── package.json
```

## Key Decisions

### Decision 1: Monorepo vs Separate Repos

**Choice**: Monorepo (web/ subdirectory in pmspec)

**Reasons**:
- Simpler to share TypeScript types between CLI, backend, and frontend
- Single npm install and build process
- Easier version management and release
- Code reuse (parser, validation) between CLI and Web

**Trade-offs**:
- Slightly larger repository size
- Need to manage separate build processes for frontend/backend

**Alternatives Considered**:
- Separate repos: Too much overhead for sharing types and logic
- Nx/Turborepo: Over-engineering for this project size

### Decision 2: State Management - TanStack Query

**Choice**: TanStack Query (React Query) for server state

**Reasons**:
- Automatic caching and background refetching
- Optimistic updates for better UX
- Built-in loading and error states
- Integrates well with WebSocket for real-time updates
- Less boilerplate than Redux

**Implementation**:
```typescript
// Example usage
const { data: features, isLoading } = useQuery({
  queryKey: ['features'],
  queryFn: () => api.getFeatures(),
});

const updateFeature = useMutation({
  mutationFn: (feature: Feature) => api.updateFeature(feature),
  onSuccess: () => queryClient.invalidateQueries(['features']),
});
```

**Alternatives Considered**:
- Redux: Too much boilerplate for simple CRUD operations
- Zustand: Less built-in for server state management
- Native useState: No caching, too many re-fetches

### Decision 3: Real-time Sync - WebSocket with File Watcher

**Choice**: Chokidar file watcher + Socket.io for real-time updates

**Reasons**:
- Markdown files are the source of truth
- Users might edit files directly (CLI or editor)
- Multiple browser tabs need to stay in sync
- WebSocket provides instant updates

**Implementation**:
```typescript
// Backend: File watcher service
class FileWatcherService {
  private watcher: FSWatcher;

  start(io: Server) {
    this.watcher = chokidar.watch('pmspace/**/*.md', {
      ignoreInitial: true,
    });

    this.watcher.on('change', (path) => {
      const data = this.parseFile(path);
      io.emit('file:updated', { path, data });
    });
  }
}

// Frontend: WebSocket listener
useEffect(() => {
  socket.on('file:updated', ({ path, data }) => {
    queryClient.setQueryData(['features'], (old) =>
      updateFeatureInCache(old, data)
    );
  });
}, []);
```

**Alternatives Considered**:
- HTTP Polling: Wasteful, higher latency
- Server-Sent Events: One-way only, more complex for bidirectional
- No real-time: Poor UX when files change externally

### Decision 4: CSV Import/Export Strategy

**Choice**: Client-side parsing with server validation

**Reasons**:
- Faster UX (no upload delay for large files)
- Reduce server load
- Better error feedback with line-by-line validation

**Implementation**:
```typescript
// Frontend: CSV parsing
import Papa from 'papaparse';

const handleCSVImport = (file: File) => {
  Papa.parse<FeatureRow>(file, {
    header: true,
    complete: async (results) => {
      // Validate on client
      const errors = validateFeatures(results.data);
      if (errors.length > 0) {
        showErrors(errors);
        return;
      }

      // Send to server for final validation and save
      await api.importFeatures(results.data);
    },
  });
};
```

**CSV Format**:
```csv
ID,Epic,Title,Status,Assignee,Estimate,Actual,Skills Required
FEAT-001,EPIC-001,Login Form,todo,Alice,16,0,"React, TypeScript"
FEAT-002,EPIC-001,Signup Form,todo,Bob,12,0,"React, Node.js"
```

**Alternatives Considered**:
- Server-side parsing: Slower UX, more complex error handling
- Excel only: Limits flexibility, requires extra library

### Decision 5: Gantt Chart Implementation

**Choice**: React component with D3.js for rendering

**Reasons**:
- Full control over rendering logic
- Can optimize for our specific data model
- Easier to integrate with our state management

**Library Options Evaluated**:
- **DHTMLX Gantt**: Commercial license required for features we need
- **Frappe Gantt**: Limited interactivity, hard to customize
- **Custom D3**: Full control, can reuse for other charts

**Implementation Approach**:
```typescript
// Gantt data model
interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  dependencies: string[];
  type: 'epic' | 'feature';
}

// Calculate timeline from Epic/Feature estimates
const calculateGanttData = (
  epics: Epic[],
  features: Feature[]
): GanttTask[] => {
  // Logic to convert estimate hours to timeline
  // Considering team capacity and assignments
};
```

**Alternatives Considered**:
- Gantt libraries: Licensing issues or limited customization
- Simple timeline: Doesn't show dependencies or critical path

### Decision 6: Dashboard Charts - Recharts

**Choice**: Recharts for all dashboard visualizations

**Reasons**:
- React-native, easy to integrate
- Responsive and customizable
- Good TypeScript support
- Covers all our chart needs (bar, pie, line, area)

**Chart Types**:
1. **Progress Pie Chart**: Completed vs Remaining features
2. **Burndown Line Chart**: Remaining hours over time
3. **Team Load Bar Chart**: Hours per team member
4. **Skill Distribution**: Features by required skills

**Alternatives Considered**:
- Chart.js: Less React-friendly, more imperative
- Victory: Heavier bundle size
- D3.js directly: Too low-level for standard charts

### Decision 7: Backend API Design

**Choice**: RESTful API with resource-based routes

**API Endpoints**:
```
GET    /api/epics                 # List all epics
GET    /api/epics/:id             # Get epic details
POST   /api/epics                 # Create epic
PUT    /api/epics/:id             # Update epic
DELETE /api/epics/:id             # Delete epic

GET    /api/features              # List features
GET    /api/features/:id          # Get feature
POST   /api/features              # Create feature
PUT    /api/features/:id          # Update feature
DELETE /api/features/:id          # Delete feature

POST   /api/csv/import            # Import from CSV
GET    /api/csv/export            # Export to CSV

GET    /api/team                  # Get team data
PUT    /api/team                  # Update team

GET    /api/analytics/dashboard   # Dashboard statistics
GET    /api/analytics/burndown    # Burndown data
GET    /api/analytics/workload    # Workload analysis
```

**Data Flow**:
1. Frontend sends request
2. Backend validates request
3. Backend reads/parses Markdown files (reuse CLI parser)
4. Backend processes data
5. Backend writes Markdown files (if mutation)
6. Backend returns JSON response
7. WebSocket broadcasts changes to all clients

**Alternatives Considered**:
- GraphQL: Over-engineering for simple CRUD
- gRPC: Not suitable for browser clients

## Data Schema

### Feature List CSV Schema

```typescript
interface FeatureCSVRow {
  ID: string;                // FEAT-001
  Epic: string;              // EPIC-001
  Title: string;             // Feature title
  Status: 'todo' | 'in-progress' | 'done';
  Assignee: string;          // Team member name
  Estimate: number;          // Hours
  Actual: number;            // Hours spent
  'Skills Required': string; // Comma-separated
  Description?: string;      // Optional description
}
```

### WebSocket Events

```typescript
// Client -> Server
interface ClientEvents {
  'feature:update': (feature: Feature) => void;
  'epic:update': (epic: Epic) => void;
}

// Server -> Client
interface ServerEvents {
  'file:updated': (data: { path: string; data: any }) => void;
  'file:deleted': (path: string) => void;
  'file:created': (data: { path: string; data: any }) => void;
}
```

## Migration Plan

### Phase 1: Infrastructure (Week 1)

1. Set up Web project structure
   - Initialize frontend (Vite + React + TypeScript)
   - Initialize backend (Express + TypeScript)
   - Configure build and dev scripts

2. Implement basic API
   - File reading/writing using existing parser
   - GET endpoints for epics, features, team
   - Basic error handling

3. Create frontend shell
   - Routing (React Router)
   - Layout components
   - API client setup (TanStack Query)

### Phase 2: Feature List Management (Week 2)

1. CSV Import/Export
   - Papa Parse integration
   - CSV validation logic
   - Import API endpoint
   - Export functionality

2. Feature List Table
   - Sortable, filterable table
   - Inline editing
   - Batch operations (status update, delete)
   - Pagination

### Phase 3: Kanban Board (Week 3)

1. Board Layout
   - Three columns (Todo, In Progress, Done)
   - Feature cards with key info
   - Responsive grid

2. Drag and Drop
   - React DnD integration
   - Status update on drop
   - Optimistic updates

3. Filters and Search
   - Filter by Epic, Assignee
   - Search by title
   - Clear filters button

### Phase 4: Gantt Chart (Week 4)

1. Timeline Calculation
   - Convert estimates to calendar dates
   - Consider team capacity
   - Handle dependencies

2. Gantt Rendering
   - D3.js timeline rendering
   - Task bars with progress
   - Dependency arrows
   - Zoom and pan

3. Interactivity
   - Drag to reschedule
   - Click for details
   - Critical path highlighting

### Phase 5: Dashboard & Reports (Week 5)

1. Dashboard Layout
   - Grid layout with cards
   - Overview statistics
   - Quick actions

2. Charts Implementation
   - Progress pie chart
   - Burndown line chart
   - Team workload bar chart
   - Skill distribution

3. Data Calculations
   - Aggregate statistics
   - Time series data for burndown
   - Team load calculations

### Phase 6: Real-time & Polish (Week 6)

1. WebSocket Implementation
   - File watcher service
   - Socket.io integration
   - Real-time event broadcasting

2. Optimizations
   - Code splitting
   - Lazy loading
   - Bundle size optimization

3. Documentation
   - User guide
   - API documentation
   - Deployment guide

## Validation Rules

### CSV Import Validation

1. **Required Fields**: ID, Epic, Title, Status, Estimate
2. **ID Format**: Must match `FEAT-\d{3,}`
3. **Epic Reference**: Epic ID must exist
4. **Status Values**: Must be in ['todo', 'in-progress', 'done']
5. **Numeric Fields**: Estimate and Actual must be non-negative numbers
6. **Skills**: Must be comma-separated strings

### API Request Validation

Use Zod schemas (reuse from CLI):

```typescript
import { FeatureSchema, EpicSchema } from '@pmspec/core';

app.post('/api/features', (req, res) => {
  const result = FeatureSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.errors });
  }
  // Process valid data
});
```

## Risks / Trade-offs

### Risk 1: File System Concurrency

**Problem**: Multiple writes to same file (Web + CLI + manual edit)

**Mitigation**:
- File locking mechanism
- Conflict detection (checksum comparison)
- User notification on conflicts
- Automatic retry with exponential backoff

### Risk 2: Large Datasets Performance

**Problem**: Hundreds of features might slow down rendering

**Mitigation**:
- Virtual scrolling for large lists
- Pagination for feature list table
- Lazy loading for Gantt chart
- Debouncing filter operations

### Risk 3: Browser Compatibility

**Problem**: Modern browser features (WebSocket, File API)

**Mitigation**:
- Transpile to ES2020
- Polyfills for older browsers
- Feature detection and graceful degradation
- Document minimum browser versions

### Risk 4: Real-time Sync Complexity

**Problem**: Multiple clients editing simultaneously

**Trade-off**: MVP assumes light concurrency (2-5 users)
- Simple last-write-wins strategy
- Conflict detection shows warning
- No operational transformation (complex, overkill for MVP)

**Future**: Implement CRDT or OT if high concurrency needed

## Open Questions

1. **Port Configuration**: Use default 3000 or make configurable?
   - **Decision**: Make configurable via `pmspec serve --port 3000`

2. **Authentication**: How to handle multi-user scenarios?
   - **Decision**: MVP assumes trusted local network, no auth
   - **Future**: Add basic auth if needed

3. **Mobile Support**: Native apps or PWA?
   - **Decision**: Responsive web only for MVP
   - **Future**: Consider PWA for offline support

4. **Data Export Format**: Just CSV or support Excel?
   - **Decision**: CSV for MVP (simpler, universal)
   - **Future**: Add Excel if requested

5. **Dark Mode**: Support dark theme?
   - **Decision**: Yes, using Tailwind dark mode
   - **Implementation**: System preference detection
