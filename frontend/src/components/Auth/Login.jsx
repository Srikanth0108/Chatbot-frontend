// client/src/components/Auth/Login.jsx
import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const { login, register, error, isLoading, isAuthenticated, clearError } =
    useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/chat");
    }
  }, [isAuthenticated, navigate]);
  
  // Clear errors when switching between login/register modes
  useEffect(() => {
    clearError();
  }, [showRegister]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate("/chat");
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const userData = {
      email,
      password,
      fullName,
      jobTitle,
    };
    const success = await register(userData);
    if (success) {
      navigate("/chat");
    }
  };

  const toggleForm = () => {
    setShowRegister(!showRegister);
    // Clear form fields
    setEmail("");
    setPassword("");
    setFullName("");
    setJobTitle("");
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="11"></circle>
            <circle cx="12" cy="10" r="3" fill="white"></circle>
            <path d="M4 20c0-2.66 5.33-4 8-4s8 1.34 8 4" fill="white"></path>
            <path d="M7 20a5 3 0 10 10 0 0" fill="white"></path>
          </svg>
        </div>

        {showRegister ? (
          <form onSubmit={handleRegisterSubmit} className="login-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="jobTitle">Job Title (Optional)</label>
              <input
                type="text"
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>

            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Register"}
            </button>

            <p className="auth-toggle">
              Already have an account?{" "}
              <button
                type="button"
                onClick={toggleForm}
                className="link-button"
              >
                Login
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} className="login-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </button>

            <p className="auth-toggle">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={toggleForm}
                className="link-button"
              >
                Register
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
