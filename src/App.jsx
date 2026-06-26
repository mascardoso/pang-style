import React, { useState, useEffect } from 'react';
import GameCanvas from './GameCanvas';
import './App.css';
import { audio } from './audio';

// Character profiles data
const idolProfiles = {
  rhea: {
    name: 'Rhea',
    subtitle: 'STAGE POP PRINCESS',
    desc: 'Vibrant pop idol with sparkling vocal energy and cute pink twin tails.',
    stats: { Speed: '8/10', Reaction: '9/10', Gear: 'Standard' },
    equip: ['Vocal Mic', 'Pink Fan', 'Lightstick'],
  },
  zara: {
    name: 'Zara',
    subtitle: 'BREAKDANCE STAR',
    desc: 'Fast reflexes, street-dance apparel, and high energy beats.',
    stats: { Speed: '9/10', Reaction: '7/10', Gear: 'Speedy' },
    equip: ['Snapback', 'Headphones', 'Retro Cassette'],
  },
  mina: {
    name: 'Mina',
    subtitle: 'CYBER RAPPER',
    desc: 'Futuristic neon-glasses tech rapper. Fast flow and precise style.',
    stats: { Speed: '7/10', Reaction: '8/10', Gear: 'Cyber Tech' },
    equip: ['Neon Visor', 'Cyber Boots', 'Digital Keytar'],
  },
};

export default function App() {
  const [gameState, setGameState] = useState('start'); // 'start', 'select', 'playing', 'clear', 'gameover'
  const [selectedChar, setSelectedChar] = useState('rhea');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeWeapon, setActiveWeapon] = useState('GRAV-BOUNCER');
  
  // Power-up active states for bottom indicator bar
  const [doubleHookActive, setDoubleHookActive] = useState(false);
  const [stickyHookActive, setStickyHookActive] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  const [timeFreezeActive, setTimeFreezeActive] = useState(false);

  const [musicMuted, setMusicMuted] = useState(() => {
    return localStorage.getItem('musicMuted') === 'true';
  });

  const handleMusicToggle = () => {
    setMusicMuted((prev) => {
      const next = !prev;
      localStorage.setItem('musicMuted', String(next));
      return next;
    });
  };

  useEffect(() => {
    audio.setMuted(musicMuted);

    const resumeOnInteraction = () => {
      if (gameState !== 'gameover' && !musicMuted) {
        audio.startBGM();
      }
      // Remove listeners once audio is started
      window.removeEventListener('click', resumeOnInteraction);
      window.removeEventListener('keydown', resumeOnInteraction);
    };

    if (gameState !== 'gameover' && !musicMuted) {
      // If we already have a running context, start immediately, otherwise wait for interaction
      if (audio.ctx && audio.ctx.state === 'running') {
        audio.startBGM();
      } else {
        window.addEventListener('click', resumeOnInteraction);
        window.addEventListener('keydown', resumeOnInteraction);
      }
    } else {
      audio.stopBGM();
    }

    return () => {
      audio.stopBGM();
      window.removeEventListener('click', resumeOnInteraction);
      window.removeEventListener('keydown', resumeOnInteraction);
    };
  }, [gameState, musicMuted]);

  // Timer effect for playing state
  useEffect(() => {
    let interval;
    if (gameState === 'playing') {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'select') {
      setElapsedTime(0);
      setDoubleHookActive(false);
      setStickyHookActive(false);
      setShieldActive(false);
      setTimeFreezeActive(false);
    }
  }, [gameState]);

  // Formats time in HH:MM:SS format
  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const handleScoreChange = (newScore) => {
    setScore(newScore);
    if (newScore > highScore) {
      setHighScore(newScore);
    }
  };

  const handleLivesChange = (newLives) => {
    setLives(newLives);
  };

  const handleLevelClear = () => {
    setGameState('clear');
  };

  const handleGameOver = () => {
    setGameState('gameover');
  };

  const startNewGame = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    setElapsedTime(0);
    setDoubleHookActive(false);
    setStickyHookActive(false);
    setShieldActive(false);
    setTimeFreezeActive(false);
    setGameState('playing');
  };

  const proceedToNextLevel = () => {
    setLevel((prev) => prev + 1);
    setGameState('playing');
  };

  // Sync weapon name in bottom bar
  const handleWeaponChange = (weaponType) => {
    if (weaponType === 'double') {
      setActiveWeapon('DOUBLE-HOOK');
      setDoubleHookActive(true);
      setStickyHookActive(false);
    } else if (weaponType === 'sticky') {
      setActiveWeapon('STICKY-ANCHOR');
      setStickyHookActive(true);
      setDoubleHookActive(false);
    } else {
      setActiveWeapon('GRAV-BOUNCER');
      setDoubleHookActive(false);
      setStickyHookActive(false);
    }
  };

  const activeIdol = idolProfiles[selectedChar];

  return (
    <div className="dashboard-container">
      
      {/* COLUMN LEFT: Controls & Active Idol Spotlight */}
      <div className="column-left glass-card">
        <div className="card-header">CONTROLS</div>
        <div className="controls-list">
          <div className="control-item">
            <span className="control-label">WALK:</span>
            <div className="key-container">
              <kbd className="key-prompt">A</kbd>
              <kbd className="key-prompt">D</kbd>
              <span className="or-text">/</span>
              <kbd className="key-prompt">←</kbd>
              <kbd className="key-prompt">→</kbd>
            </div>
          </div>
          <div className="control-item">
            <span className="control-label">CLIMB:</span>
            <div className="key-container">
              <kbd className="key-prompt">W</kbd>
              <kbd className="key-prompt">S</kbd>
              <span className="or-text">/</span>
              <kbd className="key-prompt">↑</kbd>
              <kbd className="key-prompt">↓</kbd>
            </div>
          </div>
          <div className="control-item">
            <span className="control-label">SHOOT:</span>
            <div className="key-container">
              <kbd className="key-prompt-wide">SPACEBAR</kbd>
            </div>
          </div>
        </div>

        <div className="divider-line" />

        <div className="card-header">ACTIVE IDOL</div>
        <div className="compact-idol-box">
          <div className={`compact-idol-badge ${selectedChar}`}>
            {selectedChar[0].toUpperCase()}
          </div>
          <div className="compact-idol-info">
            <div className="compact-idol-name">{activeIdol.name}</div>
            <div className="compact-idol-role">{activeIdol.subtitle}</div>
          </div>
        </div>
        <div className="idol-desc-box">{activeIdol.desc}</div>

        <div className="divider-line" />
        <div className="card-header">SOUNDTRACK</div>
        <button 
          className={`music-toggle-btn ${musicMuted ? 'muted' : ''}`}
          onClick={handleMusicToggle}
          style={{ width: '100%', outline: 'none' }}
        >
          {musicMuted ? '🎵 MUSIC: MUTED' : '🎵 MUSIC: PLAYING'}
        </button>
      </div>

      {/* COLUMN CENTER: Main Game Stage */}
      <div className="column-center">
        <div className="game-title-header">
          <h1 className="logo-main">K-STAGE ODYSSEY</h1>
          <div className="logo-sub">K-STAGE WORLD TOUR STAGE</div>
        </div>

        <GameCanvas
          character={selectedChar}
          isPlaying={gameState === 'playing'}
          level={level}
          lives={lives}
          score={score}
          onScoreChange={handleScoreChange}
          onLivesChange={handleLivesChange}
          onLevelClear={handleLevelClear}
          onGameOver={handleGameOver}
          onWeaponChange={handleWeaponChange}
          onShieldChange={setShieldActive}
          onTimeFreezeChange={setTimeFreezeActive}
        />

        {/* Start Overlay */}
        {gameState === 'start' && (
          <div className="screen-overlay">
            <h1 className="menu-title">K-STAGE ODYSSEY</h1>
            <h2 className="menu-subtitle">K-STAGE STAGE POP ODYSSEY</h2>
            <button className="primary-btn" onClick={() => setGameState('select')}>
              CHOOSE IDOL
            </button>
          </div>
        )}

        {/* Character Select Overlay */}
        {gameState === 'select' && (
          <div className="screen-overlay">
            <h1 className="menu-title" style={{ fontSize: '18px', marginBottom: '25px' }}>
              SELECT YOUR IDOL CHARACTER
            </h1>
            
            <div className="selector-grid">
              {Object.entries(idolProfiles).map(([key, value]) => (
                <div
                  key={key}
                  className={`char-select-card ${selectedChar === key ? 'selected' : ''}`}
                  onClick={() => setSelectedChar(key)}
                >
                  <div className={`char-select-avatar-badge ${key}`}>
                    {key[0].toUpperCase()}
                  </div>
                  <div className="char-select-name">{value.name}</div>
                  <div className="char-select-role">{value.subtitle}</div>
                </div>
              ))}
            </div>

            <button className="primary-btn" onClick={startNewGame}>
              LOCK IN & PLAY
            </button>
          </div>
        )}

        {/* Level Clear Overlay */}
        {gameState === 'clear' && (
          <div className="screen-overlay">
            <h1 className="menu-title" style={{ color: 'var(--neon-green)', textShadow: '0 0 15px rgba(173, 255, 47, 0.7)' }}>
              STAGE CLEAR!
            </h1>
            <h2 className="menu-subtitle">SEOUL METRO TOUR COMPLETED</h2>
            <div style={{ fontSize: '18px', marginBottom: '25px', fontWeight: '800' }}>
              TOUR SCORE: <span style={{ color: 'var(--neon-pink)' }}>{score}</span>
            </div>
            <button className="primary-btn" onClick={proceedToNextLevel}>
              NEXT STAGE
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div className="screen-overlay">
            <h1 className="menu-title" style={{ color: '#ef4444', textShadow: '0 0 15px rgba(239, 68, 68, 0.7)' }}>
              GAME OVER
            </h1>
            <h2 className="menu-subtitle">TOUR ABORTED</h2>
            <div style={{ fontSize: '18px', marginBottom: '25px', fontWeight: '800' }}>
              FINAL SCORE: <span style={{ color: 'var(--neon-cyan)' }}>{score}</span>
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <button className="primary-btn" onClick={() => setGameState('select')}>
                CHANGE IDOL
              </button>
              <button className="primary-btn" onClick={startNewGame}>
                RETRY
              </button>
            </div>
          </div>
        )}
      </div>

      {/* COLUMN RIGHT: Scoreboard, Stats, Boosts Guide */}
      <div className="column-right glass-card">
        <div className="card-header">SCOREBOARD</div>
        <div className="scoreboard-stats">
          <div className="stat-row">
            <span className="stat-label">SCORE:</span>
            <span className="stat-val neon-pink">{score.toString().padStart(6, '0')}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">HI-SCORE:</span>
            <span className="stat-val neon-purple">{highScore.toString().padStart(6, '0')}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">STAGE:</span>
            <span className="stat-val small-text">
              {level === 1 && 'COEX WAVE'}
              {level === 2 && 'MYEONG NEON'}
              {level === 3 && 'NAMSAN TOWER'}
              {level > 3 && `SEOUL ${level}`}
            </span>
          </div>
          <div className="stat-row">
            <span className="stat-label">TIME:</span>
            <span className="stat-val neon-green">{formatTime(elapsedTime)}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">LIVES:</span>
            <div className="lives-container">
              {[0, 1, 2, 3, 4].slice(0, Math.max(lives, 3)).map((idx) => (
                <span key={idx} className="heart-icon">
                  {idx >= lives ? '🖤' : '💖'}
                </span>
              ))}
            </div>
          </div>
          <div className="stat-row">
            <span className="stat-label">WEAPON:</span>
            <span className="stat-val neon-cyan" style={{ fontSize: '8.5px', textTransform: 'uppercase' }}>{activeWeapon}</span>
          </div>
        </div>

        <div className="divider-line" />

        <div className="card-header">BOOSTS GUIDE</div>
        <ul className="boosts-guide-list">
          <li className="boost-guide-item">
            <span className={`boost-badge double-hook ${doubleHookActive ? 'active' : ''}`}>♊</span>
            <div className="boost-guide-desc">
              <div className="boost-name">Double Hook</div>
              <div className="boost-detail">Fire two hooks concurrently</div>
            </div>
          </li>
          <li className="boost-guide-item">
            <span className={`boost-badge sticky-hook ${stickyHookActive ? 'active' : ''}`}>⚓</span>
            <div className="boost-guide-desc">
              <div className="boost-name">Sticky Anchor</div>
              <div className="boost-detail">Hook latches to top ceilings</div>
            </div>
          </li>
          <li className="boost-guide-item">
            <span className={`boost-badge shield ${shieldActive ? 'active' : ''}`}>🛡️</span>
            <div className="boost-guide-desc">
              <div className="boost-name">Force Shield</div>
              <div className="boost-detail">Absorbs one bubble crash</div>
            </div>
          </li>
          <li className="boost-guide-item">
            <span className={`boost-badge time-freeze ${timeFreezeActive ? 'active' : ''}`}>⏳</span>
            <div className="boost-guide-desc">
              <div className="boost-name">Time Stop</div>
              <div className="boost-detail">Freezes bubbles momentarily</div>
            </div>
          </li>
        </ul>
      </div>

    </div>
  );
}
