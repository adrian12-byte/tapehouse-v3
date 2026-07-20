'use client';

type ReelProps = {
  spinning: boolean;
  speed: number;
  size?: number;
};

export default function Reel({ spinning, speed, size = 88 }: ReelProps) {
  const duration = Math.max(0.4, 3 / Math.max(0.25, speed));

  return (
    <div
      className="relative shrink-0 rounded-full bg-panelLight ring-1 ring-hairline shadow-console"
      style={{ width: size, height: size }}
    >
      <div
        className="spin-slow absolute inset-2 rounded-full"
        style={{
          animationDuration: `${duration}s`,
          animationPlayState: spinning ? 'running' : 'paused',
          background:
            'repeating-conic-gradient(#1F2226 0deg 18deg, #292D33 18deg 36deg)',
        }}
      >
        <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-black/40" />
      </div>
      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brass ring-2 ring-ink" />
      {[0, 120, 240].map((deg) => (
        <div
          key={deg}
          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-ink"
          style={{
            transform: `rotate(${deg}deg) translate(0, -${size / 2 - 12}px)`,
          }}
        />
      ))}
    </div>
  );
}
