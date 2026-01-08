import { NextRequest } from 'next/server';
import { watch } from 'fs';
import { readFile } from 'fs/promises';
import { canAccessLocalFS } from '@/app/viewer/utils/envDetection';
import { validatePath } from '../utils/pathValidation';
import { logger } from '@/lib/logger';

/**
 * 实时监听文件变化（Server-Sent Events）
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
  
  const filePath = request.nextUrl.searchParams.get('path');
  if (!filePath) {
    return new Response(
      JSON.stringify({ error: 'Path parameter required' }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  // 验证路径
  const safePath = validatePath(filePath);
  if (!safePath) {
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
    start(controller) {
      let watcher: ReturnType<typeof watch> | null = null;
      
      try {
        // 监听文件变化
        watcher = watch(safePath, async (eventType) => {
          if (eventType === 'change') {
            try {
              const content = await readFile(safePath, 'utf-8');
              const stats = await import('fs/promises').then(m => m.stat(safePath));
              
              // 发送更新事件给客户端
              const data = JSON.stringify({ 
                type: 'update', 
                content,
                mtime: stats.mtime.toISOString(),
                timestamp: new Date().toISOString()
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
          message: 'Watching file for changes',
          path: filePath
        });
        controller.enqueue(`data: ${initData}\n\n`);
        
        logger.info('File watch started', { path: safePath });
      } catch (error) {
        logger.error('File watch error', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          path: filePath,
        });
        controller.enqueue(`data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`);
        controller.close();
      }
      
      // 连接关闭时清理
      request.signal.addEventListener('abort', () => {
        if (watcher) {
          watcher.close();
          logger.info('File watch stopped', { path: safePath });
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
      'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
    },
  });
}
