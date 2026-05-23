const R2_CDN_BASE = 'https://pub-e1eb76428e24457ebfc067c635cb4fc4.r2.dev';

export const CARICATURE_STYLES = [
    { label: 'Custom', value: 'custom', image: null },
    { label: 'Rubber Hose', value: 'rubber-hose', image: '/images/nav/style-rubber-hose.jpg' },
    { label: 'Vibrant Colors', value: 'vibrant-colors', image: '/images/nav/style-vibrant-colors.png' },
    { label: 'Corporate Memphis', value: 'corporate-memphis', image: '/images/nav/style-corporate-memphis.jpg' },
    { label: 'Storybook', value: 'storybook', image: '/images/nav/style-ghibli.png' },
    { label: 'Classic Animation', value: 'classic-animation', image: `${R2_CDN_BASE}/imgs/caricature-maker/q-style.webp` },
    { label: '3D Family', value: '3d-family', image: `${R2_CDN_BASE}/imgs/caricature-maker/pixar.webp` },
    { label: 'Graphic Comic', value: 'graphic-comic', image: `${R2_CDN_BASE}/imgs/get-inspired/neon-noir.png` },
    { label: 'Clean Line', value: 'clean-line', image: `${R2_CDN_BASE}/imgs/get-inspired/ink-painting.png` },
];

export const ASPECT_RATIOS = [
    { label: 'Square (1:1)', value: '1:1', widthClass: 'w-4', heightClass: 'h-4' },
    { label: 'Landscape (3:2)', value: '3:2', widthClass: 'w-6', heightClass: 'h-4' },
    { label: 'Portrait (2:3)', value: '2:3', widthClass: 'w-4', heightClass: 'h-6' },
];

export const RESOLUTIONS = [
    { label: '1K', value: '1K' },
    { label: '2K', value: '2K' },
    { label: '4K', value: '4K' },
];

export const GET_INSPIRED_ITEMS = [
    {
        image: "/imgs/get-inspired/image-267.jpg",
        prompt: "serene desert oasis at sunset, palm trees around a small pool, caravans in the distance, warm orange and pink haze, cinematic landscape, no text, Caricature"
    },
    {
        image: "/imgs/get-inspired/image-268-1.png",
        prompt: "high quality illustration of a dreamy botanical greenhouse at night, glass ceiling with starry sky, hanging plants and glowing terrariums, soft teal and amber lighting, gentle mist, cinematic depth, no text, Caricature"
    },
    {
        image: "/imgs/get-inspired/image-277-1.png",
        prompt: "cozy mountain cabin in snowy woods, warm light spilling from windows, smoke rising from chimney, soft falling snow, pine trees glowing with lanterns, painterly fantasy style, no text, Caricature"
    },
    {
        image: "/imgs/get-inspired/image-271-1.png",
        prompt: "magical library hallway with towering shelves, rolling ladders, glowing dust motes, a curious fox reading a book, warm amber lighting, rich wood textures, no text, Caricature"
    },
    {
        image: "/imgs/get-inspired/a1613a75-dfa7-4ac2-ae9c-209182c3786d.png",
        prompt: "charming seaside harbor at dawn, colorful boats, gentle waves, seagulls in the sky, warm golden light, painterly coastal vibe, no text, Caricature"
    },
    {
        image: "/imgs/get-inspired/image-273-1.png",
        prompt: "serene Japanese garden in light rain, stone lanterns, koi pond ripples, maple leaves, soft gray-blue palette with warm lantern glow, elegant illustration, no text"
    },
    {
        image: "/imgs/get-inspired/image-276-1.png",
        prompt: "enchanted river canyon with bioluminescent plants, glowing blue water, tiny boat drifting, soft fog and starry sky, fantasy illustration, no text"
    },
    {
        image: "/imgs/get-inspired/image-280-1.png",
        prompt: "whimsical potion shop interior, shelves of glowing bottles, brass scales, velvet curtains, a friendly wizard cat on the counter, warm magical lighting, no text, Caricature"
    },
    {
        image: "/imgs/get-inspired/image-281-1.png",
        prompt: "whimsical sky market at sunrise, small airships docked at a floating platform, warm sun rays, colorful banners fluttering, painterly clouds, magical atmosphere, no text"
    },
    {
        image: "/imgs/get-inspired/image-275-1.png",
        prompt: "floating island village above the clouds, small houses with warm windows, waterfalls spilling into the sky, pastel sunset, gentle haze, painterly fantasy style, cinematic depth, no text"
    },
    {
        image: "/imgs/get-inspired/image-269-1.png",
        prompt: "moonlit lakeside scene, elegant crane by calm water, large full moon and soft mist, ink-and-wash aesthetic with subtle color accents, tranquil mood, no text"
    },
    {
        image: "/imgs/get-inspired/image-272-1.png",
        prompt: "3D cartoon underwater scene, cute sea turtle and tiny diver near a coral garden, sunbeams piercing blue water, floating bubbles and particles, playful yet polished, cinematic 3D lighting, no text"
    },
    {
        image: "/imgs/get-inspired/image-274-1.png",
        prompt: "high quality illustration of a cozy attic artist studio, warm amber desk lamp, wooden table full of sketchbooks and colorful pencils, a friendly cat mascot sitting on a stool, soft dust particles in the air, cinematic lighting, rich textures, no text"
    },
    {
        image: "/imgs/get-inspired/f49166b1-9b9d-44cc-a505-f8811c0b47f2.png",
        prompt: "cozy riverside tea house at dusk, glowing paper lanterns reflected on water, gentle fog, warm amber palette, cinematic lighting, no text, caricature illustration"
    },
    {
        image: "/imgs/get-inspired/image-286.png",
        prompt: "vibrant carnival carousel in the rain, colorful lights reflecting on cobblestones, festive yet cozy mood, no text, caricature illustration"
    },
    {
        image: "/imgs/get-inspired/image-285.png",
        prompt: "whimsical clocktower plaza with flying paper cranes and drifting balloons, soft pastel sky, painterly textures, no text, caricature illustration"
    }
];
