import { useEffect, useId, useState } from 'react';
import { Check } from 'lucide-react';
import { PhotoDate } from '@/types';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { Select } from '@/design-system/components/forms/Select';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export interface PartialDatePickerProps {
  /** Seed value, e.g. an EXIF pre-fill. Read once on mount — pass a different `key` to re-seed later. */
  initialValue?: PhotoDate;
  /** Shows the "No me acuerdo" toggle. Default false. */
  allowUnknown?: boolean;
  initialUnknown?: boolean;
  onChange: (value: PhotoDate | null, unknown: boolean) => void;
}

export function PartialDatePicker({
  initialValue,
  allowUnknown = false,
  initialUnknown = false,
  onChange,
}: PartialDatePickerProps) {
  const [year, setYear] = useState(initialValue?.year ? String(initialValue.year) : '');
  const [month, setMonth] = useState(initialValue?.month ? String(initialValue.month) : '');
  const [day, setDay] = useState(initialValue?.day ? String(initialValue.day) : '');
  const [unknown, setUnknown] = useState(initialUnknown);
  const yearInputId = useId();
  const monthSelectId = useId();
  const dayInputId = useId();

  const emit = (nextYear: string, nextMonth: string, nextDay: string, nextUnknown: boolean) => {
    if (nextUnknown) {
      onChange(null, true);
      return;
    }
    const parsedYear = parseInt(nextYear);
    onChange(
      parsedYear
        ? { year: parsedYear, month: nextMonth ? parseInt(nextMonth) : undefined, day: nextDay ? parseInt(nextDay) : undefined }
        : null,
      false
    );
  };

  // Report a real seed once on mount — callers gating on onChange (e.g. a confirm
  // button) would otherwise never learn about a valid initialValue/initialUnknown until
  // the user touches a field. Skipped when there's no seed: emitting `(null, false)` on
  // every blank mount would look identical to a genuine user edit to a caller like the
  // EXIF pre-fill flow, which needs to tell "untouched" apart from "user already chose".
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (initialValue || initialUnknown) emit(year, month, day, unknown); }, []);

  const handleYearChange = (v: string) => { setYear(v); emit(v, month, day, unknown); };
  const handleMonthChange = (v: string) => { setMonth(v); emit(year, v, day, unknown); };
  const handleDayChange = (v: string) => { setDay(v); emit(year, month, v, unknown); };
  const handleUnknownToggle = () => {
    const next = !unknown;
    setUnknown(next);
    emit(year, month, day, next);
  };

  return (
    <div>
      {allowUnknown && (
        <Button variant="plain"
          type="button"
          onClick={handleUnknownToggle}
          className={`w-full flex items-center gap-3 px-4 py-3 mb-3 rounded-xl border transition-all text-left ${
            unknown ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-secondary/30'
          }`}
        >
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
            unknown ? 'bg-primary border-primary' : 'border-border'
          }`}>
            {unknown && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className="text-sm text-foreground">No me acuerdo</span>
        </Button>
      )}

      {!unknown && (
        <div>
          <p className="text-xs text-muted-foreground mb-3">El año es obligatorio. El mes y el día son opcionales.</p>
          <div className="flex gap-3">
            <div className="flex-[2]">
              <label htmlFor={yearInputId} className="text-xs text-muted-foreground mb-1 block">Año *</label>
              <Input
                id={yearInputId}
                type="number"
                placeholder="2022"
                value={year}
                onChange={handleYearChange}
                inputClassName="bg-card px-3 py-2.5 text-sm"
              />
            </div>
            <div className="flex-1">
              <Select
                id={monthSelectId}
                label="Mes"
                labelClassName="text-xs text-muted-foreground mb-1"
                value={month}
                onChange={handleMonthChange}
                options={[
                  { value: '', label: '—' },
                  ...MONTHS.map((m, i) => ({ value: String(i + 1), label: m })),
                ]}
                className="bg-card px-3 py-2.5 text-sm"
              />
            </div>
            <div className="flex-1">
              <label htmlFor={dayInputId} className="text-xs text-muted-foreground mb-1 block">Día</label>
              <Input
                id={dayInputId}
                type="number"
                placeholder="—"
                min={1}
                max={31}
                value={day}
                onChange={handleDayChange}
                inputClassName="bg-card px-3 py-2.5 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
