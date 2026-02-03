import { describe, it, expect, beforeEach } from 'vitest';
import { createEvaluator, ExpressionEvaluator } from '../evaluator.js';

describe('Expression Transforms', () => {
  let evaluator: ExpressionEvaluator;

  beforeEach(() => {
    evaluator = createEvaluator({ allowUndefined: true });
  });

  // =====================================
  // String Transforms
  // =====================================
  describe('string transforms', () => {
    it('lower transform', async () => {
      expect(await evaluator.evaluate('"HELLO"|lower')).toBe('hello');
    });

    it('upper transform', async () => {
      expect(await evaluator.evaluate('"hello"|upper')).toBe('HELLO');
    });

    it('capitalize transform', async () => {
      expect(await evaluator.evaluate('"hello world"|capitalize')).toBe('Hello world');
    });

    it('trim transform', async () => {
      expect(await evaluator.evaluate('"  hello  "|trim')).toBe('hello');
    });

    it('truncate transform', async () => {
      expect(await evaluator.evaluate('"hello world"|truncate(8)')).toBe('hello...');
    });

    it('truncate with custom suffix', async () => {
      expect(await evaluator.evaluate('"hello world"|truncate(8, "~")')).toBe('hello w~');
    });

    it('split transform', async () => {
      expect(await evaluator.evaluate('"a,b,c"|split(",")')).toEqual(['a', 'b', 'c']);
    });

    it('replace transform', async () => {
      expect(await evaluator.evaluate('"hello world"|replace("world", "there")')).toBe('hello there');
    });

    it('padStart transform', async () => {
      expect(await evaluator.evaluate('"5"|padStart(3, "0")')).toBe('005');
    });

    it('padEnd transform', async () => {
      expect(await evaluator.evaluate('"5"|padEnd(3, "0")')).toBe('500');
    });
  });

  // =====================================
  // Array Transforms
  // =====================================
  describe('array transforms', () => {
    it('join transform', async () => {
      const context = { arr: ['a', 'b', 'c'] };
      expect(await evaluator.evaluate('arr|join("-")', context)).toBe('a-b-c');
    });

    it('join with default delimiter', async () => {
      const context = { arr: ['a', 'b', 'c'] };
      expect(await evaluator.evaluate('arr|join', context)).toBe('a, b, c');
    });

    it('first transform', async () => {
      const context = { arr: [10, 20, 30] };
      expect(await evaluator.evaluate('arr|first', context)).toBe(10);
    });

    it('last transform', async () => {
      const context = { arr: [10, 20, 30] };
      expect(await evaluator.evaluate('arr|last', context)).toBe(30);
    });

    it('nth transform', async () => {
      const context = { arr: [10, 20, 30] };
      expect(await evaluator.evaluate('arr|nth(1)', context)).toBe(20);
    });

    it('slice transform', async () => {
      const context = { arr: [1, 2, 3, 4, 5] };
      expect(await evaluator.evaluate('arr|slice(1, 4)', context)).toEqual([2, 3, 4]);
    });

    it('reverse transform', async () => {
      const context = { arr: [1, 2, 3] };
      expect(await evaluator.evaluate('arr|reverse', context)).toEqual([3, 2, 1]);
    });

    it('sort transform', async () => {
      const context = { arr: [3, 1, 2] };
      expect(await evaluator.evaluate('arr|sort', context)).toEqual([1, 2, 3]);
    });

    it('sort by key transform', async () => {
      const context = { arr: [{ n: 3 }, { n: 1 }, { n: 2 }] };
      const result = await evaluator.evaluate<Array<{ n: number }>>('arr|sort("n")', context);
      expect(result.map((i) => i.n)).toEqual([1, 2, 3]);
    });

    it('unique transform', async () => {
      const context = { arr: [1, 2, 2, 3, 1] };
      expect(await evaluator.evaluate('arr|unique', context)).toEqual([1, 2, 3]);
    });

    it('flatten transform', async () => {
      const context = { arr: [[1, 2], [3, 4]] };
      expect(await evaluator.evaluate('arr|flatten', context)).toEqual([1, 2, 3, 4]);
    });

    it('filter transform', async () => {
      const context = { arr: [{ type: 'a' }, { type: 'b' }, { type: 'a' }] };
      const result = await evaluator.evaluate<Array<{ type: string }>>('arr|filter("type", "a")', context);
      expect(result).toHaveLength(2);
      expect(result.every((i) => i.type === 'a')).toBe(true);
    });

    it('map transform', async () => {
      const context = { arr: [{ name: 'Alice' }, { name: 'Bob' }] };
      expect(await evaluator.evaluate('arr|map("name")', context)).toEqual(['Alice', 'Bob']);
    });

    it('pluck transform (alias for map)', async () => {
      const context = { arr: [{ id: 1 }, { id: 2 }] };
      expect(await evaluator.evaluate('arr|pluck("id")', context)).toEqual([1, 2]);
    });

    it('pick transform', async () => {
      const context = { arr: [1, 2, 3] };
      const result = await evaluator.evaluate<number>('arr|pick', context);
      expect([1, 2, 3]).toContain(result);
    });
  });

  // =====================================
  // Number Transforms
  // =====================================
  describe('number transforms', () => {
    it('round transform', async () => {
      expect(await evaluator.evaluate('3.14159|round(2)')).toBe(3.14);
    });

    it('floor transform', async () => {
      expect(await evaluator.evaluate('3.9|floor')).toBe(3);
    });

    it('ceil transform', async () => {
      expect(await evaluator.evaluate('3.1|ceil')).toBe(4);
    });

    it('abs transform', async () => {
      expect(await evaluator.evaluate('(-5)|abs')).toBe(5);
    });

    it('format transform', async () => {
      expect(await evaluator.evaluate('1234567|format')).toBe('1,234,567');
    });

    it('ordinal transform', async () => {
      expect(await evaluator.evaluate('1|ordinal')).toBe('1st');
      expect(await evaluator.evaluate('2|ordinal')).toBe('2nd');
      expect(await evaluator.evaluate('3|ordinal')).toBe('3rd');
      expect(await evaluator.evaluate('4|ordinal')).toBe('4th');
      expect(await evaluator.evaluate('11|ordinal')).toBe('11th');
      expect(await evaluator.evaluate('21|ordinal')).toBe('21st');
    });
  });

  // =====================================
  // Object Transforms
  // =====================================
  describe('object transforms', () => {
    it('keys transform', async () => {
      const context = { obj: { a: 1, b: 2 } };
      expect(await evaluator.evaluate('obj|keys', context)).toEqual(['a', 'b']);
    });

    it('values transform', async () => {
      const context = { obj: { a: 1, b: 2 } };
      expect(await evaluator.evaluate('obj|values', context)).toEqual([1, 2]);
    });

    it('entries transform', async () => {
      const context = { obj: { a: 1, b: 2 } };
      expect(await evaluator.evaluate('obj|entries', context)).toEqual([['a', 1], ['b', 2]]);
    });

    it('get transform', async () => {
      const context = { obj: { a: { b: { c: 42 } } } };
      expect(await evaluator.evaluate('obj|get("a.b.c")', context)).toBe(42);
    });

    it('get transform with default', async () => {
      const context = { obj: {} };
      expect(await evaluator.evaluate('obj|get("missing", "default")', context)).toBe('default');
    });
  });

  // =====================================
  // Type Transforms
  // =====================================
  describe('type transforms', () => {
    it('string transform', async () => {
      expect(await evaluator.evaluate('123|string')).toBe('123');
    });

    it('number transform', async () => {
      expect(await evaluator.evaluate('"123"|number')).toBe(123);
    });

    it('int transform', async () => {
      expect(await evaluator.evaluate('"42.7"|int')).toBe(42);
    });

    it('float transform', async () => {
      expect(await evaluator.evaluate('"3.14"|float')).toBe(3.14);
    });

    it('boolean transform', async () => {
      expect(await evaluator.evaluate('1|boolean')).toBe(true);
      expect(await evaluator.evaluate('0|boolean')).toBe(false);
    });

    it('json transform', async () => {
      const context = { obj: { a: 1 } };
      expect(await evaluator.evaluate('obj|json', context)).toBe('{"a":1}');
    });
  });

  // =====================================
  // Utility Transforms
  // =====================================
  describe('utility transforms', () => {
    it('default transform', async () => {
      expect(await evaluator.evaluate('null|default("fallback")')).toBe('fallback');
      expect(await evaluator.evaluate('"value"|default("fallback")')).toBe('value');
    });

    it('length transform', async () => {
      const context = { arr: [1, 2, 3], str: 'hello' };
      expect(await evaluator.evaluate('arr|length', context)).toBe(3);
      expect(await evaluator.evaluate('str|length', context)).toBe(5);
    });

    it('size transform', async () => {
      const context = { arr: [1, 2, 3], obj: { a: 1, b: 2 }, str: 'hello' };
      expect(await evaluator.evaluate('arr|size', context)).toBe(3);
      expect(await evaluator.evaluate('obj|size', context)).toBe(2);
      expect(await evaluator.evaluate('str|size', context)).toBe(5);
    });
  });

  // =====================================
  // Date Transforms
  // =====================================
  describe('date transforms', () => {
    it('timestamp transform', async () => {
      const context = { d: new Date('2024-01-15T12:00:00Z') };
      const result = await evaluator.evaluate<number>('d|timestamp', context);
      expect(typeof result).toBe('number');
    });

    it('timestamp with format transform', async () => {
      const context = { d: new Date('2024-01-15T12:00:00Z') };
      const result = await evaluator.evaluate<string>('d|timestamp("relative")', context);
      expect(result).toMatch(/^<t:\d+:R>$/);
    });

    it('duration transform', async () => {
      expect(await evaluator.evaluate('5000|duration')).toBe('5s');
      expect(await evaluator.evaluate('90000|duration')).toBe('1m 30s');
    });
  });

  // =====================================
  // Discord Transforms
  // =====================================
  describe('discord transforms', () => {
    it('mention user transform', async () => {
      expect(await evaluator.evaluate('"123456"|mention("user")')).toBe('<@123456>');
    });

    it('mention role transform', async () => {
      expect(await evaluator.evaluate('"123456"|mention("role")')).toBe('<@&123456>');
    });

    it('mention channel transform', async () => {
      expect(await evaluator.evaluate('"123456"|mention("channel")')).toBe('<#123456>');
    });

    it('pluralize transform', async () => {
      expect(await evaluator.evaluate('1|pluralize("item")')).toBe('item');
      expect(await evaluator.evaluate('2|pluralize("item")')).toBe('items');
      expect(await evaluator.evaluate('0|pluralize("child", "children")')).toBe('children');
    });
  });

  // =====================================
  // Chained Transforms
  // =====================================
  describe('chained transforms', () => {
    it('chain multiple string transforms', async () => {
      expect(await evaluator.evaluate('"  HELLO WORLD  "|trim|lower')).toBe('hello world');
    });

    it('chain array and string transforms', async () => {
      const context = { arr: ['apple', 'banana', 'cherry'] };
      expect(await evaluator.evaluate('arr|join(", ")|upper', context)).toBe('APPLE, BANANA, CHERRY');
    });

    it('chain with arguments', async () => {
      expect(await evaluator.evaluate('"hello world"|upper|truncate(8)')).toBe('HELLO...');
    });

    it('complex chain with context', async () => {
      const context = {
        users: [
          { name: 'alice', score: 100 },
          { name: 'bob', score: 200 },
          { name: 'charlie', score: 150 },
        ]
      };
      const result = await evaluator.evaluate('users|sort("score")|reverse|first|get("name")|capitalize', context);
      expect(result).toBe('Bob');
    });
  });
});
