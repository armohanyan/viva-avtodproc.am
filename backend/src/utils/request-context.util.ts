import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

export type RequestContext = {
  requestId: string;
  method: string;
  path: string;
  ip: string | null;
  actorUserId: number | null;
  actorType: string | null;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function patchRequestContext(patch: Partial<RequestContext>): void {
  const store = storage.getStore();
  if (!store) return;
  Object.assign(store, patch);
}

export function newRequestId(): string {
  return randomUUID();
}
