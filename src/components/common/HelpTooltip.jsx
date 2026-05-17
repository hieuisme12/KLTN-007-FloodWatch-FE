import React, { useId } from 'react';

/**
 * Tooltip title + description (hover / focus) — API tương tự Untitled UI.
 */
export function Tooltip({ title, description, children, placement = 'top' }) {
  const tooltipId = useId();

  return (
    <span className={`help-tooltip help-tooltip--${placement}`}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child) && child.type === TooltipTrigger
          ? React.cloneElement(child, { 'aria-describedby': tooltipId })
          : child
      )}
      <span id={tooltipId} role="tooltip" className="help-tooltip__bubble">
        <span className="help-tooltip__title">{title}</span>
        {description ? <span className="help-tooltip__desc">{description}</span> : null}
      </span>
    </span>
  );
}

export function TooltipTrigger({ className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={['help-tooltip__trigger', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
