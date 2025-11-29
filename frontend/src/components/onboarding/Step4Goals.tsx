import { useMemo, useState } from 'react';
import type { FormData, GoalItem, GoalPriority } from './types';
import { MUST_HAVE_GOALS, GOOD_TO_HAVE_GOALS } from './constants';
import { submitGoalsData } from '../../api/onboarding.api';

interface Props {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

type GoalDraft = {
  name: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string;
  priority: GoalPriority | '';
  source: 'preset' | 'custom';
  chipKey: string;
  editingId?: string;
};

const PRIORITY_OPTIONS: { value: GoalPriority; label: string; helper: string }[] = [
  {
    value: 'must_have',
    label: 'Must Have',
    helper: 'Critical, needs funding soon',
  },
  {
    value: 'good_to_have',
    label: 'Good to Have',
    helper: 'Flexible timeline, nice upgrade',
  },
];

const GOAL_SECTIONS = [
  {
    key: 'must',
    title: 'Essential goals (stability first)',
    subtitle: 'Cover your safety net, debt, and non-negotiables.',
    chips: MUST_HAVE_GOALS,
  },
  {
    key: 'good',
    title: 'Lifestyle goals (motivators)',
    subtitle: 'Upgrades that keep you inspired and excited.',
    chips: GOOD_TO_HAVE_GOALS,
  },
];

function formatCurrency(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

export default function Step4Goals({
  formData,
  updateFormData,
  onNext,
  onBack,
  onSkip,
}: Props) {
  const savedGoals: GoalItem[] = useMemo(
    () => (Array.isArray(formData.goals) ? formData.goals : []),
    [formData.goals]
  );
  const [draft, setDraft] = useState<GoalDraft | null>(null);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const totalTarget = savedGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalSaved = savedGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);

  const chipKeyForName = (name: string, source?: string) => {
    if (source === 'custom') return 'custom';
    for (const section of GOAL_SECTIONS) {
      if (section.chips.includes(name)) {
        return `${section.key}-${name}`;
      }
    }
    return 'custom';
  };

  const startGoalDraft = (label: string, chipKey: string) => {
    const existing = savedGoals.find((goal) => goal.name === label);
    setDraft({
      name: label,
      targetAmount: existing ? String(existing.targetAmount) : '',
      currentAmount: existing && existing.currentAmount ? String(existing.currentAmount) : '',
      deadline: existing?.deadline || '',
      priority: existing?.priority || '',
      source: 'preset',
      chipKey,
      editingId: existing?.id,
    });
    setActiveChip(chipKey);
  };

  const openCustomGoal = () => {
    setDraft({
      name: '',
      targetAmount: '',
      currentAmount: '',
      deadline: '',
      priority: '',
      source: 'custom',
      chipKey: 'custom',
    });
    setActiveChip('custom');
  };

  const handleDraftChange = (field: keyof GoalDraft, value: string) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const resetDraft = () => {
    setDraft(null);
    setActiveChip(null);
  };

  const handleSaveDraft = () => {
    if (!draft) return;
    if (!draft.targetAmount || !draft.priority || !draft.name.trim()) return;

    const targetAmount = Math.max(0, Number(draft.targetAmount));
    if (!Number.isFinite(targetAmount) || targetAmount === 0) return;

    const currentAmount = Math.min(targetAmount, Math.max(0, Number(draft.currentAmount) || 0));

    const nextGoal: GoalItem = {
      id: draft.editingId || `goal-${Date.now()}`,
      name: draft.name.trim(),
      targetAmount,
      currentAmount,
      priority: draft.priority,
      deadline: draft.deadline || undefined,
      source: draft.source,
    };

    const updated = draft.editingId
      ? savedGoals.map((goal) => (goal.id === draft.editingId ? nextGoal : goal))
      : [...savedGoals, nextGoal];

    updateFormData({ goals: updated });
    resetDraft();
  };

  const handleEditGoal = (goal: GoalItem) => {
    const chipKey = chipKeyForName(goal.name, goal.source);
    setDraft({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      currentAmount: goal.currentAmount ? String(goal.currentAmount) : '',
      deadline: goal.deadline || '',
      priority: goal.priority,
      source: goal.source || 'preset',
      chipKey,
      editingId: goal.id,
    });
    setActiveChip(chipKey);
  };

  const handleRemoveGoal = (id: string) => {
    const updated = savedGoals.filter((goal) => goal.id !== id);
    updateFormData({ goals: updated });
    if (draft?.editingId === id) {
      resetDraft();
    }
  };

  const handleSubmitGoals = async () => {
    if (draft) {
      window.alert('Finish saving or cancel the open goal first.');
      return;
    }
    if (!savedGoals.length) {
      window.alert('Add at least one goal before continuing.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await submitGoalsData({
        goals: savedGoals.map(({ name, targetAmount, currentAmount, priority, deadline }) => ({
          name,
          targetAmount,
          currentAmount,
          priority,
          deadline,
        })),
      });
      onNext();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to save goals. Please try again.';
      setSubmitError(message);
      window.alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDraftCard = () => {
    if (!draft) return null;
    const saveDisabled = !draft.targetAmount || !draft.priority || !draft.name.trim();

    return (
      <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-[#111827]">
            Goal name
            <input
              type="text"
              value={draft.name}
              onChange={(event) => handleDraftChange('name', event.target.value)}
              placeholder="Ex: Stable monthly savings"
              readOnly={draft.source === 'preset'}
              className={`mt-1 w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#111827] focus:border-[pastel-green] focus:outline-none focus:ring-2 focus:ring-[pastel-green]/30 ${
                draft.source === 'preset' ? 'bg-[#F3F4F6] cursor-not-allowed' : ''
              }`}
            />
          </label>
          <label className="text-sm font-semibold text-[#111827]">
            Target amount (₹)
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text/60">₹</span>
              <input
                type="number"
                min="0"
                step="500"
                value={draft.targetAmount}
                onChange={(event) => handleDraftChange('targetAmount', event.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] bg-white px-6 py-3 text-sm text-[#111827] focus:border-[pastel-green] focus:outline-none focus:ring-2 focus:ring-[pastel-green]/30"
                placeholder="0"
              />
            </div>
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-[#111827]">
            Already saved (₹)
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text/60">₹</span>
              <input
                type="number"
                min="0"
                step="500"
                value={draft.currentAmount}
                onChange={(event) => handleDraftChange('currentAmount', event.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] bg-white px-6 py-3 text-sm text-[#111827] focus:border-[pastel-green] focus:outline-none focus:ring-2 focus:ring-[pastel-green]/30"
                placeholder="0"
              />
            </div>
          </label>
          <label className="text-sm font-semibold text-[#111827]">
            Deadline (optional)
            <input
              type="date"
              value={draft.deadline}
              onChange={(event) => handleDraftChange('deadline', event.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#111827] focus:border-[pastel-green] focus:outline-none focus:ring-2 focus:ring-[pastel-green]/30"
            />
          </label>
        </div>
        <div className="mt-4">
          <p className="text-sm font-semibold text-[#111827] mb-2">Priority</p>
          <div className="flex flex-wrap gap-3">
            {PRIORITY_OPTIONS.map((option) => {
              const isSelected = draft.priority === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleDraftChange('priority', option.value)}
                  className={`flex-1 min-w-[140px] rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    isSelected
                      ? 'border-transparent bg-[pastel-green] text-text shadow'
                      : 'border-[#E5E7EB] bg-white text-[#111827] hover:border-[pastel-green]'
                  }`}
                >
                  <span>{option.label}</span>
                  <p className="text-xs font-normal text-text/70">{option.helper}</p>
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={resetDraft}
            className="flex-1 rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm font-semibold text-[#111827] hover:border-[pastel-green]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saveDisabled}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold shadow ${
              saveDisabled
                ? 'cursor-not-allowed bg-[#E5E7EB] text-[#9CA3AF] shadow-none'
                : 'bg-[pastel-green] text-text shadow-[pastel-green]/30 hover:bg-pastel-green/60'
            }`}
          >
            Save goal
          </button>
        </div>
      </div>
    );
  };

  const hasCustomGoals = savedGoals.some((goal) => goal.source === 'custom');

  return (
    <div className="min-h-screen bg-pastel-beige flex items-center justify-center">
      <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/80 rounded-3xl p-8 shadow-soft border border-pastel-tan/20">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 flex-1 rounded-xl bg-[pastel-green]"></div>
              <div className="h-2 flex-1 rounded-xl bg-[pastel-green]"></div>
              <div className="h-2 flex-1 rounded-xl bg-[pastel-green]"></div>
              <div className="h-2 flex-1 rounded-xl bg-[pastel-green]"></div>
              <div className="h-2 flex-1 rounded-xl bg-pastel-tan/30"></div>
            </div>
            <p className="text-sm text-text/60">Step 4 of 5</p>
          </div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text mb-2">Set your money goals</h1>
            <p className="text-text/70">
              Tap a goal, enter the exact target, and choose if it is a must-have or nice-to-have.
            </p>
          </div>

          {GOAL_SECTIONS.map((section) => (
            <div key={section.key} className="mb-12">
              <div className="mb-4 border-b border-[#E5E7EB] pb-3">
                <h2 className="text-base font-bold text-[#111827]">{section.title}</h2>
                <p className="text-sm text-text/60 mt-1">{section.subtitle}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {section.chips.map((chip) => {
                  const chipKey = `${section.key}-${chip}`;
                  const isActive = activeChip === chipKey;
                  const isSaved = savedGoals.some((goal) => goal.name === chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => startGoalDraft(chip, chipKey)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        isActive
                          ? 'bg-[pastel-green] text-text shadow shadow-[pastel-green]/30'
                          : isSaved
                          ? 'bg-[pastel-green]/70 text-text'
                          : 'bg-white border border-[#E5E7EB] text-[#111827] hover:border-[pastel-green] hover:bg-[pastel-green]/5'
                      }`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
              {draft && draft.chipKey?.startsWith(section.key) && renderDraftCard()}
            </div>
          ))}

          <div className="mb-12">
            <h2 className="text-base font-bold text-[#111827] mb-2">Custom goal</h2>
            <p className="text-sm text-text/60 mb-4">
              Want something else? Add your own goal with exact numbers.
            </p>
            <button
              type="button"
              onClick={openCustomGoal}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeChip === 'custom'
                  ? 'bg-[pastel-green] text-text shadow shadow-[pastel-green]/30'
                  : hasCustomGoals
                  ? 'bg-[pastel-green]/70 text-text'
                  : 'bg-white border border-[#E5E7EB] text-[#111827] hover:border-[pastel-green] hover:bg-[pastel-green]/5'
              }`}
            >
              + Create custom goal
            </button>
            {draft && draft.chipKey === 'custom' && renderDraftCard()}
          </div>

          {savedGoals.length > 0 && (
            <div className="mb-10">
              <h3 className="text-sm font-semibold text-[#111827] mb-4">
                Added goals ({savedGoals.length})
              </h3>
              <div className="space-y-3">
                {savedGoals.map((goal) => {
                  const priorityLabel = goal.priority === 'must_have' ? 'Must have' : 'Good to have';
                  return (
                    <div
                      key={goal.id}
                      className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-[#111827]">{goal.name}</p>
                          <p className="text-sm text-text/60 mt-1">
                            Target {formatCurrency(goal.targetAmount)} · Saved {formatCurrency(goal.currentAmount)}
                          </p>
                          {goal.deadline && (
                            <p className="text-xs text-text/60 mt-1">Deadline: {goal.deadline}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              goal.priority === 'must_have'
                                ? 'bg-[#DCFCE7] text-[#15803D]'
                                : 'bg-[#E0F2FE] text-[#0369A1]'
                            }`}
                          >
                            {priorityLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleEditGoal(goal)}
                            className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm text-[#111827] hover:border-[pastel-green]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveGoal(goal.id)}
                            className="rounded-lg border border-[#FCA5A5] px-3 py-1.5 text-sm text-[#B91C1C] hover:bg-[#FEE2E2]"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-text/60">
                  Progress snapshot
                </p>
                <p className="text-lg font-semibold text-[#111827] mt-1">
                  Total target {formatCurrency(totalTarget)} · Already saved {formatCurrency(totalSaved)}
                </p>
              </div>
            </div>
          )}

          {submitError && (
            <div className="mb-6 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
              {submitError}
            </div>
          )}

          <div className="flex gap-4 justify-between">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 rounded-xl border border-pastel-tan/30 text-text hover:border-[pastel-green] bg-white/80"
            >
              Back
            </button>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onSkip}
                className="px-6 py-3 rounded-xl border border-pastel-tan/30 text-text hover:border-[pastel-green] bg-white/80"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleSubmitGoals}
                disabled={isSubmitting}
                className={`px-6 py-3 rounded-xl font-medium shadow-lg shadow-[pastel-green]/25 ${
                  isSubmitting
                    ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed shadow-none'
                    : 'bg-[pastel-green] text-text hover:bg-pastel-green/60'
                }`}
              >
                {isSubmitting ? 'Saving…' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
