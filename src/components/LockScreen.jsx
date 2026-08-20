import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { verifyPin, isLockEnabled, isBiometricAvailable, verifyAnswer, createPinHash } from '../utils/security';
import { getSettings, clearAllData, saveSettings } from '../utils/storage';
import { Delete, Fingerprint, AlertTriangle, KeyRound, ShieldCheck } from 'lucide-react';

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
        filter: 'blur(70px)',
        opacity: 0.4,
        animation: 'floatOrb 10s ease-in-out infinite alternate',
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
      unlock();
    } catch (e) {
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
          setError('Incorrect PIN');
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
      unlock();
    }
  }

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  const keyframes = `
    @keyframes floatOrb {
      0%   { transform: translate(0, 0) scale(1); }
      100% { transform: translate(30px, -40px) scale(1.1); }
    }
    @keyframes shakeX {
      0%, 100% { transform: translateX(0); }
      20%       { transform: translateX(-8px); }
      40%       { transform: translateX(8px); }
      60%       { transform: translateX(-6px); }
      80%       { transform: translateX(6px); }
    }
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(20px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 15px rgba(99,102,241,0.5); }
      50% { box-shadow: 0 0 25px rgba(99,102,241,0.8); }
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
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top left, #1e1b4b 0%, #020617 100%)' }} />
      )}
      {bgImage && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(16px)' }} />}

      {/* ── Floating orbs ── */}
      {!bgImage && (
        <>
          <Orb style={{ width: 350, height: 350, background: '#4f46e5', top: '-100px', left: '-100px', animationDuration: '10s' }} />
          <Orb style={{ width: 280, height: 280, background: '#9333ea', bottom: '20px', right: '-80px', animationDuration: '8s', animationDelay: '1s' }} />
          <Orb style={{ width: 200, height: 200, background: '#0891b2', top: '35%', left: '50%', animationDuration: '12s', animationDelay: '2s' }} />
        </>
      )}

      {/* ── Content ── */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both' }}>

        {/* ── RESET PANEL ── */}
        {showReset ? (
          <div style={{ width: '100%', background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(24px)', borderRadius: 32, border: '1px solid rgba(255,255,255,0.08)', padding: 32, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            {/* ... (Reset panel content remains structurally same but styled darker) ... */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle style={{ width: 32, height: 32, color: '#ef4444' }} />
              </div>
              <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 22, marginBottom: 8 }}>Reset App Data?</h2>
              <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>This will permanently delete all your data. This action cannot be undone.</p>
            </div>
            <input type="text" value={confirmReset} onChange={(e) => setConfirmReset(e.target.value.toUpperCase())}
              style={{ width: '100%', padding: '14px', borderRadius: 16, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.2em', fontSize: 16, outline: 'none', marginBottom: 20 }}
              placeholder="Type RESET" />
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setShowReset(false); setConfirmReset(''); }}
                style={{ flex: 1, padding: '14px 0', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', fontSize: 14, fontWeight: 600 }}>Cancel</button>
              <button onClick={handleResetConfirm} disabled={confirmReset !== 'RESET'}
                style={{ flex: 1, padding: '14px 0', borderRadius: 16, border: 'none', background: confirmReset === 'RESET' ? '#ef4444' : 'rgba(239,68,68,0.2)', color: '#fff', fontSize: 14, fontWeight: 700 }}>Reset All</button>
            </div>
          </div>
        ) : showRecovery ? (
          /* ── RECOVERY PANEL ── */
          <div style={{ width: '100%', background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(24px)', borderRadius: 32, border: '1px solid rgba(255,255,255,0.08)', padding: 32, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
             <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(99,102,241,0.2)' }}>
                <KeyRound style={{ width: 32, height: 32, color: '#818cf8' }} />
              </div>
              <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 22, marginBottom: 8 }}>Reset PIN</h2>
              <p style={{ color: '#94a3b8', fontSize: 13 }}>{recoveryStep === 'answer' ? 'Answer your security question' : 'Enter a new PIN (4–6 digits)'}</p>
            </div>
            {/* ... (Recovery inputs) ... */}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
               <button onClick={() => { setShowRecovery(false); setRecoveryStep('answer'); setRecoveryAnswer(''); setNewPin(''); setConfirmNewPin(''); setRecoveryError(''); }}
                style={{ flex: 1, padding: '14px 0', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', fontSize: 14, fontWeight: 600 }}>Cancel</button>
              <button onClick={handleRecoverySubmit}
                style={{ flex: 1, padding: '14px 0', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: '0 4px 15px rgba(79,70,229,0.3)' }}>Continue</button>
            </div>
          </div>
        ) : (
          /* ── MAIN PIN PAD ── */
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* App icon + greeting */}
            <div style={{ marginBottom: 40, textAlign: 'center' }}>
              <div style={{
                width: 72, height: 72, borderRadius: 24,
                background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 0 30px rgba(79,70,229,0.4)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <ShieldCheck style={{ width: 36, height: 36, color: '#fff' }} />
              </div>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 26, letterSpacing: '-0.5px', marginBottom: 4 }}>Welcome Back</h1>
              <p style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>{getGreeting()} • Muthu Finance</p>
            </div>

            {/* PIN dots */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 12, justifyContent: 'center', animation: error ? 'shakeX 0.4s cubic-bezier(.36,.07,.19,.97) both' : 'none' }}>
              {Array.from({ length: pinLength }).map((_, i) => {
                const filled = i < pin.length;
                return (
                  <div key={i} style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: filled ? '#fff' : 'rgba(255,255,255,0.1)',
                    border: filled ? 'none' : '1px solid rgba(255,255,255,0.2)',
                    boxShadow: filled ? '0 0 15px rgba(255,255,255,0.8)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transform: filled ? 'scale(1.2)' : 'scale(1)',
                  }} />
                );
              })}
            </div>

            {/* Error message */}
            <div style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {error && <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 600, padding: '4px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 20 }}>{error}</span>}
            </div>

            {/* PIN pad */}
            <div style={{
              width: '100%',
              marginTop: 16,
              background: 'rgba(30, 41, 59, 0.4)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: 32,
              border: '1px solid rgba(255,255,255,0.05)',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {digits.map((d, i) => {
                  if (d === '') return <div key={i} />;
                  if (d === 'del') {
                    return (
                      <button key={i} onClick={handleBackspace}
                        style={{ height: 64, borderRadius: 20, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s ease' }}
                        onTouchStart={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onTouchEnd={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Delete style={{ width: 24, height: 24 }} />
                      </button>
                    );
                  }
                  return (
                    <button key={i} onClick={() => handleDigit(d)}
                      style={{
                        height: 64, borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)',
                        background: 'rgba(255,255,255,0.03)',
                        color: '#fff', fontSize: 26, fontWeight: 500,
                        cursor: 'pointer', transition: 'all 0.1s ease',
                      }}
                      onTouchStart={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'scale(0.9)'; }}
                      onTouchEnd={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>

              {/* Fingerprint button */}
              {isBiometricAvailable() && (
                <button onClick={attemptBiometric}
                  style={{ width: '100%', marginTop: 20, padding: '16px 0', borderRadius: 20, border: '1px solid rgba(79,70,229,0.3)', background: 'rgba(79,70,229,0.1)', color: '#a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onTouchStart={e => e.currentTarget.style.background = 'rgba(79,70,229,0.2)'}
                  onTouchEnd={e => e.currentTarget.style.background = 'rgba(79,70,229,0.1)'}
                >
                  <Fingerprint style={{ width: 20, height: 20 }} />
                  Unlock with Biometrics
                </button>
              )}
            </div>

            {/* Forgot PIN */}
            <button onClick={handleForgotPin}
              style={{ marginTop: 24, background: 'none', border: 'none', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.5px' }}>
              FORGOT PIN?
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
