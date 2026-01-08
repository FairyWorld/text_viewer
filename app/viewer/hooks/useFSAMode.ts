import { useCallback, useRef } from "react";
import { FileItem, TreeNode } from "../types";
import { buildFileTree, flattenTree } from "../utils/fileTree";
import { collectTxtFiles, loadFileContent } from "../utils/fileSystem";
import { useToast } from "./useToast";

interface UseFSAModeProps {
  setIsLoading: (loading: boolean) => void;
  setIsLoadingFile: (loading: boolean) => void;
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  setFileTree: React.Dispatch<React.SetStateAction<TreeNode | null>>;
  setSelectedFile: React.Dispatch<React.SetStateAction<FileItem | null>>;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  setCurrentDir: (dir: string) => void;
  selectedFile: FileItem | null;
  dirHandleRef: React.MutableRefObject<FileSystemDirectoryHandle | null>;
}

/**
 * FSA (File System Access API) 模式 Hook
 * 处理文件选择、目录打开和刷新等操作
 */
export function useFSAMode({
  setIsLoading,
  setIsLoadingFile,
  setFiles,
  setFileTree,
  setSelectedFile,
  setSelectedIndex,
  setCurrentDir,
  selectedFile,
  dirHandleRef,
}: UseFSAModeProps) {
  const { toast } = useToast();

  // FSA 模式下选择文件
  const handleFileSelectFSA = useCallback(
    async (fileItem: FileItem, index: number) => {
      if (!fileItem.fileHandle) {
        console.error("File handle not found for:", fileItem.path);
        toast({
          title: "错误",
          description: `文件句柄不存在: ${fileItem.name}`,
          variant: "destructive",
        });
        return;
      }

      try {
        setIsLoadingFile(true);
        const content = await loadFileContent(fileItem.fileHandle);
        const updatedFile: FileItem = {
          ...fileItem,
          content,
        };

        setSelectedIndex(index);
        setSelectedFile(updatedFile);

        // 更新文件列表中的内容（可选，用于缓存）
        setFiles((prevFiles) => {
          const newFiles = [...prevFiles];
          const fileIndex = newFiles.findIndex((f) => f.path === fileItem.path);
          if (fileIndex >= 0) {
            newFiles[fileIndex] = updatedFile;
          }
          return newFiles;
        });
      } catch (error: unknown) {
        console.error(`Error loading file ${fileItem.name}:`, error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        toast({
          title: "加载文件失败",
          description: `${fileItem.name}: ${errorMessage}`,
          variant: "destructive",
        });
        // 即使加载失败，也更新选中状态，这样用户知道选择了哪个文件
        setSelectedIndex(index);
        setSelectedFile(fileItem);
      } finally {
        setIsLoadingFile(false);
      }
    },
    [
      setIsLoadingFile,
      setSelectedIndex,
      setSelectedFile,
      setFiles,
      toast,
    ]
  );

  // 刷新目录列表（FSA 模式）
  const refreshDirectory = useCallback(async () => {
    if (!dirHandleRef.current) return;

    try {
      setIsLoading(true);
      const dirHandle = dirHandleRef.current;

      // 递归收集所有txt文件，传入根目录名称以统一路径格式
      const txtFiles = await collectTxtFiles(dirHandle, dirHandle.name);

      // 构建文件树
      const tree = buildFileTree(txtFiles);
      setFiles(txtFiles);
      setFileTree(tree);

      // 如果之前有选中的文件，尝试保持选中状态
      if (selectedFile) {
        const flatFiles = flattenTree(tree);
        const foundIndex = flatFiles.findIndex(
          (f) => f.path === selectedFile.path
        );
        if (foundIndex >= 0) {
          // 重新加载当前文件内容
          await handleFileSelectFSA(flatFiles[foundIndex], foundIndex);
        } else if (flatFiles.length > 0) {
          // 如果之前的文件不存在了，选择第一个
          await handleFileSelectFSA(flatFiles[0], 0);
        } else {
          setSelectedIndex(-1);
          setSelectedFile(null);
        }
      } else if (txtFiles.length > 0) {
        const flatFiles = flattenTree(tree);
        await handleFileSelectFSA(flatFiles[0], 0);
      } else {
        setSelectedIndex(-1);
        setSelectedFile(null);
      }
    } catch (error: unknown) {
      console.error("Error refreshing directory:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast({
        title: "刷新目录失败",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    dirHandleRef,
    setIsLoading,
    setFiles,
    setFileTree,
    selectedFile,
    handleFileSelectFSA,
    setSelectedIndex,
    setSelectedFile,
    toast,
  ]);

  // File System Access API 模式 - 打开目录
  const handleOpenDirectory = useCallback(async () => {
    if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
      toast({
        title: "浏览器不支持",
        description: "您的浏览器不支持 File System Access API，请使用传统模式",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const dirHandle = await (
        window as Window & {
          showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
        }
      ).showDirectoryPicker?.();
      if (!dirHandle) {
        throw new Error("showDirectoryPicker is not supported");
      }
      dirHandleRef.current = dirHandle;
      setCurrentDir(dirHandle.name);

      // 递归收集所有txt文件，传入根目录名称以统一路径格式
      const txtFiles = await collectTxtFiles(dirHandle, dirHandle.name);

      // 构建文件树
      const tree = buildFileTree(txtFiles);
      setFiles(txtFiles);
      setFileTree(tree);

      if (txtFiles.length > 0) {
        // 加载第一个文件的内容
        const flatFiles = flattenTree(tree);
        await handleFileSelectFSA(flatFiles[0], 0);
      } else {
        setSelectedIndex(-1);
        setSelectedFile(null);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Error opening directory:", error);
        const errorMessage = error.message || String(error);
        toast({
          title: "打开目录失败",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    setIsLoading,
    dirHandleRef,
    setCurrentDir,
    setFiles,
    setFileTree,
    handleFileSelectFSA,
    setSelectedIndex,
    setSelectedFile,
    toast,
  ]);

  return {
    handleFileSelectFSA,
    handleOpenDirectory,
    refreshDirectory,
  };
}
