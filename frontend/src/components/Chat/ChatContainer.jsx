// client/src/components/Chat/ChatContainer.jsx
import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";
import Sidebar from "./Sidebar";
import ChatHistory from "./ChatHistory";
import ChatInput from "./ChatInput";
import "./Chat.css";

const ChatContainer = () => {
  const { currentUser } = useContext(AuthContext);
  const { messages, conversations, activeConversation, setActiveConversation } =
    useContext(ChatContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="chat-container">
      <Sidebar
        conversations={conversations}
        activeConversation={activeConversation}
        setActiveConversation={setActiveConversation}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      <div className="chat-main">
        <div className="chat-header">
          <button
            className="sidebar-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 12H21M3 6H21M3 18H21"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h2>{activeConversation?.title || "New Chat"}</h2>
        </div>
        <ChatHistory messages={messages} />
        <ChatInput />
      </div>
    </div>
  );
};

export default ChatContainer;
