import WebSocket, { ServerOptions, WebSocketServer } from 'ws';
import { nanoid } from 'nanoid'
import { Message } from './message'
import { IWsRoute } from './router'
import { Subject } from 'rxjs';
import { IncomingMessage } from 'http';

export type TWsRoute<TClient extends IWsClient, TData = any> = new (client: any, message: any, clientsMap: any) => IWsRoute<TClient, TData>;

export interface IWsServerOptions<T extends IWsClient> extends ServerOptions {
  routes?: Record<string, TWsRoute<T, any>>
}

export interface IWsClient {
  id: string
  socket: WebSocket,
  sessionId?: string,
  ipAddress?: string
  host?: string
  subscribedTo: string[]
}

export class WsServer<T extends IWsClient> {
  
  private readonly defaultOptions: IWsServerOptions<T> = {
    port: 4267,
    path: '/ws'
  }

  options: IWsServerOptions<T>
  server: WebSocketServer
  clients: Set<T> = new Set()
  clientsMap: Map<string, T> = new Map()

  routeMapByTenant: Map<string, Map<string, TWsRoute<T, any>>> | null = null

  constructor(options: IWsServerOptions<T> = {}) {
    this.options = { ...this.defaultOptions, ...options }
    this.server = new WebSocketServer(this.options)
    this.server.on('connection', async (socket, req) => this.onConnection(socket, req))
  }

  public clientAdded  : Subject<T> = new Subject<T>()
  public clientRemoved: Subject<T> = new Subject<T>()

  private onConnection(socket: WebSocket, req: IncomingMessage) {
    const ip = (req.headers['x-forwarded-for'] ?? req.socket.remoteAddress) as string

    const isDev = process.env.END === 'dev'
    const domainFromQueryString = req.url ? new URL (req.url).searchParams.get('domain') ?? null : null

    // get host name from req, replacing any non-alphanumeric characters with an underscore
    const host = isDev && domainFromQueryString ? domainFromQueryString : (req.headers.host ?? 'localhost').toLowerCase()

    const client: IWsClient = {
      id: nanoid(),
      socket,
      ipAddress: ip,
      host,
      subscribedTo: []
    }

    this.clients.add(client as T)
    this.clientsMap.set(client.id, client as T)

    socket.send(new Message<boolean>({subject: 'Connected', data: true }).ToString())

    socket.on('message', (data: string) => {
      this.handleIncoming(client, new Message(JSON.parse(data)))
    })

    socket.on('error', () => { this.removeClient(client) })
    socket.on('close', () => { this.removeClient(client) })

    this.clientAdded.next(client as T)

  }

  private handleIncoming(client: IWsClient, message: Message) {
    if (!this.routeMapByTenant) {
      this.routeMapByTenant = new Map()
      for (const [subject, route] of Object.entries(this.options.routes ?? {})) {
        const tenant = new route(client, message, this.clientsMap).tenant
        const tenantArray = Array.isArray(tenant) ? tenant : [tenant]
        for (const tenant of tenantArray) {
          let tenantMap = this.routeMapByTenant.get(tenant)
          if (!tenantMap) {
            tenantMap = new Map()
            this.routeMapByTenant.set(tenant, tenantMap)
          }
          tenantMap.set(subject, route)
        }
      }
    }
    const route = this.routeMapByTenant.get(client.host ?? 'common')?.get(message.subject) ?? this.routeMapByTenant.get('common')?.get(message.subject)
    if (route) {
      new route(client, message, this.clientsMap).run()
    } else {
      console.error('No route for subject', message.subject)
    }
  }

  private removeClient(client: IWsClient) {
    client.socket.close()
    this.clients.delete(client as T)
    this.clientsMap.delete(client.id)
    this.clientRemoved.next(client as T)
  }
}
