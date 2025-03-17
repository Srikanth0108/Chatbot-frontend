// client/src/services/chatService.js
import api from "./api";

// For development, we'll simulate API responses
//const simulateResponse = (data, delay = 1000) => {
//  return new Promise((resolve) => {
//    setTimeout(() => {
//      resolve(data);
//    }, delay);
//  });
//};

export const sendChatMessage = async (
  conversationId,
  message,
  messageHistory = [],
  language = "en",
  signal = null
) => {
  try {
    // Include message history and language with the API call
    const response = await api.post(
      "/chat",
      {
        conversationId,
        message,
        messageHistory,
        language, // Add the language preference
      },
      { signal }
    ); // Pass the AbortController signal

    return response.data;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

export const getUserConversations = async (userId) => {
  try {
    // In a real app:
    const response = await api.get(`/conversations/${userId}`);
    return response.data;

    // For development, simulate API response
    //return simulateResponse([]);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    throw error;
  }
};
