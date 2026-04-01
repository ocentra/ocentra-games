import Placeholder0 from './images/placeholders/image0.jpg';
import Placeholder1 from './images/placeholders/image1.jpg';
import Placeholder2 from './images/placeholders/image2.jpg';
import Placeholder3 from './images/placeholders/image3.jpg';
import Placeholder4 from './images/placeholders/image4.jpg';
import Placeholder5 from './images/placeholders/image5.jpg';
import Placeholder6 from './images/placeholders/image6.jpg';
import Placeholder7 from './images/placeholders/image7.jpg';
import Placeholder8 from './images/placeholders/image8.jpg';
import Placeholder9 from './images/placeholders/image9.jpg';
import Placeholder10 from './images/placeholders/image10.jpg';
import Placeholder11 from './images/placeholders/image11.jpg';
import Placeholder12 from './images/placeholders/image12.jpg';
import Placeholder13 from './images/placeholders/image13.jpg';
import Placeholder14 from './images/placeholders/image14.jpg';
import Placeholder15 from './images/placeholders/image15.jpg';
import Placeholder16 from './images/placeholders/image16.jpg';
import Placeholder17 from './images/placeholders/image17.jpg';
import Placeholder18 from './images/placeholders/image18.jpg';
import Placeholder19 from './images/placeholders/image19.jpg';
import Placeholder20 from './images/placeholders/image20.jpg';
import Placeholder21 from './images/placeholders/image21.jpg';
import Placeholder22 from './images/placeholders/image22.jpg';
import Placeholder23 from './images/placeholders/image23.jpg';
import Placeholder24 from './images/placeholders/image24.jpg';

export const placeholderImageUrls = [
  Placeholder0,
  Placeholder1,
  Placeholder2,
  Placeholder3,
  Placeholder4,
  Placeholder5,
  Placeholder6,
  Placeholder7,
  Placeholder8,
  Placeholder9,
  Placeholder10,
  Placeholder11,
  Placeholder12,
  Placeholder13,
  Placeholder14,
  Placeholder15,
  Placeholder16,
  Placeholder17,
  Placeholder18,
  Placeholder19,
  Placeholder20,
  Placeholder21,
  Placeholder22,
  Placeholder23,
  Placeholder24,
] as const;

export const placeholderImageCount = placeholderImageUrls.length;

export function getPlaceholderImageUrl(index: number): string {
  return placeholderImageUrls[((index % placeholderImageUrls.length) + placeholderImageUrls.length) % placeholderImageUrls.length];
}
