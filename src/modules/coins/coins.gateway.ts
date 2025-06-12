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
import { MessageDTO } from './dto/message.dto';
import { AddCoinDTO } from './dto/coin.dto';
import { v4 as uuidv4 } from 'uuid';
import { CoinsService } from './coins.service';
import { UsersService } from 'modules/users/users.service';

@WebSocketGateway({ namespace: 'coins', cors: { origin: '*'} })
export class CoinsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

     constructor(
       private readonly coinsService: CoinsService
     ) {}


  // Init WebSocket server
  @WebSocketServer() server: Server;

  // Init logger
  private logger: Logger = new Logger(CoinsGateway.name);

  private userSocketMap = new Map<string, string>();

  // CoinsGateway init
  public afterInit(): void {
    return this.logger.log(`Init ${CoinsGateway.name}`);
  }

  // User joins a room
  @SubscribeMessage('addCoin')
  public async addCoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: any,
  ) {
    this.coinsService.updateCoin(body)

  }

  @SubscribeMessage('getUserDatas')
  public async updateEnergy(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: {id: string},
  ) {
    let user = await this.coinsService.getUserDatas(body)
    client.emit('getUserDatasResponse', user);
  }

  // User disconnects
  public handleDisconnect(@ConnectedSocket() client: Socket): void {
    return this.logger.log(`Client: ${client.id} disconnected`);
  }

  // User connects
  public handleConnection(@ConnectedSocket() client: Socket): void {
    return this.logger.log(`Client: ${client.id} connected`);
  }
}
