# AI Testing Guide

This guide explains how to test the AI analysis functionality with your Philippine National ID images.

## Prerequisites

1. **Google Vision API Credentials**: Make sure your `.env` file contains:
   ```
   GOOGLE_CLIENT_EMAIL=your-email@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_PROJECT_ID=your-project-id
   ```

2. **Test Images**: Place your ID images in the correct location:
   ```
   public/images/front id.jpg
   public/images/back id.jpg
   ```

## Running the Tests

### Development Environment

```bash
# Test with development settings
npm run test:ai

# Or run directly
node test-real-ai.js
```

### Production Environment

```bash
# Test with production settings
npm run test:ai:prod

# Or run directly
NODE_ENV=production node test-ai-production.js
```

## What the Tests Do

1. **Environment Detection**: Automatically detects development vs production
2. **Image Discovery**: Finds your ID images in different possible locations
3. **Google Vision API**: Uses real AI to analyze the images
4. **Text Extraction**: Reads all text from the images using OCR
5. **Label Detection**: Identifies document types and features
6. **Location Verification**: Checks for "San Pablo, Castillejos, Zambales"
7. **Analysis Results**: Provides detailed analysis with confidence scores

## Expected Results for Philippine National ID

For a legitimate Philippine National ID with correct location:

- ✅ **Confidence**: 90-100%
- ✅ **Authentic**: Yes
- ✅ **Document Type**: Philippine National ID
- ✅ **Location Verified**: San Pablo, Castillejos, Zambales
- ✅ **Selfie Detection**: No Selfie
- ✅ **Issues**: None

## Troubleshooting

### Images Not Found
```
❌ Front image not found
❌ Back image not found
```
**Solution**: Make sure your images are in `public/images/` with the exact names:
- `front id.jpg`
- `back id.jpg`

### Google Vision API Not Configured
```
❌ Google Vision API credentials not found
```
**Solution**: Check your `.env` file contains all required variables.

### Environment Issues
```
❌ Test failed: [error message]
```
**Solution**: 
- For development: Use `npm run test:ai`
- For production: Use `npm run test:ai:prod`

## File Structure

```
project/
├── public/images/
│   ├── front id.jpg
│   └── back id.jpg
├── test-real-ai.js          # Development test
├── test-ai-production.js     # Production test
├── .env                      # Environment variables
└── package.json              # Scripts
```

## Scripts Available

- `npm run test:ai` - Development AI test
- `npm run test:ai:prod` - Production AI test

## Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_CLIENT_EMAIL` | Service account email | `vision-ai@project.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | Service account private key | `-----BEGIN PRIVATE KEY-----\n...` |
| `GOOGLE_PROJECT_ID` | Google Cloud project ID | `your-project-id` |

## Notes

- The tests use **real Google Vision API** - not mock data
- Images are analyzed using **actual OCR and label detection**
- Results are based on **real image content analysis**
- The AI will properly detect Philippine National IDs and verify locations
