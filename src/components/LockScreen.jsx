import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { verifyPin, isLockEnabled, isBiometricAvailable, verifyAnswer, createPinHash } from '../utils/security';
import { getSettings, clearAllData, saveSettings } from '../utils/storage';
import { Delete, Fingerprint, AlertTriangle, KeyRound } from 'lucide-react';

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

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
      style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
      <div className={`absolute inset-0 ${bgImage ? 'bg-black/50 backdrop-blur-md' : 'bg-gradient-to-b from-brand-800 to-ink'}`} />
      
      <div className="relative z-10 w-full max-w-xs flex flex-col items-center">
        {showReset ? (
          <div className="w-full animate-fade-in">
            <div className="flex flex-col items-center mb-8">
            <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
            <h2 className="text-white font-display font-bold text-xl mb-2">Reset App Data?</h2>
            <p className="text-brand-200 text-sm text-center">
              This will permanently delete all your data. This action cannot be undone.
            </p>
          </div>
          <div className="mb-4">
            <label className="text-brand-200 text-xs mb-1 block">Type RESET to confirm</label>
            <input
              type="text"
              value={confirmReset}
              onChange={(e) => setConfirmReset(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="RESET"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowReset(false);
                setConfirmReset('');
              }}
              className="flex-1 py-3 rounded-xl border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleResetConfirm}
              disabled={confirmReset !== 'RESET'}
              className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-40"
            >
              Reset All Data
            </button>
          </div>
          </div>
        ) : showRecovery ? (
          <div className="w-full animate-fade-in">
            <div className="flex flex-col items-center mb-6">
              <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center mb-4">
                <KeyRound className="w-6 h-6 text-brand-300" />
              </div>
              <h2 className="text-white font-display font-bold text-xl mb-2">Reset PIN</h2>
              <p className="text-brand-200 text-sm text-center">
                {recoveryStep === 'answer' ? 'Answer your security question' : recoveryStep === 'new-pin' ? 'Enter a new PIN (4-6 digits)' : 'Confirm your new PIN'}
              </p>
            </div>
            
            {recoveryError && <p className="text-red-400 text-xs text-center mb-4 animate-pop-in">{recoveryError}</p>}
            
            <div className="mb-6">
              {recoveryStep === 'answer' && (
                <div className="space-y-3">
                  <p className="text-white text-sm font-medium">{getSettings().secQuestion}</p>
                  <input
                    type="text"
                    value={recoveryAnswer}
                    onChange={(e) => setRecoveryAnswer(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-400"
                    placeholder="Your answer"
                  />
                </div>
              )}
              {recoveryStep === 'new-pin' && (
                <input
                  type="password"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-center font-mono tracking-[1em] focus:outline-none focus:ring-2 focus:ring-brand-400"
                  placeholder="NEW PIN"
                />
              )}
              {recoveryStep === 'confirm-pin' && (
                <input
                  type="password"
                  inputMode="numeric"
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-center font-mono tracking-[1em] focus:outline-none focus:ring-2 focus:ring-brand-400"
                  placeholder="CONFIRM PIN"
                />
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRecovery(false);
                  setRecoveryStep('answer');
                  setRecoveryAnswer('');
                  setNewPin('');
                  setConfirmNewPin('');
                  setRecoveryError('');
                }}
                className="flex-1 py-3 rounded-xl border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRecoverySubmit}
                className="flex-1 py-3 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full animate-fade-in">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-800 flex items-center justify-center mb-4 shadow-lg">
              <span className="text-cream-50 font-mono font-bold text-2xl">₹</span>
            </div>
            <h1 className="text-white font-display font-bold text-2xl mb-1">Muthu</h1>
            <p className="text-brand-200 text-sm">Enter your PIN to unlock</p>
          </div>

          <div className="flex justify-center gap-3 mb-6">
            {Array.from({ length: pinLength }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  i < pin.length ? 'bg-brand-400 scale-110' : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center mb-4 animate-pop-in">{error}</p>
          )}

          <div className="grid grid-cols-3 gap-3 mb-6">
            {digits.map((d, i) => {
              if (d === '') return <div key={i} />;
              if (d === 'del') {
                return (
                  <button
                    key={i}
                    onClick={handleBackspace}
                    className="h-14 rounded-2xl flex items-center justify-center text-white/70 hover:bg-white/10 active:bg-white/20 transition-colors"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                );
              }
              return (
                <button
                  key={i}
                  onClick={() => handleDigit(d)}
                  className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-display font-semibold text-xl transition-all duration-150 active:scale-95"
                >
                  {d}
                </button>
              );
            })}
          </div>

          {isBiometricAvailable() && (
            <button
              onClick={attemptBiometric}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 transition-colors mb-4"
            >
              <Fingerprint className="w-5 h-5" />
              <span className="text-sm">Use Fingerprint</span>
            </button>
          )}

          <button
            onClick={handleForgotPin}
            className="w-full text-center text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            Forgot PIN?
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
