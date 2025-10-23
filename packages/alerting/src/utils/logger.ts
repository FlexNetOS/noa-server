/**
 * Logging utility for alerting system
 */

import winston from 'winston';

export function createLogger(module: string): winston.Logger {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: 'alerting', module },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, module, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `${timestamp} [${module}] ${level}: ${message} ${metaStr}`;
          })
        ),
      }),
      new winston.transports.File({
        filename: 'logs/alerting-error.log',
        level: 'error',
      }),
      new winston.transports.File({
        filename: 'logs/alerting.log',
      }),
    ],
  });
}
