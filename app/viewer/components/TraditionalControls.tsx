interface TraditionalControlsProps {
  onOpenFiles: () => void;
  onOpenFolder: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  folderInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFolderSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * 传统模式控制组件
 */
export function TraditionalControls({
  onOpenFiles,
  onOpenFolder,
  fileInputRef,
  folderInputRef,
  onFileSelect,
  onFolderSelect,
}: TraditionalControlsProps) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <button
          onClick={onOpenFiles}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
        >
          选择文件
        </button>
        <button
          onClick={onOpenFolder}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800"
        >
          选择文件夹
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt"
        onChange={onFileSelect}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        onChange={onFolderSelect}
        {...({
          webkitdirectory: "",
          directory: "",
        } as React.InputHTMLAttributes<HTMLInputElement>)}
        className="hidden"
      />
    </>
  );
}
