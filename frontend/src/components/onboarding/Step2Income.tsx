import { useMemo, useState } from 'react';
import type { FormData, IncomeItem, IncomeSubtype } from './types';
import { FIXED_INCOME, VARIABLE_INCOME } from './constants';
import { submitIncome } from '../../api/onboarding.api';

interface Props {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const ONE_TIME_INCOME = ['Bonus', 'Gift', 'Tax refund', 'One-time project'];

const SECTION_CONFIG: {
  title: string;
  subtitle: string;
  subtype: IncomeSubtype;
  chips: string[];
}[] = [
  {
    title: 'Fixed Income (This Month)',
    subtitle:
      'Salary, retainers, rental income — anything guaranteed every month.',
    subtype: 'fixed',
    chips: FIXED_INCOME,
  },
  {
    title: 'Variable Income (This Month)',
    subtitle: 'Freelance work, commissions, gig payouts, tips.',
    subtype: 'variable',
    chips: VARIABLE_INCOME,
  },
  {
    title: 'One-time Income (This Month)',
    subtitle: 'Bonuses, gifts, refunds — money you expect just once.',
    subtype: 'one-time',
    chips: ONE_TIME_INCOME,
  },
];

const subtypeLabel: Record<IncomeSubtype, string> = {
  fixed: 'Fixed',
  variable: 'Variable',
  'one-time': 'One-time',
};

export default function Step2Income({
  formData,
  updateFormData,
  onNext,
  onBack,
  onSkip,
}: Props) {
  const incomes: IncomeItem[] = useMemo(
    () => (Array.isArray(formData.incomes) ? formData.incomes : []),
    [formData.incomes]
  );
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customSubtype, setCustomSubtype] = useState<IncomeSubtype>('fixed');
  const [customName, setCustomName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSelect = (label: string, subtype: IncomeSubtype) => {
    const exists = incomes.some(
      (income) =>
        income.category.toLowerCase() === label.toLowerCase() &&
        income.subtype === subtype
    );
    if (exists) return;
    const newIncome: IncomeItem = {
      id: `${subtype}-${label}-${Date.now()}`,
      category: label,
      subtype,
      amount: '',
      note: '',
      source: 'preset',
    };
    updateFormData({ incomes: [...incomes, newIncome] });
  };

  const handleRemove = (id: string) => {
    updateFormData({ incomes: incomes.filter((income) => income.id !== id) });
  };

  const handleFieldChange = (
    id: string,
    field: 'amount' | 'note',
    value: string
  ) => {
    const updated = incomes.map((income) =>
      income.id === id ? { ...income, [field]: value } : income
    );
    updateFormData({ incomes: updated });
  };

  const handleAddCustomIncome = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    const exists = incomes.some(
      (income) =>
        income.category.toLowerCase() === trimmed.toLowerCase() &&
        income.subtype === customSubtype
    );
    if (exists) {
      setShowCustomForm(false);
      setCustomName('');
      return;
    }
    const newIncome: IncomeItem = {
      id: `custom-${customSubtype}-${Date.now()}`,
      category: trimmed,
      subtype: customSubtype,
      amount: '',
      note: '',
      source: 'custom',
    };
    updateFormData({ incomes: [...incomes, newIncome] });
    setShowCustomForm(false);
    setCustomName('');
    setCustomSubtype('fixed');
  };

  const incomesBySubtype = (subtype: IncomeSubtype) =>
    incomes.filter((income) => income.subtype === subtype);

  const allAmountsFilled =
    incomes.length > 0 &&
    incomes.every(
      (income) =>
        income.amount !== undefined &&
        income.amount !== '' &&
        !Number.isNaN(Number(income.amount)) &&
        Number(income.amount) > 0
    );

  const canSubmit = incomes.length > 0 && allAmountsFilled && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setSubmitError(null);
    const payload = {
      incomes: incomes.map((income) => ({
        category: income.category,
        amount: Number(income.amount),
        subtype: income.subtype,
        note: income.note?.trim() || undefined,
      })),
    };

    try {
      await submitIncome(payload);
      onNext();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || 'Unable to save income. Please try again.';
      setSubmitError(message);
      window.alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSelectedIncomes = (subtype: IncomeSubtype) => {
    const selected = incomesBySubtype(subtype);
    if (!selected.length) return null;
    return (
      <div className="mt-4 space-y-4">
        {selected.map((income) => (
          <div
            key={income.id}
            className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#111827]">
                  {income.category}
                </p>
                <p className="text-xs text-text/60 mt-0.5">
                  {subtypeLabel[income.subtype]} income · This month only
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(income.id)}
                className="text-xs font-medium text-[#DC2626] hover:text-[#B91C1C]"
              >
                Remove
              </button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-[#111827]">
                Amount this month (₹)
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text/60">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    inputMode="decimal"
                    value={income.amount || ''}
                    onChange={(event) =>
                      handleFieldChange(income.id, 'amount', event.target.value)
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
                  value={income.note || ''}
                  onChange={(event) =>
                    handleFieldChange(income.id, 'note', event.target.value)
                  }
                  placeholder="Example: Main job / gigs / Diwali bonus"
                  className="mt-1 w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#111827] focus:border-[pastel-green] focus:outline-none focus:ring-2 focus:ring-[pastel-green]/30"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const totalIncome = incomes.reduce(
    (sum, income) => sum + (Number(income.amount) || 0),
    0
  );

  return (
    <div className="min-h-screen bg-pastel-beige flex items-center justify-center">
      <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/80 rounded-3xl p-8 shadow-soft border border-pastel-tan/20">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 flex-1 rounded-xl bg-[pastel-green]"></div>
              <div className="h-2 flex-1 rounded-xl bg-[pastel-green]"></div>
              <div className="h-2 flex-1 rounded-xl bg-pastel-tan/30"></div>
              <div className="h-2 flex-1 rounded-xl bg-pastel-tan/30"></div>
              <div className="h-2 flex-1 rounded-xl bg-pastel-tan/30"></div>
            </div>
            <p className="text-sm text-text/60">Step 2 of 5</p>
          </div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text mb-2">
              Enter your income for this month
            </h1>
            <p className="text-text/70">
              Just the exact amounts you expect to receive — no averages, no projections.
            </p>
          </div>

          {SECTION_CONFIG.map((section) => (
            <div key={section.subtype} className="mb-12">
              <div className="mb-4 border-b border-[#E5E7EB] pb-3">
                <h2 className="text-base font-bold text-[#111827]">
                  {section.title}
                </h2>
                <p className="text-sm text-text/60 mt-1">{section.subtitle}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {section.chips.map((chip) => {
                  const isSelected = incomes.some(
                    (income) =>
                      income.category === chip && income.subtype === section.subtype
                  );
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleSelect(chip, section.subtype)}
                      disabled={isSelected}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        isSelected
                          ? 'bg-[pastel-green] text-text cursor-not-allowed'
                          : 'bg-white border border-[#E5E7EB] text-[#111827] hover:border-[pastel-green] hover:bg-[pastel-green]/5'
                      }`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
              {renderSelectedIncomes(section.subtype)}
            </div>
          ))}

          <div className="mb-12">
            <h2 className="text-base font-bold text-[#111827] mb-2">
              Custom income
            </h2>
            <p className="text-sm text-text/60 mb-4">
              Add any other source you receive this month.
            </p>
            {showCustomForm ? (
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <label className="text-sm font-medium text-[#111827]">
                  Income name
                  <input
                    type="text"
                    value={customName}
                    onChange={(event) => setCustomName(event.target.value)}
                    placeholder="Example: Tuition, Rent from flat"
                    className="mt-1 w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#111827] focus:border-[pastel-green] focus:outline-none focus:ring-2 focus:ring-[pastel-green]/30"
                  />
                </label>
                <div className="mt-4">
                  <p className="text-xs font-semibold text-text/70 mb-2">
                    Select type
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(['fixed', 'variable', 'one-time'] as IncomeSubtype[]).map(
                      (subtype) => (
                        <button
                          key={subtype}
                          type="button"
                          onClick={() => setCustomSubtype(subtype)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium ${
                            customSubtype === subtype
                              ? 'bg-[pastel-green] text-text'
                              : 'bg-white border border-[#E5E7EB] text-[#111827]'
                          }`}
                        >
                          {subtypeLabel[subtype]}
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleAddCustomIncome}
                    disabled={!customName.trim()}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold ${
                      !customName.trim()
                        ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed'
                        : 'bg-[pastel-green] text-text hover:bg-pastel-green/60'
                    }`}
                  >
                    Add income
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomForm(false);
                      setCustomName('');
                      setCustomSubtype('fixed');
                    }}
                    className="px-5 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#111827]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomForm(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-[#E5E7EB] text-[#111827] hover:border-[pastel-green] hover:bg-[pastel-green]/5"
              >
                + Add custom income
              </button>
            )}
          </div>

          {incomes.length > 0 && (
            <div className="mb-8 rounded-2xl border border-[#E5E7EB] bg-white/90 p-4">
              <p className="text-xs font-semibold text-text/60 uppercase tracking-wide">
                This month so far
              </p>
              <p className="text-3xl font-bold text-[#111827] mt-1">
                ₹{totalIncome.toLocaleString('en-IN')}
              </p>
              <p className="text-sm text-text/60 mt-1">
                {incomes.length} income source{incomes.length > 1 ? 's' : ''} added
              </p>
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
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`px-6 py-3 rounded-xl font-medium shadow-lg shadow-[pastel-green]/25 ${
                  !canSubmit
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
