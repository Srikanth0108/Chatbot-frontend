import React, { useState, useEffect } from "react";
import { useContext } from "react";
import { ChatContext } from "../../context/ChatContext";
import audioService from "../../services/audioService";

const ChatMessage = ({ message }) => {
  const { content, sender, timestamp, id } = message;
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const { regenerateResponse, provideMessageFeedback, isLoading } =
    useContext(ChatContext);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // Only show actions for AI messages
  const isAiMessage = sender === "ai";

  useEffect(() => {
    // Check initial state
    setIsPlaying(audioService.isCurrentlyPlaying(id));

    // Set up event listeners for this specific message ID
    const handleAudioPlay = (event) => {
      const { messageId } = event.detail;
      if (messageId === id) {
        setIsPlaying(true);
        setIsLoadingAudio(false);
      } else {
        // Another message is playing, make sure this one shows as not playing
        setIsPlaying(false);
      }
    };

    const handleAudioStop = (event) => {
      const { messageId } = event.detail;
      if (messageId === id) {
        setIsPlaying(false);
      }
    };

    const handleAudioPause = (event) => {
      const { messageId } = event.detail;
      if (messageId === id) {
        setIsPlaying(false);
      }
    };

    const handleAudioEnd = (event) => {
      const { messageId } = event.detail;
      if (messageId === id) {
        setIsPlaying(false);
      }
    };

    const handleAudioError = (event) => {
      const { messageId } = event.detail;
      if (messageId === id) {
        setIsPlaying(false);
        setIsLoadingAudio(false);
      }
    };

    // Add event listeners
    window.addEventListener("audio-play", handleAudioPlay);
    window.addEventListener("audio-stop", handleAudioStop);
    window.addEventListener("audio-pause", handleAudioPause);
    window.addEventListener("audio-end", handleAudioEnd);
    window.addEventListener("audio-error", handleAudioError);

    // Clean up event listeners on unmount
    return () => {
      window.removeEventListener("audio-play", handleAudioPlay);
      window.removeEventListener("audio-stop", handleAudioStop);
      window.removeEventListener("audio-pause", handleAudioPause);
      window.removeEventListener("audio-end", handleAudioEnd);
      window.removeEventListener("audio-error", handleAudioError);
    };
  }, [id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRegenerate = () => {
    regenerateResponse(message.id);
  };

  const handleFeedback = (isPositive) => {
    provideMessageFeedback(message.id, isPositive);
  };

  const handleSpeak = async () => {
    // If already playing, toggle play/pause
    if (isPlaying) {
      audioService.togglePlayPause();
      return;
    }

    // Get the selected language from localStorage
    const language = message.language || localStorage.getItem("preferredLanguage") || "en";

    // Show loading state
    setIsLoadingAudio(true);

    try {
      // Call audio service to speak the text
      await audioService.speakText(content, language, id);

      // Note: we don't need to update state here because the event listeners will handle it
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsLoadingAudio(false);
    }
  };

  return (
    <div
      className={`chat-message ${
        sender === "user" ? "user-message" : "ai-message"
      }`}
    >
      <div className="message-avatar">{sender === "user" ? "U" : "AI"}</div>
      <div
        className="message-content"
        data-feedback={message.feedback || "none"}
      >
        <div className="message-text">{content}</div>
        <div className="message-footer">
          <div className="message-timestamp">
            {new Date(timestamp).toLocaleTimeString()}
          </div>

          {isAiMessage && (
            <div className="message-actions">
              <button
                className="action-button copy-button"
                onClick={handleCopy}
                title="Copy message"
              >
                {copied ? (
                  "Copied!"
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      x="9"
                      y="9"
                      width="13"
                      height="13"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
              </button>

              <div className="feedback-buttons">
                <button
                  className="action-button feedback-button"
                  onClick={() => handleFeedback(true)}
                  title="Good response"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                  </svg>
                </button>
                <button
                  className="action-button feedback-button"
                  onClick={() => handleFeedback(false)}
                  title="Bad response"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                  </svg>
                </button>
              </div>

              {/* Speaker button */}
              <button
                className={`action-button speak-button ${
                  isPlaying ? "playing" : ""
                }`}
                onClick={handleSpeak}
                title={
                  isLoadingAudio && !isPlaying
                    ? "Loading..."
                    : isPlaying
                    ? "Pause speech"
                    : "Read aloud"
                }
                disabled={isLoadingAudio && !isPlaying}
              >
                {isLoadingAudio && !isPlaying ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="loading-spinner"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 6v6l4 2"></path>
                  </svg> // A simple spinner icon
                ) : isPlaying ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                  </svg>
                )}
              </button>

              <button
                className="action-button regenerate-button"
                onClick={handleRegenerate}
                title={isLoading ? "Processing..." : "Regenerate response"}
                disabled={isLoading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 4v6h-6"></path>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
