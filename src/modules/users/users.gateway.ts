import {
  MessageBody,
  OnGatewayInit,
  WebSocketServer,
  ConnectedSocket,
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayDisconnect,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@WebSocketGateway({ namespace: 'users', cors: { origin: '*' } })
export class UsersGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private readonly usersService: UsersService) {}

  @WebSocketServer() server: Server;

  private logger: Logger = new Logger(UsersGateway.name);

  // userId -> socketId
  private userSocketMap = new Map<string, string>();

  // Gateway init
  afterInit(): void {
    this.logger.log(`Init ${UsersGateway.name}`);

    // Start broadcasting user updates every 10 seconds
    setInterval(() => this.sendUserUpdates(), 10000);
  }

  // Foydalanuvchi ulanadi
  handleConnection(@ConnectedSocket() client: Socket): void {
    this.logger.log(`User connected: ${client.id}`);
  }

  // Foydalanuvchi uziladi
  handleDisconnect(@ConnectedSocket() client: Socket): void {
    this.logger.log(`User disconnected: ${client.id}`);

    for (const [userId, socketId] of this.userSocketMap.entries()) {
      if (socketId === client.id) {
        this.userSocketMap.delete(userId);
        break;
      }
    }
  }

  // Foydalanuvchi ro'yxatdan o'tadi yoki olinadi
  @SubscribeMessage('createOrGetUser')
  async createOrGetUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: CreateUserDto,
  ) {
    this.logger.log(`Received user: ${JSON.stringify(body)}`);

    const user = await this.usersService.createOrGetUser(body);

    // userId bilan socketni bog'lash
    this.userSocketMap.set(String(user.id), client.id);

    // javobni clientga yuborish
    client.emit('createOrGetUserResponse', user);
  }

  // Har 10 soniyada har bir foydalanuvchiga uning o'z ma'lumotlarini yuborish
  private async sendUserUpdates() {
    for (const [userId, socketId] of this.userSocketMap.entries()) {
      try {
        const user = await this.usersService.findById(userId);
        if (user) {
          this.server.to(socketId).emit('userUpdate', user);
        }
      } catch (err) {
        this.logger.error(`Error sending update to user ${userId}: ${err.message}`);
      }
    }
  }
}
