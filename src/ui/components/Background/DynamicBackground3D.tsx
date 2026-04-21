import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { useThreeBase } from '@/ui/components/Background/ThreeBaseContext';
import * as THREE from 'three';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import {
  cardGame256SpadeFilledImageUrl,
  cardGame256SpadeHollowImageUrl,
  cardGame256HeartFilledImageUrl,
  cardGame256HeartHollowImageUrl,
  cardGame256DiamondFilledImageUrl,
  cardGame256DiamondHollowImageUrl,
  cardGame256ClubFilledImageUrl,
  cardGame256ClubHollowImageUrl,
  cardGameWOCSpadeFilledImageUrl,
  cardGameWOCSpadeHollowImageUrl,
  cardGameWOCHeartFilledImageUrl,
  cardGameWOCHeartHollowImageUrl,
  cardGameWOCDiamondFilledImageUrl,
  cardGameWOCDiamondHollowImageUrl,
  cardGameWOCClubFilledImageUrl,
  cardGameWOCClubHollowImageUrl,
  cardGameSpadeWithCirclesFilledImageUrl,
  cardGameSpadeWithCirclesHollowImageUrl,
  cardGameHeartWithCirclesFilledImageUrl,
  cardGameHeartWithCirclesHollowImageUrl,
  cardGameDiamondWithCirclesFilledImageUrl,
  cardGameDiamondWithCirclesHollowImageUrl,
  cardGameClubWithCirclesFilledImageUrl,
  cardGameClubWithCirclesHollowImageUrl,
} from '@ocentra/app-assets/cardgame';
import './DynamicBackground3D.css';

const CARD_ASSETS = {
  Fullcard: {
    Spade: { filled: cardGame256SpadeFilledImageUrl, hollow: cardGame256SpadeHollowImageUrl },
    Heart: { filled: cardGame256HeartFilledImageUrl, hollow: cardGame256HeartHollowImageUrl },
    Diamond: { filled: cardGame256DiamondFilledImageUrl, hollow: cardGame256DiamondHollowImageUrl },
    Club: { filled: cardGame256ClubFilledImageUrl, hollow: cardGame256ClubHollowImageUrl },
  },
  WithoutCircles: {
    Spade: { filled: cardGameWOCSpadeFilledImageUrl, hollow: cardGameWOCSpadeHollowImageUrl },
    Heart: { filled: cardGameWOCHeartFilledImageUrl, hollow: cardGameWOCHeartHollowImageUrl },
    Diamond: { filled: cardGameWOCDiamondFilledImageUrl, hollow: cardGameWOCDiamondHollowImageUrl },
    Club: { filled: cardGameWOCClubFilledImageUrl, hollow: cardGameWOCClubHollowImageUrl },
  },
  WithCircles: {
    Spade: { filled: cardGameSpadeWithCirclesFilledImageUrl, hollow: cardGameSpadeWithCirclesHollowImageUrl },
    Heart: { filled: cardGameHeartWithCirclesFilledImageUrl, hollow: cardGameHeartWithCirclesHollowImageUrl },
    Diamond: { filled: cardGameDiamondWithCirclesFilledImageUrl, hollow: cardGameDiamondWithCirclesHollowImageUrl },
    Club: { filled: cardGameClubWithCirclesFilledImageUrl, hollow: cardGameClubWithCirclesHollowImageUrl },
  },
} as const;

const log = MainAppLogger.instance;
log.register(import.meta.url);

const LOG_UI_BACKGROUND = false;

const logDebug = (message: string, data?: unknown) => {
    log.logDebug(`[DynamicBackground3D] ${message}`, getStackTrace(), data, LOG_UI_BACKGROUND);
};

const logError = (message: string, error?: unknown) => {
    log.logError(`[DynamicBackground3D] ${message}`, getStackTrace(), error, LOG_UI_BACKGROUND);
};



declare global {
    interface Window {
        dynamicBgRotate?: () => void;
        dynamicBgReset?: () => void;
        dynamicBgForceCleanup?: () => void;
    }
}

const MIN_CARD_SIZE = 20;
const MAX_CARD_SIZE = 80;
const MAX_CARDS = 300;
const LARGE_CARD_CHANCE = 0.1;
const CARD_SCALE_FACTOR = 1.0;

const CARD_TWINKLE_RATE = 0.17;
const SHOOTING_STAR_TWINKLE_RATE = 12.0;

const ROTATION_DURATION = 1.2;
const MAX_ROTATION_ANGLE = Math.PI * 0.66;

const CAMERA_POSITION_Z = 500;
const NEAR_CLIPPING_PLANE = 10;
const FAR_CLIPPING_PLANE = 20000;
const CARD_SPREAD_XY = 1000;
const CARD_Z_RANGE = 500;

const MAX_SHOOTING_STARS = 15;
const MAX_SHOOTING_STAR_DISTANCE = 300;
const SHOOTING_STAR_SPEED = 0.005;
const SHOOTING_STAR_CHANCE = 1;

const BOTTOM_COLOR_HEX = 'rgba(0, 5, 15, 0.96)';
const TOP_COLOR_HEX = 'rgba(0, 89, 255, 0.42)';
const BASE_BACKGROUND_COLOR = 'rgb(0, 110, 104)';
const GRADIENT_CURVE_POWER = 3;

const SHOOTING_STAR_COLORS_HEX = {
    white: '#FFFFFF',
    blue: '#268BD2',
    purple: '#9333EA',
    green: '#22C55E',
    yellow: '#EAB308',
    red: '#EF4444'
};

const CARD_SUITS = ['Spade', 'Heart', 'Diamond', 'Club'];
const CARD_STYLES = ['Fullcard', 'WithoutCircles', 'WithCircles'];

interface TextureCache {
    [key: string]: {
        texture: THREE.Texture;
        aspectRatio: number;
    };
}

const moduleTextureCache: TextureCache = {};

interface CardData {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    baseOpacity: number;
    radius: number;
    size: number;
    color: THREE.Color;
    id: number;
    suit: string;
    style: string;
    isFilled: boolean;
    fillProgress: number;
    fillDirection: number;
    aspectRatio: number;
    currentSize: number;
    materialIndex: number;
    lodLevel: number;
    distanceToCamera: number;
    randomOffset: number;
}

interface ShootingStarData {
    sprite: THREE.Sprite;
    line: THREE.Line;
    lineGeometry: THREE.BufferGeometry;
    startParticleId: number;
    endParticleId: number;
    progress: number;
    speed: number;
    color: THREE.Color;
    spawnFrame?: number;
}

interface ShootingStarRefData extends Array<ShootingStarData> {
    sharedSpriteMaterial?: THREE.SpriteMaterial;
}

const BACKGROUND_RESET_INTERVAL = 180;

interface RotationControlAPI {
    rotate: () => void;
    reset?: () => void;
}

export type { RotationControlAPI };

logDebug('About to define DynamicBackground3D component');

const gradientVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
        gl_Position.z = gl_Position.w - 0.0001;
    }
`;

const gradientFragmentShader = `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float topAlpha;
    uniform float bottomAlpha;
    uniform float curvePower;
    varying vec2 vUv;
    void main() {
        float t = pow(vUv.y, curvePower);
        vec3 color = mix(bottomColor, topColor, t);
        float alpha = mix(bottomAlpha, topAlpha, t);
        gl_FragColor = vec4(color, alpha);
    }
`;

interface DynamicBackground3DProps {
    controlRef?: { current: RotationControlAPI | null };
    onReady?: () => void;
}

const DynamicBackground3D: React.FC<DynamicBackground3DProps> = ({ controlRef, onReady }) => {
    logDebug('Component function called');
    const threeBase = useThreeBase();
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const groupRef = useRef<THREE.Group | null>(null);
    const cardsRef = useRef<{
        sprites: THREE.Sprite[];
        materials: THREE.SpriteMaterial[];
        data: CardData[];
    }>({ sprites: [], materials: [], data: [] });
    const textureCacheRef = useRef<TextureCache>({});

    const shootingStarsRef = useRef<ShootingStarRefData>([]);

    const rotationAnimationRef = useRef<{
        active: boolean;
        startTime: number;
        duration: number;
        startRotation: THREE.Euler;
        targetRotation: THREE.Euler;
    }>({
        active: false,
        startTime: 0,
        duration: ROTATION_DURATION,
        startRotation: new THREE.Euler(),
        targetRotation: new THREE.Euler(),
    });

    const currentStarColorRef = useRef(new THREE.Color(SHOOTING_STAR_COLORS_HEX.blue));
    const clock = useMemo(() => new THREE.Clock(), []);

    const performFullReset = useCallback(() => {
        if (!groupRef.current || !cardsRef.current.data.length) return;

        logDebug('Performing full animation reset for stability');

        const data = cardsRef.current.data;
        for (let i = 0; i < data.length; i++) {
            const c = data[i];
            c.position.set(
                (Math.random() - 0.5) * CARD_SPREAD_XY * 0.8,
                (Math.random() - 0.5) * CARD_SPREAD_XY * 0.8,
                (Math.random() - 0.5) * CARD_Z_RANGE * 0.5
            );
            c.velocity.set(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                0
            );
            c.fillProgress = Math.random();
            c.fillDirection = Math.random() > 0.5 ? 1 : -1;
        }

        shootingStarsRef.current.forEach(star => {
            if (groupRef.current) {
                groupRef.current.remove(star.sprite);
                groupRef.current.remove(star.line);
            }
            star.lineGeometry.dispose();
            if (star.sprite.material) {
                const material = star.sprite.material as THREE.SpriteMaterial;
                if (material.map) {
                    material.map.dispose();
                }
                material.dispose();
            }
            (star.line.material as THREE.Material).dispose();
        });
        shootingStarsRef.current.length = 0;

        if (groupRef.current) {
            groupRef.current.rotation.set(0, 0, 0);
        }

        rotationAnimationRef.current.active = false;

        performanceRef.current.lastFullResetTime = clock.getElapsedTime();
        performanceRef.current.frameCount = 0;
        performanceRef.current.accumulatedTime = 0;
        performanceRef.current.lastShootingStarCleanup = clock.getElapsedTime();
        performanceRef.current.lastPartialResetTime = clock.getElapsedTime();

    }, [clock]);

    const performanceRef = useRef({
        frameCount: 0,
        lastResetTime: 0,
        lastDeltaTime: 0,
        accumulatedTime: 0,
        maxAccumulatedTime: 1.0,
        lastFullResetTime: 0,
        fullResetInterval: 30 * 60,
        lastShootingStarCleanup: 0,
        lastPartialResetTime: 0,
        isResetting: false,
        resetStartTime: 0,
        resetDuration: 2.0
    });

    const forceCleanup = useCallback(() => {
        logDebug('Forcing WebGL context cleanup');

        Object.values(textureCacheRef.current).forEach(cached => {
            try {
                cached.texture.dispose();
            } catch (e) {
                logError('Error disposing texture', e);
            }
        });
        textureCacheRef.current = {};

        if (cardsRef.current.sprites) {
            cardsRef.current.sprites.forEach(sprite => {
                try {
                    if (groupRef.current) {
                        groupRef.current.remove(sprite);
                    }
                } catch (e) {
                    logError('Error removing sprite from group', e);
                }
            });
        }
        if (shootingStarsRef.current) {
            shootingStarsRef.current.forEach(star => {
                try {
                    if (groupRef.current) {
                        groupRef.current.remove(star.sprite);
                        groupRef.current.remove(star.line);
                    }
                    star.lineGeometry.dispose();
                    if (star.sprite.material) {
                        const material = star.sprite.material as THREE.SpriteMaterial;
                        if (material.map) {
                            material.map.dispose();
                        }
                        material.dispose();
                    }
                    (star.line.material as THREE.Material).dispose();
                } catch (e) {
                    logError('Error disposing star', e);
                }
            });
            shootingStarsRef.current.length = 0;
        }

        logDebug('Forced cleanup completed');
    }, []);

    const startRandomRotation = useCallback(() => {
        if (!groupRef.current) return;

        const currentRotation = groupRef.current.rotation.clone();
        rotationAnimationRef.current.startRotation = new THREE.Euler(
            currentRotation.x,
            currentRotation.y,
            currentRotation.z
        );

        const targetX = currentRotation.x + (Math.random() * 2 - 1) * MAX_ROTATION_ANGLE;
        const targetY = currentRotation.y + (Math.random() * 2 - 1) * MAX_ROTATION_ANGLE;
        const targetZ = currentRotation.z + (Math.random() * 2 - 1) * MAX_ROTATION_ANGLE * 0.5;

        rotationAnimationRef.current.targetRotation = new THREE.Euler(targetX, targetY, targetZ);
        rotationAnimationRef.current.startTime = clock.getElapsedTime();
        rotationAnimationRef.current.duration = ROTATION_DURATION;
        rotationAnimationRef.current.active = true;
    }, [clock]);

    const rotationAPI = useMemo(() => ({
        rotate: () => {
            startRandomRotation();
        },
        reset: () => {
            performFullReset();
        },
        forceCleanup: () => {
            forceCleanup();
        }
    }), [startRandomRotation, performFullReset, forceCleanup]);

    useEffect(() => {
        if (controlRef) {
            controlRef.current = rotationAPI;
        }
    }, [controlRef, rotationAPI]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.dynamicBgRotate = rotationAPI.rotate;
            window.dynamicBgReset = rotationAPI.reset;
            window.dynamicBgForceCleanup = rotationAPI.forceCleanup;
        }

        return () => {
            if (typeof window !== 'undefined') {
                delete window.dynamicBgRotate;
                delete window.dynamicBgReset;
                delete window.dynamicBgForceCleanup;
            }
        };
    }, [rotationAPI]);

    const createStarTexture = (): THREE.Texture => {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d')!;
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2;

        const gradient = context.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, radius
        );
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.7, 'rgba(200,200,255,0.5)');
        gradient.addColorStop(1, 'rgba(150,150,255,0)');

        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);

        const highlightRadius = radius * 0.3;
        const highlightX = centerX - radius * 0.2;
        const highlightY = centerY - radius * 0.2;
        const highlightGradient = context.createRadialGradient(
            highlightX, highlightY, 0,
            highlightX, highlightY, highlightRadius
        );
        highlightGradient.addColorStop(0, 'rgba(255,255,255,0.9)');
        highlightGradient.addColorStop(1, 'rgba(255,255,255,0)');

        context.globalCompositeOperation = 'lighten';
        context.fillStyle = highlightGradient;
        context.beginPath();
        context.arc(highlightX, highlightY, highlightRadius, 0, Math.PI * 2);
        context.fill();

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    };



    const loadCardTexture = useCallback(async (url: string): Promise<{ texture: THREE.Texture, aspectRatio: number }> => {
        if (moduleTextureCache[url]) {
            return Promise.resolve(moduleTextureCache[url]);
        }

        logDebug('Loading texture', { url });

        return new Promise((resolve) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                url,
                (texture: THREE.Texture) => {
                    logDebug('Successfully loaded texture', { url });
                    texture.needsUpdate = true;
                    texture.generateMipmaps = true;
                    texture.minFilter = THREE.LinearMipmapLinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.wrapS = THREE.ClampToEdgeWrapping;
                    texture.wrapT = THREE.ClampToEdgeWrapping;

                    const image = texture.image as HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
                    const aspectRatio = image && 'width' in image && 'height' in image
                        ? image.width / image.height
                        : 1.0;

                    moduleTextureCache[url] = { texture, aspectRatio };
                    resolve({ texture, aspectRatio });
                },
                undefined,
                (error: unknown) => {
                    logError('Failed to load texture', { url, error });
                    const canvas = document.createElement('canvas');
                    canvas.width = 128;
                    canvas.height = 128;
                    const context = canvas.getContext('2d')!;

                    const suitColors: Record<string, string> = {
                        Spade: '#000000',
                        Heart: '#FF0000',
                        Diamond: '#FF0000',
                        Club: '#000000'
                    };

                    let suit = 'Spade';
                    if (url.includes('Heart')) {
                        suit = 'Heart';
                    } else if (url.includes('Diamond')) {
                        suit = 'Diamond';
                    } else if (url.includes('Club')) {
                        suit = 'Club';
                    }

                    context.fillStyle = suitColors[suit];
                    context.fillRect(0, 0, 128, 128);
                    context.strokeStyle = '#FFFFFF';
                    context.lineWidth = 4;
                    context.strokeRect(0, 0, 128, 128);

                    const fallbackTexture = new THREE.CanvasTexture(canvas);
                    fallbackTexture.needsUpdate = true;
                    fallbackTexture.generateMipmaps = true;
                    fallbackTexture.minFilter = THREE.LinearMipmapLinearFilter;
                    fallbackTexture.magFilter = THREE.LinearFilter;
                    fallbackTexture.wrapS = THREE.ClampToEdgeWrapping;
                    fallbackTexture.wrapT = THREE.ClampToEdgeWrapping;

                    moduleTextureCache[url] = { texture: fallbackTexture, aspectRatio: 1.0 };
                    resolve({ texture: fallbackTexture, aspectRatio: 1.0 });
                }
            );
        });
    }, []);

    const createMoneyStarTexture = useCallback((emoji = '💸') => {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        ctx.font = '100px "Segoe UI Emoji"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, size / 2, size / 2);
        return new THREE.CanvasTexture(canvas);
    }, []);

    const findNextParticle = useCallback((currentId: number): number | null => {
        const data = cardsRef.current.data;
        if (data.length < 2) return null;

        const currentParticle = data[currentId];
        const maxAttempts = 20;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const candidateId = Math.floor(Math.random() * data.length);
            if (candidateId === currentId) continue;

            const candidateParticle = data[candidateId];
            const distance = currentParticle.position.distanceTo(candidateParticle.position);

            if (distance > 100 && distance < MAX_SHOOTING_STAR_DISTANCE) {
                return candidateId;
            }
        }

        for (let i = 0; i < data.length; i++) {
            if (i !== currentId) {
                return i;
            }
        }

        return null;
    }, []);

    const createShootingStar = useCallback(() => {
        const data = cardsRef.current.data;
        if (data.length === 0) return null;

        const startParticleId = Math.floor(Math.random() * data.length);
        const startParticle = data[startParticleId];

        const endParticleId = findNextParticle(startParticleId);
        if (endParticleId === null) return null;

        const lineGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(2 * 3);
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const lineMaterial = new THREE.LineBasicMaterial({
            color: currentStarColorRef.current,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const line = new THREE.Line(lineGeometry, lineMaterial);

        const emojis = ['$', '💸', '💰', '🪙',];
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        const starTexture = createMoneyStarTexture(emoji);

        const spriteMaterial = new THREE.SpriteMaterial({
            map: starTexture,
            color: 0xffffff,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
            opacity: 0,
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.setScalar(0);
        sprite.position.copy(startParticle.position);

        if (groupRef.current) {
            groupRef.current.add(sprite);
            groupRef.current.add(line);
        }

        const star: ShootingStarData = {
            sprite,
            line,
            lineGeometry,
            startParticleId,
            endParticleId,
            progress: 0,
            speed: SHOOTING_STAR_SPEED,
            color: currentStarColorRef.current.clone(),
            spawnFrame: performanceRef.current.frameCount,
        };

        shootingStarsRef.current.push(star);
        return star;
    }, [createMoneyStarTexture, findNextParticle]);

    const updateShootingStars = useCallback((delta: number) => {
        const stars = shootingStarsRef.current;
        const elapsed = clock.getElapsedTime();
        const activeStars: ShootingStarData[] = [];

        for (let i = 0; i < stars.length; i++) {
            const star = stars[i];

            star.progress += delta * star.speed * SHOOTING_STAR_TWINKLE_RATE;

            if (star.progress >= 1.0) {
                if (groupRef.current) {
                    groupRef.current.remove(star.sprite);
                    groupRef.current.remove(star.line);
                }
                star.lineGeometry.dispose();
                if (star.sprite.material) {
                    const material = star.sprite.material as THREE.SpriteMaterial;
                    if (material.map) {
                        material.map.dispose();
                    }
                    material.dispose();
                }
                (star.line.material as THREE.Material).dispose();
                continue;
            }

            activeStars.push(star);

            const startParticle = cardsRef.current.data[star.startParticleId];
            const endParticle = cardsRef.current.data[star.endParticleId];

            if (startParticle && endParticle) {
                const t = star.progress;
                star.sprite.position.lerpVectors(
                    startParticle.position,
                    endParticle.position,
                    t
                );

                let fadeInFactor = 1.0;
                if (star.spawnFrame !== undefined) {
                    const framesSinceSpawn = performanceRef.current.frameCount - star.spawnFrame;
                    if (framesSinceSpawn < 10) {
                        fadeInFactor = framesSinceSpawn / 10;
                    }
                }

                const fadeInOut = Math.sin(t * Math.PI);
                const effectiveScale = fadeInOut * 30 * fadeInFactor;
                const effectiveOpacity = fadeInOut * fadeInFactor;

                star.sprite.scale.setScalar(effectiveScale);
                (star.sprite.material as THREE.SpriteMaterial).opacity = effectiveOpacity;

                const twinkle = (Math.sin(elapsed * SHOOTING_STAR_TWINKLE_RATE * 2 + i) + 1) * 0.5;
                const brightness = 0.7 + (twinkle * 0.3);
                star.sprite.material.color.setRGB(brightness, brightness, brightness);

                const positions = star.lineGeometry.attributes.position;
                if (positions instanceof THREE.BufferAttribute) {
                    const startPos = startParticle.position;
                    const currentPos = star.sprite.position;
                    positions.setXYZ(0, startPos.x, startPos.y, startPos.z);
                    positions.setXYZ(1, currentPos.x, currentPos.y, currentPos.z);
                    positions.needsUpdate = true;
                }

                (star.line.material as THREE.LineBasicMaterial).opacity = effectiveOpacity * 0.3;
            }
        }

        shootingStarsRef.current = activeStars as ShootingStarRefData;
    }, [clock]);

    const handleKeyPress = useCallback((e: KeyboardEvent) => {
        if (!e.key) return;

        let newColorHex: string | null = null;
        switch (e.key.toLowerCase()) {
            case '1': newColorHex = SHOOTING_STAR_COLORS_HEX.white; break;
            case '2': newColorHex = SHOOTING_STAR_COLORS_HEX.blue; break;
            case '3': newColorHex = SHOOTING_STAR_COLORS_HEX.purple; break;
            case '4': newColorHex = SHOOTING_STAR_COLORS_HEX.green; break;
            case '5': newColorHex = SHOOTING_STAR_COLORS_HEX.yellow; break;
            case '6': newColorHex = SHOOTING_STAR_COLORS_HEX.red; break;
        }
        if (newColorHex) {
            currentStarColorRef.current.set(newColorHex);
            if (shootingStarsRef.current.sharedSpriteMaterial) {
                shootingStarsRef.current.sharedSpriteMaterial.color.set(newColorHex);
            }
            shootingStarsRef.current.forEach(star => {
                (star.sprite.material as THREE.SpriteMaterial).color.set(newColorHex!);
                (star.line.material as THREE.LineBasicMaterial).color.set(newColorHex!);
                star.color.set(newColorHex!);
            });
        }
    }, []);

    useEffect(() => {
        if (!threeBase?.isReady) return;
        logDebug('useEffect initializing with ThreeBase');

        const starTexture = createStarTexture();
        logDebug('Star texture created');

        const scene = new THREE.Scene();
        sceneRef.current = scene;
        logDebug('Scene created');

        const camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            NEAR_CLIPPING_PLANE,
            FAR_CLIPPING_PLANE
        );
        camera.position.z = CAMERA_POSITION_Z;
        cameraRef.current = camera;
        logDebug('Camera created');

        const group = new THREE.Group();
        groupRef.current = group;
        scene.add(group);
        logDebug('Group created and added to scene');
        logDebug('Group initialized', { group });

        const parseRGBA = (rgbaString: string) => {
            const matches = rgbaString.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,?\s*(\d*\.?\d*)?/i);
            if (matches) {
                const r = parseInt(matches[1], 10) / 255;
                const g = parseInt(matches[2], 10) / 255;
                const b = parseInt(matches[3], 10) / 255;
                const a = matches[4] ? parseFloat(matches[4]) : 1.0;
                return { color: new THREE.Color(r, g, b), alpha: a };
            }
            return { color: new THREE.Color(rgbaString), alpha: 1.0 };
        };

        const topColorInfo = parseRGBA(TOP_COLOR_HEX);
        const bottomColorInfo = parseRGBA(BOTTOM_COLOR_HEX);
        logDebug('Colors parsed');

        const gradientMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: topColorInfo.color },
                bottomColor: { value: bottomColorInfo.color },
                topAlpha: { value: topColorInfo.alpha },
                bottomAlpha: { value: bottomColorInfo.alpha },
                curvePower: { value: GRADIENT_CURVE_POWER }
            },
            vertexShader: gradientVertexShader,
            fragmentShader: gradientFragmentShader,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.NormalBlending,
        });
        const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const planeGeometry = new THREE.PlaneGeometry(2, 2);
        const gradientPlane = new THREE.Mesh(planeGeometry, gradientMaterial);
        const gradientScene = new THREE.Scene();
        gradientScene.add(gradientPlane);
        logDebug('Gradient background created');

        const sharedMaterials: THREE.SpriteMaterial[] = [];
        const materialMap: { [key: string]: number } = {};

        CARD_STYLES.forEach(style => {
            CARD_SUITS.forEach(suit => {
                const filledMaterial = new THREE.SpriteMaterial({
                    color: 0x444444,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    sizeAttenuation: true,
                });
                const filledKey = `${style}-${suit}-filled`;
                materialMap[filledKey] = sharedMaterials.length;
                sharedMaterials.push(filledMaterial);

                const hollowMaterial = new THREE.SpriteMaterial({
                    color: 0x444444,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    sizeAttenuation: true,
                });
                const hollowKey = `${style}-${suit}-hollow`;
                materialMap[hollowKey] = sharedMaterials.length;
                sharedMaterials.push(hollowMaterial);
            });
        });

        logDebug('Created shared materials for card types', { count: sharedMaterials.length });

        const cardDataArray: CardData[] = [];
        const cardSprites: THREE.Sprite[] = [];

        for (let i = 0; i < MAX_CARDS; i++) {
            const isLarge = Math.random() < LARGE_CARD_CHANCE;
            const radius = isLarge
                ? Math.random() * (MAX_CARD_SIZE - 30) + 30
                : Math.random() * (30 - MIN_CARD_SIZE) + MIN_CARD_SIZE;

            const size = radius * CARD_SCALE_FACTOR;

            const x = (Math.random() - 0.5) * CARD_SPREAD_XY;
            const y = (Math.random() - 0.5) * CARD_SPREAD_XY;
            const z = (Math.random() - 0.5) * CARD_Z_RANGE;

            const suit = CARD_SUITS[Math.floor(Math.random() * CARD_SUITS.length)];
            const style = CARD_STYLES[Math.floor(Math.random() * CARD_STYLES.length)];
            const isFilled = Math.random() > 0.5;

            const baseOpacity = Math.random() * 0.7 + 0.3;

            const materialKey = `${style}-${suit}-${isFilled ? 'filled' : 'hollow'}`;
            const materialIndex = materialMap[materialKey];

            const randomOffset = Math.random() * Math.PI * 2;

            const initialFillProgress = Math.random();
            const initialFillDirection = Math.random() > 0.5 ? 1 : -1;

            cardDataArray.push({
                position: new THREE.Vector3(x, y, z),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.2,
                    (Math.random() - 0.5) * 0.2,
                    0
                ),
                baseOpacity: baseOpacity,
                radius: radius,
                size: size,
                color: new THREE.Color(1, 1, 1),
                id: i,
                suit: suit,
                style: style,
                isFilled: isFilled,
                fillProgress: initialFillProgress,
                fillDirection: initialFillDirection,
                aspectRatio: 1.0,
                currentSize: size,
                materialIndex: materialIndex,
                lodLevel: 0,
                distanceToCamera: 0,
                randomOffset: randomOffset
            });

            const material = sharedMaterials[materialIndex];
            const sprite = new THREE.Sprite(material);
            sprite.position.set(x, y, z);
            sprite.scale.set(size, size, 1);
            cardSprites.push(sprite);
            group.add(sprite);
        }
        cardsRef.current.data = cardDataArray;
        cardsRef.current.sprites = cardSprites;
        cardsRef.current.materials = sharedMaterials;
        logDebug('Created cards', { cardCount: cardDataArray.length, materialCount: sharedMaterials.length });

        logDebug('Starting texture loading');

        const loadTextures = async () => {
            logDebug('Starting to load textures for card types');
            let loadedCount = 0;
            let errorCount = 0;

            const timeoutId = setTimeout(() => {
                logDebug('Texture loading timeout, calling onReady anyway');
                if (onReady) {
                    onReady();
                }
            }, 30000);

            for (const style of CARD_STYLES) {
                for (const suit of CARD_SUITS) {
                    try {
                        const filledPath = CARD_ASSETS[style as keyof typeof CARD_ASSETS][suit as keyof typeof CARD_ASSETS.Fullcard].filled;
                        const filledResult = await loadCardTexture(filledPath);
                        const filledKey = `${style}-${suit}-filled`;
                        const filledMaterialIndex = materialMap[filledKey];
                        const filledMaterial = sharedMaterials[filledMaterialIndex];

                        if (filledMaterial) {
                            filledMaterial.map = filledResult.texture;
                            filledMaterial.needsUpdate = true;

                            if (threeBase?.renderer) {
                                const anisotropy = threeBase.renderer.capabilities.getMaxAnisotropy();
                                filledResult.texture.anisotropy = anisotropy;
                            }
                        }

                        const hollowPath = CARD_ASSETS[style as keyof typeof CARD_ASSETS][suit as keyof typeof CARD_ASSETS.Fullcard].hollow;
                        const hollowResult = await loadCardTexture(hollowPath);
                        const hollowKey = `${style}-${suit}-hollow`;
                        const hollowMaterialIndex = materialMap[hollowKey];
                        const hollowMaterial = sharedMaterials[hollowMaterialIndex];

                        if (hollowMaterial) {
                            hollowMaterial.map = hollowResult.texture;
                            hollowMaterial.needsUpdate = true;

                            if (threeBase?.renderer) {
                                const anisotropy = threeBase.renderer.capabilities.getMaxAnisotropy();
                                hollowResult.texture.anisotropy = anisotropy;
                            }
                        }

                        for (let i = 0; i < cardDataArray.length; i++) {
                            const card = cardDataArray[i];
                            if (card.suit === suit && card.style === style) {
                                card.aspectRatio = filledResult.aspectRatio;

                                const sprite = cardSprites[i];
                                if (sprite) {
                                    const scaleX = card.size * card.aspectRatio;
                                    const scaleY = card.size;
                                    sprite.scale.set(scaleX, scaleY, 1);
                                }
                            }
                        }

                        loadedCount += 2;
                        logDebug(`Loaded textures for ${style}-${suit}`);
                    } catch (error) {
                        logError(`Failed to load textures for ${style}-${suit}`, error);
                        errorCount++;
                    }
                }
            }

            clearTimeout(timeoutId);

            logDebug('Finished loading textures', { loadedCount, errorCount });
            logDebug('Texture cache status', { cacheSize: Object.keys(moduleTextureCache).length });

            if (onReady) {
                onReady();
            }
        };

        logDebug('Calling loadTextures function');
        loadTextures().catch(error => {
            logError('Error in loadTextures', error);
        });

        setTimeout(() => {
            logDebug('Fallback timeout triggered, calling onReady');
            if (onReady) {
                onReady();
            }
        }, 5000);

        const sharedSpriteMaterial = new THREE.SpriteMaterial({
            map: starTexture,
            color: currentStarColorRef.current.getHex(),
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
        });
        shootingStarsRef.current.sharedSpriteMaterial = sharedSpriteMaterial;
        logDebug('Shooting star material created');

        const tick = (renderer: THREE.WebGLRenderer, deltaMs: number) => {
            let delta = deltaMs / 1000;
            const elapsed = clock.getElapsedTime();

            const maxDelta = 0.1;
            const minDelta = 0.001;
            delta = Math.max(minDelta, Math.min(maxDelta, delta));

            const perf = performanceRef.current;
            perf.frameCount++;
            perf.accumulatedTime += delta;
            if (perf.accumulatedTime > perf.maxAccumulatedTime) {
                perf.accumulatedTime = 0;
                perf.lastResetTime = elapsed;
            }

            if (elapsed - perf.lastResetTime > 10) {
                perf.frameCount = 0;
                perf.lastResetTime = elapsed;
                perf.accumulatedTime = 0;

                const data = cardsRef.current.data;
                const maxDistance = CARD_SPREAD_XY * 1.2;
                for (let i = 0; i < data.length; i++) {
                    const c = data[i];
                    const distance = Math.sqrt(c.position.x * c.position.x + c.position.y * c.position.y);
                    if (distance > maxDistance) {
                        c.position.set(
                            (Math.random() - 0.5) * CARD_SPREAD_XY * 0.8,
                            (Math.random() - 0.5) * CARD_SPREAD_XY * 0.8,
                            (Math.random() - 0.5) * CARD_Z_RANGE * 0.5
                        );
                    }
                }
            }

            if (performanceRef.current.isResetting) {
                const elapsed = clock.getElapsedTime();
                const resetProgress = Math.min((elapsed - performanceRef.current.resetStartTime) / performanceRef.current.resetDuration, 1.0);

                const data = cardsRef.current.data;
                const sprites = cardsRef.current.sprites;

                for (let i = 0; i < data.length; i++) {
                    const sprite = sprites[i];
                    if (sprite && sprite.material) {
                        const fadeProgress = 1.0 - resetProgress;
                        (sprite.material as THREE.SpriteMaterial).opacity = data[i].baseOpacity * fadeProgress;
                    }
                }

                if (resetProgress >= 1.0) {
                    if (groupRef.current && cardsRef.current.data.length) {
                        logDebug('Performing smooth full animation reset for stability');

                        const data = cardsRef.current.data;
                        for (let i = 0; i < data.length; i++) {
                            const c = data[i];
                            c.position.set(
                                (Math.random() - 0.5) * CARD_SPREAD_XY * 0.8,
                                (Math.random() - 0.5) * CARD_SPREAD_XY * 0.8,
                                (Math.random() - 0.5) * CARD_Z_RANGE * 0.5
                            );
                            c.velocity.set(
                                (Math.random() - 0.5) * 0.2,
                                (Math.random() - 0.5) * 0.2,
                                0
                            );

                            c.fillProgress = Math.random();
                            c.fillDirection = Math.random() > 0.5 ? 1 : -1;
                        }

                        shootingStarsRef.current.forEach(star => {
                            if (groupRef.current) {
                                groupRef.current.remove(star.sprite);
                                groupRef.current.remove(star.line);
                            }
                            star.lineGeometry.dispose();
                            if (star.sprite.material) {
                                const material = star.sprite.material as THREE.SpriteMaterial;
                                if (material.map) {
                                    material.map.dispose();
                                }
                                material.dispose();
                            }
                            (star.line.material as THREE.Material).dispose();
                        });
                        shootingStarsRef.current.length = 0;

                        if (groupRef.current) {
                            groupRef.current.rotation.set(0, 0, 0);
                        }

                        rotationAnimationRef.current.active = false;
                    }

                    performanceRef.current.isResetting = false;

                    performanceRef.current.lastFullResetTime = elapsed;
                    performanceRef.current.frameCount = 0;
                    performanceRef.current.accumulatedTime = 0;
                    performanceRef.current.lastPartialResetTime = elapsed;
                }
            } else {
                const elapsed = clock.getElapsedTime();
                if (elapsed - performanceRef.current.lastPartialResetTime > BACKGROUND_RESET_INTERVAL) {
                    performanceRef.current.isResetting = true;
                    performanceRef.current.resetStartTime = elapsed;
                }
            }

            if (rotationAnimationRef.current.active && groupRef.current) {
                const { startTime, duration, startRotation, targetRotation } = rotationAnimationRef.current;
                const elapsedTime = elapsed - startTime;
                const progress = Math.min(elapsedTime / duration, 1.0);

                const easedProgress = easeInOutCubic(progress);

                groupRef.current.rotation.x = startRotation.x + (targetRotation.x - startRotation.x) * easedProgress;
                groupRef.current.rotation.y = startRotation.y + (targetRotation.y - startRotation.y) * easedProgress;
                groupRef.current.rotation.z = startRotation.z + (targetRotation.z - startRotation.z) * easedProgress;

                if (progress >= 1.0) {
                    rotationAnimationRef.current.active = false;
                }
            }

            updateCards(delta, elapsed);
            updateShootingStars(delta);

            const currentShootingStarCount = shootingStarsRef.current.length;

            if (elapsed - performanceRef.current.lastShootingStarCleanup > 5) {
                if (currentShootingStarCount > MAX_SHOOTING_STARS * 1.5) {
                    const excessCount = currentShootingStarCount - MAX_SHOOTING_STARS;
                    for (let i = 0; i < excessCount && shootingStarsRef.current.length > 0; i++) {
                        const star = shootingStarsRef.current.pop();
                        if (star && groupRef.current) {
                            groupRef.current.remove(star.sprite);
                            groupRef.current.remove(star.line);
                            star.lineGeometry.dispose();
                            if (star.sprite.material) {
                                const material = star.sprite.material as THREE.SpriteMaterial;
                                if (material.map) {
                                    material.map.dispose();
                                }
                                material.dispose();
                            }
                            (star.line.material as THREE.Material).dispose();
                        }
                    }
                }
                performanceRef.current.lastShootingStarCleanup = elapsed;
            }

            const targetShootingStarCount = MAX_SHOOTING_STARS;
            const shootingStarsNeeded = targetShootingStarCount - currentShootingStarCount;

            if (shootingStarsNeeded > 0) {
                const adjustedChance = SHOOTING_STAR_CHANCE * (1 + (shootingStarsNeeded / MAX_SHOOTING_STARS));

                if (Math.random() < adjustedChance) {
                    createShootingStar();
                }

                if (currentShootingStarCount < MAX_SHOOTING_STARS * 0.3 && Math.random() < 0.3) {
                    createShootingStar();
                }
            }

            renderer.autoClear = false;
            renderer.setClearColor(new THREE.Color(BASE_BACKGROUND_COLOR), 1);
            renderer.clear();
            renderer.render(gradientScene, orthoCam);
            renderer.clearDepth();
            renderer.render(scene, camera);
        };

        threeBase.registerLayer({
            id: 'dynamic-background-3d',
            order: 0,
            tick,
        });
        logDebug('Registered layer with ThreeBase');

        const handleResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        };
        window.addEventListener('resize', handleResize);
        window.addEventListener('keydown', handleKeyPress);
        logDebug('Event listeners added');

        return () => {
            logDebug('Cleanup function called');
            threeBase.unregisterLayer('dynamic-background-3d');
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keydown', handleKeyPress);

            try {
                forceCleanup();
            } catch (e) {
                logError("Error during force cleanup", e);
            }

            try {
                starTexture?.dispose();
            } catch (e) {
                logError("Error disposing star texture", e);
            }

            try {
                gradientMaterial?.uniforms?.topColor?.value?.dispose?.();
                gradientMaterial?.uniforms?.bottomColor?.value?.dispose?.();
                gradientMaterial?.dispose();
            } catch (e) {
                logError("Error disposing gradient material", e);
            }

            try {
                shootingStarsRef.current?.sharedSpriteMaterial?.map?.dispose();
                shootingStarsRef.current?.sharedSpriteMaterial?.dispose();
            } catch (e) {
                logError("Error disposing shooting star material", e);
            }

            try {
                sharedMaterials.forEach(material => {
                    material.map = null;
                    material.dispose();
                });
            } catch (e) {
                logError("Error disposing shared materials", e);
            }

            try {
                scene.traverse((object: THREE.Object3D) => {
                    if (object instanceof THREE.BufferGeometry) {
                        try {
                            object.dispose();
                        } catch (e) {
                            logError("Error disposing geometry", e);
                        }
                    }
                    else if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line || object instanceof THREE.Sprite) {
                        if (object.geometry) {
                            try {
                                object.geometry.dispose();
                            } catch (e) {
                                logError("Error disposing object geometry", e);
                            }
                        }
                    }

                    if ('material' in object && object.material) {
                        const material = object.material as THREE.Material | THREE.Material[];
                        if (Array.isArray(material)) {
                            material.forEach(mat => {
                                const materialWithMap = mat as unknown as { map?: THREE.Texture };
                                materialWithMap.map?.dispose();

                                const materialWithAlphaMap = mat as unknown as { alphaMap?: THREE.Texture };
                                materialWithAlphaMap.alphaMap?.dispose();

                                mat.dispose();
                            });
                        } else {
                            const materialWithMap = material as unknown as { map?: THREE.Texture };
                            materialWithMap.map?.dispose();

                            const materialWithAlphaMap = material as unknown as { alphaMap?: THREE.Texture };
                            materialWithAlphaMap.alphaMap?.dispose();

                            material.dispose();
                        }
                    }
                });
            } catch (e) {
                logError("Error during scene traversal disposal", e);
            }

            try {
                gradientScene.traverse((object: THREE.Object3D) => {
                    if (object instanceof THREE.Mesh) {
                        object.geometry?.dispose();
                    }
                });
            } catch (e) {
                logError("Error disposing gradient scene", e);
            }

            sceneRef.current = null;
            cameraRef.current = null;
            groupRef.current = null;
            cardsRef.current = { sprites: [], materials: [], data: [] };
            textureCacheRef.current = {};
            shootingStarsRef.current = [];

            logDebug("Cleaned up Three.js resources");
        };

    }, [threeBase, clock, createShootingStar, forceCleanup, handleKeyPress, loadCardTexture, onReady, updateShootingStars]);

    logDebug('useEffect hook defined');

    const updateCards = (delta: number, elapsed: number) => {
        const data = cardsRef.current.data;
        const sprites = cardsRef.current.sprites;

        for (let i = 0; i < data.length; i++) {
            const c = data[i];
            const sprite = sprites[i];

            c.position.x += c.velocity.x;
            c.position.y += c.velocity.y;
            c.position.z += c.velocity.z;

            const bounds = CARD_SPREAD_XY * 0.95;
            const zBounds = CARD_Z_RANGE * 0.5;

            if (Math.abs(c.position.x) > bounds) {
                c.velocity.x *= -1;
                c.position.x = Math.sign(c.position.x) * bounds;
            }
            if (Math.abs(c.position.y) > bounds) {
                c.velocity.y *= -1;
                c.position.y = Math.sign(c.position.y) * bounds;
            }
            if (Math.abs(c.position.z) > zBounds) {
                c.velocity.z *= -1;
                c.position.z = Math.sign(c.position.z) * zBounds;
            }

            if (sprite) {
                sprite.position.set(c.position.x, c.position.y, c.position.z);
            }

            let distance = 0;
            if (cameraRef.current) {
                distance = c.position.distanceTo(cameraRef.current.position);
            }
            c.distanceToCamera = distance;

            let lodLevel = 0;
            if (distance > 1000) {
                lodLevel = 3;
            } else if (distance > 750) {
                lodLevel = 2;
            } else if (distance > 500) {
                lodLevel = 1;
            }
            c.lodLevel = lodLevel;

            let sizeMultiplier = 1.0;
            switch (lodLevel) {
                case 1: sizeMultiplier = 0.75; break;
                case 2: sizeMultiplier = 0.5; break;
                case 3: sizeMultiplier = 0.25; break;
                default: sizeMultiplier = 1.0; break;
            }
            c.currentSize = c.size * sizeMultiplier;

            const speedVariation = 0.1 + Math.random() * 0.3;
            c.fillProgress += delta * CARD_TWINKLE_RATE * c.fillDirection * speedVariation;

            if (c.fillProgress >= 1.0) {
                c.fillProgress = 1.0;
                if (Math.random() > 0.5) {
                    c.fillDirection = -1;
                }
            } else if (c.fillProgress <= 0.0) {
                c.fillProgress = 0.0;
                if (Math.random() > 0.5) {
                    c.fillDirection = 1;
                }
            }

            const styleIndex = CARD_STYLES.indexOf(c.style);
            const suitIndex = CARD_SUITS.indexOf(c.suit);

            if (styleIndex !== -1 && suitIndex !== -1) {
                const baseIndex = (styleIndex * CARD_SUITS.length + suitIndex) * 2;
                const filledMaterialIndex = baseIndex;
                const hollowMaterialIndex = baseIndex + 1;

                const transitionWidth = 0.7;
                const offsetTransitionPoint = 0.5 + Math.sin(c.randomOffset) * 0.15;
                const transitionStart = offsetTransitionPoint - transitionWidth / 2;
                const transitionEnd = offsetTransitionPoint + transitionWidth / 2;

                if (c.fillProgress < transitionStart) {
                    if (sprite && c.materialIndex !== hollowMaterialIndex) {
                        sprite.material = cardsRef.current.materials[hollowMaterialIndex];
                        c.materialIndex = hollowMaterialIndex;
                    }
                } else if (c.fillProgress > transitionEnd) {
                    if (sprite && c.materialIndex !== filledMaterialIndex) {
                        sprite.material = cardsRef.current.materials[filledMaterialIndex];
                        c.materialIndex = filledMaterialIndex;
                    }
                } else {
                    const transitionProgress = (c.fillProgress - transitionStart) / transitionWidth;
                    const switchValue = Math.sin(transitionProgress * Math.PI + c.randomOffset);
                    const useFilledMaterial = switchValue > 0;
                    const targetMaterialIndex = useFilledMaterial ? filledMaterialIndex : hollowMaterialIndex;

                    if (sprite && c.materialIndex !== targetMaterialIndex) {
                        sprite.material = cardsRef.current.materials[targetMaterialIndex];
                        c.materialIndex = targetMaterialIndex;
                    }
                }
            }

            if (sprite && c.aspectRatio > 0) {
                const scaleX = c.currentSize * c.aspectRatio;
                const scaleY = c.currentSize;
                sprite.scale.set(scaleX, scaleY, 1);
            }

            if (sprite.material) {
                (sprite.material as THREE.SpriteMaterial).opacity = c.baseOpacity + Math.sin(elapsed * 2 + i * 0.1) * 0.1;
            }
        }
    };


    const easeInOutCubic = (t: number): number => {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    return null;
};

export default DynamicBackground3D;