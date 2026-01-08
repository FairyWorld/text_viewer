import { useCallback } from "react";
import { FileItem, TreeNode } from "../types";
import { buildFileTree, flattenTree } from "../utils/fileTree";
import { useToast } from "./useToast";

interface UseServerModeFileOperationsProps {
  setIsLoading: (loading: boolean) => void;
  setIsLoadingFile: (loading: boolean) => void;
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  setFileTree: React.Dispatch<React.SetStateAction<TreeNode | null>>;
  setSelectedFile: React.Dispatch<React.SetStateAction<FileItem | null>>;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  setCurrentDir: (dir: string) => void;
  serverDirectory: string;
  setServerDirectory: (dir: string) => void;
  isMounted: boolean;
  currentDir: string;
  fileWatcherRef: React.MutableRefObject<{
    startFileWatch: (filePath: string) => void;
    startDirectoryWatch: (directory: string) => void;
  } | null>;
}

/**
 * 服务端模式文件操作 Hook
 * 处理文件列表加载和文件选择
 */
export function useServerModeFileOperations({
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
}: UseServerModeFileOperationsProps) {
  const { toast } = useToast();

  // 服务端模式下选择文件
  const handleFileSelectServer = useCallback(
    async (fileItem: FileItem, index: number) => {
      try {
        setIsLoadingFile(true);

        // 构建文件的完整路径
        // 优先使用 fullPath（如果存在），否则拼接 currentDir 和 fileItem.path
        let fullFilePath: string;

        // 如果 fileItem 有 fullPath（服务端模式 API 返回），直接使用
        if (fileItem.fullPath) {
          fullFilePath = fileItem.fullPath;
        } else if (
          fileItem.path.startsWith("/") ||
          /^[A-Za-z]:/.test(fileItem.path)
        ) {
          // 如果 fileItem.path 已经是绝对路径，直接使用
          fullFilePath = fileItem.path;
        } else if (currentDir) {
          // 否则拼接：currentDir + "/" + fileItem.path
          // 使用 path.join 兼容 Windows 和 Unix 路径
          const pathParts = [currentDir, fileItem.path].filter(Boolean);
          fullFilePath = pathParts.join("/").replace(/\/+/g, "/");
        } else {
          fullFilePath = fileItem.path;
        }

        // 从API加载文件内容
        const response = await fetch(
          `/api/file-content?path=${encodeURIComponent(fullFilePath)}`
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to load file");
        }

        const data = await response.json();
        const updatedFile: FileItem = {
          ...fileItem,
          content: data.content,
          size: data.size,
        };

        setSelectedIndex(index);
        setSelectedFile(updatedFile);

        // 更新文件列表中的内容
        setFiles((prevFiles) => {
          const newFiles = [...prevFiles];
          const fileIndex = newFiles.findIndex((f) => f.path === fileItem.path);
          if (fileIndex >= 0) {
            newFiles[fileIndex] = updatedFile;
          }
          return newFiles;
        });

        // 开始监听文件变化
        fileWatcherRef.current?.startFileWatch(fullFilePath);
      } catch (error: unknown) {
        console.error(`Error loading file ${fileItem.name}:`, error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toast({
          title: "加载文件失败",
          description: `${fileItem.name}: ${errorMessage}`,
          variant: "destructive",
        });
        setSelectedIndex(index);
        setSelectedFile(fileItem);
      } finally {
        setIsLoadingFile(false);
      }
    },
    [
      setIsLoadingFile,
      currentDir,
      setSelectedIndex,
      setSelectedFile,
      setFiles,
      fileWatcherRef,
      toast,
    ]
  );

  // 服务端模式下加载文件列表
  // 在 Docker 环境下，目录固定为环境变量配置的根目录，不需要传递路径
  const loadServerFiles = useCallback(
    async (directory?: string) => {
      // 如果传入了 directory，使用传入的目录；否则使用默认目录（不传路径，API 使用 FILES_DIRECTORY）
      const targetDir = directory || undefined;
      try {
        setIsLoading(true);
        // 如果不传路径，API 会使用环境变量 FILES_DIRECTORY 作为默认目录
        const url = targetDir 
          ? `/api/files?path=${encodeURIComponent(targetDir)}`
          : `/api/files`;
        const response = await fetch(url);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to load files");
        }

        const data = await response.json();
        // API 返回的 path 是相对于目录的相对路径，fullPath 是完整路径
        // 我们保存基础目录路径和完整路径信息，以便后续使用
        const baseDirectory = data.directory || targetDir || '';
        const serverFiles: FileItem[] = data.files.map(
          (f: {
            name: string;
            path: string;
            fullPath?: string;
            size: number;
          }) => ({
            name: f.name,
            path: f.path, // 相对路径，如 "dir/color4.txt"
            fullPath: f.fullPath, // 完整路径，如 "C:\Users\...\files\dir\color4.txt"（如果 API 返回）
            content: "", // 稍后按需加载
            file: null,
            size: f.size,
          })
        );

        // 构建文件树
        const tree = buildFileTree(serverFiles);
        setFiles(serverFiles);
        setFileTree(tree);
        setCurrentDir(baseDirectory); // 保存完整的基础目录路径

        // 保存目录到 localStorage（如果传入了目录）
        if (isMounted && targetDir) {
          localStorage.setItem("file-viewer-server-directory", targetDir);
          setServerDirectory(targetDir);
        }

        if (serverFiles.length > 0) {
          const flatFiles = flattenTree(tree);
          setSelectedIndex(0);
          // 自动加载第一个文件
          await handleFileSelectServer(flatFiles[0], 0);
        } else {
          setSelectedIndex(-1);
          setSelectedFile(null);
        }

        // 开始监听目录变化
        const watchDir = data.directory || targetDir || '';
        if (watchDir) {
          fileWatcherRef.current?.startDirectoryWatch(watchDir);
        }
      } catch (error: unknown) {
        console.error("Error loading server files:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toast({
          title: "加载文件列表失败",
          description: errorMessage,
          variant: "destructive",
        });
        setFiles([]);
        setFileTree(null);
        setSelectedFile(null);
        setSelectedIndex(-1);
      } finally {
        setIsLoading(false);
      }
    },
    [
      serverDirectory,
      setIsLoading,
      setFiles,
      setFileTree,
      setCurrentDir,
      isMounted,
      setServerDirectory,
      setSelectedIndex,
      handleFileSelectServer,
      setSelectedFile,
      fileWatcherRef,
      toast,
    ]
  );

  return {
    handleFileSelectServer,
    loadServerFiles,
  };
}
