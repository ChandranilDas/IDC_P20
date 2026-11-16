import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward } from 'lucide-react';

export interface TimelineScrubberProps {
  currentIndex: number;
  totalSnapshots: number;
  currentTime: number;
  totalDuration: number;
  onSeek: (index: number) => void;
  disabled?: boolean;
  snapshotTimes?: number[];
  speed?: number;
  onSpeedChange?: (speed: number) => void;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  currentIndex,
  totalSnapshots,
  currentTime,
  totalDuration,
  onSeek,
  disabled = false,
  snapshotTimes,
  speed: controlledSpeed,
  onSpeedChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [localSpeed, setLocalSpeed] = useState(1);
  const speed = controlledSpeed ?? localSpeed;
  const speedRef = useRef(speed);
  const cursor = useRef(currentTime);
  const lastWall = useRef(0);
  const playing = useRef(false);
  const indexRef = useRef(currentIndex);
  const previousIndex = useRef(currentIndex);
  const data = useRef({ snapshotTimes, totalSnapshots, totalDuration, onSeek });
  data.current = { snapshotTimes, totalSnapshots, totalDuration, onSeek };
  indexRef.current = currentIndex;

  const timeAt = useCallback((idx: number) => {
    const d = data.current;
    return d.snapshotTimes?.[idx] ?? (d.totalSnapshots > 1 ? idx * d.totalDuration / (d.totalSnapshots - 1) : 0);
  }, []);
  const advanceClock = useCallback(() => {
    const now = performance.now();
    if (playing.current) cursor.current += Math.max(0, now - lastWall.current) * speedRef.current / 1000;
    lastWall.current = now;
  }, []);
  const stop = useCallback(() => {
    advanceClock();
    playing.current = false;
    setIsPlaying(false);
  }, [advanceClock]);

  // Prop-driven speed changes use the old rate up to the change, then the new one.
  useEffect(() => {
    advanceClock();
    speedRef.current = speed;
  }, [speed, advanceClock]);
  useEffect(() => {
    if (!playing.current && previousIndex.current !== currentIndex) cursor.current = timeAt(currentIndex);
    previousIndex.current = currentIndex;
  }, [currentIndex, timeAt]);
  useEffect(() => {
    if (disabled) stop();
  }, [disabled, stop]);
  useEffect(() => {
    if (!isPlaying || disabled || totalSnapshots <= 1) return;
    const timer = setInterval(() => {
      advanceClock();
      let idx = indexRef.current;
      while (idx + 1 < data.current.totalSnapshots && timeAt(idx + 1) <= cursor.current + 1e-9) idx++;
      if (idx !== indexRef.current) {
        indexRef.current = idx;
        data.current.onSeek(idx);
      }
      if (idx >= data.current.totalSnapshots - 1) stop();
    }, 16);
    return () => clearInterval(timer);
  }, [isPlaying, disabled, totalSnapshots, advanceClock, timeAt, stop]);

  const handleSpeedClick = (newSpeed: number) => {
    advanceClock();
    speedRef.current = newSpeed;
    if (controlledSpeed === undefined) setLocalSpeed(newSpeed);
    onSpeedChange?.(newSpeed);
  };
  const seek = (idx: number) => {
    stop();
    cursor.current = timeAt(idx);
    indexRef.current = idx;
    onSeek(idx);
  };
  const handleTogglePlay = () => {
    if (disabled || totalSnapshots <= 1) return;
    if (playing.current) { stop(); return; }
    if (currentIndex >= totalSnapshots - 1) seek(0);
    lastWall.current = performance.now();
    playing.current = true;
    setIsPlaying(true);
  };
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => seek(Number(e.target.value));
  const handleStepPrev = () => seek(Math.max(0, currentIndex - 1));
  const handleStepNext = () => seek(Math.min(totalSnapshots - 1, currentIndex + 1));
  const handleJumpStart = () => seek(0);
  const handleJumpEnd = () => seek(Math.max(0, totalSnapshots - 1));

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
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleJumpStart}
            disabled={disabled || currentIndex === 0}
            title="First Snapshot"
          >
            <Rewind size={13} />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleStepPrev}
            disabled={disabled || currentIndex === 0}
            title="Previous Snapshot"
          >
            <SkipBack size={13} />
          </button>
          <button
            type="button"
            className={`btn btn-sm ${isPlaying ? 'btn-primary' : 'btn-secondary'}`}
            onClick={handleTogglePlay}
            disabled={disabled || totalSnapshots <= 1}
            title={isPlaying ? 'Pause Playback' : 'Play Trajectory'}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleStepNext}
            disabled={disabled || currentIndex >= totalSnapshots - 1}
            title="Next Snapshot"
          >
            <SkipForward size={13} />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleJumpEnd}
            disabled={disabled || currentIndex >= totalSnapshots - 1}
            title="Last Snapshot"
          >
            <FastForward size={13} />
          </button>
        </div>

        {/* Speed presets */}
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)' }}>Speed:</span>
          {[0.5, 1, 2, 5].map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => handleSpeedClick(spd)}
              className="btn btn-sm"
              style={{
                padding: '2px 5px',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                background: speed === spd ? 'var(--forest-faint)' : 'transparent',
                color: speed === spd ? 'var(--forest)' : 'var(--ink-muted)',
                border: speed === spd ? '1px solid #c2dbcd' : '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              {spd}×
            </button>
          ))}
          <span style={{ fontSize: '0.68rem', color: 'var(--ink-muted)', marginLeft: '0.25rem' }}>
            1× = 1 simulation time unit/s
          </span>
        </div>
      </div>
    </div>
  );
};
