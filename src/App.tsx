import { useState } from 'react';
import { PALETTES, type Palette } from './render/palettes';
import { ElementaryView } from './components/ElementaryView';
import { LifeView } from './components/LifeView';
import { Segmented } from './components/ui';

type Mode = 'life' | 'elementary';

export default function App() {
  const [mode, setMode] = useState<Mode>('life');
  // Appearance is shared across modes so switching keeps a consistent look.
  const [palette, setPalette] = useState<Palette>(PALETTES[0]);
  const [colorByAge, setColorByAge] = useState(true);

  const appearance = { palette, onPalette: setPalette, colorByAge, onColorByAge: setColorByAge };

  return (
    <div className="flex h-full flex-col overflow-y-auto lg:overflow-hidden">
      <header className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 pt-5 pb-4 sm:px-6">
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Automata<span className="text-accent">Lab</span>
        </h1>
        <p className="hidden text-sm text-lab-400 sm:block">
          Cellular automata as generative art
        </p>
        <div className="ml-auto w-full sm:w-auto sm:min-w-72">
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              {
                value: 'life',
                label: '2D — Life-like',
                title: "Conway's Game of Life and the wider family of B/S rules",
              },
              {
                value: 'elementary',
                label: '1D — Elementary',
                title: 'Wolfram’s 256 one-dimensional rules',
              },
            ]}
          />
        </div>
      </header>

      {mode === 'life' ? <LifeView {...appearance} /> : <ElementaryView {...appearance} />}
    </div>
  );
}
