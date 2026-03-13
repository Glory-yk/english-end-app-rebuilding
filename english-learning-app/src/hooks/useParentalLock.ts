import { useState, useCallback } from 'react';
import { useKidsStore } from '../stores/useKidsStore';

export function useParentalLock() {
  const [isLocked, setIsLocked] = useState(true);
  const [showLockScreen, setShowLockScreen] = useState(false);
  const pin = useKidsStore(s => s.pin);

  const requestUnlock = useCallback(() => {
    setShowLockScreen(true);
  }, []);

  const unlock = useCallback((enteredPin: string) => {
    if (enteredPin === pin) {
      setIsLocked(false);
      setShowLockScreen(false);
      return true;
    }
    return false;
  }, [pin]);

  const lock = useCallback(() => {
    setIsLocked(true);
  }, []);

  return { isLocked, showLockScreen, requestUnlock, unlock, lock, dismissLock: () => setShowLockScreen(false) };
}
