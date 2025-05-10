import { useEffect, useRef, useCallback, useState } from 'react';

interface WebSocketHookOptions {
  url: string;
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export function useWebSocket({
  url,
  onMessage,
  onOpen,
  onClose,
  onError,
  reconnectAttempts = 5,
  reconnectInterval = 3000,
}: WebSocketHookOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const messageQueue = useRef<any[]>([]);
  const isConnecting = useRef(false);

  const processMessageQueue = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      while (messageQueue.current.length > 0) {
        const message = messageQueue.current.shift();
        try {
          ws.current.send(JSON.stringify(message));
        } catch (err) {
          console.error('Error sending queued message:', err);
          messageQueue.current.unshift(message); // Put the message back in the queue
          break;
        }
      }
    }
  }, []);

  const connect = useCallback(() => {
    if (isConnecting.current) return;
    isConnecting.current = true;

    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.close();
      }

      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectCount.current = 0;
        isConnecting.current = false;
        processMessageQueue();
        onOpen?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
          setError(err as Event);
        }
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);
        isConnecting.current = false;
        onClose?.();

        // Only attempt to reconnect if the connection was closed unexpectedly
        if (!event.wasClean && reconnectCount.current < reconnectAttempts) {
          reconnectTimeout.current = setTimeout(() => {
            reconnectCount.current += 1;
            connect();
          }, reconnectInterval * Math.pow(2, reconnectCount.current)); // Exponential backoff
        }
      };

      ws.current.onerror = (event) => {
        setError(event);
        isConnecting.current = false;
        onError?.(event);
      };
    } catch (err) {
      console.error('Error creating WebSocket connection:', err);
      setError(err as Event);
      isConnecting.current = false;
    }
  }, [url, onMessage, onOpen, onClose, onError, reconnectAttempts, reconnectInterval, processMessageQueue]);

  const sendMessage = useCallback((data: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify(data));
      } catch (err) {
        console.error('Error sending message:', err);
        messageQueue.current.push(data);
      }
    } else {
      messageQueue.current.push(data);
      if (!isConnecting.current) {
        connect();
      }
    }
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected,
    error,
    sendMessage,
    reconnect: connect,
  };
} 