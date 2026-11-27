import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { PRNG, useStickyState, playGameSfx } from '../../../lib/utils';

// 5. Wordle (340+ Words + Shake + Emoji Share Grid)
const WORDLE_WORDS = (
  'ABOUT ABOVE ACTOR ADMIT ADOPT ADULT AFTER AGAIN AGENT AGREE AHEAD ALARM ALBUM ALERT ALIEN ALIVE ALLOW ALONE ALONG AMBER AMONG ANGEL ANGER ANGLE ANGRY APART APPLE APPLY ARENA ARGUE ARISE ARMOR AROMA ARROW AUDIO AVOID AWAKE AWARD AWARE ' +
  'BADGE BAKER BASIC BEACH BEARD BEAST BEGIN BEING BELLY BELOW BENCH BERRY BIRTH BLACK BLADE BLAME BLANK BLAST BLAZE BLEND BLESS BLIND BLINK BLOCK BLOOD BLOOM BOARD BONUS BOOST BOOTH BOUND BRAIN BRAND BRAVE BREAD BREAK BRICK BRIDE BRIEF BRING BROAD BROKE BROOK BROWN BRUSH BUILD BUILT BUNCH BURST BUYER ' +
  'CABIN CABLE CAMEL CANAL CANDY CARGO CARRY CARVE CATCH CAUSE CEDAR CHAIN CHAIR CHALK CHAMP CHAOS CHARM CHART CHASE CHEAP CHEAT CHECK CHEEK CHEER CHESS CHEST CHICK CHIEF CHILD CHILL CHINA CHOIR CHORD CHOSE CIDER CIVIL CLAIM CLASH CLASS CLEAN CLEAR CLERK CLICK CLIFF CLIMB CLOAK CLOCK CLONE CLOSE CLOTH CLOUD CLOWN COACH COAST COBRA COCOA COLOR COMBO COMET COMIC CORAL COUCH COULD COUNT COURT COVER CRACK CRAFT CRANE CRASH CRATE CRAWL CRAZY CREAM CREEK CREEP CREST CRISP CROSS CROWD CROWN CRUEL CRUSH CRUST CURRY CURVE CYCLE ' +
  'DAILY DAIRY DAISY DANCE DEBUT DECAY DECOR DELAY DELTA DENSE DEPTH DIARY DIGIT DINER DISCO DIVER DIZZY DODGE DONUT DOUBT DOUGH DOZEN DRAFT DRAIN DRAMA DREAM DRESS DRIFT DRILL DRINK DRIVE DRONE DROWN DWARF ' +
  'EAGER EAGLE EARLY EARTH EIGHT ELBOW ELDER ELECT ELITE EMAIL EMBER EMPTY ENEMY ENJOY ENTER ENTRY EQUAL EQUIP ERASE ERROR ESSAY EVENT EVERY EXACT EXTRA ' +
  'FABLE FAINT FAIRY FAITH FALSE FANCY FAULT FAVOR FEAST FENCE FERRY FETCH FEVER FIBER FIELD FIERY FIFTH FIFTY FIGHT FINAL FIRST FLAME FLASH FLASK FLEET FLESH FLICK FLINT FLOAT FLOCK FLOOD FLOOR FLORA FLOUR FLUID FLUSH FLUTE FOCUS FOGGY FORCE FORGE FORTH FORTY FORUM FOUND FRAME FRANK FRESH FRIED FRONT FROST FROWN FROZE FRUIT FUDGE FULLY FUNNY FUZZY ' +
  'GAMER GHOST GIANT GIVEN GLARE GLASS GLAZE GLEAM GLIDE GLOBE GLOOM GLORY GLOSS GLOVE GNOME GOOSE GRACE GRADE GRAIN GRAND GRANT GRAPE GRAPH GRASP GRASS GRAVE GRAVY GREAT GREEN GREET GRIEF GRILL GRIND GROOM GROUP GROVE GROWL GROWN GUARD GUESS GUEST GUIDE GUILD ' +
  'HABIT HAPPY HARDY HARSH HASTE HATCH HAVEN HEART HEAVY HEDGE HELLO HIPPO HOBBY HONEY HONOR HORSE HOTEL HOUND HOUSE HOVER HUMAN HUMID HUMOR HURRY HUSKY ' +
  'ICING IDEAL IGLOO IMAGE INDEX INDIE INNER INPUT IRONY ISSUE IVORY JELLY JEWEL JOINT JOKER JOLLY JUDGE JUICE JUICY JUMBO KAYAK KEBAB KNEEL KNIFE KNOCK KNOWN KOALA ' +
  'LABEL LABOR LARGE LASER LATCH LATER LATTE LAUGH LAYER LEARN LEASE LEAST LEAVE LEDGE LEGAL LEMON LEVEL LEVER LIGHT LILAC LIMIT LINEN LLAMA LOBBY LOCAL LODGE LOFTY LOGIC LOOSE LOTUS LOVER LOWER LOYAL LUCID LUCKY LUNAR LUNCH LYRIC ' +
  'MAGIC MAGMA MAJOR MAKER MANGA MANGO MANOR MAPLE MARCH MARRY MARSH MATCH MAYOR MEDAL MEDIA MEDIC MELON MERCY MERGE MERIT MERRY METAL METER METRO MICRO MIDST MIGHT MILKY MIMIC MINER MINOR MINUS MOCHA MODEL MODEM MOIST MONEY MONTH MOODY MOOSE MORAL MOTEL MOTIF MOTOR MOTTO MOUND MOUNT MOUSE MOUTH MOVIE MUDDY MUMMY MUNCH MURAL MUSIC ' +
  'NACHO NAIVE NERVE NEVER NEWER NEWLY NICHE NIECE NIGHT NINJA NINTH NOBLE NOISE NOISY NOMAD NORTH NOTCH NOVEL NUDGE NURSE NYLON OASIS OCEAN OFFER OFTEN OLDER OLIVE OMEGA ONION ONSET OPERA OPTIC ORBIT ORDER ORGAN OTHER OTTER OUNCE OUTER OWNER OXIDE OZONE ' +
  'PAINT PANDA PANEL PANIC PAPER PARKA PARTY PASTA PASTE PATCH PATIO PAUSE PEACE PEACH PEARL PECAN PEDAL PENNY PERCH PERIL PESTO PETAL PHASE PHONE PHOTO PIANO PIECE PILOT PINCH PIPER PITCH PIVOT PIXEL PIXIE PIZZA PLACE PLAID PLAIN PLANE PLANK PLANT PLATE PLAZA PLEAD PLUCK PLUMB PLUME PLUMP PLUSH POINT POISE POKER POLAR POLKA POPPY PORCH POUCH POUND POWER PRANK PRAWN PRESS PRICE PRIDE PRIME PRINT PRIOR PRISM PRIZE PROBE PRONE PROOF PROSE PROUD PROVE PROWL PROXY PRUNE PULSE PUNCH PUPIL PUPPY PUREE PURGE PURSE ' +
  'QUAKE QUART QUEEN QUERY QUEST QUEUE QUICK QUIET QUILL QUILT QUIRK QUITE QUOTA QUOTE RADAR RADIO RAINY RAISE RALLY RAMEN RANCH RANGE RAPID RATIO RAVEN REACH REACT READY REALM REBEL RECAP REFER REGAL REIGN RELAX RELAY RELIC REMIX RENEW REPAY REPLY RESET RESIN RETRO RETRY REUSE RHINO RHYME RIDER RIDGE RIGHT RIGID RINSE RIPEN RISEN RISKY RIVAL RIVER ROAST ROBIN ROBOT ROCKY RODEO ROGUE ROOMY ROUGH ROUND ROUTE ROVER ROYAL RUGBY RULER RUMBA RUMOR RURAL RUSTY ' +
  'SAINT SALAD SALON SALSA SALTY SANDY SANTA SATIN SAUCE SAUNA SAVOR SAVVY SCALE SCARE SCARF SCARY SCENE SCENT SCOOP SCOPE SCORE SCOUT SCRAP SCREW SCRUB SEDAN SENSE SERVE SETUP SEVEN SHADE SHADY SHAFT SHAKE SHALL SHAME SHAPE SHARD SHARE SHARK SHARP SHAVE SHAWL SHEEP SHEER SHEET SHELF SHELL SHIFT SHINE SHINY SHIRT SHOCK SHOOT SHORE SHORT SHOUT SHOVE SHOWN SHRUB SHRUG SIGHT SIGMA SILKY SILLY SINCE SIREN SIXTH SIXTY SKATE SKIER SKILL SKIRT SKULL SKUNK SLACK SLANG SLANT SLASH SLATE SLEEK SLEEP SLEET SLICE SLICK SLIDE SLIME SLING SLOPE SLOTH SLUMP SLURP SLUSH SMACK SMALL SMART SMASH SMEAR SMELL SMILE SMIRK SMITH SMOKE SMOKY SNACK SNAIL SNAKE SNARE SNARL SNEAK SNEER SNIFF SNIPE SNOOP SNORE SNORT SNOUT SNOWY SOAPY SOBER SOGGY SOLAR SOLID SOLVE SONAR SONIC SORRY SOUND SOUTH SPACE SPADE SPARE SPARK SPAWN SPEAK SPEAR SPECK SPEED SPELL SPEND SPENT SPICE SPICY SPIKE SPILL SPINE SPIRE SPITE SPLIT SPOIL SPOKE SPOOF SPOOK SPOOL SPOON SPORE SPORT SPOUT SPRAY SPREE SQUAD SQUAT STACK STAFF STAGE STAIN STAIR STAKE STALE STALK STALL STAMP STAND STARE STARK START STASH STATE STEAD STEAK STEAL STEAM STEEL STEEP STEER STERN STICK STIFF STILL STING STINK STOCK STOIC STOLE STOMP STONE STONY STOOD STOOL STOOP STORE STORK STORM STORY STOUT STOVE STRAP STRAW STRAY STRIP STRUT STUCK STUDY STUFF STUMP STUNG STUNT STYLE SUAVE SUGAR SUITE SUNNY SUPER SURGE SUSHI SWAMP SWARM SWEAR SWEAT SWEEP SWEET SWELL SWEPT SWIFT SWING SWIRL SWISH SWOOP SWORD SWORE SWORN SYRUP ' +
  'TABLE TABOO TACKY TAKEN TALLY TALON TANGO TANGY TAPER TARDY TAROT TASTE TASTY TAUNT TEACH TEARY TEASE TEDDY TEETH TEMPO TENOR TENSE TENTH TERRA THANK THEFT THEIR THEME THERE THESE THETA THICK THIEF THING THINK THIRD THORN THOSE THREE THREW THROB THROW THUMB THUMP THYME TIARA TIDAL TIGER TIGHT TIMER TIMID TITAN TITLE TOAST TODAY TOKEN TONAL TONIC TOOTH TOPAZ TOPIC TORCH TORSO TOTAL TOTEM TOUCH TOUGH TOWEL TOWER TOXIC TRACE TRACK TRACT TRADE TRAIL TRAIN TRAIT TRASH TREAD TREAT TREND TRIAD TRIAL TRIBE TRICK TRIED TROLL TROOP TROUT TROVE TRUCE TRUCK TRULY TRUMP TRUNK TRUST TRUTH TULIP TUNIC TURBO TUTOR TWANG TWEAK TWEED TWEET TWICE TWINE TWIRL TWIST ' +
  'ULTRA UNCLE UNDER UNDUE UNFIT UNIFY UNION UNITE UNITY UNLIT UNTIL UNZIP UPPER UPSET URBAN USAGE USHER USING USUAL UTTER VAGUE VALET VALID VALOR VALUE VALVE VAPOR VAULT VEGAN VENOM VENUE VERGE VERSE VIDEO VIGIL VIGOR VILLA VINYL VIOLA VIPER VIRAL VIRUS VISIT VISOR VISTA VITAL VIVID VOCAL VODKA VOGUE VOICE VOILA VOTER VOUCH VOWEL ' +
  'WACKY WAFER WAGER WAGON WAIST WAIVE WALTZ WASTE WATCH WATER WAVER WEARY WEAVE WEDGE WEIGH WEIRD WHACK WHALE WHARF WHEAT WHEEL WHERE WHICH WHIFF WHILE WHINE WHIRL WHISK WHITE WHOLE WHOOP WHOSE WIDEN WIDER WIDOW WIDTH WIELD WINCE WINCH WINDY WISER WITCH WITTY WOMAN WOMEN WOODY WORLD WORRY WORSE WORST WORTH WOULD WOUND WOVEN WRATH WREAK WRECK WRING WRIST WRITE WRONG WROTE YACHT YEARN YEAST YIELD YOUNG YOUTH ZEBRA ZESTY'
).split(' ');

export function WordleGame({ dateSeed, onEnd }) {
  const [target, setTarget] = useState('');
  const [guesses, setGuesses] = useStickyState([], `bma_wdl_g_${dateSeed}`);
  const [curr, setCurr] = useStickyState('', `bma_wdl_c_${dateSeed}`);
  const [isChecking, setIsChecking] = useState(false);
  const [wordErr, setWordErr] = useState('');
  const [shakeRow, setShakeRow] = useState(false);
  const [validDict, setValidDict] = useState(() => new Set(WORDLE_WORDS));

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/charlesreid1/five-letter-words/master/sgb-words.txt')
      .then((res) => res.text())
      .then((text) => {
        const wordList = text.split('\n').map((w) => w.trim().toUpperCase()).filter((w) => w.length === 5);
        setValidDict(new Set([...WORDLE_WORDS, ...wordList]));
      })
      .catch(() => console.warn('ไม่สามารถโหลดพจนานุกรมสำรองได้ ใช้ฐานข้อมูลหลักแทน'));
  }, []);

  useEffect(() => {
    const rng = new PRNG(dateSeed + '_wordle3');
    setTarget(WORDLE_WORDS[rng.nextInt(0, WORDLE_WORDS.length - 1)]);
  }, [dateSeed]);

  const evaluateGuess = (guessStr) => {
    const res = Array(5).fill('absent');
    const targetChars = target.split('');
    for (let i = 0; i < 5; i++) {
      if (guessStr[i] === targetChars[i]) {
        res[i] = 'correct';
        targetChars[i] = null;
      }
    }
    for (let i = 0; i < 5; i++) {
      if (res[i] === 'correct') continue;
      const idx = targetChars.indexOf(guessStr[i]);
      if (idx !== -1) {
        res[i] = 'present';
        targetChars[idx] = null;
      }
    }
    return res;
  };

  const buildShareGrid = (guessList) =>
    guessList
      .map((g) => evaluateGuess(g).map((st) => (st === 'correct' ? '🟩' : st === 'present' ? '🟨' : '⬛')).join(''))
      .join('\n');

  const triggerShakeError = (msg) => {
    playGameSfx('error');
    setWordErr(msg);
    setShakeRow(true);
    setTimeout(() => setShakeRow(false), 600);
    setTimeout(() => setWordErr(''), 2000);
  };

  const onKey = async (k) => {
    if (isChecking || !target) return;
    if (k === 'ENTER') {
      if (curr.length !== 5) return triggerShakeError('กรุณาพิมพ์ให้ครบ 5 ตัวอักษร');
      setIsChecking(true);
      const isValid = validDict.has(curr);
      setIsChecking(false);
      if (!isValid) return triggerShakeError('คำนี้ไม่มีอยู่ในพจนานุกรม');

      const newG = [...guesses, curr];
      setGuesses(newG);
      setCurr('');
      const shareGrid = buildShareGrid(newG);

      if (curr === target) {
        playGameSfx('win');
        onEnd('won', { score: newG.length, answer: target, shareGrid });
      } else if (newG.length >= 6) {
        playGameSfx('lose');
        onEnd('lost', { score: 6, answer: target, shareGrid });
      } else {
        playGameSfx('merge');
      }
    } else if (k === 'DEL') {
      if (curr.length > 0) playGameSfx('undo');
      setCurr(curr.slice(0, -1));
    } else if (curr.length < 5) {
      playGameSfx('tap');
      setCurr(curr + k);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const key = e.key.toUpperCase();
      if (key === 'ENTER') onKey('ENTER');
      else if (key === 'BACKSPACE' || key === 'DELETE') onKey('DEL');
      else if (/^[A-Z]$/.test(key)) onKey(key);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [curr, guesses, target, onEnd, isChecking, validDict]);

  if (!target) return <div className="py-10 animate-pulse text-sky-400 font-mono text-center">Loading...</div>;

  const statusToCls = (st) => {
    if (st === 'correct') return 'bg-emerald-500 text-white border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
    if (st === 'present') return 'bg-amber-500 text-white border-amber-500';
    return 'bg-slate-700 text-slate-300 border-slate-700 opacity-60';
  };

  const rows = [];
  for (let i = 0; i < 6; i++) {
    if (i < guesses.length) {
      const evals = evaluateGuess(guesses[i]);
      rows.push(
        <div key={i} className="flex gap-1.5 justify-center">
          {guesses[i].split('').map((char, j) => (
            <div key={j} className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-xl font-bold rounded border-2 transition-all duration-500 ${statusToCls(evals[j])}`} style={{ animation: `flipIn 0.45s ease forwards ${j * 0.08}s` }}>{char}</div>
          ))}
        </div>
      );
    } else if (i === guesses.length) {
      rows.push(
        <div key={i} className={`flex gap-1.5 justify-center ${shakeRow ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3, 4].map((j) => (
            <div key={j} className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-xl font-bold rounded border-2 transition-all duration-100 ${curr[j] ? 'border-sky-400 scale-105 drop-shadow-[0_0_5px_rgba(56,189,248,0.5)]' : 'border-[#1E3A5F]'} bg-[#050811]`}>{curr[j] || ''}</div>
          ))}
        </div>
      );
    } else {
      rows.push(
        <div key={i} className="flex gap-1.5 justify-center">
          {[0, 1, 2, 3, 4].map((j) => <div key={j} className="w-10 h-10 sm:w-12 sm:h-12 rounded border-2 border-[#1E3A5F]/40 bg-[#050811]/50"></div>)}
        </div>
      );
    }
  }

  const keyColor = (char) => {
    let best = 'unused';
    for (const g of guesses) {
      const evals = evaluateGuess(g);
      for (let i = 0; i < 5; i++) {
        if (g[i] === char) {
          if (evals[i] === 'correct') return 'bg-emerald-500 text-white border border-emerald-400';
          if (evals[i] === 'present') best = 'present';
          else if (best === 'unused') best = 'absent';
        }
      }
    }
    if (best === 'present') return 'bg-amber-500 text-white border border-amber-400';
    if (best === 'absent') return 'bg-slate-800 text-slate-500 border border-slate-700';
    return 'bg-[#0F2547] text-white border border-[#1E3A5F]';
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 w-full h-full relative">
      {wordErr && <div className="absolute top-0 bg-red-500 text-white font-bold px-4 py-2 rounded-xl text-xs z-50 shadow-xl animate-bounce">{wordErr}</div>}
      <div className="space-y-1.5">{rows}</div>
      <div className="w-full max-w-[360px] space-y-1.5 mt-4">
        {[['Q','W','E','R','T','Y','U','I','O','P'], ['A','S','D','F','G','H','J','K','L'], ['ENTER','Z','X','C','V','B','N','M','DEL']].map((row, i) => (
          <div key={i} className="flex justify-center gap-1">
            {row.map((k) => (
              <button key={k} type="button" onClick={() => onKey(k)} className={`h-11 sm:h-12 rounded font-bold text-xs flex items-center justify-center transition-colors active:scale-95 ${k.length > 1 ? 'px-2' : 'flex-1'} ${keyColor(k)}`}>{k}</button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// 6. Snake (Daily Seed Map + Golden Apple + Swipe)
export function SnakeGame({ dateSeed, isPlaying, isPaused, onEnd }) {
  const ROWS = 15;
  const COLS = 15;

  const walls = useMemo(() => {
    const rng = new PRNG(dateSeed + '_snake_walls_v1');
    const count = rng.nextInt(5, 6);
    const list = [];
    let guard = 0;
    while (list.length < count && guard < 200) {
      guard++;
      const r = rng.nextInt(1, ROWS - 2);
      const c = rng.nextInt(1, COLS - 2);
      if (r === 7) continue;
      if (Math.abs(r - 7) <= 2 && Math.abs(c - 7) <= 2) continue;
      if (list.some((w) => Math.abs(w.r - r) + Math.abs(w.c - c) < 2)) continue;
      list.push({ r, c });
    }
    return list;
  }, [dateSeed]);

  const spawnSeededFood = useCallback((currSnake, step, extraExclude = null) => {
    const empty = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const blocked =
          walls.some((w) => w.r === r && w.c === c) ||
          currSnake.some((s) => s.r === r && s.c === c) ||
          (extraExclude && extraExclude.r === r && extraExclude.c === c);
        if (!blocked) empty.push({ r, c });
      }
    }
    if (empty.length === 0) return null;
    const rng = new PRNG(`${dateSeed}_snake_food_${step}`);
    return empty[rng.nextInt(0, empty.length - 1)];
  }, [dateSeed, walls]);

  const [snake, setSnake] = useStickyState([{ r: 7, c: 7 }], `bma_snake_s_${dateSeed}`);
  const [foodStep, setFoodStep] = useStickyState(0, `bma_snake_step_${dateSeed}`);
  const [food, setFood] = useStickyState(null, `bma_snake_f_${dateSeed}`);
  const [goldFood, setGoldFood] = useStickyState(null, `bma_snake_gf_${dateSeed}`);
  const [dir, setDir] = useStickyState({ r: 0, c: 1 }, `bma_snake_d_${dateSeed}`);
  const [nextDir, setNextDir] = useStickyState({ r: 0, c: 1 }, `bma_snake_nd_${dateSeed}`);
  const [isGameOver, setIsGameOver] = useStickyState(false, `bma_snake_go_${dateSeed}`);
  const [score, setScore] = useStickyState(0, `bma_snake_sc_${dateSeed}`);
  const [bonusToast, setBonusToast] = useState(false);

  const touchStartRef = useRef(null);

  useEffect(() => {
    if (isGameOver) return;
    const isInvalid = !food || typeof food.r !== 'number' || typeof food.c !== 'number' || walls.some((w) => w.r === food.r && w.c === food.c);
    if (isInvalid) {
      const next = spawnSeededFood(snake, foodStep);
      if (next) setFood(next);
    }
  }, [food, walls, isGameOver]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const key = e.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) e.preventDefault();
      if (['ArrowUp', 'w', 'W'].includes(key) && dir.r !== 1) setNextDir({ r: -1, c: 0 });
      if (['ArrowDown', 's', 'S'].includes(key) && dir.r !== -1) setNextDir({ r: 1, c: 0 });
      if (['ArrowLeft', 'a', 'A'].includes(key) && dir.c !== 1) setNextDir({ r: 0, c: -1 });
      if (['ArrowRight', 'd', 'D'].includes(key) && dir.c !== -1) setNextDir({ r: 0, c: 1 });
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dir]);

  useEffect(() => {
    if (isGameOver || !isPlaying || isPaused) return;

    const interval = setInterval(() => {
      const head = snake[0];
      const d = nextDir;
      const newR = (head.r + d.r + ROWS) % ROWS;
      const newC = (head.c + d.c + COLS) % COLS;
      const newHead = { r: newR, c: newC };

      const hitSelf = snake.some((s, idx) => idx !== snake.length - 1 && s.r === newR && s.c === newC);
      const hitWall = walls.some((w) => w.r === newR && w.c === newC);

      if (hitSelf || hitWall) {
        playGameSfx('bomb');
        setIsGameOver(true);
        onEnd('ended', { score });
        return;
      }

      const newSnake = [newHead, ...snake];
      let nextScore = score;
      let grew = false;
      let nextGold = goldFood ? { ...goldFood, ticksLeft: goldFood.ticksLeft - 1 } : null;

      if (goldFood && newR === goldFood.r && newC === goldFood.c) {
        nextScore += 3;
        grew = true;
        nextGold = null;
        playGameSfx('bonus');
        setBonusToast(true);
        setTimeout(() => setBonusToast(false), 1100);
      }

      if (food && newR === food.r && newC === food.c) {
        nextScore += 1;
        grew = true;
        playGameSfx('merge');
        const nextStep = foodStep + 1;
        setFoodStep(nextStep);
        const spawned = spawnSeededFood(newSnake, nextStep, nextGold);
        if (!spawned) {
          setScore(nextScore);
          setIsGameOver(true);
          playGameSfx('win');
          onEnd('ended', { score: nextScore });
          return;
        }
        setFood(spawned);
        if (nextStep % 4 === 0 && !nextGold) {
          const gSpot = spawnSeededFood(newSnake, nextStep + 1000, spawned);
          if (gSpot) nextGold = { ...gSpot, ticksLeft: 32 };
        }
      }

      if (!grew) newSnake.pop();
      if (nextGold && nextGold.ticksLeft <= 0) nextGold = null;

      if (nextScore !== score) setScore(nextScore);
      setGoldFood(nextGold);
      setSnake(newSnake);
      setDir(d);
    }, 150);

    return () => clearInterval(interval);
  }, [snake, nextDir, food, goldFood, foodStep, walls, isGameOver, score, isPlaying, isPaused, onEnd, spawnSeededFood]);

  const onTouchStart = (e) => {
    if (!e.touches?.[0]) return;
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchEnd = (e) => {
    if (!touchStartRef.current || !e.changedTouches?.[0]) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && dir.c !== -1) setNextDir({ r: 0, c: 1 });
      else if (dx < 0 && dir.c !== 1) setNextDir({ r: 0, c: -1 });
    } else {
      if (dy > 0 && dir.r !== -1) setNextDir({ r: 1, c: 0 });
      else if (dy < 0 && dir.r !== 1) setNextDir({ r: -1, c: 0 });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-3 w-full h-full select-none touch-none relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <div className="font-bold text-emerald-400 text-base bg-[#0F2547] px-5 py-1.5 rounded-full border border-[#1E3A5F]">คะแนน: {score} 🍎</div>
        {goldFood && (
          <div className="font-mono font-bold text-xs text-amber-300 bg-amber-950/60 px-3 py-1.5 rounded-full border border-amber-400/60 animate-pulse">
            🌟 +3 แต้ม ({Math.ceil(goldFood.ticksLeft * 0.15)}s)
          </div>
        )}
      </div>

      {bonusToast && (
        <div className="absolute top-12 z-30 px-3 py-1 rounded-full bg-amber-400 text-[#050811] text-xs font-bold shadow-lg animate-bounce">
          🌟 โบนัส +3 แต้ม!
        </div>
      )}

      <div className="bg-slate-800 border-4 border-[#1E3A5F] rounded-lg p-1 relative w-full max-w-[320px] aspect-square mx-auto">
        {Array.from({ length: ROWS }).map((_, r) => (
          <div key={r} className="flex" style={{ height: `${100 / ROWS}%` }}>
            {Array.from({ length: COLS }).map((_, c) => {
              const isSnake = snake.some((s) => s.r === r && s.c === c);
              const isHead = snake[0].r === r && snake[0].c === c;
              const isFood = food && food.r === r && food.c === c;
              const isGold = goldFood && goldFood.r === r && goldFood.c === c;
              const isWall = walls.some((w) => w.r === r && w.c === c);
              return (
                <div
                  key={c}
                  className="flex-1 border-[0.5px] border-slate-700/30 flex items-center justify-center"
                  style={{
                    backgroundColor: isWall ? '#475569' : isHead ? '#34D399' : isSnake ? '#10B981' : 'transparent',
                    borderRadius: isWall ? '20%' : isHead ? '25%' : isSnake ? '12%' : '0',
                    boxShadow: isWall ? 'inset 0 0 0 1px rgba(255,255,255,0.2)' : 'none'
                  }}
                >
                  {isFood && <div className="w-full h-full bg-red-500 rounded-full scale-[0.62] animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.85)]" />}
                  {isGold && <div className="w-full h-full bg-amber-300 rounded-full scale-[0.78] animate-pulse shadow-[0_0_12px_rgba(251,191,36,1)]" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 w-48 mt-2">
        <div></div>
        <button type="button" onClick={(e) => { e.preventDefault(); if (dir.r !== 1) setNextDir({ r: -1, c: 0 }); }} className="bg-[#0F2547] border border-[#1E3A5F] active:bg-white active:text-[#050811] rounded-lg p-3 text-xl">⬆️</button>
        <div></div>
        <button type="button" onClick={(e) => { e.preventDefault(); if (dir.c !== 1) setNextDir({ r: 0, c: -1 }); }} className="bg-[#0F2547] border border-[#1E3A5F] active:bg-white active:text-[#050811] rounded-lg p-3 text-xl">⬅️</button>
        <button type="button" onClick={(e) => { e.preventDefault(); if (dir.r !== -1) setNextDir({ r: 1, c: 0 }); }} className="bg-[#0F2547] border border-[#1E3A5F] active:bg-white active:text-[#050811] rounded-lg p-3 text-xl">⬇️</button>
        <button type="button" onClick={(e) => { e.preventDefault(); if (dir.c !== -1) setNextDir({ r: 0, c: 1 }); }} className="bg-[#0F2547] border border-[#1E3A5F] active:bg-white active:text-[#050811] rounded-lg p-3 text-xl">➡️</button>
      </div>
      <div className="text-[10px] text-slate-400 text-center leading-relaxed">
        💡 ปัดนิ้วบนกระดาน, ใช้ปุ่มลูกศร หรือ W A S D • ทะลุขอบได้แต่ห้ามชนกำแพงสีเทาประจำวัน
      </div>
    </div>
  );
}

// 7. Game 2048 (100 Moves + Pop Animation + Swipe)
export function Game2048({ dateSeed, onEnd }) {
  const [board, setBoard] = useStickyState(() => Array(4).fill().map(() => Array(4).fill(0)), `bma_2048_b_${dateSeed}`);
  const [score, setScore] = useStickyState(0, `bma_2048_s_${dateSeed}`);
  const [moves, setMoves] = useStickyState(100, `bma_2048_m_${dateSeed}`);
  const [maxTile, setMaxTile] = useStickyState(0, `bma_2048_max_${dateSeed}`);
  const [isFirst, setIsFirst] = useStickyState(true, `bma_2048_f_${dateSeed}`);
  const [rngState, setRngState] = useStickyState(0, `bma_2048_r_${dateSeed}`);
  const [poppedSet, setPoppedSet] = useState([]);
  const [moveTick, setMoveTick] = useState(0);

  const touchStartRef = useRef(null);
  const rng = useRef(new PRNG(dateSeed + '_2048'));

  useEffect(() => {
    for (let i = 0; i < rngState; i++) rng.current.next();
  }, []);

  const addRandomTile = (b) => {
    const empty = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (b[r][c] === 0) empty.push({ r, c });
    if (empty.length === 0) return { board: b, spot: null };

    const spot = empty[rng.current.nextInt(0, empty.length - 1)];
    const val = rng.current.nextFloat() < 0.9 ? 2 : 4;
    setRngState((p) => p + 2);
    b[spot.r][spot.c] = val;
    return { board: b, spot };
  };

  useEffect(() => {
    if (isFirst) {
      let b = Array(4).fill().map(() => Array(4).fill(0));
      b = addRandomTile(b).board;
      b = addRandomTile(b).board;
      setBoard(b);
      setIsFirst(false);
      let mT = 0;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (b[r][c] > mT) mT = b[r][c];
      setMaxTile(mT);
    }
  }, [isFirst]);

  const handleMove = (dir) => {
    if (moves <= 0) return;
    let moved = false;
    let gainedScore = 0;

    const rotateLeft = (matrix) => {
      const result = [];
      for (let c = 3; c >= 0; c--) {
        const newRow = [];
        for (let r = 0; r < 4; r++) newRow.push(matrix[r][c]);
        result.push(newRow);
      }
      return result;
    };

    const rotateRight = (matrix) => {
      const result = [];
      for (let c = 0; c < 4; c++) {
        const newRow = [];
        for (let r = 3; r >= 0; r--) newRow.push(matrix[r][c]);
        result.push(newRow);
      }
      return result;
    };

    let workBoard = board.map((row) => row.map((v) => ({ v, m: false })));
    if (dir === 'Right') workBoard = rotateRight(rotateRight(workBoard));
    else if (dir === 'Up') workBoard = rotateLeft(workBoard);
    else if (dir === 'Down') workBoard = rotateRight(workBoard);

    for (let r = 0; r < 4; r++) {
      const row = workBoard[r].filter((cell) => cell.v !== 0);
      for (let i = 0; i < row.length - 1; i++) {
        if (row[i].v !== 0 && row[i].v === row[i + 1].v) {
          row[i] = { v: row[i].v * 2, m: true };
          gainedScore += row[i].v;
          row[i + 1] = { v: 0, m: false };
          moved = true;
        }
      }
      const newRow = row.filter((cell) => cell.v !== 0);
      while (newRow.length < 4) newRow.push({ v: 0, m: false });
      for (let c = 0; c < 4; c++) {
        if (workBoard[r][c].v !== newRow[c].v) moved = true;
        workBoard[r][c] = newRow[c];
      }
    }

    if (dir === 'Right') workBoard = rotateRight(rotateRight(workBoard));
    else if (dir === 'Up') workBoard = rotateRight(workBoard);
    else if (dir === 'Down') workBoard = rotateLeft(workBoard);

    if (moved) {
      const popped = [];
      const numBoard = workBoard.map((row, r) =>
        row.map((cell, c) => {
          if (cell.m) popped.push(r * 4 + c);
          return cell.v;
        })
      );

      const { board: finalB, spot } = addRandomTile(numBoard);
      if (spot) popped.push(spot.r * 4 + spot.c);

      setBoard(finalB);
      setPoppedSet(popped);
      setMoveTick((t) => t + 1);
      setScore((p) => p + gainedScore);
      setMoves((m) => m - 1);

      let maxT = maxTile;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (finalB[r][c] > maxT) maxT = finalB[r][c];
      setMaxTile(maxT);

      let canMove = false;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (finalB[r][c] === 0) canMove = true;
          if (r < 3 && finalB[r][c] === finalB[r + 1][c]) canMove = true;
          if (c < 3 && finalB[r][c] === finalB[r][c + 1]) canMove = true;
        }
      }

      if (moves - 1 <= 0 || !canMove) {
        playGameSfx('win');
        onEnd('ended', { score: score + gainedScore, maxTile: maxT });
      } else {
        playGameSfx(gainedScore > 0 ? 'merge' : 'tap');
      }
    }
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      if (['ArrowUp', 'w', 'W'].includes(e.key)) handleMove('Up');
      if (['ArrowDown', 's', 'S'].includes(e.key)) handleMove('Down');
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) handleMove('Left');
      if (['ArrowRight', 'd', 'D'].includes(e.key)) handleMove('Right');
    };
    window.addEventListener('keydown', onKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [board, moves, score, maxTile]);

  const onTouchStart = (e) => {
    if (!e.touches?.[0]) return;
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchEnd = (e) => {
    if (!touchStartRef.current || !e.changedTouches?.[0]) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 25) handleMove(dx > 0 ? 'Right' : 'Left');
    else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 25) handleMove(dy > 0 ? 'Down' : 'Up');
  };

  const colors = {
    0: 'bg-[#0B1325]', 2: 'bg-slate-200 text-[#050811]', 4: 'bg-amber-100 text-[#050811]',
    8: 'bg-amber-400 text-amber-950', 16: 'bg-orange-400 text-white', 32: 'bg-orange-600 text-white',
    64: 'bg-red-500 text-white', 128: 'bg-yellow-300 text-amber-900 drop-shadow-[0_0_8px_rgba(253,224,71,0.6)]',
    256: 'bg-yellow-400 text-amber-900 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]',
    512: 'bg-yellow-500 text-amber-950 drop-shadow-[0_0_16px_rgba(234,179,8,1)]',
    1024: 'bg-emerald-400 text-emerald-950', 2048: 'bg-sky-400 text-sky-950'
  };

  const isLowMoves = moves <= 10 && moves > 0;

  return (
    <div className="flex flex-col items-center justify-center space-y-4 w-full h-full select-none touch-none" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="flex gap-3 w-full max-w-[300px] justify-between text-center font-bold">
        <div className="bg-[#0F2547] border border-[#1E3A5F] rounded-xl px-3 py-2 flex-1">
          <div className="text-[10px] text-sky-300">คะแนน</div>
          <div className="text-xl font-mono">{score}</div>
        </div>
        <div className="bg-[#0F2547] border border-[#1E3A5F] rounded-xl px-3 py-2 flex-1">
          <div className="text-[10px] text-emerald-300">สูงสุด</div>
          <div className="text-xl font-mono text-emerald-400">{maxTile}</div>
        </div>
        <div className={`rounded-xl px-3 py-2 flex-1 border transition-colors ${isLowMoves ? 'bg-red-950/70 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.45)] animate-pulse' : 'bg-[#0F2547] border-[#1E3A5F]'}`}>
          <div className={`text-[10px] ${isLowMoves ? 'text-red-300' : 'text-amber-300'}`}>ขยับได้อีก</div>
          <div className={`text-xl font-mono ${isLowMoves ? 'text-red-400' : 'text-amber-400'}`}>{moves}</div>
        </div>
      </div>

      {isLowMoves && (
        <div className="text-[11px] font-bold text-red-300 bg-red-950/50 border border-red-500/40 px-3 py-1 rounded-full animate-pulse">
          ⚠️ โค้งสุดท้าย! เหลืออีกเพียง {moves} ครั้ง
        </div>
      )}

      <div className="bg-[#1E3A5F] p-2 rounded-xl border-[4px] border-[#0F2547] shadow-xl w-full max-w-[300px] aspect-square grid grid-cols-4 grid-rows-4 gap-2">
        {board.flat().map((val, i) => {
          const isPop = poppedSet.includes(i) && val !== 0;
          return (
            <div
              key={`${i}-${isPop ? moveTick : 0}`}
              className={`flex items-center justify-center rounded-lg font-bold transition-colors duration-150 ${val >= 1024 ? 'text-lg' : val >= 128 ? 'text-xl' : 'text-2xl'} ${colors[val] || 'bg-fuchsia-500 text-white drop-shadow-[0_0_20px_rgba(217,70,239,1)]'} ${isPop ? 'animate-tile-pop' : ''}`}
            >
              {val !== 0 ? val : ''}
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-slate-400 text-center">
        💡 ปัดหน้าจอ หรือใช้ลูกศร / W A S D เพื่อเลื่อน<br />เมื่อขยับครบ 100 ครั้ง เกมจะสิ้นสุดลงเพื่อวัดผลประจำวัน
      </div>
    </div>
  );
}

// 8. Daily 24 (Tap-to-Combine Cards + Auto Solver)
export function Game24({ dateSeed, onEnd }) {
  const [nums, setNums] = useStickyState([], `bma_24_n_${dateSeed}`);
  const [cards, setCards] = useState([]);
  const [history, setHistory] = useState([]);
  const [selIdx, setSelIdx] = useState(null);
  const [selOp, setSelOp] = useState(null);
  const [msg, setMsg] = useState('');
  const [revealedSol, setRevealedSol] = useState(null);

  const solve24Expr = (arr) => {
    const items = arr.map((v) => ({ val: v, expr: String(v) }));
    const dfs = (list) => {
      if (list.length === 1) return Math.abs(list[0].val - 24) < 1e-4 ? list[0].expr : null;
      for (let i = 0; i < list.length; i++) {
        for (let j = 0; j < list.length; j++) {
          if (i === j) continue;
          const rem = list.filter((_, idx) => idx !== i && idx !== j);
          const a = list[i];
          const b = list[j];
          const candidates = [
            { val: a.val + b.val, expr: `(${a.expr} + ${b.expr})` },
            { val: a.val - b.val, expr: `(${a.expr} - ${b.expr})` },
            { val: a.val * b.val, expr: `(${a.expr} × ${b.expr})` }
          ];
          if (Math.abs(b.val) > 1e-9) candidates.push({ val: a.val / b.val, expr: `(${a.expr} ÷ ${b.expr})` });
          for (const c of candidates) {
            const found = dfs([...rem, c]);
            if (found) return found;
          }
        }
      }
      return null;
    };
    const raw = dfs(items);
    return raw ? raw.replace(/^\((.*)\)$/, '$1') : null;
  };

  useEffect(() => {
    if (nums.length > 0) return;
    const rng = new PRNG(dateSeed + '_24game');
    let generated = [];
    while (true) {
      generated = [rng.nextInt(1, 9), rng.nextInt(1, 9), rng.nextInt(1, 9), rng.nextInt(1, 9)];
      if (solve24Expr(generated)) break;
    }
    setNums(generated);
  }, [dateSeed]);

  useEffect(() => {
    if (nums.length > 0 && cards.length === 0) {
      setCards(nums.map((n, i) => ({ id: `init-${i}`, val: n, expr: String(n) })));
    }
  }, [nums]);

  const fmtVal = (v) => (Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : String(Number(v.toFixed(2))));

  const handleReset = () => {
    playGameSfx('undo');
    setCards(nums.map((n, i) => ({ id: `init-${i}`, val: n, expr: String(n) })));
    setHistory([]);
    setSelIdx(null);
    setSelOp(null);
    setMsg('');
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    playGameSfx('undo');
    setCards(history[history.length - 1]);
    setHistory(history.slice(0, -1));
    setSelIdx(null);
    setSelOp(null);
    setMsg('');
  };

  const handleCardTap = (idx) => {
    if (revealedSol) return;
    setMsg('');
    if (selIdx === null) { playGameSfx('tap'); setSelIdx(idx); return; }
    if (selIdx === idx) { playGameSfx('tap'); setSelIdx(null); setSelOp(null); return; }
    if (!selOp) { playGameSfx('tap'); setSelIdx(idx); return; }

    const a = cards[selIdx];
    const b = cards[idx];
    let resVal = 0;
    let sym = selOp;
    if (selOp === '+') resVal = a.val + b.val;
    else if (selOp === '-') resVal = a.val - b.val;
    else if (selOp === '*') { resVal = a.val * b.val; sym = '×'; }
    else if (selOp === '/') {
      if (Math.abs(b.val) < 1e-9) { playGameSfx('error'); setMsg('❌ ไม่สามารถหารด้วย 0 ได้'); return; }
      resVal = a.val / b.val;
      sym = '÷';
    }

    const newCard = { id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5), val: resVal, expr: `(${a.expr} ${sym} ${b.expr})`, merged: true };
    const nextCards = [];
    cards.forEach((c, i) => {
      if (i === selIdx) return;
      if (i === idx) nextCards.push(newCard);
      else nextCards.push({ ...c, merged: false });
    });

    setHistory((prev) => [...prev, cards]);
    setCards(nextCards);
    setSelIdx(null);
    setSelOp(null);

    if (nextCards.length === 1) {
      if (Math.abs(resVal - 24) < 1e-4) {
        playGameSfx('win');
        const cleanExpr = newCard.expr.replace(/^\((.*)\)$/, '$1');
        setTimeout(() => onEnd('won', { score: 24, answer: cleanExpr }), 350);
      } else {
        playGameSfx('error');
        setMsg(`ได้ผลลัพธ์ ${fmtVal(resVal)} (ยังไม่เท่ากับ 24) — กดย้อนกลับหรือเริ่มใหม่ได้`);
      }
    } else {
      playGameSfx('merge');
    }
  };

  const handleOpTap = (op) => {
    if (revealedSol) return;
    if (selIdx === null) { setMsg('แตะเลือกการ์ดตัวเลขใบแรกก่อน แล้วค่อยเลือกเครื่องหมาย'); return; }
    playGameSfx('tap');
    setSelOp(selOp === op ? null : op);
    setMsg('');
  };

  const handleGiveUp = () => {
    if (revealedSol) return;
    playGameSfx('lose');
    const sol = solve24Expr(nums) || '-';
    setRevealedSol(sol);
    setTimeout(() => onEnd('lost', { score: 0, answer: sol }), 2000);
  };

  if (!nums.length || !cards.length) return <div className="py-10 animate-pulse text-sky-400 font-mono text-center">Loading...</div>;

  const OPS = [{ id: '+', label: '+' }, { id: '-', label: '−' }, { id: '*', label: '×' }, { id: '/', label: '÷' }];

  return (
    <div className="flex flex-col items-center justify-center space-y-5 w-full h-full p-2 sm:p-4 select-none">
      <div className="text-center space-y-1">
        <div className="font-bold text-amber-300 text-sm bg-[#0F2547] px-5 py-1.5 rounded-full border border-[#1E3A5F] inline-block">
          รวมการ์ดทั้ง 4 ใบให้ได้ 24 พอดี
        </div>
        <div className="text-[11px] text-slate-400 h-4 font-mono">
          {selIdx !== null
            ? `${fmtVal(cards[selIdx].val)} ${selOp ? (selOp === '*' ? '×' : selOp === '/' ? '÷' : selOp) : '?'} ...`
            : 'แตะการ์ดใบแรก → แตะเครื่องหมาย → แตะการ์ดใบที่สอง'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-[270px]">
        {cards.map((card, i) => {
          const isSel = selIdx === i;
          const isTarget24 = cards.length === 1 && Math.abs(card.val - 24) < 1e-4;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleCardTap(i)}
              className={`h-20 sm:h-24 rounded-2xl border-2 flex flex-col items-center justify-center transition-all shadow-lg ${card.merged ? 'animate-tile-pop' : ''} ${isTarget24 ? 'col-span-2 bg-emerald-600/30 border-emerald-400 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.45)]' : isSel ? 'bg-sky-500/30 border-amber-300 text-white scale-105 shadow-[0_0_20px_rgba(251,191,36,0.35)]' : 'bg-[#0F2547] border-[#1E3A5F] hover:border-sky-400 text-white'}`}
            >
              <span className="text-2xl sm:text-3xl font-bold font-mono leading-none">{fmtVal(card.val)}</span>
              {card.expr !== String(card.val) && <span className="text-[10px] text-sky-300/80 font-mono mt-1 px-2 truncate max-w-full">{card.expr}</span>}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-4 gap-2.5 w-full max-w-[270px]">
        {OPS.map((op) => (
          <button
            key={op.id}
            type="button"
            onClick={() => handleOpTap(op.id)}
            className={`h-12 rounded-xl border-2 text-2xl font-bold transition-all active:scale-95 ${selOp === op.id ? 'bg-amber-400 text-[#050811] border-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-105' : 'bg-[#0B1325] text-sky-300 border-[#1E3A5F] hover:border-sky-400 hover:text-white'}`}
          >
            {op.label}
          </button>
        ))}
      </div>

      {msg && <div className="text-amber-300 text-xs text-center font-bold bg-amber-950/40 border border-amber-500/30 px-3 py-1.5 rounded-xl">{msg}</div>}

      {revealedSol && (
        <div className="w-full max-w-[290px] p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-400/60 text-center space-y-1 animate-fade-in">
          <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">เฉลยตัวอย่าง</div>
          <div className="text-lg font-mono font-bold text-white">{revealedSol} = 24</div>
        </div>
      )}

      <div className="flex gap-2 w-full max-w-[270px] pt-1">
        <button type="button" onClick={handleUndo} disabled={history.length === 0 || Boolean(revealedSol)} className="flex-1 btn-b py-2 text-xs disabled:opacity-40">↩️ ย้อนกลับ</button>
        <button type="button" onClick={handleReset} disabled={history.length === 0 || Boolean(revealedSol)} className="flex-1 btn-d py-2 text-xs disabled:opacity-40">🔄 เริ่มใหม่</button>
      </div>
      <button type="button" onClick={handleGiveUp} disabled={Boolean(revealedSol)} className="w-full max-w-[270px] btn-d py-2 text-xs text-red-300 hover:bg-red-950 border-red-900/50 disabled:opacity-40">
        🏳️ ยอมแพ้และดูเฉลย
      </button>
    </div>
  );
}

// 9. Resistor Code (Editable Bands + Solution Reveal)
export function ResistorGame({ dateSeed, onEnd }) {
  const [targetVal, setTargetVal] = useStickyState(null, `bma_res_t_${dateSeed}`);
  const [targetTol, setTargetTol] = useStickyState(null, `bma_res_tol_${dateSeed}`);
  const [colors, setColors] = useStickyState([null, null, null, null], `bma_res_c_${dateSeed}`);
  const [expected, setExpected] = useStickyState([], `bma_res_exp_${dateSeed}`);
  const [lives, setLives] = useStickyState(3, `bma_res_l_${dateSeed}`);
  const [activeBand, setActiveBand] = useState(0);
  const [isExploding, setIsExploding] = useState(false);
  const [errAnim, setErrAnim] = useState(false);

  const COLORS = ['Black', 'Brown', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet', 'Gray', 'White', 'Gold', 'Silver'];
  const COL_HEX = ['#000000', '#8B4513', '#FF0000', '#FFA500', '#FFFF00', '#008000', '#0000FF', '#EE82EE', '#808080', '#FFFFFF', '#FFD700', '#C0C0C0'];
  const BAND_LABELS = ['หลักที่ 1', 'หลักที่ 2', 'ตัวคูณ', 'คลาดเคลื่อน'];
  const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];

  useEffect(() => {
    if (targetVal) return;
    const rng = new PRNG(dateSeed + '_resistor');
    const base = E12[rng.nextInt(0, E12.length - 1)];
    const multIdx = rng.nextInt(0, 6);
    const val = base * Math.pow(10, multIdx);
    const tol = rng.nextInt(0, 1) === 0 ? 'Gold' : 'Silver';
    const b1 = Math.floor(base / 10);
    const b2 = base % 10;

    setTargetVal(val);
    setTargetTol(tol === 'Gold' ? '5%' : '10%');
    setExpected([COLORS[b1], COLORS[b2], COLORS[multIdx], tol]);
    setColors([null, null, null, null]);
    setLives(3);
  }, [dateSeed]);

  const bands = [0, 1, 2, 3].map((i) => (Array.isArray(colors) ? colors[i] || null : null));
  const allFilled = bands.every(Boolean);

  const formatVal = (v) => {
    if (v >= 1000000) return v / 1000000 + ' MΩ';
    if (v >= 1000) return v / 1000 + ' kΩ';
    return v + ' Ω';
  };

  const handlePick = (c) => {
    if (lives <= 0 || isExploding) return;
    playGameSfx('tap');
    const nextBands = [...bands];
    nextBands[activeBand] = c;
    setColors(nextBands);

    const nextEmpty = nextBands.findIndex((b, idx) => idx > activeBand && !b);
    if (nextEmpty !== -1) setActiveBand(nextEmpty);
    else {
      const anyEmpty = nextBands.findIndex((b) => !b);
      if (anyEmpty !== -1) setActiveBand(anyEmpty);
    }
  };

  const handleCheck = () => {
    if (!allFilled || lives <= 0 || isExploding) return;
    if (bands.join(',') === expected.join(',')) {
      playGameSfx('win');
      setTimeout(() => onEnd('won', { score: lives * 100, answer: expected.join(' - ') }), 550);
    } else if (lives > 1) {
      playGameSfx('error');
      setErrAnim(true);
      setTimeout(() => { setLives((l) => l - 1); setErrAnim(false); }, 650);
    } else {
      playGameSfx('bomb');
      setLives(0);
      setIsExploding(true);
      setTimeout(() => onEnd('lost', { score: 0, answer: expected.join(' - ') }), 2400);
    }
  };

  if (!targetVal) return <div className="py-10 animate-pulse text-sky-400 font-mono text-center">Loading...</div>;

  return (
    <div className="flex flex-col items-center justify-center space-y-4 w-full h-full p-2 sm:p-4 select-none">
      <div className="text-center bg-[#0F2547] px-5 py-3 rounded-xl border border-[#1E3A5F] w-full max-w-[340px]">
        <div className="text-xs text-slate-300">ค่าความต้านทานเป้าหมาย</div>
        <div className="text-2xl sm:text-3xl font-bold text-amber-300 tracking-wider font-mono">{formatVal(targetVal)} ± {targetTol}</div>
        <div className="mt-1.5 text-xs font-bold text-red-400">โอกาสทดสอบวงจร: {lives} / 3 ครั้ง</div>
      </div>

      <div className={`relative w-64 h-24 sm:w-80 sm:h-28 flex items-center justify-center my-1 ${errAnim ? 'animate-shake' : ''}`}>
        <div className="absolute w-full h-2 bg-slate-400 z-0"></div>
        <div className={`relative w-44 sm:w-52 h-16 sm:h-20 bg-[#f4a460] rounded-[30px] border-2 border-amber-800 z-10 flex items-center justify-between px-3.5 shadow-inner transition-all ${isExploding ? 'brightness-50 grayscale' : ''}`}>
          {[0, 1, 2].map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => { if (!isExploding) { playGameSfx('tap'); setActiveBand(idx); } }}
              title={`คลิกเพื่อแก้ไขแถบ: ${BAND_LABELS[idx]}`}
              className={`w-5 h-full cursor-pointer transition-all relative ${activeBand === idx && !isExploding ? 'ring-2 ring-white scale-y-110 z-20 shadow-[0_0_12px_rgba(255,255,255,0.9)]' : 'border-x border-dashed border-amber-950/40'}`}
              style={{ backgroundColor: bands[idx] ? COL_HEX[COLORS.indexOf(bands[idx])] : 'rgba(0,0,0,0.12)' }}
            />
          ))}
          <div className="w-1.5 h-full bg-transparent border-l border-amber-800/30 mx-1"></div>
          <button
            type="button"
            onClick={() => { if (!isExploding) { playGameSfx('tap'); setActiveBand(3); } }}
            title={`คลิกเพื่อแก้ไขแถบ: ${BAND_LABELS[3]}`}
            className={`w-5 h-full cursor-pointer transition-all relative ${activeBand === 3 && !isExploding ? 'ring-2 ring-white scale-y-110 z-20 shadow-[0_0_12px_rgba(255,255,255,0.9)]' : 'border-x border-dashed border-amber-950/40'}`}
            style={{ backgroundColor: bands[3] ? COL_HEX[COLORS.indexOf(bands[3])] : 'rgba(0,0,0,0.12)' }}
          />
          {isExploding && <div className="absolute inset-0 flex items-center justify-center text-5xl z-20 animate-ping">💥</div>}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 w-full max-w-[340px]">
        {BAND_LABELS.map((lbl, idx) => (
          <button
            key={lbl}
            type="button"
            onClick={() => { if (!isExploding) { playGameSfx('tap'); setActiveBand(idx); } }}
            className={`py-1.5 px-1 rounded-lg border text-[10px] font-bold transition-all flex flex-col items-center gap-0.5 ${activeBand === idx && !isExploding ? 'bg-sky-500/25 border-sky-400 text-white shadow' : 'bg-[#0B1325] border-[#1E3A5F] text-slate-400 hover:text-white'}`}
          >
            <span>{lbl}</span>
            <span className="text-[9px] font-mono text-amber-300">{bands[idx] || 'ว่าง'}</span>
          </button>
        ))}
      </div>

      {isExploding && expected.length === 4 && (
        <div className="w-full max-w-[340px] p-3 rounded-xl bg-red-950/60 border border-red-500/60 space-y-2 animate-fade-in">
          <div className="text-[11px] font-bold text-amber-300 text-center">💥 วงจรระเบิด! แถบสีที่ถูกต้องคือ:</div>
          <div className="grid grid-cols-4 gap-1.5">
            {expected.map((cName, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1 bg-[#050811] p-1.5 rounded-lg border border-white/10">
                <span className="w-full h-3.5 rounded" style={{ backgroundColor: COL_HEX[COLORS.indexOf(cName)] }}></span>
                <span className="text-[9px] font-bold text-white">{cName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 w-full max-w-[340px]">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => handlePick(c)}
            disabled={isExploding}
            style={{ backgroundColor: COL_HEX[COLORS.indexOf(c)], color: ['Black', 'Blue', 'Brown', 'Green', 'Red'].includes(c) ? '#fff' : '#000' }}
            className="h-9 rounded-lg shadow-md border border-white/25 text-[10px] font-bold active:scale-95 transition-transform disabled:opacity-40"
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex gap-2 w-full max-w-[340px]">
        <button type="button" onClick={() => { playGameSfx('undo'); setColors([null, null, null, null]); setActiveBand(0); }} disabled={isExploding} className="btn-d py-2 px-3 text-xs font-bold text-red-300 border-red-900/50 hover:bg-red-950 disabled:opacity-40">ล้างสี</button>
        <button
          type="button"
          onClick={handleCheck}
          disabled={!allFilled || isExploding}
          className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all shadow-lg ${allFilled && !isExploding ? 'bg-emerald-500 hover:bg-emerald-400 text-[#050811] shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-[#0F2547] text-slate-500 border border-[#1E3A5F] cursor-not-allowed'}`}
        >
          ⚡ ทดสอบวงจร (ตรวจคำตอบ)
        </button>
      </div>
    </div>
  );
}