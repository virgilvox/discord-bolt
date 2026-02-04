/**
 * Canvas action handler tests
 *
 * Note: These tests verify action handler registration and configuration.
 * Full rendering tests require the canvas native module.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActionRegistry } from '../registry.js';
import type { ActionContext } from '../types.js';
import type { CanvasRenderAction, RenderLayersAction } from '@furlow/schema';

// Mock evaluator
const mockEvaluator = {
  interpolate: vi.fn(async (str: string, ctx: any) => {
    return str.replace(/\$\{(\w+)\}/g, (_, key) => ctx[key] ?? '');
  }),
  evaluate: vi.fn(async (expr: string, ctx: any) => {
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    return ctx[expr] ?? expr;
  }),
};

function createMockContext(overrides: Partial<ActionContext> = {}): ActionContext {
  return {
    _deps: {
      client: {} as any,
      evaluator: mockEvaluator,
    },
    _canvasGenerators: {
      welcome_card: {
        width: 800,
        height: 300,
        background: '#23272A',
        layers: [
          {
            type: 'text',
            x: 400,
            y: 150,
            text: 'Welcome, ${username}!',
            color: '#ffffff',
          },
        ],
      },
      rank_card: {
        width: 934,
        height: 282,
        layers: [
          {
            type: 'progress_bar',
            x: 250,
            y: 150,
            width: 654,
            height: 30,
            progress: '${progress}',
            background: '#484b4e',
            fill: '#5865F2',
          },
        ],
      },
    },
    user: {
      id: 'user-123',
      username: 'TestUser',
      displayName: 'Test User',
      displayAvatarURL: vi.fn(() => 'https://example.com/avatar.png'),
    },
    guild: {
      id: 'guild-123',
      name: 'Test Guild',
    },
    ...overrides,
  } as unknown as ActionContext;
}

describe('canvas action handler registration', () => {
  let registry: ReturnType<typeof createActionRegistry>;

  beforeEach(async () => {
    vi.clearAllMocks();
    registry = createActionRegistry();

    const { registerMiscHandlers } = await import('../handlers/misc.js');
    registerMiscHandlers(registry, {
      client: {} as any,
      evaluator: mockEvaluator as any,
    });
  });

  it('should register canvas_render handler', () => {
    expect(registry.has('canvas_render')).toBe(true);
  });

  it('should register render_layers handler', () => {
    expect(registry.has('render_layers')).toBe(true);
  });

  it('should get canvas_render handler', () => {
    const handler = registry.get('canvas_render');
    expect(handler).toBeDefined();
    expect(handler.name).toBe('canvas_render');
    expect(typeof handler.execute).toBe('function');
  });

  it('should get render_layers handler', () => {
    const handler = registry.get('render_layers');
    expect(handler).toBeDefined();
    expect(handler.name).toBe('render_layers');
    expect(typeof handler.execute).toBe('function');
  });
});

describe('canvas_render action handler', () => {
  let registry: ReturnType<typeof createActionRegistry>;

  beforeEach(async () => {
    vi.clearAllMocks();
    registry = createActionRegistry();

    const { registerMiscHandlers } = await import('../handlers/misc.js');
    registerMiscHandlers(registry, {
      client: {} as any,
      evaluator: mockEvaluator as any,
    });
  });

  it('should fail for non-existent generator', async () => {
    const context = createMockContext();
    const action: CanvasRenderAction = {
      action: 'canvas_render',
      generator: 'non_existent',
    };

    const handler = registry.get('canvas_render');
    const result = await handler.execute(action, context);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('not found');
  });

  it('should fail when _canvasGenerators is missing', async () => {
    const context = createMockContext();
    delete (context as any)._canvasGenerators;

    const action: CanvasRenderAction = {
      action: 'canvas_render',
      generator: 'test',
    };

    const handler = registry.get('canvas_render');
    const result = await handler.execute(action, context);

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('not found');
  });

  it('should interpolate generator name', async () => {
    const context = createMockContext();
    const action: CanvasRenderAction = {
      action: 'canvas_render',
      generator: '${genName}',
    };

    // This will try to find generator named '${genName}' (interpolated to '')
    // which doesn't exist
    const handler = registry.get('canvas_render');
    const result = await handler.execute(action, context);

    expect(mockEvaluator.interpolate).toHaveBeenCalledWith('${genName}', context);
    expect(result.success).toBe(false); // Generator not found
  });

  it('should evaluate context expressions', async () => {
    const context = createMockContext();
    // Set generator to a valid one that will be found
    mockEvaluator.interpolate.mockImplementationOnce(async () => 'non_existent');

    const action: CanvasRenderAction = {
      action: 'canvas_render',
      generator: 'non_existent',
      context: {
        foo: '${bar}',
      },
    };

    const handler = registry.get('canvas_render');
    await handler.execute(action, context);

    // Should have tried to interpolate the generator name
    expect(mockEvaluator.interpolate).toHaveBeenCalled();
  });
});

describe('render_layers action handler', () => {
  let registry: ReturnType<typeof createActionRegistry>;

  beforeEach(async () => {
    vi.clearAllMocks();
    registry = createActionRegistry();

    const { registerMiscHandlers } = await import('../handlers/misc.js');
    registerMiscHandlers(registry, {
      client: {} as any,
      evaluator: mockEvaluator as any,
    });
  });

  it('should have correct handler name', () => {
    const handler = registry.get('render_layers');
    expect(handler.name).toBe('render_layers');
  });

  it('should accept required parameters', () => {
    const action: RenderLayersAction = {
      action: 'render_layers',
      width: 400,
      height: 200,
      layers: [],
    };

    // Action structure is valid
    expect(action.width).toBe(400);
    expect(action.height).toBe(200);
    expect(action.layers).toEqual([]);
  });

  it('should accept optional parameters', () => {
    const action: RenderLayersAction = {
      action: 'render_layers',
      width: 400,
      height: 200,
      background: '#333333',
      layers: [],
      format: 'jpeg',
      quality: 0.9,
      as: 'result',
    };

    expect(action.background).toBe('#333333');
    expect(action.format).toBe('jpeg');
    expect(action.quality).toBe(0.9);
    expect(action.as).toBe('result');
  });

  it('should interpolate background when provided', async () => {
    const context = createMockContext();
    const action: RenderLayersAction = {
      action: 'render_layers',
      width: 100,
      height: 100,
      background: '${bgColor}',
      layers: [],
    };

    const handler = registry.get('render_layers');

    // The handler will try to render but fail due to no canvas module
    // We just want to verify it processes the background expression
    try {
      await handler.execute(action, context);
    } catch {
      // Expected to fail without canvas module
    }

    expect(mockEvaluator.interpolate).toHaveBeenCalledWith('${bgColor}', context);
  });
});

describe('canvas action validation', () => {
  it('should have valid CanvasRenderAction structure', () => {
    const action: CanvasRenderAction = {
      action: 'canvas_render',
      generator: 'my_generator',
      context: {
        user: '${user}',
        level: '${level}',
      },
      as: 'rendered_image',
    };

    expect(action.action).toBe('canvas_render');
    expect(action.generator).toBe('my_generator');
    expect(action.context).toBeDefined();
    expect(action.as).toBe('rendered_image');
  });

  it('should have valid RenderLayersAction structure', () => {
    const action: RenderLayersAction = {
      action: 'render_layers',
      width: 800,
      height: 300,
      background: '#23272A',
      layers: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          width: 800,
          height: 4,
          color: '#5865F2',
        },
        {
          type: 'text',
          x: 400,
          y: 150,
          text: 'Hello!',
          color: '#ffffff',
          align: 'center',
        },
        {
          type: 'circle_image',
          x: 320,
          y: 40,
          radius: 80,
          src: 'https://example.com/avatar.png',
        },
        {
          type: 'progress_bar',
          x: 100,
          y: 250,
          width: 600,
          height: 30,
          progress: 0.75,
          background: '#444',
          fill: '#5865F2',
        },
      ],
      format: 'png',
      as: 'my_image',
    };

    expect(action.action).toBe('render_layers');
    expect(action.width).toBe(800);
    expect(action.height).toBe(300);
    expect(action.layers.length).toBe(4);
    expect(action.format).toBe('png');
    expect(action.as).toBe('my_image');
  });

  it('should support all layer types in RenderLayersAction', () => {
    const action: RenderLayersAction = {
      action: 'render_layers',
      width: 800,
      height: 600,
      layers: [
        { type: 'rect', x: 0, y: 0, width: 100, height: 100, color: '#fff' },
        { type: 'text', x: 50, y: 50, text: 'Test' },
        { type: 'image', x: 0, y: 0, src: 'https://example.com/img.png' },
        { type: 'circle_image', x: 0, y: 0, radius: 50, src: 'https://example.com/img.png' },
        { type: 'progress_bar', x: 0, y: 0, width: 200, height: 20, progress: 0.5, background: '#000', fill: '#fff' },
        { type: 'gradient', x: 0, y: 0, width: 200, height: 200, direction: 'diagonal', stops: [{ offset: 0, color: '#000' }, { offset: 1, color: '#fff' }] },
      ],
    };

    expect(action.layers.length).toBe(6);
    expect(action.layers[0].type).toBe('rect');
    expect(action.layers[1].type).toBe('text');
    expect(action.layers[2].type).toBe('image');
    expect(action.layers[3].type).toBe('circle_image');
    expect(action.layers[4].type).toBe('progress_bar');
    expect(action.layers[5].type).toBe('gradient');
  });
});
