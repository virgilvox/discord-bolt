/**
 * Expression Evaluator Caching Tests
 *
 * Tests the LRU caching implementation for compiled expressions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createEvaluator, ExpressionEvaluator } from '../evaluator.js';

describe('Expression Caching', () => {
  let evaluator: ExpressionEvaluator;

  beforeEach(() => {
    evaluator = createEvaluator({ cacheSize: 10 });
  });

  describe('Basic Caching', () => {
    it('should cache compiled expressions', async () => {
      const expression = '1 + 1';

      // First evaluation - cache miss
      await evaluator.evaluate(expression, {});
      const stats1 = evaluator.getStats();
      expect(stats1.cacheMisses).toBe(1);
      expect(stats1.cacheHits).toBe(0);

      // Second evaluation - cache hit
      await evaluator.evaluate(expression, {});
      const stats2 = evaluator.getStats();
      expect(stats2.cacheMisses).toBe(1);
      expect(stats2.cacheHits).toBe(1);
    });

    it('should reuse cached expressions for same expression', async () => {
      const expression = 'x + y';

      await evaluator.evaluate(expression, { x: 1, y: 2 });
      await evaluator.evaluate(expression, { x: 3, y: 4 });
      await evaluator.evaluate(expression, { x: 5, y: 6 });

      const stats = evaluator.getStats();
      expect(stats.evaluations).toBe(3);
      expect(stats.cacheMisses).toBe(1); // Only first was a miss
      expect(stats.cacheHits).toBe(2); // Two hits
    });

    it('should produce correct results from cached expressions', async () => {
      const expression = 'value * 2';

      const result1 = await evaluator.evaluate<number>(expression, { value: 5 });
      const result2 = await evaluator.evaluate<number>(expression, { value: 10 });
      const result3 = await evaluator.evaluate<number>(expression, { value: 100 });

      expect(result1).toBe(10);
      expect(result2).toBe(20);
      expect(result3).toBe(200);
    });

    it('should track sync evaluations', () => {
      const expression = 'a + b';

      evaluator.evaluateSync(expression, { a: 1, b: 2 });
      evaluator.evaluateSync(expression, { a: 3, b: 4 });

      const stats = evaluator.getStats();
      expect(stats.evaluations).toBe(2);
      expect(stats.cacheHits).toBe(1);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict oldest entries when cache is full', async () => {
      // Cache size is 10, fill it up
      for (let i = 0; i < 10; i++) {
        await evaluator.evaluate(`${i} + 1`, {});
      }

      const stats1 = evaluator.getStats();
      expect(stats1.cacheSize).toBe(10);
      expect(stats1.cacheMisses).toBe(10);

      // Add one more - should evict first
      await evaluator.evaluate('10 + 1', {});

      const stats2 = evaluator.getStats();
      expect(stats2.cacheSize).toBe(10);
      expect(stats2.cacheMisses).toBe(11);

      // First expression should be evicted (cache miss)
      await evaluator.evaluate('0 + 1', {});
      const stats3 = evaluator.getStats();
      expect(stats3.cacheMisses).toBe(12); // Was evicted, so miss again
    });

    it('should move recently used entries to end', async () => {
      // Fill cache with 10 entries
      for (let i = 0; i < 10; i++) {
        await evaluator.evaluate(`expr_${i}`, {});
      }

      // Access first entry (moves it to end)
      await evaluator.evaluate('expr_0', {});

      // Add new entry - should evict expr_1 (now oldest), not expr_0
      await evaluator.evaluate('new_expr', {});

      // expr_0 should still be cached
      const stats1 = evaluator.getStats();
      await evaluator.evaluate('expr_0', {});
      const stats2 = evaluator.getStats();
      expect(stats2.cacheHits).toBe(stats1.cacheHits + 1); // Hit, not miss

      // expr_1 should be evicted
      const stats3 = evaluator.getStats();
      await evaluator.evaluate('expr_1', {});
      const stats4 = evaluator.getStats();
      expect(stats4.cacheMisses).toBe(stats3.cacheMisses + 1); // Miss
    });
  });

  describe('Cache Statistics', () => {
    it('should calculate hit rate correctly', async () => {
      await evaluator.evaluate('a', {}); // miss
      await evaluator.evaluate('b', {}); // miss
      await evaluator.evaluate('a', {}); // hit
      await evaluator.evaluate('a', {}); // hit

      const stats = evaluator.getStats();
      expect(stats.evaluations).toBe(4);
      expect(stats.cacheHits).toBe(2);
      expect(stats.cacheMisses).toBe(2);
      expect(stats.hitRate).toBe(50);
    });

    it('should return 0 hit rate with no evaluations', () => {
      const stats = evaluator.getStats();
      expect(stats.hitRate).toBe(0);
      expect(stats.evaluations).toBe(0);
    });

    it('should report cache size', async () => {
      expect(evaluator.getStats().cacheSize).toBe(0);

      await evaluator.evaluate('a', {});
      expect(evaluator.getStats().cacheSize).toBe(1);

      await evaluator.evaluate('b', {});
      expect(evaluator.getStats().cacheSize).toBe(2);

      await evaluator.evaluate('a', {}); // hit, no increase
      expect(evaluator.getStats().cacheSize).toBe(2);
    });
  });

  describe('Cache Clear', () => {
    it('should clear all cache data', async () => {
      await evaluator.evaluate('a + b', { a: 1, b: 2 });
      await evaluator.evaluate('c + d', { c: 3, d: 4 });

      const statsBefore = evaluator.getStats();
      expect(statsBefore.cacheSize).toBe(2);
      expect(statsBefore.evaluations).toBe(2);

      evaluator.clearCache();

      const statsAfter = evaluator.getStats();
      expect(statsAfter.cacheSize).toBe(0);
      expect(statsAfter.evaluations).toBe(0);
      expect(statsAfter.cacheHits).toBe(0);
      expect(statsAfter.cacheMisses).toBe(0);
    });

    it('should require re-compilation after clear', async () => {
      const expr = 'x + 1';

      await evaluator.evaluate(expr, { x: 1 });
      expect(evaluator.getStats().cacheMisses).toBe(1);

      evaluator.clearCache();

      await evaluator.evaluate(expr, { x: 2 });
      expect(evaluator.getStats().cacheMisses).toBe(1); // Fresh miss
    });
  });

  describe('Complex Expressions', () => {
    it('should cache complex expressions', async () => {
      const complex = 'items|filter("active")|map("name")|join(", ")';

      await evaluator.evaluate(complex, {
        items: [
          { name: 'a', active: true },
          { name: 'b', active: false },
        ],
      });

      await evaluator.evaluate(complex, {
        items: [
          { name: 'x', active: true },
          { name: 'y', active: true },
        ],
      });

      const stats = evaluator.getStats();
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
    });

    it('should handle function calls efficiently', async () => {
      // Multiple evaluations with same function call expression
      for (let i = 0; i < 100; i++) {
        await evaluator.evaluate('upper(name)', { name: `user${i}` });
      }

      const stats = evaluator.getStats();
      expect(stats.evaluations).toBe(100);
      expect(stats.cacheMisses).toBe(1); // Only one compile
      expect(stats.cacheHits).toBe(99); // 99 hits
    });
  });

  describe('Interpolation Caching', () => {
    it('should cache expressions within templates', async () => {
      const template = 'Hello ${name}, you have ${count} messages';

      await evaluator.interpolate(template, { name: 'Alice', count: 5 });
      await evaluator.interpolate(template, { name: 'Bob', count: 10 });

      // Both 'name' and 'count' expressions should have cache hits on second call
      const stats = evaluator.getStats();
      expect(stats.evaluations).toBe(4); // 2 expressions * 2 calls
      expect(stats.cacheHits).toBe(2); // Second call hits cache
    });
  });
});
