import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { canAccessLocalFS } from '@/app/viewer/utils/envDetection';
import { validatePath, getBasePath } from '../utils/pathValidation';
import { logger } from '@/lib/logger';
// import { isTextFile } from '@/app/viewer/utils/fileSystem';

const BASE_PATH = getBasePath();

/**
 * 递归收集文件
 */
async function collectFiles(
  dirPath: string,
  basePath: string,
  result: any[] = []
): Promise<any[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      const relativePath = relative(basePath, fullPath).replace(/\\/g, '/');
      
      if (entry.isDirectory()) {
        // 递归处理子目录
        await collectFiles(fullPath, basePath, result);
      } else if (entry.isFile() && entry.name.endsWith(".txt")) {
        // } else if (entry.isFile() && isTextFile(entry.name)) {
        const stats = await stat(fullPath);
        result.push({
          name: entry.name,
          path: relativePath,
          fullPath: fullPath,
          size: stats.size,
          mtime: stats.mtime.toISOString(),
        });
      }
    }
  } catch (error) {
    logger.error(`Error reading directory ${dirPath}`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
  
  return result;
}

/**
 * 获取文件列表
 */
export async function GET(request: NextRequest) {
  // 安全检测：是否允许访问本地文件系统
  const { allowed, confidence, reasons } = canAccessLocalFS(request);
  
  if (!allowed) {
    logger.warn('Local file system access denied', {
      reason: reasons.join('; '),
      confidence,
    });
    return NextResponse.json(
      { 
        error: 'Local file system access is disabled',
        reason: reasons.join('; '),
        confidence,
        hint: process.env.NODE_ENV === 'production' 
          ? 'This feature is disabled in production for security. Use FSA mode or traditional input mode instead.'
          : 'Set ENABLE_LOCAL_FS=true in .env.local to enable this feature.'
      },
      { status: 403 }
    );
  }
  
  try {
    const dirPath = request.nextUrl.searchParams.get('path');
    
    // 安全：验证路径
    const safePath = dirPath ? validatePath(dirPath) : BASE_PATH;
    if (!safePath) {
      logger.warn('Invalid or unsafe path', { dirPath });
      return NextResponse.json(
        { error: 'Invalid or unsafe path' },
        { status: 403 }
      );
    }
    
    // 检查路径是否存在且是目录
    const stats = await stat(safePath).catch(() => null);
    if (!stats) {
      logger.warn('Directory does not exist', { path: safePath });
      return NextResponse.json(
        { error: 'Directory does not exist' },
        { status: 404 }
      );
    }
    if (!stats.isDirectory()) {
      logger.warn('Path is not a directory', { path: safePath });
      return NextResponse.json(
        { error: 'Path is not a directory' },
        { status: 400 }
      );
    }
    
    const files = await collectFiles(safePath, safePath);
    logger.info('Files loaded successfully', {
      path: safePath,
      fileCount: files.length,
    });
    return NextResponse.json({ files, directory: safePath });
  } catch (error: any) {
    logger.error('Error reading files', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: error.message || 'Failed to read directory' },
      { status: 500 }
    );
  }
}
