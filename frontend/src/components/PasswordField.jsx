import { useState } from "react";

function EyeOpenIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="password-toggle-icon"
    >
      <path
        d="M1.5 12s3.8-6.5 10.5-6.5S22.5 12 22.5 12 18.7 18.5 12 18.5 1.5 12 1.5 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="password-toggle-icon"
    >
      <path
        d="M3 3l18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10.6 5.7A10.9 10.9 0 0 1 12 5.5C18.7 5.5 22.5 12 22.5 12a20.7 20.7 0 0 1-4 4.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.2 6.2A20.3 20.3 0 0 0 1.5 12S5.3 18.5 12 18.5c1.9 0 3.6-.5 5-1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.9 9.9a3 3 0 0 0 4.2 4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PasswordField({ className = "", disabled = false, ...props }) {
  const [isVisible, setIsVisible] = useState(false);
  const hasValue = String(props.value ?? "").length > 0;

  return (
    <div className="password-field">
      <input
        {...props}
        type={isVisible ? "text" : "password"}
        className={`${className}${hasValue ? " password-field-has-toggle" : ""}`}
        disabled={disabled}
      />
      {hasValue ? (
        <button
          type="button"
          className="password-toggle"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={isVisible ? "Hide password" : "Show password"}
          aria-pressed={isVisible}
          disabled={disabled}
        >
          {isVisible ? <EyeOpenIcon /> : <EyeClosedIcon />}
        </button>
      ) : null}
    </div>
  );
}

export default PasswordField;
