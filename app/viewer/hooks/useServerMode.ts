import { useState, useEffect } from "react";

interface ServerModeStatus {
  available: boolean;
  checking: boolean;
  environment?: string;
  hostname?: string;
  reason?: string;
  details?: {
    available?: boolean;
    confidence?: string;
    environment?: string;
    hostname?: string;
    enableLocalFS?: string;
    message?: string;
    reasons?: string[];
    requestReasons?: string[];
  };
}

/**
 * 检测服务端模式是否可用
 */
export function useServerMode(): ServerModeStatus {
  const [status, setStatus] = useState<ServerModeStatus>({
    available: false,
    checking: true,
  });

  useEffect(() => {
    const checkAvailability = async () => {
      try {
        console.log("[客户端] 开始检测服务端模式状态...");
        const response = await fetch("/api/files/status");
        const data = await response.json();

        console.log("[客户端] 服务端模式状态:", {
          available: data.available,
          confidence: data.confidence,
          environment: data.environment,
          hostname: data.hostname,
          enableLocalFS: data.enableLocalFS,
          message: data.message,
        });

        if (data.reasons && data.reasons.length > 0) {
          console.log("[客户端] 检测原因:");
          data.reasons.forEach((reason: string, i: number) => {
            console.log(`  ${i + 1}. ${reason}`);
          });
        }

        if (
          data.requestReasons &&
          data.requestReasons.length > data.reasons.length
        ) {
          console.log("[客户端] 请求检测原因:");
          data.requestReasons
            .slice(data.reasons.length)
            .forEach((reason: string) => {
              console.log(`  - ${reason}`);
            });
        }

        setStatus({
          available: data.available === true,
          checking: false,
          environment: data.environment,
          hostname: data.hostname,
          reason: data.message,
          details: data,
        });

        if (data.available) {
          console.log("[客户端] ✅ 服务端模式可用");
        } else {
          console.log("[客户端] ❌ 服务端模式不可用:", data.message);
          console.log(
            "[客户端] 💡 提示: 请检查 .env.local 文件，设置 ENABLE_LOCAL_FS=true"
          );
        }
      } catch (error) {
        console.error("[客户端] ❌ 检测服务端模式状态失败:", error);
        setStatus({
          available: false,
          checking: false,
          reason: "Failed to check server mode status",
        });
      }
    };

    checkAvailability();
  }, []);

  return status;
}
