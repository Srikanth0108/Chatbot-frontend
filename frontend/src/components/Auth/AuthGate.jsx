// Create a new file: client/src/components/AuthGate.jsx
import React, { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import LoadingScreen from "../UI/LoadingScreen"; // Create this component

const AuthGate = ({ children }) => {
  const { isInitializing } = useContext(AuthContext);

  if (isInitializing) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
};

export default AuthGate;
