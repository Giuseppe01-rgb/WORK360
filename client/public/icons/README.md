# PWA Icons Directory

## Current Status

✅ **Temporary Icon**: Using AI-generated placeholder icon (`icon-512x512.png`)

## TODO: Generate All Icon Sizes

To complete the PWA icon set, generate these sizes from your final WORK360 logo:

### Required Sizes
- ✅ `icon-512x512.png` (Main icon, currently placeholder)
- ⏳ `icon-384x384.png`
- ⏳ `icon-192x192.png`
- ⏳ `icon-152x152.png`
- ⏳ `icon-144x144.png`
- ⏳ `icon-128x128.png`
- ⏳ `icon-96x96.png`
- ⏳ `icon-72x72.png`

### How to Generate

#### Option 1: Using Online Tool
1. Go to https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator
2. Upload your WORK360 logo (SVG or high-res PNG)
3. Download the generated set
4. Replace files in this directory

#### Option 2: Using ImageMagick (Command Line)
```bash
# From your source logo (logo.png), generate all sizes:
convert logo.png -resize 512x512 icon-512x512.png
convert logo.png -resize 384x384 icon-384x384.png
convert logo.png -resize 192x192 icon-192x192.png
convert logo.png -resize 152x152 icon-152x152.png
convert logo.png -resize 144x144 icon-144x144.png
convert logo.png -resize 128x128 icon-128x128.png
convert logo.png -resize 96x96 icon-96x96.png
convert logo.png -resize 72x72 icon-72x72.png
```

#### Option 3: Using sharp (Node.js)
```javascript
const sharp = require('sharp');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  sharp('logo.png')
    .resize(size, size)
    .toFile(`icon-${size}x${size}.png`);
});
```

### Icon Design Guidelines

For best PWA experience:

1. **Background**: Use solid color (#5D5FEF) or gradient
2. **Content**: Center your logo/icon with padding
3. **Format**: PNG with transparency
4. **Safe Area**: Keep important content away from edges (20% padding)
5. **Maskable**: Ensure icon looks good when masked (circular on Android)

### Testing Icons

After generating:
1. Build the project: `npm run build`
2. Open in Chrome DevTools > Application > Manifest
3. Check all icons load correctly
4. Test "Add to Home Screen" on mobile
5. Verify icon appears correctly on home screen

---

**Note**: Current placeholder icon is functional but should be replaced with official WORK360 branded icon before production deployment.
