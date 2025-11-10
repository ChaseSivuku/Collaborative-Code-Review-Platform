import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { verifyToken } from '../utils/jwt';
import pool from '../config/database';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  isAlive?: boolean;
}

class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<number, Set<AuthenticatedWebSocket>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
      this.handleConnection(ws, req);
    });

    setInterval(() => {
      this.pingClients();
    }, 30000);
  }

  private async handleConnection(ws: AuthenticatedWebSocket, req: any) {
    ws.isAlive = true;

    const token = this.extractToken(req);

    if (!token) {
      ws.close(1008, 'Authentication required');
      return;
    }

    try {
      const decoded = verifyToken(token);
      ws.userId = decoded.userId;

      if (!this.clients.has(decoded.userId)) {
        this.clients.set(decoded.userId, new Set());
      }
      this.clients.get(decoded.userId)!.add(ws);

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('close', () => {
        if (ws.userId) {
          const userClients = this.clients.get(ws.userId);
          if (userClients) {
            userClients.delete(ws);
            if (userClients.size === 0) {
              this.clients.delete(ws.userId);
            }
          }
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    } catch (error) {
      ws.close(1008, 'Invalid token');
    }
  }

  private extractToken(req: any): string | null {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return url.searchParams.get('token');
  }

  private pingClients() {
    this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (!ws.isAlive) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }

  public notifyUser(userId: number, notification: any) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      const message = JSON.stringify({
        type: 'notification',
        data: notification,
      });

      userClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  }

  public broadcastToProject(projectId: number, message: any) {
    pool.query(
      `SELECT DISTINCT user_id FROM project_members WHERE project_id = $1
       UNION
       SELECT owner_id as user_id FROM projects WHERE id = $1`,
      [projectId]
    ).then((result) => {
      result.rows.forEach((row) => {
        this.notifyUser(row.user_id, message);
      });
    });
  }
}

let wsManager: WebSocketManager | null = null;

export const initializeWebSocket = (server: Server): WebSocketManager => {
  if (!wsManager) {
    wsManager = new WebSocketManager(server);
    console.log('✅ WebSocket server initialized');
  }
  return wsManager;
};

export const getWebSocketManager = (): WebSocketManager | null => {
  return wsManager;
};

