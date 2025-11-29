// utils/parseTransaction.utils.js

import axios from "axios";

const AI_URL = "http://127.0.0.1:8001/classify"; // your FastAPI

export const parseTransaction = async (text, amount) => {
  try {
    const response = await axios.post(AI_URL, {
      description: text,
      amount: Number(amount)
    });

    /*
      FastAPI will return something like:
      {
        type: "expense",
        category: "Clothes",
        subtype: "variable",
        note: "Bought clothes"
      }
    */

    return response.data;

  } catch (error) {
    console.error("FastAPI PARSE error:", error.message);

    // Fallback
    return {
      type: "expense",
      category: "Other",
      subtype: "one-time",
      note: text
    };
  }
};
