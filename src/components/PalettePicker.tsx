import { AGE_BANDS, buildRamp, PALETTES, type Palette } from '../render/palettes';
import { Checkbox } from './ui';

function Ramp({ palette }: { palette: Palette }) {
  const ramp = buildRamp(palette.stops, 24);
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-sm">
      {ramp.map((color, i) => (
        <span key={i} className="flex-1" style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}

export function PalettePicker({
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
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {PALETTES.map((option) => (
          <button
            key={option.id}
            type="button"
            title={option.description}
            aria-pressed={palette.id === option.id}
            onClick={() => onPalette(option)}
            className={`space-y-1.5 rounded-md p-2 text-left transition-colors outline-none
              focus-visible:ring-2 focus-visible:ring-accent
              ${
                palette.id === option.id
                  ? 'bg-lab-700 ring-1 ring-accent'
                  : 'bg-lab-800 hover:bg-lab-700'
              }`}
          >
            <span className="block text-xs text-lab-200">{option.name}</span>
            <Ramp palette={option} />
          </button>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-lab-400">{palette.description}</p>

      <Checkbox
        label="Colour by age"
        checked={colorByAge}
        onChange={onColorByAge}
        hint={`Maps each cell's consecutive generations alive across ${AGE_BANDS} colour bands. Turn off to compare against flat alive/dead rendering.`}
      />
    </div>
  );
}
