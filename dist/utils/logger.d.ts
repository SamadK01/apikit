export declare function setDebugMode(enabled: boolean): void;
export declare function estimateAiTokens(text: string): number;
export declare const apiLogger: {
    enable(): void;
    disable(): void;
    logRequest(method: string, url: string, headers?: Record<string, string>, data?: any): void;
    logResponse(method: string, url: string, status: number, durationMs: number, data?: any): void;
    logError(method: string, url: string, message: string, details?: any): void;
};
