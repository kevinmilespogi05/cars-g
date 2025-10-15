# Google Vision AI Setup Guide

This guide will help you configure Google Vision AI for ID verification in your application.

## Prerequisites

1. Google Cloud Platform account
2. Google Cloud Project with Vision API enabled
3. Service Account with Vision API permissions

## Step 1: Enable Google Vision API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to "APIs & Services" > "Library"
4. Search for "Vision API" and enable it

## Step 2: Create Service Account

### Quick Setup (Recommended)
1. Go to "IAM & Admin" > "Service Accounts"
2. Click "Create Service Account"
3. Fill in the details:
   - Name: `vision-ai-service`
   - Description: `Service account for Vision AI ID verification`
4. Click "Create and Continue"
5. **Grant the `Editor` role** (simplest approach - includes all necessary permissions)
6. Click "Done"

### Advanced Setup (Custom Permissions)
If you prefer minimal permissions:
1. Follow steps 1-4 above
2. Grant these specific roles:
   - `Cloud Vision API Client` (for Vision API access)
   - `Storage Object Viewer` (if using Cloud Storage)
   - `Service Account User` (for API authentication)
   
   **If roles are not available**, create a custom role with these permissions:
   - `vision.images.annotate`
   - `storage.objects.get` (if using Cloud Storage)
3. Click "Done"

## Step 3: Generate Service Account Key

1. Click on your newly created service account
2. Go to the "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose "JSON" format
5. Download the JSON file

## Step 4: Extract Credentials

From the downloaded JSON file, extract these values:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "vision-ai-service@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

## Step 5: Environment Variables

Add these environment variables to your deployment platform (Vercel, Netlify, etc.):

```bash
# Google Vision AI Configuration
GOOGLE_CLIENT_EMAIL=vision-ai-service@cars-g-475204.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC49wQvs45Puv9+\noeG27MMlTzSN4JLxTCipuqSKztjmwqPb8Rau2IROjfiIJ01Wgx57DZwySWUFS/D6\njZP5bbF2iYz8cVorpuLUPMCcjSM+n+ObXt4BVzf4FycSiTGdRhOJLgw6DuWCIbCC\nSl6PP5jzHr5xAxQW0WUt8LEoCTrmEZ7ffeSNJgLkINml/bBQRBLeUF5Rxe4I9Jzf\n7vJQW1UCX4K4WCkaG/7MJUoWoR1PoNXhWJO7IJ7VjI39PD1NUGJreatiYqFDjVJP\ncZrKJThHg/3kswyTJy6ZQCIHQ+ZmX1+u6aqdRjVQimwY4VTOIgHxHzSwJ5Zd156A\nWxmr9W/7AgMBAAECggEAAxRmoKSzHRpWYE7+gx00fDQlaKqK+v/zOi0K/R5HxKly\nl2bpCcakU7dP1ae4RSIWj9Xzxwj4NaGRRM3p3zod8Lgf/aDYvE4hclQD1DESNSi6\nxKUZU5kwK8e26G6AW2E466Y1behxlqKykN8yhxARnxRHKq2/PkhrEHWOSl+QK34R\n9VOTfJ9ngzr31kbv3AqT9bMt9jGk0G3rLlghbhbfUoKGdQ+n0b6ZIjPVooz0kT6P\nD1O6mD3sSgE96KpLWri9o5XZiDXl/QeW0FuUiR3hAHgoEPntTiitLHOXTQh7n+a/\n4EaVugjNfilGOTb5wtXyyq6eaFUms8voE6nW+1rCAQKBgQDlvokjJKPZVr2Ooh7Y\nIXAVi6jpuWwoWtoah7toRB25zEQXrZ37IvO3mouge00DXndr4Eil/TbdwDE61TdH\nNDrSUiN4bpWSwT4vA2GKIjBuS2X7nnqKdeoKzDWoYFqq+S+dvmzMD3HqgpYTrIsc\nsM7cuAUdohC7GS2sW6v9oD7QCwKBgQDOGmcNL4ZygYt9BajafLU1kApxpTSn6kWU\nfPYINpYMn4br48GrAmoK8n/M5QscndkDplHq7vb0hovEces+fjkjWpUvp1weVpWO\nSf/nA7rcY9JvPX66xkB8r5U7Mdjv4z7TD0DnauPLDC3fuNFkW7Qr1OxqQc5DBb2u\nrZ5ZI1Ql0QKBgCW/eKjdjE5Zgiu9V3QLim7/03ETlkHLK6rQQmqPRpMQjN+XFy38\nQC8apXZoy+6Rxu1inI0pXapxuaUBA2QfoMqN1GYlRU4nkiAHXi9kDrEQkmEVWO0H\nEr1TcD2KF1ugNcKlVxrwLrdpXV8+Kl08b8C0O6Lyzezv5iE7rratbaShAoGASf0S\nd5pTErJMyAILHvxb9TGTfj7Hi2w/tFGz5TjrXva58d7efKyuMuXhWUX0Wj6UVIoV\nqFhHEXtnm4sl31Zi3r07B1N2b3G32M/Z7S3anBm9xq912kknh1tlIE4BygRzXkOA\nklM+GXty0HjButxs7rtOb8rV6Bucf6PWT7uuDrECgYBcIghTafUfyv8QgwEIfYfY\nHW9+lR1FEkkDixbw0P2UT++/atzbHXnaUI7qqiu5NB5Cqk9bDi06ZEXAi9XZH21D\ndJfxr/FoAKqQBBBNo5WpxtqdQTducjB4La9R3MSG5+4fx0LyIcS2AYU9iRmRA6px\n8Q3MmSBVWnVvae12mJmvwA==\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=cars-g-475204
```

## Step 6: Vercel DeploymentGOOGLE_CLIENT_EMAIL=vision-ai-service@cars-g-475204.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC49wQvs45Puv9+\noeG27MMlTzSN4JLxTCipuqSKztjmwqPb8Rau2IROjfiIJ01Wgx57DZwySWUFS/D6\njZP5bbF2iYz8cVorpuLUPMCcjSM+n+ObXt4BVzf4FycSiTGdRhOJLgw6DuWCIbCC\nSl6PP5jzHr5xAxQW0WUt8LEoCTrmEZ7ffeSNJgLkINml/bBQRBLeUF5Rxe4I9Jzf\n7vJQW1UCX4K4WCkaG/7MJUoWoR1PoNXhWJO7IJ7VjI39PD1NUGJreatiYqFDjVJP\ncZrKJThHg/3kswyTJy6ZQCIHQ+ZmX1+u6aqdRjVQimwY4VTOIgHxHzSwJ5Zd156A\nWxmr9W/7AgMBAAECggEAAxRmoKSzHRpWYE7+gx00fDQlaKqK+v/zOi0K/R5HxKly\nl2bpCcakU7dP1ae4RSIWj9Xzxwj4NaGRRM3p3zod8Lgf/aDYvE4hclQD1DESNSi6\nxKUZU5kwK8e26G6AW2E466Y1behxlqKykN8yhxARnxRHKq2/PkhrEHWOSl+QK34R\n9VOTfJ9ngzr31kbv3AqT9bMt9jGk0G3rLlghbhbfUoKGdQ+n0b6ZIjPVooz0kT6P\nD1O6mD3sSgE96KpLWri9o5XZiDXl/QeW0FuUiR3hAHgoEPntTiitLHOXTQh7n+a/\n4EaVugjNfilGOTb5wtXyyq6eaFUms8voE6nW+1rCAQKBgQDlvokjJKPZVr2Ooh7Y\nIXAVi6jpuWwoWtoah7toRB25zEQXrZ37IvO3mouge00DXndr4Eil/TbdwDE61TdH\nNDrSUiN4bpWSwT4vA2GKIjBuS2X7nnqKdeoKzDWoYFqq+S+dvmzMD3HqgpYTrIsc\nsM7cuAUdohC7GS2sW6v9oD7QCwKBgQDOGmcNL4ZygYt9BajafLU1kApxpTSn6kWU\nfPYINpYMn4br48GrAmoK8n/M5QscndkDplHq7vb0hovEces+fjkjWpUvp1weVpWO\nSf/nA7rcY9JvPX66xkB8r5U7Mdjv4z7TD0DnauPLDC3fuNFkW7Qr1OxqQc5DBb2u\nrZ5ZI1Ql0QKBgCW/eKjdjE5Zgiu9V3QLim7/03ETlkHLK6rQQmqPRpMQjN+XFy38\nQC8apXZoy+6Rxu1inI0pXapxuaUBA2QfoMqN1GYlRU4nkiAHXi9kDrEQkmEVWO0H\nEr1TcD2KF1ugNcKlVxrwLrdpXV8+Kl08b8C0O6Lyzezv5iE7rratbaShAoGASf0S\nd5pTErJMyAILHvxb9TGTfj7Hi2w/tFGz5TjrXva58d7efKyuMuXhWUX0Wj6UVIoV\nqFhHEXtnm4sl31Zi3r07B1N2b3G32M/Z7S3anBm9xq912kknh1tlIE4BygRzXkOA\nklM+GXty0HjButxs7rtOb8rV6Bucf6PWT7uuDrECgYBcIghTafUfyv8QgwEIfYfY\nHW9+lR1FEkkDixbw0P2UT++/atzbHXnaUI7qqiu5NB5Cqk9bDi06ZEXAi9XZH21D\ndJfxr/FoAKqQBBBNo5WpxtqdQTducjB4La9R3MSG5+4fx0LyIcS2AYU9iRmRA6px\n8Q3MmSBVWnVvae12mJmvwA==\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=cars-g-475204

If using Vercel, add these to your project settings:

1. Go to your Vercel project dashboard
2. Navigate to "Settings" > "Environment Variables"
3. Add the three variables above
4. Redeploy your application

## Step 7: Test the Integration

1. Deploy your application
2. Try registering with ID images
3. Check the logs for any Vision API errors
4. Verify that AI analysis is working

## Troubleshooting

### Common Issues:

1. **Authentication Error**: Check that your service account has the correct permissions
2. **API Not Enabled**: Ensure Vision API is enabled in your Google Cloud project
3. **Quota Exceeded**: Check your Google Cloud billing and quotas
4. **Invalid Credentials**: Verify your environment variables are correctly set
5. **Role Not Found**: If you can't find specific roles, use the `Editor` role or create a custom role
6. **Permission Denied**: Ensure the Vision API is enabled and the service account has access

### Debug Steps:

1. Check server logs for Vision API errors
2. Verify environment variables are loaded correctly
3. Test with a simple image first
4. Check Google Cloud Console for API usage

## Cost Considerations

- Google Vision API charges per image analyzed
- Text detection: $1.50 per 1,000 images
- Label detection: $1.50 per 1,000 images
- Safe search detection: $1.50 per 1,000 images

Monitor your usage in the Google Cloud Console to avoid unexpected charges.

## Security Notes

- Never commit service account keys to version control
- Use environment variables for all credentials
- Regularly rotate service account keys
- Monitor API usage for unusual activity
