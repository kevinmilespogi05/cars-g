# Quick Fixes for TestSprite Findings

## 🚨 Critical Fixes (Do These Now!)

### Fix #1: Start the Backend Server

**Problem:** Backend API on port 3001 is not running  
**Impact:** 15 tests failing, core functionality broken  
**Time to Fix:** 2 minutes

```bash
# Navigate to server directory
cd server

# Install dependencies (if needed)
npm install

# Start the development server
npm run dev

# OR start production server
npm start
```

**Verify it's working:**
```bash
# Should see "Server running on port 3001" or similar
# Test with:
curl http://localhost:3001/health
```

---

### Fix #2: Welcome Guide Modal Dismissal

**Problem:** Users can't close the Welcome Guide after login  
**Impact:** 10+ tests failing, users can't access dashboard  
**Time to Fix:** 10 minutes

**File:** `src/components/WelcomeGuide.tsx`

Add these improvements:

```typescript
// Add ESC key handler
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      skipTour();
    }
  };
  
  if (isOpen) {
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }
}, [isOpen]);

// Add click-outside-to-close
const handleBackdropClick = (e: React.MouseEvent) => {
  if (e.target === e.currentTarget) {
    skipTour();
  }
};

// Update modal wrapper
<div 
  className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
  onClick={handleBackdropClick}  // Add this
>
  <div 
    className="bg-white rounded-lg max-w-2xl w-full"
    onClick={(e) => e.stopPropagation()}  // Prevent close on content click
  >
    {/* Add prominent X button */}
    <button
      onClick={skipTour}
      className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
      aria-label="Close guide"
    >
      <X className="w-6 h-6" />
    </button>
    
    {/* Rest of modal content */}
  </div>
</div>
```

---

### Fix #3: Privacy Policy Modal Dismissal

**Problem:** Privacy Policy modal can't be closed during registration  
**Impact:** Blocks registration completion  
**Time to Fix:** 10 minutes

**File:** `src/pages/Register.tsx`

Apply same fixes as Welcome Guide:

```typescript
// In the Privacy Policy modal section
const handlePrivacyClose = () => {
  setShowPrivacyModal(false);
};

// Add ESC key handler
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && showPrivacyModal) {
      handlePrivacyClose();
    }
  };
  window.addEventListener('keydown', handleEscape);
  return () => window.removeEventListener('keydown', handleEscape);
}, [showPrivacyModal]);

// Update modal JSX
{showPrivacyModal && (
  <div 
    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    onClick={(e) => {
      if (e.target === e.currentTarget) handlePrivacyClose();
    }}
  >
    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
      {/* Add X button */}
      <button
        onClick={handlePrivacyClose}
        className="sticky top-4 right-4 float-right text-gray-500 hover:text-gray-700"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>
      
      {/* Privacy Policy content */}
    </div>
  </div>
)}
```

---

### Fix #4: ID Verification File Upload

**Problem:** File upload not working in ID verification step  
**Impact:** Users can't complete registration  
**Time to Fix:** 15 minutes

**File:** `src/pages/Register.tsx`

Check these areas:

```typescript
// 1. Verify file input accepts correct types
<input
  type="file"
  accept="image/png, image/jpeg, image/jpg"  // Make sure this is present
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleIdImageUpload(file, 'front'); // or 'back'
    }
  }}
/>

// 2. Improve error handling in upload function
const handleIdImageUpload = async (file: File, type: 'front' | 'back') => {
  try {
    // Add size validation
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5MB.');
      return;
    }
    
    // Add format validation
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      alert('Invalid file format. Please upload PNG or JPG only.');
      return;
    }
    
    // Show loading state
    setUploading(true);
    
    // Upload to Cloudinary
    const imageUrl = await uploadImage(file);
    
    if (type === 'front') {
      setIdFrontImage(file);
      setIdFrontImageUrl(imageUrl);
    } else {
      setIdBackImage(file);
      setIdBackImageUrl(imageUrl);
    }
    
  } catch (error) {
    console.error('Upload error:', error);
    alert('Failed to upload image. Please try again.');
  } finally {
    setUploading(false);
  }
};
```

---

## 🟡 Important Fixes (Do These Soon)

### Fix #5: Socket.IO Connection Error Handling

**File:** `src/lib/socket.ts`

```typescript
// Add retry logic with exponential backoff
async connect(): Promise<void> {
  if (this.isConnecting || this.socket?.connected) return;

  this.isConnecting = true;
  
  try {
    const tokens = getStoredTokens();
    if (!tokens?.accessToken) {
      // Gracefully handle missing token
      console.warn('No auth token available for Socket.IO');
      this.isConnecting = false;
      return; // Don't throw error, just return
    }

    // ... rest of connection logic
    
  } catch (error) {
    console.error('Socket connection error:', error);
    this.isConnecting = false;
    
    // Retry with exponential backoff
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      console.log(`Retrying connection in ${delay}ms...`);
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, delay);
    }
  }
}
```

---

### Fix #6: Better Error Messages for Backend Failures

**File:** `src/store/authStore.ts`

```typescript
// In signInWithJWT
try {
  const response = await authenticateWithJWT(email, password);
  // ... success handling
} catch (error) {
  console.error('JWT Authentication error:', error);
  
  // Better user-facing error message
  if (error.message.includes('Failed to fetch')) {
    throw new Error(
      'Cannot connect to server. Please check your internet connection ' +
      'or contact support if the problem persists.'
    );
  }
  
  throw error;
}
```

---

## 📋 Verification Checklist

After applying fixes, verify:

- [ ] Backend server starts successfully
- [ ] Backend accessible at http://localhost:3001
- [ ] Welcome Guide can be closed with:
  - [ ] X button
  - [ ] ESC key
  - [ ] Click outside modal
- [ ] Privacy Policy modal can be closed
- [ ] ID images can be uploaded (both front and back)
- [ ] No console errors on page load
- [ ] Login works without JWT errors
- [ ] Chat button appears (even if offline)

---

## 🧪 Re-Test After Fixes

Once you've applied these fixes:

```bash
# Make sure backend is running
cd server && npm run dev &

# In another terminal, run TestSprite again
cd ..
npm run dev &

# Wait for both servers to start, then:
node testsprite_tests/rerun_tests.js
```

Or manually trigger tests again through TestSprite MCP.

---

## 🆘 Still Having Issues?

### Backend Won't Start:
```bash
# Check if port 3001 is in use
netstat -ano | findstr :3001

# Kill the process if needed (Windows)
taskkill /PID <process_id> /F

# Or change port in server configuration
```

### File Upload Still Failing:
1. Check Cloudinary configuration in `.env`
2. Verify API keys are correct
3. Check browser console for upload errors
4. Test with small image file (< 1MB)

### Modals Still Blocking:
1. Clear browser cache
2. Check z-index values in CSS
3. Verify localStorage is cleared
4. Try incognito/private browsing mode

---

## 📚 Related Files

Files you'll need to edit:
- `src/components/WelcomeGuide.tsx` - Welcome Guide modal
- `src/pages/Register.tsx` - Privacy Policy modal & ID upload
- `src/lib/socket.ts` - Socket.IO connection
- `src/store/authStore.ts` - Authentication error handling
- `server/` directory - Backend Express server

---

## 💡 Pro Tips

1. **Always start backend first** during development
2. **Use React DevTools** to debug modal state
3. **Check Network tab** for API call failures
4. **Monitor Console** for Socket.IO connection status
5. **Test in multiple browsers** after fixes

---

**Good luck with the fixes!** 🚀

For detailed test results, see: `testsprite-mcp-test-report.md`

