import type { ReactNode, Ref } from 'react';

/**
 * Shared layout for both modes: the canvas is the centrepiece, stats sit under
 * it, and controls live in a sidebar that becomes a stacked panel on narrow
 * screens.
 */
export function Workspace({
  stageRef,
  canvas,
  hint,
  stats,
  sidebar,
}: {
  stageRef: Ref<HTMLDivElement>;
  canvas: ReactNode;
  hint: ReactNode;
  stats: ReactNode;
  sidebar: ReactNode;
}) {
  return (
    // Desktop pins the whole app to the viewport and scrolls the sidebar
    // internally. Below `lg` the sidebar stacks underneath, so the height
    // constraints are lifted and the page scrolls normally instead — without
    // that, `min-h-0` lets the canvas column collapse to nothing.
    <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
      <main className="flex min-w-0 flex-col lg:min-h-0 lg:flex-1">
        <div
          ref={stageRef}
          className="grid min-h-[45vh] place-items-center px-4 py-4 sm:px-6 lg:flex-1 lg:overflow-hidden"
        >
          {canvas}
        </div>

        <footer className="flex flex-wrap items-end gap-x-8 gap-y-3 px-4 pb-5 sm:px-6">
          {stats}
          <p className="ml-auto hidden max-w-sm text-right text-xs leading-relaxed text-lab-400 md:block">
            {hint}
          </p>
        </footer>
      </main>

      <aside
        className="w-full shrink-0 border-t border-lab-800 bg-lab-900
          lg:w-84 lg:overflow-y-auto lg:border-t-0 lg:border-l"
      >
        {sidebar}
      </aside>
    </div>
  );
}
