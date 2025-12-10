
import axios from "axios";

// FastAPI (Chroma) endpoint
const CHROMA_URL = "http://localhost:8001/store-memory";

const isValidStat = (n) => {
  if (n === null || n === undefined) return false;
  if (Number.isNaN(Number(n))) return false;
  return Math.abs(Number(n)) <= 10_000_000;
};

// ============================================
// STANDARDIZED MEMORY TYPES (5 STRICT TYPES)
// ============================================
const VALID_MEMORY_TYPES = [
  "onboarding_profile",
  "daily_activity",
  "behavior_pattern",
  "decision_history",
  "goal_progress",
];

// Map old types to new standardized types
const TYPE_MAPPING = {
  // Onboarding types → onboarding_profile
  general: "onboarding_profile",
  onboarding_profile: "onboarding_profile",
  income_pattern: "onboarding_profile",
  spending_pattern: "onboarding_profile",
  investment_profile: "onboarding_profile",
  goal: "onboarding_profile", // onboarding goals
  
  // Activity types → daily_activity
  spending_alert: "daily_activity",
  positive_behavior: "daily_activity",
  daily_mentor: "daily_activity",
  
  // Behavior types → behavior_pattern
  chat_behavior: "behavior_pattern",
  
  // Decision types → decision_history
  decision_history: "decision_history",
  
  // Goal types → goal_progress
  goal_profile: "goal_progress", // manual goals
  goal_progress: "goal_progress",
};

// Map importance based on type and metadata
const getImportance = (type, metadata = {}) => {
  // High importance: critical alerts, goal completions, major decisions
  if (
    metadata.level === "CRITICAL" ||
    metadata.progress >= 100 ||
    metadata.kind === "stock" ||
    type === "decision_history"
  ) {
    return "high";
  }
  
  // Medium importance: high alerts, goal progress, positive behaviors
  if (
    metadata.level === "HIGH" ||
    metadata.level === "POSITIVE" ||
    metadata.progress >= 50 ||
    type === "goal_progress"
  ) {
    return "medium";
  }
  
  // Low importance: everything else
  return "low";
};

// Break large text into chunks
const chunkText = (text, chunkSize = 500) => {
  if (!text || typeof text !== "string") return [];

  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
};

const generateMemoryId = (userId, type, metadata = {}, index = 0) => {
  // If transaction-based memory → make it unique
  if (metadata?.transactionId) {
    return `${userId}_${type}_${metadata.transactionId}_${index}`;
  }

  // If goal-based memory → make it unique
  if (metadata?.goalId) {
    return `${userId}_${type}_${metadata.goalId}_${index}`;
  }

  // Otherwise normal predictable ID (like onboarding, profile, etc.)
  return `${userId}_${type}_${index}`;
};

/**
 * ✅ STANDARDIZED: Send summary memory to Vector DB (Chroma)
 * Enforces 5 strict memory types and standardized format
 * 
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string} params.content - Memory content
 * @param {string} params.type - Memory type (will be mapped to standard type)
 * @param {Object} params.metadata - Additional metadata
 * @param {string} params.metadata.source - Source of memory (onboarding, ai, manual, etc.)
 */
export const sendToMemory = async ({
  userId,
  content,
  type = "onboarding_profile",
  metadata = {},
}) => {
  try {
    if (!content || content.trim().length < 10) {
      console.log("⚠️ Memory too small, skipped");
      return;
    }

    // Map old type to new standardized type
    const standardizedType = TYPE_MAPPING[type] || "onboarding_profile";
    
    if (!VALID_MEMORY_TYPES.includes(standardizedType)) {
      console.warn(`⚠️ Invalid memory type: ${type}, mapped to: ${standardizedType}`);
    }

    const user = userId.toString();
    const chunks = chunkText(content);
    const date = new Date().toISOString().split("T")[0];
    const source = metadata.source || "system";
    const importance = getImportance(standardizedType, metadata);

    const snapshot = metadata.statsSnapshot;
    if (
      snapshot &&
      (!isValidStat(snapshot.monthlyExpense) ||
        !isValidStat(snapshot.monthlyIncome) ||
        !isValidStat(snapshot.savingsRate))
    ) {
      console.warn("🚫 Corrupt stats → Memory NOT stored");
      return;
    }

    const lastAmount =
      Number(
        metadata.lastAmount ??
          metadata.amount ??
          metadata.transactionAmount ??
          0
      ) || 0;

    if (metadata.level === "CRITICAL" && lastAmount < 50) {
      console.warn("🚫 Prevented test data from entering memory");
      return;
    }

    for (let i = 0; i < chunks.length; i++) {
      const memory = {
        id: generateMemoryId(user, standardizedType, metadata, i),
        userId: user,
        content: chunks[i],
        type: standardizedType, // Use standardized type
        metadata: {
          // Standardized metadata format
          source: source,
          date: date,
          importance: importance,
          order: i + 1,
          totalChunks: chunks.length,
          // Preserve original type for reference
          originalType: type,
          // Include all other metadata
          ...metadata,
        },
      };

      await axios.post(CHROMA_URL, memory);
      console.log(`✅ Memory stored: ${memory.id} (${standardizedType}, ${importance})`);
    }
  } catch (error) {
    console.error(
      "❌ Memory error:",
      error?.response?.data || error.message
    );
  }
};
