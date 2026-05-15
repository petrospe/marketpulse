import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';
import { useLanguage } from '../i18n/useLanguage.js';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div style={loadingStyle}>
        <span>{t.loading}</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

const loadingStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#131722',
  color: '#848e9c',
  fontFamily: 'sans-serif',
};
