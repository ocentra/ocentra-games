// src/components/DynamicBackground3D.tsx
import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';

// Import card assets as modules
import CardSpadeFilled from '@assets/BgCards/Fullcard/CardSpadeFilled.png';
import CardSpadeHollow from '@assets/BgCards/Fullcard/CardSpadeHollow.png';
import CardHeartFilled from '@assets/BgCards/Fullcard/CardHeartFilled.png';
import CardHeartHollow from '@assets/BgCards/Fullcard/CardHeartHollow.png';
import CardDiamondFilled from '@assets/BgCards/Fullcard/CardDiamondFilled.png';
import CardDiamondHollow from '@assets/BgCards/Fullcard/CardDiamondHollow.png';
import CardClubFilled from '@assets/BgCards/Fullcard/CardClubFilled.png';
import CardClubHollow from '@assets/BgCards/Fullcard/CardClubHollow.png';

import SpadeFilled from '@assets/BgCards/WithoutCircles/SpadeFilled.png';
import SpadeHollow from '@assets/BgCards/WithoutCircles/SpadeHollow.png';
import HeartFilled from '@assets/BgCards/WithoutCircles/HeartFilled.png';
import HeartHollow from '@assets/BgCards/WithoutCircles/HeartHollow.png';
import DiamondFilled from '@assets/BgCards/WithoutCircles/DiamondFilled.png';
import DiamondHollow from '@assets/BgCards/WithoutCircles/DiamondHollow.png';
import ClubFilled from '@assets/BgCards/WithoutCircles/ClubFilled.png';
import ClubHollow from '@assets/BgCards/WithoutCircles/ClubHollow.png';

import SpadeWithCirclesFilled from '@assets/BgCards/with circles/SpadeWithCirclesFilled.png';
import SpadeWithCirclesHollow from '@assets/BgCards/with circles/SpadeWithCirclesHollow.png';
import HeartWithCirclesFilled from '@assets/BgCards/with circles/HeartWithCirclesFilled.png';
import HeartWithCirclesHollow from '@assets/BgCards/with circles/HeartWithCirclesHollow.png';
import DiamondWithCirclesFilled from '@assets/BgCards/with circles/DiamondWithCirclesFilled.png';
import DiamondWithCirclesHollow from '@assets/BgCards/with circles/DiamondWithCirclesHollow.png';
import ClubWithCirclesFilled from '@assets/BgCards/with circles/ClubWithCirclesFilled.png';
import ClubWithCirclesHollow from '@assets/BgCards/with circles/ClubWithCirclesHollow.png';

// Configurable logging flag
const DEBUG_BACKGROUND = false; // Set to true to enable background logging

const logDebug = (...args: unknown[]) => {
  if (DEBUG_BACKGROUND) {
    console.log('[DynamicBackground3D]', ...args);
  }
};

logDebug('Module loaded');

// Add a type for the window object
declare global {
  interface Window {
    dynamicBgRotate?: () => void;
    dynamicBgReset?: () => void;
    dynamicBgForceCleanup?: () => void; // Add force cleanup function
  }
}

// --- Configuration ---
// Card-based background configuration
const MIN_CARD_SIZE = 20;
const MAX_CARD_SIZE = 80;
const MAX_CARDS = 300; 
const LARGE_CARD_CHANCE = 0.1;
const CARD_SCALE_FACTOR = 1.0;

// Animation configuration
const CARD_TWINKLE_RATE = 0.17; // 3 times slower than original 0.5 (0.5 / 3 = 0.17)
const SHOOTING_STAR_TWINKLE_RATE = 12.0; // Speed of shooting star head twinkling (higher = faster)

// Rotation transition configuration
const ROTATION_DURATION = 1.2; // Duration of rotation in seconds (slightly faster)
const MAX_ROTATION_ANGLE = Math.PI * 0.66; // ~120 degrees for more dramatic effect

// Camera and view configuration
const CAMERA_POSITION_Z = 500; // Moved camera further back
const NEAR_CLIPPING_PLANE = 10;
const FAR_CLIPPING_PLANE = 20000;
const CARD_SPREAD_XY = 1000; // Wider spread to fill screen better
const CARD_Z_RANGE = 500; // Depth range for cards

const MAX_SHOOTING_STARS = 15;
const MAX_SHOOTING_STAR_DISTANCE = 300;
const SHOOTING_STAR_SPEED = 0.005; 
const SHOOTING_STAR_CHANCE = 1; // Increased to match 2D behavior

// Same colors as original
const BOTTOM_COLOR_HEX = 'rgba(0, 5, 15, 0.96)'; 
const TOP_COLOR_HEX = 'rgba(0, 89, 255, 0.42)'; 
const BASE_BACKGROUND_COLOR = 'rgb(0, 110, 104)'; // Dark blue base background color
const GRADIENT_CURVE_POWER = 3; // Higher values (>1) concentrate darkness at bottom, (<1) spread it more evenly

const SHOOTING_STAR_COLORS_HEX = {
    white: '#FFFFFF',
    blue: '#268BD2',
    purple: '#9333EA',
    green: '#22C55E',
    yellow: '#EAB308',
    red: '#EF4444'
};

// Card asset paths - using imported modules
const CARD_ASSETS = {
  Fullcard: {
    Spade: { filled: CardSpadeFilled, hollow: CardSpadeHollow },
    Heart: { filled: CardHeartFilled, hollow: CardHeartHollow },
    Diamond: { filled: CardDiamondFilled, hollow: CardDiamondHollow },
    Club: { filled: CardClubFilled, hollow: CardClubHollow }
  },
  WithoutCircles: {
    Spade: { filled: SpadeFilled, hollow: SpadeHollow },
    Heart: { filled: HeartFilled, hollow: HeartHollow },
    Diamond: { filled: DiamondFilled, hollow: DiamondHollow },
    Club: { filled: ClubFilled, hollow: ClubHollow }
  },
  WithCircles: {
    Spade: { filled: SpadeWithCirclesFilled, hollow: SpadeWithCirclesHollow },
    Heart: { filled: HeartWithCirclesFilled, hollow: HeartWithCirclesHollow },
    Diamond: { filled: DiamondWithCirclesFilled, hollow: DiamondWithCirclesHollow },
    Club: { filled: ClubWithCirclesFilled, hollow: ClubWithCirclesHollow }
  }
};

// Card types and styles
const CARD_SUITS = ['Spade', 'Heart', 'Diamond', 'Club'];
const CARD_STYLES = ['Fullcard', 'WithoutCircles', 'WithCircles'];

// Texture cache to store loaded textures
interface TextureCache {
  [key: string]: {
    texture: THREE.Texture;
    aspectRatio: number;
  };
}

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
    fillProgress: number; // 0 = hollow, 1 = filled
    fillDirection: number; // 1 = filling, -1 = hollowing
    aspectRatio: number; // Store aspect ratio for proper scaling
    currentSize: number; // Track current rendered size for LOD
    materialIndex: number; // Index to the shared material
    lodLevel: number; // Level of detail (0 = highest, 3 = lowest)
    distanceToCamera: number; // Distance to camera for LOD calculation
    randomOffset: number; // Random offset for fill animation timing
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
    spawnFrame?: number; // Track when the star was spawned
}

// Add a type for the shared material reference
interface ShootingStarRefData extends Array<ShootingStarData> {
    sharedSpriteMaterial?: THREE.SpriteMaterial;
}

// Add a constant for the background reset interval
const BACKGROUND_RESET_INTERVAL = 180; // seconds 

// Add a type for the rotation control API
interface RotationControlAPI {
    rotate: () => void;
    reset?: () => void;
}

export type { RotationControlAPI };

logDebug('About to define DynamicBackground3D component');

// Update component interface to accept a ref and onReady callback
interface DynamicBackground3DProps {
    controlRef?: React.MutableRefObject<RotationControlAPI | null>;
    onReady?: () => void;
}

const DynamicBackground3D: React.FC<DynamicBackground3DProps> = ({ controlRef, onReady }) => {
    logDebug('Component function called');
    const mountRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const groupRef = useRef<THREE.Group | null>(null);
    const cardsRef = useRef<{
        sprites: THREE.Sprite[];
        materials: THREE.SpriteMaterial[];
        data: CardData[];
    }>({ sprites: [], materials: [], data: [] });
    const textureCacheRef = useRef<TextureCache>({});

    // Initialize shootingStarsRef with the specific type
    const shootingStarsRef = useRef<ShootingStarRefData>([]);

    // Add a ref for tracking rotation animation
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
    
    // Function to perform a full reset of the animation system
    const performFullReset = useCallback(() => {
        if (!groupRef.current || !cardsRef.current.data.length) return;
        
        logDebug('Performing full animation reset for stability');
        
        // Reset all card positions to fresh random positions
        const data = cardsRef.current.data;
        for (let i = 0; i < data.length; i++) {
            const c = data[i];
            c.position.set(
                (Math.random() - 0.5) * CARD_SPREAD_XY * 0.8,
                (Math.random() - 0.5) * CARD_SPREAD_XY * 0.8,
                (Math.random() - 0.5) * CARD_Z_RANGE * 0.5
            );
            // Reset velocity to prevent accumulated errors
            c.velocity.set(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                0
            );
            // Reset fill animation state
            c.fillProgress = Math.random();
            c.fillDirection = Math.random() > 0.5 ? 1 : -1;
        }
        
        // Clear all shooting stars and start fresh
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
        
        // Reset group rotation to prevent accumulated rotation errors
        if (groupRef.current) {
            groupRef.current.rotation.set(0, 0, 0);
        }
        
        // Reset rotation animation state
        rotationAnimationRef.current.active = false;
        
        // Update performance tracking
        performanceRef.current.lastFullResetTime = clock.getElapsedTime();
        performanceRef.current.frameCount = 0;
        performanceRef.current.accumulatedTime = 0;
        // Initialize the shooting star cleanup timer
        performanceRef.current.lastShootingStarCleanup = clock.getElapsedTime();
        // Initialize the partial reset timer
        performanceRef.current.lastPartialResetTime = clock.getElapsedTime();

    }, [clock]);
    
    // Add performance monitoring and stability controls
    const performanceRef = useRef({
        frameCount: 0,
        lastResetTime: 0,
        lastDeltaTime: 0,
        accumulatedTime: 0,
        maxAccumulatedTime: 1.0, // Reset accumulated time if it gets too large
        lastFullResetTime: 0, // Track when we last did a full reset
        fullResetInterval: 30 * 60, // 30 minutes in seconds
        lastShootingStarCleanup: 0, // Track when we last cleaned up shooting stars
        lastPartialResetTime: 0, // Track when we last did a partial reset
        isResetting: false, // Track if we're currently in a reset transition
        resetStartTime: 0, // Track when the reset transition started
        resetDuration: 2.0 // Duration of the reset transition in seconds
    });

    // --- Function to force cleanup of WebGL contexts ---
    const forceCleanup = useCallback(() => {
        logDebug('Forcing WebGL context cleanup');
        
        // Force disposal of all textures in cache
        Object.values(textureCacheRef.current).forEach(cached => {
            try {
                cached.texture.dispose();
            } catch (e) {
                logDebug('Error disposing texture:', e);
            }
        });
        textureCacheRef.current = {};
        
        // Force clear all cards
        if (cardsRef.current.sprites) {
            cardsRef.current.sprites.forEach(sprite => {
                try {
                    if (groupRef.current) {
                        groupRef.current.remove(sprite);
                    }
                } catch (e) {
                    logDebug('Error removing sprite from group:', e);
                }
            });
        }
        
        // Force clear all shooting stars
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
                    logDebug('Error disposing star:', e);
                }
            });
            shootingStarsRef.current.length = 0;
        }
        
        // Force renderer cleanup
        if (rendererRef.current) {
            try {
                rendererRef.current.dispose();
                rendererRef.current.forceContextLoss();
            } catch (e) {
                logDebug('Error forcing renderer context loss:', e);
            }
        }
        
        logDebug('Forced cleanup completed');
    }, []);
    
    // --- Function to start a random transition rotation ---
    const startRandomRotation = useCallback(() => {
        if (!groupRef.current) return;
        
        // Store current rotation as starting point
        const currentRotation = groupRef.current.rotation.clone();
        rotationAnimationRef.current.startRotation = new THREE.Euler(
            currentRotation.x,
            currentRotation.y,
            currentRotation.z
        );
        
        // Generate random target rotation angles
        const targetX = currentRotation.x + (Math.random() * 2 - 1) * MAX_ROTATION_ANGLE;
        const targetY = currentRotation.y + (Math.random() * 2 - 1) * MAX_ROTATION_ANGLE;
        const targetZ = currentRotation.z + (Math.random() * 2 - 1) * MAX_ROTATION_ANGLE * 0.5; // Less Z rotation
        
        rotationAnimationRef.current.targetRotation = new THREE.Euler(targetX, targetY, targetZ);
        rotationAnimationRef.current.startTime = clock.getElapsedTime();
        rotationAnimationRef.current.duration = ROTATION_DURATION;
        rotationAnimationRef.current.active = true;
    }, [clock]);
    
    // Expose the rotation function through a ref that can be accessed externally
    const rotationAPI = useMemo(() => ({
        rotate: () => {
            startRandomRotation();
        },
        reset: () => {
            performFullReset();
        }, // Add manual reset function
        forceCleanup: () => {
            forceCleanup();
        } // Add force cleanup function
    }), [startRandomRotation, performFullReset, forceCleanup]);
    
    // Assign to parent ref if provided
    useEffect(() => {
        if (controlRef) {
            controlRef.current = rotationAPI;
        }
    }, [controlRef, rotationAPI]);
    
    // Make the rotation function accessible via a window property for external access
    useEffect(() => {
        // Ensure window object is available (avoid SSR issues)
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

    // --- Shaders ---
    const gradientVertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            // Use absolute position for background plane so it doesn't rotate with the group
            gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
            // Ensure it's always drawn last (furthest back)
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
            // Apply power function to vUv.y to control the gradient curve
            // Higher power values concentrate the gradient at the bottom
            float t = pow(vUv.y, curvePower);
            
            // Create colors with proper transparency - this ensures it acts like a fog layer
            vec3 color = mix(bottomColor, topColor, t);
            float alpha = mix(bottomAlpha, topAlpha, t);
            
            // Final color with adjusted alpha for fog effect
            gl_FragColor = vec4(color, alpha);
        }
    `;
    // --- End Shaders ---

    // --- Helper to create star glow texture with aspect ratio correction ---
    const createStarTexture = (): THREE.Texture => {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d')!;
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2;

        // Create radial gradient for soft glow effect
        const gradient = context.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, radius
        );
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.7, 'rgba(200,200,255,0.5)');
        gradient.addColorStop(1, 'rgba(150,150,255,0)');

        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);

        // Add a subtle highlight
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

    // --- Helper to create money emoji star texture ---
    const createMoneyStarTexture = (emoji = '💸') => {
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
    };

    // --- Helper to load card texture with caching ---
    const loadCardTexture = (path: string): Promise<{texture: THREE.Texture, aspectRatio: number}> => {
        // Check if texture is already cached
        if (textureCacheRef.current[path]) {
            return Promise.resolve(textureCacheRef.current[path]);
        }
        
        logDebug('Loading texture:', path);
        return new Promise((resolve) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                path,
                (texture: THREE.Texture) => {
                    logDebug('Successfully loaded texture:', path);
                    texture.needsUpdate = true;
                    
                    // Enable mipmapping to reduce pixelation when cards are small
                    texture.generateMipmaps = true;
                    texture.minFilter = THREE.LinearMipmapLinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    
                    // Set texture wrapping to clamp to avoid seams
                    texture.wrapS = THREE.ClampToEdgeWrapping;
                    texture.wrapT = THREE.ClampToEdgeWrapping;
                    
                    // Calculate aspect ratio from texture dimensions
                    const image = texture.image as HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
                    const aspectRatio = image && 'width' in image && 'height' in image 
                        ? image.width / image.height 
                        : 1.0;
                    
                    // Cache the texture
                    textureCacheRef.current[path] = { texture, aspectRatio };
                    
                    logDebug('Cached texture:', path, 'with aspect ratio:', aspectRatio);
                    resolve({texture, aspectRatio});
                },
                undefined,
                (error: unknown) => {
                    logDebug('Failed to load texture:', path, error);
                    // Create a fallback texture with a colored rectangle
                    const canvas = document.createElement('canvas');
                    canvas.width = 128;
                    canvas.height = 128;
                    const context = canvas.getContext('2d')!;
                    
                    // Draw a colored rectangle based on suit
                    const suitColors: Record<string, string> = {
                        Spade: '#000000',    // Black
                        Heart: '#FF0000',    // Red
                        Diamond: '#FF0000',  // Red
                        Club: '#000000'      // Black
                    };
                    
                    // Extract suit from path
                    let suit = 'Spade'; // default
                    if (path.includes('Heart')) {
                        suit = 'Heart';
                    } else if (path.includes('Diamond')) {
                        suit = 'Diamond';
                    } else if (path.includes('Club')) {
                        suit = 'Club';
                    }
                    
                    context.fillStyle = suitColors[suit];
                    context.fillRect(0, 0, 128, 128);
                    
                    // Add a border
                    context.strokeStyle = '#FFFFFF';
                    context.lineWidth = 4;
                    context.strokeRect(0, 0, 128, 128);
                    
                    const fallbackTexture = new THREE.CanvasTexture(canvas);
                    fallbackTexture.needsUpdate = true;
                    
                    // Apply same mipmapping settings to fallback texture
                    fallbackTexture.generateMipmaps = true;
                    fallbackTexture.minFilter = THREE.LinearMipmapLinearFilter;
                    fallbackTexture.magFilter = THREE.LinearFilter;
                    
                    // Set texture wrapping to clamp to avoid seams
                    fallbackTexture.wrapS = THREE.ClampToEdgeWrapping;
                    fallbackTexture.wrapT = THREE.ClampToEdgeWrapping;
                    
                    // Cache the fallback texture
                    textureCacheRef.current[path] = { texture: fallbackTexture, aspectRatio: 1.0 };
                    
                    resolve({texture: fallbackTexture, aspectRatio: 1.0});
                }
            );
        });
    };

    // --- Initialization ---
    useEffect(() => {
        logDebug('useEffect initializing');
        if (!mountRef.current) {
            logDebug('No mountRef, returning early');
            return;
        }
        const currentMount = mountRef.current;
        logDebug('Mount ref found, proceeding with initialization');

        // --- Create Textures (Scoped to useEffect for cleanup) ---
        const starTexture = createStarTexture();
        logDebug('Star texture created');
        // ---

        const scene = new THREE.Scene();
        sceneRef.current = scene;
        logDebug('Scene created');

        // Perspective camera with better settings to match 2D look
        const camera = new THREE.PerspectiveCamera(
            45, // Lower FOV for less distortion
            window.innerWidth / window.innerHeight,
            NEAR_CLIPPING_PLANE,
            FAR_CLIPPING_PLANE
        );
        camera.position.z = CAMERA_POSITION_Z;
        cameraRef.current = camera;
        logDebug('Camera created');

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limit pixel ratio to reduce pixelation
        // Set renderer clear color to match base background color
        renderer.setClearColor(new THREE.Color(BASE_BACKGROUND_COLOR), 1);
        // Make sure the canvas doesn't block pointer events
        renderer.domElement.style.pointerEvents = 'none';
        renderer.domElement.style.position = 'relative'; // Ensure proper positioning
        renderer.domElement.style.zIndex = '-1'; // Ensure canvas is behind UI elements
        currentMount.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        logDebug('Renderer created and mounted');
        logDebug('Renderer initialized:', renderer);
        logDebug('Canvas element:', renderer.domElement);

        const group = new THREE.Group(); // This group holds cards and stars for rotation
        groupRef.current = group;
        scene.add(group);
        logDebug('Group created and added to scene');
        logDebug('Group initialized:', group);

        // Parse RGBA values for gradient
        const parseRGBA = (rgbaString: string) => {
            // Extract numbers from RGBA format
            const matches = rgbaString.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,?\s*(\d*\.?\d*)?/i);
            if (matches) {
                const r = parseInt(matches[1], 10) / 255;
                const g = parseInt(matches[2], 10) / 255;
                const b = parseInt(matches[3], 10) / 255;
                const a = matches[4] ? parseFloat(matches[4]) : 1.0;
                return { color: new THREE.Color(r, g, b), alpha: a };
            }
            // Fallback to parsing as hex if it doesn't match rgba pattern
            return { color: new THREE.Color(rgbaString), alpha: 1.0 };
        };

        // Parse top and bottom colors
        const topColorInfo = parseRGBA(TOP_COLOR_HEX);
        const bottomColorInfo = parseRGBA(BOTTOM_COLOR_HEX);
        logDebug('Colors parsed');

        // Gradient Background Plane (Added directly to scene, NOT group)
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
            transparent: true, // Enable transparency
            depthWrite: false,
            depthTest: false,
            blending: THREE.NormalBlending, // Normal blending to ensure gradient properly overlays base color
        });
        const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const planeGeometry = new THREE.PlaneGeometry(2, 2);
        const gradientPlane = new THREE.Mesh(planeGeometry, gradientMaterial);
        const gradientScene = new THREE.Scene();
        gradientScene.add(gradientPlane);
        renderer.autoClear = false; // Manage clearing manually
        logDebug('Gradient background created');

        // Create shared materials for each card type (4 suits × 3 styles × 2 states = 24 materials)
        const sharedMaterials: THREE.SpriteMaterial[] = [];
        const materialMap: { [key: string]: number } = {}; // Map from card type to material index
        
        // Create a material for each card type
        CARD_STYLES.forEach(style => {
            CARD_SUITS.forEach(suit => {
                // Create filled material
                const filledMaterial = new THREE.SpriteMaterial({
                    color: 0x444444, // Dark gray default color
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    sizeAttenuation: true,
                });
                const filledKey = `${style}-${suit}-filled`;
                materialMap[filledKey] = sharedMaterials.length;
                sharedMaterials.push(filledMaterial);
                
                // Create hollow material
                const hollowMaterial = new THREE.SpriteMaterial({
                    color: 0x444444, // Dark gray default color
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
        
        logDebug('Created', sharedMaterials.length, 'shared materials for card types');

        // Card System (Added to the rotating group)
        const cardDataArray: CardData[] = [];
        const cardSprites: THREE.Sprite[] = [];

        // Create cards with different styles and suits
        for (let i = 0; i < MAX_CARDS; i++) {
            // Create card sizes similar to 2D version
            const isLarge = Math.random() < LARGE_CARD_CHANCE;
            const radius = isLarge
                ? Math.random() * (MAX_CARD_SIZE - 30) + 30 // Large cards: 30-80px
                : Math.random() * (30 - MIN_CARD_SIZE) + MIN_CARD_SIZE; // Small cards: 20-30px
            
            // Scale card size with the scale factor
            const size = radius * CARD_SCALE_FACTOR;
            
            // Generate positions to create a full-screen look
            const x = (Math.random() - 0.5) * CARD_SPREAD_XY;
            const y = (Math.random() - 0.5) * CARD_SPREAD_XY;
            const z = (Math.random() - 0.5) * CARD_Z_RANGE;
            
            // Randomly select suit and style
            const suit = CARD_SUITS[Math.floor(Math.random() * CARD_SUITS.length)];
            const style = CARD_STYLES[Math.floor(Math.random() * CARD_STYLES.length)];
            const isFilled = Math.random() > 0.5;
            
            // Set opacity similar to 2D version
            const baseOpacity = Math.random() * 0.7 + 0.3;
            
            // Get material index for this card type
            const materialKey = `${style}-${suit}-${isFilled ? 'filled' : 'hollow'}`;
            const materialIndex = materialMap[materialKey];
            
            // Add random offset for fill animation to make transitions random
            const randomOffset = Math.random() * Math.PI * 2;
            
            // Start cards at random fill progress to avoid synchronized animation
            const initialFillProgress = Math.random();
            const initialFillDirection = Math.random() > 0.5 ? 1 : -1;
            
            cardDataArray.push({
                position: new THREE.Vector3(x, y, z),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.2, // Match 2D velocity
                    (Math.random() - 0.5) * 0.2,
                    0 // No z-velocity to avoid depth issues
                ),
                baseOpacity: baseOpacity, 
                radius: radius, 
                size: size,
                color: new THREE.Color(1, 1, 1), // White color for cards
                id: i,
                suit: suit,
                style: style,
                isFilled: isFilled,
                fillProgress: initialFillProgress,
                fillDirection: initialFillDirection,
                aspectRatio: 1.0, // Default square aspect ratio
                currentSize: size, // Initialize current size for LOD system
                materialIndex: materialIndex, // Index to the shared material
                lodLevel: 0, // Start with highest LOD level
                distanceToCamera: 0, // Initialize distance
                randomOffset: randomOffset // Add random offset for fill animation
            });
            
            // Create sprite with the shared material
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
        logDebug('Created', cardDataArray.length, 'cards using', sharedMaterials.length, 'shared materials');

        logDebug('Starting texture loading');
        
        // Load textures for all card types
        const loadTextures = async () => {
            logDebug('Starting to load textures for card types');
            let loadedCount = 0;
            let errorCount = 0;
            
            // Set a timeout to ensure onReady is called even if there are issues
            const timeoutId = setTimeout(() => {
                logDebug('Texture loading timeout, calling onReady anyway');
                if (onReady) {
                    onReady();
                }
            }, 30000); // Reverted to 30 seconds
            
            // Load textures for each card type
            for (const style of CARD_STYLES) {
                for (const suit of CARD_SUITS) {
                    try {
                        // Load filled texture
                        const filledPath = CARD_ASSETS[style as keyof typeof CARD_ASSETS][suit as keyof typeof CARD_ASSETS.Fullcard].filled;
                        const filledResult = await loadCardTexture(filledPath);
                        const filledKey = `${style}-${suit}-filled`;
                        const filledMaterialIndex = materialMap[filledKey];
                        const filledMaterial = sharedMaterials[filledMaterialIndex];
                        
                        if (filledMaterial) {
                            filledMaterial.map = filledResult.texture;
                            filledMaterial.needsUpdate = true;
                            
                            // Apply anisotropic filtering if renderer is available
                            if (rendererRef.current) {
                                const anisotropy = rendererRef.current.capabilities.getMaxAnisotropy();
                                filledResult.texture.anisotropy = anisotropy;
                            }
                        }
                        
                        // Load hollow texture
                        const hollowPath = CARD_ASSETS[style as keyof typeof CARD_ASSETS][suit as keyof typeof CARD_ASSETS.Fullcard].hollow;
                        const hollowResult = await loadCardTexture(hollowPath);
                        const hollowKey = `${style}-${suit}-hollow`;
                        const hollowMaterialIndex = materialMap[hollowKey];
                        const hollowMaterial = sharedMaterials[hollowMaterialIndex];
                        
                        if (hollowMaterial) {
                            hollowMaterial.map = hollowResult.texture;
                            hollowMaterial.needsUpdate = true;
                            
                            // Apply anisotropic filtering if renderer is available
                            if (rendererRef.current) {
                                const anisotropy = rendererRef.current.capabilities.getMaxAnisotropy();
                                hollowResult.texture.anisotropy = anisotropy;
                            }
                        }
                        
                        // Update all cards of this type with the aspect ratio
                        for (let i = 0; i < cardDataArray.length; i++) {
                            const card = cardDataArray[i];
                            if (card.suit === suit && card.style === style) {
                                card.aspectRatio = filledResult.aspectRatio; // Use filled texture aspect ratio
                                
                                // Update sprite scale to maintain aspect ratio
                                const sprite = cardSprites[i];
                                if (sprite) {
                                    const scaleX = card.size * card.aspectRatio;
                                    const scaleY = card.size;
                                    sprite.scale.set(scaleX, scaleY, 1);
                                }
                            }
                        }
                        
                        loadedCount += 2; // Two textures loaded (filled and hollow)
                        logDebug(`Loaded textures for ${style}-${suit}`);
                    } catch (error) {
                        logDebug(`Failed to load textures for ${style}-${suit}:`, error);
                        errorCount++;
                    }
                }
            }
            
            // Clear the timeout since we're done
            clearTimeout(timeoutId);
            
            logDebug(`Finished loading textures: ${loadedCount} successful, ${errorCount} failed, calling onReady callback`);
            logDebug(`Texture cache contains ${Object.keys(textureCacheRef.current).length} unique textures`);
            
            // Notify that background is ready
            if (onReady) {
                onReady();
            }
        };
        
        // Start loading textures
        logDebug('Calling loadTextures function');
        loadTextures().catch(error => {
            logDebug('Error in loadTextures:', error);
        });
        
        // Ensure onReady is called even if there are issues
        setTimeout(() => {
            logDebug('Fallback timeout triggered, calling onReady');
            if (onReady) {
                onReady();
            }
        }, 5000); // Reverted to 5 seconds

        // Shooting Star Shared Material
        const sharedSpriteMaterial = new THREE.SpriteMaterial({
            map: starTexture,
            color: currentStarColorRef.current.getHex(),
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true, // Enable size attenuation for better depth effect
        });
        shootingStarsRef.current.sharedSpriteMaterial = sharedSpriteMaterial;
        logDebug('Shooting star material created');

        // Animation Loop
        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            
            // Get delta time with stability controls
            let delta = clock.getDelta();
            const elapsed = clock.getElapsedTime();
            
            // Performance monitoring and stability fixes
            const perf = performanceRef.current;
            perf.frameCount++;
            
            // Clamp delta time to prevent extreme values that cause erratic behavior
            const maxDelta = 0.1; // Maximum 100ms per frame
            const minDelta = 0.001; // Minimum 1ms per frame
            delta = Math.max(minDelta, Math.min(maxDelta, delta));
            
            // Reset accumulated time if it gets too large (prevents drift)
            perf.accumulatedTime += delta;
            if (perf.accumulatedTime > perf.maxAccumulatedTime) {
                perf.accumulatedTime = 0;
                perf.lastResetTime = elapsed;
            }
            
            // Reset performance counters every 10 seconds to prevent long-term drift
            if (elapsed - perf.lastResetTime > 10) {
                perf.frameCount = 0;
                perf.lastResetTime = elapsed;
                perf.accumulatedTime = 0;
                
                // Periodic cleanup: Reset any cards that have drifted too far
                const data = cardsRef.current.data;
                const maxDistance = CARD_SPREAD_XY * 1.2;
                for (let i = 0; i < data.length; i++) {
                    const c = data[i];
                    const distance = Math.sqrt(c.position.x * c.position.x + c.position.y * c.position.y);
                    if (distance > maxDistance) {
                        // Reset card to a random position within bounds
                        c.position.set(
                            (Math.random() - 0.5) * CARD_SPREAD_XY * 0.8,
                            (Math.random() - 0.5) * CARD_SPREAD_XY * 0.8,
                            (Math.random() - 0.5) * CARD_Z_RANGE * 0.5
                        );
                    }
                }
            }
            
            // Apply smooth reset transition if active
            if (performanceRef.current.isResetting) {
                const elapsed = clock.getElapsedTime();
                const resetProgress = Math.min((elapsed - performanceRef.current.resetStartTime) / performanceRef.current.resetDuration, 1.0);
                
                // Apply fade out effect during reset
                const data = cardsRef.current.data;
                const sprites = cardsRef.current.sprites;
                
                for (let i = 0; i < data.length; i++) {
                    const sprite = sprites[i];
                    if (sprite && sprite.material) {
                        // Fade out cards during reset
                        const fadeProgress = 1.0 - resetProgress;
                        (sprite.material as THREE.SpriteMaterial).opacity = data[i].baseOpacity * fadeProgress;
                    }
                }
                
                // When reset transition is complete, perform the actual reset
                if (resetProgress >= 1.0) {
                    // Perform the actual reset
                    if (groupRef.current && cardsRef.current.data.length) {
                        logDebug('Performing smooth full animation reset for stability');
                        
                        // Reset all card positions to fresh random positions
                        const data = cardsRef.current.data;
                        for (let i = 0; i < data.length; i++) {
                            const c = data[i];
                            c.position.set(
                                (Math.random() - 0.5) * CARD_SPREAD_XY * 0.8,
                                (Math.random() - 0.5) * CARD_SPREAD_XY * 0.8,
                                (Math.random() - 0.5) * CARD_Z_RANGE * 0.5
                            );
                            // Reset velocity to prevent accumulated errors
                            c.velocity.set(
                                (Math.random() - 0.5) * 0.2,
                                (Math.random() - 0.5) * 0.2,
                                0
                            );
                            
                            // Reset fill animation state
                            c.fillProgress = Math.random();
                            c.fillDirection = Math.random() > 0.5 ? 1 : -1;
                        }
                        
                        // Clear all shooting stars and start fresh
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
                        
                        // Reset group rotation to prevent accumulated rotation errors
                        if (groupRef.current) {
                            groupRef.current.rotation.set(0, 0, 0);
                        }
                        
                        // Reset rotation animation state
                        rotationAnimationRef.current.active = false;
                    }
                    
                    // Reset the reset transition state
                    performanceRef.current.isResetting = false;
                    
                    // Update performance tracking
                    performanceRef.current.lastFullResetTime = elapsed;
                    performanceRef.current.frameCount = 0;
                    performanceRef.current.accumulatedTime = 0;
                    performanceRef.current.lastPartialResetTime = elapsed;
                }
            } else {
                // Normal reset check (every 1 minute)
                const elapsed = clock.getElapsedTime();
                if (elapsed - performanceRef.current.lastPartialResetTime > BACKGROUND_RESET_INTERVAL) { // Configurable reset interval
                    // Start the smooth reset transition
                    performanceRef.current.isResetting = true;
                    performanceRef.current.resetStartTime = elapsed;
                }
            }

            // Apply smooth rotation animation if active
            if (rotationAnimationRef.current.active && groupRef.current) {
                const { startTime, duration, startRotation, targetRotation } = rotationAnimationRef.current;
                const elapsedTime = elapsed - startTime;
                const progress = Math.min(elapsedTime / duration, 1.0);
                
                // Use smooth easing function for natural motion
                const easedProgress = easeInOutCubic(progress);
                
                // Interpolate between start and target rotations
                groupRef.current.rotation.x = startRotation.x + (targetRotation.x - startRotation.x) * easedProgress;
                groupRef.current.rotation.y = startRotation.y + (targetRotation.y - startRotation.y) * easedProgress;
                groupRef.current.rotation.z = startRotation.z + (targetRotation.z - startRotation.z) * easedProgress;
                
                // End the animation when complete
                if (progress >= 1.0) {
                    rotationAnimationRef.current.active = false;
                }
            }

            updateCards(delta, elapsed);
            updateShootingStars(delta);

            // More reliable shooting star creation logic with periodic cleanup
            const currentShootingStarCount = shootingStarsRef.current.length;
            
            // Periodic cleanup: Remove old shooting stars to prevent accumulation
            // Use a separate timer for shooting star cleanup to avoid conflicts with main performance timer
            if (elapsed - performanceRef.current.lastShootingStarCleanup > 5) {
                if (currentShootingStarCount > MAX_SHOOTING_STARS * 1.5) {
                    // Remove excess shooting stars
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
                // Update the last cleanup time
                performanceRef.current.lastShootingStarCleanup = elapsed;
            }
            
            // Calculate how many shooting stars we should add this frame
            // This ensures we maintain a consistent shooting star count over time
            const targetShootingStarCount = MAX_SHOOTING_STARS;
            const shootingStarsNeeded = targetShootingStarCount - currentShootingStarCount;
            
            if (shootingStarsNeeded > 0) {
                // Try to add shooting stars up to our target count
                // Use a higher chance when we're far below target
                const adjustedChance = SHOOTING_STAR_CHANCE * (1 + (shootingStarsNeeded / MAX_SHOOTING_STARS));
                
                // Try to create a new star with adjusted probability
                if (Math.random() < adjustedChance) {
                    createShootingStar();
                }
                
                // If we have very few stars, force create one to ensure we always have some
                if (currentShootingStarCount < MAX_SHOOTING_STARS * 0.3 && Math.random() < 0.3) {
                    createShootingStar();
                }
            }

            // Clear with base background color first
            renderer.setClearColor(new THREE.Color(BASE_BACKGROUND_COLOR), 1);
            renderer.clear();
            
            // Render gradient on top of base color
            renderer.render(gradientScene, orthoCam);
            
            // Clear depth buffer but keep color buffer with base+gradient
            renderer.clearDepth();
            
            // Render cards and stars on top
            renderer.render(scene, camera);
        };

        animate();
        logDebug('Animation loop started');

        // Handle Resize
        const handleResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        };
        window.addEventListener('resize', handleResize);
        window.addEventListener('keydown', handleKeyPress);
        logDebug('Event listeners added');

        // --- Cleanup ---
        return () => {
            logDebug('Cleanup function called');
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keydown', handleKeyPress);
            if (currentMount && renderer.domElement) {
                 try { currentMount.removeChild(renderer.domElement); } catch (e) { logDebug("Error removing renderer DOM element:", e); }
            }

            // --- Start of Enhanced Cleanup Logic ---
            
            // Force cleanup of all resources
            try {
                forceCleanup();
            } catch (e) {
                logDebug("Error during force cleanup:", e);
            }

            // Dispose textures explicitly first (safer)
            try {
                starTexture?.dispose();
            } catch (e) {
                logDebug("Error disposing star texture:", e);
            }
            
            try {
                gradientMaterial?.uniforms?.topColor?.value?.dispose?.(); // Example if color was complex type
                gradientMaterial?.uniforms?.bottomColor?.value?.dispose?.();
                gradientMaterial?.dispose(); // Dispose the gradient material itself
            } catch (e) {
                logDebug("Error disposing gradient material:", e);
            }

            // Dispose shared sprite material map texture and material
            try {
                shootingStarsRef.current?.sharedSpriteMaterial?.map?.dispose();
                shootingStarsRef.current?.sharedSpriteMaterial?.dispose();
            } catch (e) {
                logDebug("Error disposing shooting star material:", e);
            }

            // Dispose shared card materials and textures
            try {
                sharedMaterials.forEach(material => {
                    material.map?.dispose();
                    material.dispose();
                });
            } catch (e) {
                logDebug("Error disposing shared materials:", e);
            }
            
            // Dispose texture cache
            try {
                Object.values(textureCacheRef.current).forEach(cached => {
                    cached.texture.dispose();
                });
                textureCacheRef.current = {};
            } catch (e) {
                logDebug("Error disposing texture cache:", e);
            }

            // Dispose geometries and materials found during scene traversal
            try {
                scene.traverse((object: THREE.Object3D) => {
                    // Dispose Geometry
                    // Check if it's a BufferGeometry instance first
                     if (object instanceof THREE.BufferGeometry) {
                        try {
                            object.dispose();
                        } catch (e) {
                            logDebug("Error disposing geometry:", e);
                        }
                     }
                     // Then check common object types that have geometry
                     else if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line || object instanceof THREE.Sprite) {
                        if (object.geometry) {
                            try {
                                object.geometry.dispose();
                            } catch (e) {
                                logDebug("Error disposing object geometry:", e);
                            }
                        }
                    }

                    // Dispose Material(s)
                     // Check if the object has a 'material' property and it's not undefined
                     if ('material' in object && object.material) {
                        const material = object.material as THREE.Material | THREE.Material[]; // Type assertion
                        if (Array.isArray(material)) {
                            // If it's an array of materials
                            material.forEach(mat => {
                                // Use type assertions for specific material types that have these properties
                                const materialWithMap = mat as unknown as { map?: THREE.Texture };
                                materialWithMap.map?.dispose();
                                
                                const materialWithAlphaMap = mat as unknown as { alphaMap?: THREE.Texture };
                                materialWithAlphaMap.alphaMap?.dispose();
                                
                                mat.dispose();
                            });
                        } else {
                            // If it's a single material
                            const materialWithMap = material as unknown as { map?: THREE.Texture };
                            materialWithMap.map?.dispose();
                            
                            const materialWithAlphaMap = material as unknown as { alphaMap?: THREE.Texture };
                            materialWithAlphaMap.alphaMap?.dispose();
                            
                            material.dispose();
                        }
                    }
                });
            } catch (e) {
                logDebug("Error during scene traversal disposal:", e);
            }

            // Also dispose gradient scene objects (specifically its geometry)
             try {
                 gradientScene.traverse((object: THREE.Object3D) => {
                     if (object instanceof THREE.Mesh) {
                         object.geometry?.dispose();
                         // Gradient material already handled above
                     }
                 });
             } catch (e) {
                 logDebug("Error disposing gradient scene:", e);
             }

            // Force renderer disposal
            try {
                renderer?.dispose(); // Dispose renderer resources
                // Force WebGL context loss
                if (renderer && typeof (renderer as unknown as { forceContextLoss?: () => void }).forceContextLoss === 'function') {
                    (renderer as unknown as { forceContextLoss: () => void }).forceContextLoss();
                }
            } catch (e) {
                logDebug("Error disposing renderer:", e);
            }

            // --- End of Enhanced Cleanup Logic ---

            // Clear refs
            rendererRef.current = null;
            sceneRef.current = null;
            cameraRef.current = null;
            groupRef.current = null;
            cardsRef.current = { sprites: [], materials: [], data: [] };
            textureCacheRef.current = {};
            shootingStarsRef.current = []; // Reset the ref array

            logDebug("Cleaned up Three.js resources");
        };
        // --- End Cleanup ---
        // Intentionally excluding dependencies: clock, createShootingStar, forceCleanup, gradientFragmentShader, 
        // gradientVertexShader, handleKeyPress, onReady, updateShootingStars. These are either stable (useMemo/useCallback),
        // constants, or intentionally excluded to prevent re-running the effect on every render. This effect should only
        // run once on mount and clean up on unmount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // End useEffect
    logDebug('useEffect hook defined');

    // --- Card Update Logic ---
    const updateCards = (delta: number, elapsed: number) => {
        const data = cardsRef.current.data;
        const sprites = cardsRef.current.sprites;

        for (let i = 0; i < data.length; i++) {
            const c = data[i];
            const sprite = sprites[i];

            // Update position with velocity
            c.position.x += c.velocity.x;
            c.position.y += c.velocity.y;
            c.position.z += c.velocity.z; // Add Z velocity update

            // Bounce off edges including Z-axis
            const bounds = CARD_SPREAD_XY * 0.95; // Use most of the area
            const zBounds = CARD_Z_RANGE * 0.5; // Z-axis bounds
            
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

            // Apply position to sprite
            if (sprite) {
                sprite.position.set(c.position.x, c.position.y, c.position.z);
            }

            // Calculate distance to camera for LOD
            let distance = 0;
            if (cameraRef.current) {
                distance = c.position.distanceTo(cameraRef.current.position);
            }
            c.distanceToCamera = distance;

            // Determine LOD level based on distance (closer = higher detail)
            // LOD levels: 0 = full size, 1 = 3/4 size, 2 = 1/2 size, 3 = 1/4 size
            let lodLevel = 0;
            if (distance > 1000) {
                lodLevel = 3; // Farthest - smallest
            } else if (distance > 750) {
                lodLevel = 2;
            } else if (distance > 500) {
                lodLevel = 1;
            }
            c.lodLevel = lodLevel;

            // Update card size based on LOD level
            let sizeMultiplier = 1.0;
            switch (lodLevel) {
                case 1: sizeMultiplier = 0.75; break;
                case 2: sizeMultiplier = 0.5; break;
                case 3: sizeMultiplier = 0.25; break;
                default: sizeMultiplier = 1.0; break;
            }
            c.currentSize = c.size * sizeMultiplier;

            // Update fill animation with gradual transition and random timing
            // Use the random offset to make each card's animation unique
            // Add variation to the speed and direction of each card's animation
            const speedVariation = 0.1 + Math.random() * 0.3; // 0.1x to 0.4x normal speed (much slower)
            c.fillProgress += delta * CARD_TWINKLE_RATE * c.fillDirection * speedVariation;
            
            // Reverse direction at bounds with some randomness
            if (c.fillProgress >= 1.0) {
                c.fillProgress = 1.0;
                // Add slight randomness to when cards start hollowing
                if (Math.random() > 0.5) { // 50% chance to reverse (much slower cycling)
                    c.fillDirection = -1;
                }
            } else if (c.fillProgress <= 0.0) {
                c.fillProgress = 0.0;
                // Add slight randomness to when cards start filling
                if (Math.random() > 0.5) { // 50% chance to reverse (much slower cycling)
                    c.fillDirection = 1;
                }
            }

            // Apply material switching based on fill state with dissolve effect
            // Calculate material indices based on the order they were created
            // Materials are created in pairs: filled then hollow
            // Find the base index for this card's style and suit
            const styleIndex = CARD_STYLES.indexOf(c.style);
            const suitIndex = CARD_SUITS.indexOf(c.suit);
            
            if (styleIndex !== -1 && suitIndex !== -1) {
                // Each style has 4 suits, each suit has 2 materials (filled + hollow)
                const baseIndex = (styleIndex * CARD_SUITS.length + suitIndex) * 2;
                const filledMaterialIndex = baseIndex;      // First of the pair
                const hollowMaterialIndex = baseIndex + 1;  // Second of the pair
                
                // Implement dissolve effect by blending between materials
                // Use the card's random offset to stagger transitions
                const transitionWidth = 0.7; // Even wider transition zone for more visible dissolve
                // Offset the transition point for each card
                const offsetTransitionPoint = 0.5 + Math.sin(c.randomOffset) * 0.15; // Vary between 0.35 and 0.65
                const transitionStart = offsetTransitionPoint - transitionWidth / 2;
                const transitionEnd = offsetTransitionPoint + transitionWidth / 2;
                
                if (c.fillProgress < transitionStart) {
                    // Show hollow material only
                    if (sprite && c.materialIndex !== hollowMaterialIndex) {
                        sprite.material = cardsRef.current.materials[hollowMaterialIndex];
                        c.materialIndex = hollowMaterialIndex;
                    }
                } else if (c.fillProgress > transitionEnd) {
                    // Show filled material only
                    if (sprite && c.materialIndex !== filledMaterialIndex) {
                        sprite.material = cardsRef.current.materials[filledMaterialIndex];
                        c.materialIndex = filledMaterialIndex;
                    }
                } else {
                    // In transition zone - blend by switching materials
                    // This creates a dissolve effect by alternating between materials
                    const transitionProgress = (c.fillProgress - transitionStart) / transitionWidth;
                    // Use the card's random offset to create unique switching patterns
                    // Much slower switching for more visible effect
                    const switchValue = Math.sin(transitionProgress * Math.PI + c.randomOffset);
                    const useFilledMaterial = switchValue > 0;
                    const targetMaterialIndex = useFilledMaterial ? filledMaterialIndex : hollowMaterialIndex;
                    
                    if (sprite && c.materialIndex !== targetMaterialIndex) {
                        sprite.material = cardsRef.current.materials[targetMaterialIndex];
                        c.materialIndex = targetMaterialIndex;
                    }
                }
            }

            // Apply aspect ratio and LOD-based scaling to sprite
            if (sprite && c.aspectRatio > 0) {
                const scaleX = c.currentSize * c.aspectRatio;
                const scaleY = c.currentSize;
                sprite.scale.set(scaleX, scaleY, 1);
            }

            // Apply opacity with subtle variation
            if (sprite.material) {
                (sprite.material as THREE.SpriteMaterial).opacity = c.baseOpacity + Math.sin(elapsed * 2 + i * 0.1) * 0.1;
            }
        }
    };

    // --- Shooting Star Update Logic ---
    const updateShootingStars = (delta: number) => {
        const stars = shootingStarsRef.current;
        const elapsed = clock.getElapsedTime();
        // Create a new array to store active stars
        const activeStars: ShootingStarData[] = [];
        
        for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            
            // Update progress
            star.progress += delta * star.speed * SHOOTING_STAR_TWINKLE_RATE;
            
            // Remove if completed
            if (star.progress >= 1.0) {
                // Clean up completed star
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
                continue; // Skip adding to active stars
            }
            
            // Add to active stars
            activeStars.push(star);
            
            // Update sprite position along the line
            const startParticle = cardsRef.current.data[star.startParticleId];
            const endParticle = cardsRef.current.data[star.endParticleId];
            
            if (startParticle && endParticle) {
                const t = star.progress;
                star.sprite.position.lerpVectors(
                    startParticle.position,
                    endParticle.position,
                    t
                );
                
                // Handle gradual fade-in over first 10 frames
                let fadeInFactor = 1.0;
                if (star.spawnFrame !== undefined) {
                    const framesSinceSpawn = performanceRef.current.frameCount - star.spawnFrame;
                    if (framesSinceSpawn < 10) {
                        // Gradually increase opacity and size over first 10 frames
                        fadeInFactor = framesSinceSpawn / 10;
                    }
                }
                
                // Update sprite size and opacity based on progress for smooth fade in/out
                const fadeInOut = Math.sin(t * Math.PI); // Smooth fade in/out
                const effectiveScale = fadeInOut * 30 * fadeInFactor;
                const effectiveOpacity = fadeInOut * fadeInFactor;
                
                star.sprite.scale.setScalar(effectiveScale); // Scale based on fade
                (star.sprite.material as THREE.SpriteMaterial).opacity = effectiveOpacity;
                
                // Add twinkle effect without color tinting
                // Use brightness adjustment instead of color tinting for twinkle effect
                const twinkle = (Math.sin(elapsed * SHOOTING_STAR_TWINKLE_RATE * 2 + i) + 1) * 0.5;
                // Adjust brightness only, keeping color as white to preserve original emoji colors
                const brightness = 0.7 + (twinkle * 0.3); // Base brightness 0.7, twinkle adds up to 0.3
                star.sprite.material.color.setRGB(brightness, brightness, brightness);
                
                // Update line vertices
                const positions = star.lineGeometry.attributes.position;
                if (positions instanceof THREE.BufferAttribute) {
                    const startPos = startParticle.position;
                    const currentPos = star.sprite.position;
                    positions.setXYZ(0, startPos.x, startPos.y, startPos.z);
                    positions.setXYZ(1, currentPos.x, currentPos.y, currentPos.z);
                    positions.needsUpdate = true;
                }
                
                // Update line opacity to match sprite
                (star.line.material as THREE.LineBasicMaterial).opacity = effectiveOpacity * 0.3;
            }
        }
        
        // Update the shooting stars array with only active stars
        shootingStarsRef.current = activeStars as ShootingStarRefData;
    };

    // --- Helper to create a new shooting star ---
    const createShootingStar = () => {
        const data = cardsRef.current.data;
        if (data.length === 0) return null;

        // Find a random starting particle
        const startParticleId = Math.floor(Math.random() * data.length);
        const startParticle = data[startParticleId];
        
        // Find a suitable end particle (not too close, not too far)
        const endParticleId = findNextParticle(startParticleId);
        if (endParticleId === null) return null;

        // Create geometry for the line
        const lineGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(2 * 3); // 2 points, 3 coordinates each
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // Create material for the line with initial transparency
        const lineMaterial = new THREE.LineBasicMaterial({
            color: currentStarColorRef.current,
            transparent: true,
            opacity: 0, // Start fully transparent
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        // Create the line
        const line = new THREE.Line(lineGeometry, lineMaterial);

        // Create sprite for the star head using money emoji
        const emojis = ['$', '💸', '💰', '🪙', ]; // Added more money symbols
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        const starTexture = createMoneyStarTexture(emoji);
        
        const spriteMaterial = new THREE.SpriteMaterial({
            map: starTexture,
            color: 0xffffff, // White color to preserve original emoji colors
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
            opacity: 0, // Start fully transparent
        });
        
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.setScalar(0); // Start at zero size
        sprite.position.copy(startParticle.position);

        // Add to scene
        if (groupRef.current) {
            groupRef.current.add(sprite);
            groupRef.current.add(line);
        }

        // Create and store the shooting star data
        const star: ShootingStarData = {
            sprite,
            line,
            lineGeometry,
            startParticleId,
            endParticleId,
            progress: 0,
            speed: SHOOTING_STAR_SPEED,
            color: currentStarColorRef.current.clone(),
            spawnFrame: performanceRef.current.frameCount, // Track when the star was spawned
        };

        shootingStarsRef.current.push(star);
        return star;
    };

    // --- Helper to find a suitable next particle for shooting star ---
    const findNextParticle = (currentId: number): number | null => {
        const data = cardsRef.current.data;
        if (data.length < 2) return null;

        // Try to find a particle that's not too close but also not too far
        const currentParticle = data[currentId];
        const maxAttempts = 20;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const candidateId = Math.floor(Math.random() * data.length);
            if (candidateId === currentId) continue;
            
            const candidateParticle = data[candidateId];
            const distance = currentParticle.position.distanceTo(candidateParticle.position);
            
            // Accept if within reasonable range
            if (distance > 100 && distance < MAX_SHOOTING_STAR_DISTANCE) {
                return candidateId;
            }
        }
        
        // If we couldn't find a good candidate, just pick any other particle
        for (let i = 0; i < data.length; i++) {
            if (i !== currentId) {
                return i;
            }
        }
        
        return null;
    };

    // --- Interactivity ---
    const handleKeyPress = useCallback((e: KeyboardEvent) => {
        if (!e.key) return;  // Add null check for e.key
        
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
                 // Use type assertion to access color property
                 (star.sprite.material as THREE.SpriteMaterial).color.set(newColorHex!);
                 (star.line.material as THREE.LineBasicMaterial).color.set(newColorHex!);
                 star.color.set(newColorHex!);
            });
            // console.log("Shooting star color changed to:", newColorHex);
        }
    }, []);

    // Smooth easing function for natural motion
    const easeInOutCubic = (t: number): number => {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    return (
        <div ref={mountRef} style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            zIndex: -1, 
            width: '100%', 
            height: '100%', 
            overflow: 'hidden',
            backgroundColor: BASE_BACKGROUND_COLOR,
            pointerEvents: 'none' // Allow pointer events to pass through to children
        }}>

        </div>
    );
};

export default DynamicBackground3D;