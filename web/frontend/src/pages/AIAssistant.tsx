import { useState } from 'react';
import { api } from '../services/api';

export function AIAssistant() {
  const [requirements, setRequirements] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBreakdown = async () => {
    if (!requirements.trim()) {
      setError('请输入需求描述');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data: any = await api.breakdownRequirements(requirements);
      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">🤖 AI 助手</h2>
        <p className="text-gray-600">
          使用 AI 自动分解需求为 Epic、Feature 和 User Story
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 输入区域 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">需求描述</h3>

          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="例如：&#10;我需要开发一个在线客服系统，要求：&#10;- 用户可以在网页上发起聊天&#10;- 客服人员可以同时处理多个聊天&#10;- 支持自动回复和智能推荐&#10;- 管理员可以查看聊天记录和数据统计"
            className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleBreakdown}
              disabled={loading || !requirements.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? '🔄 AI 分析中...' : '✨ AI 自动分解'}
            </button>
            <button
              onClick={() => {
                setRequirements('');
                setResult(null);
                setError(null);
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
            >
              清空
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">❌ {error}</p>
            </div>
          )}
        </div>

        {/* 结果区域 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">AI 生成结果</h3>

          {!result && !loading && (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-6xl mb-4">🤖</p>
                <p>输入需求描述后点击"AI 自动分解"</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600">AI 正在分析您的需求...</p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Epic */}
              {result.epic && (
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    📊 {result.epic.title}
                  </h4>
                  <p className="text-sm text-blue-700 mb-2">
                    {result.epic.description}
                  </p>
                  <div className="text-xs text-blue-600">
                    <span className="font-medium">ID:</span> {result.epic.id} |{' '}
                    <span className="font-medium">估算:</span> {result.epic.estimate}h
                  </div>
                </div>
              )}

              {/* Features */}
              {result.features && result.features.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">
                    ✨ Features ({result.features.length})
                  </h4>
                  {result.features.map((feature: any, index: number) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <h5 className="font-medium text-gray-900 mb-1">
                        {feature.title}
                      </h5>
                      <p className="text-sm text-gray-600 mb-2">
                        {feature.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          <span className="font-medium">ID:</span> {feature.id}
                        </span>
                        <span>
                          <span className="font-medium">估算:</span>{' '}
                          {feature.estimate}h
                        </span>
                        {feature.skillsRequired && (
                          <span>
                            <span className="font-medium">技能:</span>{' '}
                            {feature.skillsRequired.join(', ')}
                          </span>
                        )}
                      </div>

                      {/* User Stories */}
                      {feature.userStories && feature.userStories.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">
                            User Stories:
                          </p>
                          <ul className="space-y-1">
                            {feature.userStories.map((story: any, idx: number) => (
                              <li key={idx} className="text-xs text-gray-600">
                                • {story.description} ({story.estimate}h)
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
                    alert('已复制到剪贴板');
                  }}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                >
                  📋 复制 JSON 结果
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  提示：您可以将此结果保存到 pmspace/ 目录
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 使用说明 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">💡 使用说明</h3>
        <ol className="space-y-2 text-sm text-blue-800">
          <li>1️⃣ 在左侧输入框描述您的需求（越详细越好）</li>
          <li>2️⃣ 点击"AI 自动分解"按钮，等待 AI 分析</li>
          <li>3️⃣ 在右侧查看 AI 生成的 Epic、Feature 和 User Story</li>
          <li>4️⃣ 复制结果并保存到项目的 pmspace/ 目录</li>
          <li>5️⃣ 刷新 Features 或 Kanban 页面查看新数据</li>
        </ol>
      </div>

      {/* 技术说明 */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">⚙️ 技术说明</h3>
        <p className="text-sm text-blue-800 mb-2">
          此功能使用 Claude Code CLI 进行智能分析，无需额外配置 API Key
        </p>
        <div className="text-xs text-blue-700 space-y-1">
          <p>• 后端通过 <code className="bg-blue-100 px-1 py-0.5 rounded">claude -p</code> 命令调用 AI</p>
          <p>• 使用项目预定义的 <code className="bg-blue-100 px-1 py-0.5 rounded">/pmspec-breakdown</code> slash command</p>
          <p>• 自动解析 Markdown 输出为结构化 JSON</p>
        </div>
      </div>
    </div>
  );
}
