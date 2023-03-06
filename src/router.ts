import { Message, sendBack, sendBackError, sendMessage } from "./message"
import { IWsClient } from "./server"
import { nanoid } from 'nanoid'

export interface IWsRoute<TData = any> {
  message: Message<TData>;
  client: IWsClient;
  run(): void;
  respond(data: any): void;
  respondError(error: string): void;
  send(subject: string, data: any): void;
  inputData: TData;
}

export abstract class AbstractRoute<TData = any> implements IWsRoute<TData> {
  public message: Message<TData>
  public client: IWsClient
  constructor(c: IWsClient, m: Message<TData>) {
    this.message = m
    this.client = c
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
}
