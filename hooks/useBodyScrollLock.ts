
import { useEffect } from 'react';

export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    if (isLocked) {
      document.body.style.overflow = 'hidden';
      // Prevent layout shift by adding padding equivalent to scrollbar width if needed
      // document.body.style.paddingRight = 'var(--scrollbar-width)'; 
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isLocked]);
}
