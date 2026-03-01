import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { api, type PlanDraft, type PlanImpact, type PlanningBriefInput } from '../services/api';

type WizardStep = 1 | 2 | 3;

const DEFAULT_DAILY_CAPACITY = 8;
const today = new Date().toISOString().split('T')[0];
const nextMonth = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0];

function createDefaultBrief(): PlanningBriefInput {
  return {
    goal: '',
    startDate: today,
    targetDate: nextMonth,
    teamCapacityHoursPerDay: DEFAULT_DAILY_CAPACITY,
    constraints: [],
  };
}

function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map((part) => Number(part));
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function PlanBuilder() {
  const { t } = useTranslation();
  const { success: toastSuccess, error: toastError } = useToast();

  const [step, setStep] = useState<WizardStep>(1);
  const [brief, setBrief] = useState<PlanningBriefInput>(() => createDefaultBrief());
  const [constraintInput, setConstraintInput] = useState('');
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [impact, setImpact] = useState<PlanImpact | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const validation = useMemo(() => {
    const goal = brief.goal.trim();
    const goalError =
      goal.length === 0
        ? t('planBuilder.validation.goalRequired')
        : goal.length < 6
          ? t('planBuilder.validation.goalTooShort')
          : null;

    const validStartDate = isValidDateInput(brief.startDate);
    const validTargetDate = isValidDateInput(brief.targetDate);
    const dateError = !validStartDate || !validTargetDate
      ? t('planBuilder.validation.invalidDate')
      : brief.targetDate < brief.startDate
        ? t('planBuilder.validation.dateOrder')
        : null;

    const capacityError =
      brief.teamCapacityHoursPerDay < 1 || brief.teamCapacityHoursPerDay > 24
        ? t('planBuilder.validation.capacityRange')
        : null;

    return {
      goalError,
      dateError,
      capacityError,
    };
  }, [brief.goal, brief.startDate, brief.targetDate, brief.teamCapacityHoursPerDay, t]);

  const canNext = useMemo(() => {
    if (step === 1) {
      return !validation.goalError;
    }
    if (step === 2) {
      return !validation.dateError && !validation.capacityError;
    }
    return true;
  }, [step, validation.capacityError, validation.dateError, validation.goalError]);

  const hasBriefChanges =
    brief.goal.trim().length > 0 ||
    brief.startDate !== today ||
    brief.targetDate !== nextMonth ||
    brief.teamCapacityHoursPerDay !== DEFAULT_DAILY_CAPACITY ||
    brief.constraints.length > 0;

  const hasUnsavedChanges = useMemo(
    () => (draft ? !hasConfirmed : hasBriefChanges),
    [draft, hasBriefChanges, hasConfirmed]
  );

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = t('planBuilder.unsavedWarning');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, t]);

  function getCurrentStepValidationError(): string | null {
    if (step === 1) {
      return validation.goalError;
    }
    if (step === 2) {
      return validation.dateError ?? validation.capacityError;
    }
    return null;
  }

  function resetBuilder() {
    setStep(1);
    setBrief(createDefaultBrief());
    setConstraintInput('');
    setDraft(null);
    setImpact(null);
    setBusy(false);
    setError(null);
    setHasConfirmed(false);
    setConfirmDialogOpen(false);
  }

  async function handleGenerate() {
    const validationError = getCurrentStepValidationError();
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError(null);
    setHasConfirmed(false);

    try {
      const result = await api.generatePlan(brief);
      setDraft(result);
      setStep(3);
      const impactResult = await api.getPlanImpact(result.id);
      setImpact(impactResult);
      toastSuccess(t('planBuilder.generateSuccess'));
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : t('planBuilder.errors.generateFailed');
      setError(message);
      toastError(t('planBuilder.errors.generateFailed'), message);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!draft) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await api.confirmPlan(draft.id);
      setHasConfirmed(true);
      toastSuccess(t('planBuilder.confirmSuccess'));
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : t('planBuilder.errors.confirmFailed');
      setError(message);
      toastError(t('planBuilder.errors.confirmFailed'), message);
    } finally {
      setBusy(false);
      setConfirmDialogOpen(false);
    }
  }

  async function handleRebalance(strategy: 'conservative' | 'balanced' | 'aggressive') {
    if (!draft) {
      return;
    }

    setBusy(true);
    setError(null);
    setHasConfirmed(false);

    try {
      const result = await api.rebalancePlan(draft.id, strategy);
      setDraft(result);
      const impactResult = await api.getPlanImpact(result.id);
      setImpact(impactResult);
      toastSuccess(t('planBuilder.rebalanceSuccess'));
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : t('planBuilder.errors.rebalanceFailed');
      setError(message);
      toastError(t('planBuilder.errors.rebalanceFailed'), message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">{t('planBuilder.title')}</h2>
        <p className="mt-2 text-[#86868B]">{t('planBuilder.description')}</p>
      </div>

      <div className="flex items-center gap-3 text-sm">
        {[1, 2, 3].map((value) => (
          <div
            key={value}
            className={`rounded-full px-3 py-1 ${
              step >= value ? 'bg-blue-600 text-white' : 'bg-black/5 text-[#86868B]'
            }`}
          >
            {t('planBuilder.stepBadge', { value })}
          </div>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-[#FF3B30]/30 bg-[#FF3B30]/10 p-3 text-sm text-[#FF3B30]">{error}</div>
      ) : null}
      {hasConfirmed ? (
        <div className="rounded-lg border border-[#34C759]/30 bg-[#34C759]/10 p-3 text-sm text-[#34C759]">
          {t('planBuilder.confirmSuccess')}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="rounded-2xl bg-white p-6 shadow-apple-card dark:border dark:border-white/10 dark:bg-[#1C1C1E]">
          <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{t('planBuilder.step1Title')}</h3>
          <textarea
            value={brief.goal}
            onChange={(event) => setBrief((prev) => ({ ...prev, goal: event.target.value }))}
            className="mt-4 h-32 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-[#2C2C2E] dark:text-[#F5F5F7]"
            placeholder={t('planBuilder.goalPlaceholder')}
          />
          {validation.goalError ? (
            <p className="mt-2 text-xs text-[#FF3B30]">{validation.goalError}</p>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="rounded-2xl bg-white p-6 shadow-apple-card dark:border dark:border-white/10 dark:bg-[#1C1C1E]">
          <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{t('planBuilder.step2Title')}</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">
              {t('planBuilder.startDate')}
              <input
                type="date"
                value={brief.startDate}
                onChange={(event) => setBrief((prev) => ({ ...prev, startDate: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#2C2C2E]"
              />
            </label>
            <label className="text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">
              {t('planBuilder.targetDate')}
              <input
                type="date"
                value={brief.targetDate}
                onChange={(event) => setBrief((prev) => ({ ...prev, targetDate: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#2C2C2E]"
              />
            </label>
            <label className="text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">
              {t('planBuilder.dailyCapacity')}
              <input
                type="number"
                min={1}
                max={24}
                value={brief.teamCapacityHoursPerDay}
                onChange={(event) =>
                  setBrief((prev) => ({ ...prev, teamCapacityHoursPerDay: Number(event.target.value) || DEFAULT_DAILY_CAPACITY }))
                }
                className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#2C2C2E]"
              />
            </label>
          </div>
          {validation.dateError ? (
            <p className="mt-2 text-xs text-[#FF3B30]">{validation.dateError}</p>
          ) : null}
          {validation.capacityError ? (
            <p className="mt-2 text-xs text-[#FF3B30]">{validation.capacityError}</p>
          ) : null}
          <div className="mt-4">
            <label className="text-sm text-[#1D1D1F] dark:text-[#F5F5F7]">{t('planBuilder.constraint')}</label>
            <div className="mt-1 flex gap-2">
              <input
                value={constraintInput}
                onChange={(event) => setConstraintInput(event.target.value)}
                className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#2C2C2E]"
                placeholder={t('planBuilder.constraintPlaceholder')}
              />
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                onClick={() => {
                  const value = constraintInput.trim();
                  if (!value) {
                    return;
                  }

                  setBrief((prev) => {
                    if (prev.constraints.includes(value)) {
                      return prev;
                    }
                    return { ...prev, constraints: [...prev.constraints, value] };
                  });
                  setConstraintInput('');
                }}
              >
                {t('planBuilder.addConstraint')}
              </button>
            </div>
            {brief.constraints.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-[#86868B]">
                {brief.constraints.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === 3 && draft ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-6 shadow-apple-card dark:border dark:border-white/10 dark:bg-[#1C1C1E]">
            <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{t('planBuilder.step3Title')}</h3>
            <p className="mt-2 text-sm text-[#86868B]">{t('planBuilder.generatedFeatures', { count: draft.features.length })}</p>
            {draft.warnings.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-6 text-xs text-[#FF9500]">
                {draft.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-[#86868B]">
                    <th className="pb-2">{t('planBuilder.table.feature')}</th>
                    <th className="pb-2">{t('planBuilder.table.title')}</th>
                    <th className="pb-2">{t('planBuilder.table.epic')}</th>
                    <th className="pb-2">{t('planBuilder.table.assignee')}</th>
                    <th className="pb-2">{t('planBuilder.table.estimate')}</th>
                    <th className="pb-2">{t('planBuilder.table.start')}</th>
                    <th className="pb-2">{t('planBuilder.table.end')}</th>
                    <th className="pb-2">{t('planBuilder.table.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.features.map((feature) => (
                    <tr key={feature.featureId} className="border-t border-black/5 dark:border-white/10">
                      <td className="py-2">{feature.featureId}</td>
                      <td className="py-2">{feature.title}</td>
                      <td className="py-2">{feature.epic}</td>
                      <td className="py-2">{feature.assignee}</td>
                      <td className="py-2">
                        {feature.estimate}
                        {t('planBuilder.hoursSuffix')}
                      </td>
                      <td className="py-2">{feature.start}</td>
                      <td className="py-2">{feature.end}</td>
                      <td className="py-2">
                        {t(`planBuilder.featureStatus.${feature.status}`, { defaultValue: feature.status })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {impact ? (
            <div className="rounded-2xl bg-white p-6 shadow-apple-card dark:border dark:border-white/10 dark:bg-[#1C1C1E]">
              <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{t('planBuilder.impactTitle')}</h3>
              <p className="mt-2 text-sm text-[#86868B]">
                {t('planBuilder.impactSummary', {
                  delayedCount: impact.delayedFeatures.length,
                  overloadedCount: impact.overloadedAssignees.length,
                  riskCount: impact.dependencyRisks.length,
                })}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 hover:bg-blue-700"
              onClick={() => setConfirmDialogOpen(true)}
              disabled={busy || hasConfirmed}
            >
              {hasConfirmed ? t('planBuilder.confirmed') : t('planBuilder.confirmAndApply')}
            </button>
            <button
              type="button"
              className="rounded-xl bg-black/5 px-5 py-2.5 text-sm font-medium text-[#1D1D1F] dark:bg-white/10 dark:text-[#F5F5F7]"
              onClick={() => void handleRebalance('balanced')}
              disabled={busy}
            >
              {t('planBuilder.rebalanceBalanced')}
            </button>
            <button
              type="button"
              className="rounded-xl bg-black/5 px-5 py-2.5 text-sm font-medium text-[#1D1D1F] dark:bg-white/10 dark:text-[#F5F5F7]"
              onClick={() => void handleRebalance('conservative')}
              disabled={busy}
            >
              {t('planBuilder.rebalanceConservative')}
            </button>
            <button
              type="button"
              className="rounded-xl bg-black/5 px-5 py-2.5 text-sm font-medium text-[#1D1D1F] dark:bg-white/10 dark:text-[#F5F5F7]"
              onClick={() => void handleRebalance('aggressive')}
              disabled={busy}
            >
              {t('planBuilder.rebalanceAggressive')}
            </button>
          </div>

          {hasConfirmed ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
              <p className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">{t('planBuilder.quickActionsTitle')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/gantt" className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
                  {t('planBuilder.quickActions.gantt')}
                </Link>
                <Link to="/kanban" className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700">
                  {t('planBuilder.quickActions.kanban')}
                </Link>
                <Link to="/features" className="rounded-md bg-gray-800 px-3 py-1.5 text-sm text-white hover:bg-gray-900">
                  {t('planBuilder.quickActions.features')}
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <button
          type="button"
          className="rounded-lg bg-black/5 px-4 py-2 text-sm text-[#1D1D1F] disabled:opacity-50 dark:bg-white/10 dark:text-[#F5F5F7]"
          onClick={() => {
            setError(null);
            setStep((prev) => (Math.max(1, prev - 1) as WizardStep));
          }}
          disabled={step === 1 || busy}
        >
          {t('planBuilder.previousStep')}
        </button>
        {step < 3 ? (
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-blue-700"
            onClick={() => {
              if (step === 2) {
                void handleGenerate();
                return;
              }

              const validationError = getCurrentStepValidationError();
              if (validationError) {
                setError(validationError);
                return;
              }

              setError(null);
              setStep((prev) => (Math.min(3, prev + 1) as WizardStep));
            }}
            disabled={!canNext || busy}
          >
            {step === 2 ? t('planBuilder.generatePlan') : t('planBuilder.nextStep')}
          </button>
        ) : (
          <button
            type="button"
            className="rounded-lg bg-black/5 px-4 py-2 text-sm text-[#1D1D1F] dark:bg-white/10 dark:text-[#F5F5F7]"
            onClick={resetBuilder}
            disabled={busy}
          >
            {t('planBuilder.restart')}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDialogOpen}
        title={t('planBuilder.confirmDialogTitle')}
        description={t('planBuilder.confirmDialogDescription', { count: draft?.features.length ?? 0 })}
        confirmText={t('planBuilder.confirmDialogAction')}
        cancelText={t('common.cancel')}
        busy={busy}
        onCancel={() => setConfirmDialogOpen(false)}
        onConfirm={() => void handleConfirm()}
      />
    </div>
  );
}
