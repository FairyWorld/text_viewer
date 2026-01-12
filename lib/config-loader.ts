/**
 * 配置加载工具
 * 优先级：环境变量 > /app/$PROJECT_NAME/.env.local
 * 注意：环境变量优先级最高，不会被文件覆盖
 */

import fs from 'fs';
import path from 'path';

const PROJECT_NAME = process.env.PROJECT_NAME || 'text_viewer';
const PROJECT_DIR = `/app/${PROJECT_NAME}`;

/**
 * 加载环境变量文件
 * 优先级：环境变量（已设置）> /app/$PROJECT_NAME/.env.local
 * 注意：只加载文件中未设置的环境变量，已存在的环境变量不会被覆盖
 */
export function loadEnvFiles(): void {
  // 加载代码目录的 .env.local（如果存在）
  const projectEnvFile = path.join(PROJECT_DIR, '.env.local');
  if (fs.existsSync(projectEnvFile)) {
    console.log(`[Config] Loading from ${projectEnvFile}`);
    loadEnvFile(projectEnvFile);
  }
  
  console.log('[Config] Environment variables take priority over config files');
}

/**
 * 加载单个环境变量文件
 */
function loadEnvFile(filePath: string): void {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      // 跳过空行和注释
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // 解析 KEY=VALUE
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // 移除引号（如果有）
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        // 设置环境变量（如果还没有设置）
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  } catch (error) {
    console.error(`[Config] Error loading ${filePath}:`, error);
  }
}

/**
 * 获取配置文件路径（代码目录）
 */
export function getConfigPath(filename: string): string | null {
  const projectPath = path.join(PROJECT_DIR, filename);
  if (fs.existsSync(projectPath)) {
    return projectPath;
  }

  return null;
}

/**
 * 读取配置文件内容
 */
export function readConfigFile(filename: string): string | null {
  const configPath = getConfigPath(filename);
  if (configPath) {
    try {
      return fs.readFileSync(configPath, 'utf-8');
    } catch (error) {
      console.error(`[Config] Error reading ${configPath}:`, error);
    }
  }
  return null;
}
