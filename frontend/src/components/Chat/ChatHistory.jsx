// client/src/components/Chat/ChatHistory.jsx
import React, { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";

// In ChatHistory.jsx
const ChatHistory = ({ messages }) => {
  const messagesEndRef = useRef(null);
  const prevMessageCountRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Only scroll when the number of messages changes (new message added)
    if (messages.length > prevMessageCountRef.current) {
      scrollToBottom();
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  // Rest of the component remains the same

  return (
    <div className="chat-history">
      {messages.length === 0 ? (
        <div className="empty-chat">
          <div className="empty-chat-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M8 12h8"></path>
              <path d="M12 8v8"></path>
            </svg>
          </div>
          <h3>Start a new conversation</h3>
          <p>Ask a question to start chatting with AI</p>
        </div>
      ) : (
        messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatHistory;
