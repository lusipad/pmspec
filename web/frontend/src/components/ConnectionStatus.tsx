import { useWebSocket } from '../hooks/useWebSocket';
import type { ConnectionStatus } from '../services/websocket';

interface StatusConfig {
  color: string;
  bgColor: string;
  label: string;
  pulse: boolean;
}

const statusConfig: Record<ConnectionStatus, StatusConfig> = {
  connected: {
    color: 'bg-green-500',
    bgColor: 'bg-green-100',
    label: 'Live',
    pulse: false,
  },
  connecting: {
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-100',
    label: 'Connecting...',
    pulse: true,
  },
  disconnected: {
    color: 'bg-gray-400',
    bgColor: 'bg-gray-100',
    label: 'Offline',
    pulse: false,
  },
  error: {
    color: 'bg-red-500',
    bgColor: 'bg-red-100',
    label: 'Error',
    pulse: false,
  },
};

export function ConnectionStatus() {
  const { status, isConnected, connect } = useWebSocket();
  const config = statusConfig[status];

  const handleClick = () => {
    if (!isConnected) {
      connect();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${config.bgColor} hover:opacity-80`}
      title={isConnected ? 'Real-time updates active' : 'Click to reconnect'}
    >
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`}></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.color}`}></span>
      </span>
      <span className="text-gray-700">{config.label}</span>
    </button>
  );
}
