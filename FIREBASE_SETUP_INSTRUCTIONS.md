# Firebase Service Account Setup for FCM Push Notifications

## Step 1: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `carsg-d5bed`
3. Go to **Project Settings** (gear icon) → **Service accounts**
4. Click **Generate new private key**
5. Download the JSON file

## Step 2: Configure Environment Variables

Replace the incomplete `GOOGLE_SERVICE_ACCOUNT_JSON` in your `.env` files with the complete JSON from the downloaded file:

```bash
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"carsg-d5bed","private_key_id":"YOUR_PRIVATE_KEY_ID","private_key":"-----BEGIN PRIVATE KEY-----\nYOUR_COMPLETE_PRIVATE_KEY\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@carsg-d5bed.iam.gserviceaccount.com","client_id":"YOUR_CLIENT_ID","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40carsg-d5bed.iam.gserviceaccount.com","universe_domain":"googleapis.com"}
```

**Important**: Make sure to escape the newlines in the private key with `\\n`

## Step 3: Verify FCM Configuration

1. Make sure these values match in both `.env` and `server/.env`:
   - `FCM_PROJECT_ID=carsg-d5bed`
   - `VITE_FIREBASE_PROJECT_ID=carsg-d5bed`
   - `VITE_FIREBASE_VAPID_KEY=BOcuY1wyHC11xtOEQ3xbzqaArVwPVdtqDWo2OjlsMb6rJVPLaaG2u3Mvt955IQoqQ42q6dnIlre93KAzjMwztkE`

## Step 4: Test FCM Setup

Run the test script to verify everything works:
```bash
node scripts/test-fcm-direct.js
```

## Troubleshooting

### "UNREGISTERED" Error
- This means the FCM tokens in your database are expired/invalid
- Users need to refresh the page to get new tokens
- Clear the `push_subscriptions` table and have users re-register

### "Invalid private key" Error
- Check that the private key is properly escaped with `\\n`
- Make sure the JSON is valid and complete
- Verify the service account has FCM permissions

### VAPID Key Mismatch
- Ensure the same VAPID key is used in both frontend and backend
- Get the correct Web Push certificate key from Firebase Console
