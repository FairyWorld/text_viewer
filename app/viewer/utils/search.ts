import Convert from "ansi-to-html";

/**
 * Solarized Dark 主题配置
 * 参考: https://ethanschoonover.com/solarized/
 *
 * ANSI 16 色映射说明：
 * 0-7: 标准颜色 (黑、红、绿、黄、蓝、洋红、青、白)
 * 8-15: 亮色版本 (亮黑、亮红、亮绿、亮黄、亮蓝、亮洋红、亮青、亮白)
 */
const SolarizedDarkTheme = {
  fg: "#839496", // Base0 - 默认前景色
  bg: "#002b36", // Base03 - 默认背景色
  colors: {
    // 标准颜色 (0-7)
    0: "#002b36", // Base03 - 黑色
    1: "#dc322f", // Red - 红色
    2: "#859900", // Green - 绿色
    3: "#b58900", // Yellow - 黄色
    4: "#268bd2", // Blue - 蓝色
    5: "#d33682", // Magenta - 洋红色
    6: "#2aa198", // Cyan - 青色
    7: "#eee8d5", // Base2 - 白色

    // 亮色版本 (8-15)
    8: "#073642", // Base02 - 亮黑色
    9: "#cb4b16", // Orange - 亮红色（橙色）
    10: "#8ece9e", // Base1 - 亮绿色（更亮的灰色调，符合 Solarized 设计）
    11: "#657b83", // Base00 - 亮黄色
    12: "#839496", // Base0 - 亮蓝色
    13: "#6c71c4", // Violet - 亮洋红色（紫罗兰色）
    14: "#586e75", // Base01 - 亮青色
    15: "#fdf6e3", // Base3 - 亮白色
  },
};

/**
 * ANSI 转 HTML 转换器 - 使用 Solarized Dark 主题
 */
const converter = new Convert({
  ...SolarizedDarkTheme,
  newline: true,
  escapeXML: true,
  stream: false,
});

/**
 * 渲染内容，支持搜索高亮和 ANSI 解析
 * @param content 原始文本内容
 * @param searchQuery 搜索关键词（可选）
 * @returns HTML 字符串对象
 */
export function renderContent(
  content: string
  // searchQuery 参数已移除，改用 CSS Custom Highlight API 在客户端处理
): { __html: string } {
  // 只进行 ANSI 转换，不处理搜索高亮
  // 搜索高亮现在通过 CSS Custom Highlight API 在客户端实现
  const html = converter.toHtml(content);

  // 注释掉原来的搜索高亮逻辑，改用 CSS Custom Highlight API
  /* 如果有搜索关键词，进行高亮处理
  if (searchQuery?.trim()) {
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedQuery, "giu"); // 添加 'u' flag 支持 Unicode（中文等）

    // 方法：在 HTML 中查找并高亮，但要避免在 HTML 标签内替换
    // 问题：ansi-to-html 会将中文转换为 HTML 实体编码（如 &#x8FD9;），需要先解码才能匹配
    // 使用一个技巧：先标记所有 HTML 标签，然后解码 HTML 实体，匹配高亮，再恢复标签

    const tagPlaceholderBase = `__HTML_TAG_PLACEHOLDER_${Math.random()
      .toString(36)
      .substring(2, 11)}__`;
    const tagPlaceholders: Array<{ placeholder: string; tag: string }> = [];
    let tagCounter = 0;

    // 步骤1: 保存所有 HTML 标签（使用唯一占位符，避免和内容冲突）
    html = html.replace(/<[^>]+>/g, (match) => {
      const placeholder = `${tagPlaceholderBase}${tagCounter++}__END__`;
      tagPlaceholders.push({ placeholder, tag: match });
      return placeholder;
    });

    // 步骤2: 解码 HTML 实体编码（将 &#x8FD9; 转换为 "这"）
    // 问题：ansi-to-html 会将中文转换为 HTML 实体编码（如 &#x8FD9; = "这"）
    // 解决方案：先解码 HTML 实体，用正则匹配，然后重新编码匹配的文本
    const decodeHTMLEntities = (text: string): string => {
      if (typeof document !== "undefined") {
        // 客户端：使用 DOM API 解码（更准确）
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = text;
        return tempDiv.textContent || tempDiv.innerText || text;
      } else {
        // 服务端：手动解码 HTML 实体
        return text
          .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) =>
            String.fromCodePoint(parseInt(hex, 16))
          )
          .replace(/&#(\d+);/g, (_, dec) =>
            String.fromCodePoint(parseInt(dec, 10))
          )
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&");
      }
    };

    // 解码 HTML 实体，这样中文就能被正则表达式匹配了
    html = decodeHTMLEntities(html);
    console.log(
      `[搜索高亮] 解码后 HTML 片段（前100字符）: ${html.substring(0, 100)}`
    );

    // 步骤2.5: 保护占位符，避免占位符中的字符被搜索匹配到
    // 使用另一个占位符系统来临时替换，确保占位符不会被搜索关键词匹配
    const protectedPlaceholderBase = `__PROTECTED_PLACEHOLDER_${Math.random()
      .toString(36)
      .substring(2, 11)}__`;
    const protectedPlaceholders: Array<{
      placeholder: string;
      original: string;
    }> = [];
    let protectedCounter = 0;

    // 保护所有占位符（使用更安全的占位符格式）
    tagPlaceholders.forEach(({ placeholder }) => {
      const protectedPlaceholder = `${protectedPlaceholderBase}${protectedCounter++}__PROTECTED_END__`;
      protectedPlaceholders.push({
        placeholder: protectedPlaceholder,
        original: placeholder,
      });
      html = html.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        protectedPlaceholder
      );
    });

    // 步骤3: 在纯文本中高亮匹配项（此时所有 HTML 标签占位符已被保护，且实体已解码）
    // 关键：英文和数字不需要编码回 HTML 实体，只有中文需要编码回去
    const beforeHighlight = html;
    html = html.replace(regex, (match) => {
      console.log(`[搜索高亮] 匹配到: "${match}"`);

      // 检查匹配的文本是否包含非 ASCII 字符（如中文）
      const hasNonASCII = /[\u0080-\u{10FFFF}]/u.test(match);

      // 只有包含非 ASCII 字符时才编码回 HTML 实体，英文和数字保持原样
      let processedMatch: string;
      if (hasNonASCII) {
        // 包含中文：编码回 HTML 实体，以保持与原始格式一致
        processedMatch = match
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;")
          .replace(/[\u0080-\u{10FFFF}]/gu, (char) => {
            // 将 Unicode 字符（包括中文）编码为 &#x...; 格式
            const codePoint = char.codePointAt(0);
            if (codePoint && codePoint > 127) {
              return `&#x${codePoint.toString(16).toUpperCase()};`;
            }
            return char;
          });
      } else {
        // 英文和数字：只转义 HTML 特殊字符，不需要编码为 HTML 实体
        processedMatch = match
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");
      }

      return `<mark class="bg-yellow-500 text-gray-900 search-match">${processedMatch}</mark>`;
    });

    // 步骤3.5: 恢复被保护的占位符
    protectedPlaceholders.forEach(({ placeholder, original }) => {
      html = html.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        original
      );
    });

    // 调试：检查是否有匹配
    if (html === beforeHighlight) {
      console.warn(
        `[搜索高亮] 警告：未找到匹配项。搜索关键词: "${searchQuery}", 转义后: "${escapedQuery}"`
      );
      console.warn(`[搜索高亮] 正则表达式:`, regex);
      console.warn(
        `[搜索高亮] HTML 片段（前300字符）:`,
        beforeHighlight.substring(0, 300)
      );
    }

    // 步骤4: 恢复 HTML 标签（反向恢复，避免占位符被误替换）
    for (let i = tagPlaceholders.length - 1; i >= 0; i--) {
      const { placeholder, tag } = tagPlaceholders[i];
      // 使用全局替换，确保所有占位符都被替换
      html = html.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        tag
      );
    }

    // 调试：检查最终结果
    const markCount = (
      html.match(/<mark class="bg-yellow-500 text-gray-900 search-match">/g) ||
      []
    ).length;
    console.log(`[搜索高亮] 最终生成的 mark 标签数量: ${markCount}`);
  }
  */

  return { __html: html };
}

/**
 * 计算搜索匹配数量
 * @param content 文本内容
 * @param searchQuery 搜索关键词
 * @returns 匹配数量
 */
export function countMatches(content: string, searchQuery: string): number {
  if (!searchQuery.trim()) return 0;

  const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escapedQuery, "giu"); // 添加 'u' flag 支持 Unicode（中文等）
  const matches = content.match(regex);
  return matches ? matches.length : 0;
}
