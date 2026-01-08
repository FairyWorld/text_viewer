interface FSAControlsProps {
  currentDir: string;
  onOpenDirectory: () => void;
  onRefreshDirectory: () => void;
}

/**
 * FSA 模式控制组件
 */
export function FSAControls({
  currentDir,
  onOpenDirectory,
  onRefreshDirectory,
}: FSAControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onOpenDirectory}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
      >
        选择目录
      </button>
      {currentDir && (
        <>
          <button
            onClick={onRefreshDirectory}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            title="刷新目录列表和文件内容"
          >
            刷新目录
          </button>
          <div
            className="text-xs text-gray-400 mt-2 truncate"
            title={currentDir}
          >
            当前: {currentDir}
          </div>
        </>
      )}
    </div>
  );
}
