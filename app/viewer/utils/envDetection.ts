import { hostname, networkInterfaces } from "os";

/**
 * 检测服务器环境是否可能是本地环境
 */
export function detectLocalEnvironment(): {
  isLikelyLocal: boolean;
  confidence: "high" | "medium" | "low";
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0;

  // 服务器启动时输出环境变量信息
  // if (typeof process !== "undefined" && process.env) {
  //   console.log("\n[环境检测] 开始检测服务端模式环境...");
  //   console.log(`[环境检测] NODE_ENV: ${process.env.NODE_ENV || "(未设置)"}`);
  //   console.log(
  //     `[环境检测] ENABLE_LOCAL_FS: ${process.env.ENABLE_LOCAL_FS || "(未设置)"}`
  //   );
  //   console.log(
  //     `[环境检测] FILES_DIRECTORY: ${
  //       process.env.FILES_DIRECTORY || "./files (默认)"
  //     }`
  //   );
  // }

  // 1. 环境变量（最可靠）✅
  // 支持多种格式：'true', '1', 'yes', 'on' 都视为启用
  const enableLocalFS = process.env.ENABLE_LOCAL_FS?.toLowerCase();
  const explicitEnabled =
    enableLocalFS === "true" ||
    enableLocalFS === "1" ||
    enableLocalFS === "yes" ||
    enableLocalFS === "on";
  const explicitDisabled =
    enableLocalFS === "false" ||
    enableLocalFS === "0" ||
    enableLocalFS === "no" ||
    enableLocalFS === "off";
  const isDev = process.env.NODE_ENV === "development";

  if (explicitEnabled) {
    score += 10;
    reasons.push(
      `Explicitly enabled by ENABLE_LOCAL_FS=${process.env.ENABLE_LOCAL_FS}`
    );
  }
  if (explicitDisabled) {
    score = 0;
    reasons.push(
      `Explicitly disabled by ENABLE_LOCAL_FS=${process.env.ENABLE_LOCAL_FS}`
    );
    return { isLikelyLocal: false, confidence: "high", reasons };
  }

  if (isDev) {
    score += 3;
    reasons.push("Running in development mode");
  } else {
    score -= 5; // 生产环境默认不信任
    reasons.push("Running in production mode (default: disabled)");
  }

  // 2. 主机名检测（中等可靠）⚠️
  const host = hostname();
  if (host === "localhost" || host === "127.0.0.1") {
    score += 5;
    reasons.push(`Hostname is ${host}`);
  } else if (host.includes("local") || host.includes("DESKTOP-")) {
    score += 2;
    reasons.push(`Hostname suggests local: ${host}`);
  } else {
    // 主机名不是 localhost 时，不减分（可能是用户名或机器名）
    // 开发环境下，如果请求来自 localhost，应该允许
    reasons.push(`Hostname is ${host} (may be username/machine name)`);
  }

  // 3. 网络接口检测（中等可靠）⚠️
  const interfaces = networkInterfaces();
  const has127 = Object.values(interfaces || {}).some((net) =>
    net?.some((addr) => addr.address === "127.0.0.1")
  );
  if (has127) {
    score += 3;
    reasons.push("Has loopback interface (127.0.0.1)");
  }

  // 综合判断
  const isLikelyLocal = score >= 5;
  let confidence: "high" | "medium" | "low" = "low";

  if (explicitEnabled || explicitDisabled) {
    confidence = "high";
  } else if (isDev && host === "localhost") {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  // 输出检测结果
  // if (typeof process !== "undefined" && process.env) {
  //   console.log(`[环境检测] 评分: ${score}`);
  //   console.log(
  //     `[环境检测] 判断结果: ${
  //       isLikelyLocal ? "✅ 可能是本地环境" : "❌ 可能不是本地环境"
  //     }`
  //   );
  //   console.log(`[环境检测] 可信度: ${confidence}`);
  //   console.log(`[环境检测] 原因: ${reasons.join("; ")}`);
  // }

  return { isLikelyLocal, confidence, reasons };
}

/**
 * 检测请求是否来自本地（通过 HTTP 头）
 */
export function isLocalRequest(request: Request): {
  isLocal: boolean;
  confidence: "high" | "medium" | "low";
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 0;

  const host = request.headers.get("host") || "";
  const origin = request.headers.get("origin") || "";
  const referer = request.headers.get("referer") || "";

  // Host header 检测（最可靠的指标）
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    score += 10; // 增加权重，localhost 是最可靠的指标
    reasons.push(`Host header is localhost: ${host}`);
  } else if (host.match(/^192\.168\.\d+\.\d+/)) {
    score += 3;
    reasons.push(`Host is private IP: ${host}`);
  } else if (
    host.match(/^10\.\d+\.\d+\.\d+/) ||
    host.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+/)
  ) {
    score += 2;
    reasons.push(`Host is private IP range: ${host}`);
  } else if (host) {
    score -= 1; // 减小惩罚，因为可能是内网 IP 或域名
    reasons.push(`Host header: ${host}`);
  }

  // Origin header 检测
  if (
    origin &&
    (origin.includes("localhost") || origin.includes("127.0.0.1"))
  ) {
    score += 5;
    reasons.push(`Origin header is localhost: ${origin}`);
  } else if (origin) {
    reasons.push(`Origin header: ${origin}`);
  }

  // Referer header 检测
  if (
    referer &&
    (referer.includes("localhost") || referer.includes("127.0.0.1"))
  ) {
    score += 2;
    reasons.push(`Referer is localhost: ${referer.substring(0, 50)}...`);
  }

  // localhost 请求优先判断
  const isLocalhost =
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    (origin && (origin.includes("localhost") || origin.includes("127.0.0.1")));

  const isLocal = isLocalhost || score >= 5;
  const confidence =
    host.includes("localhost") || host.includes("127.0.0.1")
      ? "high"
      : origin && (origin.includes("localhost") || origin.includes("127.0.0.1"))
      ? "high"
      : score >= 5
      ? "medium"
      : "low";

  return { isLocal, confidence, reasons };
}

/**
 * 综合判断：是否允许访问本地文件系统
 */
export function canAccessLocalFS(request?: Request): {
  allowed: boolean;
  confidence: "high" | "medium" | "low";
  reasons: string[];
} {
  const envCheck = detectLocalEnvironment();
  const isDev = process.env.NODE_ENV === "development";

  // 优先级1: 明确配置（最高优先级）
  // 检查 ENABLE_LOCAL_FS 环境变量（支持多种格式：'true', '1', 'yes', 'on'）
  const enableLocalFS = process.env.ENABLE_LOCAL_FS?.toLowerCase();
  const isExplicitlyEnabled =
    enableLocalFS === "true" ||
    enableLocalFS === "1" ||
    enableLocalFS === "yes" ||
    enableLocalFS === "on";
  const isExplicitlyDisabled =
    enableLocalFS === "false" ||
    enableLocalFS === "0" ||
    enableLocalFS === "no" ||
    enableLocalFS === "off";

  if (isExplicitlyEnabled) {
    const result = {
      allowed: true,
      confidence: "high" as const,
      reasons: [
        `Explicitly enabled by ENABLE_LOCAL_FS=${process.env.ENABLE_LOCAL_FS}`,
        ...envCheck.reasons,
      ],
    };
    if (typeof process !== "undefined" && process.env) {
      console.log(
        `[访问控制] ✅ 允许访问: 显式启用 (ENABLE_LOCAL_FS=${process.env.ENABLE_LOCAL_FS})`
      );
    }
    return result;
  }

  if (isExplicitlyDisabled) {
    const result = {
      allowed: false,
      confidence: "high" as const,
      reasons: [
        `Explicitly disabled by ENABLE_LOCAL_FS=${process.env.ENABLE_LOCAL_FS}`,
        ...envCheck.reasons,
      ],
    };
    if (typeof process !== "undefined" && process.env) {
      console.log(
        `[访问控制] ❌ 拒绝访问: 显式禁用 (ENABLE_LOCAL_FS=${process.env.ENABLE_LOCAL_FS})`
      );
    }
    return result;
  }

  // 优先级2: 开发环境 + localhost 请求来源
  if (request && isDev) {
    const reqCheck = isLocalRequest(request);

    // 如果请求来自 localhost，即使环境检测分数较低，也允许（开发环境）
    if (
      reqCheck.isLocal &&
      (reqCheck.confidence === "high" || reqCheck.confidence === "medium")
    ) {
      const result = {
        allowed: true,
        confidence:
          reqCheck.confidence === "high"
            ? ("high" as const)
            : ("medium" as const),
        reasons: [
          `Development mode + localhost request (${reqCheck.confidence} confidence)`,
          ...envCheck.reasons,
          ...reqCheck.reasons,
        ],
      };
      if (typeof process !== "undefined" && process.env) {
        console.log(
          `[访问控制] ✅ 允许访问: 开发环境 + localhost 请求 (可信度 ${result.confidence})`
        );
      }
      return result;
    }
  }

  // 优先级3: 环境检测
  if (envCheck.isLikelyLocal) {
    const result = {
      allowed: true,
      confidence: envCheck.confidence,
      reasons: envCheck.reasons,
    };
    // if (typeof process !== "undefined" && process.env) {
    //   console.log(
    //     `[访问控制] ✅ 允许访问: 环境检测通过 (可信度 ${result.confidence})`
    //   );
    // }
    return result;
  }

  // 默认拒绝
  const result = {
    allowed: false,
    confidence: "medium" as const,
    reasons: [
      ...envCheck.reasons,
      ...(request ? isLocalRequest(request).reasons : []),
      "Environment check failed or request not from localhost",
    ],
  };
  // if (typeof process !== "undefined" && process.env) {
  //   console.log(`[访问控制] ❌ 拒绝访问: 环境检测未通过且请求来源不确定`);
  // }
  return result;
}
