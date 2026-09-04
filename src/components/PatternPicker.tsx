import { PATTERNS, type Pattern } from '../engine/patterns';

/** Tiny preview of a pattern's live cells, drawn with CSS grid. */
function Thumbnail({ pattern, active }: { pattern: Pattern; active: boolean }) {
  const scale = Math.min(4, Math.floor(44 / Math.max(pattern.width, pattern.height)) || 1);
  return (
    <div
      className="shrink-0"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${pattern.width}, ${scale}px)`,
        gridTemplateRows: `repeat(${pattern.height}, ${scale}px)`,
        gap: '1px',
      }}
    >
      {Array.from({ length: pattern.width * pattern.height }, (_, i) => {
        const x = i % pattern.width;
        const y = Math.floor(i / pattern.width);
        const alive = pattern.cells.some(([cx, cy]) => cx === x && cy === y);
        return (
          <span
            key={i}
            className={alive ? (active ? 'bg-lab-950' : 'bg-accent') : ''}
            style={{ borderRadius: 1 }}
          />
        );
      })}
    </div>
  );
}

/**
 * Arms a pattern for stamping. Selecting one switches the canvas from freehand
 * drawing to placing that pattern centred on each click; selecting it again
 * returns to drawing.
 */
export function PatternPicker({
  selected,
  onSelect,
}: {
  selected: Pattern | null;
  onSelect: (pattern: Pattern | null) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {PATTERNS.map((pattern) => {
          const active = selected?.id === pattern.id;
          return (
            <button
              key={pattern.id}
              type="button"
              title={pattern.blurb}
              aria-pressed={active}
              onClick={() => onSelect(active ? null : pattern)}
              className={`flex min-h-16 flex-col items-start gap-1.5 rounded-md px-2.5 py-2
                text-left transition-colors outline-none focus-visible:ring-2
                focus-visible:ring-accent
                ${
                  active
                    ? 'bg-accent text-lab-950'
                    : 'bg-lab-800 text-lab-200 hover:bg-lab-700'
                }`}
            >
              <span className="text-[11px] leading-tight font-medium">{pattern.name}</span>
              <Thumbnail pattern={pattern} active={active} />
            </button>
          );
        })}
      </div>

      <p className="text-xs leading-relaxed text-lab-400">
        {selected ? (
          <>
            <span className="text-lab-200">{selected.name}</span> armed — click the canvas to place
            it. {selected.blurb}
          </>
        ) : (
          'Select a pattern to stamp it onto the grid, or draw freehand with the pointer.'
        )}
      </p>
    </div>
  );
}
