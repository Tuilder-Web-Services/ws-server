import { Message, sendBack, sendBackError, sendMessage } from "./message"
import { IWsClient } from "./server"
import { nanoid } from 'nanoid'

export interface IWsRoute<TClient extends IWsClient, TData = any> {
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
  public respond(data: any): void {
    sendBack(this.client, this.message, data)
  }
  public respondError(error: string): void {
    this.respond(false)
    sendBackError(this.client, this.message, error)
  }
  public send(subject: string, data: any): void {
    sendMessage(this.client, new Message({ id: nanoid(), subject, data, error: null }))
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
