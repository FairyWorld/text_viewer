import { useEffect, useRef } from "react";
import { FileItem, TreeNode, Mode } from "../types";
import { buildFileTree, flattenTree } from "../utils/fileTree";

interface UseFileWatcherProps {
  mode: Mode; // 保留用于未来扩展，当前未使用
  selectedFile: FileItem | null;
  setSelectedFile: React.Dispatch<React.SetStateAction<FileItem | null>>;
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  setFileTree: React.Dispatch<React.SetStateAction<TreeNode | null>>;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  handleFileSelectServer?: (fileItem: FileItem, index: number) => Promise<void>;
}

/**
 * 文件监听 Hook（Server-Sent Events）
 * 用于服务端模式下的实时文件更新
 */
export function useFileWatcher({
  mode, // eslint-disable-line @typescript-eslint/no-unused-vars
  selectedFile,
  setSelectedFile,
  setFiles,
  setFileTree,
  setSelectedIndex,
  handleFileSelectServer,
}: UseFileWatcherProps) {
  const fileWatchEventSourceRef = useRef<EventSource | null>(null);
  const directoryWatchEventSourceRef = useRef<EventSource | null>(null);

  // 开始监听文件变化
  const startFileWatch = (filePath: string) => {
    // 停止之前的监听
    if (fileWatchEventSourceRef.current) {
      fileWatchEventSourceRef.current.close();
    }

    const eventSource = new EventSource(
      `/api/file-watch?path=${encodeURIComponent(filePath)}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "update" && selectedFile?.path === filePath) {
          // 更新文件内容
          const updatedFile: FileItem = {
            ...selectedFile,
            content: data.content,
          };
          setSelectedFile(updatedFile);

          // 更新文件列表
          setFiles((prevFiles) => {
            const newFiles = [...prevFiles];
            const fileIndex = newFiles.findIndex((f) => f.path === filePath);
            if (fileIndex >= 0) {
              newFiles[fileIndex] = updatedFile;
            }
            return newFiles;
          });
        } else if (data.type === "error") {
          console.error("File watch error:", data.error);
        } else if (data.type === "connected") {
          console.log("File watch connected:", data.message);
        }
      } catch (error) {
        console.error("Error parsing file watch event:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("File watch event source error:", error);
      eventSource.close();
    };

    fileWatchEventSourceRef.current = eventSource;
  };

  // 开始监听目录变化（Server-Sent Events）
  const startDirectoryWatch = (directory: string) => {
    // 停止之前的监听
    if (directoryWatchEventSourceRef.current) {
      directoryWatchEventSourceRef.current.close();
    }

    const eventSource = new EventSource(
      `/api/directory-watch?path=${encodeURIComponent(directory)}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "directory-change") {
          // 更新文件列表
          const serverFiles: FileItem[] = data.files.map(
            (f: { name: string; path: string; size: number }) => ({
              name: f.name,
              path: f.path,
              content: "", // 按需加载
              file: null,
              size: f.size,
            })
          );

          // 保持当前选中的文件（如果仍然存在）
          const currentPath = selectedFile?.path;
          const tree = buildFileTree(serverFiles);
          setFiles(serverFiles);
          setFileTree(tree);

          // 如果当前选中的文件仍然存在，保持选中状态
          if (currentPath && handleFileSelectServer) {
            const filesMap = new Map<string, FileItem>();
            serverFiles.forEach((f) => {
              filesMap.set(f.path, f);
            });
            const flatFiles = flattenTree(tree, [], filesMap);
            const foundIndex = flatFiles.findIndex(
              (f) => f.path === currentPath
            );
            if (foundIndex >= 0) {
              setSelectedIndex(foundIndex);
              const fullFileItem = filesMap.get(currentPath) || selectedFile;
              setSelectedFile(fullFileItem);
              // 如果文件内容为空，重新加载
              if (!fullFileItem.content) {
                handleFileSelectServer(fullFileItem, foundIndex);
              }
            } else {
              // 文件已删除，选择第一个文件
              if (flatFiles.length > 0) {
                setSelectedIndex(0);
                handleFileSelectServer(flatFiles[0], 0);
              } else {
                setSelectedIndex(-1);
                setSelectedFile(null);
              }
            }
          }
        } else if (data.type === "error") {
          console.error("Directory watch error:", data.error);
        } else if (data.type === "connected") {
          console.log("Directory watch connected:", data.message);
        }
      } catch (error) {
        console.error("Error parsing directory watch event:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("Directory watch event source error:", error);
      eventSource.close();
    };

    directoryWatchEventSourceRef.current = eventSource;
  };

  // 清理所有监听器
  const cleanup = () => {
    if (fileWatchEventSourceRef.current) {
      fileWatchEventSourceRef.current.close();
      fileWatchEventSourceRef.current = null;
    }
    if (directoryWatchEventSourceRef.current) {
      directoryWatchEventSourceRef.current.close();
      directoryWatchEventSourceRef.current = null;
    }
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    startFileWatch,
    startDirectoryWatch,
    cleanup,
  };
}
