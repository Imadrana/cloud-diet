import { useEffect, useState } from "react";
import "./App.css";
import Dashboard from "./Dashboard";
import { registerUser, loginUser, fetchCurrentUser } from "./api/auth";

function AuthCard({ mode, onModeChange, onLoginSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

// ---------- GitHub login handler ----------
const handleGithubLogin = () => {
  const host = window.location.hostname;

  // On the real Static Web App, use built-in GitHub auth
  if (host.includes("azurestaticapps.net")) {
    window.location.href =
      "/.auth/login/github?post_login_redirect_uri=/";
    return;
  }

  // When running locally (localhost etc.)
  alert(
    "GitHub login only works on the deployed Azure Static Web App. " +
    "Please use email & password when running locally."
  );
};
// -----------------------------------------


  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (mode === "register") {
        const resp = await registerUser({ name, email, password });
        const data = resp.data || resp;
        localStorage.setItem("authToken", data.token);
        onLoginSuccess(data.user);
      } else {
        const resp = await loginUser({ email, password });
        const data = resp.data || resp;
        localStorage.setItem("authToken", data.token);
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setError(
        err.response?.data || err.message || "Something went wrong"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Login</h1>
        <p className="auth-subtitle">
          Sign in to view the Nutritional Insights Dashboard.
        </p>

        <div className="auth-tabs">
          <button
            className={mode === "login" ? "tab active" : "tab"}
            onClick={() => onModeChange("login")}
          >
            Login
          </button>
          <button
            className={mode === "register" ? "tab active" : "tab"}
            onClick={() => onModeChange("register")}
          >
            Register
          </button>
        </div>

        <button
          className="oauth-button github"
          type="button"
          onClick={handleGithubLogin}
        >
          Continue with GitHub
        </button>

        <div className="auth-divider">
          <span>or use email &amp; password</span>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <div className="field">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            className="primary-btn"
            type="submit"
            disabled={submitting}
          >
            {mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("login");
  const [user, setUser] = useState(null);

  // Bootstrap from our JWT backend and from Static Web Apps OAuth
  useEffect(() => {
    async function init() {
      // 1) Try our own JWT /me
      try {
        const resp = await fetchCurrentUser();
        const data = resp.data || resp;
        if (data && data.email) {
          setUser(data);
          setMode("dashboard");
          return;
        }
      } catch {
        // ignore
      }

      // 2) Try Azure Static Web Apps built-in auth (GitHub, etc.)
      try {
        const res = await fetch("/.auth/me");
        if (res.ok) {
          const info = await res.json();
          const p = info.clientPrincipal;
          if (p) {
            setUser({
              name: p.userDetails || p.userId,
              email: p.userId,
              provider: p.identityProvider,
            });
            setMode("dashboard");
          }
        }
      } catch {
        // ignore
      }
    }

    init();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setUser(null);
    setMode("login");
    // Also clear SWA auth if logged in via GitHub
    window.location.href = "/.auth/logout?post_logout_redirect_uri=/";
  };

  if (mode === "dashboard" && user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return (
    <AuthCard
      mode={mode}
      onModeChange={setMode}
      onLoginSuccess={(u) => {
        setUser(u);
        setMode("dashboard");
      }}
    />
  );
}
