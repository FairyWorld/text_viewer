# 搜索高亮逻辑分析

## 数据流

### 1. 搜索输入流程
```
用户输入搜索关键词 (中文: "中文")
  ↓
SearchBar.onChange 
  ↓
useSearch.setSearchQuery("中文")
  ↓
useSearch.handleSearchChange("中文")
```

### 2. 匹配数量计算 (能正常工作 ✓)
```
useSearch.useEffect [content, searchQuery]
  ↓
countMatches(content, "中文")
  ↓
content: 原始文本 "这是测试中文"
  ↓
regex: /中文/giu (Unicode 支持)
  ↓
content.match(regex) → ["中文"] ✓
  ↓
matchCount = 1 ✓
```

### 3. 内容渲染和高亮 (问题可能在这里 ❌)
```
FilePreview.renderContent(selectedFile.content, searchQuery)
  ↓
步骤1: converter.toHtml(content)
  - 原始文本: "这是测试中文"
  - 转换后: "<span style=\"color:#E5E7EB\">这是测试中文</span>"
  ↓
步骤2: 移除所有 HTML 标签
  - html.replace(/<[^>]+>/g, ...)
  - 结果: "___HTML_TAG_PLACEHOLDER_xxx0__END__这是测试中文___HTML_TAG_PLACEHOLDER_xxx1__END__"
  ↓
步骤3: 在纯文本中匹配和高亮
  - html.replace(regex, ...)
  - 如果中文被正确匹配: "___HTML_TAG_PLACEHOLDER_xxx0__END__这是测试<mark>中文</mark>___HTML_TAG_PLACEHOLDER_xxx1__END__"
  ↓
步骤4: 恢复 HTML 标签
  - 替换占位符为原始标签
  - 最终: "<span style=\"color:#E5E7EB\">这是测试<mark>中文</mark></span>"
```

### 4. DOM 查找和定位 (找不到 mark.search-match ❌)
```
useSearch.scrollToMatch(index)
  ↓
contentRef.current.querySelectorAll("mark.search-match")
  ↓
问题: 如果步骤3的高亮失败，这里就找不到元素
```

## 可能的问题点

1. **占位符可能被误匹配**: 如果占位符格式 `___HTML_TAG_PLACEHOLDER_xxx0__END__` 包含中文字符（不太可能），可能被匹配
2. **占位符恢复失败**: 占位符在恢复时使用了正则，可能转义有问题
3. **中文在 ANSI 转换时被转义**: 虽然中文通常不会被转义，但需要确认
4. **DOM 更新时机**: mark 标签还没渲染到 DOM，就尝试查找了
