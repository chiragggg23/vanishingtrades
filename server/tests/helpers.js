// Test drivers: the same call signature for the browser mock and the real Express server.
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { createApp } from '../src/app.js';
import { seedWorld } from '../src/seed/seedWorld.js';
import { handle, resetDb, setMockOptions } from '../../client/src/mock/server.js';

export const DEMO = (role) => ({
  email: `demo-${role}@vanishingtrades.test`,
  password: 'demo1234',
});

let mongo;
export async function startDb() {
  mongo = await MongoMemoryServer.create();
  await connectDb(mongo.getUri('vt-test'));
}
export async function stopDb() {
  await disconnectDb();
  await mongo?.stop();
}

/** Real server through supertest. */
export function serverDriver() {
  const app = createApp();
  return {
    name: 'server',
    app,
    reset: () => seedWorld({ writeAudio: false, demoAccounts: true }),
    async call(method, path, { token, body, query, files } = {}) {
      let req = request(app)[method.toLowerCase()](`/api${path}`);
      if (query) req = req.query(query);
      if (token) req = req.set('Authorization', `Bearer ${token}`);
      if (files) {
        for (const [k, v] of Object.entries(body || {})) req = req.field(k, String(v));
        for (const [k, f] of Object.entries(files))
          req = req.attach(k, f.buffer, { filename: f.name, contentType: f.type });
      } else if (body !== undefined) req = req.send(body);
      const res = await req;
      return { status: res.status, body: res.body };
    },
  };
}

/** The in-browser mock, called directly. */
export function mockDriver() {
  setMockOptions({ latency: false, failRate: 0 });
  return {
    name: 'mock',
    reset: async () => resetDb(),
    async call(method, path, { token, body, query, files } = {}) {
      const mockFiles = files
        ? Object.fromEntries(
            Object.entries(files).map(([k, f]) => [
              k,
              { name: f.name, type: f.type, size: f.buffer.length },
            ]),
          )
        : undefined;
      const mockBody = files
        ? Object.fromEntries(Object.entries(body || {}).map(([k, v]) => [k, String(v)]))
        : body;
      return handle(method, path, { token, body: mockBody, query, files: mockFiles });
    },
  };
}

/** Replace every leaf with its type, keeping structure and array lengths. */
export function shape(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return v.map(shape);
  if (typeof v === 'object')
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, shape(v[k])]),
    );
  return typeof v;
}

/** A small client on top of a driver that records what it saw, for comparison. */
export function recorder(driver) {
  const log = [];
  const tokens = {};
  const api = {
    log,
    async call(label, method, path, opts = {}, pick) {
      const res = await driver.call(method, path, opts);
      log.push({
        label,
        status: res.status,
        shape: shape(res.body),
        value: pick ? pick(res.body) : undefined,
      });
      return res;
    },
    async login(role) {
      if (!tokens[role]) {
        const res = await driver.call('POST', '/auth/login', { body: DEMO(role) });
        tokens[role] = res.body.data.token;
      }
      return tokens[role];
    },
    forget(role) {
      delete tokens[role];
    },
  };
  return api;
}
