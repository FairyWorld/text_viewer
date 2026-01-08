import { useSearch } from "../hooks/useSearch";

interface SearchBarProps {
  content: string;
  contentRef: React.RefObject<HTMLDivElement>;
  onSearchQueryChange?: (query: string) => void;
}

/**
 * 搜索栏组件
 */
export function SearchBar({ content, contentRef, onSearchQueryChange }: SearchBarProps) {
  const {
    searchQuery,
    currentMatchIndex,
    matchCount,
    isSearchVisible,
    searchInputRef,
    setSearchQuery,
    setIsSearchVisible,
    navigateToNextMatch,
    navigateToPrevMatch,
  } = useSearch(content, contentRef);

  // 同步搜索状态到父组件
  const handleChange = (value: string) => {
    setSearchQuery(value);
    onSearchQueryChange?.(value);
  };

  if (!isSearchVisible) {
    return (
      <button
        onClick={() => setIsSearchVisible(true)}
        className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        title="搜索 (Ctrl+F)"
      >
        🔍 搜索
      </button>
    );
  }

  return (
    <div className="mt-3 p-3 bg-gray-700 rounded flex items-center gap-2">
      <input
        ref={searchInputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="搜索关键词..."
        className="flex-1 px-3 py-2 bg-gray-800 text-gray-100 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && searchQuery.trim()) {
            e.preventDefault();
            navigateToNextMatch();
          }
          if (e.key === "Enter" && e.shiftKey && searchQuery.trim()) {
            e.preventDefault();
            navigateToPrevMatch();
          }
        }}
      />
      {searchQuery.trim() && matchCount > 0 && (
        <>
          <div className="text-sm text-gray-400 whitespace-nowrap">
            {currentMatchIndex + 1} / {matchCount}
          </div>
          <button
            onClick={navigateToPrevMatch}
            className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
            title="上一个 (Shift+Enter)"
          >
            ↑
          </button>
          <button
            onClick={navigateToNextMatch}
            className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
            title="下一个 (Enter)"
          >
            ↓
          </button>
        </>
      )}
      {searchQuery.trim() && matchCount === 0 && (
        <div className="text-sm text-gray-400">未找到</div>
      )}
      <button
        onClick={() => {
          setIsSearchVisible(false);
          setSearchQuery("");
        }}
        className="px-2 py-1 text-gray-400 hover:text-gray-200"
        title="关闭 (ESC)"
      >
        ✕
      </button>
    </div>
  );
}

