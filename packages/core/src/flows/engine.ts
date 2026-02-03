/**
 * Flow engine - executes named action sequences
 */

import type { FlowDefinition, FlowParameter, Action } from '@furlow/schema';
import type { FlowExecutionContext, FlowResult, RegisteredFlow } from './types.js';
import type { ActionExecutor } from '../actions/executor.js';
import type { ActionContext, ActionResult } from '../actions/types.js';
import type { ExpressionEvaluator } from '../expression/evaluator.js';
import { FlowNotFoundError, FlowAbortedError, MaxFlowDepthError } from '../errors/index.js';

export interface FlowEngineOptions {
  /** Maximum flow call depth */
  maxDepth?: number;
  /** Maximum loop iterations */
  maxIterations?: number;
}

const DEFAULT_OPTIONS: Required<FlowEngineOptions> = {
  maxDepth: 50,
  maxIterations: 10000,
};

export class FlowEngine {
  private flows: Map<string, RegisteredFlow> = new Map();
  private options: Required<FlowEngineOptions>;

  constructor(options: FlowEngineOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Register a flow definition
   */
  register(flow: FlowDefinition): void {
    const parameters = new Map<string, FlowParameter>();
    for (const param of flow.parameters ?? []) {
      parameters.set(param.name, param);
    }

    // Normalize actions from YAML shorthand to schema format
    const normalizedFlow: FlowDefinition = {
      ...flow,
      actions: normalizeActionsDeep(flow.actions),
    };

    this.flows.set(flow.name, { definition: normalizedFlow, parameters });
  }

  /**
   * Register multiple flows
   */
  registerAll(flows: FlowDefinition[]): void {
    for (const flow of flows) {
      this.register(flow);
    }
  }

  /**
   * Get a flow by name
   */
  get(name: string): RegisteredFlow | undefined {
    return this.flows.get(name);
  }

  /**
   * Check if a flow exists
   */
  has(name: string): boolean {
    return this.flows.has(name);
  }

  /**
   * Execute a flow
   */
  async execute(
    name: string,
    args: Record<string, unknown>,
    context: ActionContext,
    executor: ActionExecutor,
    evaluator: ExpressionEvaluator,
    flowContext: FlowExecutionContext = { args: {}, depth: 0 }
  ): Promise<FlowResult> {
    // Check depth
    if (flowContext.depth >= this.options.maxDepth) {
      throw new MaxFlowDepthError(this.options.maxDepth);
    }

    // Get flow
    const flow = this.flows.get(name);
    if (!flow) {
      throw new FlowNotFoundError(name);
    }

    // Validate and apply parameters
    const resolvedArgs = await this.resolveParameters(
      flow.parameters,
      args,
      context,
      evaluator
    );

    // Create flow context
    const flowCtx: FlowExecutionContext = {
      args: resolvedArgs,
      depth: flowContext.depth + 1,
      parentFlow: name,
    };

    // Create action context with flow args
    const actionContext: ActionContext = {
      ...context,
      args: resolvedArgs,
      flowContext: flowCtx,
    } as ActionContext;

    try {
      // Execute actions
      const results = await this.executeActions(
        flow.definition.actions,
        actionContext,
        executor,
        evaluator,
        flowCtx
      );

      // Check for abort
      if (flowCtx.aborted) {
        return {
          success: false,
          aborted: true,
          error: new FlowAbortedError(name, flowCtx.abortReason),
        };
      }

      // Evaluate return value
      let returnValue: unknown;
      if (flow.definition.returns) {
        returnValue = await evaluator.evaluate(flow.definition.returns, {
          ...actionContext,
          results,
        });
      }

      return {
        success: true,
        value: returnValue ?? flowCtx.returnValue,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }

  /**
   * Execute actions with flow control support
   */
  private async executeActions(
    actions: Action[],
    context: ActionContext,
    executor: ActionExecutor,
    evaluator: ExpressionEvaluator,
    flowCtx: FlowExecutionContext
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const action of actions) {
      // Check for abort
      if (flowCtx.aborted || context.signal?.aborted) {
        break;
      }

      // Handle flow control actions
      if (action.action === 'abort') {
        flowCtx.aborted = true;
        flowCtx.abortReason = action.reason
          ? await evaluator.interpolate(action.reason, context)
          : undefined;
        break;
      }

      if (action.action === 'return') {
        if (action.value) {
          flowCtx.returnValue = await evaluator.evaluate(action.value, context);
        }
        break;
      }

      // Handle flow_if
      if (action.action === 'flow_if') {
        const condition = await evaluator.evaluate<boolean>(action.if as string, context);
        const branch = condition
          ? (action.then as Action[])
          : (action.else as Action[] | undefined);

        if (branch) {
          const branchResults = await this.executeActions(
            branch,
            context,
            executor,
            evaluator,
            flowCtx
          );
          results.push(...branchResults);
        }
        continue;
      }

      // Handle flow_switch
      if (action.action === 'flow_switch') {
        const value = await evaluator.evaluate<string>(action.value as string, context);
        const cases = action.cases as Record<string, Action[]>;
        const branch = cases[value] ?? (action.default as Action[] | undefined);

        if (branch) {
          const branchResults = await this.executeActions(
            branch,
            context,
            executor,
            evaluator,
            flowCtx
          );
          results.push(...branchResults);
        }
        continue;
      }

      // Handle flow_while
      if (action.action === 'flow_while') {
        let iterations = 0;
        while (iterations < this.options.maxIterations) {
          const condition = await evaluator.evaluate<boolean>(action.while as string, context);
          if (!condition || flowCtx.aborted) break;

          const loopResults = await this.executeActions(
            action.do as Action[],
            context,
            executor,
            evaluator,
            flowCtx
          );
          results.push(...loopResults);
          iterations++;
        }
        continue;
      }

      // Handle repeat
      if (action.action === 'repeat') {
        const times = action.times as number;
        const varName = action.as ?? 'i';

        for (let i = 0; i < times && !flowCtx.aborted; i++) {
          const loopContext = { ...context, [varName]: i };
          const loopResults = await this.executeActions(
            action.do as Action[],
            loopContext as ActionContext,
            executor,
            evaluator,
            flowCtx
          );
          results.push(...loopResults);
        }
        continue;
      }

      // Handle call_flow
      if (action.action === 'call_flow') {
        const flowName = action.flow as string;
        const flowArgs: Record<string, unknown> = {};

        if (action.args) {
          for (const [key, expr] of Object.entries(action.args as Record<string, string>)) {
            flowArgs[key] = await evaluator.evaluate(expr, context);
          }
        }

        const result = await this.execute(
          flowName,
          flowArgs,
          context,
          executor,
          evaluator,
          flowCtx
        );

        if (action.as && result.value !== undefined) {
          (context as Record<string, unknown>)[action.as as string] = result.value;
        }

        results.push({
          success: result.success,
          data: result.value,
          error: result.error,
        });
        continue;
      }

      // Handle parallel
      if (action.action === 'parallel') {
        const parallelResults = await executor.executeParallel(
          action.actions as Action[],
          context
        );
        results.push(...parallelResults);
        continue;
      }

      // Execute regular action
      const result = await executor.executeOne(action, context);
      results.push(result);
    }

    return results;
  }

  /**
   * Resolve and validate parameters
   */
  private async resolveParameters(
    parameters: Map<string, FlowParameter>,
    args: Record<string, unknown>,
    context: ActionContext,
    evaluator: ExpressionEvaluator
  ): Promise<Record<string, unknown>> {
    const resolved: Record<string, unknown> = {};

    for (const [name, param] of parameters) {
      let value = args[name];

      // Use default if not provided
      if (value === undefined && param.default !== undefined) {
        value = param.default;
      }

      // Check required
      if (value === undefined && param.required) {
        throw new Error(`Missing required parameter: ${name}`);
      }

      // Type check if value provided
      if (value !== undefined && param.type && param.type !== 'any') {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== param.type) {
          throw new Error(
            `Parameter "${name}" expected ${param.type} but got ${actualType}`
          );
        }
      }

      resolved[name] = value;
    }

    return resolved;
  }

  /**
   * Get all registered flow names
   */
  getFlowNames(): string[] {
    return [...this.flows.keys()];
  }

  /**
   * Clear all flows
   */
  clear(): void {
    this.flows.clear();
  }
}

/**
 * Normalize actions from YAML shorthand format to schema format, recursively
 * YAML allows: { reply: { content: "..." } }
 * Schema expects: { action: "reply", content: "..." }
 */
function normalizeActionsDeep(actions: Action[]): Action[] {
  return actions.map((action) => {
    // If action already has 'action' property, it's in schema format
    // But we still need to normalize nested actions
    if ((action as any).action) {
      return normalizeNestedActions(action as any);
    }

    // Convert shorthand to schema format
    for (const [key, value] of Object.entries(action)) {
      if (key === 'when' || key === 'error_handler') continue;

      // Found the action type
      const normalized: any = {
        action: key,
        ...((typeof value === 'object' && value !== null) ? value : {}),
      };

      // Copy over when and error_handler if present
      if ((action as any).when) normalized.when = (action as any).when;
      if ((action as any).error_handler) normalized.error_handler = (action as any).error_handler;

      // Normalize nested actions in control flow structures
      return normalizeNestedActions(normalized);
    }

    return action;
  });
}

/**
 * Normalize nested actions within control flow structures
 */
function normalizeNestedActions(action: any): any {
  const result = { ...action };

  // flow_if - then/else branches
  if (action.then && Array.isArray(action.then)) {
    result.then = normalizeActionsDeep(action.then);
  }
  if (action.else && Array.isArray(action.else)) {
    result.else = normalizeActionsDeep(action.else);
  }

  // flow_switch - cases and default
  if (action.cases && typeof action.cases === 'object') {
    result.cases = {};
    for (const [key, caseActions] of Object.entries(action.cases)) {
      if (Array.isArray(caseActions)) {
        result.cases[key] = normalizeActionsDeep(caseActions as Action[]);
      }
    }
  }
  if (action.default && Array.isArray(action.default)) {
    result.default = normalizeActionsDeep(action.default);
  }

  // flow_while - do actions
  if (action.do && Array.isArray(action.do)) {
    result.do = normalizeActionsDeep(action.do);
  }

  // repeat - actions
  if (action.actions && Array.isArray(action.actions)) {
    result.actions = normalizeActionsDeep(action.actions);
  }

  // parallel - actions
  if (action.action === 'parallel' && action.actions && Array.isArray(action.actions)) {
    result.actions = normalizeActionsDeep(action.actions);
  }

  // batch - action (template for each item)
  if (action.template && Array.isArray(action.template)) {
    result.template = normalizeActionsDeep(action.template);
  }

  // try - try/catch/finally
  if (action.try && Array.isArray(action.try)) {
    result.try = normalizeActionsDeep(action.try);
  }
  if (action.catch && Array.isArray(action.catch)) {
    result.catch = normalizeActionsDeep(action.catch);
  }
  if (action.finally && Array.isArray(action.finally)) {
    result.finally = normalizeActionsDeep(action.finally);
  }

  return result;
}

/**
 * Create a flow engine
 */
export function createFlowEngine(options?: FlowEngineOptions): FlowEngine {
  return new FlowEngine(options);
}
