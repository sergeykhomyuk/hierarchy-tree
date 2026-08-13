export type Configuration = Readonly<{
  apiBaseUrl: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  observabilitySink: 'console' | 'buffer' | 'none';
  requestTimeoutMilliseconds: number;
  telemetryBufferHandle: boolean;
  developmentRoutes: boolean;
  basePath: string;
}>;
