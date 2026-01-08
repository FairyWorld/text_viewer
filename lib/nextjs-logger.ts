/**
 * 服务端日志记录
 * - Middleware：直接使用 console → 容器标准输出（不加载 logger）
 * - Node.js Runtime（API 路由）：使用 winston → 保存到文件
 */

// 延迟导入 logger（只在 Node.js Runtime 中使用）
let _logger: any = null;

function getLogger() {
  if (_logger !== null) return _logger;
  
  // 检查是否在 Edge Runtime 环境（middleware）
  // Edge Runtime 不支持 require 和 process.cwd
  const isEdgeRuntime = 
    typeof process === 'undefined' || 
    typeof require === 'undefined' ||
    typeof process.cwd !== 'function';
  
  if (isEdgeRuntime) {
    // Middleware（Edge Runtime）：直接返回 null，只使用 console
    // 不尝试加载 logger，避免导入 Node.js 模块
    _logger = null;
    return null;
  }
  
  // Node.js Runtime：动态加载 winston logger
  // 使用动态 require 避免在 Edge Runtime 中静态分析
  try {
    // 动态 require，避免 Next.js 静态分析检测
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loggerModule = (function() {
      // 这个函数只在 Node.js Runtime 中执行
      return require('./logger');
    })();
    _logger = loggerModule.logger;
    return _logger;
  } catch {
    // 导入失败，使用 console
    _logger = null;
    return null;
  }
}

/**
 * Next.js 日志中间件
 * 记录 Next.js 的请求和响应
 */
export function logRequest(method: string, path: string, statusCode?: number, duration?: number) {
  const meta: any = {
    method,
    path,
  };

  if (statusCode) {
    meta.statusCode = statusCode;
  }

  if (duration !== undefined) {
    meta.duration = `${duration}ms`;
  }

  const logger = getLogger();
  if (logger) {
    // Node.js Runtime：使用 winston 保存到文件
    if (statusCode && statusCode >= 400) {
      logger.warn(`HTTP ${method} ${path}`, meta);
    } else {
      logger.info(`HTTP ${method} ${path}`, meta);
    }
  } else {
    // Edge Runtime：使用 console 输出到容器标准输出
    const level = statusCode && statusCode >= 400 ? 'warn' : 'info';
    console[level](`[HTTP ${method}] ${path}`, meta);
  }
}

/**
 * 记录 Next.js 错误
 */
export function logError(error: Error, context?: any) {
  const logger = getLogger();
  if (logger) {
    // Node.js Runtime：使用 winston 保存到文件
    logger.error('Next.js Error', {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  } else {
    // Edge Runtime：使用 console 输出到容器标准输出
    console.error('[Next.js Error]', error.message, { stack: error.stack, ...context });
  }
}

/**
 * 记录 API 请求
 */
export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  ip?: string
) {
  const meta: any = {
    method,
    path,
    statusCode,
    duration: `${duration}ms`,
  };

  if (ip) {
    meta.ip = ip;
  }

  const logger = getLogger();
  if (logger) {
    // Node.js Runtime：使用 winston 保存到文件
    if (statusCode >= 500) {
      logger.error(`API ${method} ${path}`, meta);
    } else if (statusCode >= 400) {
      logger.warn(`API ${method} ${path}`, meta);
    } else {
      logger.info(`API ${method} ${path}`, meta);
    }
  } else {
    // Edge Runtime：使用 console 输出到容器标准输出
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    console[level](`[API ${method}] ${path}`, meta);
  }
}
