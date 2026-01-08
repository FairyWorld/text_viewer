interface ServerControlsProps {
  serverDirectory: string;
  onServerDirectoryChange: (dir: string) => void;
  onLoadFiles: (directory?: string) => void;
  isLoading: boolean;
  currentDir: string;
  checkingServerMode: boolean;
  serverModeAvailable: boolean;
  serverModeDetails?: {
    message?: string;
    confidence?: string;
  };
}

/**
 * 服务端模式控制组件
 * 在 Docker 环境下，目录固定为环境变量配置的根目录，隐藏目录输入功能
 */
export function ServerControls({
  serverDirectory: _serverDirectory,
  onServerDirectoryChange: _onServerDirectoryChange,
  onLoadFiles,
  isLoading,
  currentDir,
  checkingServerMode: _checkingServerMode,
  serverModeAvailable: _serverModeAvailable,
  serverModeDetails: _serverModeDetails,
}: ServerControlsProps) {
  // 未使用的参数（保留在接口中以便未来扩展）
  void _serverDirectory;
  void _onServerDirectoryChange;
  void _checkingServerMode;
  void _serverModeAvailable;
  void _serverModeDetails;
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => onLoadFiles()}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800"
        disabled={isLoading}
        title="刷新当前目录"
      >
        {isLoading ? "刷新中..." : "刷新"}
      </button>
      {currentDir && (
        <div
          className="text-xs text-gray-400 mt-1 truncate"
          title={currentDir}
        >
          当前目录: {currentDir}
        </div>
      )}
      {/* {checkingServerMode ? (
        <div className="text-xs text-gray-500">检查服务端模式...</div>
      ) : !serverModeAvailable ? (
        <div className="text-xs text-yellow-400 space-y-1">
          <div>服务端模式不可用</div>
          <div className="text-gray-500">
            {serverModeDetails?.message || "请检查环境变量 ENABLE_LOCAL_FS"}
          </div>
          <div className="text-gray-600 text-[10px] mt-1">
            提示: 查看浏览器控制台和服务器日志获取详细信息
          </div>
        </div>
      ) : (
        <div className="text-xs text-green-400">
          ✅ 服务端模式可用 (可信度:{" "}
          {serverModeDetails?.confidence || "unknown"})
        </div>
      )} */}
    </div>
  );
}
