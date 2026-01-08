import { useEffect, useRef } from "react";
import { FileItem } from "../types";
import { renderContent } from "../utils/search";
import { SearchBar } from "./SearchBar";

interface FilePreviewProps {
  selectedFile: FileItem | null;
  isLoadingFile: boolean;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * 文件预览组件
 */
export function FilePreview({
  selectedFile,
  isLoadingFile,
  contentRef,
}: FilePreviewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 监听滚动，实现滚动时显示滚动条（Mac风格）
  // 不依赖 selectedFile，确保滚动容器一直存在，保留滚动位置
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.classList.add("scrolling");
      }

      // 清除之前的定时器
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // 滚动停止后 1 秒移除 scrolling 类（隐藏滚动条）
      scrollTimeoutRef.current = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.classList.remove("scrolling");
        }
      }, 1000);
    };

    container.addEventListener("scroll", handleScroll);
    container.addEventListener("wheel", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("wheel", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []); // 空依赖数组，只在组件挂载时添加一次事件监听

  if (!selectedFile) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-xl mb-2">未选择文件</p>
          <p className="text-sm">请在左侧选择文件进行预览</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="p-4 border-b"
        style={{
          backgroundColor: "#073642", // Solarized Dark Base02
          borderColor: "#586e75", // Solarized Dark Base01
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2
              className="text-lg font-semibold"
              style={{ color: "#eee8d5" }} // Solarized Dark Base2
            >
              {selectedFile.name}
            </h2>
            {selectedFile.path !== selectedFile.name && (
              <div
                className="text-xs mt-1"
                style={{ color: "#93a1a1" }} // Solarized Dark Base1
              >
                路径: {selectedFile.path}
              </div>
            )}
          </div>
        </div>

        {/* 搜索栏 */}
        <SearchBar
          content={selectedFile.content}
          contentRef={contentRef as React.RefObject<HTMLDivElement>}
        />
      </div>
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto p-4 mac-scrollbar-auto relative text-viewer"
        style={{ backgroundColor: "#002b36" }} // Solarized Dark Base03
      >
        {isLoadingFile && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-opacity-75 z-10"
            style={{ backgroundColor: "#002b36" }}
          >
            <div
              className="text-center"
              style={{ color: "#839496" }}
            >
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2"
                style={{ borderColor: "#839496" }}
              ></div>
              <p>加载中...</p>
            </div>
          </div>
        )}
        <div
          ref={contentRef}
          className="font-mono text-sm whitespace-pre"
          dangerouslySetInnerHTML={renderContent(selectedFile.content)}
          style={{
            minHeight: "100%",
            lineHeight: "1.2",
            color: "#839496", // Solarized Dark Base0 - 默认文本颜色
            backgroundColor: "#002b36", // Solarized Dark Base03 - 背景色
          }}
        />
      </div>
    </>
  );
}
