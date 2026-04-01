import React from 'react';
import './SelectField.css';

interface SelectFieldProps {
  label: string;
  value: unknown;
  onChange?: (value: unknown) => void;
  options: Array<{ value: string; label: string }>;
  readOnly?: boolean;
  id?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({ label, value, onChange, options, readOnly = false, id }) => {
  const selectId = id || `select-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="inspector-panel__field">
      <label htmlFor={selectId} className="inspector-panel__field-label">{label}</label>
      {readOnly ? (
        <div className="inspector-panel__field-value-readonly" id={selectId}>{String(value)}</div>
      ) : (
        <select
          id={selectId}
          className="inspector-panel__field-input"
          value={String(value ?? '')}
          onChange={(e) => onChange?.(e.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

