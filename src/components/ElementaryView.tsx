import { useMemo, useState } from 'react';
import { ELEMENTARY_PRESETS, type Seed } from '../engine/elementary';
import { exportFilename } from '../render/exportPng';
import { styleFor, type Palette } from '../render/palettes';
import { useElementSize } from '../hooks/useElementSize';
import { useElementaryEngine } from '../hooks/useElementaryEngine';
import { ElementaryRuleMap } from './ElementaryRuleMap';
import { PalettePicker } from './PalettePicker';
import { Workspace } from './Workspace';
import {
  Button,
  Callout,
  Checkbox,
  Collapsible,
  Field,
  FieldGroup,
  Panel,
  Segmented,
  Slider,
  Stat,
} from './ui';

const WIDTHS = [161, 241, 401, 601];

export function ElementaryView({
  palette,
  onPalette,
  colorByAge,
  onColorByAge,
}: {
  palette: Palette;
  onPalette: (palette: Palette) => void;
  colorByAge: boolean;
  onColorByAge: (value: boolean) => void;
}) {
  const [widthIndex, setWidthIndex] = useState(1);
  const [rule, setRule] = useState(30);
  const [seed, setSeed] = useState<Seed>('single');
  const [wrap, setWrap] = useState(true);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(30);

  const cols = WIDTHS[widthIndex];
  const [stageRef, stage] = useElementSize();

  // Square cells, sized to fit the width; row count follows from the height.
  const { cellSize, rows } = useMemo(() => {
    if (stage.width === 0 || stage.height === 0) return { cellSize: 2, rows: 200 };
    const size = Math.max(1, Math.min(8, Math.floor(stage.width / cols)));
    return { cellSize: size, rows: Math.max(40, Math.floor(stage.height / size)) };
  }, [stage.width, stage.height, cols]);

  const style = useMemo(() => styleFor(palette, colorByAge), [palette, colorByAge]);

  const { attachCanvas, stats, actions } = useElementaryEngine({
    cols,
    rows,
    rule,
    seed,
    wrap,
    running,
    speed,
    cellSize,
    style,
  });

  const preset = ELEMENTARY_PRESETS.find((p) => p.rule === rule);

  return (
    <Workspace
      stageRef={stageRef}
      canvas={
        <canvas
          ref={attachCanvas}
          aria-label={`Elementary cellular automaton rule ${rule}, ${cols} cells wide`}
          className="rounded-sm ring-1 ring-lab-800"
        />
      }
      hint="Each row is one generation; time runs downward. Once the canvas fills, it scrolls."
      stats={
        <>
          <Stat label="Generation" value={stats.generation.toLocaleString()} />
          <Stat label="Live cells" value={stats.population.toLocaleString()} />
          <Stat label="Ticks / sec" value={running ? stats.tps : '—'} />
          <Stat label="Rule" value={rule} />
        </>
      }
      sidebar={
        <>
          <Panel title="Simulation">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="primary" onClick={() => setRunning((r) => !r)} className="col-span-2">
                {running ? 'Pause' : 'Play'}
              </Button>
              <Button
                onClick={() => {
                  setRunning(false);
                  actions.stepOnce();
                }}
              >
                Step once
              </Button>
              <Button onClick={actions.restart}>Restart</Button>
            </div>

            <div className="mt-4 space-y-4">
              <Field label="Speed" value={`${speed} tps`}>
                <Slider
                  min={1}
                  max={120}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                />
              </Field>
              <Field label="Row width" value={`${cols} cells`}>
                <Slider
                  min={0}
                  max={WIDTHS.length - 1}
                  step={1}
                  value={widthIndex}
                  onChange={(e) => setWidthIndex(Number(e.target.value))}
                />
              </Field>
              <FieldGroup label="Starting row">
                <Segmented
                  value={seed}
                  onChange={setSeed}
                  options={[
                    {
                      value: 'single',
                      label: 'Single cell',
                      title: 'One live cell in the centre — the classic starting condition.',
                    },
                    { value: 'random', label: 'Random', title: 'A random row of live cells.' },
                  ]}
                />
              </FieldGroup>
              <Checkbox
                label="Wrap row edges"
                checked={wrap}
                onChange={setWrap}
                hint="Treats the row as a ring so structures leaving one side return on the other."
              />
            </div>
          </Panel>

          <Panel title="Rule">
            <Field label="Rule number" value={rule}>
              <Slider
                min={0}
                max={255}
                value={rule}
                onChange={(e) => setRule(Number(e.target.value))}
              />
            </Field>
            <div className="mt-4">
              <ElementaryRuleMap rule={rule} onChange={setRule} />
            </div>
          </Panel>

          <Panel title="Notable rules">
            <div className="grid grid-cols-3 gap-1.5">
              {ELEMENTARY_PRESETS.map((p) => (
                <button
                  key={p.rule}
                  type="button"
                  onClick={() => setRule(p.rule)}
                  aria-pressed={rule === p.rule}
                  className={`rounded-md py-2 font-mono text-xs transition-colors outline-none
                    focus-visible:ring-2 focus-visible:ring-accent
                    ${
                      rule === p.rule
                        ? 'bg-accent font-semibold text-lab-950'
                        : 'bg-lab-800 text-lab-200 hover:bg-lab-700'
                    }`}
                >
                  {p.rule}
                </button>
              ))}
            </div>
            {preset && (
              <div className="mt-3 space-y-2">
                <p className="text-xs leading-relaxed text-lab-400">
                  <span className="text-lab-200">{preset.name}.</span> {preset.blurb}
                </p>
                {preset.callout && <Callout>{preset.callout}</Callout>}
              </div>
            )}
          </Panel>

          <Panel title="Appearance">
            <PalettePicker
              palette={palette}
              onPalette={onPalette}
              colorByAge={colorByAge}
              onColorByAge={onColorByAge}
            />
          </Panel>

          <Panel title="Export">
            <Button
              className="w-full"
              onClick={() => actions.exportPng(exportFilename('automatalab-rule', String(rule)))}
            >
              Save as PNG
            </Button>
          </Panel>

          <Collapsible title="What am I looking at?">
            <p className="text-xs leading-relaxed text-lab-400">
              This is the one-dimensional case. A single row of cells evolves, and each new
              generation is drawn beneath the last — so the triangular image is not the automaton,
              it is the automaton&rsquo;s entire history stacked up.
            </p>
            <p className="text-xs leading-relaxed text-lab-400">
              A cell sees only itself and its two neighbours. Three binary inputs means eight
              possible neighbourhoods, and a rule is just a choice of output for each one. Eight
              bits, so exactly 256 rules exist — and the panel above shows all eight of this
              one&rsquo;s decisions.
            </p>
            <p className="text-xs leading-relaxed text-lab-400">
              Wolfram sorted the 256 into four classes: rules that die out, rules that settle into
              stripes, rules that produce noise, and the rare fourth class where localised
              structures persist and interact. Rules 110 and 54 are class 4, and that is where the
              interesting behaviour lives.
            </p>
            <Callout>
              Rule 110 is proven Turing-complete. A row of cells applying one 8-bit rule can, given
              the right starting configuration, compute anything a computer can compute.
            </Callout>
            <p className="text-xs leading-relaxed text-lab-400">
              Colour tracks how many consecutive generations a column has stayed alive, so vertical
              streaks — the persistent structures — read differently from the churn around them.
            </p>
          </Collapsible>
        </>
      }
    />
  );
}
