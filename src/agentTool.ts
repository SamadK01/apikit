import { apiClient } from './plainApiClient';
import { AgentToolOptions, AgentToolResult, AgentToolTelemetry, ApiClientInstance, ApiError, ApiRequestConfig } from './types';

type ToolClient = Pick<ApiClientInstance, 'post'>;

function header(raw: any, name: string): string | undefined {
  if (!raw) return undefined;
  if (typeof raw.headers?.get === 'function') return raw.headers.get(name) || undefined;
  const headers = raw.headers || {};
  return headers[name] || headers[name.toLowerCase()];
}

function telemetryFrom(raw: any): AgentToolTelemetry {
  const numberHeader = (name: string) => {
    const value = header(raw, name);
    const parsed = value === undefined ? NaN : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  return {
    inputTokens: numberHeader('x-usage-input-tokens') ?? numberHeader('x-openai-prompt-tokens'),
    outputTokens: numberHeader('x-usage-output-tokens') ?? numberHeader('x-openai-completion-tokens'),
    totalTokens: numberHeader('x-usage-total-tokens') ?? numberHeader('x-openai-total-tokens'),
    requestId: header(raw, 'x-request-id') || header(raw, 'request-id'),
    provider: header(raw, 'x-ai-provider'),
  };
}

function schemaJson<T>(schema: AgentToolOptions<T>['schema']): Record<string, unknown> {
  if (typeof schema.toJSONSchema === 'function') return schema.toJSONSchema();
  return schema.jsonSchema || { type: 'object', additionalProperties: false };
}

function extractArguments(response: any): unknown {
  const toolCall = response?.tool_call || response?.toolCall || response?.tool_calls?.[0] || response?.choices?.[0]?.message?.tool_calls?.[0];
  return toolCall?.function?.arguments ?? toolCall?.arguments ?? response?.arguments ?? response?.data?.arguments ?? response?.data;
}

function validate<T>(schema: AgentToolOptions<T>['schema'], value: unknown): { data?: T; error?: unknown } {
  let parsed = value;
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value); } catch { return { error: 'Tool arguments are not valid JSON.' }; }
  }
  if (typeof schema.safeParse === 'function') {
    const result = schema.safeParse(parsed);
    return result.success ? { data: result.data } : { error: result.error };
  }
  if (typeof schema.parse === 'function') {
    try { return { data: schema.parse(parsed) }; } catch (error) { return { error }; }
  }
  return { error: 'Agent tool requires a schema with parse or safeParse.' };
}

/** Executes a normalized LLM function-call request and validates its arguments. */
export async function executeAgentTool<TArgs>(
  options: AgentToolOptions<TArgs>,
  input: unknown,
  config: Partial<ApiRequestConfig> = {},
  client: ToolClient = apiClient,
): Promise<AgentToolResult<TArgs>> {
  const maxAttempts = Math.max(0, options.maxCorrectionAttempts ?? 1) + 1;
  let correction: { invalidArguments: unknown; validationError: unknown } | undefined;
  let lastRaw: unknown;
  let lastTelemetry: AgentToolTelemetry = {};

  for (let attempts = 1; attempts <= maxAttempts; attempts += 1) {
    const payload = {
      input,
      tool: { type: 'function', function: { name: options.name, description: options.description, parameters: schemaJson(options.schema), strict: true } },
      ...(correction ? { correction: { tool_name: options.name, invalid_arguments: correction.invalidArguments, validation_error: String(correction.validationError), instruction: 'Return only valid JSON arguments matching the tool schema.' } } : {}),
    };
    const response = await client.post<any>(options.endpoint, payload, { ...config, headers: { ...options.headers, ...config.headers } });
    lastRaw = response.raw;
    lastTelemetry = telemetryFrom(response.raw);
    if (response.error) return { data: null, error: response.error, telemetry: lastTelemetry, attempts, raw: response.raw };
    const argumentsValue = extractArguments(response.data);
    const validation = validate(options.schema, argumentsValue);
    if (validation.data !== undefined) return { data: validation.data, error: null, telemetry: lastTelemetry, attempts, raw: response.raw };
    correction = { invalidArguments: argumentsValue, validationError: validation.error };
  }

  return {
    data: null,
    error: { message: 'Agent tool returned invalid arguments after correction attempts.', details: correction?.validationError },
    telemetry: lastTelemetry,
    attempts: maxAttempts,
    raw: lastRaw,
  };
}
