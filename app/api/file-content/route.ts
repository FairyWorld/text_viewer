import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { canAccessLocalFS } from '@/app/viewer/utils/envDetection';
import { validatePath } from '../utils/pathValidation';
import { logger } from '@/lib/logger';

/**
 * 读取文件内容（实时读取最新内容）
 */
export async function GET(request: NextRequest) {
  // 安全检测
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
        confidence
      },
      { status: 403 }
    );
  }
  
  try {
    const filePath = request.nextUrl.searchParams.get('path');
    if (!filePath) {
      logger.warn('File content request missing path parameter');
      return NextResponse.json({ error: 'Path parameter required' }, { status: 400 });
    }
    
    // 安全：验证路径
    const safePath = validatePath(filePath);
    if (!safePath) {
      logger.warn('Invalid or unsafe path', { filePath });
      return NextResponse.json(
        { error: 'Invalid or unsafe path' },
        { status: 403 }
      );
    }
    
    // 读取文件内容（实时读取最新内容）
    const content = await readFile(safePath, 'utf-8');
    const stats = await stat(safePath);
    
    logger.info('File content loaded', {
      path: safePath,
      size: stats.size,
    });
    
    return NextResponse.json({
      content,
      size: stats.size,
      mtime: stats.mtime.toISOString(),
      path: filePath,
    });
  } catch (error: any) {
    logger.error('Error reading file', {
      error: error.message,
      stack: error.stack,
      path: filePath,
    });
    return NextResponse.json(
      { error: error.message || 'Failed to read file' },
      { status: 500 }
    );
  }
}
