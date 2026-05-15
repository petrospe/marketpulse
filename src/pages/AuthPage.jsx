import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { useAuth } from '../auth/useAuth.js';
import { useLanguage } from '../i18n/useLanguage.js';

const pageStyle = {
  minHeight: '100vh',
  background: '#131722',
  color: '#fff',
  fontFamily: 'sans-serif',
  display: 'flex',
  flexDirection: 'column',
  padding: '30px',
  boxSizing: 'border-box',
};

const cardStyle = {
  maxWidth: '400px',
  width: '100%',
  margin: 'auto',
  background: '#1c2030',
  borderRadius: '8px',
  padding: '28px',
  border: '1px solid #2a2e39',
};

const inputStyle = {
  padding: '10px',
  borderRadius: '4px',
  border: '1px solid #363c4e',
  background: '#131722',
  color: '#fff',
  outline: 'none',
  fontSize: '14px',
  width: '100%',
  boxSizing: 'border-box',
};

export function LoginPage() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.authError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <LanguageSwitcher />
      </div>
      <div style={cardStyle}>
        <h1 style={{ marginTop: 0, color: '#2962ff', fontSize: '22px' }}>{t.loginTitle}</h1>
        <p style={{ color: '#848e9c', fontSize: '14px', marginTop: 0 }}>{t.loginSubtitle}</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '12px', color: '#848e9c' }}>{t.email}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required autoComplete="email" />
          <label style={{ fontSize: '12px', color: '#848e9c' }}>{t.password}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} required autoComplete="current-password" />
          {error && <p style={{ color: '#f23645', fontSize: '13px', margin: 0 }}>{error}</p>}
          <button type="submit" disabled={submitting} style={primaryButtonStyle}>
            {submitting ? t.loading : t.login}
          </button>
        </form>
        <p style={{ marginTop: '20px', fontSize: '14px', color: '#848e9c' }}>
          {t.noAccount}{' '}
          <Link to="/register" style={{ color: '#2962ff' }}>
            {t.register}
          </Link>
        </p>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { t } = useLanguage();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setSubmitting(true);
    try {
      await register(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.authError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <LanguageSwitcher />
      </div>
      <div style={cardStyle}>
        <h1 style={{ marginTop: 0, color: '#2962ff', fontSize: '22px' }}>{t.registerTitle}</h1>
        <p style={{ color: '#848e9c', fontSize: '14px', marginTop: 0 }}>{t.registerSubtitle}</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '12px', color: '#848e9c' }}>{t.email}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required autoComplete="email" />
          <label style={{ fontSize: '12px', color: '#848e9c' }}>{t.password}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} required minLength={8} autoComplete="new-password" />
          <label style={{ fontSize: '12px', color: '#848e9c' }}>{t.confirmPassword}</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} required minLength={8} autoComplete="new-password" />
          {error && <p style={{ color: '#f23645', fontSize: '13px', margin: 0 }}>{error}</p>}
          <button type="submit" disabled={submitting} style={primaryButtonStyle}>
            {submitting ? t.loading : t.register}
          </button>
        </form>
        <p style={{ marginTop: '20px', fontSize: '14px', color: '#848e9c' }}>
          {t.hasAccount}{' '}
          <Link to="/login" style={{ color: '#2962ff' }}>
            {t.login}
          </Link>
        </p>
      </div>
    </div>
  );
}

const primaryButtonStyle = {
  padding: '11px',
  background: '#2962ff',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '14px',
  marginTop: '4px',
};
