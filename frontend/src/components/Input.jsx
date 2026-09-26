import { useId } from "react";
import "./Input.css";

/**
 * A labelled text input with optional helper text and error state.
 * Pass any native <input> prop through; `label` and `error` are the
 * only two additions to the native API.
 */
export default function Input({ label, helper, error, id, className = "", ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`field__input ${error ? "field__input--error" : ""}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error ? (
        <p className="field__message field__message--error" id={`${inputId}-error`}>
          {error}
        </p>
      ) : helper ? (
        <p className="field__message">{helper}</p>
      ) : null}
    </div>
  );
}
