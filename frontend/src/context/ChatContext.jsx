import React, { createContext, useState, useContext, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import { saveToLocalStorage, getFromLocalStorage } from "../utils/localStorage";
import { sendChatMessage, getUserConversations } from "../services/chatService";
import { v4 as uuidv4 } from "uuid";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { currentUser, isAuthenticated } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState("");
  const [abortController, setAbortController] = useState(null);
  // Track which conversation is currently processing a response
  const [processingConversationId, setProcessingConversationId] = useState(null);

  // Load conversations when user is authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      loadUserConversations();
    } else {
      // Clear conversations if user is not authenticated
      setConversations([]);
      setActiveConversation(null);
    }
  }, [isAuthenticated, currentUser]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      loadConversationMessages(activeConversation.id);
      
      // Update loading state based on whether this conversation is being processed
      setIsLoading(processingConversationId === activeConversation.id);
    } else {
      setMessages([]);
    }
  }, [activeConversation, processingConversationId]);

  const setActiveConversationWithStorage = (conversation) => {
    // Don't update if we're already on this conversation
    if (activeConversation?.id === conversation.id) return;
    
    setActiveConversation(conversation);
    if (currentUser && conversation) {
      localStorage.setItem(
        `${currentUser.id}_activeConversation`,
        conversation.id
      );
    }
  };

  const loadUserConversations = async () => {
    try {
      const storageKey = `${currentUser.id}_conversations`;
      const storedConversations = getFromLocalStorage(storageKey) || [];
      setConversations(storedConversations);

      // Get the stored active conversation ID
      const activeConvId = localStorage.getItem(
        `${currentUser.id}_activeConversation`
      );

      if (
        activeConvId &&
        storedConversations.some((conv) => conv.id === activeConvId)
      ) {
        // Find and set the active conversation
        const activeConv = storedConversations.find(
          (conv) => conv.id === activeConvId
        );
        setActiveConversation(activeConv);
      } else if (storedConversations.length > 0) {
        // Fall back to the first conversation if stored ID not found
        setActiveConversation(storedConversations[0]);
      } else {
        // Create a new conversation if none exist
        createNewConversation();
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  const loadConversationMessages = async (conversationId) => {
    try {
      // For this example, we'll use local storage
      const storageKey = `${currentUser.id}_messages_${conversationId}`;
      const storedMessages = getFromLocalStorage(storageKey) || [];
      setMessages(storedMessages);

      // Find the last user message if any
      const userMessages = storedMessages.filter(
        (msg) => msg.sender === "user"
      );
      if (userMessages.length > 0) {
        setLastUserMessage(userMessages[userMessages.length - 1].content);
      } else {
        setLastUserMessage("");
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const createNewConversation = (baseConversations = null) => {
    const newConversation = {
      id: uuidv4(),
      title: "New Conversation",
      timestamp: new Date().toISOString(),
      userId: currentUser?.id,
    };

    // Use the provided base or the current state
    const updatedConversations = [
      newConversation,
      ...(baseConversations || conversations),
    ];
    setConversations(updatedConversations);
    setActiveConversation(newConversation);
    setMessages([]);
    setLastUserMessage("");

    // Save to local storage
    if (currentUser) {
      const storageKey = `${currentUser.id}_conversations`;
      saveToLocalStorage(storageKey, updatedConversations);
    }
  };

  const updateConversationTitle = (conversationId, firstMessage) => {
    // Create a title from the first message (truncate if needed)
    const title =
      firstMessage.length > 30
        ? `${firstMessage.substring(0, 30)}...`
        : firstMessage;

    const updatedConversations = conversations.map((conv) =>
      conv.id === conversationId ? { ...conv, title } : conv
    );
    
    setConversations(updatedConversations);

    if (activeConversation?.id === conversationId) {
      setActiveConversation((prev) => ({ ...prev, title }));
    }

    // Save to local storage
    if (currentUser) {
      const storageKey = `${currentUser.id}_conversations`;
      saveToLocalStorage(storageKey, updatedConversations);
    }
  };

  const sendMessage = async (content) => {
    if (!activeConversation) {
      createNewConversation();
    }

    // Store the conversation ID we're currently processing
    const currentConversationId = activeConversation.id;
    
    // Set this conversation as processing
    setProcessingConversationId(currentConversationId);
    
    // Create a new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);
    setIsLoading(true);
    setLastUserMessage(content);

    try {
      // Get the preferred language from localStorage
      const preferredLanguage =
        localStorage.getItem("preferredLanguage") || "en";

      // Add user message
      const userMessage = {
        id: uuidv4(),
        content,
        sender: "user",
        timestamp: new Date().toISOString(),
      };

      // Store current messages for this conversation
      const currentMessages = [...messages];
      const updatedMessages = [...currentMessages, userMessage];
      
      // If this is the first message, update conversation title
      if (currentMessages.length === 0) {
        updateConversationTitle(currentConversationId, content);
      }

      // Save messages to local storage
      if (currentUser) {
        const storageKey = `${currentUser.id}_messages_${currentConversationId}`;
        saveToLocalStorage(storageKey, updatedMessages);
      }

      // Update UI if we're still on the same conversation
      if (activeConversation?.id === currentConversationId) {
        setMessages(updatedMessages);
      }

      // Send message to backend with conversation history and language preference
      const response = await sendChatMessage(
        currentConversationId,
        content,
        currentMessages, // Pass the existing messages as history
        preferredLanguage, // Pass the language preference
        controller.signal // Pass the AbortController signal
      );

      // Add AI response
      const aiMessage = {
        id: uuidv4(),
        content: response.message,
        sender: "ai",
        timestamp: new Date().toISOString(),
        language: preferredLanguage,
      };

      const finalMessages = [...updatedMessages, aiMessage];
      
      // Update conversations with the latest timestamp
      const updatedConversations = conversations.map((conv) =>
        conv.id === currentConversationId 
          ? { ...conv, timestamp: new Date().toISOString() } 
          : conv
      );
      setConversations(updatedConversations);
      
      // Save updated conversations to local storage
      if (currentUser) {
        const storageKey = `${currentUser.id}_conversations`;
        saveToLocalStorage(storageKey, updatedConversations);
      }

      // Save updated messages to local storage
      if (currentUser) {
        const storageKey = `${currentUser.id}_messages_${currentConversationId}`;
        saveToLocalStorage(storageKey, finalMessages);
      }

      // Update UI only if we're still on the same conversation
      if (activeConversation?.id === currentConversationId) {
        setMessages(finalMessages);
      }
      
    } catch (error) {
      // Don't show error message if the request was aborted
      if (error.name !== "AbortError") {
        console.error("Error sending message:", error);

        // Add error message
        const errorMessage = {
          id: uuidv4(),
          content: "Sorry, I couldn't process your request. Please try again.",
          sender: "ai",
          timestamp: new Date().toISOString(),
          isError: true,
        };

        // Get the current messages from local storage
        if (currentUser) {
          const storageKey = `${currentUser.id}_messages_${currentConversationId}`;
          const storedMessages = getFromLocalStorage(storageKey) || [];
          const updatedMessages = [...storedMessages, errorMessage];
          
          // Save to local storage
          saveToLocalStorage(storageKey, updatedMessages);
          
          // Update UI only if we're still on the same conversation
          if (activeConversation?.id === currentConversationId) {
            setMessages(updatedMessages);
          }
        }
      }
    } finally {
      // Clear the processing state
      setProcessingConversationId(null);
      setAbortController(null);
      
      // Clear the loading state if we're still on the same conversation
      if (activeConversation?.id === currentConversationId) {
        setIsLoading(false);
      }
    }
  };

  const stopResponse = () => {
    if (abortController) {
      abortController.abort();
      setIsLoading(false);
      setAbortController(null);
      setProcessingConversationId(null);
    }
  };

  const regenerateResponse = async (messageId) => {
    // Find the message to regenerate
    const messageIndex = messages.findIndex((msg) => msg.id === messageId);
    if (messageIndex === -1 || messages[messageIndex].sender !== "ai") {
      return;
    }

    // Store the conversation ID we're currently processing
    const currentConversationId = activeConversation.id;
    
    // Set this conversation as processing
    setProcessingConversationId(currentConversationId);
    
    // Create a new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);
    setIsLoading(true);

    try {
      // Find the corresponding user message that came before this AI message
      let userMessageIndex = messageIndex - 1;
      while (
        userMessageIndex >= 0 &&
        messages[userMessageIndex].sender !== "user"
      ) {
        userMessageIndex--;
      }

      if (userMessageIndex < 0) {
        throw new Error("No user message found before this AI response");
      }

      const userMessage = messages[userMessageIndex];
      const userMessageContent = userMessage.content;

      // If regenerating a message that's not the last one, remove all subsequent messages
      let updatedMessages;
      if (messageIndex < messages.length - 1) {
        updatedMessages = messages.slice(0, messageIndex);
      } else {
        // Just remove the last AI message if it's the last one in the conversation
        updatedMessages = messages.filter((msg) => msg.id !== messageId);
      }

      // Save to local storage
      if (currentUser) {
        const storageKey = `${currentUser.id}_messages_${currentConversationId}`;
        saveToLocalStorage(storageKey, updatedMessages);
      }

      // Update UI only if we're still on the same conversation
      if (activeConversation?.id === currentConversationId) {
        setMessages(updatedMessages);
      }

      // Get the preferred language from localStorage
      const preferredLanguage =
        localStorage.getItem("preferredLanguage") || "en";

      // Send the corresponding user message to get a new AI response
      const response = await sendChatMessage(
        currentConversationId,
        userMessageContent,
        updatedMessages.slice(0, userMessageIndex), // Pass the conversation history up to this point
        preferredLanguage,
        controller.signal
      );

      // Add the new AI response
      const newAiMessage = {
        id: uuidv4(),
        content: response.message,
        sender: "ai",
        timestamp: new Date().toISOString(),
        language: preferredLanguage,
      };

      const finalMessages = [...updatedMessages, newAiMessage];
      
      // Update conversations with the latest timestamp
      const updatedConversations = conversations.map((conv) =>
        conv.id === currentConversationId 
          ? { ...conv, timestamp: new Date().toISOString() } 
          : conv
      );
      setConversations(updatedConversations);
      
      // Save updated conversations to local storage
      if (currentUser) {
        const storageKey = `${currentUser.id}_conversations`;
        saveToLocalStorage(storageKey, updatedConversations);
      }

      // Save updated messages to local storage
      if (currentUser) {
        const storageKey = `${currentUser.id}_messages_${currentConversationId}`;
        saveToLocalStorage(storageKey, finalMessages);
      }

      // Update UI only if we're still on the same conversation
      if (activeConversation?.id === currentConversationId) {
        setMessages(finalMessages);
        setLastUserMessage(userMessageContent);
      }
      
    } catch (error) {
      // Don't show error message if the request was aborted
      if (error.name !== "AbortError") {
        console.error("Error regenerating response:", error);

        // Add error message
        const errorMessage = {
          id: uuidv4(),
          content: "Sorry, I couldn't regenerate a response. Please try again.",
          sender: "ai",
          timestamp: new Date().toISOString(),
          isError: true,
        };

        // Get the current messages from local storage
        if (currentUser) {
          const storageKey = `${currentUser.id}_messages_${currentConversationId}`;
          const storedMessages = getFromLocalStorage(storageKey) || [];
          const updatedMessages = [...storedMessages, errorMessage];
          
          // Save to local storage
          saveToLocalStorage(storageKey, updatedMessages);
          
          // Update UI only if we're still on the same conversation
          if (activeConversation?.id === currentConversationId) {
            setMessages(updatedMessages);
          }
        }
      }
    } finally {
      // Clear the processing state
      setProcessingConversationId(null);
      setAbortController(null);
      
      // Clear the loading state if we're still on the same conversation
      if (activeConversation?.id === currentConversationId) {
        setIsLoading(false);
      }
    }
  };

const provideMessageFeedback = (messageId, isPositive) => {
    // Find the message to provide feedback for
    const messageToRate = messages.find((msg) => msg.id === messageId);
    if (!messageToRate || messageToRate.sender !== "ai") {
      return;
    }

    // In a real app, you would send this feedback to your backend
    console.log(
      `Feedback for message ${messageId}: ${isPositive ? "Good" : "Bad"}`
    );

    // Update the message with feedback status
    const updatedMessages = messages.map((msg) =>
      msg.id === messageId
        ? { ...msg, feedback: isPositive ? "positive" : "negative" }
        : msg
    );

    setMessages(updatedMessages);

    // Save to local storage
    if (currentUser && activeConversation) {
      const storageKey = `${currentUser.id}_messages_${activeConversation.id}`;
      saveToLocalStorage(storageKey, updatedMessages);
    }
  };

  const deleteConversation = (conversationId) => {
    // If this conversation is being processed, abort it
    if (processingConversationId === conversationId && abortController) {
      abortController.abort();
      setAbortController(null);
      setProcessingConversationId(null);
    }

    // Remove conversation from list
    setConversations((prev) =>
      prev.filter((conv) => conv.id !== conversationId)
    );

    // If active conversation is deleted, set active to the next one or null
    if (activeConversation?.id === conversationId) {
      const nextConversation = conversations.find(
        (conv) => conv.id !== conversationId
      );
      setActiveConversation(nextConversation || null);
    }

    // Remove from local storage
    if (currentUser) {
      localStorage.removeItem(`${currentUser.id}_messages_${conversationId}`);
      const storageKey = `${currentUser.id}_conversations`;
      saveToLocalStorage(
        storageKey,
        conversations.filter((conv) => conv.id !== conversationId)
      );
    }
  };

  const deleteAllConversations = () => {
    // If any conversation is being processed, abort it
    if (processingConversationId && abortController) {
      abortController.abort();
      setAbortController(null);
      setProcessingConversationId(null);
    }

    // Clear all conversations from state
    setConversations([]);
    setActiveConversation(null);
    setMessages([]);

    // Clear all related data from localStorage
    if (currentUser) {
      // Find and remove all conversation-related data for this user
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(`${currentUser.id}_`)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // Create a new empty conversation
      createNewConversation([]);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        conversations,
        activeConversation,
        isLoading,
        setActiveConversation: setActiveConversationWithStorage,
        sendMessage,
        createNewConversation,
        deleteConversation,
        deleteAllConversations,
        regenerateResponse,
        provideMessageFeedback,
        stopResponse,
        // Expose processing state for UI indicators
        processingConversationId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export default ChatProvider;