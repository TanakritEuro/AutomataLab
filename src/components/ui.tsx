import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'default' | 'ghost';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-lab-950 font-semibold hover:brightness-110 active:brightness-95',
  default: 'bg-lab-700 text-lab-200 hover:bg-lab-600 active:bg-lab-700',
  ghost: 'bg-transparent text-lab-400 hover:bg-lab-800 hover:text-lab-200',
};

export function Button({
  variant = 'default',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm
        transition-[filter,background-color] outline-none select-none
        focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
        focus-visible:ring-offset-lab-900 disabled:cursor-not-allowed disabled:opacity-40
        ${VARIANTS[variant]} ${className}`}
    />
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-lab-800 px-5 py-4 last:border-b-0">
      <h2 className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-lab-400 uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function FieldLabel({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <span className="mb-1.5 flex items-baseline justify-between text-xs text-lab-400">
      {label}
      {value !== undefined && <span className="font-mono text-lab-200">{value}</span>}
    </span>
  );
}

/** Label for a single form control (slider, select). */
export function Field({
  label,
  value,
  children,
}: {
  label: string;
  value?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <FieldLabel label={label} value={value} />
      {children}
    </label>
  );
}

/**
 * Label for a set of controls. A <label> may only name one control — wrapping a
 * button group in one merges the group's text into every button's accessible
 * name, so this uses a labelled group instead.
 */
export function FieldGroup({
  label,
  value,
  children,
}: {
  label: string;
  value?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div role="group" aria-label={label} className="block">
      <FieldLabel label={label} value={value} />
      {children}
    </div>
  );
}

export function Slider(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="range"
      {...props}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-lab-700
        accent-accent outline-none
        focus-visible:ring-2 focus-visible:ring-accent"
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full cursor-pointer rounded-md border border-lab-700 bg-lab-800 px-2.5 py-2
        text-sm text-lab-200 outline-none focus-visible:border-accent"
    />
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] tracking-[0.12em] text-lab-400 uppercase">{label}</span>
      <span className="font-mono text-lg leading-tight text-lab-200 tabular-nums">{value}</span>
    </div>
  );
}

/** Two-or-more-way exclusive choice rendered as one connected control. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
}: {
  options: ReadonlyArray<{ value: T; label: string; title?: string }>;
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="group"
      className="flex gap-1 rounded-md bg-lab-800 p-1 ring-1 ring-lab-700 ring-inset"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.title}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded px-2 ${size === 'sm' ? 'py-1 text-xs' : 'py-1.5 text-sm'}
            transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent
            ${
              value === option.value
                ? 'bg-lab-600 font-medium text-white'
                : 'text-lab-400 hover:text-lab-200'
            }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-accent"
      />
      <span>
        <span className="block text-sm text-lab-200">{label}</span>
        {hint && <span className="block text-xs leading-snug text-lab-400">{hint}</span>}
      </span>
    </label>
  );
}

/** Highlighted aside for facts worth stopping on (e.g. Turing-completeness). */
export function Callout({ children }: { children: ReactNode }) {
  return (
    <p
      className="rounded-md border-l-2 border-accent bg-accent/5 px-3 py-2 text-xs
        leading-relaxed text-lab-200"
    >
      {children}
    </p>
  );
}

export function Collapsible({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-lab-800 last:border-b-0">
      <summary
        className="flex cursor-pointer list-none items-center justify-between px-5 py-4
          text-[11px] font-semibold tracking-[0.14em] text-lab-400 uppercase
          hover:text-lab-200 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        {title}
        <span className="text-base transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="space-y-3 px-5 pb-5">{children}</div>
    </details>
  );
}
