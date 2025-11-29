import { useState } from 'react';
import type { FormData } from './types';
import { OCCUPATION_OPTIONS, CITY_TYPES, RISK_LEVELS } from './constants';
import { submitBasicProfile } from '../../api/onboarding.api';

interface Props {
  formData: FormData;
  updateFormData: (updates: Partial<FormData>) => void;
  onNext: () => void;
  onSkip: () => void;
}

export default function Step1Profile({
  formData,
  updateFormData,
  onNext,
  onSkip,
}: Props) {
  const [loading, setLoading] = useState(false);
  const occupation = formData.occupation || [];
  const age = formData.age ?? '';
  const dependents = formData.dependents ?? 0;
  const cityType = formData.cityType || '';
  const riskLevel = formData.riskLevel || '';

  const toggleOccupation = (role: string) => {
    const newRoles = occupation.includes(role)
      ? occupation.filter((r) => r !== role)
      : [...occupation, role];
    updateFormData({ occupation: newRoles });
  };

  const getSelectionButtonClasses = (isSelected: boolean) =>
    `w-full p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
      isSelected
        ? 'border-pastel-green bg-pastel-green/30 shadow-soft'
        : 'border-pastel-tan/30 hover:border-pastel-green/50 bg-white/80'
    }`;

  const occupationButtons = OCCUPATION_OPTIONS.map((role) => {
    const isSelected = occupation.includes(role);
    return (
      <button
        key={role}
        type="button"
        onClick={() => toggleOccupation(role)}
        className={getSelectionButtonClasses(isSelected)}
      >
        <span
          className={`font-medium ${isSelected ? 'text-text' : 'text-text/70'}`}
        >
          {role}
        </span>
        {isSelected && (
          <svg
            className="w-5 h-5 text-text"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>
    );
  });

  const isNextDisabled =
    !age || occupation.length === 0 || !cityType || !riskLevel || loading;

  const handleAgeChange = (value: string) => {
    updateFormData({ age: value ? Number(value) : undefined });
  };

  const handleCitySelect = (value: string) => {
    updateFormData({ cityType: value });
  };

  const handleRiskSelect = (value: string) => {
    updateFormData({ riskLevel: value });
  };

  type ErrorResponse = {
    response?: {
      data?: {
        message?: string;
      };
    };
  };

  const handleNextClick = async () => {
    if (isNextDisabled) return;

    const payload = {
      occupation,
      age: Number(age),
      dependents,
      cityType,
      riskLevel,
    };

    setLoading(true);
    try {
      await submitBasicProfile(payload);
      updateFormData(payload);
      onNext();
    } catch (error) {
      const err = error as ErrorResponse;
      const message = err.response?.data?.message || 'Something went wrong';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pastel-beige flex items-center justify-center">
      <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/80 rounded-3xl p-8 shadow-soft border border-pastel-tan/20">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 flex-1 rounded-full bg-pastel-green"></div>
              <div className="h-2 flex-1 rounded-full bg-pastel-tan/30"></div>
              <div className="h-2 flex-1 rounded-full bg-pastel-tan/30"></div>
              <div className="h-2 flex-1 rounded-full bg-pastel-tan/30"></div>
              <div className="h-2 flex-1 rounded-full bg-pastel-tan/30"></div>
            </div>
            <p className="text-sm text-text/50">Step 1 of 5</p>
          </div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text mb-2">
              Let's get to know you
            </h1>
            <p className="text-sm text-text/60 mt-1">
              Helps us personalize your financial insights
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-2 space-y-4">
              <label className="block text-sm font-medium text-text/60">
                What describes you best? (Select all that apply)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {occupationButtons}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <label className="block text-sm font-medium text-text/60">
                Where do you live?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {CITY_TYPES.map((option) => {
                  const isSelected = cityType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleCitySelect(option.value)}
                      className={getSelectionButtonClasses(isSelected)}
                    >
                      <span
                        className={`font-medium ${
                          isSelected ? 'text-text' : 'text-text/70'
                        }`}
                      >
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <label
                htmlFor="age"
                className="block text-sm font-medium text-text/60"
              >
                Enter your age
              </label>
              <input
                id="age"
                type="number"
                min={13}
                max={100}
                value={age === '' ? '' : age}
                onChange={(e) => handleAgeChange(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-pastel-tan/30 bg-white text-text focus:outline-none focus:ring-2 focus:ring-pastel-green/30"
                placeholder="Enter exact age"
              />
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text/60">
                  Number of Dependents: {dependents}
                </label>
                <p className="text-xs text-text/50">
                  This helps us understand your income and spending patterns
                </p>
              </div>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={dependents}
                  onChange={(e) =>
                    updateFormData({ dependents: Number(e.target.value) })
                  }
                  className="w-full h-2 bg-pastel-tan/30 rounded-lg appearance-none cursor-pointer accent-pastel-green"
                  style={{
                    background: `linear-gradient(to right, #d4ecd5 0%, #d4ecd5 ${(dependents / 5) * 100}%, #ead4ba ${(dependents / 5) * 100}%, #ead4ba 100%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-text/50">
                  <span>0</span>
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-text/60 mb-4">
                How would you rate your risk tolerance?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {RISK_LEVELS.map((option) => {
                  const isSelected = riskLevel === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleRiskSelect(option.value)}
                      className={getSelectionButtonClasses(isSelected)}
                    >
                      <span
                        className={`font-medium ${
                          isSelected ? 'text-text' : 'text-text/70'
                        }`}
                      >
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-8 flex gap-4 justify-between">
            <button
              type="button"
              disabled
              className="px-6 py-3 rounded-xl border border-pastel-tan/30 text-text/40 cursor-not-allowed bg-white/50"
            >
              Back
            </button>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onSkip}
                className="px-6 py-3 rounded-xl border border-pastel-tan/30 text-text hover:bg-pastel-orange/20 bg-white/80 transition-colors"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleNextClick}
                disabled={isNextDisabled}
                className={`px-6 py-3 rounded-xl font-semibold transition-colors shadow-soft ${
                  isNextDisabled
                    ? 'bg-pastel-tan/30 text-text/40 cursor-not-allowed'
                    : 'bg-pastel-green/40 text-text hover:bg-pastel-green/50'
                }`}
              >
                {loading ? 'Saving...' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
