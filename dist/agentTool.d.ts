import { AgentToolOptions, AgentToolResult, ApiClientInstance, ApiRequestConfig } from './types';
type ToolClient = Pick<ApiClientInstance, 'post'>;
/** Executes a normalized LLM function-call request and validates its arguments. */
export declare function executeAgentTool<TArgs>(options: AgentToolOptions<TArgs>, input: unknown, config?: Partial<ApiRequestConfig>, client?: ToolClient): Promise<AgentToolResult<TArgs>>;
export {};
