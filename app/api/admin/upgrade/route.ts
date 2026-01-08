import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { checkAuth } from '@/app/api/auth/check';
import { logger } from '@/lib/logger';

const execAsync = promisify(exec);

/**
 * 升级 API
 * 执行升级脚本
 */
export async function POST(request: NextRequest) {
  // 检查认证
  const authError = await checkAuth(request);
  if (authError) {
    return authError;
  }
  
  try {
    logger.info('Upgrade started');
    
    // 执行升级脚本
    const { stdout, stderr } = await execAsync('sh /app/scripts/upgrade.sh', {
      cwd: '/app',
      timeout: 300000, // 5 分钟超时
    });
    
    logger.info('Upgrade completed', {
      stdout: stdout.substring(0, 500), // 只记录前500字符
      hasStderr: !!stderr,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Upgrade started',
      stdout: stdout || '',
      stderr: stderr || '',
    });
  } catch (error: any) {
    logger.error('Upgrade failed', {
      error: error.message,
      stdout: error.stdout?.substring(0, 500),
      stderr: error.stderr?.substring(0, 500),
    });
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Upgrade failed',
        stdout: error.stdout || '',
        stderr: error.stderr || '',
      },
      { status: 500 }
    );
  }
}

/**
 * GET 方法也支持（用于测试）
 */
export async function GET(request: NextRequest) {
  // 检查认证
  const authError = await checkAuth(request);
  if (authError) {
    return authError;
  }
  
  return NextResponse.json({
    message: 'Use POST method to trigger upgrade',
    script: '/app/scripts/upgrade.sh',
  });
}
