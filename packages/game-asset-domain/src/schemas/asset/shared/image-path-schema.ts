import { schema } from '@ocentra/schema-domain/effect-builder';

export const ImagePathSchema = schema
  .string()
  .regex(/^Resources\/GameMode\/CardGames\/Images\/.+\.png$/, {
    message: 'imagePath must be a Resources/GameMode/CardGames/Images/*.png path',
  });

