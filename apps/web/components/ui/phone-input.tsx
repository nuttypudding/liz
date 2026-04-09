'use client';

import * as React from 'react';
import { Input } from './input';

interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string;
  onValueChange?: (digits: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = '', onValueChange, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState<string>(
      value ? formatPhone(String(value)) : ''
    );

    React.useEffect(() => {
      if (value !== undefined) {
        setDisplayValue(formatPhone(String(value)));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const digits = raw.replace(/\D/g, '').slice(0, 10);
      const formatted = formatPhone(raw);

      setDisplayValue(formatted);

      if (onValueChange) {
        onValueChange(digits);
      }

      if (onChange) {
        onChange(e);
      }
    };

    return (
      <Input
        ref={ref}
        type="tel"
        value={displayValue}
        onChange={handleChange}
        placeholder="(XXX) XXX-XXXX"
        {...props}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
