import { ALPHABET_ALL_KEY, ALPHABET_NUM_KEY } from '../types';
import './AlphabetNav.css';

interface Props {
  availableLetters: Set<string>;
  currentLetter: string | null;
  onLetterChange: (letter: string | null) => void;
  alphabetLayout: 'grid' | 'list';
  onLayoutChange: (layout: 'grid' | 'list') => void;
}

const ALPHABET_KEYS = [ALPHABET_ALL_KEY, ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), ALPHABET_NUM_KEY];

export function AlphabetNav({
  availableLetters,
  currentLetter,
  onLetterChange,
  alphabetLayout,
  onLayoutChange,
}: Props) {
  return (
    <div className="cge-alphabet-nav">
      <div className="cge-alphabet-nav__layout-btns">
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

      <div className="cge-alphabet-nav__letters">
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
                if (isAll) {
                  onLetterChange(null);
                } else if (!isDisabled) {
                  onLetterChange(l === currentLetter ? null : l);
                }
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
