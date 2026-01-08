import { NextRequest, NextResponse } from 'next/server';
import { canAccessLocalFS, detectLocalEnvironment } from '@/app/viewer/utils/envDetection';
import { hostname } from 'os';

/**
 * 检测服务端模式是否可用
 */
export async function GET(request: NextRequest) {
  const envCheck = detectLocalEnvironment();
  const { allowed, confidence, reasons } = canAccessLocalFS(request);
  
  const status = {
    available: allowed,
    confidence,
    environment: process.env.NODE_ENV || 'unknown',
    hostname: hostname(),
    enableLocalFS: process.env.ENABLE_LOCAL_FS,
    filesDirectory: process.env.FILES_DIRECTORY || './files',
    reasons: envCheck.reasons,
    requestReasons: reasons,
    message: allowed 
      ? 'Server mode is available'
      : 'Server mode is disabled for security reasons'
  };
  
  // 服务器端日志
  console.log('\n=== 服务端模式状态检测 ===');
  console.log(`环境: ${status.environment}`);
  console.log(`主机名: ${status.hostname}`);
  console.log(`ENABLE_LOCAL_FS: ${status.enableLocalFS || '(未设置)'}`);
  console.log(`FILES_DIRECTORY: ${status.filesDirectory}`);
  console.log(`可用状态: ${allowed ? '✅ 可用' : '❌ 不可用'}`);
  console.log(`可信度: ${confidence}`);
  console.log('环境检测原因:');
  envCheck.reasons.forEach((reason, i) => {
    console.log(`  ${i + 1}. ${reason}`);
  });
  if (reasons.length > envCheck.reasons.length) {
    console.log('请求检测原因:');
    reasons.slice(envCheck.reasons.length).forEach((reason) => {
      console.log(`  - ${reason}`);
    });
  }
  console.log('==========================\n');
  
  return NextResponse.json(status);
}
