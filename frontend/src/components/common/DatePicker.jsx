import React, { useState, useEffect } from 'react';
import { formatDateForInput } from '../../utils/formatters';

const DatePicker = ({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  required = false,
  disabled = false,
  className = ''
}) => {
  const [localValue, setLocalValue] = useState('');

  useEffect(() => {
    if (value) {
      setLocalValue(formatDateForInput(value));
    } else {
      setLocalValue('');
    }
  }, [value]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (onChange) {
      onChange(new Date(newValue));
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type="date"
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        value={localValue}
        onChange={handleChange}
        min={minDate ? formatDateForInput(minDate) : undefined}
        max={maxDate ? formatDateForInput(maxDate) : undefined}
        required={required}
        disabled={disabled}
      />
    </div>
  );
};

export default DatePicker;
