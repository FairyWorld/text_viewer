import { useState, useEffect, useRef, useCallback } from "react";
import { countMatches } from "../utils/search";
import {
  isHighlightAPISupported,
  applySearchHighlight,
  scrollToMatch,
} from "../utils/highlight";
import { toast } from "./useToast";

/**
 * 搜索功能 Hook
 * @param content 文件内容
 * @param externalContentRef 外部传入的 contentRef（可选）
 * @returns 搜索相关的状态和方法
 */
export function useSearch(
  content: string,
  externalContentRef?: React.RefObject<HTMLDivElement | null>
) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);
  const [matchCount, setMatchCount] = useState<number>(0);
  const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false);
  const internalContentRef = useRef<HTMLDivElement>(null);
  const contentRef = externalContentRef || internalContentRef;
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 计算匹配数量并应用高亮
  useEffect(() => {
    if (!contentRef.current) return;

    // 使用 requestAnimationFrame 延迟状态更新，避免同步 setState
    requestAnimationFrame(() => {
      if (!content || !searchQuery.trim()) {
        setMatchCount(0);
        setCurrentMatchIndex(-1);
        // 清除高亮
        if (isHighlightAPISupported()) {
          CSS.highlights.clear();
        }
        return;
      }

      const count = countMatches(content, searchQuery);
      setMatchCount(count);

      // 应用高亮
      if (isHighlightAPISupported() && contentRef.current) {
        const actualCount = applySearchHighlight(
          contentRef.current,
          searchQuery,
          currentMatchIndex >= 0 ? currentMatchIndex : -1
        );
        // 使用实际找到的数量（可能因为 DOM 未完全渲染而不同）
        if (actualCount > 0 && actualCount !== count) {
          console.warn(
            `[搜索] 匹配数量不一致：预期 ${count}，实际 ${actualCount}`
          );
        }
      }

      // 如果有匹配项且当前索引无效，重置为第一个
      if (count > 0 && currentMatchIndex < 0) {
        setCurrentMatchIndex(0);
      } else if (count === 0) {
        setCurrentMatchIndex(-1);
      }
    });
  }, [content, searchQuery, currentMatchIndex, contentRef]);

  // 滚动到指定匹配项（使用 CSS Custom Highlight API 或回退方案）
  // 注意：这里依赖 contentRef 而不是 contentRef.current 是正确的 React 模式
  // ref 对象本身是稳定的，current 的变化不应该触发函数重新创建
  // React Compiler 的警告可以安全忽略，这是预期的行为
  const scrollToMatchCallback = useCallback(
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    (index: number) => {
      if (index < 0) return;

      if (isHighlightAPISupported()) {
        // 使用 CSS Custom Highlight API
        const tryScroll = (attempt: number = 0) => {
          if (attempt > 5) return;

          requestAnimationFrame(() => {
            // 在运行时获取最新的 ref.current 值（这是正确的模式）
            const ref = contentRef.current;
            const query = searchQuery;

            if (!ref || !query.trim()) return;

            // 应用高亮并获取匹配数量
            const matchCount = applySearchHighlight(ref, query, index);

            if (matchCount === 0) {
              setTimeout(() => tryScroll(attempt + 1), 100);
              return;
            }

            // 滚动到目标位置
            scrollToMatch(ref, query, index);
          });
        };

        setTimeout(() => tryScroll(), 200);
      } else {
        // 浏览器不支持 CSS Custom Highlight API，显示提示
        toast({
          title: "浏览器不支持",
          description:
            "您的浏览器不支持 CSS Custom Highlight API，搜索功能不可用。请使用 Chrome 105+、Edge 105+ 或 Safari 16.4+。",
          variant: "destructive",
        });
      }
    },
    // 依赖 contentRef 对象本身（稳定引用），而不是 contentRef.current
    // 这是正确的 React 模式，React Compiler 的警告可以忽略
    [contentRef, searchQuery]
  );

  // 导航到下一个匹配项
  const navigateToNextMatch = useCallback(() => {
    if (matchCount === 0) return;
    const newIndex =
      currentMatchIndex < matchCount - 1 ? currentMatchIndex + 1 : 0;
    setCurrentMatchIndex(newIndex);
    scrollToMatchCallback(newIndex);
  }, [matchCount, currentMatchIndex, scrollToMatchCallback]);

  // 导航到上一个匹配项
  const navigateToPrevMatch = useCallback(() => {
    if (matchCount === 0) return;
    const newIndex =
      currentMatchIndex > 0 ? currentMatchIndex - 1 : matchCount - 1;
    setCurrentMatchIndex(newIndex);
    scrollToMatchCallback(newIndex);
  }, [matchCount, currentMatchIndex, scrollToMatchCallback]);

  // 处理搜索输入变化
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentMatchIndex(-1);
  }, []);

  // 当匹配索引变化时，自动滚动和更新高亮
  useEffect(() => {
    if (currentMatchIndex >= 0 && matchCount > 0 && contentRef.current) {
      if (isHighlightAPISupported()) {
        // 更新高亮（突出显示当前匹配项）
        applySearchHighlight(
          contentRef.current,
          searchQuery,
          currentMatchIndex
        );
        // 滚动到当前匹配项
        scrollToMatch(contentRef.current, searchQuery, currentMatchIndex);
      } else {
        // 浏览器不支持，显示提示
        toast({
          title: "浏览器不支持",
          description:
            "您的浏览器不支持 CSS Custom Highlight API，搜索功能不可用。请使用 Chrome 105+、Edge 105+ 或 Safari 16.4+。",
          variant: "destructive",
        });
      }
    }
  }, [
    currentMatchIndex,
    matchCount,
    searchQuery,
    contentRef,
    scrollToMatchCallback,
  ]);

  // 处理搜索快捷键 (Ctrl+F / Cmd+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F 或 Cmd+F 打开搜索
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setIsSearchVisible(true);
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 0);
      }

      // ESC 关闭搜索
      if (e.key === "Escape" && isSearchVisible) {
        setIsSearchVisible(false);
        setSearchQuery("");
        setCurrentMatchIndex(-1);
        setMatchCount(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSearchVisible]);

  return {
    searchQuery,
    currentMatchIndex,
    matchCount,
    isSearchVisible,
    contentRef,
    searchInputRef,
    setSearchQuery: handleSearchChange,
    setCurrentMatchIndex,
    setIsSearchVisible,
    navigateToNextMatch,
    navigateToPrevMatch,
  };
}
