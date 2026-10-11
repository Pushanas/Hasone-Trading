// backend/src/utils/logger.ts
// Structured logging service for Hasone Trading Backend

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
}

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const ts = new Date().toISOString();
    const dataStr = data !== undefined ? ` | ${JSON.stringify(data)}` : '';
    return `[${ts}] [${level}] [${this.context}] ${message}${dataStr}`;
  }

  public debug(message: string, data?: any): void {
    if (process.env.DEBUG || process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('DEBUG', message, data));
    }
  }

  public info(message: string, data?: any): void {
    console.log(this.formatMessage('INFO', message, data));
  }

  public warn(message: string, data?: any): void {
    console.warn(this.formatMessage('WARN', message, data));
  }

  public error(message: string, error?: any): void {
    const errorDetails = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;
    console.error(this.formatMessage('ERROR', message, errorDetails));
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}

export default Logger;
