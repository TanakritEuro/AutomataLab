import { useMemo, useState } from 'react';
import type { EdgeMode } from '../engine/lifeGrid';
import { describeRule, formatRule, parseRule, type LifeRule } from '../engine/rule';
import { DEFAULT_PRESET, RULE_PRESETS } from '../engine/presets';
import type { Pattern } from '../engine/patterns';
import { exportFilename } from '../render/exportPng';
import { styleFor, type Palette } from '../render/palettes';
import { useElementSize } from '../hooks/useElementSize';
import { useLifeEngine } from '../hooks/useLifeEngine';
import { PalettePicker } from './PalettePicker';
import { PatternPicker } from './PatternPicker';
import { RuleEditor } from './RuleEditor';
import { Workspace } from './Workspace';
import {
  Button,
  Checkbox,
  Collapsible,
  Field,
  FieldGroup,
  Panel,
  Segmented,
  Select,
  Slider,
  Stat,
} from './ui';

const GRID_SIZES = [
  { label: '60 × 40', cols: 60, rows: 40 },
  { label: '100 × 70', cols: 100, rows: 70 },
  { label: '160 × 110', cols: 160, rows: 110 },
  { label: '240 × 160', cols: 240, rows: 160 },
];

export function LifeView({
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
  const [sizeIndex, setSizeIndex] = useState(1);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(15);
  const [density, setDensity] = useState(0.3);
  const [edgeMode, setEdgeMode] = useState<EdgeMode>('toroidal');
  const [presetId, setPresetId] = useState(DEFAULT_PRESET.id);
  const [rule, setRule] = useState<LifeRule>(() => parseRule(DEFAULT_PRESET.notation));
  const [stamp, setStamp] = useState<Pattern | null>(null);
  const [showGaps, setShowGaps] = useState(true);

  const { cols, rows } = GRID_SIZES[sizeIndex];
  const [stageRef, stage] = useElementSize();

  const cellSize = useMemo(() => {
    if (stage.width === 0 || stage.height === 0) return 6;
    return Math.max(1, Math.min(24, Math.floor(Math.min(stage.width / cols, stage.height / rows))));
  }, [stage.width, stage.height, cols, rows]);

  const style = useMemo(() => styleFor(palette, colorByAge), [palette, colorByAge]);

  const { attachCanvas, stats, actions, pointerHandlers } = useLifeEngine({
    cols,
    rows,
    rule,
    edgeMode,
    running,
    speed,
    cellSize,
    gap: showGaps && cellSize > 6 ? 1 : 0,
    style,
    stamp,
  });

  const applyPreset = (id: string) => {
    const preset = RULE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setPresetId(id);
    setRule(parseRule(preset.notation));
  };

  return (
    <Workspace
      stageRef={stageRef}
      canvas={
        <canvas
          ref={attachCanvas}
          {...pointerHandlers}
          aria-label={`Game of Life grid, ${cols} by ${rows} cells`}
          className={`touch-none rounded-sm ring-1 ring-lab-800 ${
            stamp ? 'cursor-copy' : 'cursor-crosshair'
          }`}
        />
      }
      hint={
        stamp
          ? `Click to place a ${stamp.name}. Pick it again in the sidebar to go back to drawing.`
          : 'Click or drag on the grid to draw. Drawing works while the simulation runs.'
      }
      stats={
        <>
          <Stat label="Generation" value={stats.generation.toLocaleString()} />
          <Stat label="Live cells" value={stats.population.toLocaleString()} />
          <Stat label="Ticks / sec" value={running ? stats.tps : '—'} />
          <Stat label="Rule" value={formatRule(rule)} />
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
              <Button
                onClick={() => {
                  setRunning(false);
                  actions.clear();
                }}
              >
                Clear
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              <Field label="Speed" value={`${speed} tps`}>
                <Slider
                  min={1}
                  max={60}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                />
              </Field>
              <Field label="Grid size">
                <Select value={sizeIndex} onChange={(e) => setSizeIndex(Number(e.target.value))}>
                  {GRID_SIZES.map((size, i) => (
                    <option key={size.label} value={i}>
                      {size.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <FieldGroup label="Edges">
                <Segmented
                  value={edgeMode}
                  onChange={setEdgeMode}
                  options={[
                    {
                      value: 'toroidal',
                      label: 'Wrapped',
                      title: 'The grid is a torus: patterns leaving one edge reappear on the other.',
                    },
                    {
                      value: 'bounded',
                      label: 'Bounded',
                      title: 'Everything outside the grid counts as permanently dead.',
                    },
                  ]}
                />
              </FieldGroup>
            </div>
          </Panel>

          <Panel title="Rule">
            <RuleEditor rule={rule} onChange={setRule} presetId={presetId} onPreset={applyPreset} />
          </Panel>

          <Panel title="Patterns">
            <PatternPicker selected={stamp} onSelect={setStamp} />
          </Panel>

          <Panel title="Seed">
            <Field label="Density" value={`${Math.round(density * 100)}%`}>
              <Slider
                min={5}
                max={90}
                value={density * 100}
                onChange={(e) => setDensity(Number(e.target.value) / 100)}
              />
            </Field>
            <Button className="mt-3 w-full" onClick={() => actions.randomFill(density)}>
              Random fill
            </Button>
          </Panel>

          <Panel title="Appearance">
            <PalettePicker
              palette={palette}
              onPalette={onPalette}
              colorByAge={colorByAge}
              onColorByAge={onColorByAge}
            />
            <div className="mt-3">
              <Checkbox label="Grid gutters" checked={showGaps} onChange={setShowGaps} />
            </div>
          </Panel>

          <Panel title="Export">
            <Button
              className="w-full"
              onClick={() => actions.exportPng(exportFilename('automatalab', formatRule(rule)))}
            >
              Save as PNG
            </Button>
            <p className="mt-2 text-xs leading-relaxed text-lab-400">
              Exports the canvas at its full pixel resolution, background included.
            </p>
          </Panel>

          <Collapsible title="What am I looking at?">
            <p className="text-xs leading-relaxed text-lab-400">
              A cellular automaton is a grid of cells that all follow the same tiny rule at the same
              time. No cell knows anything beyond its eight immediate neighbours, and there is no
              central plan — yet gliders, oscillators and self-sustaining factories fall out of the
              arithmetic.
            </p>
            <p className="text-xs leading-relaxed text-lab-400">
              <span className="text-lab-200">The rule right now:</span> {describeRule(rule)}
            </p>
            <p className="text-xs leading-relaxed text-lab-400">
              That is the whole program. Everything on the canvas is a consequence of those two
              conditions applied {stats.generation.toLocaleString()} times over — which is why
              cellular automata are the standard exhibit for emergent complexity: local simplicity
              is not the same thing as global simplicity.
            </p>
            <p className="text-xs leading-relaxed text-lab-400">
              Colour tracks how long each cell has survived unbroken. Bright cells were just born,
              so moving structures glow at their leading edge while stable debris sinks into the
              deep end of the palette.
            </p>
          </Collapsible>
        </>
      }
    />
  );
}
