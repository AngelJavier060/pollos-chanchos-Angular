import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Client, IMessage } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private stompClient: Client | null = null;
  private connected = false;

  private isRealtimeEnabled(): boolean {
    // En producción, desactivado por defecto a menos que enableRealtime === true
    if ((environment as any)?.production) {
      return (environment as any).enableRealtime === true;
    }
    // En desarrollo, activado por defecto a menos que se ponga en false
    return (environment as any).enableRealtime !== false;
  }

  private ensureConnected(): void {
    if (!this.isRealtimeEnabled()) return;
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
    if (!this.isRealtimeEnabled()) {
      const s = new Subject<string>();
      // Completar inmediatamente para no dejar suscripciones colgadas
      setTimeout(() => s.complete(), 0);
      return s.asObservable();
    }
    return this.subscribe('/topic/inventory-update');
  }

  subscribe(destination: string): Observable<string> {
    const subject = new Subject<string>();
    if (!this.isRealtimeEnabled()) {
      // No hacer nada en producción si está deshabilitado
      setTimeout(() => subject.complete(), 0);
      return subject.asObservable();
    }
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
    if (!this.isRealtimeEnabled()) return;
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
