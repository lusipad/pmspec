import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsClient, WebSocketMessage, ConnectionStatus } from '../services/websocket';

interface UseWebSocketOptions {
  /**
   * Whether to auto-connect on mount
   * @default true
   */
  autoConnect?: boolean;
  /**
   * Channels to subscribe to
   * @default ['all']
   */
  channels?: string[];
  /**
   * Whether to automatically invalidate React Query caches
   * @default true
   */
  autoInvalidate?: boolean;
}

interface UseWebSocketReturn {
  /** Current connection status */
  status: ConnectionStatus;
  /** Whether connected */
  isConnected: boolean;
  /** Last received message */
  lastMessage: WebSocketMessage | null;
  /** Connect to WebSocket */
  connect: () => void;
  /** Disconnect from WebSocket */
  disconnect: () => void;
  /** Subscribe to a channel */
  subscribe: (channel: string) => void;
  /** Unsubscribe from a channel */
  unsubscribe: (channel: string) => void;
}

/**
 * Hook for WebSocket real-time updates with React Query integration
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    autoConnect = true,
    channels = ['all'],
    autoInvalidate = true,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>(wsClient.status);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const queryClient = useQueryClient();
  const subscribedChannels = useRef<Set<string>>(new Set());

  // Handle incoming messages and invalidate queries
  const handleMessage = useCallback((message: WebSocketMessage) => {
    setLastMessage(message);

    if (!autoInvalidate) return;

    // Invalidate relevant React Query caches based on message type
    switch (message.type) {
      case 'feature_updated':
        queryClient.invalidateQueries({ queryKey: ['features'] });
        if (message.entityId) {
          queryClient.invalidateQueries({ queryKey: ['feature', message.entityId] });
        }
        // Also invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['stats'] });
        queryClient.invalidateQueries({ queryKey: ['gantt'] });
        break;

      case 'epic_updated':
        queryClient.invalidateQueries({ queryKey: ['epics'] });
        if (message.entityId) {
          queryClient.invalidateQueries({ queryKey: ['epic', message.entityId] });
        }
        queryClient.invalidateQueries({ queryKey: ['stats'] });
        break;

      case 'milestone_updated':
        queryClient.invalidateQueries({ queryKey: ['milestones'] });
        if (message.entityId) {
          queryClient.invalidateQueries({ queryKey: ['milestone', message.entityId] });
        }
        break;

      case 'file_changed':
        // Handle generic file changes
        switch (message.entityType) {
          case 'feature':
            queryClient.invalidateQueries({ queryKey: ['features'] });
            break;
          case 'epic':
            queryClient.invalidateQueries({ queryKey: ['epics'] });
            break;
          case 'milestone':
            queryClient.invalidateQueries({ queryKey: ['milestones'] });
            break;
          case 'team':
            queryClient.invalidateQueries({ queryKey: ['team'] });
            break;
        }
        break;

      case 'connected':
        // Connection confirmed, no cache invalidation needed
        break;
    }
  }, [autoInvalidate, queryClient]);

  // Subscribe to channels
  useEffect(() => {
    if (status !== 'connected') return;

    channels.forEach(channel => {
      if (!subscribedChannels.current.has(channel)) {
        wsClient.subscribe(channel);
        subscribedChannels.current.add(channel);
      }
    });

    return () => {
      subscribedChannels.current.forEach(channel => {
        wsClient.unsubscribe(channel);
      });
      subscribedChannels.current.clear();
    };
  }, [status, channels]);

  // Set up listeners
  useEffect(() => {
    const unsubMessage = wsClient.onMessage(handleMessage);
    const unsubStatus = wsClient.onStatusChange(setStatus);

    if (autoConnect) {
      wsClient.connect();
    }

    return () => {
      unsubMessage();
      unsubStatus();
    };
  }, [autoConnect, handleMessage]);

  const connect = useCallback(() => {
    wsClient.connect();
  }, []);

  const disconnect = useCallback(() => {
    wsClient.disconnect();
  }, []);

  const subscribe = useCallback((channel: string) => {
    wsClient.subscribe(channel);
    subscribedChannels.current.add(channel);
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    wsClient.unsubscribe(channel);
    subscribedChannels.current.delete(channel);
  }, []);

  return {
    status,
    isConnected: status === 'connected',
    lastMessage,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  };
}
