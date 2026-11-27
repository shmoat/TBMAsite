import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { AppContextMenu } from '../components/ContextMenu';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const { currentUser } = useAuth();
  const [zoomImg, setZoomImg] = useState(null);
  const [appCtxMenu, setAppCtxMenu] = useState(null);
  const [guestPrompt, setGuestPrompt] = useState(null);
  const [memberModal, setMemberModal] = useState(null);

  useEffect(() => {
    const closeAll = () => setAppCtxMenu(null);
    window.addEventListener('click', closeAll);
    return () => window.removeEventListener('click', closeAll);
  }, []);

  const openZoom = useCallback((url) => setZoomImg(url), []);

  const openGuestPrompt = useCallback((reason) => {
    setGuestPrompt(reason || 'ฟีเจอร์นี้สงวนสิทธิ์สำหรับสมาชิกสมาคมเท่านั้น');
  }, []);

  const openAppMenu = useCallback((e, config) => {
    if (!config || !config.items?.length) return;
    if (e?.shiftKey) return;
    if (e?.preventDefault) e.preventDefault();
    if (e?.stopPropagation) e.stopPropagation();
    setAppCtxMenu({
      x: e?.clientX ?? 100,
      y: e?.clientY ?? 100,
      ...config
    });
  }, []);

  const openMemberProfile = useCallback((member) => {
    if (!currentUser) {
      openGuestPrompt('เข้าสู่ระบบสมาชิกเพื่อดูโปรไฟล์แบบเต็ม ประวัติ และช่องทางติดต่อ');
      return;
    }
    setMemberModal(member);
  }, [currentUser, openGuestPrompt]);

  return (
    <UIContext.Provider value={{
      zoomImg,
      openZoom,
      appCtxMenu,
      setAppCtxMenu,
      openAppMenu,
      guestPrompt,
      setGuestPrompt,
      openGuestPrompt,
      memberModal,
      setMemberModal,
      openMemberProfile
    }}>
      {children}

      {zoomImg && (
        <div
          onClick={() => setZoomImg(null)}
          className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img src={zoomImg} alt="" className="max-w-full max-h-[92vh] object-contain rounded-xl shadow-2xl" />
          <button type="button" className="fixed top-5 right-5 w-10 h-10 rounded-full card font-bold">✕</button>
        </div>
      )}

      <AppContextMenu menu={appCtxMenu} onClose={() => setAppCtxMenu(null)} />
    </UIContext.Provider>
  );
}

export const useUI = () => useContext(UIContext);