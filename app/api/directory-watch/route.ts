import { NextRequest } from 'next/server';
import { watch } from 'fs';
import { join, relative } from 'path';
import { readdir, stat } from 'fs/promises';
import { canAccessLocalFS } from '@/app/viewer/utils/envDetection';
import { isTextFile } from '@/app/viewer/utils/fileSystem';
import { validatePath, getBasePath } from '../utils/pathValidation';
import { logger } from '@/lib/logger';

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
    console.error(`Error reading directory ${dirPath}:`, error);
  }
  
  return result;
}

/**
 * 实时监听目录变化（Server-Sent Events）
 */
export async function GET(request: NextRequest) {
  // 安全检测
  const { allowed } = canAccessLocalFS(request);
  
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: 'Local file system access is disabled' }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  const dirPath = request.nextUrl.searchParams.get('path');
  
  // 安全：验证路径
  const fullPath = dirPath ? validatePath(dirPath) : BASE_PATH;
  
  if (!fullPath) {
    return new Response(
      JSON.stringify({ error: 'Invalid or unsafe path' }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  // 创建 Server-Sent Events 流
  const stream = new ReadableStream({
    async start(controller) {
      let watcher: ReturnType<typeof watch> | null = null;
      
      try {
        // 监听目录变化（递归监听子目录）
        watcher = watch(fullPath, { recursive: true }, async (eventType, filename) => {
          if (filename) {
            try {
              // 重新收集文件列表
              const files = await collectFiles(fullPath, fullPath);
              
              const data = JSON.stringify({
                type: 'directory-change',
                files,
                changedFile: filename,
                eventType,
                timestamp: new Date().toISOString(),
              });
              controller.enqueue(`data: ${data}\n\n`);
            } catch (error) {
              const errorData = JSON.stringify({ 
                type: 'error', 
                error: error instanceof Error ? error.message : String(error) 
              });
              controller.enqueue(`data: ${errorData}\n\n`);
            }
          }
        });
        
        // 发送初始连接成功消息
        const initData = JSON.stringify({ 
          type: 'connected', 
          message: 'Watching directory for changes',
          path: dirPath
        });
        controller.enqueue(`data: ${initData}\n\n`);
        
        logger.info('Directory watch started', { path: fullPath });
      } catch (error) {
        logger.error('Directory watch error', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          path: dirPath,
        });
        controller.enqueue(`data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`);
        controller.close();
      }
      
      // 连接关闭时清理
      request.signal.addEventListener('abort', () => {
        if (watcher) {
          watcher.close();
          logger.info('Directory watch stopped', { path: fullPath });
        }
        controller.close();
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
