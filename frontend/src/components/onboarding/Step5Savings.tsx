import { useMemo, useState } from 'react';
import type { FormData, InvestmentItem, SavingsItem } from './types';
import { SAVINGS_OPTIONS, INVESTMENT_OPTIONS } from './constants';
import { submitSavingsAndInvestments } from '../../api/onboarding.api';

interface Props {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onFinish: () => void;
}

const SAVING_SUBTITLE = 'Money that is liquid and available today.';
const INVESTMENT_SUBTITLE = 'Money already invested (current value).';

export default function Step5Savings({
  formData,
  updateFormData,
  onBack,
  onSkip,
  onFinish,
}: Props) {
  const savings: SavingsItem[] = useMemo(
    () => (Array.isArray(formData.savings) ? formData.savings : []),
    [formData.savings]
  );
  const investments: InvestmentItem[] = useMemo(
    () => (Array.isArray(formData.investments) ? formData.investments : []),
    [formData.investments]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSavingsCustom, setShowSavingsCustom] = useState(false);
  const [showInvestmentsCustom, setShowInvestmentsCustom] = useState(false);
  const [customSavingsName, setCustomSavingsName] = useState('');
  const [customInvestmentsName, setCustomInvestmentsName] = useState('');

  const addSavingsEntry = (category: string, source: 'preset' | 'custom') => {
    const exists = savings.some(
      (item) => item.category.toLowerCase() === category.toLowerCase()
    );
    if (exists) return;
    const newEntry: SavingsItem = {
      id: `saving-${Date.now()}-${category}`,
      category,
      amount: '',
      note: '',
      source,
    };
    updateFormData({ savings: [...savings, newEntry] });
  };

  const addInvestmentEntry = (category: string, source: 'preset' | 'custom') => {
    const exists = investments.some(
      (item) => item.category.toLowerCase() === category.toLowerCase()
    );
    if (exists) return;
    const newEntry: InvestmentItem = {
      id: `investment-${Date.now()}-${category}`,
      category,
      amount: '',
      note: '',
      source,
    };
    updateFormData({ investments: [...investments, newEntry] });
  };

  const handleSavingsFieldChange = (
    id: string,
    field: 'amount' | 'note',
    value: string
  ) => {
    const updated = savings.map((entry) =>
      entry.id === id ? { ...entry, [field]: value } : entry
    );
    updateFormData({ savings: updated });
  };

  const handleInvestmentsFieldChange = (
    id: string,
    field: 'amount' | 'note',
    value: string
  ) => {
    const updated = investments.map((entry) =>
      entry.id === id ? { ...entry, [field]: value } : entry
    );
    updateFormData({ investments: updated });
  };

  const removeSavings = (id: string) => {
    updateFormData({ savings: savings.filter((entry) => entry.id !== id) });
  };

  const removeInvestment = (id: string) => {
    updateFormData({ investments: investments.filter((entry) => entry.id !== id) });
  };

  const totalSavings = savings.reduce(
    (sum, entry) => sum + (Number(entry.amount) || 0),
    0
  );
  const totalInvestments = investments.reduce(
    (sum, entry) => sum + (Number(entry.amount) || 0),
    0
  );

  const hasEntries = savings.length + investments.length > 0;
  const allFilled = [...savings, ...investments].every(
    (entry) => entry.amount && Number(entry.amount) > 0
  );
  const canFinish = hasEntries && allFilled && !isSubmitting;

  const handleFinish = async () => {
    if (!canFinish) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      savings: savings.map(({ category, amount, note }) => ({
        category,
        amount: Number(amount),
        note: note?.trim() || undefined,
      })),
      investments: investments.map(({ category, amount, note }) => ({
        category,
        amount: Number(amount),
        note: note?.trim() || undefined,
      })),
    };

    try {
      await submitSavingsAndInvestments(payload);
      onFinish();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to save your balances. Please try again.';
      setSubmitError(message);
      window.alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderEntryCard = (
    entry: SavingsItem | InvestmentItem,
    onChange: typeof handleSavingsFieldChange,
    onRemove: (id: string) => void
  ) => (
    <div
      key={entry.id}
      className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#111827]">{entry.category}</p>
          {entry.source === 'custom' && (
            <p className="text-xs text-text/60">Custom</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          className="text-xs font-medium text-[#DC2626] hover:text-[#B91C1C]"
        >
          Remove
        </button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-[#111827]">
          Amount (₹)
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text/60">
              ₹
            </span>
            <input
              type="number"
              min="0"
              step="500"
              value={entry.amount || ''}
              onChange={(event) =>
                onChange(entry.id, 'amount', event.target.value)
              }
              placeholder="0"
              className="w-full rounded-lg border border-[#E5E7EB] bg-white px-6 py-3 text-sm text-[#111827] focus:border-[pastel-green] focus:outline-none focus:ring-2 focus:ring-[pastel-green]/30"
            />
          </div>
        </label>
        <label className="text-sm font-medium text-[#111827]">
          Note (optional)
          <input
            type="text"
            value={entry.note || ''}
            onChange={(event) => onChange(entry.id, 'note', event.target.value)}
            placeholder="Example: emergency fund / equity SIP"
            className="mt-1 w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#111827] focus:border-[pastel-green] focus:outline-none focus:ring-2 focus:ring-[pastel-green]/30"
          />
        </label>
      </div>
    </div>
  );

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
              <div className="h-2 flex-1 rounded-xl bg-[pastel-green]"></div>
            </div>
            <p className="text-sm text-text/60">Step 5 of 5</p>
          </div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text mb-2">
              Add your current balances
            </h1>
            <p className="text-text/70">
              Add how much you currently have in savings & investments (up to today).
            </p>
          </div>

          <div className="mb-12">
            <div className="mb-4 border-b border-[#E5E7EB] pb-3">
              <h2 className="text-base font-bold text-[#111827]">Savings</h2>
              <p className="text-sm text-text/60 mt-1">{SAVING_SUBTITLE}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {SAVINGS_OPTIONS.map((option) => {
                const selected = savings.some((entry) => entry.category === option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => addSavingsEntry(option, 'preset')}
                    disabled={selected}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      selected
                        ? 'bg-[pastel-green] text-text cursor-not-allowed'
                        : 'bg-white border border-[#E5E7EB] text-[#111827] hover:border-[pastel-green] hover:bg-[pastel-green]/5'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowSavingsCustom(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-[#E5E7EB] text-[#111827] hover:border-[pastel-green] hover:bg-[pastel-green]/5"
              >
                + Add custom saving
              </button>
            </div>
            {showSavingsCustom && (
              <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <label className="text-sm font-medium text-[#111827]">
                  Give it a name
                  <input
                    type="text"
                    value={customSavingsName}
                    onChange={(event) => setCustomSavingsName(event.target.value)}
                    placeholder="Example: Emergency fund"
                    className="mt-1 w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#111827] focus:border-[pastel-green] focus:outline-none focus:ring-2 focus:ring-[pastel-green]/30"
                  />
                </label>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!customSavingsName.trim()) return;
                      addSavingsEntry(customSavingsName.trim(), 'custom');
                      setCustomSavingsName('');
                      setShowSavingsCustom(false);
                    }}
                    disabled={!customSavingsName.trim()}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                      !customSavingsName.trim()
                        ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                        : 'bg-[pastel-green] text-text'
                    }`}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSavingsCustom(false);
                      setCustomSavingsName('');
                    }}
                    className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {savings.length > 0 && (
              <div className="mt-6 space-y-4">
                {savings.map((entry) =>
                  renderEntryCard(entry, handleSavingsFieldChange, removeSavings)
                )}
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <p className="text-xs font-semibold text-text/60 uppercase tracking-wide">
                    Savings summary
                  </p>
                  <p className="text-lg font-semibold text-[#111827] mt-1">
                    Total savings: ₹{totalSavings.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mb-12">
            <div className="mb-4 border-b border-[#E5E7EB] pb-3">
              <h2 className="text-base font-bold text-[#111827]">Investments</h2>
              <p className="text-sm text-text/60 mt-1">{INVESTMENT_SUBTITLE}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {INVESTMENT_OPTIONS.map((option) => {
                const selected = investments.some((entry) => entry.category === option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => addInvestmentEntry(option, 'preset')}
                    disabled={selected}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      selected
                        ? 'bg-[pastel-green] text-text cursor-not-allowed'
                        : 'bg-white border border-[#E5E7EB] text-[#111827] hover:border-[pastel-green] hover:bg-[pastel-green]/5'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowInvestmentsCustom(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-[#E5E7EB] text-[#111827] hover:border-[pastel-green] hover:bg-[pastel-green]/5"
              >
                + Add custom investment
              </button>
            </div>
            {showInvestmentsCustom && (
              <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <label className="text-sm font-medium text-[#111827]">
                  Investment name
                  <input
                    type="text"
                    value={customInvestmentsName}
                    onChange={(event) => setCustomInvestmentsName(event.target.value)}
                    placeholder="Example: Gold, Startup equity"
                    className="mt-1 w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#111827] focus:border-[pastel-green] focus:outline-none focus:ring-2 focus:ring-[pastel-green]/30"
                  />
                </label>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!customInvestmentsName.trim()) return;
                      addInvestmentEntry(customInvestmentsName.trim(), 'custom');
                      setCustomInvestmentsName('');
                      setShowInvestmentsCustom(false);
                    }}
                    disabled={!customInvestmentsName.trim()}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                      !customInvestmentsName.trim()
                        ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                        : 'bg-[pastel-green] text-text'
                    }`}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInvestmentsCustom(false);
                      setCustomInvestmentsName('');
                    }}
                    className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {investments.length > 0 && (
              <div className="mt-6 space-y-4">
                {investments.map((entry) =>
                  renderEntryCard(entry, handleInvestmentsFieldChange, removeInvestment)
                )}
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <p className="text-xs font-semibold text-text/60 uppercase tracking-wide">
                    Investment summary
                  </p>
                  <p className="text-lg font-semibold text-[#111827] mt-1">
                    Total invested: ₹{totalInvestments.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            )}
          </div>

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
                onClick={handleFinish}
                disabled={!canFinish}
                className={`px-6 py-3 rounded-xl font-medium shadow-lg shadow-[pastel-green]/25 ${
                  !canFinish
                    ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed shadow-none'
                    : 'bg-[pastel-green] text-text hover:bg-pastel-green/60'
                }`}
              >
                {isSubmitting ? 'Saving…' : 'Finish'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
