declare global {
  interface Window { global: any; process: any }
}

(window as any).global = window;
(window as any).process = (window as any).process || { env: { DEBUG: undefined } };

export {};
