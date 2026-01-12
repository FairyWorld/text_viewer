import winston from "winston";

/**
 * 服务端日志工具（仅用于 Node.js Runtime）
 * 客户端日志请直接使用 console
 */

import path from "path";
import fs from "fs";

// 初始化日志路径
let loggerInitialized = false;
let LOG_DIR: string;
let APP_LOG_FILE: string;
let ERROR_LOG_FILE: string;
let DOCKER_LOG_FILE: string;

function initLogPaths() {
  // 使用环境变量或当前工作目录
  // 如果 LOG_DIR 未设置，尝试使用 config 同级目录
  if (!process.env.LOG_DIR) {
    // 检查是否有 config 目录，如果有，使用 config 同级目录的 logs
    const configPath = path.join(process.cwd(), "config");
    if (fs.existsSync(configPath)) {
      LOG_DIR = path.join(process.cwd(), "logs");
    } else {
      LOG_DIR = path.join(process.cwd(), "logs");
    }
  } else {
    LOG_DIR = process.env.LOG_DIR;
  }

  APP_LOG_FILE = path.join(LOG_DIR, "app.log");
  ERROR_LOG_FILE = path.join(LOG_DIR, "error.log");
  DOCKER_LOG_FILE = path.join(LOG_DIR, "docker.log");

  // 确保日志目录存在
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// 日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 控制台格式（更易读）
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// 创建 logger（仅用于 Node.js Runtime）
function createLogger() {
  if (!loggerInitialized) {
    initLogPaths();
    loggerInitialized = true;
  }

  const transports: winston.transport[] = [
    // 错误日志文件（只记录 error 级别）
    new winston.transports.File({
      filename: ERROR_LOG_FILE,
      level: "error",
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // 应用日志文件（记录所有级别）
    new winston.transports.File({
      filename: APP_LOG_FILE,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ];

  return winston.createLogger({
    level:
      process.env.LOG_LEVEL ||
      (process.env.NODE_ENV === "production" ? "info" : "debug"),
    format: logFormat,
    defaultMeta: { service: "log-viewer" },
    transports,
  });
}

export const logger = createLogger();

// 开发环境添加控制台输出
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Docker 启动日志（仅用于 Node.js Runtime）
function createDockerLogger() {
  if (!loggerInitialized) {
    initLogPaths();
    loggerInitialized = true;
  }

  const transports: winston.transport[] = [
    new winston.transports.File({
      filename: DOCKER_LOG_FILE,
      maxsize: 10485760, // 10MB
      maxFiles: 3,
    }),
  ];

  // 开发环境添加控制台输出
  if (process.env.NODE_ENV !== "production") {
    transports.push(
      new winston.transports.Console({
        format: consoleFormat,
      })
    );
  }

  return winston.createLogger({
    level: "info",
    format: logFormat,
    defaultMeta: { service: "docker" },
    transports,
  });
}

export const dockerLogger = createDockerLogger();

// 记录 Docker 启动信息
export function logDockerStart() {
  dockerLogger.info("Docker container starting...", {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT || 3100,
    filesDirectory: process.env.FILES_DIRECTORY,
    enableLocalFS: process.env.ENABLE_LOCAL_FS,
    authEnabled: process.env.AUTH_ENABLED !== "false",
    timestamp: new Date().toISOString(),
  });
}

// 记录 Docker 启动完成
export function logDockerReady() {
  dockerLogger.info("Docker container ready", {
    timestamp: new Date().toISOString(),
  });
}

// 导出便捷方法
export const log = {
  error: (message: string, meta?: Record<string, unknown>) =>
    logger.error(message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    logger.warn(message, meta),
  info: (message: string, meta?: Record<string, unknown>) =>
    logger.info(message, meta),
  debug: (message: string, meta?: Record<string, unknown>) =>
    logger.debug(message, meta),
};
