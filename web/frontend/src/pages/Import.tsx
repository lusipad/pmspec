import { useState, useCallback } from 'react';
import { api, type ImportResult } from '../services/api';

type ImportSource = 'jira' | 'linear' | 'github';
type Step = 'select-source' | 'upload' | 'preview' | 'complete';

interface SourceInfo {
  source: ImportSource;
  name: string;
  description: string;
  icon: string;
  fileHint: string;
}

const SOURCES: SourceInfo[] = [
  {
    source: 'jira',
    name: 'Jira',
    description: 'Import issues from Jira JSON export file. Epics become categories, Stories/Tasks become features.',
    icon: '🔵',
    fileHint: 'Export from Jira: System → Backup System → Export to JSON',
  },
  {
    source: 'linear',
    name: 'Linear',
    description: 'Import issues from Linear JSON export. Projects become epics, Issues become features.',
    icon: '🟣',
    fileHint: 'Export from Linear: Settings → Export → Export to JSON',
  },
  {
    source: 'github',
    name: 'GitHub Issues',
    description: 'Import from GitHub Issues JSON. Milestones are preserved, labels map to skills and tags.',
    icon: '⚫',
    fileHint: 'Use GitHub CLI: gh issue list --json number,title,body,state,labels,assignee,milestone',
  },
];

export function Import() {
  const [step, setStep] = useState<Step>('select-source');
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] = useState<ImportResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState(false);

  const handleSourceSelect = (source: ImportSource) => {
    setSelectedSource(source);
    setStep('upload');
    setError(null);
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  }, []);

  const handlePreview = async () => {
    if (!selectedFile || !selectedSource) return;

    setIsLoading(true);
    setError(null);

    try {
      // First validate
      const validation = await api.validateImportFile(selectedFile, selectedSource);
      if (!validation.valid) {
        setError(`Validation failed: ${validation.errors.join(', ')}`);
        setIsLoading(false);
        return;
      }

      // Then preview
      const result = await api.importFromSource(selectedSource, selectedFile, { dryRun: true });
      setPreviewResult(result);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Preview failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !selectedSource) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await api.importFromSource(selectedSource, selectedFile, { 
        dryRun: false,
        merge: mergeMode 
      });
      setImportResult(result);
      setStep('complete');
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('select-source');
    setSelectedSource(null);
    setSelectedFile(null);
    setPreviewResult(null);
    setImportResult(null);
    setError(null);
    setMergeMode(false);
  };

  const sourceInfo = selectedSource ? SOURCES.find(s => s.source === selectedSource) : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">导入数据</h1>
      <p className="text-gray-600 mb-8">从外部项目管理工具导入功能数据</p>

      {/* Progress indicator */}
      <div className="flex items-center mb-8">
        {['select-source', 'upload', 'preview', 'complete'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${step === s ? 'bg-blue-600 text-white' : 
                ['select-source', 'upload', 'preview', 'complete'].indexOf(step) > i ? 'bg-green-500 text-white' : 
                'bg-gray-200 text-gray-600'}`}>
              {['select-source', 'upload', 'preview', 'complete'].indexOf(step) > i ? '✓' : i + 1}
            </div>
            {i < 3 && <div className={`w-16 h-1 mx-2 ${['select-source', 'upload', 'preview', 'complete'].indexOf(step) > i ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          <strong>错误:</strong> {error}
        </div>
      )}

      {/* Step 1: Select Source */}
      {step === 'select-source' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">选择导入源</h2>
          <div className="grid gap-4">
            {SOURCES.map((source) => (
              <button
                key={source.source}
                onClick={() => handleSourceSelect(source.source)}
                className="flex items-start p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <span className="text-3xl mr-4">{source.icon}</span>
                <div>
                  <h3 className="font-semibold text-lg">{source.name}</h3>
                  <p className="text-gray-600 text-sm">{source.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Upload File */}
      {step === 'upload' && sourceInfo && (
        <div>
          <div className="flex items-center mb-4">
            <button onClick={() => setStep('select-source')} className="text-blue-600 hover:text-blue-800 mr-2">
              ← 返回
            </button>
            <h2 className="text-xl font-semibold">上传 {sourceInfo.name} 文件</h2>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm">
              <strong>提示:</strong> {sourceInfo.fileHint}
            </p>
          </div>

          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${selectedFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}
          >
            {selectedFile ? (
              <div>
                <span className="text-4xl mb-2 block">📄</span>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                <button 
                  onClick={() => setSelectedFile(null)} 
                  className="text-red-600 text-sm mt-2 hover:underline"
                >
                  移除文件
                </button>
              </div>
            ) : (
              <div>
                <span className="text-4xl mb-2 block">📁</span>
                <p className="text-gray-600 mb-2">拖拽文件到这里，或</p>
                <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700">
                  选择文件
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-400 mt-2">支持 JSON 格式</p>
              </div>
            )}
          </div>

          {/* Merge option */}
          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={mergeMode}
                onChange={(e) => setMergeMode(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">合并到现有项目 (不覆盖已有数据)</span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handlePreview}
              disabled={!selectedFile || isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? '处理中...' : '预览导入'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && previewResult && sourceInfo && (
        <div>
          <div className="flex items-center mb-4">
            <button onClick={() => setStep('upload')} className="text-blue-600 hover:text-blue-800 mr-2">
              ← 返回
            </button>
            <h2 className="text-xl font-semibold">预览导入结果</h2>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="总项目" value={previewResult.stats.totalItems} />
            <StatCard label="功能" value={previewResult.stats.featuresImported} color="green" />
            <StatCard label="Epic/分类" value={previewResult.stats.epicsImported} color="blue" />
            <StatCard label="里程碑" value={previewResult.stats.milestonesImported} color="purple" />
          </div>

          {/* Errors */}
          {previewResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-red-800 mb-2">⚠️ 发现 {previewResult.errors.length} 个问题</h3>
              <ul className="text-sm text-red-700 list-disc list-inside">
                {previewResult.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err.field && `[${err.field}] `}{err.message}</li>
                ))}
                {previewResult.errors.length > 5 && (
                  <li>... 还有 {previewResult.errors.length - 5} 个问题</li>
                )}
              </ul>
            </div>
          )}

          {/* Epics preview */}
          {previewResult.epics.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">📁 Epic/分类 ({previewResult.epics.length})</h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                {previewResult.epics.map((epic) => (
                  <div key={epic.id} className="text-sm py-1">
                    <span className="font-medium">{epic.name}</span>
                    {epic.originalId && <span className="text-gray-500 ml-2">← {epic.originalId}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features preview */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">✨ 功能预览 (前10项)</h3>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2">名称</th>
                    <th className="text-left p-2">分类</th>
                    <th className="text-left p-2">优先级</th>
                    <th className="text-left p-2">状态</th>
                    <th className="text-left p-2">负责人</th>
                  </tr>
                </thead>
                <tbody>
                  {previewResult.features.slice(0, 10).map((feature) => (
                    <tr key={feature.id} className="border-t">
                      <td className="p-2">{feature.name.substring(0, 40)}{feature.name.length > 40 ? '...' : ''}</td>
                      <td className="p-2 text-gray-600">{feature.category || '-'}</td>
                      <td className="p-2">
                        <PriorityBadge priority={feature.priority} />
                      </td>
                      <td className="p-2">
                        <StatusBadge status={feature.status} />
                      </td>
                      <td className="p-2 text-gray-600">{feature.assignee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewResult.features.length > 10 && (
                <div className="p-2 text-center text-gray-500 text-sm">
                  ... 还有 {previewResult.features.length - 10} 个功能
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center">
            <label className="flex items-center text-sm text-gray-700">
              <input
                type="checkbox"
                checked={mergeMode}
                onChange={(e) => setMergeMode(e.target.checked)}
                className="mr-2"
              />
              合并模式
            </label>
            <div className="space-x-4">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={isLoading || previewResult.errors.length > 0}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? '导入中...' : '确认导入'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && importResult && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">导入成功!</h2>
          <p className="text-gray-600 mb-6">
            成功导入 {importResult.stats.featuresImported} 个功能
            {importResult.stats.epicsImported > 0 && `，${importResult.stats.epicsImported} 个分类`}
            {importResult.stats.milestonesImported > 0 && `，${importResult.stats.milestonesImported} 个里程碑`}
          </p>

          <div className="space-x-4">
            <button
              onClick={handleReset}
              className="px-6 py-2 border rounded hover:bg-gray-50"
            >
              继续导入
            </button>
            <a
              href="/features"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              查看功能列表
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = 'gray' }: { label: string; value: number; color?: string }) {
  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800',
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
  };
  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm">{label}</div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-blue-100 text-blue-800',
    low: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${colors[priority] || colors.medium}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    done: 'bg-green-100 text-green-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    todo: 'bg-gray-100 text-gray-600',
    blocked: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${colors[status] || colors.todo}`}>
      {status}
    </span>
  );
}

export default Import;
