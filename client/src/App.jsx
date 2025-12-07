import { useState } from "react";
import { useAuth } from "./context/AuthContext.jsx";
import Login from "./components/Login.jsx";
import Register from "./components/Register.jsx";
import Dashboard from "./components/Dashboard.jsx";

const App = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState("login");

  if (!user) {
    return (
      <div className="auth-layout">
        <div className="auth-card">
          <h1>Meet & Chat Portal</h1>
          {mode === "login" ? <Login /> : <Register />}
          <button
            className="link-btn"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login"
              ? "New here? Create account"
              : "Already have account? Login"}
          </button>
        </div>
      </div>
    );
  }

  return <Dashboard />;
};

export default App;
