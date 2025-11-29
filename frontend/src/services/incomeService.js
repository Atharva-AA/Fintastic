import api from '../api/base';

// Cookie-based auth - no token needed, cookies are sent automatically
export const getIncomeIntelligence = async () => {
  const { data } = await api.get('/api/income/intelligence');
  return data;
};

export const addIncomeEntry = async (payload) => {
  const body = {
    type: 'income',
    amount: payload.amount,
    text: payload.text,
  };

  const { data } = await api.post('/api/transactions/add', body);
  return data;
};



