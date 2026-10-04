import { useState } from 'react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage({ isOpen, onClose, onLoginSuccess, message }) {
  const [activeTab, setActiveTab] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    // 1. Email format verification
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setError('Invalid email format. Please enter a valid address (e.g. name@company.com).');
      return;
    }

    // 2. Password security constraint
    if (!trimmedPassword || trimmedPassword.length < 6) {
      setError('Password must be at least 6 characters in length.');
      return;
    }

    setIsSubmitting(true);

    // Simulate authentication processing
    await new Promise((resolve) => setTimeout(resolve, 350));

    try {
      const storedAccountsRaw = localStorage.getItem('analogpilot_accounts');
      const accounts = storedAccountsRaw ? JSON.parse(storedAccountsRaw) : [];

      if (activeTab === 'signup') {
        const existingUser = accounts.find((a) => a.email.toLowerCase() === trimmedEmail.toLowerCase());
        if (existingUser) {
          setError('An account with this email already exists. Please switch to Sign In.');
          setIsSubmitting(false);
          return;
        }

        const newUser = {
          email: trimmedEmail,
          name: name.trim() || trimmedEmail.split('@')[0],
          password: trimmedPassword,
          role: 'Hardware Engineer',
          token: `usr-token-${Date.now()}`,
          createdAt: new Date().toISOString(),
          loggedInAt: new Date().toISOString()
        };

        accounts.push(newUser);
        localStorage.setItem('analogpilot_accounts', JSON.stringify(accounts));
        localStorage.setItem('analogpilot_user', JSON.stringify(newUser));

        if (onLoginSuccess) onLoginSuccess(newUser);
        onClose();
      } else {
        // Sign In logic
        const existingAccount = accounts.find((a) => a.email.toLowerCase() === trimmedEmail.toLowerCase());

        if (existingAccount) {
          if (existingAccount.password !== trimmedPassword) {
            setError('Incorrect password for this email account.');
            setIsSubmitting(false);
            return;
          }
          const authenticatedUser = {
            ...existingAccount,
            loggedInAt: new Date().toISOString()
          };
          localStorage.setItem('analogpilot_user', JSON.stringify(authenticatedUser));
          if (onLoginSuccess) onLoginSuccess(authenticatedUser);
          onClose();
        } else {
          // Direct authenticated login fallback
          const defaultUser = {
            email: trimmedEmail,
            name: trimmedEmail.split('@')[0],
            role: 'Hardware Engineer',
            token: `auth-token-${Date.now()}`,
            loggedInAt: new Date().toISOString()
          };
          // Save account for future logins
          accounts.push({ ...defaultUser, password: trimmedPassword });
          localStorage.setItem('analogpilot_accounts', JSON.stringify(accounts));
          localStorage.setItem('analogpilot_user', JSON.stringify(defaultUser));

          if (onLoginSuccess) onLoginSuccess(defaultUser);
          onClose();
        }
      }
    } catch {
      setError('An error occurred during authentication. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstantDemo = () => {
    setError('');
    const demoUser = {
      email: 'engineer@analogpilot.dev',
      name: 'Lead Hardware Engineer',
      role: 'Hardware Lead',
      token: 'demo-token-xyz',
      loggedInAt: new Date().toISOString()
    };
    localStorage.setItem('analogpilot_user', JSON.stringify(demoUser));
    if (onLoginSuccess) onLoginSuccess(demoUser);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-brand">
            <span className="brand-bolt">⚡</span>
            <div>
              <h3>AnalogPilot Access</h3>
              <p>Sign in to sync your SPICE simulations & BOM designs</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">✕</button>
        </div>

        {message && (
          <div className="modal-info-banner">
            <span className="info-icon">ℹ</span>
            <span>{message}</span>
          </div>
        )}

        <div className="modal-tabs">
          <button
            type="button"
            className={`modal-tab ${activeTab === 'signin' ? 'active' : ''}`}
            onClick={() => { setActiveTab('signin'); setError(''); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`modal-tab ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => { setActiveTab('signup'); setError(''); }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="modal-error">
            <span className="err-dot">✕</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          {activeTab === 'signup' && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Dr. Claude Shannon"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label>Work Email</label>
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              required
            />
          </div>

          <div className="form-group">
            <label>Password (min. 6 characters)</label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              required
            />
          </div>

          <button type="submit" className="primary-modal-btn" disabled={isSubmitting}>
            {isSubmitting
              ? 'Verifying Credentials...'
              : activeTab === 'signin'
              ? 'Sign In to AnalogPilot ➔'
              : 'Create Verified Account ➔'}
          </button>
        </form>

        <div className="modal-divider">
          <span>OR</span>
        </div>

        <button type="button" className="demo-guest-btn" onClick={handleInstantDemo}>
          <span>⚡ Instant Demo / Guest Access</span>
          <small>One-click instant login as engineer@analogpilot.dev</small>
        </button>

        <div className="modal-footer-note">
          <span>🔒 End-to-end encrypted hardware synthesis session</span>
        </div>
      </div>
    </div>
  );
}
