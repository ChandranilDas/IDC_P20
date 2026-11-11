import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward } from 'lucide-react';

interface TimelineScrubberProps {
  currentIndex: number;
  totalSnapshots: number;
  currentTime: number;
  totalDuration: number;
  onSeek: (index: number) => void;
  disabled?: boolean;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  currentIndex,
  totalSnapshots,
  currentTime,
  totalDuration,
  onSeek,
  disabled = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Playback timer
  const currentIndexRef = React.useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  useEffect(() => {
    if (!isPlaying || disabled || totalSnapshots <= 1) return;

    const interval = Math.max(30, Math.round(100 / playbackSpeed));
    const timer = setInterval(() => {
      const nextIdx = currentIndexRef.current + 1;
      if (nextIdx >= totalSnapshots) {
        setIsPlaying(false);
      } else {
        onSeek(nextIdx);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, disabled, totalSnapshots, playbackSpeed, onSeek]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    setIsPlaying(false);
    onSeek(idx);
  };

  const handleStepPrev = () => {
    setIsPlaying(false);
    if (currentIndex > 0) onSeek(currentIndex - 1);
  };

  const handleStepNext = () => {
    setIsPlaying(false);
    if (currentIndex < totalSnapshots - 1) onSeek(currentIndex + 1);
  };

  const handleJumpStart = () => {
    setIsPlaying(false);
    onSeek(0);
  };

  const handleJumpEnd = () => {
    setIsPlaying(false);
    if (totalSnapshots > 0) onSeek(totalSnapshots - 1);
  };

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.65rem 0.9rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-primary)' }}>Timeline Scrubber</span>
          <span className="badge" style={{ fontSize: '0.7rem' }}>
            Frame {totalSnapshots > 0 ? currentIndex + 1 : 0} of {totalSnapshots}
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)' }}>
          t = {currentTime.toFixed(3)} / {totalDuration.toFixed(1)}
        </div>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={Math.max(0, totalSnapshots - 1)}
        value={currentIndex}
        onChange={handleSliderChange}
        disabled={disabled || totalSnapshots <= 1}
        style={{
          width: '100%',
          cursor: disabled || totalSnapshots <= 1 ? 'not-allowed' : 'pointer',
          accentColor: 'var(--forest)',
          padding: 0,
        }}
      />

      {/* Playback Controls & Speed Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleJumpStart}
            disabled={disabled || currentIndex === 0}
            title="First Snapshot"
          >
            <Rewind size={13} />
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleStepPrev}
            disabled={disabled || currentIndex === 0}
            title="Previous Snapshot"
          >
            <SkipBack size={13} />
          </button>
          <button
            className={`btn btn-sm ${isPlaying ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={disabled || totalSnapshots <= 1}
            title={isPlaying ? 'Pause Playback' : 'Play Trajectory'}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleStepNext}
            disabled={disabled || currentIndex >= totalSnapshots - 1}
            title="Next Snapshot"
          >
            <SkipForward size={13} />
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleJumpEnd}
            disabled={disabled || currentIndex >= totalSnapshots - 1}
            title="Last Snapshot"
          >
            <FastForward size={13} />
          </button>
        </div>

        {/* Speed presets */}
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)' }}>Speed:</span>
          {[0.5, 1, 2, 5].map((spd) => (
            <button
              key={spd}
              onClick={() => setPlaybackSpeed(spd)}
              className="btn btn-sm"
              style={{
                padding: '2px 5px',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                background: playbackSpeed === spd ? 'var(--forest-faint)' : 'transparent',
                color: playbackSpeed === spd ? 'var(--forest)' : 'var(--ink-muted)',
                border: playbackSpeed === spd ? '1px solid #c2dbcd' : '1px solid transparent',
              }}
            >
              {spd}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
