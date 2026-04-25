import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(import.meta.dirname, '..');

const fileCopies = [
  ['src/tokens.css', 'dist/'],
  ['src/Footer/GameFooter.module.css', 'dist/Footer/'],
  ['src/Footer/UnifiedFooter.css', 'dist/Footer/'],
  ['src/Header/ProfilePictureModal.module.css', 'dist/Header/'],
  ['src/Header/UnifiedHeader.module.css', 'dist/Header/'],
  ['src/Shell/UnifiedPageShell.css', 'dist/Shell/'],
  ['src/Common/FeaturedGameCarousel/FeaturedGameCarousel.css', 'dist/Common/FeaturedGameCarousel/'],
  ['src/Common/ComingSoonCarousel/ComingSoonCarousel.css', 'dist/Common/ComingSoonCarousel/'],
  ['src/Common/ExploreGamesPanel/ExploreGamesPanel.css', 'dist/Common/ExploreGamesPanel/'],
  ['src/Common/GameBadgesOverlay/GameBadgesOverlay.css', 'dist/Common/GameBadgesOverlay/'],
  ['src/GamesExplorer/GameCard.css', 'dist/GamesExplorer/'],
  ['src/GamesExplorer/GameListRow.css', 'dist/GamesExplorer/'],
  ['src/GamesExplorer/ExplorerContentBar.css', 'dist/GamesExplorer/'],
  ['src/GamesExplorer/ExplorerSidebar.css', 'dist/GamesExplorer/'],
];

function copyFile(relativeSourcePath, relativeDestinationDir) {
  const sourcePath = path.join(packageRoot, relativeSourcePath);
  const destinationDir = path.join(packageRoot, relativeDestinationDir);
  fs.mkdirSync(destinationDir, { recursive: true });
  fs.copyFileSync(sourcePath, path.join(destinationDir, path.basename(sourcePath)));
}

function copyDirectory(relativeSourceDir, relativeDestinationDir) {
  const sourceDir = path.join(packageRoot, relativeSourceDir);
  const destinationDir = path.join(packageRoot, relativeDestinationDir);
  if (!fs.existsSync(sourceDir)) {
    return;
  }

  fs.mkdirSync(destinationDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(path.relative(packageRoot, sourcePath), path.relative(packageRoot, destinationPath));
      continue;
    }
    fs.copyFileSync(sourcePath, destinationPath);
  }
}

for (const [sourcePath, destinationDir] of fileCopies) {
  copyFile(sourcePath, destinationDir);
}

copyDirectory('src/Header/profiles', 'dist/Header/profiles');
