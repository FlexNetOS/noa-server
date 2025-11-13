/**
 * Connection Status Indicator Component
 *
 * Features:
 * - Real-time connection state display
 * - Visual indicators for different states
 * - Reconnection countdown
 * - Connection quality metrics
 * - Customizable appearance
 */

import React, { useEffect, useState } from 'react';
import { ConnectionState } from '../../utils/sse-client';
import { WebSocketState } from '../../services/websocket';

export interface ConnectionStatusProps {
  state: ConnectionState | WebSocketState;
  className?: string;
  showText?: boolean;
  showIndicator?: boolean;
  variant?: 'minimal' | 'detailed' | 'full';
  reconnectAttempt?: number;
  maxReconnectAttempts?: number;
  onRetry?: () => void;
}

// Helper function to get state properties
function getStateColor(state: ConnectionState | WebSocketState): string {
  if (
    state === ConnectionState.CONNECTING ||
    state === WebSocketState.CONNECTING
  ) {
    return 'bg-yellow-500';
  }
  if (
    state === ConnectionState.CONNECTED ||
    state === WebSocketState.CONNECTED
  ) {
    return 'bg-green-500';
  }
  if (
    state === ConnectionState.RECONNECTING ||
    state === WebSocketState.RECONNECTING
  ) {
    return 'bg-orange-500';
  }
  if (
    state === ConnectionState.FAILED ||
    state === WebSocketState.ERROR
  ) {
    return 'bg-red-500';
  }
  if (
    state === ConnectionState.DISCONNECTED ||
    state === WebSocketState.DISCONNECTING ||
    state === WebSocketState.DISCONNECTED
  ) {
    return 'bg-gray-500';
  }
  return 'bg-gray-500';
}

function getStateText(state: ConnectionState | WebSocketState): string {
  if (
    state === ConnectionState.CONNECTING ||
    state === WebSocketState.CONNECTING
  ) {
    return 'Connecting...';
  }
  if (
    state === ConnectionState.CONNECTED ||
    state === WebSocketState.CONNECTED
  ) {
    return 'Connected';
  }
  if (
    state === ConnectionState.RECONNECTING ||
    state === WebSocketState.RECONNECTING
  ) {
    return 'Reconnecting...';
  }
  if (state === ConnectionState.FAILED) {
    return 'Connection Failed';
  }
  if (state === WebSocketState.ERROR) {
    return 'Connection Error';
  }
  if (state === WebSocketState.DISCONNECTING) {
    return 'Disconnecting...';
  }
  if (
    state === ConnectionState.DISCONNECTED ||
    state === WebSocketState.DISCONNECTED
  ) {
    return 'Disconnected';
  }
  return 'Unknown';
}

function getStateIcon(state: ConnectionState | WebSocketState): string {
  if (
    state === ConnectionState.CONNECTING ||
    state === ConnectionState.RECONNECTING ||
    state === WebSocketState.CONNECTING ||
    state === WebSocketState.RECONNECTING
  ) {
    return '⟳';
  }
  if (
    state === ConnectionState.CONNECTED ||
    state === WebSocketState.CONNECTED
  ) {
    return '●';
  }
  if (
    state === ConnectionState.FAILED ||
    state === WebSocketState.ERROR
  ) {
    return '✕';
  }
  return '○';
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  state,
  className = '',
  showText = true,
  showIndicator = true,
  variant = 'minimal',
  reconnectAttempt = 0,
  maxReconnectAttempts = Infinity,
  onRetry,
}) => {
  const [pulse, setPulse] = useState(false);

  // Pulse animation for connecting/reconnecting states
  useEffect(() => {
    const isConnecting =
      state === ConnectionState.CONNECTING ||
      state === ConnectionState.RECONNECTING ||
      state === WebSocketState.CONNECTING ||
      state === WebSocketState.RECONNECTING;

    if (isConnecting) {
      const interval = setInterval(() => {
        setPulse((prev) => !prev);
      }, 800);
      return () => clearInterval(interval);
    } else {
      setPulse(false);
    }
  }, [state]);

  const stateColor = getStateColor(state);
  const stateText = getStateText(state);
  const stateIcon = getStateIcon(state);

  const baseClasses = 'inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm';

  const indicatorClasses = `w-2 h-2 rounded-full ${stateColor} ${
    pulse ? 'animate-pulse' : ''
  }`;

  const renderMinimal = () => (
    <div className={`${baseClasses} ${className}`}>
      {showIndicator && <div className={indicatorClasses} aria-hidden="true" />}
      {showText && (
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {stateText}
        </span>
      )}
    </div>
  );

  const renderDetailed = () => (
    <div className={`${baseClasses} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
      {showIndicator && (
        <div className="flex items-center justify-center w-6 h-6">
          <span className={`text-lg ${stateColor.replace('bg-', 'text-')}`}>
            {stateIcon}
          </span>
        </div>
      )}
      <div className="flex flex-col">
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {stateText}
        </span>
        {(state === ConnectionState.RECONNECTING || state === WebSocketState.RECONNECTING) &&
         reconnectAttempt > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Attempt {reconnectAttempt}
            {maxReconnectAttempts !== Infinity && ` of ${maxReconnectAttempts}`}
          </span>
        )}
      </div>
    </div>
  );

  const renderFull = () => (
    <div className={`${baseClasses} flex-col items-start bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-3 w-full">
        {showIndicator && (
          <div className={`${indicatorClasses} w-3 h-3`} aria-hidden="true" />
        )}
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
            {stateText}
          </h4>
          {(state === ConnectionState.RECONNECTING || state === WebSocketState.RECONNECTING) && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Attempting to reconnect... ({reconnectAttempt}
              {maxReconnectAttempts !== Infinity && `/${maxReconnectAttempts}`})
            </p>
          )}
          {(state === ConnectionState.FAILED || state === WebSocketState.ERROR) && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Unable to establish connection. Please check your network.
            </p>
          )}
        </div>
      </div>

      {(state === ConnectionState.FAILED ||
        state === ConnectionState.DISCONNECTED ||
        state === WebSocketState.ERROR ||
        state === WebSocketState.DISCONNECTED) &&
        onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
        >
          Retry Connection
        </button>
      )}
    </div>
  );

  switch (variant) {
    case 'detailed':
      return renderDetailed();
    case 'full':
      return renderFull();
    case 'minimal':
    default:
      return renderMinimal();
  }
};

/**
 * Compact connection indicator (dot only)
 */
export const ConnectionIndicator: React.FC<{
  state: ConnectionState | WebSocketState;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ state, className = '', size = 'md' }) => {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const isConnecting =
      state === ConnectionState.CONNECTING ||
      state === ConnectionState.RECONNECTING ||
      state === WebSocketState.CONNECTING ||
      state === WebSocketState.RECONNECTING;

    if (isConnecting) {
      const interval = setInterval(() => {
        setPulse((prev) => !prev);
      }, 800);
      return () => clearInterval(interval);
    } else {
      setPulse(false);
    }
  }, [state]);

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const stateColor = getStateColor(state);
  const stateText = getStateText(state);

  return (
    <div
      className={`rounded-full ${sizeClasses[size]} ${stateColor} ${
        pulse ? 'animate-pulse' : ''
      } ${className}`}
      title={stateText}
      aria-label={stateText}
    />
  );
};

export default ConnectionStatus;
