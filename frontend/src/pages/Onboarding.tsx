import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Step1Profile from '../components/onboarding/Step1Profile';
import Step2Income from '../components/onboarding/Step2Income';
import Step3Expenses from '../components/onboarding/Step3Expenses';
import Step4Goals from '../components/onboarding/Step4Goals';
import Step5Savings from '../components/onboarding/Step5Savings';
import type { FormData } from '../components/onboarding/types';
import { ErrorBoundary } from '../components/onboarding/ErrorBoundary';

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({});

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSkip = () => {
    const cleanData = cleanFormData(formData);
    localStorage.setItem('onboardingData', JSON.stringify(cleanData));
    navigate('/dashboard');
  };

  const handleFinish = () => {
    const cleanData = cleanFormData(formData);
    localStorage.setItem('onboardingData', JSON.stringify(cleanData));
    navigate('/dashboard');
  };

  const cleanFormData = (data: FormData): FormData => {
    const cleaned = { ...data };
    const tempKeys = Object.keys(cleaned).filter((key) => key.startsWith('_'));
    tempKeys.forEach((key) => {
      delete (cleaned as Record<string, unknown>)[key];
    });
    return cleaned;
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Step1Profile
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        );
      case 2:
        return (
          <Step2Income
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        );
      case 3:
        return (
          <Step3Expenses
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        );
      case 4:
        return (
          <Step4Goals
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        );
      case 5:
        return (
          <Step5Savings
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
            onFinish={handleFinish}
          />
        );
      default:
        return null;
    }
  };

  return <ErrorBoundary>{renderStep()}</ErrorBoundary>;
}
