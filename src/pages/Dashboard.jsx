import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { authApi, watchlistApi } from '../api/client.js';
import { useAuth } from '../auth/useAuth.js';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { useLanguage } from '../i18n/useLanguage.js';
const CATEGORY_KEYS = [
  'tech',
  'europe',
  'asia_world',
  'indices',
  'crypto_usd',
  'crypto_other',
];
const SAVE_DEBOUNCE_MS = 600;

export default function Dashboard() {
  const containerRef = useRef(null);
  const saveTimerRef = useRef(null);
  const watchlistLoadedRef = useRef(false);
  const { t, tradingViewLocale, language } = useLanguage();
  const { user, logout } = useAuth();

  const [watchlist, setWatchlist] = useState([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [newSymbol, setNewSymbol] = useState({ s: '', d: '', cat: 'tech' });
  const [editingSymbol, setEditingSymbol] = useState(null);
  const [originalSymbolId, setOriginalSymbolId] = useState('');
  const [listSearchQuery, setListSearchQuery] = useState('');

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const openProfile = () => {
    setMenuOpen(false);
    setPwCurrent('');
    setPwNew('');
    setPwConfirm('');
    setPwMessage('');
    setPwError('');
    setProfileOpen(true);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMessage('');
    setPwError('');
    if (pwNew !== pwConfirm) {
      setPwError(t.passwordMismatch);
      return;
    }
    setPwSaving(true);
    try {
      await authApi.changePassword(pwCurrent, pwNew);
      setPwMessage(t.passwordChanged);
      setPwCurrent('');
      setPwNew('');
      setPwConfirm('');
    } catch (err) {
      const message = err instanceof Error ? err.message : t.authError;
      setPwError(message);
    } finally {
      setPwSaving(false);
    }
  };

  useEffect(() => {
    if (!profileOpen) {
      return;
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setProfileOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [profileOpen]);

  useEffect(() => {
    const originalBg = document.body.style.background;
    document.body.style.background = '#131722';

    const rootEl = document.getElementById('root');
    let originalMaxWidth = '';
    let originalWidth = '';
    let originalBorder = '';
    if (rootEl) {
      originalMaxWidth = rootEl.style.maxWidth;
      originalWidth = rootEl.style.width;
      originalBorder = rootEl.style.borderInline;
      rootEl.style.maxWidth = '100%';
      rootEl.style.width = '100%';
      rootEl.style.borderInline = 'none';
    }

    return () => {
      document.body.style.background = originalBg;
      if (rootEl) {
        rootEl.style.maxWidth = originalMaxWidth;
        rootEl.style.width = originalWidth;
        rootEl.style.borderInline = originalBorder;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWatchlist() {
      setLoadingWatchlist(true);
      setLoadError('');
      try {
        const { items } = await watchlistApi.get();
        if (!cancelled) {
          setWatchlist(Array.isArray(items) ? items : []);
          watchlistLoadedRef.current = true;
        }
      } catch {
        if (!cancelled) {
          setLoadError(t.watchlistLoadError);
          setWatchlist([]);
          watchlistLoadedRef.current = true;
        }
      } finally {
        if (!cancelled) {
          setLoadingWatchlist(false);
        }
      }
    }

    loadWatchlist();
    return () => {
      cancelled = true;
    };
  }, [t.watchlistLoadError]);

  const persistWatchlist = useCallback(async (items) => {
    setSaving(true);
    try {
      await watchlistApi.save(items);
    } catch (err) {
      console.error('Failed to save watchlist:', err);
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (!watchlistLoadedRef.current || loadingWatchlist) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      persistWatchlist(watchlist);
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [watchlist, loadingWatchlist, persistWatchlist]);

  /** Remount fingerprint: TradingView embed does not reliably re-parse config on the same DOM node. */
  const tradingViewMountKey = useMemo(
    () => `${language}:${tradingViewLocale}:${JSON.stringify(watchlist)}`,
    [language, tradingViewLocale, watchlist],
  );

  useLayoutEffect(() => {
    if (loadingWatchlist) {
      return;
    }

    const root = containerRef.current;
    if (!root) {
      return;
    }

    let cancelled = false;
    root.innerHTML = '';

    try {
      window.TradingViewCustomWidgetSettings = {
        'symbol-url': 'https://www.tradingview.com/chart/?symbol={tvprosymbol}',
      };
    } catch {
      /* ignore */
    }

    /** One frame lets React settle the keyed host node before injecting (TradingView ignores repeat inits otherwise). */
    const raf1Id = window.requestAnimationFrame(() => {
      if (cancelled || root !== containerRef.current || !root.isConnected) {
        return;
      }

      root.innerHTML = '';

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
      script.type = 'text/javascript';
      script.async = true;

      const config = {
        colorTheme: 'dark',
        dateRange: '12M',
        showChart: true,
        locale: tradingViewLocale,
        width: '100%',
        height: '650',
        isTransparent: false,
        showSymbolLogo: true,
        tabs: CATEGORY_KEYS.map((cat) => ({
          title: t.tradingViewTabs[cat],
          symbols: watchlist
            .filter((item) => item.cat === cat)
            .map((item) => ({ s: item.s, d: item.d })),
        })),
      };

      script.innerHTML = JSON.stringify(config);
      root.appendChild(script);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf1Id);
      root.innerHTML = '';
    };
  }, [loadingWatchlist, tradingViewMountKey, t, tradingViewLocale, watchlist]);

  const handleInsert = (e) => {
    e.preventDefault();
    if (!newSymbol.s || !newSymbol.d) return;

    const formattedItem = {
      s: newSymbol.s.toUpperCase().trim(),
      d: newSymbol.d.trim(),
      cat: newSymbol.cat,
    };

    setWatchlist([...watchlist, formattedItem]);
    setNewSymbol({ s: '', d: '', cat: 'tech' });
  };

  const handleDelete = (symbolToDelete) => {
    const message = t.deleteConfirm.replace('{symbol}', symbolToDelete);
    if (window.confirm(message)) {
      setWatchlist(watchlist.filter((item) => item.s !== symbolToDelete));
    }
  };

  const startEdit = (item) => {
    setEditingSymbol({ ...item });
    setOriginalSymbolId(item.s);
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    const formattedItem = {
      ...editingSymbol,
      s: editingSymbol.s.toUpperCase().trim(),
    };

    setWatchlist(watchlist.map((item) => (item.s === originalSymbolId ? formattedItem : item)));
    setEditingSymbol(null);
    setOriginalSymbolId('');
  };

  const filteredWatchlist = watchlist.filter(
    (item) =>
      item.s.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
      item.d.toLowerCase().includes(listSearchQuery.toLowerCase()),
  );

  const categoryOptions = CATEGORY_KEYS.map((key) => (
    <option key={key} value={key}>
      {t.categories[key]}
    </option>
  ));

  if (loadingWatchlist) {
    return (
      <div style={centeredPageStyle}>
        <span>{t.loading}</span>
      </div>
    );
  }

  return (
    <div style={{ background: '#131722', minHeight: '100vh', color: '#fff', padding: '30px', fontFamily: 'sans-serif', boxSizing: 'border-box', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #2a2e39', paddingBottom: '15px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: 0, color: '#2962ff', fontWeight: 'bold' }}>{t.title}</h1>
          {user?.email && (
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#848e9c' }}>{user.email}</p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {saving && <span style={{ fontSize: '12px', color: '#848e9c' }}>{t.saving}</span>}
          <LanguageSwitcher />
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              style={menuButtonStyle}
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              {t.menu} ▾
            </button>
            {menuOpen && (
              <>
                <div
                  style={menuBackdropStyle}
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div style={menuDropdownStyle} role="menu">
                  <button type="button" role="menuitem" onClick={openProfile} style={menuItemStyle}>
                    {t.profile}
                  </button>
                </div>
              </>
            )}
          </div>
          <button type="button" onClick={logout} style={logoutButtonStyle}>
            {t.logout}
          </button>
        </div>
      </div>

      {profileOpen && (
        <div style={modalOverlayStyle} onClick={() => setProfileOpen(false)}>
          <div
            style={modalCardStyle}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-dialog-title"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 id="profile-dialog-title" style={{ margin: 0, fontSize: '18px', color: '#2962ff' }}>
                {t.profileTitle}
              </h2>
              <button type="button" onClick={() => setProfileOpen(false)} style={modalCloseStyle} aria-label={t.close}>
                ×
              </button>
            </div>
            {user?.email && (
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#848e9c' }}>
                <strong style={{ color: '#d1d4dc' }}>{t.email}:</strong> {user.email}
              </p>
            )}
            <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#ffb703' }}>{t.changePassword}</h3>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '11px', color: '#848e9c' }}>{t.currentPassword}</label>
              <input
                type="password"
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                style={inputStyle}
                required
                autoComplete="current-password"
              />
              <label style={{ fontSize: '11px', color: '#848e9c' }}>{t.newPassword}</label>
              <input
                type="password"
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                style={inputStyle}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <label style={{ fontSize: '11px', color: '#848e9c' }}>{t.confirmPassword}</label>
              <input
                type="password"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                style={inputStyle}
                required
                minLength={8}
                autoComplete="new-password"
              />
              {pwError && <p style={{ color: '#f23645', fontSize: '13px', margin: 0 }}>{pwError}</p>}
              {pwMessage && <p style={{ color: '#089981', fontSize: '13px', margin: 0 }}>{pwMessage}</p>}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="submit" disabled={pwSaving} style={modalSubmitStyle}>
                  {pwSaving ? t.loading : t.savePassword}
                </button>
                <button type="button" onClick={() => setProfileOpen(false)} style={modalCancelStyle}>
                  {t.close}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loadError && (
        <p style={{ color: '#ffb703', fontSize: '13px', marginTop: 0 }}>{loadError}</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '25px', alignItems: 'start' }}>
        <div style={{ background: '#131722', borderRadius: '8px', border: '1px solid #2a2e39', overflow: 'hidden' }}>
          <div
            ref={containerRef}
            key={tradingViewMountKey}
            className="tradingview-widget-container"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: '#1c2030', borderRadius: '8px', padding: '20px', border: '1px solid #2a2e39' }}>
            <h3 style={{ marginTop: 0, color: editingSymbol ? '#ffb703' : '#2962ff', fontSize: '16px' }}>
              {editingSymbol ? `📝 ${t.editSymbol}` : `➕ ${t.addSymbol}`}
            </h3>

            {editingSymbol ? (
              <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '11px', color: '#848e9c' }}>{t.symbol}</label>
                <input type="text" value={editingSymbol.s} onChange={(e) => setEditingSymbol({ ...editingSymbol, s: e.target.value })} style={inputStyle} required />
                <label style={{ fontSize: '11px', color: '#848e9c' }}>{t.description}</label>
                <input type="text" value={editingSymbol.d} onChange={(e) => setEditingSymbol({ ...editingSymbol, d: e.target.value })} style={inputStyle} required />
                <label style={{ fontSize: '11px', color: '#848e9c' }}>{t.tabCategory}</label>
                <select value={editingSymbol.cat} onChange={(e) => setEditingSymbol({ ...editingSymbol, cat: e.target.value })} style={inputStyle}>
                  {categoryOptions}
                </select>
                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                  <button type="submit" style={{ flex: 1, padding: '10px', background: '#089981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{t.update}</button>
                  <button type="button" onClick={() => setEditingSymbol(null)} style={{ padding: '10px', background: '#f23645', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{t.cancel}</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleInsert} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="text" placeholder={t.symbolPlaceholder} value={newSymbol.s} onChange={(e) => setNewSymbol({ ...newSymbol, s: e.target.value })} style={inputStyle} required />
                <input type="text" placeholder={t.descriptionPlaceholder} value={newSymbol.d} onChange={(e) => setNewSymbol({ ...newSymbol, d: e.target.value })} style={inputStyle} required />
                <select value={newSymbol.cat} onChange={(e) => setNewSymbol({ ...newSymbol, cat: e.target.value })} style={inputStyle}>
                  {categoryOptions}
                </select>
                <button type="submit" style={{ padding: '11px', background: '#2962ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{t.insertToList}</button>
              </form>
            )}
          </div>

          <div style={{ background: '#1c2030', borderRadius: '8px', padding: '15px', border: '1px solid #2a2e39', maxHeight: '420px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder={`🔍 ${t.searchPlaceholder}`}
                value={listSearchQuery}
                onChange={(e) => setListSearchQuery(e.target.value)}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', background: '#131722', borderColor: '#2962ff' }}
              />
            </div>

            <h4 style={{ marginTop: 0, marginBottom: '10px', color: '#848e9c', fontSize: '13px' }}>
              {t.records} ({filteredWatchlist.length} {t.recordsOf} {watchlist.length})
            </h4>

            <div className="marketpulse-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
              {filteredWatchlist.map((item) => (
                <div key={item.s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#131722', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', border: '1px solid #2a2e39' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#2962ff' }}>{item.s}</div>
                    <div style={{ color: '#d1d4dc', fontSize: '12px' }}>{item.d}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => startEdit(item)} style={{ background: 'none', border: 'none', color: '#ffb703', cursor: 'pointer', fontSize: '12px' }}>{t.edit}</button>
                    <button type="button" onClick={() => handleDelete(item.s)} style={{ background: 'none', border: 'none', color: '#f23645', cursor: 'pointer', fontSize: '12px' }}>{t.delete}</button>
                  </div>
                </div>
              ))}
              {filteredWatchlist.length === 0 && (
                <div style={{ color: '#848e9c', fontSize: '13px', textAlign: 'center', padding: '10px' }}>{t.noResults}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const centeredPageStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#131722',
  color: '#848e9c',
  fontFamily: 'sans-serif',
};

const logoutButtonStyle = {
  padding: '6px 14px',
  border: '1px solid #363c4e',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 'bold',
  background: 'transparent',
  color: '#f23645',
};

const menuButtonStyle = {
  padding: '6px 14px',
  border: '1px solid #363c4e',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 'bold',
  background: 'transparent',
  color: '#d1d4dc',
};

const menuBackdropStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 999,
};

const menuDropdownStyle = {
  position: 'absolute',
  right: 0,
  top: '100%',
  marginTop: '6px',
  minWidth: '160px',
  background: '#1c2030',
  border: '1px solid #2a2e39',
  borderRadius: '6px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  zIndex: 1000,
  padding: '6px 0',
};

const menuItemStyle = {
  display: 'block',
  width: '100%',
  padding: '10px 14px',
  border: 'none',
  background: 'none',
  color: '#d1d4dc',
  fontSize: '13px',
  textAlign: 'left',
  cursor: 'pointer',
};

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1001,
  padding: '20px',
  boxSizing: 'border-box',
};

const modalCardStyle = {
  background: '#1c2030',
  border: '1px solid #2a2e39',
  borderRadius: '10px',
  padding: '24px',
  maxWidth: '420px',
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
};

const modalCloseStyle = {
  border: 'none',
  background: 'none',
  color: '#848e9c',
  fontSize: '24px',
  lineHeight: 1,
  cursor: 'pointer',
  padding: '0 4px',
};

const modalSubmitStyle = {
  flex: 1,
  padding: '10px',
  background: '#2962ff',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 'bold',
};

const modalCancelStyle = {
  padding: '10px 16px',
  background: 'transparent',
  color: '#848e9c',
  border: '1px solid #363c4e',
  borderRadius: '4px',
  cursor: 'pointer',
};

const inputStyle = {
  padding: '10px',
  borderRadius: '4px',
  border: '1px solid #363c4e',
  background: '#131722',
  color: '#fff',
  outline: 'none',
  fontSize: '13px',
};
