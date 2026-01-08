"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { FileItem, TreeNode, Mode } from "./types";
import { flattenTree } from "./utils/fileTree";
// 这些函数已移至 hooks，不再需要直接导入
// import {
//   collectTxtFiles,
//   loadFileContent,
//   // isTextFile,
// } from "./utils/fileSystem";
import { FileTree } from "./components/FileTree";
import { FilePreview } from "./components/FilePreview";
import { ModeSelector } from "./components/ModeSelector";
import { FSAControls } from "./components/FSAControls";
import { ServerControls } from "./components/ServerControls";
import { TraditionalControls } from "./components/TraditionalControls";
import { useServerMode } from "./hooks/useServerMode";
import { useModeManager } from "./hooks/useModeManager";
import { useFileWatcher } from "./hooks/useFileWatcher";
import { useFSAMode } from "./hooks/useFSAMode";
import { useServerModeFileOperations } from "./hooks/useServerModeFileOperations";
import { useTraditionalMode } from "./hooks/useTraditionalMode";
import { Toaster } from "./components/Toaster";
import { logout } from "./utils/authCheck";

export default function TxtViewer() {
  // toast 已移至各个 hooks 中使用，这里不再需要
  // const { toast } = useToast();
  const {
    available: serverModeAvailable,
    checking: checkingServerMode,
    details: serverModeDetails,
  } = useServerMode();
  const { mode, setMode, serverDirectory, setServerDirectory, isMounted } =
    useModeManager();

  // 输出服务端模式状态到控制台
  useEffect(() => {
    if (!checkingServerMode) {
      console.log("[页面] 服务端模式状态:", {
        available: serverModeAvailable,
        mode: mode,
        details: serverModeDetails,
      });
      if (serverModeAvailable) {
        console.log("[页面] ✅ 服务端模式可用，切换按钮已显示");
      } else {
        console.log("[页面] ❌ 服务端模式不可用，切换按钮已隐藏");
        console.log("[页面] 💡 要启用服务端模式:");
        console.log("  1. 创建 .env.local 文件（如果不存在）");
        console.log("  2. 设置 ENABLE_LOCAL_FS=true");
        console.log("  3. 重启开发服务器 (pnpm dev)");
      }
    }
  }, [checkingServerMode, serverModeAvailable, mode, serverModeDetails]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [fileTree, setFileTree] = useState<TreeNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [currentDir, setCurrentDir] = useState<string>("");
  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const fileListRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(256); // 默认 256px (w-64)
  const isResizingRef = useRef(false);

  // 处理分割线拖动
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = e.clientX;
      // 限制最小和最大宽度
      if (newWidth >= 200 && newWidth <= window.innerWidth - 200) {
        setLeftPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

  // 文件监听 Hook 的 ref（用于服务端模式）
  const fileWatcherRef = useRef<{
    startFileWatch: (filePath: string) => void;
    startDirectoryWatch: (directory: string) => void;
  } | null>(null);

  // 服务端模式文件操作 Hook
  const serverModeOps = useServerModeFileOperations({
    setIsLoading,
    setIsLoadingFile,
    setFiles,
    setFileTree,
    setSelectedFile,
    setSelectedIndex,
    setCurrentDir,
    serverDirectory,
    setServerDirectory,
    isMounted,
    currentDir,
    fileWatcherRef,
  });

  // 文件监听 Hook
  const fileWatcher = useFileWatcher({
    mode,
    selectedFile,
    setSelectedFile,
    setFiles,
    setFileTree,
    setSelectedIndex,
    handleFileSelectServer: serverModeOps.handleFileSelectServer,
  });

  // 更新 fileWatcherRef
  fileWatcherRef.current = fileWatcher;

  // 模式切换处理函数
  const handleModeChange = useCallback(
    (newMode: Mode) => {
      if (mode === newMode) return;

      // 清理监听器
      fileWatcher.cleanup();

      // 重置状态
      setFiles([]);
      setFileTree(null);
      setSelectedFile(null);
      setSelectedIndex(-1);
      setCurrentDir("");
      dirHandleRef.current = null;

      // 切换模式
      setMode(newMode);

      // 如果是服务端模式，自动加载文件（使用默认目录，不传参数）
      if (newMode === "server") {
        serverModeOps.loadServerFiles().catch((err) => {
          console.error("Error loading server files on mode change:", err);
        });
      }
    },
    [mode, fileWatcher, serverModeOps, serverDirectory, setMode]
  );

  // 服务端模式初始化：自动加载文件列表（使用默认目录）
  useEffect(() => {
    if (
      mode === "server" &&
      serverModeAvailable &&
      !checkingServerMode &&
      files.length === 0
    ) {
      serverModeOps.loadServerFiles().catch((err) => {
        console.error("Error loading server files on init:", err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, serverModeAvailable, checkingServerMode]);

  // FSA 模式 Hook
  const fsaMode = useFSAMode({
    setIsLoading,
    setIsLoadingFile,
    setFiles,
    setFileTree,
    setSelectedFile,
    setSelectedIndex,
    setCurrentDir,
    selectedFile,
    dirHandleRef,
  });

  // 传统模式 Hook
  const traditionalMode = useTraditionalMode({
    setIsLoading,
    setFiles,
    setFileTree,
    setSelectedFile,
    setSelectedIndex,
  });

  // 从 hooks 获取函数引用
  const handleFileSelectFSA = fsaMode.handleFileSelectFSA;
  const handleOpenDirectory = fsaMode.handleOpenDirectory;
  const refreshDirectory = fsaMode.refreshDirectory;
  const loadServerFiles = serverModeOps.loadServerFiles;
  const handleFileSelectServer = serverModeOps.handleFileSelectServer;
  const handleFileSelect = traditionalMode.handleFileSelect;
  const handleFolderSelect = traditionalMode.handleFolderSelect;
  const handleOpenFiles = traditionalMode.handleOpenFiles;
  const handleOpenFolder = traditionalMode.handleOpenFolder;

  // 切换目录展开/折叠
  const toggleDirectory = useCallback(
    (path: string) => {
      const toggleNode = (node: TreeNode): boolean => {
        if (node.path === path && node.type === "directory") {
          node.expanded = !node.expanded;
          return true;
        }
        if (node.children) {
          for (const child of node.children) {
            if (toggleNode(child)) return true;
          }
        }
        return false;
      };

      if (fileTree) {
        const newTree = JSON.parse(JSON.stringify(fileTree)); // 深拷贝
        toggleNode(newTree);
        setFileTree(newTree);

        // 重新计算可见文件列表，确保选中的文件仍然可见
        // 创建文件路径到文件项的映射
        const filesMap = new Map<string, FileItem>();
        files.forEach((f) => {
          filesMap.set(f.path, f);
        });
        const flatFiles = flattenTree(newTree, [], filesMap);
        if (selectedFile) {
          const newIndex = flatFiles.findIndex(
            (f) => f.path === selectedFile.path
          );
          if (newIndex >= 0) {
            // 文件仍然可见，更新索引，使用完整的文件信息
            const fullFileItem =
              filesMap.get(selectedFile.path) || selectedFile;
            setSelectedIndex(newIndex);
            setSelectedFile(fullFileItem);
          } else if (flatFiles.length > 0) {
            // 文件被隐藏了，选择第一个可见文件
            const firstFile = flatFiles[0];
            setSelectedIndex(0);
            if (mode === "fsa" && firstFile?.fileHandle) {
              // 异步加载文件内容
              handleFileSelectFSA(firstFile, 0).catch((err) => {
                console.error("Error loading file after toggle:", err);
              });
            } else {
              setSelectedFile(firstFile);
            }
          } else {
            // 没有可见文件了
            setSelectedIndex(-1);
            setSelectedFile(null);
          }
        }
      }
    },
    [
      fileTree,
      files,
      selectedFile,
      mode,
      handleFileSelectFSA,
      setFileTree,
      setSelectedIndex,
      setSelectedFile,
    ]
  );

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 创建文件路径到文件项的映射，确保获取完整的文件信息（包括 fileHandle）
      const filesMap = new Map<string, FileItem>();
      files.forEach((file) => {
        filesMap.set(file.path, file);
      });
      const flatFiles = flattenTree(fileTree, [], filesMap);
      if (flatFiles.length === 0) return;

      // 搜索相关快捷键已在 SearchBar 组件中处理

      // 如果焦点在其他输入框等元素上，不处理
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (flatFiles.length === 0) return;
        // 循环切换：到最后一个后回到第一个
        const newIndex =
          selectedIndex < flatFiles.length - 1 ? selectedIndex + 1 : 0;
        const targetFile = flatFiles[newIndex];
        if (!targetFile) return;

        if (mode === "fsa" && targetFile.fileHandle) {
          // FSA 模式：重新加载文件内容
          handleFileSelectFSA(targetFile, newIndex);
        } else if (mode === "server") {
          // 服务端模式：从API加载文件内容
          handleFileSelectServer(targetFile, newIndex);
        } else {
          // 传统模式：使用已加载的内容
          setSelectedIndex(newIndex);
          setSelectedFile(targetFile);
        }
        // 滚动到可见区域
        const listItem = fileListRef.current?.querySelector(
          `[data-file-path="${targetFile.path}"]`
        ) as HTMLElement;
        if (listItem) {
          listItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (flatFiles.length === 0) return;
        // 循环切换：到第一个后回到最后一个
        const newIndex =
          selectedIndex > 0 ? selectedIndex - 1 : flatFiles.length - 1;
        const targetFile = flatFiles[newIndex];
        if (!targetFile) return;

        if (mode === "fsa" && targetFile.fileHandle) {
          // FSA 模式：重新加载文件内容
          handleFileSelectFSA(targetFile, newIndex);
        } else if (mode === "server") {
          // 服务端模式：从API加载文件内容
          handleFileSelectServer(targetFile, newIndex);
        } else {
          // 传统模式：使用已加载的内容
          setSelectedIndex(newIndex);
          setSelectedFile(targetFile);
        }
        // 滚动到可见区域
        const listItem = fileListRef.current?.querySelector(
          `[data-file-path="${targetFile.path}"]`
        ) as HTMLElement;
        if (listItem) {
          listItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        // 左右键切换目录展开/折叠
        e.preventDefault();
        const flatFiles = flattenTree(fileTree);
        if (selectedIndex >= 0 && selectedIndex < flatFiles.length) {
          const currentFile = flatFiles[selectedIndex];
          const pathParts = currentFile.path.split("/");
          if (pathParts.length > 1) {
            // 找到文件所在的目录路径
            const dirPath = pathParts.slice(0, -1).join("/");
            toggleDirectory(dirPath);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    fileTree,
    selectedIndex,
    mode,
    files,
    toggleDirectory,
    handleFileSelectFSA,
    handleFileSelectServer,
  ]);

  // 当文件列表变化时，更新选中索引
  useEffect(() => {
    // 创建文件路径到文件项的映射
    const filesMap = new Map<string, FileItem>();
    files.forEach((f) => {
      filesMap.set(f.path, f);
    });
    const flatFiles = flattenTree(fileTree, [], filesMap);
    if (flatFiles.length > 0) {
      if (selectedIndex === -1 || selectedIndex >= flatFiles.length) {
        // 如果是在 FSA 模式下且文件有 fileHandle，使用 handleFileSelectFSA
        if (mode === "fsa" && flatFiles[0]?.fileHandle) {
          handleFileSelectFSA(flatFiles[0], 0);
        } else if (mode === "server") {
          // 服务端模式：加载第一个文件
          handleFileSelectServer(flatFiles[0], 0);
        } else {
          setSelectedIndex(0);
          setSelectedFile(flatFiles[0]);
        }
      }
    } else {
      setSelectedIndex(-1);
      setSelectedFile(null);
    }
  }, [
    fileTree,
    mode,
    files,
    selectedIndex,
    handleFileSelectFSA,
    handleFileSelectServer,
  ]);

  const handleFileClick = (file: FileItem) => {
    // 基于路径查找文件，而不是使用可能过时的索引
    // 创建文件路径到文件项的映射，确保获取完整的文件信息（包括 fileHandle）
    const filesMap = new Map<string, FileItem>();
    files.forEach((f) => {
      filesMap.set(f.path, f);
    });
    const flatFiles = flattenTree(fileTree, [], filesMap);
    const index = flatFiles.findIndex((f) => f.path === file.path);

    if (index < 0) {
      console.error("File not found in visible list:", file.path);
      return;
    }

    // 使用从 filesMap 获取的完整文件信息
    const fullFileItem = filesMap.get(file.path) || file;

    if (mode === "fsa" && fullFileItem.fileHandle) {
      // FSA 模式：重新加载文件内容
      handleFileSelectFSA(fullFileItem, index);
    } else if (mode === "server") {
      // 服务端模式：从API加载文件内容
      handleFileSelectServer(fullFileItem, index);
    } else {
      // 传统模式：使用已加载的内容
      setSelectedIndex(index);
      setSelectedFile(fullFileItem);
    }
  };

  // 已移至 FileTree 组件，此处删除
  // const renderTreeNode = (
  //   node: TreeNode,
  //   depth: number = 0,
  //   fileIndex: { current: number } = { current: 0 }
  // ): React.JSX.Element => {

  return (
    <>
      <Toaster />
      <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
        {/* 左侧文件列表 */}
        <div
          className="bg-gray-800 border-r border-gray-700 flex flex-col"
          style={{
            width: `${leftPanelWidth}px`,
            minWidth: "200px",
            maxWidth: "80%",
          }}
        >
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-semibold text-gray-200">
                Log Viewer
              </h1>
              <button
                onClick={logout}
                className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                title="登出"
              >
                登出
              </button>
            </div>
            <ModeSelector
              mode={mode}
              onModeChange={handleModeChange}
              serverModeAvailable={serverModeAvailable}
            />

            {mode === "fsa" ? (
              <FSAControls
                currentDir={currentDir}
                onOpenDirectory={handleOpenDirectory}
                onRefreshDirectory={refreshDirectory}
              />
            ) : mode === "server" ? (
              <ServerControls
                serverDirectory={serverDirectory}
                onServerDirectoryChange={setServerDirectory}
                onLoadFiles={loadServerFiles}
                isLoading={isLoading}
                currentDir={currentDir}
                checkingServerMode={checkingServerMode}
                serverModeAvailable={serverModeAvailable}
                serverModeDetails={serverModeDetails}
              />
            ) : (
              <TraditionalControls
                onOpenFiles={handleOpenFiles}
                onOpenFolder={handleOpenFolder}
                fileInputRef={traditionalMode.fileInputRef}
                folderInputRef={traditionalMode.folderInputRef}
                onFileSelect={handleFileSelect}
                onFolderSelect={handleFolderSelect}
              />
            )}
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden mac-scrollbar-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-400">加载中...</div>
            ) : files.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                暂无文件
                <br />
                <span className="text-sm">
                  {mode === "fsa"
                    ? "请选择包含文本文件的目录"
                    : mode === "server"
                    ? "正在从服务端加载文件列表..."
                    : "请选择文本文件"}
                </span>
                {mode === "fsa" &&
                  typeof window !== "undefined" &&
                  !("showDirectoryPicker" in window) && (
                    <div className="mt-2 text-xs text-yellow-400">
                      您的浏览器不支持 File System Access API
                    </div>
                  )}
                {mode === "server" &&
                  !serverModeAvailable &&
                  !checkingServerMode && (
                    <div className="mt-2 text-xs text-yellow-400">
                      服务端模式不可用（请检查环境变量 ENABLE_LOCAL_FS）
                    </div>
                  )}
              </div>
            ) : (
              <FileTree
                tree={fileTree}
                selectedFile={selectedFile}
                onFileClick={handleFileClick}
                onToggleDirectory={toggleDirectory}
                fileListRef={fileListRef}
              />
            )}
          </div>
        </div>

        {/* 分割线 */}
        <div
          className="bg-gray-700 hover:bg-blue-500 cursor-col-resize shrink-0 select-none relative"
          style={{
            width: "4px",
            userSelect: "none",
            zIndex: 10,
          }}
          onMouseDown={handleMouseDown}
        />

        {/* 右侧文件预览 */}
        <div className="flex-1 flex flex-col bg-gray-900 min-h-0 overflow-y-hidden">
          <FilePreview
            selectedFile={selectedFile}
            isLoadingFile={isLoadingFile}
            contentRef={contentRef}
          />
        </div>
      </div>
    </>
  );
}
