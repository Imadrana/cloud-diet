import React, { useEffect, useState } from "react";
import { registerUser, loginUser, fetchCurrentUser } from "./api/auth";
import Dashboard from "./Dashboard";

function AuthForm({ mode, onSwitchMode, onAuthSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      let resp;
      if (mode === "register") {
        resp = await registerUser({ name, email, password });
      } else {
        resp = await loginUser({ email, password });
      }
      const { token, user } = resp.data;
      localStorage.setItem("authToken", token);
      localStorage.setItem("authUser", JSON.stringify(user));
      onAuthSuccess(user);
    } catch (err) {
      setError(err.response?.data || err.message || "Something went wrong");
    }
  }

  return (
    <div
      style={{
        maxWidth: 420,
        margin: "4rem auto",
        padding: "2rem",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
        background: "white",
      }}
    >
      <h2 style={{ marginBottom: "1.25rem", textAlign: "center" }}>
        {mode === "login" ? "Login" : "Register"}
      </h2>
      {error && (
        <div style={{ marginBottom: "1rem", color: "red", fontSize: 14 }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        {mode === "register" && (
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", marginBottom: 4 }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: "100%", padding: 8 }}
            />
          </div>
        )}
        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", marginBottom: 4 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", marginBottom: 4 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "0.6rem",
            marginTop: "0.5rem",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          {mode === "login" ? "Login" : "Create Account"}
        </button>
      </form>
      <div style={{ marginTop: "1rem", textAlign: "center", fontSize: 14 }}>
        {mode === "login" ? (
          <>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => onSwitchMode("register")}
              style={{
                border: "none",
                background: "none",
                color: "#2563eb",
                cursor: "pointer",
              }}
            >
              Register
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => onSwitchMode("login")}
              style={{
                border: "none",
                background: "none",
                color: "#2563eb",
                cursor: "pointer",
              }}
            >
              Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  const [mode, setMode] = useState("login");
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setChecking(false);
        return;
      }
      try {
        const resp = await fetchCurrentUser();
        setUser(resp.data.user);
        localStorage.setItem("authUser", JSON.stringify(resp.data.user));
      } catch (e) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
      } finally {
        setChecking(false);
      }
    }
    check();
  }, []);

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setUser(null);
    setMode("login");
  }

  if (checking) {
    return <p style={{ padding: "2rem" }}>Checking session...</p>;
  }

  if (!user) {
    return (
      <AuthForm
        mode={mode}
        onSwitchMode={setMode}
        onAuthSuccess={(u) => setUser(u)}
      />
    );
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default App;
