import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Logger, forwardRef } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { Email } from '../mail/mail.service';
import { SyncService } from './sync.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class SyncGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SyncGateway.name);
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly authService: AuthService,
    @Inject(forwardRef(() => SyncService))
    private readonly syncService: SyncService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || 
                    client.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        client.disconnect();
        return;
      }

      // Validate token by looking up user in DB (instead of JWT verify)
      const user = await this.authService.findByAccessToken(token);
      if (!user) {
        this.logger.warn('WebSocket connection rejected: invalid token');
        client.disconnect();
        return;
      }

      const userEmail = user.email;

      // Track if this is the user's first connection
      const isFirstConnection = !this.userSockets.has(userEmail) || this.userSockets.get(userEmail)!.size === 0;

      // Store socket connection for this user
      if (!this.userSockets.has(userEmail)) {
        this.userSockets.set(userEmail, new Set());
      }
      this.userSockets.get(userEmail)!.add(client.id);

      // Store email in socket data for later use
      client.data.userEmail = userEmail;

      this.logger.log(`Client connected: ${client.id} (${userEmail})`);

      // Setup Gmail watch on first connection
      if (isFirstConnection) {
        this.syncService.setupWatchForUser(userEmail).catch((err) => {
          this.logger.error(`Failed to setup watch for ${userEmail}: ${err}`);
        });
      }
    } catch (error) {
      this.logger.error(`Connection failed: ${error}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userEmail = client.data.userEmail;
    if (userEmail && this.userSockets.has(userEmail)) {
      this.userSockets.get(userEmail)!.delete(client.id);
      if (this.userSockets.get(userEmail)!.size === 0) {
        this.userSockets.delete(userEmail);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  sendNewEmail(userEmail: string, email: Email) {
    const sockets = this.userSockets.get(userEmail);
    if (sockets) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit('newEmail', email);
      }
      this.logger.log(`Sent new email notification to ${userEmail}`);
    }
  }

  sendEmailUpdate(userEmail: string, emailId: string, update: Partial<Email>) {
    const sockets = this.userSockets.get(userEmail);
    if (sockets) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit('emailUpdate', { emailId, update });
      }
    }
  }

  isUserConnected(userEmail: string): boolean {
    return this.userSockets.has(userEmail) && this.userSockets.get(userEmail)!.size > 0;
  }

  getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }
}
