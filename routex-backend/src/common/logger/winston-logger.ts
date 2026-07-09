import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const customLevels = {
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
  },
  colors: {
    fatal: 'red',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
  },
};

winston.addColors(customLevels.colors);

export const winstonLoggerOptions: winston.LoggerOptions = {
  levels: customLevels.levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production'
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize({ all: true }),
              winston.format.printf(
                ({ timestamp, level, message, context, ...meta }) => {
                  const metaString = Object.keys(meta).length
                    ? JSON.stringify(meta)
                    : '';
                  const contextStr =
                    typeof context === 'string'
                      ? context
                      : context
                        ? JSON.stringify(context)
                        : '';
                  return `[RouteX] ${timestamp} [${level}] ${contextStr ? `[${contextStr}] ` : ''}${message} ${metaString}`;
                },
              ),
            ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      level: 'info',
      maxsize: 20971520, // 20MB
      maxFiles: 5,
    }),
  ],
};

export const AppLogger = WinstonModule.createLogger(winstonLoggerOptions);
