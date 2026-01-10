import React from 'react';

const Card = ({
  children,
  title,
  subtitle,
  footer,
  className = '',
  padding = true,
  hover = false,
  onClick,
}) => {
  const hoverClass = hover ? 'hover:shadow-lg transition-shadow duration-200 cursor-pointer' : '';
  const paddingClass = padding ? 'p-6' : '';

  return (
    <div
      className={`bg-white rounded-lg shadow-md ${hoverClass} ${paddingClass} ${className}`}
      onClick={onClick}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
      )}

      <div className="card-body">{children}</div>

      {footer && (
        <div className="border-t border-gray-200 mt-4 pt-4">{footer}</div>
      )}
    </div>
  );
};

export default Card;
