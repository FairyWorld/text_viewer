# 代码重构拆分方案

## 当前问题
- `app/viewer/page.tsx` 有 1176 行，代码过长
- 三个模式（FSA、传统、服务端）的逻辑混在一起
- UI 和业务逻辑耦合
- 模式切换逻辑重复

## 拆分方案

### 1. Hooks 拆分

#### `hooks/useModeManager.ts`
- 管理模式切换逻辑
- localStorage 持久化
- 模式切换时的清理逻辑
- 状态：`mode`, `serverDirectory`, `isMounted`

#### `hooks/useFSAMode.ts`
- FSA 模式相关逻辑
- `handleFileSelectFSA`
- `handleOpenDirectory`
- `refreshDirectory`
- 状态：`dirHandleRef`, `currentDir`

#### `hooks/useServerModeFileOperations.ts`
- 服务端模式相关逻辑
- `loadServerFiles`
- `handleFileSelectServer`
- 状态：`serverDirectory`, `currentDir`

#### `hooks/useTraditionalMode.ts`
- 传统模式相关逻辑
- `handleFileSelect`
- `handleFolderSelect`
- `handleOpenFiles`
- `handleOpenFolder`
- Refs: `fileInputRef`, `folderInputRef`

#### `hooks/useFileWatcher.ts`
- 文件监听逻辑（SSE）
- `startFileWatch`
- `startDirectoryWatch`
- 清理逻辑
- Refs: `fileWatchEventSourceRef`, `directoryWatchEventSourceRef`

#### `hooks/useFileNavigation.ts`
- 文件导航逻辑
- `handleFileClick`
- `toggleDirectory`
- 键盘导航（ArrowUp/ArrowDown）
- 状态：`selectedFile`, `selectedIndex`

### 2. 组件拆分

#### `components/ModeSelector.tsx`
- 模式选择按钮（FSA、传统、服务端）
- 统一模式切换逻辑
- 减少重复代码

#### `components/FSAControls.tsx`
- FSA 模式的 UI 控件
- 选择目录按钮
- 刷新按钮
- 当前目录显示

#### `components/ServerControls.tsx`
- 服务端模式的 UI 控件
- 目录输入框
- 加载/刷新按钮
- 状态显示（可用/不可用）

#### `components/TraditionalControls.tsx`
- 传统模式的 UI 控件
- 选择文件按钮
- 选择文件夹按钮
- 隐藏的 input 元素

### 3. 重构后的 page.tsx 结构

```typescript
export default function TxtViewer() {
  // 基础状态
  const [files, setFiles] = useState<FileItem[]>([]);
  const [fileTree, setFileTree] = useState<TreeNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  
  // Refs
  const fileListRef = useRef<HTMLUListElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Hooks
  const { toast } = useToast();
  const { available: serverModeAvailable, checking: checkingServerMode, details: serverModeDetails } = useServerMode();
  const { mode, setMode, serverDirectory, setServerDirectory, isMounted } = useModeManager();
  const fsaMode = useFSAMode({ mode, setFiles, setFileTree, setCurrentDir, setIsLoading, toast });
  const serverMode = useServerModeFileOperations({ mode, serverDirectory, setServerDirectory, setFiles, setFileTree, setCurrentDir, setIsLoading, isMounted, toast });
  const traditionalMode = useTraditionalMode({ mode, setFiles, setFileTree, setIsLoading });
  const fileWatcher = useFileWatcher({ mode, selectedFile, setSelectedFile, setFiles });
  const navigation = useFileNavigation({ files, fileTree, mode, setSelectedFile, setSelectedIndex, fsaMode, serverMode, traditionalMode });
  
  // 渲染
  return (
    <>
      <Toaster />
      <div className="flex h-screen bg-gray-900 text-gray-100">
        {/* 左侧文件列表 */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <ModeSelector 
              mode={mode} 
              setMode={setMode}
              serverModeAvailable={serverModeAvailable}
              onModeChange={fileWatcher.cleanup}
            />
            {mode === "fsa" && <FSAControls {...fsaMode} />}
            {mode === "server" && <ServerControls {...serverMode} serverModeAvailable={serverModeAvailable} checkingServerMode={checkingServerMode} serverModeDetails={serverModeDetails} />}
            {mode === "traditional" && <TraditionalControls {...traditionalMode} />}
          </div>
          {/* 文件列表 */}
        </div>
        {/* 右侧预览 */}
      </div>
    </>
  );
}
```

## 拆分优先级

### 高优先级（立即拆分）
1. ✅ `useModeManager` - 模式管理逻辑重复
2. ✅ `ModeSelector` - UI 重复代码多
3. ✅ `useFileWatcher` - 独立的监听逻辑

### 中优先级（后续拆分）
4. `useFSAMode` - FSA 模式逻辑
5. `useServerModeFileOperations` - 服务端模式逻辑
6. `useTraditionalMode` - 传统模式逻辑
7. `FSAControls`, `ServerControls`, `TraditionalControls` - UI 组件

### 低优先级（可选）
8. `useFileNavigation` - 导航逻辑相对简单

## 预期效果
- `page.tsx` 从 1176 行减少到约 200-300 行
- 每个 hook 约 100-200 行
- 每个组件约 50-100 行
- 代码可维护性提升
- 模式逻辑清晰分离
