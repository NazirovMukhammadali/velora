import { Logger } from "@nestjs/common";
import {
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server } from "ws";
import * as WebSocket from "ws";
import { AuthService } from "../components/auth/auth.service";
import { Member } from "../libs/dto/member/member";
import * as url from "url";

interface MessagePayload {
  event: string;
  text: string;
  memberData: Member;
}

interface InfoPayload {
  event: string;
  totalClients: number;
  memberData: Member;
  action: string;
}

@WebSocketGateway({ transports: ["websocket"], secure: false }) // secure bomasligi kk va transportsni websocket qilib olamz
export class SocketGateway implements OnGatewayInit {
  private logger: Logger = new Logger("SocketGateway"); // loggerni class ichida ishlatish uchun private qilib olamiz va instisni => logger
  private summaryClient: number = 0; // clientlar sonini saqlab turadi
  private clientsAuthMap = new Map<WebSocket, Member>();
  private messagesList: MessagePayload[] = [];

  constructor(private authService: AuthService) { }

  @WebSocketServer()
  server: Server;

  public afterInit(server: Server) {
    this.logger.verbose(
      `WebSocket server initialized & total [${this.summaryClient}]`
    );
  }

  private async retrieveAuth(req: any): Promise<Member | null> {
    try {
      const parseUrl = url.parse(req.url, true);
      const { token } = parseUrl.query;
      // console.log('token:', token);
      return await this.authService.verifyToken(token as string);
    } catch (err) {
      return null;
    }
  }

  public async handleConnection(client: WebSocket, req: any) {
    const authMember = await this.retrieveAuth(req);
    if (!authMember) {
      this.logger.warn("Unauthenticated client tried to connect");
      return;
    }

    this.summaryClient++; // clientlar sonini oshiramiz
    this.clientsAuthMap.set(client, authMember);

    const clientNick: string = authMember?.memberNick ?? "Guest";
    this.logger.verbose(
      `Connection [${clientNick}] & total [${this.summaryClient}]`
    );

    const infoMsg: InfoPayload = {
      event: "info",
      totalClients: this.summaryClient,
      memberData: authMember,
      action: "joined",
    };
    this.emitMessage(infoMsg);
    // CLIENT MESSAGES
    client.send(
      JSON.stringify({ event: "getMessages", list: this.messagesList })
    );
  }

  public handleDisconnect(client: WebSocket) {
    const authMember = this.clientsAuthMap.get(client);
    if (!authMember) {
      this.logger.warn("Disconnected unauthenticated client");
      this.summaryClient--;
      this.clientsAuthMap.delete(client);
      return;
    }

    this.summaryClient--; // clientlar sonini kamaytiramiz
    this.clientsAuthMap.delete(client);

    const clientNick: string = authMember?.memberNick ?? "Guest";
    this.logger.verbose(
      `Disconnection [${clientNick}] & total [${this.summaryClient}]`
    );

    const infoMsg: InfoPayload = {
      event: "info",
      totalClients: this.summaryClient,
      memberData: authMember,
      action: "left",
    };
    // client - disconnect
    this.broadcastMessage(client, infoMsg);
  }

  @SubscribeMessage("message")
  public async handleMessage(
    client: WebSocket,
    payload: string
  ): Promise<void> {
    const authMember = this.clientsAuthMap.get(client);
    if (!authMember) {
      this.logger.warn("Unauthenticated client tried to send message");
      return;
    }

    const newMessage: MessagePayload = {
      event: "message",
      text: payload,
      memberData: authMember,
    };

    const clientNick: string = authMember?.memberNick ?? "Guest";
    this.logger.verbose(`NEW MESSAGE [${clientNick}]: ${payload}`);

    this.messagesList.push(newMessage);
    if (this.messagesList.length > 5)
      this.messagesList.splice(0, this.messagesList.length - 5);

    this.emitMessage(newMessage);
  }

  private broadcastMessage(
    sender: WebSocket,
    message: InfoPayload | MessagePayload
  ) {
    this.server.clients.forEach((client) => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  private emitMessage(message: InfoPayload | MessagePayload) {
    this.server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}

/*
MESSAGE TARGET:
1. Client (only client)
2. Broadcast (except client)
3. Emit (all clients)
*/