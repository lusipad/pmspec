import { useMemo, useState } from 'react';

interface ParsedUserStory {
  id: string;
  description: string;
  estimate: number;
}

interface ParsedFeature {
  id: string;
  title: string;
  description: string;
  status: string;
  estimate: number;
  skillsRequired: string[];
  userStories: ParsedUserStory[];
}

interface ParsedEpic {
  id: string;
  title: string;
  description: string;
  status: string;
  estimate: number;
  features: string[];
}

interface ParsedBreakdown {
  epic: ParsedEpic;
  features: ParsedFeature[];
}

export function AIAssistant() {
  const [requirements, setRequirements] = useState('');
  const [aiOutput, setAiOutput] = useState('');
  const [breakdown, setBreakdown] = useState<ParsedBreakdown | null>(null);
  const [requirementsError, setRequirementsError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState<'idle' | 'success' | 'failed'>('idle');
  const [jsonCopied, setJsonCopied] = useState<'idle' | 'success' | 'failed'>('idle');

  const promptPreview = useMemo(() => buildSlashCommand(requirements), [requirements]);

  const handleCopyPrompt = async () => {
    if (!requirements.trim()) {
      setRequirementsError('请先输入需求描述，再复制 slash 命令。');
      return;
    }

    try {
      await navigator.clipboard.writeText(promptPreview);
      setPromptCopied('success');
      setRequirementsError(null);
    } catch {
      setPromptCopied('failed');
    }
  };

  const handleParseOutput = () => {
    if (!aiOutput.trim()) {
      setParseError('请先粘贴 Claude 返回的 Markdown。');
      setBreakdown(null);
      return;
    }

    try {
      const parsed = parseBreakdownMarkdown(aiOutput);
      setBreakdown(parsed);
      setParseError(null);
    } catch (error) {
      setBreakdown(null);
      setParseError(
        error instanceof Error ? error.message : '解析失败，请检查 Markdown 是否符合模板。'
      );
    }
  };

  const handleReset = () => {
    setRequirements('');
    setAiOutput('');
    setBreakdown(null);
    setRequirementsError(null);
    setParseError(null);
    setPromptCopied('idle');
    setJsonCopied('idle');
  };

  const handleCopyJson = async () => {
    if (!breakdown) {
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(breakdown, null, 2));
      setJsonCopied('success');
    } catch {
      setJsonCopied('failed');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">AI 助手（手动执行模式）</h2>
        <p className="text-gray-600">
          按照项目内置的 slash 命令模版，在 Claude Code 中执行 AI 需求分解，然后粘贴结果进行解析。
        </p>
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold mb-2">使用流程</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>在下方填写需求描述并复制 slash 命令。</li>
            <li>在 Claude Code 中执行 `/pmspec-breakdown` 并等待结果。</li>
            <li>将 Claude 返回的 Markdown 粘贴到“AI 输出”文本框。</li>
            <li>点击“解析 AI 输出”，即可在右侧查看结构化结果。</li>
          </ol>
          <p className="mt-3 text-xs text-blue-700">
            该流程完全在本地运行，不会自动调用任何外部 AI 接口。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-xl font-semibold text-gray-900">步骤一 · 准备需求与命令</h3>
            <p className="mt-2 text-sm text-gray-600">
              输入需求后可以直接复制带有 `/pmspec-breakdown` 前缀的完整提示词，粘贴到 Claude
              Code（或其他支持 slash 命令的 IDE）中运行。
            </p>

            <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="requirements">
              需求描述
            </label>
            <textarea
              id="requirements"
              value={requirements}
              onChange={(event) => {
                setRequirements(event.target.value);
                setRequirementsError(null);
                setPromptCopied('idle');
              }}
              placeholder={`例如：
我们需要搭建一个多租户客服系统，关键目标：
- 客户经理可以在单一界面接入多渠道对话
- 需要内置知识库与相似问题推荐
- 管理员要查看客服绩效和服务质量日报`}
              className="mt-2 h-48 w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {requirementsError && (
              <p className="mt-2 text-sm text-red-600">{requirementsError}</p>
            )}

            <label
              className="mt-5 block text-sm font-medium text-gray-700"
              htmlFor="promptPreview"
            >
              Slash 命令预览
            </label>
            <textarea
              id="promptPreview"
              value={promptPreview}
              readOnly
              className="mt-2 h-32 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm text-gray-700"
            />

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="flex-1 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                复制 slash 命令
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg bg-gray-200 px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
              >
                清空
              </button>
            </div>
            {promptCopied === 'success' && (
              <p className="mt-2 text-sm text-green-600">已复制到剪贴板。</p>
            )}
            {promptCopied === 'failed' && (
              <p className="mt-2 text-sm text-red-600">复制失败，请手动选择文本复制。</p>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-xl font-semibold text-gray-900">步骤二 · 粘贴 AI 输出</h3>
            <p className="mt-2 text-sm text-gray-600">
              将 Claude 返回的 Markdown 原文粘贴在此，并点击解析按钮。解析逻辑与 CLI
              工具保持一致，可在本地快速验证结构。
            </p>

            <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="aiOutput">
              AI 输出（Markdown）
            </label>
            <textarea
              id="aiOutput"
              value={aiOutput}
              onChange={(event) => {
                setAiOutput(event.target.value);
                setParseError(null);
                setJsonCopied('idle');
              }}
              placeholder={`请粘贴 Claude 返回的 Markdown，例如：
# Epic: 多租户客服系统
- **ID**: EPIC-010
- **Status**: planning
...`}
              className="mt-2 h-64 w-full resize-none rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              type="button"
              onClick={handleParseOutput}
              className="mt-4 w-full rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              解析 AI 输出
            </button>

            {parseError && <p className="mt-2 text-sm text-red-600">{parseError}</p>}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-xl font-semibold text-gray-900">结构化结果</h3>
          {!breakdown && !parseError && (
            <div className="mt-8 flex h-64 flex-col items-center justify-center text-center text-gray-400">
              <p className="text-5xl mb-4">🧠</p>
              <p className="text-sm">粘贴 AI 输出并点击“解析 AI 输出”即可在此查看结果。</p>
            </div>
          )}

          {breakdown && (
            <div className="mt-4 space-y-5">
              <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="text-lg font-semibold text-blue-900">Epic · {breakdown.epic.title}</h4>
                <p className="mt-2 text-sm text-blue-900">{breakdown.epic.description || '暂无描述'}</p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-blue-800">
                  <span>编号：{breakdown.epic.id}</span>
                  <span>状态：{breakdown.epic.status || 'planning'}</span>
                  <span>预估：{breakdown.epic.estimate}h</span>
                </div>
              </section>

              {breakdown.features.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <h4 className="text-lg font-semibold text-gray-900">
                      Features（{breakdown.features.length}）
                    </h4>
                    <span className="text-xs text-gray-500">
                      {breakdown.epic.features.length > 0 && `Epic 关联：${breakdown.epic.features.join(', ')}`}
                    </span>
                  </div>

                  {breakdown.features.map((feature) => (
                    <article
                      key={feature.id}
                      className="rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md"
                    >
                      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <h5 className="text-base font-semibold text-gray-900">{feature.title}</h5>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
                          <span>ID：{feature.id}</span>
                          <span>状态：{feature.status}</span>
                          <span>预估：{feature.estimate}h</span>
                        </div>
                      </header>

                      {feature.description && (
                        <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
                      )}

                      {feature.skillsRequired.length > 0 && (
                        <p className="mt-3 text-xs text-gray-500">
                          技能需求：{feature.skillsRequired.join(', ')}
                        </p>
                      )}

                      {feature.userStories.length > 0 && (
                        <div className="mt-4 border-l-2 border-gray-200 pl-4">
                          <p className="text-xs font-medium text-gray-700">User Stories</p>
                          <ul className="mt-2 space-y-1 text-xs text-gray-600">
                            {feature.userStories.map((story) => (
                              <li key={story.id}>
                                ✅ {story.id} · {story.description}（{story.estimate}h）
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </article>
                  ))}
                </section>
              )}

              <div className="border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="w-full rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700"
                >
                  复制 JSON 结构
                </button>
                {jsonCopied === 'success' && (
                  <p className="mt-2 text-sm text-green-600">已复制到剪贴板，可用于保存或校验。</p>
                )}
                {jsonCopied === 'failed' && (
                  <p className="mt-2 text-sm text-red-600">复制失败，请手动复制显示内容。</p>
                )}
              </div>
            </div>
          )}

          {parseError && !breakdown && (
            <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">解析失败</p>
              <p className="mt-1">{parseError}</p>
              <p className="mt-2">
                请确认 AI 输出包含 Epic / Feature / User Story 章节，并遵循仓库中的
                `.claude/commands/pmspec-breakdown.md` 模板。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildSlashCommand(requirements: string): string {
  const trimmed = requirements.trim();
  return trimmed ? `/pmspec-breakdown\n\n${trimmed}` : '/pmspec-breakdown';
}

function parseBreakdownMarkdown(markdown: string): ParsedBreakdown {
  const normalized = markdown.trim();
  if (!normalized) {
    throw new Error('AI 输出为空。');
  }

  const text = normalized.replace(/\r\n/g, '\n');

  const epicTitleMatch = text.match(/^#\s*Epic:\s*(.+)$/m);
  const epicIdMatch = text.match(/\*\*ID\*\*:\s*(EPIC-\d+)/i);

  if (!epicTitleMatch || !epicIdMatch) {
    throw new Error('未找到合法的 Epic 标题或 ID。');
  }

  const epicStatusMatch = text.match(/\*\*Status\*\*:\s*([^\n]+)/i);
  const epicEstimateMatch = text.match(/\*\*Estimate\*\*:\s*(\d+)\s*hours?/i);
  const epicDescriptionMatch = text.match(/##\s*Description\s*\n([\s\S]*?)(?:\n##|\n-{3,}|\n#\s*Feature:|$)/i);

  const epicFeatureRefs = Array.from(text.matchAll(/- \[[ xX]\]\s*(FEAT-\d+):/g)).map((match) =>
    match[1].trim()
  );

  const features = extractFeatureBlocks(text).map((block) => parseFeatureBlock(block));

  const epic: ParsedEpic = {
    id: epicIdMatch[1].trim(),
    title: epicTitleMatch[1].trim(),
    description: epicDescriptionMatch ? epicDescriptionMatch[1].trim() : '',
    status: epicStatusMatch ? epicStatusMatch[1].trim().toLowerCase() : 'planning',
    estimate: safeNumber(epicEstimateMatch?.[1]),
    features:
      features.length > 0
        ? features.map((feature) => feature.id)
        : epicFeatureRefs.length > 0
        ? epicFeatureRefs
        : [],
  };

  return {
    epic,
    features,
  };
}

function extractFeatureBlocks(text: string): string[] {
  const blocks: string[] = [];
  const regex =
    /(?:^|\n)(#{1,3}\s*Feature:\s*[^\n]+[\s\S]*?)(?=\n#{1,3}\s*Feature:|\n#\s*Epic:|\n-{3,}\n|$)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    blocks.push(match[1].trim());
  }

  return blocks;
}

function parseFeatureBlock(block: string): ParsedFeature {
  const featureTitleMatch = block.match(/#{1,3}\s*Feature:\s*(.+)$/m);
  const featureIdMatch = block.match(/\*\*ID\*\*:\s*(FEAT-\d+)/i);

  if (!featureTitleMatch || !featureIdMatch) {
    throw new Error('Feature 区块缺少标题或 ID。');
  }

  const statusMatch = block.match(/\*\*Status\*\*:\s*([^\n]+)/i);
  const estimateMatch = block.match(/\*\*Estimate\*\*:\s*(\d+)\s*hours?/i);
  const descriptionMatch = block.match(
    /##\s*Description\s*\n([\s\S]*?)(?:\n##|\n#{1,3}\s*Feature:|\n-{3,}|$)/i
  );
  const skillsMatch = block.match(/\*\*Skills Required\*\*:\s*([^\n]+)/i);

  const skills = skillsMatch
    ? skillsMatch[1]
        .split(/[,，、]/)
        .map((skill) => skill.trim())
        .filter(Boolean)
    : [];

  const userStories = Array.from(
    block.matchAll(/- \[[ xX]\]\s*(STORY-\d+):\s*(.+?)\s*\((\d+)h\)/g)
  ).map((storyMatch) => ({
    id: storyMatch[1].trim(),
    description: storyMatch[2].trim(),
    estimate: safeNumber(storyMatch[3]),
  }));

  return {
    id: featureIdMatch[1].trim(),
    title: featureTitleMatch[1].trim(),
    description: descriptionMatch ? descriptionMatch[1].trim() : '',
    status: statusMatch ? statusMatch[1].trim().toLowerCase() : 'todo',
    estimate: safeNumber(estimateMatch?.[1]),
    skillsRequired: skills,
    userStories,
  };
}

function safeNumber(value: string | undefined | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
