/**
 * Timer manager tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimerManager, parseDuration, createTimerManager } from '../timer.js';
import type { ActionContext } from '../../actions/types.js';
import type { ActionExecutor } from '../../actions/executor.js';
import type { EventRouter } from '../../events/router.js';
import type { ExpressionEvaluator } from '../../expression/evaluator.js';

describe('TimerManager', () => {
  let timerManager: TimerManager;
  let mockEventRouter: EventRouter;
  let mockExecutor: ActionExecutor;
  let mockEvaluator: ExpressionEvaluator;
  let mockContextBuilder: () => ActionContext;

  beforeEach(() => {
    vi.useFakeTimers();
    timerManager = createTimerManager();

    mockEventRouter = {
      emit: vi.fn().mockResolvedValue(undefined),
    } as unknown as EventRouter;

    mockExecutor = {
      executeOne: vi.fn().mockResolvedValue({ success: true }),
      executeAll: vi.fn().mockResolvedValue([]),
    } as unknown as ActionExecutor;

    mockEvaluator = {
      evaluate: vi.fn().mockResolvedValue(true),
      interpolate: vi.fn().mockImplementation(async (s) => s),
    } as unknown as ExpressionEvaluator;

    mockContextBuilder = () => ({
      guildId: 'guild-123',
      channelId: 'channel-123',
      userId: 'user-123',
      client: {},
      stateManager: {},
      evaluator: mockEvaluator,
      flowExecutor: {},
    } as ActionContext);
  });

  afterEach(() => {
    timerManager.cancelAll();
    vi.useRealTimers();
  });

  describe('create', () => {
    it('should create a timer', () => {
      timerManager.create(
        'test-timer',
        5000,
        'timer_expired',
        { key: 'value' },
        mockEventRouter,
        mockExecutor,
        mockEvaluator,
        mockContextBuilder
      );

      expect(timerManager.has('test-timer')).toBe(true);
      expect(timerManager.count()).toBe(1);
    });

    it('should store timer info correctly', () => {
      timerManager.create(
        'my-timer',
        10000,
        'custom_event',
        { foo: 'bar' },
        mockEventRouter,
        mockExecutor,
        mockEvaluator,
        mockContextBuilder
      );

      const timer = timerManager.get('my-timer');
      expect(timer).toBeDefined();
      expect(timer?.id).toBe('my-timer');
      expect(timer?.event).toBe('custom_event');
      expect(timer?.data).toEqual({ foo: 'bar' });
      expect(timer?.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should fire event after duration', async () => {
      timerManager.create(
        'test-timer',
        5000,
        'timer_expired',
        { key: 'value' },
        mockEventRouter,
        mockExecutor,
        mockEvaluator,
        mockContextBuilder
      );

      expect(mockEventRouter.emit).not.toHaveBeenCalled();

      // Advance time
      await vi.advanceTimersByTimeAsync(5000);

      // Should emit the custom event
      expect(mockEventRouter.emit).toHaveBeenCalledWith(
        'timer_expired',
        expect.objectContaining({
          timer: expect.objectContaining({
            id: 'test-timer',
            event: 'timer_expired',
            data: { key: 'value' },
          }),
        }),
        mockExecutor,
        mockEvaluator
      );

      // Should also emit generic timer_fire event
      expect(mockEventRouter.emit).toHaveBeenCalledWith(
        'timer_fire',
        expect.any(Object),
        mockExecutor,
        mockEvaluator
      );
    });

    it('should remove timer after firing', async () => {
      timerManager.create(
        'test-timer',
        1000,
        'event',
        {},
        mockEventRouter,
        mockExecutor,
        mockEvaluator,
        mockContextBuilder
      );

      expect(timerManager.has('test-timer')).toBe(true);

      await vi.advanceTimersByTimeAsync(1000);

      expect(timerManager.has('test-timer')).toBe(false);
    });

    it('should cancel existing timer with same ID', () => {
      timerManager.create(
        'same-id',
        5000,
        'event1',
        { v: 1 },
        mockEventRouter,
        mockExecutor,
        mockEvaluator,
        mockContextBuilder
      );

      timerManager.create(
        'same-id',
        10000,
        'event2',
        { v: 2 },
        mockEventRouter,
        mockExecutor,
        mockEvaluator,
        mockContextBuilder
      );

      const timer = timerManager.get('same-id');
      expect(timer?.event).toBe('event2');
      expect(timer?.data).toEqual({ v: 2 });
      expect(timerManager.count()).toBe(1);
    });

    it('should create multiple independent timers', () => {
      timerManager.create('timer1', 1000, 'e1', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);
      timerManager.create('timer2', 2000, 'e2', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);
      timerManager.create('timer3', 3000, 'e3', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);

      expect(timerManager.count()).toBe(3);
      expect(timerManager.getIds()).toEqual(['timer1', 'timer2', 'timer3']);
    });
  });

  describe('cancel', () => {
    it('should cancel an existing timer', () => {
      timerManager.create(
        'test-timer',
        5000,
        'event',
        {},
        mockEventRouter,
        mockExecutor,
        mockEvaluator,
        mockContextBuilder
      );

      const result = timerManager.cancel('test-timer');

      expect(result).toBe(true);
      expect(timerManager.has('test-timer')).toBe(false);
    });

    it('should return false for non-existent timer', () => {
      const result = timerManager.cancel('nonexistent');
      expect(result).toBe(false);
    });

    it('should prevent timer from firing', async () => {
      timerManager.create(
        'test-timer',
        5000,
        'event',
        {},
        mockEventRouter,
        mockExecutor,
        mockEvaluator,
        mockContextBuilder
      );

      timerManager.cancel('test-timer');

      await vi.advanceTimersByTimeAsync(10000);

      expect(mockEventRouter.emit).not.toHaveBeenCalled();
    });
  });

  describe('has', () => {
    it('should return true for existing timer', () => {
      timerManager.create('timer', 1000, 'e', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);
      expect(timerManager.has('timer')).toBe(true);
    });

    it('should return false for non-existent timer', () => {
      expect(timerManager.has('nonexistent')).toBe(false);
    });
  });

  describe('get', () => {
    it('should return timer info without timeout', () => {
      timerManager.create(
        'timer',
        5000,
        'my_event',
        { a: 1 },
        mockEventRouter,
        mockExecutor,
        mockEvaluator,
        mockContextBuilder
      );

      const timer = timerManager.get('timer');

      expect(timer).toBeDefined();
      expect(timer?.id).toBe('timer');
      expect(timer?.event).toBe('my_event');
      expect(timer?.data).toEqual({ a: 1 });
      expect((timer as any)?.timeout).toBeUndefined();
    });

    it('should return undefined for non-existent timer', () => {
      expect(timerManager.get('nonexistent')).toBeUndefined();
    });
  });

  describe('getRemaining', () => {
    it('should return remaining time in ms', () => {
      timerManager.create('timer', 10000, 'e', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);

      const remaining = timerManager.getRemaining('timer');
      expect(remaining).toBeGreaterThan(9000);
      expect(remaining).toBeLessThanOrEqual(10000);
    });

    it('should decrease as time passes', async () => {
      timerManager.create('timer', 10000, 'e', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);

      await vi.advanceTimersByTimeAsync(3000);

      const remaining = timerManager.getRemaining('timer');
      expect(remaining).toBeLessThanOrEqual(7000);
      expect(remaining).toBeGreaterThan(6000);
    });

    it('should return 0 at minimum (not negative)', async () => {
      timerManager.create('timer', 1000, 'e', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);

      // Advance past expiration but before timer is removed
      vi.setSystemTime(Date.now() + 2000);

      const remaining = timerManager.getRemaining('timer');
      expect(remaining).toBe(0);
    });

    it('should return undefined for non-existent timer', () => {
      expect(timerManager.getRemaining('nonexistent')).toBeUndefined();
    });
  });

  describe('getIds', () => {
    it('should return all timer IDs', () => {
      timerManager.create('a', 1000, 'e', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);
      timerManager.create('b', 2000, 'e', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);
      timerManager.create('c', 3000, 'e', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);

      const ids = timerManager.getIds();
      expect(ids).toHaveLength(3);
      expect(ids).toContain('a');
      expect(ids).toContain('b');
      expect(ids).toContain('c');
    });

    it('should return empty array when no timers', () => {
      expect(timerManager.getIds()).toEqual([]);
    });
  });

  describe('count', () => {
    it('should return correct count', () => {
      expect(timerManager.count()).toBe(0);

      timerManager.create('t1', 1000, 'e', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);
      expect(timerManager.count()).toBe(1);

      timerManager.create('t2', 1000, 'e', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);
      expect(timerManager.count()).toBe(2);

      timerManager.cancel('t1');
      expect(timerManager.count()).toBe(1);
    });
  });

  describe('cancelAll', () => {
    it('should cancel all timers', () => {
      timerManager.create('t1', 1000, 'e', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);
      timerManager.create('t2', 2000, 'e', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);
      timerManager.create('t3', 3000, 'e', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);

      timerManager.cancelAll();

      expect(timerManager.count()).toBe(0);
      expect(timerManager.getIds()).toEqual([]);
    });

    it('should prevent all timers from firing', async () => {
      timerManager.create('t1', 1000, 'e1', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);
      timerManager.create('t2', 2000, 'e2', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);

      timerManager.cancelAll();

      await vi.advanceTimersByTimeAsync(5000);

      expect(mockEventRouter.emit).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should remove expired timers', () => {
      timerManager.create('timer', 1000, 'e', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);

      // Manually set the time past expiration
      vi.setSystemTime(Date.now() + 2000);

      const cleaned = timerManager.cleanup();

      expect(cleaned).toBe(1);
      expect(timerManager.has('timer')).toBe(false);
    });

    it('should not remove active timers', () => {
      timerManager.create('timer', 10000, 'e', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);

      const cleaned = timerManager.cleanup();

      expect(cleaned).toBe(0);
      expect(timerManager.has('timer')).toBe(true);
    });

    it('should return count of cleaned timers', () => {
      timerManager.create('t1', 1000, 'e', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);
      timerManager.create('t2', 1000, 'e', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);
      timerManager.create('t3', 99999, 'e', {}, mockEventRouter, mockExecutor, mockEvaluator, mockContextBuilder);

      vi.setSystemTime(Date.now() + 2000);

      const cleaned = timerManager.cleanup();

      expect(cleaned).toBe(2);
      expect(timerManager.count()).toBe(1);
    });
  });

  describe('timer context augmentation', () => {
    it('should include timer info in context', async () => {
      timerManager.create(
        'context-timer',
        1000,
        'test_event',
        { testKey: 'testValue' },
        mockEventRouter,
        mockExecutor,
        mockEvaluator,
        mockContextBuilder
      );

      await vi.advanceTimersByTimeAsync(1000);

      expect(mockEventRouter.emit).toHaveBeenCalledWith(
        'test_event',
        expect.objectContaining({
          guildId: 'guild-123',
          timer: {
            id: 'context-timer',
            event: 'test_event',
            data: { testKey: 'testValue' },
            expiresAt: expect.any(Number),
          },
        }),
        mockExecutor,
        mockEvaluator
      );
    });
  });
});

describe('parseDuration', () => {
  it('should parse milliseconds', () => {
    expect(parseDuration('100ms')).toBe(100);
    expect(parseDuration('1000ms')).toBe(1000);
  });

  it('should parse seconds', () => {
    expect(parseDuration('1s')).toBe(1000);
    expect(parseDuration('30s')).toBe(30000);
  });

  it('should parse minutes', () => {
    expect(parseDuration('1m')).toBe(60000);
    expect(parseDuration('5m')).toBe(300000);
  });

  it('should parse hours', () => {
    expect(parseDuration('1h')).toBe(3600000);
    expect(parseDuration('2h')).toBe(7200000);
  });

  it('should parse days', () => {
    expect(parseDuration('1d')).toBe(86400000);
    expect(parseDuration('7d')).toBe(604800000);
  });

  it('should parse weeks', () => {
    expect(parseDuration('1w')).toBe(604800000);
    expect(parseDuration('2w')).toBe(1209600000);
  });

  it('should default to milliseconds when no unit', () => {
    expect(parseDuration('500')).toBe(500);
    expect(parseDuration('1000')).toBe(1000);
  });

  it('should return 0 for invalid format', () => {
    expect(parseDuration('invalid')).toBe(0);
    expect(parseDuration('')).toBe(0);
    expect(parseDuration('abc123')).toBe(0);
    expect(parseDuration('10x')).toBe(0);
  });
});

describe('createTimerManager', () => {
  it('should create a new TimerManager instance', () => {
    const manager = createTimerManager();
    expect(manager).toBeInstanceOf(TimerManager);
    expect(manager.count()).toBe(0);
  });
});
