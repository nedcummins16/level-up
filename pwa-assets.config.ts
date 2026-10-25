import { combinePresetAndAppleSplashScreens, defineConfig, type Preset } from '@vite-pwa/assets-generator/config'

// Generates app icons + iPhone splash screens from public/icon.svg.
// Run once with: npm run generate-assets (output goes to public/, commit it).
const BG = '#0b0d10'

const preset: Preset = {
  transparent: { sizes: [64, 192, 512], favicons: [[48, 'favicon.ico']], padding: 0 },
  maskable: { sizes: [512], padding: 0.25, resizeOptions: { background: BG } },
  apple: { sizes: [180], padding: 0, resizeOptions: { background: BG } },
}

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: combinePresetAndAppleSplashScreens(
    preset,
    {
      padding: 0.55,
      resizeOptions: { background: BG, fit: 'contain' },
      linkMediaOptions: { log: true, addMediaScreen: true, basePath: '/level-up/', xhtml: false },
      png: { compressionLevel: 9, quality: 70 },
    },
    [
      'iPhone 17 Pro Max',
      'iPhone 17 Pro',
      'iPhone Air',
      'iPhone 17',
      'iPhone 16 Pro Max',
      'iPhone 16 Pro',
      'iPhone 16 Plus',
      'iPhone 16',
      'iPhone 16e',
      'iPhone 15 Pro Max',
      'iPhone 15 Pro',
      'iPhone 15 Plus',
      'iPhone 15',
      'iPhone 14 Pro Max',
      'iPhone 14 Pro',
      'iPhone 14 Plus',
      'iPhone 14',
      'iPhone 13 Pro Max',
      'iPhone 13 Pro',
      'iPhone 13',
      'iPhone 13 mini',
      'iPhone 12 Pro Max',
      'iPhone 12',
      'iPhone 11 Pro Max',
      'iPhone 11',
      'iPhone XS',
      'iPhone SE 4.7"',
    ],
  ),
  images: ['public/icon.svg'],
})
