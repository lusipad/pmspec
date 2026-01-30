import fs from 'fs';
import path from 'path';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'permission_denied'
  | 'export'
  | 'import';

class AuditLogService {
  private logDir: string;
  private currentLogFile: string;
  private entries: AuditEntry[] = [];

  constructor() {
    this.logDir = process.env.AUDIT_LOG_DIR || './audit-logs';
    this.currentLogFile = this.getLogFileName();
    this.ensureLogDir();
    this.loadEntries();
  }

  private ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `audit-${date}.json`);
  }

  private loadEntries() {
    try {
      if (fs.existsSync(this.currentLogFile)) {
        const data = fs.readFileSync(this.currentLogFile, 'utf-8');
        this.entries = JSON.parse(data);
      }
    } catch {
      this.entries = [];
    }
  }

  private persistEntries() {
    // Check if we need to rotate to a new file
    const newLogFile = this.getLogFileName();
    if (newLogFile !== this.currentLogFile) {
      this.currentLogFile = newLogFile;
      this.entries = [];
    }

    fs.writeFileSync(
      this.currentLogFile,
      JSON.stringify(this.entries, null, 2),
      'utf-8'
    );
  }

  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
    const fullEntry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...entry,
    };

    this.entries.push(fullEntry);
    this.persistEntries();

    return fullEntry;
  }

  getEntries(options?: {
    userId?: string;
    action?: AuditAction;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): { entries: AuditEntry[]; total: number } {
    let filtered = [...this.entries];

    if (options?.userId) {
      filtered = filtered.filter((e) => e.userId === options.userId);
    }
    if (options?.action) {
      filtered = filtered.filter((e) => e.action === options.action);
    }
    if (options?.resourceType) {
      filtered = filtered.filter((e) => e.resourceType === options.resourceType);
    }
    if (options?.resourceId) {
      filtered = filtered.filter((e) => e.resourceId === options.resourceId);
    }
    if (options?.startDate) {
      filtered = filtered.filter(
        (e) => new Date(e.timestamp) >= options.startDate!
      );
    }
    if (options?.endDate) {
      filtered = filtered.filter(
        (e) => new Date(e.timestamp) <= options.endDate!
      );
    }

    // Sort by timestamp descending (most recent first)
    filtered.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const total = filtered.length;
    const offset = options?.offset || 0;
    const limit = options?.limit || 100;

    return {
      entries: filtered.slice(offset, offset + limit),
      total,
    };
  }

  // Load entries from all log files for historical queries
  getAllHistoricalEntries(days: number = 30): AuditEntry[] {
    const allEntries: AuditEntry[] = [];
    const files = fs.readdirSync(this.logDir).filter((f) => f.endsWith('.json'));

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    for (const file of files) {
      try {
        const data = fs.readFileSync(path.join(this.logDir, file), 'utf-8');
        const entries: AuditEntry[] = JSON.parse(data);
        allEntries.push(
          ...entries.filter((e) => new Date(e.timestamp) >= cutoffDate)
        );
      } catch {
        // Skip corrupted files
      }
    }

    return allEntries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}

export const auditLog = new AuditLogService();
