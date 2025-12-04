import { useEffect, useState } from "react";
import { registerUser, loginUser, fetchCurrentUser } from "./api/auth";
import Dashboard from "./Dashboard";

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [mode, setMode] = useState("login"); // "login" or "register"
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setLoadingUser(false);
      return;
    }
    (async () => {
      try {
        const res = await fetchCurrentUser();
        setUser(res.data);
      } catch {
        localStorage.removeItem("authToken");
      } finally {
        setLoadingUser(false);
      }
    })();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setUser(null);
  };

  const handleAuthSuccess = (data) => {
    if (data?.token) {
      localStorage.setItem("authToken", data.token);
    }
    if (data?.user) {
      setUser(data.user);
    } else if (data?.email) {
      setUser({ email: data.email, name: data.name || data.email });
    }
  };

  if (loadingUser) {
    return <div style={{ padding: "2rem" }}>Loading...</div>;
  }

  if (user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return (
    <AuthScreen
      mode={mode}
      onModeChange={setMode}
      onAuthSuccess={handleAuthSuccess}
      authError={authError}
      setAuthError={setAuthError}
    />
  );
}

function AuthScreen({ mode, onModeChange, onAuthSuccess, authError, setAuthError }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); // IMPORTANT: stop browser default GET /login
    setAuthError("");
    setSubmitting(true);
    try {
      let resp;
      if (mode === "login") {
        resp = await loginUser({ email, password });
      } else {
        resp = await registerUser({ name, email, password });
      }
      onAuthSuccess(resp.data);
    } catch (err) {
      setAuthError(
        err.response?.data || err.message || "Request failed, please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f3f4f6",
      }}
    >
      <div
        style={{
          width: 420,
          padding: "2.5rem 2.75rem",
          borderRadius: 12,
          background: "white",
          boxShadow: "0 15px 40px rgba(15,23,42,0.12)",
        }}
      >
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: "0.5rem",
          }}
        >
          {mode === "login" ? "Login" : "Create Account"}
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "#6b7280",
            textAlign: "center",
            marginBottom: "1.3rem",
          }}
        >
          {mode === "login"
            ? "Sign in to view the Nutritional Insights Dashboard."
            : "Register to access the Nutritional Insights Dashboard."}
        </p>

        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: "1.2rem",
            background: "#f3f4f6",
            padding: 4,
            borderRadius: 999,
          }}
        >
          <button
            type="button"
            onClick={() => onModeChange("login")}
            style={{
              flex: 1,
              padding: "0.45rem 0.6rem",
              borderRadius: 999,
              border: "none",
              background: mode === "login" ? "#2563eb" : "transparent",
              color: mode === "login" ? "white" : "#111827",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => onModeChange("register")}
            style={{
              flex: 1,
              padding: "0.45rem 0.6rem",
              borderRadius: 999,
              border: "none",
              background: mode === "register" ? "#2563eb" : "transparent",
              color: mode === "register" ? "white" : "#111827",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Register
          </button>
        </div>

        {authError && (
          <div
            style={{
              marginBottom: "1rem",
              color: "#dc2626",
              fontSize: 14,
              textAlign: "center",
            }}
          >
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <label
                style={{ fontSize: 14, display: "block", marginBottom: 4 }}
              >
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.45rem 0.6rem",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  marginBottom: "0.9rem",
                  fontSize: 14,
                }}
              />
            </>
          )}

          <label style={{ fontSize: 14, display: "block", marginBottom: 4 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "0.45rem 0.6rem",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              marginBottom: "0.9rem",
              fontSize: 14,
            }}
          />

          <label style={{ fontSize: 14, display: "block", marginBottom: 4 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "0.45rem 0.6rem",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              marginBottom: "1.1rem",
              fontSize: 14,
            }}
          />

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "0.55rem 0.75rem",
              borderRadius: 6,
              border: "none",
              background: "#2563eb",
              color: "white",
              fontWeight: 600,
              cursor: submitting ? "wait" : "pointer",
              fontSize: 15,
            }}
          >
            {submitting
              ? mode === "login"
                ? "Logging in..."
                : "Creating account..."
              : mode === "login"
              ? "Login"
              : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
