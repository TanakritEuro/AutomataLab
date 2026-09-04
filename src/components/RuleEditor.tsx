import { formatRule, toggleRuleDigit, type LifeRule } from '../engine/rule';
import { RULE_PRESETS } from '../engine/presets';
import { Field, Select } from './ui';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function DigitRow({
  kind,
  label,
  hint,
  rule,
  onChange,
}: {
  kind: 'birth' | 'survive';
  label: string;
  hint: string;
  rule: LifeRule;
  onChange: (rule: LifeRule) => void;
}) {
  const mask = kind === 'birth' ? rule.birth : rule.survive;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs text-lab-200">{label}</span>
        <span className="text-[11px] text-lab-400">{hint}</span>
      </div>
      <div className="flex gap-1">
        {DIGITS.map((digit) => (
          <button
            key={digit}
            type="button"
            aria-pressed={mask[digit]}
            aria-label={`${label} on ${digit} neighbours`}
            onClick={() => onChange(toggleRuleDigit(rule, kind, digit))}
            className={`flex-1 rounded py-1.5 font-mono text-xs transition-colors outline-none
              focus-visible:ring-2 focus-visible:ring-accent
              ${
                mask[digit]
                  ? 'bg-accent font-semibold text-lab-950'
                  : 'bg-lab-800 text-lab-400 hover:bg-lab-700 hover:text-lab-200'
              }`}
          >
            {digit}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * B/S rules edited as digit toggles rather than a text field — the notation is
 * exactly a pair of subsets of 0-8, so the buttons are a more honest
 * representation of the rule than the string is.
 */
export function RuleEditor({
  rule,
  onChange,
  presetId,
  onPreset,
}: {
  rule: LifeRule;
  onChange: (rule: LifeRule) => void;
  presetId: string;
  onPreset: (id: string) => void;
}) {
  const notation = formatRule(rule);
  const preset = RULE_PRESETS.find((p) => p.id === presetId);
  const matchesPreset = preset?.notation === notation;

  return (
    <div className="space-y-4">
      <Field label="Preset">
        <Select value={matchesPreset ? presetId : 'custom'} onChange={(e) => onPreset(e.target.value)}>
          {RULE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.notation}
            </option>
          ))}
          {!matchesPreset && <option value="custom">Custom — {notation}</option>}
        </Select>
      </Field>

      {matchesPreset && preset && (
        <p className="text-xs leading-relaxed text-lab-400">{preset.blurb}</p>
      )}

      <DigitRow
        kind="birth"
        label="Birth"
        hint="dead cell comes alive"
        rule={rule}
        onChange={onChange}
      />
      <DigitRow
        kind="survive"
        label="Survival"
        hint="live cell stays alive"
        rule={rule}
        onChange={onChange}
      />

      <p className="font-mono text-sm text-accent">{notation}</p>
    </div>
  );
}
