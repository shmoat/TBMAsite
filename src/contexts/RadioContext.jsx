import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { db, FieldValue } from '../lib/firebase';
import { useAuth } from './AuthContext';

const RadioContext = createContext(null);

export const CLOSED_SONG_ID = 'J36kTVjnBD0';

const checkIsLateNight = () => {
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const bkkDate = new Date(utcMs + (7 * 3600000));
  const h = bkkDate.getHours();
  return h >= 22 || h < 6;
};

export function RadioProvider({ children }) {
  const { currentUser } = useAuth();

  const [lateNight, setLateNight] = useState(checkIsLateNight);
  const [djState, setDjState] = useState({
    queue: [],
    deckA: null,
    deckB: null,
    playA: {},
    playB: {},
    crossfade: 0,
    djMode: 'auto',
    fadeDuration: 5,
    fadeCommand: null,
    jammerId: null,
    forceClosed: false,
    quickPlaylists: []
  });

  const [localCrossfade, setLocalCrossfade] = useState(0);
  const [isLocalPaused, setIsLocalPaused] = useState(true);
  const [localVolume, setLocalVolume] = useState(50);
  const [isDucking, setRadioDucking] = useState(false); // เตรียมไว้สำหรับ Auto-Ducking ตอนมีคนพูดบนเวทีเสียง
  const [isPlayerFloatingOpen, setIsPlayerFloatingOpen] = useState(true);
  const [trackTime, setTrackTime] = useState({ curA: 0, durA: 0, curB: 0, durB: 0 });
  const [flyingNotes, setFlyingNotes] = useState([]);

  const ytA = useRef(null);
  const ytB = useRef(null);
  const loadedIdA = useRef(null);
  const loadedIdB = useRef(null);
  const isSeekingRef = useRef(false);
  const isFadingRef = useRef(false);
  const lastSeekRef = useRef({ A: 0, B: 0 });
  const onDeckErrorRef = useRef(null);

  const djStateRef = useRef(djState);
  const isLocalPausedRef = useRef(isLocalPaused);
  const localVolumeRef = useRef(localVolume);
  const localCrossfadeRef = useRef(localCrossfade);
  const isDuckingRef = useRef(isDucking);

  const isIOSDevice = typeof navigator !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );

  const canManageAudio = Boolean(
    currentUser && (djState.jammerId ? djState.jammerId === currentUser.id : (currentUser.role === 'admin' || currentUser.role === 'mod'))
  );
  const activeDeckSong = localCrossfade < 50 ? djState.deckA : djState.deckB;
  const isDeckPlaying = localCrossfade < 50 ? djState.playA?.isPlaying : djState.playB?.isPlaying;
  const isFullyClosedSync = Boolean(
    lateNight && djState.forceClosed && !djState.jammerId && (!djState.queue || djState.queue.length === 0) && !djState.deckA?.id && !djState.deckB?.id
  );
  const isFullyClosedSyncRef = useRef(isFullyClosedSync);

  useEffect(() => { djStateRef.current = djState; }, [djState]);
  useEffect(() => { isLocalPausedRef.current = isLocalPaused; }, [isLocalPaused]);
  useEffect(() => { localVolumeRef.current = localVolume; }, [localVolume]);
  useEffect(() => { localCrossfadeRef.current = localCrossfade; }, [localCrossfade]);
  useEffect(() => { isDuckingRef.current = isDucking; }, [isDucking]);
  useEffect(() => { isFullyClosedSyncRef.current = isFullyClosedSync; }, [isFullyClosedSync]);

  const getEffectiveMasterVol = () => {
    const base = localVolumeRef.current;
    return isDuckingRef.current ? Math.round(base * 0.2) : base;
  };

  useEffect(() => {
    const iv = setInterval(() => setLateNight(checkIsLateNight()), 60000);
    return () => clearInterval(iv);
  }, []);

  // ฟังสถานะ Disc Jam จาก Firestore
  useEffect(() => {
    const djRef = db.collection('bma_system').doc('discjam');
    djRef.get().then((doc) => {
      if (!doc.exists) {
        djRef.set({ queue: [], isPlaying: false, loopMode: 'none', speed: 1, jammerId: null }).catch(() => {});
      }
    }).catch(() => {});

    const unsub = djRef.onSnapshot((snap) => {
      if (snap.exists) setDjState(snap.data());
    }, () => {});
    return () => unsub();
  }, []);

  const updateDjState = useCallback((updates) => {
    db.collection('bma_system').doc('discjam').update(updates).catch(() => {});
  }, []);

  const handleAddTrack = useCallback((songObj) => {
    const st = djStateRef.current;
    if (!st.deckA?.id && !st.deckB?.id) {
      updateDjState({ deckA: songObj, playA: { isPlaying: true, startedAt: Date.now(), pausedPos: 0 }, crossfade: 0 });
    } else {
      updateDjState({ queue: FieldValue.arrayUnion(songObj) });
    }
  }, [updateDjState]);

  const handleSeek = useCallback((deck, value) => {
    if (!canManageAudio) return;
    const targetTime = parseFloat(value);
    const st = djStateRef.current;
    if (deck === 'A' && ytA.current?.seekTo) {
      ytA.current.seekTo(targetTime, true);
      updateDjState({ playA: { ...st.playA, startedAt: Date.now() - (targetTime * 1000) } });
    } else if (deck === 'B' && ytB.current?.seekTo) {
      ytB.current.seekTo(targetTime, true);
      updateDjState({ playB: { ...st.playB, startedAt: Date.now() - (targetTime * 1000) } });
    }
  }, [canManageAudio, updateDjState]);

  const triggerManualFade = useCallback((targetDeck) => {
    if (!canManageAudio) return;
    const fadeDurMs = Math.max(1, djStateRef.current.fadeDuration || 5) * 1000;
    updateDjState({
      fadeCommand: { target: targetDeck, startTime: Date.now(), duration: fadeDurMs, keepDeck: true }
    });
  }, [canManageAudio, updateDjState]);

  const handleToggleLocalAudio = useCallback(() => {
    const nextPausedState = !isLocalPausedRef.current;
    isLocalPausedRef.current = nextPausedState;
    setIsLocalPaused(nextPausedState);

    if (!nextPausedState) {
      if (typeof navigator !== 'undefined' && navigator.audioSession) {
        try { navigator.audioSession.type = 'playback'; } catch {}
      }
      const nowMs = Date.now();
      const st = djStateRef.current;
      const closedNow = isFullyClosedSyncRef.current;
      const cVal = localCrossfadeRef.current;
      const spd = st.speed || 1;
      const masterVol = getEffectiveMasterVol();
      const volA = closedNow ? 100 : (cVal < 50 ? 100 : 100 - ((cVal - 50) * 2));
      const volB = closedNow ? 0 : (cVal > 50 ? 100 : cVal * 2);
      const vA = Math.max(0, (volA * masterVol) / 100);
      const vB = Math.max(0, (volB * masterVol) / 100);

      if (ytA.current) {
        try {
          if (vA > 0) {
            ytA.current.unMute?.();
            ytA.current.setVolume?.(vA);
          } else {
            ytA.current.mute?.();
          }

          if (closedNow) {
            const targetTime = (nowMs % 163000) / 1000;
            const curId = ytA.current.getVideoData ? ytA.current.getVideoData()?.video_id : null;
            lastSeekRef.current.A = nowMs;
            if (curId !== CLOSED_SONG_ID) {
              loadedIdA.current = CLOSED_SONG_ID;
              ytA.current.loadVideoById({ videoId: CLOSED_SONG_ID, startSeconds: targetTime });
            } else {
              ytA.current.seekTo?.(targetTime, true);
              ytA.current.playVideo?.();
            }
          } else if (st.playA?.isPlaying && st.deckA?.id && vA > 0) {
            const expA = Math.max(0, ((nowMs - (st.playA.startedAt || nowMs)) / 1000) * spd);
            const curId = ytA.current.getVideoData ? ytA.current.getVideoData()?.video_id : null;
            lastSeekRef.current.A = nowMs;
            if (curId !== st.deckA.id) {
              loadedIdA.current = st.deckA.id;
              ytA.current.loadVideoById({ videoId: st.deckA.id, startSeconds: expA });
            } else {
              ytA.current.playVideo?.();
            }
          }
        } catch {}
      }

      if (ytB.current) {
        try {
          if (vB > 0) {
            ytB.current.unMute?.();
            ytB.current.setVolume?.(vB);
          } else {
            ytB.current.mute?.();
          }

          if (!closedNow && st.playB?.isPlaying && st.deckB?.id && vB > 0) {
            const expB = Math.max(0, ((nowMs - (st.playB.startedAt || nowMs)) / 1000) * spd);
            const curId = ytB.current.getVideoData ? ytB.current.getVideoData()?.video_id : null;
            lastSeekRef.current.B = nowMs;
            if (curId !== st.deckB.id) {
              loadedIdB.current = st.deckB.id;
              ytB.current.loadVideoById({ videoId: st.deckB.id, startSeconds: expB });
            } else {
              ytB.current.playVideo?.();
            }
          }
        } catch {}
      }
    } else {
      try { ytA.current?.mute?.(); } catch {}
      try { ytB.current?.mute?.(); } catch {}
    }
  }, []);

  // โน้ตดนตรีลอยบน Floating Player
  useEffect(() => {
    if (!isLocalPaused && (djState.playA?.isPlaying || djState.playB?.isPlaying) && !isFullyClosedSync) {
      const iv = setInterval(() => {
        const chars = ['🎵', '🎶', '✨', '🎧'];
        const newNote = { id: Date.now() + Math.random(), left: Math.random() * 70 + 15 + '%', char: chars[Math.floor(Math.random() * chars.length)] };
        setFlyingNotes((prev) => [...prev, newNote]);
        setTimeout(() => setFlyingNotes((cur) => cur.filter((n) => n.id !== newNote.id)), 2500);
      }, 800);
      return () => clearInterval(iv);
    }
    setFlyingNotes([]);
  }, [djState.playA?.isPlaying, djState.playB?.isPlaying, isLocalPaused, isFullyClosedSync]);

  // โหลด YouTube IFrame API
  useEffect(() => {
    const initYTPlayer = () => {
      if (ytA.current && ytB.current) return;
      if (!document.getElementById('yt-player-a') || !document.getElementById('yt-player-b')) return;

      const conf = {
        height: '1',
        width: '1',
        playerVars: {
          autoplay: 0, controls: 0, disablekb: 1, fs: 0,
          iv_load_policy: 3, modestbranding: 1, playsinline: 1, rel: 0,
          origin: window.location.origin
        }
      };

      const handleStateChange = (deckKey) => (e) => {
        const st = djStateRef.current;
        const paused = isLocalPausedRef.current;
        const playData = deckKey === 'A' ? st.playA : st.playB;

        if (deckKey === 'A' && e.data === 0 && !st.deckA?.id && !st.deckB?.id && !paused) {
          const targetTime = (Date.now() % 163000) / 1000;
          try {
            e.target.seekTo(targetTime, true);
            e.target.unMute();
            e.target.setVolume?.(getEffectiveMasterVol());
            e.target.playVideo();
          } catch {}
          return;
        }

        if ((e.data === 5 || e.data === -1) && playData?.isPlaying && !paused) {
          try { e.target.playVideo(); } catch {}
        }

        if (e.data === 1) {
          if (paused) {
            e.target.mute?.();
          } else {
            const closedNow = isFullyClosedSyncRef.current || (!st.deckA?.id && !st.deckB?.id);
            const cVal = localCrossfadeRef.current;
            const masterVol = getEffectiveMasterVol();
            let vTarget = 0;
            if (closedNow) vTarget = deckKey === 'A' ? 100 : 0;
            else if (deckKey === 'A') vTarget = cVal < 50 ? 100 : 100 - ((cVal - 50) * 2);
            else vTarget = cVal > 50 ? 100 : cVal * 2;

            const finalVol = Math.max(0, (vTarget * masterVol) / 100);
            e.target.setVolume?.(finalVol);
            if (finalVol > 0) {
              if (e.target.isMuted?.()) e.target.unMute();
            } else if (isIOSDevice) {
              e.target.mute?.();
            }
          }
        }
      };

      ytA.current = new window.YT.Player('yt-player-a', {
        ...conf,
        events: { onReady: (e) => e.target.mute(), onStateChange: handleStateChange('A'), onError: () => onDeckErrorRef.current?.('A') }
      });
      ytB.current = new window.YT.Player('yt-player-b', {
        ...conf,
        events: { onReady: (e) => e.target.mute(), onStateChange: handleStateChange('B'), onError: () => onDeckErrorRef.current?.('B') }
      });
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = initYTPlayer;
    } else if (window.YT.Player) {
      initYTPlayer();
    }
  }, [isIOSDevice]);

  // แอนิเมชัน Crossfade
  useEffect(() => {
    if (!djState.fadeCommand) { setLocalCrossfade(djState.crossfade || 0); return; }
    const { target, startTime, duration } = djState.fadeCommand;
    if (Date.now() - startTime > duration + 2000) { setLocalCrossfade(djState.crossfade || 0); return; }

    const startVal = target === 'B' ? 0 : 100;
    const endVal = target === 'B' ? 100 : 0;
    let frameId;
    const animate = () => {
      const el = Date.now() - startTime;
      if (el >= duration) { setLocalCrossfade(endVal); return; }
      setLocalCrossfade(startVal + (endVal - startVal) * (el / duration));
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [djState.fadeCommand, djState.crossfade]);

  // ปรับเสียงตาม Crossfade / Master Volume / Ducking
  useEffect(() => {
    if (!ytA.current?.setVolume || !ytB.current?.setVolume) return;
    const masterVol = isDucking ? Math.round(localVolume * 0.2) : localVolume;

    if (isFullyClosedSync) {
      if (isLocalPaused) ytA.current.mute();
      else {
        if (ytA.current.isMuted?.()) ytA.current.unMute();
        ytA.current.setVolume(masterVol);
      }
      return;
    }

    const cVal = localCrossfade;
    const volA = cVal < 50 ? 100 : 100 - ((cVal - 50) * 2);
    const volB = cVal > 50 ? 100 : cVal * 2;
    const finalVolA = Math.max(0, (volA * masterVol) / 100);
    const finalVolB = Math.max(0, (volB * masterVol) / 100);

    if (djState.playA?.isPlaying && !isLocalPaused) {
      if (finalVolA === 0) ytA.current.mute();
      else {
        if (ytA.current.isMuted?.()) ytA.current.unMute();
        if (ytA.current.getVolume?.() !== finalVolA) ytA.current.setVolume(finalVolA);
      }
    } else if (isLocalPaused) ytA.current.mute();

    if (djState.playB?.isPlaying && !isLocalPaused) {
      if (finalVolB === 0) ytB.current.mute();
      else {
        if (ytB.current.isMuted?.()) ytB.current.unMute();
        if (ytB.current.getVolume?.() !== finalVolB) ytB.current.setVolume(finalVolB);
      }
    } else if (isLocalPaused) ytB.current.mute();
  }, [localCrossfade, localVolume, isDucking, djState.playA?.isPlaying, djState.playB?.isPlaying, isLocalPaused, isFullyClosedSync]);

  // เลื่อนคิวเพลงด้วย Firestore Transaction
  const advanceDjQueue = useCallback(async (fromDeck, withFade = false, expectedKey = null) => {
    if (isFadingRef.current) return;
    isFadingRef.current = true;
    const djRef = db.collection('bma_system').doc('discjam');
    try {
      await db.runTransaction(async (tx) => {
        const doc = await tx.get(djRef);
        if (!doc.exists) return;
        const data = doc.data();
        if ((data.djMode || 'auto') !== 'auto') return;

        const liveDeck = fromDeck === 'A' ? data.deckA : data.deckB;
        const liveKey = liveDeck?.key || liveDeck?.id || null;
        if (expectedKey && liveKey !== expectedKey) return;
        if (!expectedKey && (data.playA?.isPlaying || data.playB?.isPlaying)) return;
        if (data.fadeCommand && (Date.now() - data.fadeCommand.startTime < (data.fadeCommand.duration || 5000) + 1000)) return;

        const q = data.queue || [];
        const now = Date.now();
        if (q.length === 0) {
          if (expectedKey) {
            const clearUp = { fadeCommand: null };
            if (fromDeck === 'A') { clearUp.deckA = null; clearUp.playA = { ...(data.playA || {}), isPlaying: false, startedAt: 0, pausedPos: 0 }; }
            else { clearUp.deckB = null; clearUp.playB = { ...(data.playB || {}), isPlaying: false, startedAt: 0, pausedPos: 0 }; }
            tx.update(djRef, clearUp);
          }
          return;
        }

        const nextSong = q[0];
        const newQ = q.slice(1);
        const fadeDurMs = Math.max(1, data.fadeDuration || 5) * 1000;
        const targetDeck = !expectedKey ? 'A' : (fromDeck === 'A' ? 'B' : 'A');

        if (withFade && expectedKey) {
          const up = { queue: newQ, fadeCommand: { target: targetDeck, startTime: now, duration: fadeDurMs } };
          if (targetDeck === 'B') { up.deckB = nextSong; up.playB = { isPlaying: true, startedAt: now, pausedPos: 0, isLooping: false }; }
          else { up.deckA = nextSong; up.playA = { isPlaying: true, startedAt: now, pausedPos: 0, isLooping: false }; }
          tx.update(djRef, up);
        } else {
          const up = { queue: newQ, crossfade: targetDeck === 'B' ? 100 : 0, fadeCommand: null };
          if (targetDeck === 'B') {
            up.deckB = nextSong; up.playB = { isPlaying: true, startedAt: now, pausedPos: 0, isLooping: false };
            up.deckA = null; up.playA = { ...(data.playA || {}), isPlaying: false, startedAt: 0, pausedPos: 0 };
          } else {
            up.deckA = nextSong; up.playA = { isPlaying: true, startedAt: now, pausedPos: 0, isLooping: false };
            up.deckB = null; up.playB = { ...(data.playB || {}), isPlaying: false, startedAt: 0, pausedPos: 0 };
          }
          tx.update(djRef, up);
        }
      });
    } catch (err) {
      console.warn('Auto advance skipped:', err);
    } finally {
      setTimeout(() => { isFadingRef.current = false; }, 1500);
    }
  }, []);

  useEffect(() => {
    onDeckErrorRef.current = (deckId) => {
      const st = djStateRef.current;
      const deckData = deckId === 'A' ? st.deckA : st.deckB;
      if ((st.djMode || 'auto') !== 'auto' || !deckData?.id) return;
      setTimeout(() => advanceDjQueue(deckId, false, deckData.key || deckData.id), 1500);
    };
  }, [advanceDjQueue]);

  // โหลดเพลงลง Deck A / B
  useEffect(() => {
    if (!ytA.current?.loadVideoById || !ytB.current?.loadVideoById) return;

    if (isFullyClosedSync) {
      const targetTime = (Date.now() % 163000) / 1000;
      if (loadedIdA.current !== CLOSED_SONG_ID) {
        loadedIdA.current = CLOSED_SONG_ID;
        ytA.current.loadVideoById(CLOSED_SONG_ID, targetTime);
        ytA.current.setLoop?.(true);
      }
      const cur = ytA.current.getCurrentTime?.() || 0;
      const state = ytA.current.getPlayerState?.() ?? -1;
      if (Math.abs(targetTime - cur) > 3 && state !== 3) ytA.current.seekTo?.(targetTime, true);
      if (state !== 1 && !isLocalPaused) ytA.current.playVideo?.();
      ytB.current.pauseVideo?.();
      return;
    }

    const currentSpeed = djState.speed || 1;
    const syncDeckTrack = (player, loadedRef, deckData, playData) => {
      if (!player?.loadVideoById) return;
      if (!deckData?.id) {
        loadedRef.current = null;
        player.pauseVideo?.();
        return;
      }
      const trackUid = deckData.key || deckData.id;
      if (loadedRef.current !== trackUid) {
        loadedRef.current = trackUid;
        const startSec = playData?.startedAt ? Math.max(0, ((Date.now() - playData.startedAt) / 1000) * currentSpeed) : 0;
        player.loadVideoById({ videoId: deckData.id, startSeconds: startSec });
      }
      if (playData?.isPlaying) {
        if (isLocalPaused) player.mute?.();
        const st = player.getPlayerState?.() ?? -1;
        if (st !== 1 && st !== 3) player.playVideo();
        player.setPlaybackRate?.(currentSpeed);
      } else {
        player.pauseVideo?.();
      }
    };

    syncDeckTrack(ytA.current, loadedIdA, djState.deckA, djState.playA);
    syncDeckTrack(ytB.current, loadedIdB, djState.deckB, djState.playB);
  }, [djState.deckA?.id, djState.deckA?.key, djState.deckB?.id, djState.deckB?.key, djState.playA?.isPlaying, djState.playB?.isPlaying, djState.speed, isLocalPaused, isFullyClosedSync]);

  // ลูปซิงก์เวลาทุก 1 วินาที (แยกอยู่ใน RadioProvider ไม่ทำให้ App หลัก Re-render)
  useEffect(() => {
    const syncTimer = setInterval(() => {
      const isAutoMode = (djState.djMode || 'auto') === 'auto';
      const canAutoRun = canManageAudio || isAutoMode;
      const currentSpeed = djState.speed || 1;
      const nowMs = Date.now();
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const isSafari = /^((?!chrome|android).)*safari/i.test(ua) || isIOSDevice;

      if (isFullyClosedSync) {
        if (ytA.current?.getPlayerState) {
          const targetTime = (nowMs % 163000) / 1000;
          const curId = ytA.current.getVideoData?.()?.video_id || null;
          const state = ytA.current.getPlayerState();
          const cur = ytA.current.getCurrentTime?.() || 0;

          if (isLocalPaused) {
            if (ytA.current.isMuted && !ytA.current.isMuted()) ytA.current.mute();
            if (curId !== CLOSED_SONG_ID && ytA.current.cueVideoById) {
              loadedIdA.current = CLOSED_SONG_ID;
              ytA.current.cueVideoById({ videoId: CLOSED_SONG_ID, startSeconds: targetTime });
            }
          } else if (state !== 3) {
            const driftLimit = isSafari ? 6 : 4;
            const seekCooldown = isSafari ? 6000 : 4000;
            if (curId !== CLOSED_SONG_ID) {
              loadedIdA.current = CLOSED_SONG_ID;
              lastSeekRef.current.A = nowMs;
              ytA.current.loadVideoById({ videoId: CLOSED_SONG_ID, startSeconds: targetTime });
            } else if (state === 0 || state === 5) {
              lastSeekRef.current.A = nowMs;
              ytA.current.seekTo?.(targetTime, true);
              ytA.current.playVideo?.();
            } else if (Math.abs(targetTime - cur) > driftLimit && (nowMs - lastSeekRef.current.A > seekCooldown)) {
              lastSeekRef.current.A = nowMs;
              ytA.current.seekTo?.(targetTime, true);
              if (state !== 1) ytA.current.playVideo?.();
            } else if (state === 2 && (nowMs - lastSeekRef.current.A > seekCooldown)) {
              lastSeekRef.current.A = nowMs;
              ytA.current.playVideo?.();
            }
            const vol = getEffectiveMasterVol();
            if (vol <= 0) {
              if (ytA.current.isMuted && !ytA.current.isMuted()) ytA.current.mute();
            } else {
              if (ytA.current.getVolume?.() !== vol) ytA.current.setVolume?.(vol);
              if ((!isSafari || state === 1) && ytA.current.isMuted?.()) ytA.current.unMute();
            }
          }
        }
        ytB.current?.pauseVideo?.();
        return;
      }

      const durA = ytA.current?.getDuration?.() || 0;
      const curA = ytA.current?.getCurrentTime?.() || 0;
      const durB = ytB.current?.getDuration?.() || 0;
      const curB = ytB.current?.getCurrentTime?.() || 0;
      setTrackTime({ curA: Math.floor(curA), durA: Math.floor(durA), curB: Math.floor(curB), durB: Math.floor(durB) });

      if (djState.fadeCommand) {
        const fadeElapsed = nowMs - (djState.fadeCommand.startTime || 0);
        const fadeDur = djState.fadeCommand.duration || 5000;
        if (canAutoRun && fadeElapsed >= fadeDur + 400 && !isFadingRef.current) {
          isFadingRef.current = true;
          const target = djState.fadeCommand.target;
          const fUp = { fadeCommand: null, crossfade: target === 'B' ? 100 : 0 };
          if (!djState.fadeCommand.keepDeck) {
            if (target === 'B') { fUp.playA = { ...(djState.playA || {}), isPlaying: false, startedAt: 0, pausedPos: 0 }; fUp.deckA = null; }
            else { fUp.playB = { ...(djState.playB || {}), isPlaying: false, startedAt: 0, pausedPos: 0 }; fUp.deckB = null; }
          }
          updateDjState(fUp);
          setTimeout(() => { isFadingRef.current = false; }, 1000);
        }
        return;
      }

      const isDeckA = (djState.crossfade || 0) < 50;

      if (canAutoRun && !isFadingRef.current) {
        const activePlayData = isDeckA ? djState.playA : djState.playB;
        const activeDeckData = isDeckA ? djState.deckA : djState.deckB;
        const stateA = ytA.current?.getPlayerState?.() ?? -1;
        const stateB = ytB.current?.getPlayerState?.() ?? -1;
        const loadedVidA = ytA.current?.getVideoData?.()?.video_id || null;
        const loadedVidB = ytB.current?.getVideoData?.()?.video_id || null;
        const globalExpA = djState.playA?.startedAt ? ((nowMs - djState.playA.startedAt) / 1000) * currentSpeed : 0;
        const globalExpB = djState.playB?.startedAt ? ((nowMs - djState.playB.startedAt) / 1000) * currentSpeed : 0;
        const isSameA = Boolean(djState.deckA?.id && loadedVidA === djState.deckA.id);
        const isSameB = Boolean(djState.deckB?.id && loadedVidB === djState.deckB.id);
        const isEndedA = isSameA && globalExpA > 2 && (stateA === 0 || (durA > 0 && durA - curA <= 0.6) || (durA > 0 && globalExpA >= durA + 1.5));
        const isEndedB = isSameB && globalExpB > 2 && (stateB === 0 || (durB > 0 && durB - curB <= 0.6) || (durB > 0 && globalExpB >= durB + 1.5));
        const activeIsEnded = isDeckA ? isEndedA : isEndedB;

        if (!djState.playA?.isPlaying && !djState.playB?.isPlaying) {
          if (isAutoMode && djState.queue?.length > 0) {
            advanceDjQueue(isDeckA ? 'A' : 'B', false, null);
            return;
          }
        } else if (activeIsEnded) {
          if (activePlayData?.isLooping && activeDeckData?.id) {
            isFadingRef.current = true;
            const up = {};
            if (isDeckA) up.playA = { ...djState.playA, isPlaying: true, startedAt: Date.now(), pausedPos: 0 };
            else up.playB = { ...djState.playB, isPlaying: true, startedAt: Date.now(), pausedPos: 0 };
            updateDjState(up);
            setTimeout(() => { isFadingRef.current = false; }, 1200);
            return;
          }
          if (isAutoMode) {
            advanceDjQueue(isDeckA ? 'A' : 'B', false, activeDeckData?.key || activeDeckData?.id);
            return;
          }
        }

        let cleared = false;
        const upClear = {};
        if (isEndedA && !isDeckA && !djState.playA?.isLooping) {
          upClear.playA = { ...(djState.playA || {}), isPlaying: false, startedAt: 0, pausedPos: 0 };
          upClear.deckA = null; cleared = true;
        }
        if (isEndedB && isDeckA && !djState.playB?.isLooping) {
          upClear.playB = { ...(djState.playB || {}), isPlaying: false, startedAt: 0, pausedPos: 0 };
          upClear.deckB = null; cleared = true;
        }
        if (cleared) updateDjState(upClear);
      }

      const syncPlayer = (player, deckData, playData, isActive, deckId) => {
        if (!player?.getCurrentTime || !playData?.isPlaying || !deckData?.id) return;
        const expRaw = ((nowMs - (playData.startedAt || nowMs)) / 1000) * currentSpeed;
        const exp = Math.max(0, expRaw);
        const cur = player.getCurrentTime();
        const dur = player.getDuration?.() || 0;
        const state = player.getPlayerState?.() ?? -1;
        const loadedVid = player.getVideoData?.()?.video_id || null;

        const cVal = localCrossfadeRef.current;
        const targetVol = deckId === 'A' ? (cVal < 50 ? 100 : 100 - ((cVal - 50) * 2)) : (cVal > 50 ? 100 : cVal * 2);
        const finalVol = isLocalPaused ? 0 : Math.max(0, (targetVol * getEffectiveMasterVol()) / 100);

        if (isLocalPaused || finalVol <= 0) {
          if (player.isMuted && !player.isMuted()) player.mute();
          if (player.getVolume?.() !== 0) player.setVolume?.(0);
        } else {
          if (player.getVolume?.() !== finalVol) player.setVolume?.(finalVol);
          if ((!isSafari || state === 1) && player.isMuted?.()) player.unMute();
        }

        if (isSafari && !isActive && finalVol <= 0 && !djState.fadeCommand) return;

        const seekCooldown = isSafari ? 6000 : 3500;
        const lastAct = lastSeekRef.current[deckId] || 0;
        if (state === 3) return;

        if (state === -1 || state === 5) {
          if (!isSafari || nowMs - lastAct > seekCooldown) { lastSeekRef.current[deckId] = nowMs; player.playVideo(); }
        } else if (state === 2) {
          if (isLocalPaused || nowMs - lastAct > seekCooldown) { lastSeekRef.current[deckId] = nowMs; player.playVideo(); }
        } else if (state === 0 && dur > 0 && exp < dur - 2 && (nowMs - lastAct > seekCooldown)) {
          lastSeekRef.current[deckId] = nowMs;
          player.seekTo(exp, true);
          player.playVideo();
        }

        if (player.getPlaybackRate?.() !== currentSpeed) player.setPlaybackRate?.(currentSpeed);
        if (loadedVid !== deckData.id) return;

        const driftLimit = isSafari ? 6 : 4;
        if (dur > 0 && dur - cur >= 2 && Math.abs(exp - cur) > driftLimit && state !== 0 && !isSeekingRef.current && (nowMs - lastAct > seekCooldown)) {
          if (expRaw >= 0 || cur >= 15) {
            isSeekingRef.current = true;
            lastSeekRef.current[deckId] = nowMs;
            player.seekTo(exp, true);
            if (state !== 1) player.playVideo();
            setTimeout(() => { isSeekingRef.current = false; }, isSafari ? 4000 : 2000);
          }
        }

        const fadeSec = Math.max(1, djState.fadeDuration || 5);
        if (canAutoRun && isActive && !isFadingRef.current && exp > 3 && dur > fadeSec + 2 && (dur - cur) <= fadeSec * currentSpeed) {
          if (playData.isLooping) {
            isFadingRef.current = true;
            const up = {};
            if (deckId === 'A') up.playA = { ...djState.playA, isPlaying: true, startedAt: Date.now(), pausedPos: 0 };
            else up.playB = { ...djState.playB, isPlaying: true, startedAt: Date.now(), pausedPos: 0 };
            updateDjState(up);
            setTimeout(() => { isFadingRef.current = false; }, 1500);
          } else if (isAutoMode && djState.queue?.length > 0) {
            advanceDjQueue(deckId, true, deckData.key || deckData.id);
          }
        }
      };

      syncPlayer(ytA.current, djState.deckA, djState.playA, isDeckA, 'A');
      syncPlayer(ytB.current, djState.deckB, djState.playB, !isDeckA, 'B');
    }, 1000);
    return () => clearInterval(syncTimer);
  }, [djState, isLocalPaused, canManageAudio, isFullyClosedSync, isIOSDevice, advanceDjQueue, updateDjState]);

  // ดึงชื่อเพลงอัตโนมัติจาก noembed
  useEffect(() => {
    if (!canManageAudio || !djState) return;
    let updated = false;
    const newQ = [...(djState.queue || [])];
    const fetchTitle = async (vid) => {
      try {
        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${vid}`);
        const data = await res.json();
        return data.title || null;
      } catch { return null; }
    };

    const processTitles = async () => {
      const promises = newQ.map(async (q, i) => {
        if (q.title === 'กำลังโหลดข้อมูล...') {
          const title = await fetchTitle(q.id);
          if (title) { newQ[i] = { ...q, title }; updated = true; }
        }
      });
      let dA = djState.deckA;
      let dB = djState.deckB;
      const pA = (async () => {
        if (dA?.title === 'กำลังโหลดข้อมูล...') {
          const title = await fetchTitle(dA.id);
          if (title) { dA = { ...dA, title }; updated = true; }
        }
      })();
      const pB = (async () => {
        if (dB?.title === 'กำลังโหลดข้อมูล...') {
          const title = await fetchTitle(dB.id);
          if (title) { dB = { ...dB, title }; updated = true; }
        }
      })();
      await Promise.all([...promises, pA, pB]);
      if (updated) {
        const ups = {};
        if (JSON.stringify(newQ) !== JSON.stringify(djState.queue)) ups.queue = newQ;
        if (dA && JSON.stringify(dA) !== JSON.stringify(djState.deckA)) ups.deckA = dA;
        if (dB && JSON.stringify(dB) !== JSON.stringify(djState.deckB)) ups.deckB = dB;
        if (Object.keys(ups).length > 0) updateDjState(ups);
      }
    };
    processTitles();
  }, [djState.queue, djState.deckA, djState.deckB, canManageAudio, updateDjState]);

  return (
    <RadioContext.Provider value={{
      djState,
      lateNight,
      localCrossfade,
      setLocalCrossfade,
      isLocalPaused,
      localVolume,
      setLocalVolume,
      isDucking,
      setRadioDucking,
      isPlayerFloatingOpen,
      setIsPlayerFloatingOpen,
      trackTime,
      flyingNotes,
      canManageAudio,
      activeDeckSong,
      isDeckPlaying,
      isFullyClosedSync,
      ytA,
      ytB,
      updateDjState,
      handleAddTrack,
      handleToggleLocalAudio,
      handleSeek,
      triggerManualFade,
      advanceDjQueue
    }}>
      <div className="fixed bottom-0 left-0 w-[200px] h-[200px] opacity-[0.001] pointer-events-none -z-50 overflow-hidden" aria-hidden="true">
        <div id="yt-player-a"></div>
        <div id="yt-player-b"></div>
      </div>
      {children}
    </RadioContext.Provider>
  );
}

export const useRadio = () => useContext(RadioContext);