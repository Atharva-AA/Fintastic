// utils/summary.utils.js

export const summarizeProfile = (user) => {
  return `
User profile:
Age: ${user.age || "unknown"}
Occupation: ${user.occupation?.join(", ") || "not specified"}
City type: ${user.cityType}
Dependents: ${user.dependents}
Risk level: ${user.riskLevel}
`;
};


export const summarizeIncomes = (transactions) => {
  const list = transactions.map(i =>
    `${i.category} ₹${i.amount} (${i.subtype})`
  ).join(", ");

  const isFixed = transactions.some(t => t.subtype === "fixed");

  return `
User income profile:
Sources: ${list}
Nature: ${isFixed ? "partially fixed" : "mostly irregular"}
Total sources: ${transactions.length}
`;
};


export const summarizeExpenses = (transactions) => {
  const total = transactions.reduce((a, b) => a + b.amount, 0);

  const categories = transactions.map(e => e.category).join(", ");

  const hasFixed = transactions.some(t => t.subtype === "fixed");

  return `
User expense behavior:
Categories: ${categories}
Approx total: ₹${total}
Nature: ${hasFixed ? "has fixed + variable" : "mostly variable"}
`;
};


export const summarizeGoals = (goals) => {
  const list = goals.map(g =>
    `${g.name} ₹${g.targetAmount} (${g.priority})`
  ).join(", ");

  return `
User financial goals:
${list}
`;
};


export const summarizeSavingsInvestments = (transactions) => {
  const savings = transactions.filter(t => t.type === "saving");
  const investments = transactions.filter(t => t.type === "investment");

  const sTotal = savings.reduce((a, b) => a + b.amount, 0);
  const iTotal = investments.reduce((a, b) => a + b.amount, 0);

  const invCategories = investments.map(i => i.category).join(", ");

  return `
Financial reserves:
Savings: ₹${sTotal}
Investment total: ₹${iTotal}
Investment types: ${invCategories || "none"}
`;
};
