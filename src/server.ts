import WebSocket, { ServerOptions, WebSocketServer } from 'ws';
import { Socket } from 'net'
import { isValid, parse, IPv6 } from 'ipaddr.js'
import { nanoid } from 'nanoid'
import { Message } from './message'
import { IWsRoute } from './router'
import { Subject } from 'rxjs';
import { IncomingMessage } from 'http';

type TWsRoute<TData = any> = new (client: any, message: any) => IWsRoute<TData>;

export interface IWsServerOptions extends ServerOptions {
  routes?: Record<string, TWsRoute>
}

export interface IWsClient {
  id: string
  socket: WebSocket,
  sessionId?: string,
  ipAddress?: string
  host?: string
  subscribedTo: string[]
}

export class WsServer {
  
  private readonly defaultOptions: IWsServerOptions = {
    port: 4267,
    path: '/ws'
  }

  options: IWsServerOptions
  server: WebSocketServer
  clients: Set<IWsClient> = new Set()

  constructor(options: IWsServerOptions = {}) {
    this.options = { ...this.defaultOptions, ...options }
    this.server = new WebSocketServer(this.options)
    this.server.on('connection', async (socket, req) => this.onConnection(socket, req))
  }

  public clientAdded: Subject<IWsClient>   = new Subject<IWsClient>()
  public clientRemoved: Subject<IWsClient> = new Subject<IWsClient>()

  private onConnection(socket: WebSocket, req: IncomingMessage) {
    const ip = (req.headers['x-forwarded-for'] ?? req.socket.remoteAddress) as string

    // get host name from req, replacing any non-alphanumeric characters with an underscore
    const host = (req.headers.host ?? 'localhost').toLowerCase()

    const client: IWsClient = {
      id: nanoid(),
      socket,
      ipAddress: ip,
      host,
      subscribedTo: []
    }

    this.clients.add(client)

    socket.send(new Message<boolean>({subject: 'Connected', data: true }).ToString())

    socket.on('message', (data: string) => {
      this.handleIncoming(client, new Message(JSON.parse(data)))
    })

    socket.on('error', () => { this.removeClient(client) })
    socket.on('close', () => { this.removeClient(client) })

    this.clientAdded.next(client)

  }

  private handleIncoming(client: IWsClient, message: Message) {
    const route = this.options.routes?.[message.subject]
    if (route) {
      new route(client, message).run()
    } else {
      console.error('No route for subject', message.subject)
    }
  }

  private removeClient(client: IWsClient) {
    client.socket.close()
    this.clients.delete(client)
    this.clientRemoved.next(client)
  }
}
