import { nanoid } from 'nanoid'
import { IWsClient } from './server'

export interface IMessage<T> {
   id?: string
   subject?: string
   data: T
   error?: string | null
}

export class Message<T = any> {
   public id: string
   public data: T
   public subject: string
   public error: string | null = null;
   constructor(m: IMessage<any>) {
    const { id, subject, data, error } = m
    this.subject = subject ?? ''
    this.data    = data
    this.id      = id ?? nanoid()
    this.error   = error ?? null
   }
   public ToString(): string {
      const { id, subject, data, error } = this
      return JSON.stringify({ id, subject, data, error})
   }
}

export const sendBack = (c: IWsClient, m: Message, d: any) => {
  sendMessage(c, new Message({
    data: d,
    id: m.id,
    subject: m.subject,
  }))
}

export const sendBackError = (c: IWsClient, m: Message, err: null | string = null) => {
  sendMessage(c, new Message({
    data: null,
    id: m.id,
    subject: m.subject,
    error: err,
  }))
}

export const sendMessage = (c: IWsClient, m: Message) => {
  c.socket.send(m.ToString())
}
