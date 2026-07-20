'use client';

import { useEffect, useRef, useState } from 'react';

type LyricsEditorProps = {
  initialLyrics: string;
  onSave: (lyrics: string) => Promise<void>;
  readOnly?: boolean;
};

export default function LyricsEditor({ initialLyrics, onSave, readOnly = false }: LyricsEditorProps) {
  const [lyrics, setLyrics] = useState(initialLyrics);
  const [status, setStatus] = useState<'idle' | 'dirty' | 'saving' | 'saved'>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLyrics(initialLyrics);
    setStatus('idle');
  }, [initialLyrics]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleChange(value: string) {
    setLyrics(value);
    setStatus('dirty');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      setStatus('saving');
      try {
        await onSave(value);
        setStatus('saved');
      } catch {
        setStatus('dirty');
      }
    }, 900);
  }

  return (
    <div className="tape-grain flex h-full flex-col bg-panel p-6 shadow-console ring-1 ring-hairline">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-medium text-bone">Lyric sheet</h2>
        <span className="font-mono text-[10px] uppercase tracking-wide text-boneDim">
          {readOnly && 'View only'}
          {!readOnly && status === 'saving' && 'Saving…'}
          {!readOnly && status === 'saved' && 'Saved'}
          {!readOnly && status === 'dirty' && 'Unsaved'}
        </span>
      </div>
      <textarea
        value={lyrics}
        onChange={(e) => !readOnly && handleChange(e.target.value)}
        readOnly={readOnly}
        placeholder={readOnly ? 'No lyrics yet.' : 'Write the words down here…'}
        spellCheck={false}
        className="min-h-[320px] flex-1 resize-none border border-hairline bg-ink p-4 font-mono text-sm leading-relaxed text-bone outline-none focus:border-signal disabled:opacity-70"
      />
    </div>
  );
}
