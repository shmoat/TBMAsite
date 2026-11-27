import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db, auth, tbmaAuthRequest } from '../lib/firebase';
import { OWNER_SEED } from '../lib/utils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [users, setUsers] = useState([OWNER_SEED]);
  const [isUsersLoaded, setIsUsersLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const pingRef = useRef(0);

  useEffect(() => {
    const unsub = db.collection('bma_users').onSnapshot((snap) => {
      const list = snap.docs
        .map((d) => d.data())
        .filter((u) => u.id !== 'BMA-000')
        .sort((a, b) => String(a.id).localeCompare(String(b.id)));
      setUsers(list.length > 0 ? list : [OWNER_SEED]);
      setIsUsersLoaded(true);
    }, (err) => {
      console.error('bma_users listener error:', err);
      setIsUsersLoaded(true);
    });
    return () => unsub();
  }, []);

  // กู้คืน Session อัตโนมัติ (ผูกกับ Firebase Auth UID จริง)
  useEffect(() => {
    if (!isUsersLoaded || autoLoginAttempted) return;
    const fbUser = auth.currentUser;
    const savedId = (fbUser && !fbUser.isAnonymous)
      ? fbUser.uid
      : (localStorage.getItem('tbma_saved_user_id') || sessionStorage.getItem('tbma_session_user_id'));

    if (savedId && fbUser && !fbUser.isAnonymous) {
      const found = users.find((u) => u.id === savedId && u.isActivated);
      if (found) {
        setCurrentUser({ ...found, isOnline: true, lastActive: Date.now() });
        db.collection('bma_users').doc(found.id).update({ isOnline: true, lastActive: Date.now() }).catch(() => {});
      }
    }
    setAutoLoginAttempted(true);
  }, [users, isUsersLoaded, autoLoginAttempted]);

  // ซิงก์ข้อมูล currentUser เมื่อมีอัปเดตใน Firestore
  useEffect(() => {
    if (!currentUser || !isUsersLoaded) return;
    const fresh = users.find((u) => u.id === currentUser.id);
    if (fresh && JSON.stringify(fresh) !== JSON.stringify(currentUser)) {
      setCurrentUser(fresh);
    }
  }, [users, isUsersLoaded]);

  // อัปเดตสถานะออนไลน์ทุก 60 วินาทีเมื่อมีการใช้งาน
  const updateActivity = useCallback(() => {
    if (!currentUser) return;
    const now = Date.now();
    if (now - pingRef.current > 60000) {
      pingRef.current = now;
      db.collection('bma_users').doc(currentUser.id).update({ lastActive: now, isOnline: true }).catch(() => {});
    }
  }, [currentUser]);

  useEffect(() => {
    window.addEventListener('pointerdown', updateActivity);
    window.addEventListener('keydown', updateActivity);
    return () => {
      window.removeEventListener('pointerdown', updateActivity);
      window.removeEventListener('keydown', updateActivity);
    };
  }, [updateActivity]);

  const signIn = async ({ identifier, password, remember = true }) => {
    const { user: f } = await tbmaAuthRequest({ action: 'login', identifier: identifier.trim(), password });
    const logged = { ...f, isOnline: true, lastActive: Date.now() };
    setCurrentUser(logged);
    if (remember) {
      localStorage.setItem('tbma_saved_user_id', f.id);
      sessionStorage.removeItem('tbma_session_user_id');
    } else {
      sessionStorage.setItem('tbma_session_user_id', f.id);
      localStorage.removeItem('tbma_saved_user_id');
    }
    await db.collection('bma_users').doc(f.id).update({ isOnline: true, lastActive: Date.now() }).catch(() => {});
    return logged;
  };

  const signOut = async () => {
    if (currentUser) {
      await db.collection('bma_users').doc(currentUser.id).update({ isOnline: false }).catch(() => {});
    }
    localStorage.removeItem('tbma_saved_user_id');
    sessionStorage.removeItem('tbma_session_user_id');
    await auth.signOut().catch(() => {});
    setCurrentUser(null);
  };

  const getAuthor = useCallback(
    (id) => users.find((u) => u.id === id) || { id, displayName: `Member (${id})`, memberTags: ['Others'], username: 'member', role: 'member', socialLinks: [] },
    [users]
  );

  return (
    <AuthContext.Provider value={{
      users,
      activeMembers: users.filter((u) => u.isActivated),
      isUsersLoaded,
      autoLoginAttempted,
      currentUser,
      setCurrentUser,
      isModOrAdmin: Boolean(currentUser && (currentUser.role === 'admin' || currentUser.role === 'mod')),
      signIn,
      signOut,
      getAuthor
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);