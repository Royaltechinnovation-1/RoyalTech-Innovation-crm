import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import type { CrmStore } from "../data/store";

export function Login({ store }: { store: CrmStore }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  if (store.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = store.login(email, password);
    if (!result.ok) setError(result.error);
    else setError("");
  }

  return (
    <div className="auth-screen">
      <section className="auth-left">
        <div className="auth-brand">
          <img src="/logo.jpeg" alt="RoyalTech Innovation" className="auth-logo" />
          <div>
            <p className="auth-brand-name">ROYALTECH</p>
            <p className="auth-brand-tag">Innovation CRM</p>
          </div>
        </div>

        <span className="auth-pill">Welcome</span>
        <h1>Work, beautifully organized</h1>
        <p className="auth-sub">
          Super Admin sees the full CRM. Every other login opens only that person’s dashboard.
        </p>

        <form className="auth-login" onSubmit={onSubmit}>
          <label className="auth-field">
            <span className="auth-label">Email</span>
            <input
              className="auth-input"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
            />
          </label>

          <label className="auth-field">
            <span className="auth-label">Password</span>
            <div className="auth-input-wrap">
              <input
                className="auth-input"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error ? <p className="login-error">{error}</p> : null}

          <button type="submit" className="auth-submit">
            Log in
            <span aria-hidden="true">➜</span>
          </button>
        </form>

        <div className="auth-chips">
          <span className="auth-chip">✓ Tasks & projects</span>
          <span className="auth-chip">✓ Team roles</span>
          <span className="auth-chip">✓ Live dashboards</span>
        </div>
      </section>

      <section className="auth-right" aria-label="Brand visual">
        <div className="auth-visual">
          <div className="auth-visual-glow" aria-hidden="true" />
          <img src="/logo.jpeg" alt="RoyalTech Innovation" className="auth-visual-logo" />
          <p className="auth-visual-kicker">Innovate. Integrate. Elevate.</p>
          <h2>Your role. Your dashboard.</h2>
          <p>
            Each team member logs in and sees only the CRM tools for their work.
          </p>
        </div>
      </section>
    </div>
  );
}
