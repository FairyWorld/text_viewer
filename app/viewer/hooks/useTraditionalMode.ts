import { useCallback, useRef } from "react";
import { FileItem, TreeNode } from "../types";
import { buildFileTree, flattenTree } from "../utils/fileTree";

interface UseTraditionalModeProps {
  setIsLoading: (loading: boolean) => void;
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  setFileTree: React.Dispatch<React.SetStateAction<TreeNode | null>>;
  setSelectedFile: React.Dispatch<React.SetStateAction<FileItem | null>>;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
}

/**
 * 传统模式 Hook
 * 处理文件选择和文件夹选择
 */
export function useTraditionalMode({
  setIsLoading,
  setFiles,
  setFileTree,
  setSelectedFile,
  setSelectedIndex,
}: UseTraditionalModeProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // 传统模式 - 文件选择
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files;
      if (!selectedFiles) return;

      setIsLoading(true);
      const txtFiles: FileItem[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        // 只允许 .txt 文件
        if (file.name.endsWith(".txt")) {
          try {
            const content = await file.text();
            txtFiles.push({
              name: file.name,
              path: file.name, // 单文件选择时，路径就是文件名
              content,
              file,
              size: file.size,
            });
          } catch (error) {
            console.error(`Error reading file ${file.name}:`, error);
          }
        }
      }

      // 构建文件树
      const tree = buildFileTree(txtFiles);
      setFiles(txtFiles);
      setFileTree(tree);

      if (txtFiles.length > 0) {
        const flatFiles = flattenTree(tree);
        setSelectedIndex(0);
        setSelectedFile(flatFiles[0]);
      } else {
        setSelectedIndex(-1);
        setSelectedFile(null);
      }
      setIsLoading(false);
    },
    [setIsLoading, setFiles, setFileTree, setSelectedIndex, setSelectedFile]
  );

  // 传统模式 - 文件夹选择
  const handleFolderSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files;
      if (!selectedFiles) return;

      setIsLoading(true);
      const txtFiles: FileItem[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        // 只允许 .txt 文件
        if (file.name.endsWith(".txt")) {
          try {
            const content = await file.text();
            // webkitRelativePath 包含相对路径，例如 "folder/subfolder/file.txt"
            const path =
              (file as File & { webkitRelativePath?: string })
                .webkitRelativePath || file.name;
            txtFiles.push({
              name: file.name,
              path: path,
              content,
              file,
              size: file.size,
            });
          } catch (error) {
            console.error(`Error reading file ${file.name}:`, error);
          }
        }
      }

      // 构建文件树
      const tree = buildFileTree(txtFiles);
      setFiles(txtFiles);
      setFileTree(tree);

      if (txtFiles.length > 0) {
        const flatFiles = flattenTree(tree);
        setSelectedIndex(0);
        setSelectedFile(flatFiles[0]);
      } else {
        setSelectedIndex(-1);
        setSelectedFile(null);
      }
      setIsLoading(false);
    },
    [setIsLoading, setFiles, setFileTree, setSelectedIndex, setSelectedFile]
  );

  const handleOpenFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleOpenFolder = useCallback(() => {
    folderInputRef.current?.click();
  }, []);

  return {
    fileInputRef,
    folderInputRef,
    handleFileSelect,
    handleFolderSelect,
    handleOpenFiles,
    handleOpenFolder,
  };
}
