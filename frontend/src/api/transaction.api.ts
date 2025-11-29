import api from "./base";

// Placeholder for transaction API calls
// Add your transaction-related API functions here

export const getTransactions = () => {
  return api.get("/api/transactions");
};

export const createTransaction = (data: any) => {
  return api.post("/api/transactions", data);
};
