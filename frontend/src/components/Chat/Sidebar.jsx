import React, { useContext, useState, useRef, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../UI/ConfirmDialog";
import ProfileModal from "../UI/ProfileModal";

const Sidebar = ({
  conversations,
  activeConversation,
  setActiveConversation,
  isOpen,
  setIsOpen,
}) => {
  const { currentUser, logout } = useContext(AuthContext);
  const { createNewConversation, deleteAllConversations, isLoading, processingConversationId } =
    useContext(ChatContext);
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(
    localStorage.getItem("preferredLanguage") || "en"
  );
  const userMenuRef = useRef(null);

  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "zh", name: "Chinese" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "ar", name: "Arabic" },
    { code: "ru", name: "Russian" },
    { code: "hi", name: "Hindi" },
  ];

  useEffect(() => {
    // Close the menu when clicking outside
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  useEffect(() => {
    const checkScreenSize = () => {
      // Close sidebar by default on mobile
      if (window.innerWidth <= 600) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };

    // Initial check
    checkScreenSize();

    // Add event listener for window resize
    window.addEventListener("resize", checkScreenSize);

    // Clean up event listener
    return () => window.removeEventListener("resize", checkScreenSize);
  }, [setIsOpen]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleNewChat = () => {
    createNewConversation();
  };

  const handleLanguageChange = (langCode) => {
    setSelectedLanguage(langCode);
    localStorage.setItem("preferredLanguage", langCode);
    setShowUserMenu(false);
  };

  const handleClearAllChats = () => {
    setShowConfirmDialog(true);
    setShowUserMenu(false);
  };

  const confirmClearAllChats = () => {
    deleteAllConversations();
    setShowConfirmDialog(false);
  };

  const openProfileModal = () => {
    setShowUserMenu(false);
    setShowProfileModal(true);
  };

  return (
    <>
      <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <h3>AI Chat</h3>
          <button className="new-chat-btn" onClick={handleNewChat}>
            New Chat
          </button>
        </div>

        <div className="conversations-list">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${
                conv.id === activeConversation?.id ? "active" : ""
              }`}
              onClick={() => setActiveConversation(conv)}
            >
              <div className="conv-info">
                <span className="conv-title">{conv.title}</span>
                <span className="conv-date">
                  {new Date(conv.timestamp).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-info" onClick={() => openProfileModal()}>
            <div className="user-avatar">
              {currentUser?.name
                ? currentUser.name.charAt(0).toUpperCase()
                : currentUser?.email
                ? currentUser.email.charAt(0).toUpperCase()
                : "U"}
            </div>
            <span className="username">
              {currentUser?.name || currentUser?.email || "User"}
            </span>
          </div>
        </div>
      </div>
      {/* ProfileModal component */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUser={currentUser}
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
        onClearChats={confirmClearAllChats}
        onLogout={handleLogout}
        isLoading={isLoading}
        languages={languages}
      />
      {/* Add the confirmation dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={confirmClearAllChats}
        title="Clear All Conversations"
        message="Are you sure you want to clear all conversations? This action cannot be undone."
      />
    </>
  );
};

export default Sidebar;