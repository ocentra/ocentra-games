import { z } from 'zod';

export const ImagePathSchema = z
  .string()
  .regex(/^Resources\/GameMode\/CardGames\/Images\/.+\.png$/, {
    message: 'imagePath must be a Resources/GameMode/CardGames/Images/*.png path',
  });

