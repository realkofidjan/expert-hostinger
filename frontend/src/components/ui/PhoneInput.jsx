import React from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

/**
 * A premium, architectural Phone Input component.
 * Uses react-phone-number-input for country codes and formatting.
 */
const CustomPhoneInput = ({ value, onChange, placeholder = "Phone Number", className = "" }) => {
  return (
    <div className={`phone-input-container ${className}`}>
      <PhoneInput
        international
        defaultCountry="GH"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        limitMaxLength={true}
        className="expert-phone-input"
      />
      <style>{`
        .expert-phone-input {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
        }
        
        /* The country selector button */
        .PhoneInputCountry {
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 8px 12px;
          transition: all 0.3s ease;
          cursor: pointer;
          height: 48px;
        }
        
        .PhoneInputCountry:hover {
          border-color: #22c55e;
          background: var(--bg-secondary);
        }

        /* The flag icon */
        .PhoneInputCountryIcon {
          width: 24px;
          height: 18px;
          border-radius: 3px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        /* The actual text input */
        .PhoneInputInput {
          flex: 1;
          height: 48px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 0 20px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          transition: all 0.3s ease;
          outline: none;
        }

        .PhoneInputInput:focus {
          border-color: #22c55e;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.05);
        }

        .PhoneInputInput::placeholder {
          color: var(--text-muted);
        }

        /* Dark mode overrides if needed (though variables should handle it) */
        .dark .PhoneInputCountry,
        .dark .PhoneInputInput {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.1);
        }

        /* The dropdown arrow */
        .PhoneInputCountrySelectArrow {
          margin-left: 6px;
          opacity: 0.5;
          width: 0.3em;
          height: 0.3em;
          border-style: solid;
          border-width: 0.1em 0.1em 0 0;
          transform: rotate(135deg);
        }
      `}</style>
    </div>
  );
};

export default CustomPhoneInput;
