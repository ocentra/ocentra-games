import type { CSSProperties } from 'react';
import CardClubFilled from '@/Images/BgCards/Fullcard/256/CardClubFilled.png';
import CardClubHollow from '@/Images/BgCards/Fullcard/256/CardClubHollow.png';
import CardDiamondFilled from '@/Images/BgCards/Fullcard/256/CardDiamondFilled.png';
import CardDiamondHollow from '@/Images/BgCards/Fullcard/256/CardDiamondHollow.png';
import CardHeartFilled from '@/Images/BgCards/Fullcard/256/CardHeartFilled.png';
import CardHeartHollow from '@/Images/BgCards/Fullcard/256/CardHeartHollow.png';
import CardSpadeFilled from '@/Images/BgCards/Fullcard/256/CardSpadeFilled.png';
import CardSpadeHollow from '@/Images/BgCards/Fullcard/256/CardSpadeHollow.png';
import ClubFilled from '@/Images/BgCards/WithoutCircles/256/ClubFilled.png';
import ClubHollow from '@/Images/BgCards/WithoutCircles/256/ClubHollow.png';
import DiamondFilled from '@/Images/BgCards/WithoutCircles/256/DiamondFilled.png';
import DiamondHollow from '@/Images/BgCards/WithoutCircles/256/DiamondHollow.png';
import HeartFilled from '@/Images/BgCards/WithoutCircles/256/HeartFilled.png';
import HeartHollow from '@/Images/BgCards/WithoutCircles/256/HeartHollow.png';
import SpadeFilled from '@/Images/BgCards/WithoutCircles/256/SpadeFilled.png';
import SpadeHollow from '@/Images/BgCards/WithoutCircles/256/SpadeHollow.png';
import ClubWithCirclesFilled from '@/Images/BgCards/with circles/256/ClubWithCirclesFilled.png';
import ClubWithCirclesHollow from '@/Images/BgCards/with circles/256/ClubWithCirclesHollow.png';
import DiamondWithCirclesFilled from '@/Images/BgCards/with circles/256/DiamondWithCirclesFilled.png';
import DiamondWithCirclesHollow from '@/Images/BgCards/with circles/256/DiamondWithCirclesHollow.png';
import HeartWithCirclesFilled from '@/Images/BgCards/with circles/256/HeartWithCirclesFilled.png';
import HeartWithCirclesHollow from '@/Images/BgCards/with circles/256/HeartWithCirclesHollow.png';
import SpadeWithCirclesFilled from '@/Images/BgCards/with circles/256/SpadeWithCirclesFilled.png';
import SpadeWithCirclesHollow from '@/Images/BgCards/with circles/256/SpadeWithCirclesHollow.png';
import './CardGameTemplateBackdrop.css';

type BackdropLayer = {
  src: string;
  left: string;
  top: string;
  width: string;
  rotate: string;
  opacity: number;
  zIndex: number;
  mixBlendMode: CSSProperties['mixBlendMode'];
  filter?: string;
};

const BACKDROP_LAYERS: BackdropLayer[] = [
  {
    src: CardSpadeFilled,
    left: '10%',
    top: '14%',
    width: 'clamp(8rem, 16vw, 18rem)',
    rotate: '-14deg',
    opacity: 0.18,
    zIndex: 1,
    mixBlendMode: 'screen',
  },
  {
    src: CardHeartHollow,
    left: '90%',
    top: '14%',
    width: 'clamp(8rem, 16vw, 18rem)',
    rotate: '12deg',
    opacity: 0.16,
    zIndex: 1,
    mixBlendMode: 'screen',
  },
  {
    src: CardDiamondFilled,
    left: '10%',
    top: '84%',
    width: 'clamp(8rem, 16vw, 18rem)',
    rotate: '10deg',
    opacity: 0.16,
    zIndex: 1,
    mixBlendMode: 'screen',
  },
  {
    src: CardClubHollow,
    left: '90%',
    top: '84%',
    width: 'clamp(8rem, 16vw, 18rem)',
    rotate: '-10deg',
    opacity: 0.16,
    zIndex: 1,
    mixBlendMode: 'screen',
  },
  {
    src: CardClubFilled,
    left: '50%',
    top: '12%',
    width: 'clamp(7rem, 12vw, 13rem)',
    rotate: '22deg',
    opacity: 0.1,
    zIndex: 1,
    mixBlendMode: 'screen',
  },
  {
    src: CardDiamondHollow,
    left: '50%',
    top: '88%',
    width: 'clamp(7rem, 12vw, 13rem)',
    rotate: '-22deg',
    opacity: 0.1,
    zIndex: 1,
    mixBlendMode: 'screen',
  },
  {
    src: SpadeWithCirclesFilled,
    left: '50%',
    top: '14%',
    width: 'clamp(6rem, 12vw, 14rem)',
    rotate: '0deg',
    opacity: 0.18,
    zIndex: 2,
    mixBlendMode: 'screen',
    filter: 'saturate(1.05)',
  },
  {
    src: HeartWithCirclesHollow,
    left: '12%',
    top: '50%',
    width: 'clamp(6rem, 12vw, 14rem)',
    rotate: '-18deg',
    opacity: 0.14,
    zIndex: 2,
    mixBlendMode: 'screen',
  },
  {
    src: DiamondWithCirclesFilled,
    left: '88%',
    top: '50%',
    width: 'clamp(6rem, 12vw, 14rem)',
    rotate: '18deg',
    opacity: 0.14,
    zIndex: 2,
    mixBlendMode: 'screen',
  },
  {
    src: ClubWithCirclesHollow,
    left: '50%',
    top: '86%',
    width: 'clamp(6rem, 12vw, 14rem)',
    rotate: '0deg',
    opacity: 0.15,
    zIndex: 2,
    mixBlendMode: 'screen',
  },
  {
    src: ClubWithCirclesFilled,
    left: '20%',
    top: '50%',
    width: 'clamp(5.5rem, 10vw, 12rem)',
    rotate: '-14deg',
    opacity: 0.13,
    zIndex: 2,
    mixBlendMode: 'screen',
  },
  {
    src: DiamondWithCirclesHollow,
    left: '80%',
    top: '50%',
    width: 'clamp(5.5rem, 10vw, 12rem)',
    rotate: '14deg',
    opacity: 0.13,
    zIndex: 2,
    mixBlendMode: 'screen',
  },
  {
    src: HeartWithCirclesFilled,
    left: '50%',
    top: '24%',
    width: 'clamp(5.5rem, 10vw, 12rem)',
    rotate: '10deg',
    opacity: 0.13,
    zIndex: 2,
    mixBlendMode: 'screen',
  },
  {
    src: SpadeWithCirclesHollow,
    left: '50%',
    top: '76%',
    width: 'clamp(5.5rem, 10vw, 12rem)',
    rotate: '-10deg',
    opacity: 0.13,
    zIndex: 2,
    mixBlendMode: 'screen',
  },
  {
    src: SpadeFilled,
    left: '23%',
    top: '26%',
    width: 'clamp(3.5rem, 7vw, 6.5rem)',
    rotate: '-8deg',
    opacity: 0.24,
    zIndex: 3,
    mixBlendMode: 'normal',
  },
  {
    src: HeartFilled,
    left: '77%',
    top: '26%',
    width: 'clamp(3.5rem, 7vw, 6.5rem)',
    rotate: '8deg',
    opacity: 0.22,
    zIndex: 3,
    mixBlendMode: 'normal',
  },
  {
    src: DiamondHollow,
    left: '23%',
    top: '74%',
    width: 'clamp(3.5rem, 7vw, 6.5rem)',
    rotate: '8deg',
    opacity: 0.22,
    zIndex: 3,
    mixBlendMode: 'normal',
  },
  {
    src: ClubFilled,
    left: '77%',
    top: '74%',
    width: 'clamp(3.5rem, 7vw, 6.5rem)',
    rotate: '-8deg',
    opacity: 0.22,
    zIndex: 3,
    mixBlendMode: 'normal',
  },
  {
    src: SpadeHollow,
    left: '50%',
    top: '42%',
    width: 'clamp(3rem, 6vw, 6rem)',
    rotate: '-4deg',
    opacity: 0.18,
    zIndex: 3,
    mixBlendMode: 'normal',
  },
  {
    src: HeartHollow,
    left: '50%',
    top: '58%',
    width: 'clamp(3rem, 6vw, 6rem)',
    rotate: '4deg',
    opacity: 0.18,
    zIndex: 3,
    mixBlendMode: 'normal',
  },
  {
    src: DiamondFilled,
    left: '34%',
    top: '50%',
    width: 'clamp(3rem, 6vw, 6rem)',
    rotate: '-6deg',
    opacity: 0.18,
    zIndex: 3,
    mixBlendMode: 'normal',
  },
  {
    src: ClubHollow,
    left: '66%',
    top: '50%',
    width: 'clamp(3rem, 6vw, 6rem)',
    rotate: '6deg',
    opacity: 0.18,
    zIndex: 3,
    mixBlendMode: 'normal',
  },
  {
    src: CardSpadeHollow,
    left: '50%',
    top: '32%',
    width: 'clamp(10rem, 18vw, 21rem)',
    rotate: '-2deg',
    opacity: 0.06,
    zIndex: 0,
    mixBlendMode: 'screen',
    filter: 'blur(0.35rem)',
  },
  {
    src: CardHeartFilled,
    left: '50%',
    top: '68%',
    width: 'clamp(10rem, 18vw, 21rem)',
    rotate: '2deg',
    opacity: 0.05,
    zIndex: 0,
    mixBlendMode: 'screen',
    filter: 'blur(0.35rem)',
  },
];

export default function CardGameTemplateBackdrop() {
  return (
    <div className="cardgame-template-backdrop" aria-hidden="true">
      <div className="cardgame-template-backdrop__glow" />
      <div className="cardgame-template-backdrop__cards">
        {BACKDROP_LAYERS.map((layer, index) => (
          <img
            key={`${layer.src}-${index}`}
            className="cardgame-template-backdrop__card"
            src={layer.src}
            alt=""
            style={{
              left: layer.left,
              top: layer.top,
              width: layer.width,
              opacity: layer.opacity,
              zIndex: layer.zIndex,
              mixBlendMode: layer.mixBlendMode,
              filter: layer.filter,
              transform: `translate(-50%, -50%) rotate(${layer.rotate})`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
