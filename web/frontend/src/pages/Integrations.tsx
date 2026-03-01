import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type ConnectorInfo, type SyncJob } from '../services/api';

export function Integrations() {
  const { t } = useTranslation();
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const [connectorRes, logRes] = await Promise.all([api.getConnectors(), api.getSyncLog()]);
      setConnectors(connectorRes.connectors);
      setJobs(logRes.jobs);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('integrations.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleImport(connectorId: string, file: File | undefined) {
    if (!file) {
      setError(t('integrations.errors.selectFile'));
      return;
    }
    try {
      const result = await api.importFromSource(connectorId, file, { dryRun: false, merge: true });
      setMessage(
        t('integrations.importDone', {
          connectorId,
          created: result.persisted?.created ?? 0,
          updated: result.persisted?.updated ?? 0,
        })
      );
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('integrations.errors.importFailed'));
    }
  }

  if (loading && connectors.length === 0) {
    return <div className="text-[#86868B]">{t('integrations.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">{t('integrations.title')}</h2>
          <p className="mt-2 text-[#86868B]">{t('integrations.description')}</p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-black/5 px-4 py-2 text-sm text-[#1D1D1F] dark:bg-white/10 dark:text-[#F5F5F7]"
          onClick={() => void refresh()}
          disabled={loading}
        >
          {t('common.refresh')}
        </button>
      </div>

      {error && <div className="rounded-lg border border-[#FF3B30]/30 bg-[#FF3B30]/10 p-3 text-sm text-[#FF3B30]">{error}</div>}
      {message && <div className="rounded-lg border border-[#34C759]/30 bg-[#34C759]/10 p-3 text-sm text-[#34C759]">{message}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {connectors.map((connector) => (
          <article
            key={connector.id}
            className="rounded-2xl bg-white p-5 shadow-apple-card dark:bg-[#1C1C1E] dark:border dark:border-white/10"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{connector.name}</h3>
                <p className="text-xs text-[#86868B]">
                  {t(`integrations.category.${connector.category}`, { defaultValue: connector.category })}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  connector.connected
                    ? 'bg-[#34C759]/15 text-[#34C759]'
                    : 'bg-black/5 text-[#86868B] dark:bg-white/10'
                }`}
              >
                {connector.connected ? t('integrations.status.connected') : t('integrations.status.fileIntegration')}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <label className="rounded-lg bg-black/5 px-3 py-1.5 text-xs text-[#1D1D1F] dark:bg-white/10 dark:text-[#F5F5F7]">
                {t('integrations.importFile')}
                <input
                  type="file"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    void handleImport(connector.id, file);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-apple-card dark:bg-[#1C1C1E] dark:border dark:border-white/10">
        <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{t('integrations.syncLog')}</h3>
        {jobs.length === 0 ? (
          <p className="mt-2 text-sm text-[#86868B]">{t('integrations.noSyncRecords')}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-[#86868B]">
                  <th className="pb-2">{t('integrations.table.connector')}</th>
                  <th className="pb-2">{t('integrations.table.direction')}</th>
                  <th className="pb-2">{t('integrations.table.status')}</th>
                  <th className="pb-2">{t('integrations.table.started')}</th>
                  <th className="pb-2">{t('integrations.table.message')}</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-t border-black/5 dark:border-white/10">
                    <td className="py-2">{job.connectorId}</td>
                    <td className="py-2">{t(`integrations.direction.${job.direction}`, { defaultValue: job.direction })}</td>
                    <td className="py-2">{t(`integrations.syncStatus.${job.status}`, { defaultValue: job.status })}</td>
                    <td className="py-2">{new Date(job.startedAt).toLocaleString()}</td>
                    <td className="py-2">{job.message ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
