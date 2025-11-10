import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Client, IMessage } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private stompClient: Client | null = null;
  private connected = false;

  private ensureConnected(): void {
    if (this.connected && this.stompClient) return;

    const wsUrl = `${environment.apiUrl}/ws`;

    this.stompClient = new Client({
      // Note: Using SockJS factory for compatibility with server config
      webSocketFactory: () => new SockJS(wsUrl) as any,
      reconnectDelay: 3000,
      debug: () => {},
    });

    this.stompClient.onConnect = () => {
      this.connected = true;
    };
    this.stompClient.onStompError = () => {
      this.connected = false;
    };
    this.stompClient.onWebSocketClose = () => {
      this.connected = false;
    };

    this.stompClient.activate();
  }

  connect(): Observable<string> {
    // Backwards-compatible API: subscribe to inventory updates by default
    return this.subscribe('/topic/inventory-update');
  }

  subscribe(destination: string): Observable<string> {
    const subject = new Subject<string>();
    this.ensureConnected();

    const trySubscribe = () => {
      if (!this.stompClient || !this.connected) {
        setTimeout(trySubscribe, 300);
        return;
      }
      const sub = this.stompClient.subscribe(destination, (message: IMessage) => {
        try {
          subject.next(message.body);
        } catch {
          subject.next('');
        }
      });

      // Teardown
      (subject as any).unsubscribe = () => {
        try { sub.unsubscribe(); } catch {}
      };
    };

    trySubscribe();
    return subject.asObservable();
  }

  sendMessage(destination: string, payload: any): void {
    this.ensureConnected();
    const send = () => {
      if (!this.stompClient || !this.connected) {
        setTimeout(send, 300);
        return;
      }
      try {
        const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
        this.stompClient.publish({ destination, body });
      } catch {}
    };
    send();
  }

  disconnect(): void {
    try {
      this.stompClient?.deactivate();
      this.connected = false;
    } catch {}
  }
}
