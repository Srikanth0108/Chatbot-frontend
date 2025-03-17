// client/src/components/Chat/ChatInput.jsx
import React, { useState, useContext } from "react";
import { ChatContext } from "../../context/ChatContext";

const ChatInput = () => {
  const [message, setMessage] = useState("");
  const { sendMessage, isLoading, stopResponse } = useContext(ChatContext);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessage(message);
      setMessage("");
    }
  };

  const handleStopResponse = () => {
    stopResponse();
  };

  return (
    <div className="chat-input-container">
      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
          className="chat-input"
        />

        {isLoading ? (
          <button
            type="button"
            className="stop-button"
            onClick={handleStopResponse}
            title="Stop generating"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="6" y="6" width="12" height="12"></rect>
            </svg>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!message.trim()}
            className="send-button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 2L11 13"></path>
              <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
            </svg>
          </button>
        )}
      </form>
    </div>
  );
};

export default ChatInput;
