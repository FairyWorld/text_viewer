import { FileItem } from "../types";

/**
 * 文本文件扩展名列表
 */
const TEXT_FILE_EXTENSIONS = [
  // 常见文本文件
  "txt",
  // "md",
  // "markdown",
  // // 代码文件
  // "js",
  // "jsx",
  // "ts",
  // "tsx",
  // "mjs",
  // "cjs",
  // "py",
  // "pyw",
  // "pyi",
  // "html",
  // "htm",
  // "xhtml",
  // "css",
  // "scss",
  // "sass",
  // "less",
  // "json",
  // "jsonc",
  // "xml",
  // "xsl",
  // "xslt",
  // "yaml",
  // "yml",
  // "toml",
  // // 配置文件
  // "ini",
  // "conf",
  // "env",
  // // 脚本文件
  // "sh",
  // "bat",
  // "cmd",
  // "ps1",
  // // 数据文件
  // "csv",
  // "tsv",
  // "log",
  // // 其他
  // "vue",
  // "svelte",
  // "sql",
  // "diff",
  // "patch",
];

/**
 * 判断文件是否是文本文件
 * @param fileName 文件名
 * @param mimeType MIME 类型（可选）
 * @returns 是否是文本文件
 */
export function isTextFile(fileName: string, _mimeType?: string): boolean {
  // 如果提供了 MIME 类型，优先检查
  // if (mimeType) {
  //   // 检查是否是文本类型的 MIME
  //   if (mimeType.startsWith("text/")) {
  //     return true;
  //   }
  //   // 检查一些常见的代码文件 MIME 类型
  //   const codeMimeTypes = [
  //     "application/json",
  //     "application/xml",
  //     "application/javascript",
  //     "application/typescript",
  //   ];
  //   if (codeMimeTypes.includes(mimeType)) {
  //     return true;
  //   }
  // }

  // const lowerFileName = fileName.toLowerCase();

  // // 检查没有扩展名的常见配置文件（如 config, .env, dockerfile）
  // const noExtFiles = ["config", "dockerfile", "makefile"];
  // if (
  //   noExtFiles.some(
  //     (name) => lowerFileName === name || lowerFileName.endsWith(name)
  //   )
  // ) {
  //   return true;
  // }

  // // 检查 .env.* 文件（如 .env.local, .env.development）
  // if (lowerFileName.startsWith(".env") || lowerFileName.startsWith("env.")) {
  //   return true;
  // }

  // 基于文件扩展名判断（只支持 .txt）
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) return false;

  return TEXT_FILE_EXTENSIONS.includes(ext);
}

/**
 * 从文件句柄读取最新内容
 * @param fileHandle 文件句柄
 * @returns 文件内容
 */
export async function loadFileContent(
  fileHandle: FileSystemFileHandle
): Promise<string> {
  const file = await fileHandle.getFile();
  return await file.text();
}

/**
 * 递归遍历目录，收集所有文本文件
 * @param dirHandle 目录句柄
 * @param rootDirName 根目录名称（用于统一路径格式，使其与传统模式一致）
 * @param basePath 基础路径
 * @param txtFiles 文件列表（用于递归）
 * @returns 文本文件列表
 */
export async function collectTxtFiles(
  dirHandle: FileSystemDirectoryHandle,
  rootDirName: string = "",
  basePath: string = "",
  txtFiles: FileItem[] = []
): Promise<FileItem[]> {
  for await (const entry of (dirHandle as any).values()) {
    // 只支持 .txt 文件
    if (entry.kind === "file" && entry.name.endsWith(".txt")) {
      // 改为允许读取任何文本文件
      // if (entry.kind === "file" && isTextFile(entry.name)) {
      try {
        const file = await entry.getFile();
        // 如果提供了根目录名称，构建与传统模式一致的路径格式
        // 例如：rootDirName = "files", basePath = "" -> "files/file1.txt"
        //      rootDirName = "files", basePath = "subdir" -> "files/subdir/file2.txt"
        let filePath: string;
        if (rootDirName && basePath) {
          filePath = `${rootDirName}/${basePath}/${entry.name}`;
        } else if (rootDirName) {
          filePath = `${rootDirName}/${entry.name}`;
        } else if (basePath) {
          filePath = `${basePath}/${entry.name}`;
        } else {
          filePath = entry.name;
        }
        txtFiles.push({
          name: entry.name,
          path: filePath,
          content: "", // 先不读取内容，等选择时再读取
          file: null,
          size: file.size,
          fileHandle: entry as FileSystemFileHandle,
        });
      } catch (error) {
        console.error(`Error reading file ${entry.name}:`, error);
      }
    } else if (entry.kind === "directory") {
      // 递归处理子目录
      const subDirPath = basePath ? `${basePath}/${entry.name}` : entry.name;
      await collectTxtFiles(
        entry as FileSystemDirectoryHandle,
        rootDirName,
        subDirPath,
        txtFiles
      );
    }
  }
  return txtFiles;
}
