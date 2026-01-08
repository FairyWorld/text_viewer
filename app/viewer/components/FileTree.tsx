"use client";

import { useMemo, useCallback } from "react";
import {
  ControlledTreeEnvironment,
  Tree,
  TreeItem,
  TreeItemIndex,
} from "react-complex-tree";
import "react-complex-tree/lib/style-modern.css";
import { TreeNode, FileItem } from "../types";

interface FileTreeProps {
  tree: TreeNode | null;
  selectedFile: FileItem | null;
  onFileClick: (file: FileItem) => void;
  onToggleDirectory: (path: string) => void;
  fileListRef: React.RefObject<HTMLElement | null>;
}

/**
 * 将 TreeNode 转换为 react-complex-tree 需要的格式
 */
function convertTreeNodeToTreeData(
  node: TreeNode,
  items: Record<TreeItemIndex, TreeItem> = {}
): void {
  const index = node.path || `item-${node.name}`;
  const isDirectory = node.type === "directory";

  items[index] = {
    index,
    canMove: false,
    canRename: false,
    data: {
      name: node.name,
      path: node.path,
      type: node.type,
      fileItem: node.fileItem,
    },
    children: node.children
      ? node.children.map((child) => child.path || `item-${child.name}`)
      : undefined,
    isFolder: isDirectory,
  };

  if (node.children) {
    node.children.forEach((child) => {
      convertTreeNodeToTreeData(child, items);
    });
  }
}

/**
 * 文件树组件 - 使用 react-complex-tree
 */
export function FileTree({
  tree,
  selectedFile,
  onFileClick,
  onToggleDirectory,
  fileListRef,
}: FileTreeProps) {
  // 转换树数据格式
  const { items, rootItems } = useMemo(() => {
    if (!tree || !tree.children) {
      return { items: {}, rootItems: [] };
    }

    const items: Record<TreeItemIndex, TreeItem> = {};
    
    // 创建根节点
    const rootIndex: TreeItemIndex = "root";
    items[rootIndex] = {
      index: rootIndex,
      canMove: false,
      canRename: false,
      data: {
        name: "",
        path: "",
        type: "directory",
      },
      children: tree.children.map((child) => child.path || `item-${child.name}`),
      isFolder: true,
    };

    // 转换所有子节点
    tree.children.forEach((child) => {
      convertTreeNodeToTreeData(child, items);
    });

    return { items, rootItems: [rootIndex] };
  }, [tree]);

  // 获取展开的项目
  const expandedItems = useMemo(() => {
    const expanded: TreeItemIndex[] = ["root"]; // 根节点默认展开
    const collectExpanded = (node: TreeNode | null) => {
      if (!node) return;
      if (node.type === "directory" && node.expanded && node.path) {
        expanded.push(node.path);
      }
      if (node.children) {
        node.children.forEach(collectExpanded);
      }
    };
    if (tree?.children) {
      tree.children.forEach(collectExpanded);
    }
    return expanded;
  }, [tree]);

  // 获取选中的项目
  const selectedItems = useMemo(() => {
    return selectedFile?.path ? [selectedFile.path] : [];
  }, [selectedFile]);

  // 处理项目选择
  const handleSelectItems = useCallback(
    (selectedItems: TreeItemIndex[]) => {
      if (selectedItems.length === 0) return;

      const selectedIndex = selectedItems[0];
      const selectedItem = items[selectedIndex];
      if (
        selectedItem &&
        selectedItem.data.type === "file" &&
        selectedItem.data.fileItem
      ) {
        onFileClick(selectedItem.data.fileItem);
      }
    },
    [items, onFileClick]
  );

  // 处理项目展开
  const handleExpandItem = useCallback(
    (item: TreeItem, treeId: string) => {
      if (item.isFolder && item.data.path) {
        onToggleDirectory(item.data.path);
      }
    },
    [onToggleDirectory]
  );

  // 处理项目折叠
  const handleCollapseItem = useCallback(
    (item: TreeItem, treeId: string) => {
      if (item.isFolder && item.data.path) {
        onToggleDirectory(item.data.path);
      }
    },
    [onToggleDirectory]
  );

  // 自定义渲染 - 只添加图标，保持默认样式，文件名过长显示省略号
  const renderItemTitle = useCallback(
    ({ title, item }: {
      title: string;
      item: TreeItem;
      context: any;
      info: any;
    }) => {
      const isDirectory = item.isFolder;

      return (
        <span data-file-path={item.data.path} className="flex items-center min-w-0">
          <span style={{ marginRight: '8px', flexShrink: 0 }}>
            {isDirectory ? "📁" : "📄"}
          </span>
          <span className="truncate">{title}</span>
        </span>
      );
    },
    []
  );

  if (!tree || !tree.children || rootItems.length === 0) {
    return null;
  }

  // 获取项目标题
  const getItemTitle = useCallback((item: TreeItem) => {
    return item.data.name || "";
  }, []);

  return (
    <div ref={fileListRef as any} className="h-full rct-dark [&_.rct-tree-item-title-container]:min-w-0 [&_.rct-tree-item-title-container]:overflow-hidden">
      <ControlledTreeEnvironment
        items={items}
        viewState={{
          "file-tree": {
            expandedItems,
            selectedItems,
            focusedItem: selectedItems[0] || null,
          },
        }}
        getItemTitle={getItemTitle}
        onSelectItems={handleSelectItems}
        onExpandItem={handleExpandItem}
        onCollapseItem={handleCollapseItem}
        renderItemTitle={renderItemTitle}
        defaultInteractionMode="click-item-to-expand"
      >
        <Tree treeId="file-tree" rootItem="root" treeLabel="文件树" />
      </ControlledTreeEnvironment>
    </div>
  );
}

