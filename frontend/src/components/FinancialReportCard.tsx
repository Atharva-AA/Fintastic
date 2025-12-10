import React from 'react';

interface ReportData {
  title: string;
  summary: string;
  positive: string;
  warning: string;
  actionStep: string;
  prediction?: string;
}

interface FinancialReportCardProps {
  data: ReportData | null;
  updatedAt?: string | Date;
  showPrediction?: boolean;
}

const FinancialReportCard: React.FC<FinancialReportCardProps> = ({ 
  data, 
  updatedAt,
  showPrediction = false 
}) => {
  if (!data) {
    return (
      <div className="bg-[#FFF7ED] border border-[#FCD9B6] rounded-2xl p-5 shadow-sm mt-4">
        <p className="text-[#7C2D12] text-sm">No insights available yet. Keep tracking your transactions!</p>
      </div>
    );
  }

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="bg-[#FFF7ED] border border-[#FCD9B6] rounded-2xl p-5 shadow-sm mt-4">
      <h2 className="text-lg font-semibold text-[#7C2D12] flex items-center gap-2 mb-1">
        <span className="w-3 h-3 rounded-full bg-[#FB923C]"></span>
        {data.title}
      </h2>
      
      {updatedAt && (
        <p className="text-xs text-gray-500 mt-1 mb-3">
          Updated {formatDate(updatedAt)}
        </p>
      )}

      {data.summary && (
        <div className="mb-4">
          <p className="text-sm text-[#7C2D12] leading-relaxed">{data.summary}</p>
        </div>
      )}

      <div className="mt-3 space-y-3 text-[#7C2D12]">
        {data.positive && (
          <div>
            <p className="font-semibold text-sm mb-1">👍 Positives</p>
            <p className="text-sm text-gray-700">{data.positive}</p>
          </div>
        )}

        {data.warning && (
          <div>
            <p className="font-semibold text-sm mb-1">⚠️ Improvements</p>
            <p className="text-sm text-gray-700">{data.warning}</p>
          </div>
        )}

        {data.actionStep && (
          <div>
            <p className="font-semibold text-sm mb-1">🎯 Next Action</p>
            <p className="text-sm text-gray-700">{data.actionStep}</p>
          </div>
        )}

        {showPrediction && data.prediction && (
          <div className="mt-4 pt-3 border-t border-[#FCD9B6]">
            <p className="font-semibold text-sm mb-1">🔮 Prediction</p>
            <p className="text-sm text-gray-700">{data.prediction}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialReportCard;

