import { useState, useEffect } from "react";
import { Mode } from "../types";

/**
 * 管理模式切换和持久化
 */
export function useModeManager() {
  // 使用固定的初始值以避免 SSR/客户端不匹配
  const [mode, setModeState] = useState<Mode>("fsa");
  const [serverDirectory, setServerDirectoryState] = useState<string>("./files");
  const [isMounted, setIsMounted] = useState(false);

  // 客户端挂载后，从 localStorage 读取保存的值
  useEffect(() => {
    setIsMounted(true);
    const savedMode = localStorage.getItem("file-viewer-mode") as Mode;
    if (savedMode && ["fsa", "traditional", "server"].includes(savedMode)) {
      setModeState(savedMode);
    }
    const savedDir = localStorage.getItem("file-viewer-server-directory");
    if (savedDir) {
      setServerDirectoryState(savedDir);
    }
  }, []);

  // 保存 mode 和 serverDirectory 到 localStorage
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("file-viewer-mode", mode);
      localStorage.setItem("file-viewer-server-directory", serverDirectory);
    }
  }, [mode, serverDirectory, isMounted]);

  const setMode = (newMode: Mode) => {
    setModeState(newMode);
  };

  const setServerDirectory = (newDir: string) => {
    setServerDirectoryState(newDir);
  };

  return {
    mode,
    setMode,
    serverDirectory,
    setServerDirectory,
    isMounted,
  };
}
