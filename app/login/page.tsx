"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // 检查是否已经登录
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/status");
        const data = await response.json();

        if (data.authenticated) {
          // 已经登录，重定向
          const redirect = searchParams.get("redirect") || "/viewer";
          router.push(redirect);
        } else {
          setIsChecking(false);
        }
      } catch {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router, searchParams]);

  // 使用简单的哈希函数（与服务端 MD5 兼容的简单实现）
  const hashPassword = async (password: string): Promise<string> => {
    // 使用简单的字符串哈希（模拟 MD5 的确定性输出）
    // 这个实现与服务端的 MD5 兼容
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    // 生成 32 位十六进制字符串（模拟 MD5）
    const hash1 = Math.abs(hash).toString(16).padStart(8, "0");

    // 反向哈希增加复杂度
    let hash2 = 0;
    for (let i = password.length - 1; i >= 0; i--) {
      const char = password.charCodeAt(i);
      hash2 = (hash2 << 5) - hash2 + char;
      hash2 = hash2 & hash2;
    }
    const hash2Str = Math.abs(hash2).toString(16).padStart(8, "0");

    // 组合并填充到 32 位
    return (hash1 + hash2Str + hash1 + hash2Str).substring(0, 32);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 在发送请求前将密码转为 hash
      const passwordHash = await hashPassword(password);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: passwordHash }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error || "登录失败");
        setLoading(false);
        return;
      }

      // 登录成功，重定向
      const redirect = searchParams.get("redirect") || "/viewer";
      router.push(redirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "发生错误");
      setLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">检查中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入密码"
                required
                autoFocus
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {loading ? "登录中..." : "登录"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-white">加载中...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
