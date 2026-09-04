import { NEIGHBOURHOODS, outputFor, toggleOutput } from '../engine/elementary';

function Cell({ on, size = 14 }: { on: number; size?: number }) {
  return (
    <span
      className={`inline-block rounded-[1px] ${on ? 'bg-accent' : 'bg-lab-700'}`}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * The whole rule, shown as its eight neighbourhood -> output mappings.
 *
 * This is the point of elementary automata: the entire "program" is these eight
 * bits, and reading them off the diagram is reading the rule number in binary.
 * Clicking an output flips that bit and gives you the neighbouring rule number.
 */
export function ElementaryRuleMap({
  rule,
  onChange,
}: {
  rule: number;
  onChange: (rule: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1.5">
        {NEIGHBOURHOODS.map((neighbourhood) => {
          const output = outputFor(rule, neighbourhood);
          return (
            <button
              key={neighbourhood.join('')}
              type="button"
              onClick={() => onChange(toggleOutput(rule, neighbourhood))}
              aria-label={`Neighbourhood ${neighbourhood.join('')} produces ${output}; click to flip`}
              className="flex flex-col items-center gap-1 rounded-md bg-lab-800 py-2
                transition-colors hover:bg-lab-700 focus-visible:ring-2
                focus-visible:ring-accent focus-visible:outline-none"
            >
              <span className="flex gap-[2px]">
                {neighbourhood.map((value, i) => (
                  <Cell key={i} on={value} />
                ))}
              </span>
              <span className="text-lab-600 text-[9px] leading-none">▼</span>
              <Cell on={output} />
            </button>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-lab-400">
        Reading the eight outputs as binary, high neighbourhood first, gives{' '}
        <span className="font-mono text-lab-200">
          {NEIGHBOURHOODS.map((n) => outputFor(rule, n)).join('')}
        </span>{' '}
        = <span className="font-mono text-accent">{rule}</span>. Click any output to flip it.
      </p>
    </div>
  );
}
