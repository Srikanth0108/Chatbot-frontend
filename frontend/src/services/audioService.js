// client/src/services/audioService.js
import api from "./api";

class AudioService {
  constructor() {
    this.audioElement = null;
    this.isPlaying = false;
    this.currentMessageId = null;
    this.eventListeners = [];
  }

  // Add event dispatch capability
  addEventListener(event, callback) {
    this.eventListeners.push({ event, callback });
  }

  removeEventListener(event, callback) {
    this.eventListeners = this.eventListeners.filter(
      (listener) =>
        !(listener.event === event && listener.callback === callback)
    );
  }

  dispatchEvent(event, data) {
    this.eventListeners.forEach((listener) => {
      if (listener.event === event) {
        listener.callback(data);
      }
    });

    // Also dispatch a DOM event for components that are listening
    window.dispatchEvent(
      new CustomEvent(`audio-${event}`, {
        detail: data,
      })
    );
  }

  async speakText(text, language, messageId) {
    try {
      // If already playing the same message, toggle pause/play
      if (this.currentMessageId === messageId && this.audioElement) {
        this.togglePlayPause();
        return this.isPlaying;
      }

      // If playing a different message, stop current audio
      if (this.audioElement) {
        const previousMessageId = this.currentMessageId;
        this.stopAudio();
        // Notify that previous audio was stopped
        this.dispatchEvent("stop", { messageId: previousMessageId });
      }

      this.currentMessageId = messageId;

      // Convert language code to locale format (e.g., 'en' to 'en-US')
      const locale = this.getLocaleFromLanguage(language);

      // Create URL with query parameters
      const url = `/generate_audio?text=${encodeURIComponent(
        text
      )}&lang=${locale}&message_id=${messageId}`;

      // Create new audio element
      this.audioElement = new Audio(url);

      // Set up event listeners
      this.audioElement.addEventListener("ended", () => {
        this.isPlaying = false;
        this.currentMessageId = null;
        this.dispatchEvent("end", { messageId });
      });

      this.audioElement.addEventListener("error", (e) => {
        console.error("Audio playback error:", e);
        this.isPlaying = false;
        this.currentMessageId = null;
        this.dispatchEvent("error", { messageId, error: e });
      });

      // Play the audio
      await this.audioElement.play();
      this.isPlaying = true;

      // Notify that audio started playing
      this.dispatchEvent("play", { messageId });

      return true;
    } catch (error) {
      console.error("Error in text-to-speech:", error);
      this.isPlaying = false;
      this.currentMessageId = null;
      this.dispatchEvent("error", { messageId, error });
      return false;
    }
  }

  togglePlayPause() {
    if (!this.audioElement) return false;

    const messageId = this.currentMessageId;

    if (this.isPlaying) {
      this.audioElement.pause();
      this.isPlaying = false;
      this.dispatchEvent("pause", { messageId });
    } else {
      this.audioElement.play();
      this.isPlaying = true;
      this.dispatchEvent("play", { messageId });
    }

    return this.isPlaying;
  }

  stopAudio() {
    if (this.audioElement) {
      const messageId = this.currentMessageId;

      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.isPlaying = false;
      this.currentMessageId = null;

      this.dispatchEvent("stop", { messageId });
    }
  }

  getLocaleFromLanguage(language) {
    // Map language codes to locale codes that Edge TTS expects
    const localeMap = {
      en: "en-US",
      es: "es-ES",
      fr: "fr-FR",
      de: "de-DE",
      zh: "zh-CN",
      ja: "ja-JP",
      ko: "ko-KR",
      ar: "ar-SA",
      ru: "ru-RU",
      hi: "hi-IN",
    };

    return localeMap[language] || "en-US";
  }

  isCurrentlyPlaying(messageId) {
    return this.isPlaying && this.currentMessageId === messageId;
  }
}

// Create a singleton instance
const audioService = new AudioService();
export default audioService;
