import { useCallback, useEffect, useRef, useState } from 'react';
import { executeAgentTool } from '../agentTool';
import { AgentToolOptions, AgentToolResult, ApiRequestConfig, UseAgentToolReturn } from '../types';

export function useAgentTool<TArgs>(options: AgentToolOptions<TArgs>): UseAgentToolReturn<TArgs> {
  const [data, setData] = useState<TArgs | null>(null);
  const [error, setError] = useState<AgentToolResult<TArgs>['error']>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [telemetry, setTelemetry] = useState<UseAgentToolReturn<TArgs>['telemetry']>(null);
  const mounted = useRef(true);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  useEffect(() => () => { mounted.current = false; }, []);

  const execute = useCallback(async (input: unknown, config?: Partial<ApiRequestConfig>) => {
    if (mounted.current) { setIsExecuting(true); setError(null); }
    const result = await executeAgentTool(optionsRef.current, input, config);
    if (mounted.current) { setData(result.data); setError(result.error); setTelemetry(result.telemetry); setIsExecuting(false); }
    return result;
  }, []);
  const reset = useCallback(() => { if (mounted.current) { setData(null); setError(null); setTelemetry(null); setIsExecuting(false); } }, []);
  return { data, error, isExecuting, telemetry, execute, reset };
}
