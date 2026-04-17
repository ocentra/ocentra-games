import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CardGameTemplateBackdrop from './CardGameTemplateBackdrop';

describe('CardGameTemplateBackdrop', () => {
  it('renders the BgCards collage layers', () => {
    const { container } = render(<CardGameTemplateBackdrop />);

    expect(container.querySelectorAll('img').length).toBeGreaterThanOrEqual(12);
  });
});
