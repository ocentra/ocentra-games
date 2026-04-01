import React, { useState } from 'react';
import './Foldout.css';

interface FoldoutProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  icon?: string;
}

export const Foldout: React.FC<FoldoutProps> = ({ 
  title, 
  defaultExpanded = true, 
  children,
  icon 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="inspector-foldout">
      <button
        type="button"
        className="inspector-foldout__header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="inspector-foldout__icon">
          {isExpanded ? '▼' : '▶'}
        </span>
        {icon && <span className="inspector-foldout__icon-custom">{icon}</span>}
        <span className="inspector-foldout__title">{title}</span>
      </button>
      {isExpanded && (
        <div className="inspector-foldout__content">
          {children}
        </div>
      )}
    </div>
  );
};

