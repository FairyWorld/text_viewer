/**
 * 使用 CSS Custom Highlight API 实现搜索高亮
 * 优势：不修改 DOM，避免占位符问题
 */

// 检查浏览器是否支持 CSS Custom Highlight API
export function isHighlightAPISupported(): boolean {
  return (
    typeof CSS !== "undefined" &&
    "highlights" in CSS &&
    typeof CSS.highlights !== "undefined"
  );
}

// 动态注入 CSS Custom Highlight API 样式
// 因为 PostCSS 不支持 ::highlight() 伪元素，所以通过 JavaScript 注入
const HIGHLIGHT_STYLES = `
    /* CSS Custom Highlight API 样式 */
    /* 所有匹配项：黄色背景（偏黄色） */
    ::highlight(search-all) {
      background-color: rgb(250, 204, 21); /* yellow-400 - 黄色 */
      color: rgb(17, 24, 39); /* gray-900 */
    }

    /* 当前匹配项：橙色背景（偏橙色），带边框 */
    ::highlight(search-current) {
      background-color: rgb(251, 146, 60); /* orange-400 - 橙色 */
      outline: 3px solid rgb(249, 115, 22); /* orange-500 - 深橙色边框 */
      outline-offset: -1px;
      color: rgb(17, 24, 39); /* gray-900 */
      box-shadow: 0 0 0 1px rgb(249, 115, 22); /* 额外的内阴影增强边框 */
    }
  `;

export function injectHighlightStyles(): void {
  if (typeof document === "undefined") return;

  // 检查是否已经注入过样式
  let style = document.getElementById(
    "highlight-api-styles"
  ) as HTMLStyleElement | null;

  if (style) {
    // 如果样式已存在，更新其内容（支持热更新）
    style.textContent = HIGHLIGHT_STYLES;
  } else {
    // 如果样式不存在，创建新的样式元素
    style = document.createElement("style");
    style.id = "highlight-api-styles";
    style.textContent = HIGHLIGHT_STYLES;
    document.head.appendChild(style);
  }
}

/**
 * 创建搜索高亮的 Range 对象
 * @param container 容器元素
 * @param searchQuery 搜索关键词
 * @returns Range 对象数组
 */
export function createSearchRanges(
  container: HTMLElement,
  searchQuery: string
): Range[] {
  if (!searchQuery.trim()) return [];

  const ranges: Range[] = [];
  const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escapedQuery, "giu");

  // 遍历所有文本节点
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  let textNode: Node | null;
  while ((textNode = walker.nextNode())) {
    const textContent = textNode.textContent || "";
    let match: RegExpExecArray | null;

    // 重置正则表达式的 lastIndex（因为每个文本节点都需要重新匹配）
    const localRegex = new RegExp(regex.source, regex.flags);

    while ((match = localRegex.exec(textContent)) !== null) {
      try {
        const range = new Range();
        range.setStart(textNode, match.index);
        range.setEnd(textNode, match.index + match[0].length);
        ranges.push(range);
      } catch (error) {
        // 如果创建 Range 失败（例如文本节点被修改），跳过
        console.warn("[高亮] 创建 Range 失败:", error);
        break; // 跳出当前文本节点的匹配循环
      }
    }
  }

  return ranges;
}

/**
 * 应用搜索高亮（使用 CSS Custom Highlight API）
 * @param container 容器元素
 * @param searchQuery 搜索关键词
 * @param currentIndex 当前匹配项索引（用于高亮当前项）
 * @returns 匹配数量
 */
export function applySearchHighlight(
  container: HTMLElement,
  searchQuery: string,
  currentIndex: number = -1
): number {
  // 确保样式已注入
  injectHighlightStyles();

  // 清除之前的高亮
  CSS.highlights.clear();

  if (!searchQuery.trim()) {
    return 0;
  }

  const ranges = createSearchRanges(container, searchQuery);

  if (ranges.length === 0) {
    return 0;
  }

  // 创建所有匹配项的高亮
  const allMatchesHighlight = new Highlight(...ranges);
  CSS.highlights.set("search-all", allMatchesHighlight);

  // 如果有当前匹配项，创建单独的高亮
  if (currentIndex >= 0 && currentIndex < ranges.length) {
    const currentMatchHighlight = new Highlight(ranges[currentIndex]);
    CSS.highlights.set("search-current", currentMatchHighlight);
  }

  return ranges.length;
}

/**
 * 查找滚动容器（向上查找第一个有 overflow 样式的父元素）
 */
function findScrollContainer(element: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = element;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflow = style.overflow || style.overflowY;
    if (
      overflow === "auto" ||
      overflow === "scroll" ||
      overflow === "overlay"
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

// 存储当前滚动操作的 ID，用于取消之前的滚动
let currentScrollId = 0;
// 记录上次滚动的时间，用于检测快速连续切换
let lastScrollTime = 0;
const FAST_SCROLL_THRESHOLD = 300; // 300ms 内连续滚动视为快速切换

/**
 * 检查目标是否已经在可见区域内
 * @param rect 目标元素的边界矩形
 * @param containerRect 容器的边界矩形
 * @param margin 边距（像素），用于判断是否"足够可见"
 * @returns 是否在可见区域内
 */
function isInViewport(
  rect: DOMRect,
  containerRect: DOMRect,
  margin: number = 50
): boolean {
  return (
    rect.top >= containerRect.top - margin &&
    rect.bottom <= containerRect.bottom + margin &&
    rect.left >= containerRect.left - margin &&
    rect.right <= containerRect.right + margin
  );
}

/**
 * 滚动到指定的匹配项
 * @param contentContainer 内容容器元素（用于查找 Range）
 * @param searchQuery 搜索关键词
 * @param index 匹配项索引
 */
export function scrollToMatch(
  contentContainer: HTMLElement,
  searchQuery: string,
  index: number
): void {
  if (index < 0) return;

  const ranges = createSearchRanges(contentContainer, searchQuery);

  if (index >= ranges.length) return;

  const targetRange = ranges[index];

  // 查找实际的滚动容器（向上查找第一个有 overflow 的父元素）
  const scrollContainer = findScrollContainer(contentContainer);

  if (!scrollContainer) {
    console.warn("[高亮] 未找到滚动容器");
    return;
  }

  // 生成新的滚动 ID，用于取消之前的滚动
  const scrollId = ++currentScrollId;
  const now = Date.now();
  const isFastScroll = now - lastScrollTime < FAST_SCROLL_THRESHOLD;
  lastScrollTime = now;

  // Range 对象没有 scrollIntoView 方法，需要使用 getBoundingClientRect 获取位置
  try {
    const rect = targetRange.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();

    // 检查目标是否已经在可见区域内（带边距）
    if (isInViewport(rect, containerRect, 50)) {
      // 已经在可见区域内，不需要滚动
      return;
    }

    // 计算需要滚动的距离
    // 目标：让匹配项在容器中央
    const targetScrollTop =
      scrollContainer.scrollTop +
      rect.top -
      containerRect.top -
      containerRect.height / 2 +
      rect.height / 2;

    // 快速切换时总是使用即时滚动（无动画）
    // 正常切换时使用平滑滚动
    if (isFastScroll) {
      // 快速切换：直接跳转，不使用动画
      scrollContainer.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: "auto",
      });
    } else {
      // 正常切换：取消之前的平滑滚动，然后开始新的平滑滚动
      scrollContainer.scrollTo({
        top: scrollContainer.scrollTop,
        behavior: "auto",
      });

      // 使用 requestAnimationFrame 确保取消操作完成后再开始新的滚动
      requestAnimationFrame(() => {
        // 检查是否还是当前的滚动操作（避免被后续操作覆盖）
        if (scrollId !== currentScrollId) {
          return;
        }

        // 重新计算位置（因为可能已经滚动了一部分）
        const newRect = targetRange.getBoundingClientRect();
        const newContainerRect = scrollContainer.getBoundingClientRect();

        // 再次检查是否已经在可见区域内（可能在取消滚动时已经进入视野）
        if (isInViewport(newRect, newContainerRect, 50)) {
          return;
        }

        const newTargetScrollTop =
          scrollContainer.scrollTop +
          newRect.top -
          newContainerRect.top -
          newContainerRect.height / 2 +
          newRect.height / 2;

        // 平滑滚动到新位置
        scrollContainer.scrollTo({
          top: Math.max(0, newTargetScrollTop),
          behavior: "smooth",
        });
      });
    }
  } catch (error) {
    // 如果 getBoundingClientRect 失败，尝试使用 Range 的 startContainer
    console.warn("[高亮] 滚动失败，尝试备用方法:", error);
    try {
      const startNode = targetRange.startContainer;
      if (startNode.nodeType === Node.TEXT_NODE && startNode.parentElement) {
        // 使用备用方法：滚动到父元素
        const parentElement = startNode.parentElement as HTMLElement;
        const parentRect = parentElement.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();

        // 检查是否已经在可见区域内
        if (isInViewport(parentRect, containerRect, 50)) {
          return;
        }

        // 如果是快速连续滚动，使用即时滚动；否则使用平滑滚动
        if (isFastScroll) {
          const targetScrollTop =
            scrollContainer.scrollTop +
            parentRect.top -
            containerRect.top -
            containerRect.height / 2 +
            parentRect.height / 2;

          scrollContainer.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: "auto",
          });
        } else {
          // 取消之前的滚动
          scrollContainer.scrollTo({
            top: scrollContainer.scrollTop,
            behavior: "auto",
          });

          requestAnimationFrame(() => {
            if (scrollId !== currentScrollId) {
              return;
            }

            const newParentRect = parentElement.getBoundingClientRect();
            const newContainerRect = scrollContainer.getBoundingClientRect();

            // 再次检查是否已经在可见区域内
            if (isInViewport(newParentRect, newContainerRect, 50)) {
              return;
            }

            const newTargetScrollTop =
              scrollContainer.scrollTop +
              newParentRect.top -
              newContainerRect.top -
              newContainerRect.height / 2 +
              newParentRect.height / 2;

            scrollContainer.scrollTo({
              top: Math.max(0, newTargetScrollTop),
              behavior: "smooth",
            });
          });
        }
      }
    } catch (fallbackError) {
      console.error("[高亮] 备用滚动方法也失败:", fallbackError);
    }
  }
}
