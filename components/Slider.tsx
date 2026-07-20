'use client';

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  formatValue: (value: number) => string;
  onChange: (value: number) => void;
  accent?: 'brass' | 'signal';
};

export default function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  defaultValue,
  formatValue,
  onChange,
  accent = 'brass',
}: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100;
  const accentColor = accent === 'brass' ? '#C7952B' : '#4FE0A0';
  const isAtDefault = Math.abs(value - defaultValue) < step / 2;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-boneDim">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm tabular-nums text-bone">{formatValue(value)}</span>
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            aria-label={`Reset ${label} to default`}
            className="text-boneDim transition hover:text-brassBright disabled:opacity-30"
            disabled={isAtDefault}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path
                d="M13.5 8A5.5 5.5 0 1 1 8 2.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <path d="M13.5 3.5V8H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="tape-slider h-6 w-full cursor-pointer touch-none"
        style={
          {
            '--slider-percent': `${percent}%`,
            '--slider-accent': isAtDefault ? '#A8A399' : accentColor,
          } as React.CSSProperties
        }
        aria-label={label}
      />
    </div>
  );
}
