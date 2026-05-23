# Nano Banana Pro AI Image Generator

## Overview

Nano Banana Pro is an AI image generation component integrated into the main application, supporting both text-to-image and image-to-image generation modes. This component provides a complete user interface, error handling, local storage management, and responsive design.

## Features

### 🎨 Dual Generation Modes
- **Text-to-Image**: Generate images from text descriptions
- **Image-to-Image**: Transform and optimize based on reference images

### 📱 Responsive Design
- Support for desktop and mobile devices
- Adaptive layout and theme switching
- Elegant user interface and interaction animations

### 🔧 Complete Functionality
- Multiple aspect ratio options (1:1, 16:9, 4:3, etc.)
- Resolution options (1K, 2K, 4K)
- Output format selection (PNG, JPG)
- Support for up to 8 reference image uploads

### 💾 Local Storage
- Automatic saving of generated images
- My creations gallery management
- Search and filter functionality
- One-click download and delete

### 🛡️ Error Handling
- File upload validation
- API error handling
- Inline error display
- Graceful error recovery

## Component Structure

```
src/components/nano-banana-pro/
├── index.tsx                    # Main generator component
├── my-creations.tsx            # My creations gallery component
├── hero.tsx                    # Homepage hero section component
├── home-integration.tsx        # Homepage integration component
├── error-boundary.tsx          # Error boundary component
├── inline-error.tsx            # Inline error display component
├── loading-state.tsx           # Loading state component
├── types.ts                    # TypeScript type definitions
├── constants.ts                # Constants configuration
├── utils.ts                    # Utility functions
├── __tests__/                  # Test files
│   ├── utils.test.ts           # Utility function unit tests
│   ├── components.test.tsx     # Component unit tests
│   └── integration.test.tsx    # Integration tests
└── README.md                   # Documentation
```

## Page Routes

```
src/app/[locale]/(default)/
├── nano-banana-pro/
│   ├── page.tsx                # Generator page
│   └── my-creations/
│       └── page.tsx            # My creations page
└── page.tsx                    # Homepage (with integrated component)
```

## Usage

### Basic Usage

```tsx
import NanoBananaPro from '@/components/nano-banana-pro';

// Full page mode
<NanoBananaPro />

// Embedded mode (for homepage)
<NanoBananaPro embedded={true} showHeader={false} />
```

### My Creations Component

```tsx
import MyCreations from '@/components/nano-banana-pro/my-creations';

// Full gallery
<MyCreations />

// Limited display count
<MyCreations maxItems={6} showViewAll={true} />

// Custom title and description
<MyCreations 
  title="My AI Artworks"
  description="View your created beautiful images"
/>
```

## API Integration

### Image Generation Interface

The component uses the existing `/api/gen-outfit` interface for image generation:

```typescript
// Text-to-Image
POST /api/gen-outfit
{
  "description": "User prompt",
  "aspect_ratio": "16:9",
  "resolution": "1K"
}

// Image-to-Image
POST /api/gen-outfit
{
  "base_image_url": "https://example.com/ref-image.jpg",
  "description": "Transformation description",
  "aspect_ratio": "16:9",
  "resolution": "1K"
}
```

### File Upload

Uses the existing `uploadImageFile` function for R2 storage upload:

```typescript
import { uploadImageFile } from '@/lib/upload';

const { url, base64 } = await uploadImageFile(file, {
  type: 'nano-banana-pro',
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
});
```

## Local Storage

### Data Structure

```typescript
// My creations
localStorage.setItem('my_creations', JSON.stringify([
  {
    id: 'unique-id',
    url: 'https://example.com/image.jpg',
    prompt: 'User prompt',
    createdAt: 1234567890,
    aspectRatio: '16:9',
    model: 'nano-banana-pro',
    mode: 'TEXT_TO_IMAGE'
  }
]));

// User preferences
localStorage.setItem('nano_banana_preferences', JSON.stringify({
  defaultAspectRatio: 'Auto',
  defaultResolution: '1K',
  defaultMode: 'IMAGE_TO_IMAGE'
}));
```

## Testing

### Running Tests

```bash
# Install test dependencies (manual installation required)
npm install --save-dev jest @testing-library/react @testing-library/jest-dom fast-check msw

# Run tests
npm test
```

### Test Coverage

- ✅ Unit tests: Component rendering, user interactions, utility functions
- ✅ Integration tests: API calls, file uploads, end-to-end flows
- ✅ Property tests: General property validation, boundary condition testing

## Error Handling

### File Upload Errors
- File format validation
- File size limits
- Upload failure retry

### API Errors
- Network error handling
- Server error display
- Timeout handling

### Local Storage Errors
- Insufficient storage space
- Data corruption recovery
- Read failure handling

## Theme Support

The component fully supports the application's theme system:

```css
/* Using CSS variables */
.component {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  border-color: hsl(var(--border));
}
```

## Performance Optimization

- Image lazy loading
- Component code splitting
- Local storage caching
- Error boundary protection
- Responsive image processing

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing Guidelines

1. Follow existing code style
2. Add appropriate TypeScript types
3. Write unit tests and integration tests
4. Update documentation
5. Ensure accessibility support

## License

Consistent with the main project license.