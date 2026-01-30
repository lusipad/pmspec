import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PMSpec API',
      version: '1.0.0',
      description: 'PMSpec Web Backend API - 产品管理规格文档系统',
      contact: {
        name: 'PMSpec Team',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'Epics', description: 'Epic management operations' },
      { name: 'Features', description: 'Feature management operations' },
      { name: 'Team', description: 'Team information operations' },
      { name: 'Stats', description: 'Statistics and analytics operations' },
      { name: 'CSV', description: 'CSV import/export operations' },
      { name: 'Timeline', description: 'Timeline and Gantt chart operations' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization (reserved for future use)',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            message: {
              type: 'string',
              description: 'Detailed error message',
            },
          },
          required: ['error'],
        },
        Epic: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the epic',
              example: 'EPIC-001',
            },
            title: {
              type: 'string',
              description: 'Epic title',
              example: 'User Authentication',
            },
            description: {
              type: 'string',
              description: 'Epic description',
            },
            status: {
              type: 'string',
              enum: ['planning', 'in-progress', 'completed'],
              description: 'Current status of the epic',
            },
            estimate: {
              type: 'number',
              description: 'Estimated hours',
              example: 100,
            },
            actual: {
              type: 'number',
              description: 'Actual hours spent',
              example: 80,
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Planned start date',
            },
            endDate: {
              type: 'string',
              format: 'date',
              description: 'Planned end date',
            },
          },
          required: ['id', 'title'],
        },
        Feature: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the feature',
              example: 'FEAT-001',
            },
            title: {
              type: 'string',
              description: 'Feature title',
              example: 'Login Page',
            },
            description: {
              type: 'string',
              description: 'Feature description',
            },
            epic: {
              type: 'string',
              description: 'Parent epic ID',
              example: 'EPIC-001',
            },
            status: {
              type: 'string',
              enum: ['todo', 'in-progress', 'done'],
              description: 'Current status of the feature',
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'Feature priority',
            },
            estimate: {
              type: 'number',
              description: 'Estimated hours',
              example: 16,
            },
            actual: {
              type: 'number',
              description: 'Actual hours spent',
              example: 12,
            },
            assignee: {
              type: 'string',
              description: 'Assigned team member',
              example: 'John Doe',
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Planned start date',
            },
            endDate: {
              type: 'string',
              format: 'date',
              description: 'Planned end date',
            },
            dependencies: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of dependent feature IDs',
            },
          },
          required: ['id', 'title', 'epic'],
        },
        FeatureInput: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the feature',
            },
            title: {
              type: 'string',
              description: 'Feature title',
            },
            description: {
              type: 'string',
              description: 'Feature description',
            },
            epic: {
              type: 'string',
              description: 'Parent epic ID',
            },
            status: {
              type: 'string',
              enum: ['todo', 'in-progress', 'done'],
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
            },
            estimate: {
              type: 'number',
            },
            actual: {
              type: 'number',
            },
            assignee: {
              type: 'string',
            },
          },
          required: ['id', 'title', 'epic'],
        },
        TeamMember: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Team member name',
              example: 'John Doe',
            },
            role: {
              type: 'string',
              description: 'Team member role',
              example: 'Developer',
            },
            capacity: {
              type: 'number',
              description: 'Weekly capacity in hours',
              example: 40,
            },
            currentLoad: {
              type: 'number',
              description: 'Current assigned hours',
              example: 32,
            },
          },
        },
        Team: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Team name',
            },
            members: {
              type: 'array',
              items: { $ref: '#/components/schemas/TeamMember' },
            },
          },
        },
        OverviewStats: {
          type: 'object',
          properties: {
            features: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                byStatus: {
                  type: 'object',
                  properties: {
                    todo: { type: 'number' },
                    'in-progress': { type: 'number' },
                    done: { type: 'number' },
                  },
                },
              },
            },
            hours: {
              type: 'object',
              properties: {
                estimated: { type: 'number' },
                actual: { type: 'number' },
                completed: { type: 'number' },
                completionRate: { type: 'number' },
              },
            },
            epics: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                byStatus: {
                  type: 'object',
                  properties: {
                    planning: { type: 'number' },
                    'in-progress': { type: 'number' },
                    completed: { type: 'number' },
                  },
                },
              },
            },
            team: {
              type: 'object',
              properties: {
                totalMembers: { type: 'number' },
                totalCapacity: { type: 'number' },
                totalLoad: { type: 'number' },
                averageUtilization: { type: 'number' },
              },
            },
          },
        },
        TrendData: {
          type: 'object',
          properties: {
            trends: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string', format: 'date' },
                  completed: { type: 'number' },
                  inProgress: { type: 'number' },
                  todo: { type: 'number' },
                },
              },
            },
          },
        },
        TeamWorkload: {
          type: 'object',
          properties: {
            workload: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  capacity: { type: 'number' },
                  assigned: { type: 'number' },
                  completed: { type: 'number' },
                  remaining: { type: 'number' },
                  utilization: { type: 'number' },
                  featureCount: { type: 'number' },
                },
              },
            },
          },
        },
        EpicProgress: {
          type: 'object',
          properties: {
            epics: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  status: { type: 'string' },
                  totalFeatures: { type: 'number' },
                  completedFeatures: { type: 'number' },
                  inProgressFeatures: { type: 'number' },
                  progressPercent: { type: 'number' },
                  hoursProgress: { type: 'number' },
                  estimate: { type: 'number' },
                  actual: { type: 'number' },
                },
              },
            },
          },
        },
        GanttTask: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            start: { type: 'string', format: 'date' },
            end: { type: 'string', format: 'date' },
            progress: { type: 'number' },
            dependencies: {
              type: 'array',
              items: { type: 'string' },
            },
            type: {
              type: 'string',
              enum: ['epic', 'feature'],
            },
          },
        },
        GanttData: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              items: { $ref: '#/components/schemas/GanttTask' },
            },
            criticalPath: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        CSVImportResult: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            created: { type: 'number' },
            updated: { type: 'number' },
            total: { type: 'number' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  row: { type: 'number' },
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  row: { type: 'number' },
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
            created: { type: 'number' },
            updated: { type: 'number' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
