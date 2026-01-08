import { FileItem, TreeNode } from "../types";

/**
 * 构建文件树结构
 * @param files 文件列表
 * @returns 文件树根节点
 */
export function buildFileTree(files: FileItem[]): TreeNode | null {
  if (files.length === 0) return null;

  const root: TreeNode = {
    name: "",
    path: "",
    type: "directory",
    children: [],
    expanded: true,
  };

  files.forEach((file) => {
    const pathParts = file.path.split("/");
    let current = root;

    // 遍历路径的每一部分
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const isLast = i === pathParts.length - 1;

      if (isLast) {
        // 最后一部分是文件
        const fileNode: TreeNode = {
          name: part,
          path: file.path,
          type: "file",
          fileItem: file,
        };
        if (!current.children) current.children = [];
        current.children.push(fileNode);
      } else {
        // 中间部分是目录
        if (!current.children) current.children = [];
        let dirNode = current.children.find(
          (child) => child.type === "directory" && child.name === part
        );

        if (!dirNode) {
          const dirPath = pathParts.slice(0, i + 1).join("/");
          dirNode = {
            name: part,
            path: dirPath,
            type: "directory",
            children: [],
            expanded: true, // 默认展开
          };
          current.children.push(dirNode);
        }
        current = dirNode;
      }
    }
  });

  // 对每个节点的子节点排序：目录在前，文件在后，都按名称排序
  const sortNode = (node: TreeNode) => {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      node.children.forEach((child) => {
        if (child.type === "directory") {
          sortNode(child);
        }
      });
    }
  };

  sortNode(root);
  return root;
}

/**
 * 扁平化树结构（用于键盘导航）
 * @param node 树节点
 * @param result 结果数组
 * @param filesMap 文件路径到文件项的映射（可选，用于获取完整文件信息）
 * @returns 扁平化的文件列表
 */
export function flattenTree(
  node: TreeNode | null,
  result: FileItem[] = [],
  filesMap?: Map<string, FileItem>
): FileItem[] {
  if (!node) return result;

  if (node.type === "file" && node.fileItem) {
    // 如果提供了 filesMap，优先从原始文件列表中获取完整信息（包含 fileHandle）
    if (filesMap) {
      const fullFileItem = filesMap.get(node.fileItem.path);
      if (fullFileItem) {
        result.push(fullFileItem);
      } else {
        // 如果找不到，使用树节点中的 fileItem
        result.push(node.fileItem);
      }
    } else {
      result.push(node.fileItem);
    }
  }

  if (node.children && node.expanded) {
    node.children.forEach((child) => {
      flattenTree(child, result, filesMap);
    });
  }

  return result;
}

