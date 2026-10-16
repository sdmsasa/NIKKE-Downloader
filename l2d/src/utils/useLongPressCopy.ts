import { useRef, useCallback } from 'react';

export interface LongPressCopyOptions {
  delayMs?: number;
  onCopied?: (text: string) => void;
}

/**
 * Custom hook to support long-press (default 500ms) text copying
 * Works with both mouse events and mobile touch events
 */
export function useLongPressCopy(options: LongPressCopyOptions = {}) {
  const { delayMs = 500, onCopied } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleStart = useCallback((textToCopy: string, e: React.MouseEvent | React.TouchEvent) => {
    isLongPressedRef.current = false;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startPosRef.current = { x: clientX, y: clientY };

    clearTimer();

    timerRef.current = setTimeout(() => {
      isLongPressedRef.current = true;
      try {
        navigator.clipboard.writeText(textToCopy);
      } catch (err) {
        console.warn('Clipboard write failed:', err);
      }
      if (onCopied) {
        onCopied(textToCopy);
      }
    }, delayMs);
  }, [clearTimer, delayMs, onCopied]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!startPosRef.current || !timerRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = Math.abs(clientX - startPosRef.current.x);
    const dy = Math.abs(clientY - startPosRef.current.y);
    // If user dragged noticeably (e.g. scrolling or selecting text manually), cancel long-press
    if (dx > 6 || dy > 6) {
      clearTimer();
    }
  }, [clearTimer]);

  const handleEnd = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const getLongPressProps = useCallback((textToCopy: string) => {
    return {
      onMouseDown: (e: React.MouseEvent) => handleStart(textToCopy, e),
      onMouseUp: handleEnd,
      onMouseLeave: handleEnd,
      onMouseMove: handleMove,
      onTouchStart: (e: React.TouchEvent) => handleStart(textToCopy, e),
      onTouchEnd: handleEnd,
      onTouchCancel: handleEnd,
      onTouchMove: handleMove,
    };
  }, [handleStart, handleEnd, handleMove]);

  const consumeLongPress = useCallback((): boolean => {
    if (isLongPressedRef.current) {
      isLongPressedRef.current = false;
      return true;
    }
    return false;
  }, []);

  return {
    getLongPressProps,
    consumeLongPress,
    isLongPressed: isLongPressedRef
  };
}
