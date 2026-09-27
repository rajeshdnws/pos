/**
 * RS Inventory - Tracking & Telemetry Server Listener
 * Company: RS ORANGE TECH PVT LTD
 */

import * as http from 'http';
import { TrackingStore } from './tracking-store.js';
import { TrackingRouter } from './tracking-router.js';

export class TrackingServer {
  private server: http.Server | null = null;
  private store: TrackingStore;
  private router: TrackingRouter;

  constructor(store?: TrackingStore) {
    this.store = store || new TrackingStore();
    this.router = new TrackingRouter(this.store);
  }

  public getStore(): TrackingStore {
    return this.store;
  }

  public listen(port: number = 3000, host: string = '0.0.0.0'): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.router.handleRequest(req, res);
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(port, host, () => {
        const addr = this.server?.address();
        const boundPort = typeof addr === 'object' && addr ? addr.port : port;
        console.log(`RS Inventory Telemetry Server listening on http://${host}:${boundPort}`);
        resolve(boundPort);
      });
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
