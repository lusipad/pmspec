import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { createLogger } from '../utils/logger';

const logger = createLogger('websocket');

export interface WebSocketMessage {
  type: 'feature_updated' | 'epic_updated' | 'milestone_updated' | 'file_changed' | 'connected';
  entityType?: 'feature' | 'epic' | 'milestone' | 'team';
  entityId?: string;
  action?: 'created' | 'updated' | 'deleted';
  data?: unknown;
  timestamp?: string;
}

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  subscribedChannels: Set<string>;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<ExtendedWebSocket> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;

  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      const extendedWs = ws as ExtendedWebSocket;
      extendedWs.isAlive = true;
      extendedWs.subscribedChannels = new Set(['all']); // Subscribe to all by default

      this.clients.add(extendedWs);
      logger.info({ clientCount: this.clients.size }, 'WebSocket client connected');

      // Send welcome message
      this.sendToClient(extendedWs, {
        type: 'connected',
        data: { message: 'Connected to PMSpec WebSocket' },
        timestamp: new Date().toISOString(),
      });

      extendedWs.on('pong', () => {
        extendedWs.isAlive = true;
      });

      extendedWs.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(extendedWs, message);
        } catch (error) {
          logger.warn({ error }, 'Failed to parse WebSocket message');
        }
      });

      extendedWs.on('close', () => {
        this.clients.delete(extendedWs);
        logger.info({ clientCount: this.clients.size }, 'WebSocket client disconnected');
      });

      extendedWs.on('error', (error) => {
        logger.error({ error }, 'WebSocket client error');
        this.clients.delete(extendedWs);
      });
    });

    // Start heartbeat interval
    this.pingInterval = setInterval(() => {
      this.clients.forEach((ws) => {
        if (!ws.isAlive) {
          ws.terminate();
          this.clients.delete(ws);
          return;
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
    });

    logger.info('WebSocket server initialized');
  }

  private handleClientMessage(ws: ExtendedWebSocket, message: { action?: string; channel?: string }): void {
    switch (message.action) {
      case 'subscribe':
        if (message.channel) {
          ws.subscribedChannels.add(message.channel);
          logger.debug({ channel: message.channel }, 'Client subscribed to channel');
        }
        break;
      case 'unsubscribe':
        if (message.channel) {
          ws.subscribedChannels.delete(message.channel);
          logger.debug({ channel: message.channel }, 'Client unsubscribed from channel');
        }
        break;
      case 'ping':
        this.sendToClient(ws, { type: 'connected', data: { pong: true }, timestamp: new Date().toISOString() });
        break;
      default:
        logger.debug({ message }, 'Unknown client message');
    }
  }

  private sendToClient(ws: ExtendedWebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  broadcast(message: WebSocketMessage, channel: string = 'all'): void {
    if (!this.wss) {
      logger.warn('WebSocket server not initialized');
      return;
    }

    const messageWithTimestamp = {
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
    };

    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        if (client.subscribedChannels.has('all') || client.subscribedChannels.has(channel)) {
          client.send(JSON.stringify(messageWithTimestamp));
          sentCount++;
        }
      }
    });

    logger.debug({ channel, sentCount, type: message.type }, 'Broadcast message sent');
  }

  broadcastFeatureUpdate(featureId: string, action: 'created' | 'updated' | 'deleted', data?: unknown): void {
    this.broadcast({
      type: 'feature_updated',
      entityType: 'feature',
      entityId: featureId,
      action,
      data,
    }, 'features');
  }

  broadcastEpicUpdate(epicId: string, action: 'created' | 'updated' | 'deleted', data?: unknown): void {
    this.broadcast({
      type: 'epic_updated',
      entityType: 'epic',
      entityId: epicId,
      action,
      data,
    }, 'epics');
  }

  broadcastMilestoneUpdate(milestoneId: string, action: 'created' | 'updated' | 'deleted', data?: unknown): void {
    this.broadcast({
      type: 'milestone_updated',
      entityType: 'milestone',
      entityId: milestoneId,
      action,
      data,
    }, 'milestones');
  }

  broadcastFileChange(entityType: 'feature' | 'epic' | 'milestone' | 'team', entityId?: string): void {
    this.broadcast({
      type: 'file_changed',
      entityType,
      entityId,
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getStatus(): { initialized: boolean; clientCount: number } {
    return {
      initialized: this.wss !== null,
      clientCount: this.clients.size,
    };
  }

  shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    this.clients.forEach((client) => {
      client.close();
    });
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    logger.info('WebSocket server shutdown');
  }
}

// Export singleton instance
export const wsService = new WebSocketService();
