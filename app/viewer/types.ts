/**
 * 文件项接口
 */
export interface FileItem {
  name: string;
  path: string; // 相对路径，用于显示层级
  fullPath?: string; // 服务端模式下的完整路径
  content: string;
  file: File | null;
  size?: number;
  fileHandle?: FileSystemFileHandle; // FSA 模式下的文件句柄
}

/**
 * 树节点接口
 */
export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: TreeNode[];
  fileItem?: FileItem; // 如果是文件，保存 FileItem 引用
  expanded?: boolean; // 目录是否展开
}

/**
 * 文件访问模式
 */
export type Mode = "fsa" | "traditional" | "server";
