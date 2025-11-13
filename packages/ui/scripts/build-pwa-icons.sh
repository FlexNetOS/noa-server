#!/bin/bash
# Generate PWA icons from a source image
# Requires ImageMagick: sudo apt-get install imagemagick

set -e

SOURCE_IMAGE="${1:-./public/logo.png}"
OUTPUT_DIR="./public"

if [ ! -f "$SOURCE_IMAGE" ]; then
  echo "❌ Source image not found: $SOURCE_IMAGE"
  echo "Usage: ./scripts/build-pwa-icons.sh [source-image-path]"
  exit 1
fi

if ! command -v convert &> /dev/null; then
  echo "❌ ImageMagick is not installed. Install with: sudo apt-get install imagemagick"
  exit 1
fi

echo "🎨 Generating PWA icons from $SOURCE_IMAGE..."

# Icon sizes for PWA
SIZES=(72 96 128 144 152 192 384 512)

for SIZE in "${SIZES[@]}"; do
  echo "  📱 Generating ${SIZE}x${SIZE}..."
  convert "$SOURCE_IMAGE" \
    -resize "${SIZE}x${SIZE}" \
    -background transparent \
    -gravity center \
    -extent "${SIZE}x${SIZE}" \
    "${OUTPUT_DIR}/icon-${SIZE}.png"
done

# Generate favicon
echo "  🔖 Generating favicon..."
convert "$SOURCE_IMAGE" \
  -resize 32x32 \
  -background transparent \
  -gravity center \
  -extent 32x32 \
  "${OUTPUT_DIR}/favicon.ico"

# Generate apple-touch-icon
echo "  🍎 Generating Apple Touch Icon..."
convert "$SOURCE_IMAGE" \
  -resize 180x180 \
  -background transparent \
  -gravity center \
  -extent 180x180 \
  "${OUTPUT_DIR}/apple-touch-icon.png"

# Generate maskable icons (with padding)
echo "  🎭 Generating maskable icons..."
for SIZE in 192 512; do
  convert "$SOURCE_IMAGE" \
    -resize "$((SIZE * 80 / 100))x$((SIZE * 80 / 100))" \
    -background "#6366f1" \
    -gravity center \
    -extent "${SIZE}x${SIZE}" \
    "${OUTPUT_DIR}/icon-${SIZE}-maskable.png"
done

echo "✅ PWA icons generated successfully!"
echo ""
echo "Generated files:"
for SIZE in "${SIZES[@]}"; do
  echo "  • icon-${SIZE}.png"
done
echo "  • favicon.ico"
echo "  • apple-touch-icon.png"
echo "  • icon-192-maskable.png"
echo "  • icon-512-maskable.png"
