/**
 * Test data and fixtures for E2E tests
 */

export const testFeatures = [
  {
    id: 'F001',
    name: '用户登录',
    priority: 'P0',
    status: 'done',
    epic: '用户认证',
  },
  {
    id: 'F002',
    name: '用户注册',
    priority: 'P1',
    status: 'doing',
    epic: '用户认证',
  },
  {
    id: 'F003',
    name: '数据导出',
    priority: 'P2',
    status: 'todo',
    epic: '数据管理',
  },
];

export const navItems = [
  { path: '/', name: '仪表盘' },
  { path: '/features', name: '功能' },
  { path: '/kanban', name: '看板' },
  { path: '/gantt', name: '甘特图' },
  { path: '/epics', name: 'Epics' },
  { path: '/ai', name: 'AI 助手' },
];

export const statusLabels = {
  todo: '待开发',
  doing: '进行中',
  done: '已完成',
};

export const priorityLabels = {
  P0: '紧急',
  P1: '高',
  P2: '中',
  P3: '低',
};
