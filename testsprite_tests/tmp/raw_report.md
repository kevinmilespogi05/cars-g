
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** cars-g
- **Date:** 2025-11-01
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001
- **Test Name:** User Registration with Email and Password - Successful Flow
- **Test Code:** [TC001_User_Registration_with_Email_and_Password___Successful_Flow.py](./TC001_User_Registration_with_Email_and_Password___Successful_Flow.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4c70c554-5d87-48c8-85cd-56948c820ed9/965ec5e4-56ab-40ec-a003-74f04df6b477
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002
- **Test Name:** User Registration with Email - Validation Errors
- **Test Code:** [TC002_User_Registration_with_Email___Validation_Errors.py](./TC002_User_Registration_with_Email___Validation_Errors.py)
- **Test Error:** Testing stopped due to the Privacy Policy modal not closing and blocking form submission. Unable to verify validation error messages or prevent registration as required.
Browser Console Logs:
[WARNING] An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing. (at https://accounts.youtube.com/accounts/CheckConnection?pmpo=https%3A%2F%2Faccounts.google.com&v=2108871346&timestamp=1761978634702:0:0)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A084DA00FC0A0000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at https://accounts.google.com/lifecycle/steps/signup/name?client_id=946891131687-q1dra8g1bdktpkbokucnlsij4hfo14v4.apps.googleusercontent.com&continue=https://accounts.google.com/signin/oauth/consent?authuser%3Dunknown%26part%3DAJi8hAON7nB-Vok89rfXvCRX3xvt6FZ1hy4TSpex_cqPEmhzaPIWSPy-l8_W6hWLPr_PnJrincNuQ-VaFJaIuo2s6xiQd7WuPiGDR-Gx6JXJxfYolPO2MPPQ6ePt-RqdSVrSul_n__U3wDtzPnqcsIYaGcnql-7zVUYiLopVoWdn_dxTgeOhPuus4JH0ZIWN0cebDQ7ditFQSEbL5AxLsAFzwO5vUzV0hPPE3jQM-TZm1i1S0rafETvvYWd7NYmtEaL09XzAd6eOEBQUZZ-IOu-V_rN_q5vMgNuTwWin8J2IkPAYHx-wMQoHWxCUmPNB_-bUhLw4NSQqrIO0Bww9Wt8P7XHis2UZ17L6JzPfv3nTHZ_RE92rPsiq8Rd2Ftxa2mlUDj-kJtrtPHn-wAE8rORxYsPuEornYaUiqwJn9n5YeAAP4L92Yi5jcn5CMes6C7pMaa8hsX_QijXs3d2yMSGP2UuQFQXT_1kyG8JxbLS73SMHi9esnyY%26flowName%3DGeneralOAuthFlow%26as%3DS788771886%253A1761978629951485%26client_id%3D946891131687-q1dra8g1bdktpkbokucnlsij4hfo14v4.apps.googleusercontent.com%23&dsh=S788771886:1761978629951485&flowEntry=SignUp&flowName=GlifWebSignIn&rart=ANgoxcec4yFFHtBryisIVNtbkuF9YlUQF1kDRY6QPtYI0G1Hdikv587EvHSMgq8rX5xFhBLcufSoaQES8m0cXydkucdfSUYNiNYp3GW5E66cnIGTn5smJcY&scope=email+profile&service=lso&TL=ANzgctSOUScYjNwd1b1u0YxgkOwpNMUaxIJdEB3zmgOfy92IVM2oUqLKx2VIblr9:0:0)
[WARNING] An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing. (at https://www.google.com/recaptcha/enterprise/anchor?ar=1&k=6Lf-_ekqAAAAAO4AXrJISaHw4_bW76NcfwhLN7Is&co=aHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tOjQ0Mw..&hl=en&v=cLm1zuaUXPLFw7nzKiQTH1dX&size=invisible&badge=none&anchor-ms=20000&execute-ms=15000&cb=ugc4exqtrrbj:0:0)
[WARNING] An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing. (at https://accounts.youtube.com/accounts/CheckConnection?pmpo=https%3A%2F%2Faccounts.google.com&v=-231211301&timestamp=1761978679792:0:0)
[WARNING] An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing. (at https://accounts.youtube.com/accounts/CheckConnection?pmpo=https%3A%2F%2Faccounts.google.com&v=-146563797&timestamp=1761978720226:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4c70c554-5d87-48c8-85cd-56948c820ed9/0fd5c2af-8497-4110-a307-61f0f8ab7c5d
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003
- **Test Name:** User Registration with Google OAuth - Successful Flow
- **Test Code:** [TC003_User_Registration_with_Google_OAuth___Successful_Flow.py](./TC003_User_Registration_with_Google_OAuth___Successful_Flow.py)
- **Test Error:** Google OAuth login could not be completed due to security restrictions by Google blocking the OAuth flow in the current environment. Unable to verify successful login, redirection, and token issuance. Recommend testing in a supported browser environment. Task stopped.
Browser Console Logs:
[WARNING] An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing. (at https://accounts.youtube.com/accounts/CheckConnection?pmpo=https%3A%2F%2Faccounts.google.com&v=1472973451&timestamp=1761978614608:0:0)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A06CE10084320000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at https://accounts.google.com/v3/signin/identifier?opparams=%253Fredirect_to%253Dhttp%25253A%25252F%25252Flocalhost%25253A5173%25252Fauth%25252Fcallback&dsh=S-317862859%3A1761978609375114&access_type=offline&client_id=946891131687-q1dra8g1bdktpkbokucnlsij4hfo14v4.apps.googleusercontent.com&o2v=2&prompt=consent&redirect_uri=https%3A%2F%2Fmffuqdwqjdxbwpbhuxby.supabase.co%2Fauth%2Fv1%2Fcallback&response_type=code&scope=email+profile&service=lso&state=eyJhbGciOiJIUzI1NiIsImtpZCI6Ii90RTJPOUlRWU1ablBaYnYiLCJ0eXAiOiJKV1QifQ.eyJleHAiOjE3NjE5Nzg5MDcsInNpdGVfdXJsIjoiaHR0cDovL2xvY2FsaG9zdDozMDAwIiwiaWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJmdW5jdGlvbl9ob29rcyI6bnVsbCwicHJvdmlkZXIiOiJnb29nbGUiLCJyZWZlcnJlciI6Imh0dHA6Ly9sb2NhbGhvc3Q6NTE3My9hdXRoL2NhbGxiYWNrIiwiZmxvd19zdGF0ZV9pZCI6IiJ9.CenjSjDK6bgCBejEDsBQwFy8EMEI5BrrD_JP-ag63O8&flowName=GeneralOAuthFlow&continue=https%3A%2F%2Faccounts.google.com%2Fsignin%2Foauth%2Fconsent%3Fauthuser%3Dunknown%26part%3DAJi8hANUlUQ4md3goUfTAbfwCOKtU53wX8gfKaRcQUio5vg6x1_XgHjn4n9d1hriUn7TRK_dNw9o7jyowvWEdQALuyyUepMxLrDx3MPbCdKv75JuMUB_uBo8OTKtDAoCQOKb6eEOb9k9_50iS_8Rw_ylEbH0jO9T0ZFkqk7T0vuQIckOCVRC-lsktR-nHDXPQpYtfc_IbTl54FlWXSVmRvrbP7pWN2duB6_wFAPRMKL-PJc2wXy4_rDTkp2CJMD6GmY-nVbrhCeEIYLIV3_fdf8uhTMr5vnLXNxpvnJBvpTgXWcfNL9bDLJF7FUDIxP3xn3v7N39w_rQ5btTRJDHH2aQEAe-xHGukOKFPA2c6QIHpMJg88qZa3DxY7rxDm70AelCueI3cx_4pFP1KgF9-uA_3ivJQ8f4pi6NFWPfI6ZBEXlx81pWdikjXkDalW6AU40N5lyynXwqPGIWRsRP3E80VzP32AToArEg7bAyUnen8dl2aTm8eGY%26flowName%3DGeneralOAuthFlow%26as%3DS-317862859%253A1761978609375114%26client_id%3D946891131687-q1dra8g1bdktpkbokucnlsij4hfo14v4.apps.googleusercontent.com%23&app_domain=https%3A%2F%2Fmffuqdwqjdxbwpbhuxby.supabase.co&rart=ANgoxccaPnJ3O3Ny2HrZ3Lg2tkf-td_A0a57WQ2M5bJm7S8X7gHk40M8xRoJ5mPslgiRse0zcXx9Nu2jS3iIuZavYBxI0qJxQDcA0mkELMyOp33p46v0O2Q:0:0)
[WARNING] An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing. (at https://accounts.youtube.com/accounts/CheckConnection?pmpo=https%3A%2F%2Faccounts.google.com&v=28250858&timestamp=1761978662316:0:0)
[WARNING] [GroupMarkerNotSet(crbug.com/242999)!:A06CE10084320000]Automatic fallback to software WebGL has been deprecated. Please use the --enable-unsafe-swiftshader flag to opt in to lower security guarantees for trusted content. (at https://accounts.google.com/v3/signin/identifier?opparams=%253Fredirect_to%253Dhttp%25253A%25252F%25252Flocalhost%25253A5173%25252Fauth%25252Fcallback&dsh=S1378680774%3A1761978660645485&access_type=offline&app_domain=https%3A%2F%2Fmffuqdwqjdxbwpbhuxby.supabase.co&client_id=946891131687-q1dra8g1bdktpkbokucnlsij4hfo14v4.apps.googleusercontent.com&continue=https%3A%2F%2Faccounts.google.com%2Fsignin%2Foauth%2Fconsent%3Fauthuser%3Dunknown%26part%3DAJi8hAMEZNK0m6XEvQV5pHZKCZr-dZSLQibj52wycKELTBhx0nkCEOVXuLC-MFan6mSN11EtzJcRgQPW-dWzZXdOP6zJIWxSXq80xtpIC18ulvFWPhemJlasIwWI9wp3kTwilTZsr_tPHHHGUMKxlLn4w51-hiBLxOFe9TxXR25UFYmFZT5F49q1bho_0lfQVr2X76wP86GBGWK320MsJs8mq_6LsTpPgodW9G3kt19QtvUUIYgyJRRxf8msZW7xiT5C18ETIS-_ULgIwx1XydgWP97ESDGHa8gPgTR-7_O7cuWCwoKpdnZTmeUHKWaLabYkotid-l-h66frZBXfXeCL-wQ-GeH6et8NVpQP5fPGP8EkkISuBLty7T431TpBw81CpnnqG2OFWlgz4Luobnyi615UAlgBmoa1Ia2QZBbPsYNVXjVBipjSjSMw8p5krN6v7grU5EUj0bvm5FhroUrkklzPo6VcfTVOyzJKNkk7MSqsMntFB7c%26flowName%3DGeneralOAuthFlow%26as%3DS1378680774%253A1761978660645485%26client_id%3D946891131687-q1dra8g1bdktpkbokucnlsij4hfo14v4.apps.googleusercontent.com%23&flowName=GeneralOAuthFlow&o2v=2&prompt=consent&rart=ANgoxcf9yw41cIiXXGtVkZ7vlLR17c3fL3IlxiBGmiudbudxA0srBmnBtWyfEMPuIw8NtzRjBlStYcKZUgWJ3Qgdnxr41aAKHiTvZbDuVgEeqhGW4Dqrugw&redirect_uri=https%3A%2F%2Fmffuqdwqjdxbwpbhuxby.supabase.co%2Fauth%2Fv1%2Fcallback&response_type=code&scope=email+profile&service=lso&state=eyJhbGciOiJIUzI1NiIsImtpZCI6Ii90RTJPOUlRWU1ablBaYnYiLCJ0eXAiOiJKV1QifQ.eyJleHAiOjE3NjE5Nzg5MDcsInNpdGVfdXJsIjoiaHR0cDovL2xvY2FsaG9zdDozMDAwIiwiaWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJmdW5jdGlvbl9ob29rcyI6bnVsbCwicHJvdmlkZXIiOiJnb29nbGUiLCJyZWZlcnJlciI6Imh0dHA6Ly9sb2NhbGhvc3Q6NTE3My9hdXRoL2NhbGxiYWNrIiwiZmxvd19zdGF0ZV9pZCI6IiJ9.CenjSjDK6bgCBejEDsBQwFy8EMEI5BrrD_JP-ag63O8:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4c70c554-5d87-48c8-85cd-56948c820ed9/1d90d737-bb86-4683-a2ef-c7fe8cf37e64
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004
- **Test Name:** User Login with Email and Password - Successful and Failure Scenarios
- **Test Code:** [TC004_User_Login_with_Email_and_Password___Successful_and_Failure_Scenarios.py](./TC004_User_Login_with_Email_and_Password___Successful_and_Failure_Scenarios.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4c70c554-5d87-48c8-85cd-56948c820ed9/c060d955-8a3e-437d-bde8-612c8197560d
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005
- **Test Name:** ID Verification Submission and Admin Approval Workflow
- **Test Code:** [TC005_ID_Verification_Submission_and_Admin_Approval_Workflow.py](./TC005_ID_Verification_Submission_and_Admin_Approval_Workflow.py)
- **Test Error:** The 'ID Verification' section required to upload front and back ID images is not accessible from the user interface after login. This prevents completing the user upload and submission steps. The issue has been reported. Stopping further testing.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3001/api/auth/login:0:0)
[ERROR] JWT Authentication error: TypeError: Failed to fetch
    at authenticateWithJWT (http://localhost:5173/src/lib/jwt.ts:82:26)
    at Object.signInWithJWT (http://localhost:5173/src/store/authStore.ts:455:30)
    at signInWithEmailOrUsername (http://localhost:5173/src/store/authStore.ts:305:39)
    at handleSubmit (http://localhost:5173/src/pages/Login.tsx:66:13)
    at HTMLUnknownElement.callCallback2 (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3680:22)
    at Object.invokeGuardedCallbackDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3705:24)
    at invokeGuardedCallback (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3739:39)
    at invokeGuardedCallbackAndCatchFirstError (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3742:33)
    at executeDispatch (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7046:11)
    at processDispatchQueueItemsInOrder (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7066:15) (at http://localhost:5173/src/store/authStore.ts:464:14)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4c70c554-5d87-48c8-85cd-56948c820ed9/4817017a-2f88-45f9-8ef4-434c821ff712
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006
- **Test Name:** Incident Report Creation - Complete Flow with Valid Input and AI Image Analysis
- **Test Code:** [TC006_Incident_Report_Creation___Complete_Flow_with_Valid_Input_and_AI_Image_Analysis.py](./TC006_Incident_Report_Creation___Complete_Flow_with_Valid_Input_and_AI_Image_Analysis.py)
- **Test Error:** The user has successfully navigated through the account creation steps up to the ID Verification stage. However, the process could not be completed because the file upload fields for the front and back of the government-issued ID require a specific file upload action that was not supported in this environment. Consequently, the registration was not finalized, and the user could not access the Create Report wizard to create incident reports. Therefore, the task to verify the full incident report creation process through the multi-step wizard, including offline support, remains incomplete.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3001/api/auth/check-availability:0:0)
[ERROR] Error checking availability: TypeError: Failed to fetch
    at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:43:30
    at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:78:7 (at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:67:14)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3001/api/auth/check-availability:0:0)
[ERROR] Error checking availability: TypeError: Failed to fetch
    at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:43:30
    at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:78:7 (at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:67:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4c70c554-5d87-48c8-85cd-56948c820ed9/e5975298-49e4-4f6f-a8ab-cd3434a6a496
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007
- **Test Name:** Incident Report Creation - Invalid Input and Content Moderation
- **Test Code:** [TC007_Incident_Report_Creation___Invalid_Input_and_Content_Moderation.py](./TC007_Incident_Report_Creation___Invalid_Input_and_Content_Moderation.py)
- **Test Error:** The registration process was completed successfully after resolving username validation errors. The user reached the ID Verification step where image upload areas for front and back of government-issued ID are visible. The system enforces file size limits (5MB) and format restrictions (PNG, JPG) as indicated. The next steps would be to test uploading images exceeding size limits or unsupported formats, and verify validation error messages, as well as test AI content moderation flags and submission blocking with invalid data. However, these steps were not performed yet. Thus, the task is partially complete with registration and navigation to report creation wizard verified, but image upload and input validation tests remain. Task success is set to false until all validations are fully tested.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3001/api/auth/check-availability:0:0)
[ERROR] Error checking availability: TypeError: Failed to fetch
    at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:43:30
    at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:78:7 (at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:67:14)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3001/api/auth/check-availability:0:0)
[ERROR] Error checking availability: TypeError: Failed to fetch
    at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:43:30
    at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:78:7 (at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:67:14)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3001/api/auth/check-availability:0:0)
[ERROR] Error checking availability: TypeError: Failed to fetch
    at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:43:30
    at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:78:7 (at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:67:14)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3001/api/auth/check-availability:0:0)
[ERROR] Error checking availability: TypeError: Failed to fetch
    at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:43:30
    at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:78:7 (at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:67:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4c70c554-5d87-48c8-85cd-56948c820ed9/f4534e5a-0757-41c8-9cec-dd6654d68444
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008
- **Test Name:** Real-Time Interactive Dashboard Map Updates and Filtering
- **Test Code:** [TC008_Real_Time_Interactive_Dashboard_Map_Updates_and_Filtering.py](./TC008_Real_Time_Interactive_Dashboard_Map_Updates_and_Filtering.py)
- **Test Error:** Stopped testing due to persistent welcome guide modal blocking access to the dashboard map and filters. Reported the issue for resolution. Unable to proceed with verification of real-time incident report map features.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3001/api/auth/login:0:0)
[ERROR] JWT Authentication error: TypeError: Failed to fetch
    at authenticateWithJWT (http://localhost:5173/src/lib/jwt.ts:82:26)
    at Object.signInWithJWT (http://localhost:5173/src/store/authStore.ts:455:30)
    at signInWithEmailOrUsername (http://localhost:5173/src/store/authStore.ts:305:39)
    at handleSubmit (http://localhost:5173/src/pages/Login.tsx:66:13)
    at HTMLUnknownElement.callCallback2 (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3680:22)
    at Object.invokeGuardedCallbackDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3705:24)
    at invokeGuardedCallback (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3739:39)
    at invokeGuardedCallbackAndCatchFirstError (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3742:33)
    at executeDispatch (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7046:11)
    at processDispatchQueueItemsInOrder (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7066:15) (at http://localhost:5173/src/store/authStore.ts:464:14)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4c70c554-5d87-48c8-85cd-56948c820ed9/911c5e67-518b-452f-97c0-182749077110
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009
- **Test Name:** Patrol Dashboard Job Assignment, Navigation and Status Updates
- **Test Code:** [TC009_Patrol_Dashboard_Job_Assignment_Navigation_and_Status_Updates.py](./TC009_Patrol_Dashboard_Job_Assignment_Navigation_and_Status_Updates.py)
- **Test Error:** Testing revealed that patrol officers can log in and view pending job assignments, but cannot accept or reject jobs as no such controls are visible on the detailed report page. Navigation features and job status update controls are also missing, preventing completion of the job workflow. This is a critical issue blocking the task requirements.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3001/api/auth/login:0:0)
[ERROR] JWT Authentication error: TypeError: Failed to fetch
    at authenticateWithJWT (http://localhost:5173/src/lib/jwt.ts:82:26)
    at Object.signInWithJWT (http://localhost:5173/src/store/authStore.ts:455:30)
    at signInWithEmailOrUsername (http://localhost:5173/src/store/authStore.ts:305:39)
    at handleSubmit (http://localhost:5173/src/pages/Login.tsx:66:13)
    at HTMLUnknownElement.callCallback2 (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3680:22)
    at Object.invokeGuardedCallbackDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3705:24)
    at invokeGuardedCallback (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3739:39)
    at invokeGuardedCallbackAndCatchFirstError (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3742:33)
    at executeDispatch (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7046:11)
    at processDispatchQueueItemsInOrder (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7066:15) (at http://localhost:5173/src/store/authStore.ts:464:14)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4c70c554-5d87-48c8-85cd-56948c820ed9/388ede54-1465-43de-ab68-ba368ea6895b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010
- **Test Name:** Real-Time Communication Module - Chat Between Users and Admins
- **Test Code:** [TC010_Real_Time_Communication_Module___Chat_Between_Users_and_Admins.py](./TC010_Real_Time_Communication_Module___Chat_Between_Users_and_Admins.py)
- **Test Error:** The real-time chat functionality test could not be fully completed due to persistent connection failure with the message 'Failed to connect to chat. Please try again.' and 'Admin is offline' status. This prevented testing of sending and receiving messages, typing indicators, read receipts, message history persistence, and notifications. The issue has been reported for backend investigation and resolution. Task is now complete.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3001/api/auth/login:0:0)
[ERROR] JWT Authentication error: TypeError: Failed to fetch
    at authenticateWithJWT (http://localhost:5173/src/lib/jwt.ts:82:26)
    at Object.signInWithJWT (http://localhost:5173/src/store/authStore.ts:455:30)
    at signInWithEmailOrUsername (http://localhost:5173/src/store/authStore.ts:305:39)
    at handleSubmit (http://localhost:5173/src/pages/Login.tsx:66:13)
    at HTMLUnknownElement.callCallback2 (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3680:22)
    at Object.invokeGuardedCallbackDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3705:24)
    at invokeGuardedCallback (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3739:39)
    at invokeGuardedCallbackAndCatchFirstError (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3742:33)
    at executeDispatch (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7046:11)
    at processDispatchQueueItemsInOrder (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7066:15) (at http://localhost:5173/src/store/authStore.ts:464:14)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4c70c554-5d87-48c8-85cd-56948c820ed9/c92781e1-29cf-4bbd-8101-14f5bc1907ef
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011
- **Test Name:** Admin Portal User Management with Role-Based Access Control
- **Test Code:** [TC011_Admin_Portal_User_Management_with_Role_Based_Access_Control.py](./TC011_Admin_Portal_User_Management_with_Role_Based_Access_Control.py)
- **Test Error:** The task to ensure admin users can manage user accounts, update roles, verify identities, and enforce permissions was not fully completed. Admin login was successful, and the Reports Dashboard was accessible. However, the user management section was not found or accessible through the UI navigation menus, profile menu, or direct URL attempts. Therefore, role updates, identity verification, and permission enforcement could not be tested or verified. Further investigation or access to the correct admin user management interface is required to complete this task.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3001/api/auth/login:0:0)
[ERROR] JWT Authentication error: TypeError: Failed to fetch
    at authenticateWithJWT (http://localhost:5173/src/lib/jwt.ts:82:26)
    at Object.signInWithJWT (http://localhost:5173/src/store/authStore.ts:455:30)
    at signInWithEmailOrUsername (http://localhost:5173/src/store/authStore.ts:305:39)
    at handleSubmit (http://localhost:5173/src/pages/Login.tsx:66:13)
    at HTMLUnknownElement.callCallback2 (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3680:22)
    at Object.invokeGuardedCallbackDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3705:24)
    at invokeGuardedCallback (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3739:39)
    at invokeGuardedCallbackAndCatchFirstError (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3742:33)
    at executeDispatch (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7046:11)
    at processDispatchQueueItemsInOrder (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7066:15) (at http://localhost:5173/src/store/authStore.ts:464:14)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4c70c554-5d87-48c8-85cd-56948c820ed9/77191762-4993-4481-8410-0190f9f5d222
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012
- **Test Name:** Gamification Mechanics - Points, Achievements, and Leaderboards
- **Test Code:** [TC012_Gamification_Mechanics___Points_Achievements_and_Leaderboards.py](./TC012_Gamification_Mechanics___Points_Achievements_and_Leaderboards.py)
- **Test Error:** Testing halted due to persistent Facebook login popup blocking report submission and points allocation. Unable to verify points allocation, achievement badges, experience level updates, and leaderboard ranking as required by the task.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3001/api/auth/login:0:0)
[ERROR] JWT Authentication error: TypeError: Failed to fetch
    at authenticateWithJWT (http://localhost:5173/src/lib/jwt.ts:82:26)
    at Object.signInWithJWT (http://localhost:5173/src/store/authStore.ts:455:30)
    at signInWithEmailOrUsername (http://localhost:5173/src/store/authStore.ts:305:39)
    at handleSubmit (http://localhost:5173/src/pages/Login.tsx:66:13)
    at HTMLUnknownElement.callCallback2 (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3680:22)
    at Object.invokeGuardedCallbackDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3705:24)
    at invokeGuardedCallback (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3739:39)
    at invokeGuardedCallbackAndCatchFirstError (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3742:33)
    at executeDispatch (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7046:11)
    at processDispatchQueueItemsInOrder (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7066:15) (at http://localhost:5173/src/store/authStore.ts:464:14)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
[ERROR] Error getting location: Error: All location methods failed
    at getEnhancedLocation (http://localhost:5173/src/lib/geolocation.ts:270:9)
    at async getLocation (http://localhost:5173/src/components/MapPicker.tsx:78:32) (at http://localhost:5173/src/components/MapPicker.tsx:85:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4c70c554-5d87-48c8-85cd-56948c820ed9/639b5c0d-5882-4446-acb1-14d476fa7fa9
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013
- **Test Name:** Push Notifications Delivery and Preferences
- **Test Code:** [TC013_Push_Notifications_Delivery_and_Preferences.py](./TC013_Push_Notifications_Delivery_and_Preferences.py)
- **Test Error:** The task to verify push notifications via Firebase Cloud Messaging for report status changes, messages, announcements, and achievement unlocks was attempted. User login and navigation to relevant pages were successful. Events triggering notifications were executed. However, there was no visible confirmation that push notifications were received on the device, no notification permission request dialog appeared, and no verification that user preferences to disable notifications were respected. Therefore, the task is not fully completed as requested.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3001/api/auth/login:0:0)
[ERROR] JWT Authentication error: TypeError: Failed to fetch
    at authenticateWithJWT (http://localhost:5173/src/lib/jwt.ts:82:26)
    at Object.signInWithJWT (http://localhost:5173/src/store/authStore.ts:455:30)
    at signInWithEmailOrUsername (http://localhost:5173/src/store/authStore.ts:305:39)
    at handleSubmit (http://localhost:5173/src/pages/Login.tsx:66:13)
    at HTMLUnknownElement.callCallback2 (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3680:22)
    at Object.invokeGuardedCallbackDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3705:24)
    at invokeGuardedCallback (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3739:39)
    at invokeGuardedCallbackAndCatchFirstError (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3742:33)
    at executeDispatch (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7046:11)
    at processDispatchQueueItemsInOrder (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7066:15) (at http://localhost:5173/src/store/authStore.ts:464:14)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4c70c554-5d87-48c8-85cd-56948c820ed9/63c28131-8289-49b6-80ec-ab7ebc172642
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014
- **Test Name:** PWA Offline Mode and Service Worker Functionality
- **Test Code:** [TC014_PWA_Offline_Mode_and_Service_Worker_Functionality.py](./TC014_PWA_Offline_Mode_and_Service_Worker_Functionality.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4c70c554-5d87-48c8-85cd-56948c820ed9/ccc3dec3-5452-4c4e-8fa4-b30420042f00
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015
- **Test Name:** Authentication Token Management and Security
- **Test Code:** [TC015_Authentication_Token_Management_and_Security.py](./TC015_Authentication_Token_Management_and_Security.py)
- **Test Error:** The secure authentication flow with JWT tokens was partially verified. Login with valid credentials succeeded, and user was redirected to a protected dashboard. However, secure storage of JWT tokens could not be confirmed via UI or storage inspection. Attempts to simulate token expiration and trigger refresh token functionality were inconclusive due to session persistence and loading issues after logout and clearing storage. Access denial for expired or missing tokens was not reliably observed, as protected resources remained accessible. Further backend or network-level analysis is recommended for comprehensive verification of token expiration, refresh, and unauthorized access prevention.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3001/api/auth/login:0:0)
[ERROR] JWT Authentication error: TypeError: Failed to fetch
    at authenticateWithJWT (http://localhost:5173/src/lib/jwt.ts:82:26)
    at Object.signInWithJWT (http://localhost:5173/src/store/authStore.ts:455:30)
    at signInWithEmailOrUsername (http://localhost:5173/src/store/authStore.ts:305:39)
    at handleSubmit (http://localhost:5173/src/pages/Login.tsx:66:13)
    at HTMLUnknownElement.callCallback2 (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3680:22)
    at Object.invokeGuardedCallbackDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3705:24)
    at invokeGuardedCallback (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3739:39)
    at invokeGuardedCallbackAndCatchFirstError (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3742:33)
    at executeDispatch (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7046:11)
    at processDispatchQueueItemsInOrder (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7066:15) (at http://localhost:5173/src/store/authStore.ts:464:14)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4c70c554-5d87-48c8-85cd-56948c820ed9/f795d194-2ac1-4a88-bfe7-7e1626e3328c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC016
- **Test Name:** Data Security and Compliance with GDPR and Input Validation
- **Test Code:** [TC016_Data_Security_and_Compliance_with_GDPR_and_Input_Validation.py](./TC016_Data_Security_and_Compliance_with_GDPR_and_Input_Validation.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4c70c554-5d87-48c8-85cd-56948c820ed9/addf8e50-522f-435c-9a59-6b399f719c8e
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC017
- **Test Name:** Performance Benchmarking for Load Times and Animation Smoothness
- **Test Code:** [TC017_Performance_Benchmarking_for_Load_Times_and_Animation_Smoothness.py](./TC017_Performance_Benchmarking_for_Load_Times_and_Animation_Smoothness.py)
- **Test Error:** The app was tested for performance criteria including First Contentful Paint (FCP), Time to Interactive (TTI), API response times, and animation frame rates. However, no explicit performance metrics were accessible from the page content or metadata. Form submission was blocked by validation errors on Email and Username availability, preventing API response time measurement. Animation frame rates could not be verified from page content. Due to these limitations, the task could not be fully completed as requested. Further testing with browser developer tools or performance profiling tools is recommended to accurately measure these metrics.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3001/api/auth/check-availability:0:0)
[ERROR] Error checking availability: TypeError: Failed to fetch
    at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:43:30
    at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:78:7 (at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:67:14)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3001/api/auth/check-availability:0:0)
[ERROR] Error checking availability: TypeError: Failed to fetch
    at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:43:30
    at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:78:7 (at http://localhost:5173/src/hooks/useAvailabilityCheck.ts:67:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4c70c554-5d87-48c8-85cd-56948c820ed9/ab09307a-c72b-4096-9cc0-00c186f5c3b0
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC018
- **Test Name:** Admin Announcement Management with Priority and Audience Targeting
- **Test Code:** [TC018_Admin_Announcement_Management_with_Priority_and_Audience_Targeting.py](./TC018_Admin_Announcement_Management_with_Priority_and_Audience_Targeting.py)
- **Test Error:** Testing stopped due to a blocking issue: The welcome guide modal on the announcements page cannot be closed by clicking the close button or pressing Escape key. This prevents further testing of admin announcement creation, editing, scheduling, and deletion functionalities.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3001/api/auth/login:0:0)
[ERROR] JWT Authentication error: TypeError: Failed to fetch
    at authenticateWithJWT (http://localhost:5173/src/lib/jwt.ts:82:26)
    at Object.signInWithJWT (http://localhost:5173/src/store/authStore.ts:455:30)
    at signInWithEmailOrUsername (http://localhost:5173/src/store/authStore.ts:305:39)
    at handleSubmit (http://localhost:5173/src/pages/Login.tsx:66:13)
    at HTMLUnknownElement.callCallback2 (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3680:22)
    at Object.invokeGuardedCallbackDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3705:24)
    at invokeGuardedCallback (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3739:39)
    at invokeGuardedCallbackAndCatchFirstError (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3742:33)
    at executeDispatch (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7046:11)
    at processDispatchQueueItemsInOrder (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7066:15) (at http://localhost:5173/src/store/authStore.ts:464:14)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4c70c554-5d87-48c8-85cd-56948c820ed9/15cb1caf-5b07-48f5-8441-9f2df94b93d6
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC019
- **Test Name:** User Profile Management and Avatar Upload
- **Test Code:** [TC019_User_Profile_Management_and_Avatar_Upload.py](./TC019_User_Profile_Management_and_Avatar_Upload.py)
- **Test Error:** Testing stopped due to critical issue: 'No access token available' error prevents profile updates. Unable to verify avatar upload and personal statistics. Please fix authentication/session token issue to proceed.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3001/api/auth/login:0:0)
[ERROR] JWT Authentication error: TypeError: Failed to fetch
    at authenticateWithJWT (http://localhost:5173/src/lib/jwt.ts:82:26)
    at Object.signInWithJWT (http://localhost:5173/src/store/authStore.ts:455:30)
    at signInWithEmailOrUsername (http://localhost:5173/src/store/authStore.ts:305:39)
    at handleSubmit (http://localhost:5173/src/pages/Login.tsx:66:13)
    at HTMLUnknownElement.callCallback2 (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3680:22)
    at Object.invokeGuardedCallbackDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3705:24)
    at invokeGuardedCallback (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3739:39)
    at invokeGuardedCallbackAndCatchFirstError (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3742:33)
    at executeDispatch (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7046:11)
    at processDispatchQueueItemsInOrder (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7066:15) (at http://localhost:5173/src/store/authStore.ts:464:14)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4c70c554-5d87-48c8-85cd-56948c820ed9/2c5eb810-f234-43e5-a40a-b4ec1d7150a5
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC020
- **Test Name:** Network Status Monitoring and Offline Queue Handling
- **Test Code:** [TC020_Network_Status_Monitoring_and_Offline_Queue_Handling.py](./TC020_Network_Status_Monitoring_and_Offline_Queue_Handling.py)
- **Test Error:** Testing stopped due to persistent 'Welcome Guide' modal blocking offline action queuing and synchronization testing. Offline status detection was verified, but queuing and syncing of offline user actions could not be completed. Please address the modal issue to continue testing.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at http://localhost:3001/api/auth/login:0:0)
[ERROR] JWT Authentication error: TypeError: Failed to fetch
    at authenticateWithJWT (http://localhost:5173/src/lib/jwt.ts:82:26)
    at Object.signInWithJWT (http://localhost:5173/src/store/authStore.ts:455:30)
    at signInWithEmailOrUsername (http://localhost:5173/src/store/authStore.ts:305:39)
    at handleSubmit (http://localhost:5173/src/pages/Login.tsx:66:13)
    at HTMLUnknownElement.callCallback2 (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3680:22)
    at Object.invokeGuardedCallbackDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3705:24)
    at invokeGuardedCallback (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3739:39)
    at invokeGuardedCallbackAndCatchFirstError (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:3742:33)
    at executeDispatch (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7046:11)
    at processDispatchQueueItemsInOrder (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:7066:15) (at http://localhost:5173/src/store/authStore.ts:464:14)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at commitPassiveMountOnFiber (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18206:19)
    at commitPassiveMountEffects_complete (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18179:17)
    at commitPassiveMountEffects_begin (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18169:15)
    at commitPassiveMountEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18159:11)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19543:11)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22) (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:138:35)
    at http://localhost:5173/src/components/ChatWindow.tsx:204:21
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Failed to check admin status: Error: No authentication token available
    at checkAdminStatus (http://localhost:5173/src/services/adminService.ts:8:13)
    at checkInitialAdminStatus (http://localhost:5173/src/components/ChatButton.tsx:42:33)
    at http://localhost:5173/src/components/ChatButton.tsx:47:5
    at commitHookEffectListMount (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:16963:34)
    at invokePassiveEffectMountInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:18374:19)
    at invokeEffectsInDev (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19754:19)
    at commitDoubleInvokeEffectsInDEV (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19739:15)
    at flushPassiveEffectsImpl (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19556:13)
    at flushPassiveEffects (http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19500:22)
    at http://localhost:5173/node_modules/.vite/deps/chunk-AE77W3FC.js?v=8633bc1e:19381:17 (at http://localhost:5173/src/services/adminService.ts:22:12)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Socket connection error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/lib/socket.ts:73:14)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
[ERROR] Chat initialization error: Error: No authentication token available
    at SocketManager.connect (http://localhost:5173/src/lib/socket.ts:19:15)
    at initializeChat (http://localhost:5173/src/components/ChatWindow.tsx:143:31) (at http://localhost:5173/src/components/ChatWindow.tsx:197:16)
[ERROR] Error getting location: Error: All location methods failed
    at getEnhancedLocation (http://localhost:5173/src/lib/geolocation.ts:270:9)
    at async getLocation (http://localhost:5173/src/components/MapPicker.tsx:78:32) (at http://localhost:5173/src/components/MapPicker.tsx:85:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/4c70c554-5d87-48c8-85cd-56948c820ed9/411b909c-d6a9-420e-816e-f87453df11bc
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **20.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---