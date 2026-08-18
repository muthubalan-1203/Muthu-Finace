import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { verifyPin, isLockEnabled, isBiometricAvailable, verifyAnswer, createPinHash } from '../utils/security';
import { getSettings, clearAllData, saveSettings } from '../utils/storage';
import { Delete, Fingerprint, AlertTriangle, KeyRound } from 'lucide-react';

// Greeting based on time of day
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning 🌅';
  if (h < 17) return 'Good Afternoon ☀️';
  if (h < 20) return 'Good Evening 🌇';
  return 'Good Night 🌙';
}

// Animated floating orb
function Orb({ style }) {
  return (
    <div
      style={{
        position: 'absolute',
        borderRadius: '50%',
        filter: 'blur(60px)',
        opacity: 0.35,
        animation: 'floatOrb 8s ease-in-out infinite alternate',
        ...style,
      }}
    />
  );
}

export default function LockScreen() {
  const { isLocked, unlock } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [confirmReset, setConfirmReset] = useState('');
  
  // Recovery states
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState('answer');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  
  const [pinLength, setPinLength] = useState(6);
  const [bgImage, setBgImage] = useState(null);

  useEffect(() => {
    const settings = getSettings();
    if (settings.pinLength) {
      setPinLength(settings.pinLength);
    }
    if (settings.lockScreenImage) {
      setBgImage(settings.lockScreenImage);
    }
  }, []);

  useEffect(() => {
    if (isLocked && isBiometricAvailable()) {
      attemptBiometric();
    }
  }, [isLocked]);

  if (!isLocked || !isLockEnabled()) {
    return null;
  }

  async function attemptBiometric() {
    try {
      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
      await NativeBiometric.verifyIdentity({
        reason: 'Unlock Muthu',
        title: 'Authenticate',
        subtitle: 'Use fingerprint to unlock',
      });
      // The promise resolves on success and rejects on cancel.
      // If we reach here, it successfully authenticated.
      unlock();
    } catch (e) {
      // Biometric not available or cancelled
      console.log('Biometric failed or cancelled', e);
    }
  }

  async function handlePinSubmit() {
    const settings = getSettings();
    if (!settings.pinHash || !settings.pinSalt) return;

    const valid = await verifyPin(pin, settings.pinSalt, settings.pinHash);
    if (valid) {
      setPin('');
      setError('');
      unlock();
    } else {
      setError('Incorrect PIN. Try again.');
      setPin('');
    }
  }

  function handleDigit(digit) {
    if (pin.length >= pinLength) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === pinLength) {
      setTimeout(async () => {
        const settings = getSettings();
        const valid = await verifyPin(newPin, settings.pinSalt, settings.pinHash);
        if (valid) {
          setPin('');
          setError('');
          unlock();
        } else {
          setError('Incorrect PIN. Try again.');
          setPin('');
        }
      }, 150);
    }
  }

  function handleBackspace() {
    setPin((p) => p.slice(0, -1));
    setError('');
  }

  function handleResetConfirm() {
    if (confirmReset === 'RESET') {
      clearAllData();
      window.location.reload();
    }
  }

  function handleForgotPin() {
    const settings = getSettings();
    if (settings.secQuestion && settings.secAnswerHash) {
      setShowRecovery(true);
      setRecoveryStep('answer');
      setRecoveryError('');
    } else {
      setShowReset(true);
    }
  }

  async function handleRecoverySubmit() {
    const settings = getSettings();
    if (recoveryStep === 'answer') {
      if (!recoveryAnswer.trim()) return;
      const valid = await verifyAnswer(recoveryAnswer, settings.secAnswerSalt, settings.secAnswerHash);
      if (valid) {
        setRecoveryStep('new-pin');
        setRecoveryError('');
      } else {
        setRecoveryError('Incorrect answer. Please try again.');
      }
    } else if (recoveryStep === 'new-pin') {
      if (newPin.length < 4 || newPin.length > 6) {
        setRecoveryError('PIN must be 4-6 digits');
        return;
      }
      setRecoveryStep('confirm-pin');
      setRecoveryError('');
    } else if (recoveryStep === 'confirm-pin') {
      if (newPin !== confirmNewPin) {
        setRecoveryError('PINs do not match');
        setConfirmNewPin('');
        return;
      }
      const { salt, hash } = await createPinHash(newPin);
      saveSettings({ ...settings, pinHash: hash, pinSalt: salt, pinLength: newPin.length });
      setPinLength(newPin.length);
      setShowRecovery(false);
      setRecoveryAnswer('');
      setNewPin('');
      setConfirmNewPin('');
      setRecoveryError('');
      setPin('');
      setError('');
      // unlock directly
      unlock();
    }
  }

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  // ─── Keyframe styles injected once ────────────────────────────────────────
  const keyframes = `
    @keyframes floatOrb {
      0%   { transform: translate(0, 0) scale(1); }
      100% { transform: translate(20px, -30px) scale(1.15); }
    }
    @keyframes dotPop {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.4); }
      100% { transform: scale(1.1); }
    }
    @keyframes shakeX {
      0%, 100% { transform: translateX(0); }
      20%       { transform: translateX(-8px); }
      40%       { transform: translateX(8px); }
      60%       { transform: translateX(-6px); }
      80%       { transform: translateX(6px); }
    }
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;

  const bgStyle = bgImage
    ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 overflow-hidden" style={bgStyle}>
      <style>{keyframes}</style>

      {/* ── Background ── */}
      {!bgImage && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, #0f0c29, #1a103d, #0f0c29)' }} />
      )}
      {bgImage && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)' }} />}

      {/* ── Floating orbs ── */}
      {!bgImage && (
        <>
          <Orb style={{ width: 320, height: 320, background: '#6366f1', top: '-80px', left: '-80px', animationDuration: '9s' }} />
          <Orb style={{ width: 260, height: 260, background: '#8b5cf6', bottom: '60px', right: '-60px', animationDuration: '7s', animationDelay: '1s' }} />
          <Orb style={{ width: 180, height: 180, background: '#06b6d4', top: '40%', left: '55%', animationDuration: '11s', animationDelay: '2s' }} />
        </>
      )}

      {/* ── Content ── */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'fadeSlideUp 0.5s ease-out both' }}>

        {/* ── RESET PANEL ── */}
        {showReset ? (
          <div style={{ width: '100%', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.12)', padding: 28 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <AlertTriangle style={{ width: 28, height: 28, color: '#fbbf24' }} />
              </div>
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Reset App Data?</h2>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.5 }}>
                This will permanently delete all your data. This action cannot be undone.
              </p>
            </div>
            <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, display: 'block', marginBottom: 6 }}>Type RESET to confirm</label>
            <input
              type="text"
              value={confirmReset}
              onChange={(e) => setConfirmReset(e.target.value.toUpperCase())}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.2em', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
              placeholder="RESET"
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setShowReset(false); setConfirmReset(''); }}
                style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleResetConfirm} disabled={confirmReset !== 'RESET'}
                style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: confirmReset === 'RESET' ? '#dc2626' : 'rgba(220,38,38,0.3)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: confirmReset === 'RESET' ? 'pointer' : 'not-allowed' }}>
                Reset All Data
              </button>
            </div>
          </div>

        ) : showRecovery ? (
          /* ── RECOVERY PANEL ── */
          <div style={{ width: '100%', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.12)', padding: 28 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <KeyRound style={{ width: 26, height: 26, color: '#a5b4fc' }} />
              </div>
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 6 }}>Reset PIN</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                {recoveryStep === 'answer' ? 'Answer your security question' : recoveryStep === 'new-pin' ? 'Enter a new PIN (4–6 digits)' : 'Confirm your new PIN'}
              </p>
            </div>
            {recoveryError && <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center', marginBottom: 12 }}>{recoveryError}</p>}
            <div style={{ marginBottom: 20 }}>
              {recoveryStep === 'answer' && (
                <div>
                  <p style={{ color: '#fff', fontSize: 14, marginBottom: 10, fontWeight: 500 }}>{getSettings().secQuestion}</p>
                  <input type="text" value={recoveryAnswer} onChange={(e) => setRecoveryAnswer(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    placeholder="Your answer" />
                </div>
              )}
              {recoveryStep === 'new-pin' && (
                <input type="password" inputMode="numeric" value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.3em', fontSize: 20, outline: 'none', boxSizing: 'border-box' }}
                  placeholder="• • • • • •" />
              )}
              {recoveryStep === 'confirm-pin' && (
                <input type="password" inputMode="numeric" value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.3em', fontSize: 20, outline: 'none', boxSizing: 'border-box' }}
                  placeholder="• • • • • •" />
              )}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setShowRecovery(false); setRecoveryStep('answer'); setRecoveryAnswer(''); setNewPin(''); setConfirmNewPin(''); setRecoveryError(''); }}
                style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleRecoverySubmit}
                style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Continue
              </button>
            </div>
          </div>

        ) : (
          /* ── MAIN PIN PAD ── */
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* App icon + greeting */}
            <div style={{ marginBottom: 32, textAlign: 'center' }}>
              <div style={{
                width: 80, height: 80, borderRadius: 24,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.15), 0 20px 40px rgba(99,102,241,0.4)',
              }}>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 34, fontFamily: 'monospace' }}>₹</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 4 }}>{getGreeting()}</p>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 28, letterSpacing: '-0.5px' }}>Muthu Finance</h1>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>Enter your PIN to unlock</p>
            </div>

            {/* PIN dots */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 8, justifyContent: 'center', animation: error ? 'shakeX 0.35s ease' : 'none' }}>
              {Array.from({ length: pinLength }).map((_, i) => {
                const filled = i < pin.length;
                return (
                  <div key={i} style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: filled ? 'linear-gradient(135deg, #a5b4fc, #818cf8)' : 'rgba(255,255,255,0.15)',
                    border: filled ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
                    boxShadow: filled ? '0 0 12px rgba(165,180,252,0.7)' : 'none',
                    transition: 'all 0.15s ease',
                    transform: filled ? 'scale(1.1)' : 'scale(1)',
                  }} />
                );
              })}
            </div>

            {/* Error message */}
            {error && (
              <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center', marginBottom: 12, marginTop: 4 }}>{error}</p>
            )}
            {!error && <div style={{ height: 28 }} />}

            {/* PIN pad */}
            <div style={{
              width: '100%',
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(20px)',
              borderRadius: 28,
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '20px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {digits.map((d, i) => {
                  if (d === '') return <div key={i} />;
                  if (d === 'del') {
                    return (
                      <button key={i} onClick={handleBackspace}
                        style={{ height: 60, borderRadius: 16, border: 'none', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.12s ease' }}
                        onTouchStart={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                        onTouchEnd={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      >
                        <Delete style={{ width: 20, height: 20 }} />
                      </button>
                    );
                  }
                  return (
                    <button key={i} onClick={() => handleDigit(d)}
                      style={{
                        height: 60, borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff', fontSize: 22, fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.12s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      }}
                      onTouchStart={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.35)'; e.currentTarget.style.transform = 'scale(0.94)'; }}
                      onTouchEnd={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>

              {/* Fingerprint button */}
              {isBiometricAvailable() && (
                <button onClick={attemptBiometric}
                  style={{ width: '100%', marginTop: 12, padding: '12px 0', borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  <Fingerprint style={{ width: 18, height: 18 }} />
                  Use Fingerprint
                </button>
              )}
            </div>

            {/* Forgot PIN */}
            <button onClick={handleForgotPin}
              style={{ marginTop: 20, background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 12, cursor: 'pointer' }}>
              Forgot PIN?
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

