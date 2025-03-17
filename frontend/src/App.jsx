// client/src/App.jsx
import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Auth/Login';
import ChatContainer from './components/Chat/ChatContainer';
import AuthProvider from './context/AuthContext';
import AuthGate from "./components/Auth/AuthGate";
import ChatProvider from './context/ChatContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import './index.css';
import { useContext } from "react";
import axios from "axios";

const initializeTTS = async () => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL; // Get API URL properly
    await axios.post(`${apiUrl}/initialize`);
    console.log("Text-to-speech service initialized");
  } catch (error) {
    console.error("Failed to initialize text-to-speech service:", error);
  }
};
function App() {
  useEffect(() => {
    // Initialize TTS service when the app loads
    initializeTTS();
  }, []);
  return (
    <Router>
      <AuthProvider>
        <AuthGate>
          <ChatProvider>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <ChatContainer />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </ChatProvider>
        </AuthGate>
      </AuthProvider>
    </Router>
  );
};

export default App;