import { Message, sendBack, sendBackError, sendMessage } from "./message"
import { IWsClient } from "./server"
import { nanoid } from 'nanoid'

export interface IWsRoute<TClient extends IWsClient, TData = any> {
  tenant: 'common' | string | string[];
  message: Message<TData>;
  client: TClient;
  run(): void;
  respond(data: any): void;
  respondError(error: string): void;
  send(subject: string, data: any): void;
  inputData: TData;
}

export abstract class AbstractRoute<TClient extends IWsClient, TData = any> implements IWsRoute<TClient, TData> {
  constructor(
    public client: TClient,
    public message: Message<TData>,
    private clientsMap: Map<string, TClient>) {
  }
  abstract run(): void
  tenant = 'common'
  public respond(data: any, client = this.client): void {
    sendBack(client, this.message, data)
  }
  public respondError(error: string, client = this.client): void {
    this.respond(false)
    sendBackError(client, this.message, error)
  }
  public send(subject: string, data: any, client = this.client): void {
    sendMessage(client, new Message({ id: nanoid(), subject, data, error: null }))
  }
  public get inputData(): TData {
    return this.message.data
  }
  public getClient(id: string): TClient | undefined {
    return this.clientsMap.get(id)
  }
  public findClients(domain: string): TClient[] {
    return Array.from(this.clientsMap.values()).filter(c => c.host === domain)    
  }
}
