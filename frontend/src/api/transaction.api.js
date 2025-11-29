import api from "./base";

// Placeholder for transaction API calls
// Add your transaction-related API functions here

export const getTransactions = () => {
  return api.get("/transactions");
};

export const createTransaction = (data) => {
  return api.post("/transactions", data);
};
