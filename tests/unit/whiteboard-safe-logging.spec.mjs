import { describe, expect, it } from 'vitest';

import {
  createSafeLogger as createResolverSafeLogger,
} from '../../src/observability/createSafeLogger.mjs';
import {
  createSafeLogger as createFrontendSafeLogger,
} from '../../static/spa/src/utils/safeLogger.ts';

const VALID_EVENT = {
  event_code: 'whiteboard_load_failed',
  phase: 'kvs_read',
  outcome: 'failed',
  app_version: 'unreleased',
  app_commit: '0123456789abcdef0123456789abcdef01234567',
  environment_type: 'ci',
  error_code: 'kvs_read_failed',
};

describe('Whiteboard safe logging contract', () => {
  it('writes only approved stable primitives and never exposes rejected values or writer errors', () => {
    for (const createSafeLogger of [createResolverSafeLogger, createFrontendSafeLogger]) {
      const writes = [];
      const logger = createSafeLogger({ writer: (event) => writes.push(event) });

      expect(logger.log({
        ...VALID_EVENT,
        error: new Error('sensitive error text'),
        document: { shapes: [{ text: 'customer content' }] },
        context: { localId: 'customer-context' },
        payload: { compressedJson: 'customer payload' },
        key: 'customer-kvs-key',
        url: 'https://customer.example.invalid/page',
        URL: new URL('https://customer.example.invalid/page'),
        unknown: 'customer unknown',
      })).toEqual({ kind: 'dropped', reason: 'unsafe_event' });
      expect(writes).toEqual([]);

      expect(logger.log(VALID_EVENT)).toEqual({ kind: 'written' });
      expect(writes).toEqual([VALID_EVENT]);

      const failingLogger = createSafeLogger({
        writer: () => { throw new Error('writer detail must stay private'); },
      });
      expect(() => failingLogger.log(VALID_EVENT)).not.toThrow();
      expect(failingLogger.log(VALID_EVENT)).toEqual({
        kind: 'dropped',
        reason: 'writer_failed',
      });
    }
  });
});
