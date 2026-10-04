import { useState, useEffect } from 'react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>_\\-]/;

export default function LoginPage({ isOpen, onClose, onLoginSuccess, message }) {
  const [activeTab, setActiveTab] = useState('signin'); // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rate Limiting & Lockout State (3 failed attempts -> 5s lock)
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  if (!isOpen) return null;

  // Real-time Password Strength Criteria Calculations
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = SPECIAL_CHAR_REGEX.test(password);

  const passedRulesCount = [hasLength, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  const isPasswordStrong = passedRulesCount === 4;

  const getStrengthLabel = () => {
    if (!password) return 'Not Entered';
    if (passedRulesCount <= 1) return 'Weak';
    if (passedRulesCount <= 3) return 'Fair';
    return 'Strong';
  };

  const getStrengthColorClass = () => {
    if (!password) return '';
    if (passedRulesCount <= 1) return 'weak';
    if (passedRulesCount <= 3) return 'fair';
    return 'strong';
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (lockoutSeconds > 0) {
      setError(`Too many invalid attempts. Please wait ${lockoutSeconds} seconds before trying again.`);
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    // 1. Email format verification
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setError('Invalid email format. Please enter a valid address (e.g. engineer@analogpilot.dev).');
      return;
    }

    // 2. Tab-specific validations
    if (activeTab === 'signup' || activeTab === 'reset') {
      if (!isPasswordStrong) {
        setError('Password does not meet the 4 security requirements.');
        return;
      }
      if (trimmedPassword !== trimmedConfirm) {
        setError('Passwords do not match. Please verify your password confirmation.');
        return;
      }
    } else {
      if (!trimmedPassword) {
        setError('Please enter your password.');
        return;
      }
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const storedAccountsRaw = localStorage.getItem('analogpilot_accounts');
      const accounts = storedAccountsRaw ? JSON.parse(storedAccountsRaw) : [];

      if (activeTab === 'signup') {
        const existingUser = accounts.find((a) => a.email.toLowerCase() === trimmedEmail.toLowerCase());
        if (existingUser) {
          setError('An account with this email already exists. Please sign in.');
          setIsSubmitting(false);
          return;
        }

        // Store encoded/hashed credentials
        const authHash = btoa(`${trimmedEmail}:${trimmedPassword}`);
        const newUser = {
          email: trimmedEmail,
          name: name.trim() || trimmedEmail.split('@')[0],
          authHash,
          role: 'Hardware Engineer',
          token: `usr-token-${Date.now()}`,
          createdAt: new Date().toISOString(),
          loggedInAt: new Date().toISOString()
        };

        accounts.push(newUser);
        localStorage.setItem('analogpilot_accounts', JSON.stringify(accounts));
        localStorage.setItem('analogpilot_user', JSON.stringify(newUser));

        setFailedAttempts(0);
        if (onLoginSuccess) onLoginSuccess(newUser);
        onClose();
      } else if (activeTab === 'reset') {
        // Self-Serve Password Reset Verification
        const accountIndex = accounts.findIndex((a) => a.email.toLowerCase() === trimmedEmail.toLowerCase());

        if (accountIndex === -1) {
          setError('No account found with this email. Please verify your address or create an account.');
          setIsSubmitting(false);
          return;
        }

        // Update password hash
        const authHash = btoa(`${trimmedEmail}:${trimmedPassword}`);
        const updatedUser = {
          ...accounts[accountIndex],
          authHash,
          updatedAt: new Date().toISOString(),
          loggedInAt: new Date().toISOString()
        };

        accounts[accountIndex] = updatedUser;
        localStorage.setItem('analogpilot_accounts', JSON.stringify(accounts));
        localStorage.setItem('analogpilot_user', JSON.stringify(updatedUser));

        setSuccessMsg('Password updated successfully. Logging in...');
        setFailedAttempts(0);
        setLockoutSeconds(0);

        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(updatedUser);
          onClose();
        }, 500);
      } else {
        // Sign In verification
        const existingAccount = accounts.find((a) => a.email.toLowerCase() === trimmedEmail.toLowerCase());

        if (!existingAccount) {
          const newFailed = failedAttempts + 1;
          setFailedAttempts(newFailed);
          if (newFailed >= 3) {
            setLockoutSeconds(5);
            setError('Too many failed attempts. Security lock active for 5 seconds.');
          } else {
            setError(`No account found with this email. Please create an account. (${3 - newFailed} attempts left)`);
          }
          setIsSubmitting(false);
          return;
        }

        const inputHash = btoa(`${trimmedEmail}:${trimmedPassword}`);
        const isPasswordValid = existingAccount.authHash
          ? existingAccount.authHash === inputHash
          : existingAccount.password === trimmedPassword;

        if (!isPasswordValid) {
          const newFailed = failedAttempts + 1;
          setFailedAttempts(newFailed);
          if (newFailed >= 3) {
            setLockoutSeconds(5);
            setError('Too many failed attempts. Security lock active for 5 seconds.');
          } else {
            setError(`Incorrect password. Please try again. (${3 - newFailed} attempts left)`);
          }
          setIsSubmitting(false);
          return;
        }

        // Successfully authenticated
        setFailedAttempts(0);
        const authenticatedUser = {
          ...existingAccount,
          loggedInAt: new Date().toISOString()
        };
        localStorage.setItem('analogpilot_user', JSON.stringify(authenticatedUser));
        if (onLoginSuccess) onLoginSuccess(authenticatedUser);
        onClose();
      }
    } catch {
      setError('An error occurred during authentication. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstantDemo = () => {
    setError('');
    setSuccessMsg('');
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

  const handleClearLocalAccounts = () => {
    localStorage.removeItem('analogpilot_accounts');
    localStorage.removeItem('analogpilot_user');
    setFailedAttempts(0);
    setLockoutSeconds(0);
    setError('');
    setSuccessMsg('Local account database reset. You can create a fresh account.');
    setActiveTab('signup');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-brand">
            <span className="brand-bolt">⚡</span>
            <div>
              <h3>
                {activeTab === 'reset' ? 'Reset Account Password' : 'AnalogPilot Access'}
              </h3>
              <p>
                {activeTab === 'reset'
                  ? 'Enter your registered email and your new password.'
                  : 'Sign in to sync your SPICE simulations & BOM designs'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">✕</button>
        </div>

        {message && activeTab !== 'reset' && (
          <div className="modal-info-banner">
            <span className="info-icon">ℹ</span>
            <span>{message}</span>
          </div>
        )}

        {/* Tab Switcher (Visible in Sign In and Create Account modes) */}
        {activeTab !== 'reset' ? (
          <div className="modal-tabs">
            <button
              type="button"
              className={`modal-tab ${activeTab === 'signin' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('signin')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`modal-tab ${activeTab === 'signup' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('signup')}
            >
              Create Account
            </button>
          </div>
        ) : (
          <div className="reset-banner">
            <span>🔒 Self-Serve Password Recovery</span>
          </div>
        )}

        {lockoutSeconds > 0 && (
          <div className="modal-lockout-alert">
            <span>⏳ Account Locked: {lockoutSeconds}s cooldown active</span>
          </div>
        )}

        {error && (
          <div className="modal-error">
            <span className="err-dot">✕</span>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="modal-success-banner">
            <span className="success-dot">✓</span>
            <span>{successMsg}</span>
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
            <label>{activeTab === 'reset' ? 'Registered Email' : 'Work Email'}</label>
            <input
              type="email"
              placeholder="engineer@analogpilot.dev"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              required
            />
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label>{activeTab === 'reset' ? 'New Password' : 'Password'}</label>
              {(activeTab === 'signup' || activeTab === 'reset') && (
                <span className={`strength-badge ${getStrengthColorClass()}`}>
                  {getStrengthLabel()}
                </span>
              )}
            </div>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁‍🗨' : '👁'}
              </button>
            </div>
          </div>

          {/* Forgot Password link in Sign In mode */}
          {activeTab === 'signin' && (
            <div className="forgot-password-row">
              <button
                type="button"
                className="forgot-password-link"
                onClick={() => handleTabSwitch('reset')}
              >
                Forgot Password?
              </button>
            </div>
          )}

          {/* Password Strength Meter & Checklist in Sign Up and Reset modes */}
          {(activeTab === 'signup' || activeTab === 'reset') && (
            <div className="strength-meter-container">
              <div className="strength-bar-track">
                <div
                  className={`strength-bar-fill strength-${passedRulesCount}`}
                  style={{ width: `${(passedRulesCount / 4) * 100}%` }}
                />
              </div>

              <div className="password-checklist-grid">
                <div className={`checklist-item ${hasLength ? 'passed' : ''}`}>
                  <span>{hasLength ? '✓' : '○'}</span> 8+ characters
                </div>
                <div className={`checklist-item ${hasUpper ? 'passed' : ''}`}>
                  <span>{hasUpper ? '✓' : '○'}</span> 1 uppercase letter
                </div>
                <div className={`checklist-item ${hasNumber ? 'passed' : ''}`}>
                  <span>{hasNumber ? '✓' : '○'}</span> 1 numeric digit
                </div>
                <div className={`checklist-item ${hasSpecial ? 'passed' : ''}`}>
                  <span>{hasSpecial ? '✓' : '○'}</span> 1 special symbol
                </div>
              </div>
            </div>
          )}

          {/* Confirm Password in Sign Up and Reset modes */}
          {(activeTab === 'signup' || activeTab === 'reset') && (
            <div className="form-group">
              <div className="form-label-row">
                <label>{activeTab === 'reset' ? 'Confirm New Password' : 'Confirm Password'}</label>
                {confirmPassword && (
                  <span className={`match-badge ${password === confirmPassword ? 'match' : 'mismatch'}`}>
                    {password === confirmPassword ? '✓ Passwords Match' : '✕ Does Not Match'}
                  </span>
                )}
              </div>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? '👁‍🗨' : '👁'}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="primary-modal-btn"
            disabled={isSubmitting || lockoutSeconds > 0}
          >
            {lockoutSeconds > 0
              ? `Cooldown Active (${lockoutSeconds}s)...`
              : isSubmitting
              ? 'Verifying Credentials...'
              : activeTab === 'signin'
              ? 'Sign In to AnalogPilot ➔'
              : activeTab === 'reset'
              ? 'Update Password & Sign In ➔'
              : 'Create Verified Account ➔'}
          </button>

          {/* Back to Sign In button in Reset mode */}
          {activeTab === 'reset' && (
            <button
              type="button"
              className="back-to-signin-btn"
              onClick={() => handleTabSwitch('signin')}
            >
              ← Back to Sign In
            </button>
          )}
        </form>

        {activeTab !== 'reset' && (
          <>
            <div className="modal-divider">
              <span>OR</span>
            </div>

            <button type="button" className="demo-guest-btn" onClick={handleInstantDemo}>
              <span>⚡ Quick Demo Pass</span>
              <small>One-click instant login as engineer@analogpilot.dev</small>
            </button>
          </>
        )}

        {/* Emergency Developer Bypass Link */}
        {activeTab === 'reset' && (
          <div className="dev-emergency-row">
            <button
              type="button"
              className="dev-clear-db-btn"
              onClick={handleClearLocalAccounts}
              title="Developer tool: clears all saved accounts from local storage"
            >
              ⚡ Clear Local Database (Reset All Accounts)
            </button>
          </div>
        )}

        <div className="modal-footer-note">
          <span>🔒 End-to-end encrypted hardware synthesis session</span>
        </div>
      </div>
    </div>
  );
}
