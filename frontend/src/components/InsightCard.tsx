import React from 'react';

interface InsightReport {
  title?: string;
  summary?: string;
  positive?: string;
  warning?: string;
  actionStep?: string;
  prediction?: string;
}

interface InsightCardProps {
  report: InsightReport | null;
}

// Helper function to filter out "None" from text
const filterNone = (text: string | undefined): string | undefined => {
  if (!text) return text;
  // Remove standalone "None" word (case-insensitive) and clean up extra spaces
  return (
    text
      .replace(/\bNone\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim() || undefined
  );
};

const InsightCard: React.FC<InsightCardProps> = ({ report }) => {
  if (!report) {
    return null;
  }

  // Filter out "None" from all fields
  const filteredReport = {
    title: filterNone(report.title),
    summary: filterNone(report.summary),
    positive: filterNone(report.positive),
    warning: filterNone(report.warning),
    actionStep: filterNone(report.actionStep),
    prediction: filterNone(report.prediction),
  };

  const hasContent =
    filteredReport.title ||
    filteredReport.summary ||
    filteredReport.positive ||
    filteredReport.warning ||
    filteredReport.actionStep ||
    filteredReport.prediction;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-6 shadow-sm border border-pastel-tan/20 dark:border-gray-700">
      {filteredReport.title && (
        <h3 className="text-base font-semibold text-text dark:text-white mb-3">
          {filteredReport.title}
        </h3>
      )}

      {filteredReport.summary && (
        <>
          <p className="text-sm text-text/80 dark:text-gray-300 leading-relaxed">
            {filteredReport.summary}
          </p>
          {(filteredReport.positive ||
            filteredReport.warning ||
            filteredReport.actionStep ||
            filteredReport.prediction) && (
            <div className="border-t border-pastel-tan/20 dark:border-gray-700 my-4" />
          )}
        </>
      )}

      {filteredReport.positive && (
        <>
          <p className="text-sm text-text/80 dark:text-gray-300 leading-relaxed mb-3">
            {filteredReport.positive}
          </p>
          {(filteredReport.warning ||
            filteredReport.actionStep ||
            filteredReport.prediction) && (
            <div className="border-t border-pastel-tan/20 dark:border-gray-700 my-3" />
          )}
        </>
      )}

      {filteredReport.warning && (
        <>
          <p className="text-sm text-text/80 dark:text-gray-300 leading-relaxed mb-3">
            {filteredReport.warning}
          </p>
          {(filteredReport.actionStep || filteredReport.prediction) && (
            <div className="border-t border-pastel-tan/20 dark:border-gray-700 my-3" />
          )}
        </>
      )}

      {filteredReport.actionStep && (
        <>
          <p className="text-sm text-text/80 dark:text-gray-300 leading-relaxed mb-3">
            {filteredReport.actionStep}
          </p>
          {filteredReport.prediction && (
            <div className="border-t border-pastel-tan/20 dark:border-gray-700 my-3" />
          )}
        </>
      )}

      {filteredReport.prediction && (
        <p className="text-sm text-text/80 dark:text-gray-300 leading-relaxed">
          {filteredReport.prediction}
        </p>
      )}
    </div>
  );
};

export default InsightCard;
