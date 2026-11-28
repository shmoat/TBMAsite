import React, { useEffect, useRef } from 'react';

export default function HalloweenFlashlight({ enabled }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const updatePos = (x, y) => {
      if (!overlayRef.current) return;
      overlayRef.current.style.setProperty('--fx', `${x}px`);
      overlayRef.current.style.setProperty('--fy', `${y}px`);
    };

    // ตั้งค่าเริ่มต้นไว้กลางหน้าจอ
    updatePos(window.innerWidth / 2, window.innerHeight / 2);

    const onMouseMove = (e) => updatePos(e.clientX, e.clientY);
    const onTouchMove = (e) => {
      if (e.touches?.[0]) {
        updatePos(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchstart', onTouchMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchstart', onTouchMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      className="fixed inset-0 z-[35] pointer-events-none transition-opacity duration-300"
      style={{
        background:
          'radial-gradient(circle 190px at var(--fx, 50vw) var(--fy, 50vh), rgba(255, 210, 140, 0.06) 0%, rgba(5, 8, 17, 0.45) 55%, rgba(2, 4, 10, 0.94) 100%)'
      }}
    />
  );
}