import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const aiRoutes = Router();

// POST /api/ai/breakdown - AI 需求分解
aiRoutes.post('/breakdown', async (req: Request, res: Response) => {
  try {
    const { requirements } = req.body;

    if (!requirements || requirements.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Requirements are required',
      });
    }

    // 使用 claude CLI 调用 slash command
    const prompt = `/pmspec-breakdown\n\n${requirements}`;
    const result = await callClaudeCLI(prompt);

    // 解析结果并生成 Epic/Feature 结构
    const parsed = parseMarkdownToJSON(result);

    res.json({
      success: true,
      data: parsed,
      raw: result,
    });
  } catch (error) {
    console.error('Error in AI breakdown:', error);
    res.status(500).json({
      error: 'AI processing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/ai/estimate - AI 工时估算
aiRoutes.post('/estimate', async (req: Request, res: Response) => {
  try {
    const { featureDescription, complexity } = req.body;

    const prompt = `/pmspec-estimate\n\n功能描述：${featureDescription}\n复杂度：${complexity || '中等'}`;
    const result = await callClaudeCLI(prompt);

    res.json({
      success: true,
      estimate: parseEstimate(result),
      details: result,
    });
  } catch (error) {
    console.error('Error in AI estimate:', error);
    res.status(500).json({
      error: 'AI processing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// 调用 Claude CLI
async function callClaudeCLI(prompt: string): Promise<string> {
  try {
    // 转义 prompt 中的特殊字符
    const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\$/g, '\\$');

    // 使用 claude -p 调用 CLI
    const { stdout, stderr } = await execAsync(
      `claude -p "${escapedPrompt}"`,
      {
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout: 120000, // 2 分钟超时
      }
    );

    if (stderr && stderr.trim()) {
      console.warn('Claude CLI warning:', stderr);
    }

    return stdout.trim();
  } catch (error) {
    console.error('Error calling Claude CLI:', error);
    throw new Error(`Claude CLI error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 解析 Markdown 输出为 JSON 格式
function parseMarkdownToJSON(markdown: string): any {
  try {
    // 提取 Epic 信息
    const epicMatch = markdown.match(/# Epic: (.+)/);
    const epicIdMatch = markdown.match(/\*\*ID\*\*: (EPIC-\d+)/);
    const epicStatusMatch = markdown.match(/\*\*Status\*\*: (\w+)/);
    const epicEstimateMatch = markdown.match(/\*\*Estimate\*\*: (\d+) hours/);
    const epicDescMatch = markdown.match(/## Description\n([\s\S]*?)(?=\n##|$)/);

    // 提取所有 Features
    const featureRegex = /# Feature: (.+?)[\s\S]*?\*\*ID\*\*: (FEAT-\d+)[\s\S]*?\*\*Status\*\*: (\w+)[\s\S]*?\*\*Estimate\*\*: (\d+) hours[\s\S]*?\*\*Skills Required\*\*: (.+?)(?=\n|$)/g;
    const features = [];
    let featureMatch;

    while ((featureMatch = featureRegex.exec(markdown)) !== null) {
      const [, title, id, status, estimate, skills] = featureMatch;

      // 提取该 Feature 的 User Stories
      const storyRegex = new RegExp(`(?<=${id}[\\s\\S]*?)- \\[ \\] STORY-\\d+: (.+?) \\((\\d+)h\\)`, 'g');
      const userStories = [];
      let storyMatch;

      while ((storyMatch = storyRegex.exec(markdown)) !== null) {
        userStories.push({
          id: `STORY-${String(userStories.length + 1).padStart(3, '0')}`,
          description: storyMatch[1],
          estimate: parseInt(storyMatch[2]),
        });
      }

      features.push({
        id,
        title,
        description: title,
        status,
        estimate: parseInt(estimate),
        skillsRequired: skills.split(',').map(s => s.trim()),
        userStories,
      });
    }

    const epic = {
      id: epicIdMatch ? epicIdMatch[1] : 'EPIC-001',
      title: epicMatch ? epicMatch[1] : 'Unknown Epic',
      description: epicDescMatch ? epicDescMatch[1].trim() : '',
      status: epicStatusMatch ? epicStatusMatch[1] : 'planning',
      estimate: epicEstimateMatch ? parseInt(epicEstimateMatch[1]) : 0,
      features: features.map(f => f.id),
    };

    return { epic, features };
  } catch (error) {
    console.error('Error parsing Markdown:', error);
    // 返回原始内容
    return { raw: markdown };
  }
}

// 解析工时估算结果
function parseEstimate(response: string): any {
  try {
    // 尝试从 Markdown 中提取估算信息
    const devMatch = response.match(/开发工时[：:]\s*(\d+)/);
    const testMatch = response.match(/测试工时[：:]\s*(\d+)/);
    const totalMatch = response.match(/总工时[：:]\s*(\d+)/);

    if (devMatch || testMatch || totalMatch) {
      return {
        development: devMatch ? parseInt(devMatch[1]) : 0,
        testing: testMatch ? parseInt(testMatch[1]) : 0,
        total: totalMatch ? parseInt(totalMatch[1]) : 0,
      };
    }

    // 如果找不到，返回原始文本
    return { total: 0, raw: response };
  } catch (error) {
    return { total: 0, raw: response };
  }
}
