import type { LogLevel } from './logLevel';
import type { ObservabilitySink } from './observabilitySink';

export type Configuration = Readonly<{
  apiBaseUrl: string;
  logLevel: LogLevel;
  observabilitySink: ObservabilitySink;
  requestTimeoutMilliseconds: number;
  telemetryBufferHandle: boolean;
  developmentRoutes: boolean;
  basePath: string;
}>;
