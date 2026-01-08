import { Mode } from "../types";

interface ModeSelectorProps {
  mode: Mode;
  onModeChange: (newMode: Mode) => void;
  serverModeAvailable: boolean;
}

/**
 * 模式选择器组件
 * 提供三个模式切换按钮：FSA、传统、服务端
 */
export function ModeSelector({
  mode,
  onModeChange,
  serverModeAvailable,
}: ModeSelectorProps) {
  const handleModeChange = (newMode: Mode) => {
    if (mode === newMode) return;
    onModeChange(newMode);
  };

  return (
    <div className="mb-4">
      <h1 className="text-xl font-bold mb-3">文件列表</h1>
      <div className="flex gap-2">
        {/* FSA 模式按钮 */}
        <button
          onClick={() => handleModeChange("fsa")}
          className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
            mode === "fsa"
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
          title="File System Access API 模式（需要浏览器支持）"
        >
          FSA
        </button>

        {/* 传统模式按钮 */}
        <button
          onClick={() => handleModeChange("traditional")}
          className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
            mode === "traditional"
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
          title="传统模式（使用文件选择器）"
        >
          传统
        </button>

        {/* 服务端模式按钮 */}
        <button
          onClick={() => handleModeChange("server")}
          className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
            mode === "server"
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : serverModeAvailable
              ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
              : "bg-gray-700 text-gray-500 hover:bg-gray-600 opacity-50 cursor-not-allowed"
          }`}
          disabled={!serverModeAvailable}
          title={
            serverModeAvailable
              ? "服务端模式（Node.js，自动加载文件）"
              : "服务端模式不可用（请检查环境变量 ENABLE_LOCAL_FS）"
          }
        >
          服务端
        </button>
      </div>
      {!serverModeAvailable && (
        <div className="mt-2 text-xs text-yellow-400">
          服务端模式不可用
        </div>
      )}
    </div>
  );
}
