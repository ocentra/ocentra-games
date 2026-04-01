import type { ViewMode } from '../types';
import { ALPHABET_ALL_KEY, ALPHABET_NUM_KEY } from '../types';
import './ExplorerControlBar.css';

interface Props {
  currentView: ViewMode;
  availableLetters: Set<string>;
  currentLetter: string | null;
  onLetterChange: (letter: string | null) => void;
  alphabetLayout: 'grid' | 'list';
  onLayoutChange: (layout: 'grid' | 'list') => void;
}

const ALPHABET_KEYS = [ALPHABET_ALL_KEY, ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), ALPHABET_NUM_KEY];

export function ExplorerControlBar({
  currentView,
  availableLetters,
  currentLetter,
  onLetterChange,
  alphabetLayout,
  onLayoutChange,
}: Props) {
  const isAlphabet = currentView === 'alphabet';

  if (!isAlphabet) return null;

  return (
    <div className="cge-control-bar">

      {/* Alphabet layout toggle */}
      <div className="cge-alphabet-layout-btns">
        <button
          type="button"
          className={`cge-alphabet-layout-btn ${alphabetLayout === 'grid' ? 'is-active' : ''}`}
          onClick={() => onLayoutChange('grid')}
          aria-label="Grid layout"
        >
          ⊞ Grid
        </button>
        <button
          type="button"
          className={`cge-alphabet-layout-btn ${alphabetLayout === 'list' ? 'is-active' : ''}`}
          onClick={() => onLayoutChange('list')}
          aria-label="List layout"
        >
          ☰ List
        </button>
      </div>

      {/* A–Z letter strip — centered */}
      <div className="cge-control-bar__letters">
        {ALPHABET_KEYS.map(l => {
          const isAll = l === ALPHABET_ALL_KEY;
          const isActive = isAll ? currentLetter === null : l === currentLetter;
          const isDisabled = !isAll && !availableLetters.has(l);

          return (
            <button
              key={l}
              type="button"
              className={`cge-alpha-letter ${isActive ? 'is-active' : ''} ${isDisabled ? 'is-disabled' : ''}`}
              disabled={isDisabled}
              onClick={() => {
                if (isAll) onLetterChange(null);
                else if (!isDisabled) onLetterChange(l === currentLetter ? null : l);
              }}
              aria-pressed={isActive}
              aria-label={isAll ? 'Show all' : `Letter ${l}`}
            >
              {l}
            </button>
          );
        })}
      </div>

    </div>
  );
}
