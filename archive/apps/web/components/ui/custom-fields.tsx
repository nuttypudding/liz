'use client';

import * as React from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { X } from 'lucide-react';

interface CustomFieldsProps {
  value?: Record<string, string>;
  onChange?: (fields: Record<string, string>) => void;
  maxFields?: number;
}

interface FieldRow {
  id: string;
  label: string;
  value: string;
}

export const CustomFields = React.forwardRef<HTMLDivElement, CustomFieldsProps>(
  ({ value = {}, onChange, maxFields = 10 }, ref) => {
    const [rows, setRows] = React.useState<FieldRow[]>(() => {
      return Object.entries(value).map(([label, fieldValue]) => ({
        id: Math.random().toString(36).substring(7),
        label,
        value: fieldValue,
      }));
    });

    const handleAddField = () => {
      if (rows.length < maxFields) {
        setRows([
          ...rows,
          { id: Math.random().toString(36).substring(7), label: '', value: '' },
        ]);
      }
    };

    const handleFieldChange = (id: string, field: 'label' | 'value', newValue: string) => {
      const updated = rows.map((row) =>
        row.id === id ? { ...row, [field]: newValue } : row
      );
      setRows(updated);
      serializeAndNotify(updated);
    };

    const handleDeleteField = (id: string) => {
      const updated = rows.filter((row) => row.id !== id);
      setRows(updated);
      serializeAndNotify(updated);
    };

    const serializeAndNotify = (updatedRows: FieldRow[]) => {
      const serialized = updatedRows.reduce(
        (acc, row) => {
          if (row.label.trim()) {
            acc[row.label] = row.value;
          }
          return acc;
        },
        {} as Record<string, string>
      );

      if (onChange) {
        onChange(serialized);
      }
    };

    return (
      <div ref={ref} className="space-y-4">
        {rows.map((row) => (
          <div key={row.id} className="flex gap-2 items-end">
            <div className="flex-1">
              <Label htmlFor={`label-${row.id}`} className="text-xs mb-1 block">
                Field Name
              </Label>
              <Input
                id={`label-${row.id}`}
                placeholder="e.g., Preferred Communication"
                value={row.label}
                onChange={(e) => handleFieldChange(row.id, 'label', e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor={`value-${row.id}`} className="text-xs mb-1 block">
                Value
              </Label>
              <Input
                id={`value-${row.id}`}
                placeholder="e.g., Email"
                value={row.value}
                onChange={(e) => handleFieldChange(row.id, 'value', e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteField(row.id)}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddField}
          disabled={rows.length >= maxFields}
        >
          + Add Field
        </Button>
      </div>
    );
  }
);

CustomFields.displayName = 'CustomFields';
