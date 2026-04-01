import React from 'react';
import { Foldout } from './Foldout';
import './InspectorGroup.css';

interface InspectorGroupProps {
  title: string;
  fields: Array<{
    key: string;
    label: string;
    value: unknown;
    fieldPath: string;
    component: React.ReactNode;
  }>;
  defaultExpanded?: boolean;
  icon?: string;
}

export const InspectorGroup: React.FC<InspectorGroupProps> = ({
  title,
  fields,
  defaultExpanded = true,
  icon,
}) => {
  if (fields.length === 0) return null;

  return (
    <Foldout title={title} defaultExpanded={defaultExpanded} icon={icon}>
      <div className="inspector-group__fields">
        {fields.map((field, index) => (
          <div key={field.key || `field-${index}`} className="inspector-group__field">
            {field.component}
          </div>
        ))}
      </div>
    </Foldout>
  );
};

