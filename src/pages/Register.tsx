import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToastContext } from '../contexts/ToastContext';
import { getApiUrl } from '../lib/config';
import { useAvailabilityCheck } from '../hooks/useAvailabilityCheck';
import { isValidGmail, validateEmail } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  User, 
  AlertCircle, 
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
  Shield,
  UserPlus,
  Phone,
  Loader2,
  XCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Upload,
  Check
} from 'lucide-react';

export function Register() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuthStore();
  const { success: showToastSuccess, error: showToastError } = useToastContext();
  
  // Multi-step state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
  // Form data
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isGmailValid, setIsGmailValid] = useState(true);
  const [gmailError, setGmailError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);

  const steps = [
    { id: 1, title: 'Email Verification' },
    { id: 2, title: 'Account Info' },
    { id: 3, title: 'ID Verification' }
  ];
  const progress = totalSteps > 1 ? ((Math.min(currentStep, totalSteps) - 1) / (totalSteps - 1)) * 100 : 100;
  
  // ID image upload states
  const [idFrontImage, setIdFrontImage] = useState<File | null>(null);
  const [idBackImage, setIdBackImage] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  
  // File input refs
  const frontFileInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);
  
  // Scroll tracking states for modals
  const [privacyScrollProgress, setPrivacyScrollProgress] = useState(0);
  const [termsScrollProgress, setTermsScrollProgress] = useState(0);
  const [privacyCompleted, setPrivacyCompleted] = useState(false);
  const [termsCompleted, setTermsCompleted] = useState(false);
  const privacyScrollRef = useRef<HTMLDivElement>(null);
  const termsScrollRef = useRef<HTMLDivElement>(null);

  // Real-time availability checks
  const usernameCheck = useAvailabilityCheck(username, 'username');
  const emailCheck = useAvailabilityCheck(email, 'email');

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 6) strength++;
    if (pwd.length >= 10) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z\d]/.test(pwd)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordStrengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][passwordStrength];
  const passwordStrengthColor = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600'][passwordStrength];

  // Smooth scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    let timer: any;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000);
    } else if (resendCountdown === 0 && resendDisabled) {
      setResendDisabled(false);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown, resendDisabled]);

  // Auto-check checkbox when both documents are completed
  useEffect(() => {
    if (privacyCompleted && termsCompleted && !agreedToTerms) {
      setAgreedToTerms(true);
    }
  }, [privacyCompleted, termsCompleted, agreedToTerms]);

  // Handle scroll tracking for Privacy Policy
  const handlePrivacyScroll = () => {
    if (!privacyScrollRef.current) return;
    
    const element = privacyScrollRef.current;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    const scrolled = (scrollTop / (scrollHeight - clientHeight)) * 100;
    setPrivacyScrollProgress(Math.min(scrolled, 100));
    
    if (scrollHeight - scrollTop - clientHeight < 5) {
      setPrivacyCompleted(true);
    }
  };

  // Handle scroll tracking for Terms of Service
  const handleTermsScroll = () => {
    if (!termsScrollRef.current) return;
    
    const element = termsScrollRef.current;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    const scrolled = (scrollTop / (scrollHeight - clientHeight)) * 100;
    setTermsScrollProgress(Math.min(scrolled, 100));
    
    if (scrollHeight - scrollTop - clientHeight < 5) {
      setTermsCompleted(true);
    }
  };

  // Navigate from Privacy to Terms
  const goToTerms = () => {
    setShowPrivacyModal(false);
    setShowTermsModal(true);
  };

  // Navigate from Terms to Privacy
  const goToPrivacy = () => {
    setShowTermsModal(false);
    setShowPrivacyModal(true);
  };

  // Handle ID image uploads
  const handleIdImageUpload = (file: File, type: 'front' | 'back') => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5MB.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    if (type === 'front') {
      setIdFrontImage(file);
      setIdFrontPreview(previewUrl);
    } else {
      setIdBackImage(file);
      setIdBackPreview(previewUrl);
    }

    setError('');
  };

  // Remove ID image
  const removeIdImage = (type: 'front' | 'back') => {
    if (type === 'front') {
      if (idFrontPreview) URL.revokeObjectURL(idFrontPreview);
      setIdFrontImage(null);
      setIdFrontPreview(null);
      if (frontFileInputRef.current) {
        frontFileInputRef.current.value = '';
      }
    } else {
      if (idBackPreview) URL.revokeObjectURL(idBackPreview);
      setIdBackImage(null);
      setIdBackPreview(null);
      if (backFileInputRef.current) {
        backFileInputRef.current.value = '';
      }
    }
  };

  // Upload ID images to storage
  const uploadIdImages = async (frontImage: File, backImage: File) => {
    try {
      const formData = new FormData();
      formData.append('frontImage', frontImage);
      formData.append('backImage', backImage);

      const response = await fetch(getApiUrl('/api/upload/id-images'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload ID images');
      }

      const result = await response.json();
      return {
        idFrontImageUrl: result.frontImageUrl,
        idBackImageUrl: result.backImageUrl,
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to upload ID images');
    }
  };

  const resetOtpMessages = () => {
    setOtpError('');
    setOtpSuccess('');
    setError('');
  };

  const handleSendOtp = async () => {
    resetOtpMessages();
    const emailValidation = validateEmail(email, true);
    if (!emailValidation.isValid) {
      setIsGmailValid(false);
      setGmailError(emailValidation.error);
      setOtpError(emailValidation.error);
      return;
    }

    setIsGmailValid(true);
    setGmailError('');

    if (emailCheck.isChecking) {
      setOtpError('Please wait while we validate your email availability.');
      return;
    }

    if (emailCheck.isAvailable === false) {
      setOtpError('Email is already registered. Please use a different email or sign in.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const response = await fetch(getApiUrl('/api/auth/start-email-verification'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setRegisteredUserId(data.userId || null);

      setOtpSent(true);
      setOtpSuccess('Verification code sent. Please check your email.');
      try { showToastSuccess('Verification code sent', 3500); } catch (err) { console.warn(err); }

      setResendDisabled(true);
      setResendCountdown(60);
    } catch (error: any) {
      const message = error.message || 'Failed to send verification code';
      setOtpError(message);
      try { showToastError(message, 5000); } catch (err) { console.warn(err); }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    resetOtpMessages();

    if (!email) {
      setOtpError('Please enter your email address first.');
      return;
    }

    if (!otp || otp.trim().length < 6) {
      setOtpError('Enter the 6-digit code sent to your email.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const body: any = { otp: otp.trim() };
      if (registeredUserId) {
        body.userId = registeredUserId;
      } else {
        body.email = email;
      }

      const response = await fetch(getApiUrl('/api/auth/verify-email-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setIsEmailVerified(true);
      setOtpSuccess('Email verified successfully! Continue to create your account.');
      setOtp('');
      setRegisteredUserId(null);
      setRegisteredUserId(null);
      setResendDisabled(false);
      setResendCountdown(0);
      try { showToastSuccess('Email verified successfully', 3500); } catch (err) { console.warn(err); }

      setTimeout(() => {
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 300);
    } catch (error: any) {
      const message = error.message || 'Verification failed';
      setOtpError(message);
      try { showToastError(message, 5000); } catch (err) { console.warn(err); }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpSent || resendDisabled || !email) return;

    resetOtpMessages();
    setIsResendingOtp(true);
    try {
      const body: any = {};
      if (registeredUserId) {
        body.userId = registeredUserId;
      } else {
        body.email = email;
      }

      const response = await fetch(getApiUrl('/api/auth/resend-email-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification code');
      }

      setOtpSuccess('A new verification code was sent to your email.');
      try { showToastSuccess('A new verification code was sent', 3500); } catch (err) { console.warn(err); }
      setResendDisabled(true);
      setResendCountdown(60);
    } catch (error: any) {
      const message = error.message || 'Failed to resend verification code';
      setOtpError(message);
      try { showToastError(message, 5000); } catch (err) { console.warn(err); }
    } finally {
      setIsResendingOtp(false);
    }
  };

  // Validate account details (Step 2)
  const validateAccountDetails = () => {
    setError('');

    if (!isEmailVerified) {
      setError('Please verify your email before continuing.');
      return false;
    }
    setError('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.');
      return false;
    }

    const emailValidation = validateEmail(email, true);
    if (!emailValidation.isValid) {
      setError(emailValidation.error);
      setIsGmailValid(false);
      setGmailError(emailValidation.error);
      return false;
    }

    if (usernameCheck.isAvailable === false) {
      setError('Username is already taken. Please choose another one.');
      return false;
    }

    if (emailCheck.isAvailable === false) {
      setError('Email is already registered. Please use a different email or sign in.');
      return false;
    }

    // Validate password strength - require strong passwords
    const passwordMinLength = 12;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    if (password.length < passwordMinLength) {
      setError(`Password must be at least ${passwordMinLength} characters long`);
      return false;
    }
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (!agreedToTerms) {
      setError('You must agree to the Privacy Policy and Terms of Service to continue.');
      return false;
    }

    return true;
  };

  // Handle Step 1 completion
  const handleContinueToStep3 = () => {
    if (validateAccountDetails()) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle final submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isEmailVerified) {
      setError('Please verify your email before completing registration.');
      setCurrentStep(1);
      return;
    }

    // Check if ID images are uploaded
    if (!idFrontImage || !idBackImage) {
      setError('Please upload both front and back images of your ID for verification.');
      return;
    }

    setIsLoading(true);

    try {
      // Upload ID images first
      setIsUploadingImages(true);
      const { idFrontImageUrl, idBackImageUrl } = await uploadIdImages(idFrontImage!, idBackImage!);
      
      // Register with ID image URLs
      await signUp(email, password, username, firstName, lastName, phone, confirmPassword, idFrontImageUrl, idBackImageUrl);

      // Always redirect to reports page after successful registration
      setSuccess('Registration successful! Redirecting to reports...');
      try { showToastSuccess('Registration successful! Welcome to Bantay SP', 4000); } catch (e) {}
      
      setTimeout(() => {
        navigate('/reports', { replace: true });
      }, 1500);
    } catch (error: any) {
      setError(error.message || 'Registration failed. Please try again.');
      try { showToastError(error.message || 'Registration failed', 5000); } catch (e) {}
    } finally {
      setIsLoading(false);
      setIsUploadingImages(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      setError(error.message || 'Google sign-up failed. Please try again.');
    }
  };

  // Handle checkbox click - open Privacy Policy if not completed
  const handleCheckboxClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (!privacyCompleted || !termsCompleted) {
      e.preventDefault();
      if (!privacyCompleted) {
        setShowPrivacyModal(true);
      } else if (!termsCompleted) {
        setShowTermsModal(true);
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-12">
      {/* Back to Home Link - Mobile */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 font-medium text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>
      </div>

      {/* Desktop Back Link */}
      <div className="hidden lg:block fixed top-6 left-6 z-50">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 font-medium text-sm"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="w-full max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-red-900 to-red-800 px-6 py-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src="/images/logo.jpg" 
                alt="Bantay SP Logo" 
                className="h-12 w-12 object-contain rounded-lg bg-white/10 p-1"
              />
              <div>
                <h1 className="text-2xl font-bold">Create Your Account</h1>
                <p className="text-red-100 text-sm">Join the BANTAY SP community</p>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="mt-6">
              <div className="flex items-center justify-between gap-2">
                {steps.map((step) => {
                  const isComplete = currentStep > step.id;
                  const isActive = currentStep === step.id;
                  return (
                    <div key={step.id} className="flex flex-1 flex-col items-center sm:items-start text-center sm:text-left">
                      <div
                        className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-semibold text-sm sm:text-base ${
                          isComplete || isActive ? 'bg-white text-red-900' : 'bg-red-800 text-white'
                        }`}
                      >
                        {isComplete ? <Check className="h-5 w-5" /> : step.id}
                </div>
                      <div className="mt-2">
                        <div className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-red-100/80">
                          Step {step.id}
                </div>
                        <div className="text-[11px] sm:text-xs text-red-100">
                          {step.title}
              </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 h-1 bg-red-900/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-red-900 mb-1">Verify your email address</h3>
                    <p className="text-sm text-red-800">
                      Enter your Gmail address and we'll send a one-time passcode (OTP). Verify the code to continue with your registration.
                    </p>
                  </div>

                  {otpError && (
                    <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{otpError}</span>
                    </div>
                  )}

                  {otpSuccess && (
                    <div className="flex items-start gap-2 text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg">
                      <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{otpSuccess}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="registrationEmail" className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address <span className="text-red-500">*</span>
                        <span className="text-xs font-normal text-gray-500 ml-2">(Gmail only)</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          id="registrationEmail"
                          autoComplete="off"
                          value={email}
                          onChange={(e) => {
                            const value = e.target.value;
                            setEmail(value);
                            setOtp('');
                            setOtpSent(false);
                            resetOtpMessages();
                            if (isEmailVerified) {
                              setIsEmailVerified(false);
                              try {
                                localStorage.removeItem('emailVerified');
                              } catch (err) {
                                console.warn(err);
                              }
                            }
                            try {
                              localStorage.removeItem('registeredEmail');
                              localStorage.removeItem('registeredUserId');
                            } catch (err) {
                              console.warn(err);
                            }
                            if (value.length > 0) {
                              const emailValidation = validateEmail(value, true);
                              setIsGmailValid(emailValidation.isValid);
                              setGmailError(emailValidation.error);
                            } else {
                              setIsGmailValid(true);
                              setGmailError('');
                            }
                          }}
                          placeholder=""
                          className={`w-full pl-11 pr-11 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 transition-all duration-200 outline-none ${
                            isEmailVerified ? 'opacity-70 cursor-not-allowed' : ''
                          } ${
                            !isGmailValid
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                              : emailCheck.isChecking
                              ? 'border-gray-300 focus:border-gray-400'
                              : emailCheck.isAvailable === true
                              ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20'
                              : emailCheck.isAvailable === false
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                              : 'border-gray-300 focus:border-red-800 focus:ring-red-800/20'
                          }`}
                          disabled={isEmailVerified || isSendingOtp || isVerifyingOtp}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {emailCheck.isChecking && (
                            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                          )}
                          {!emailCheck.isChecking && isGmailValid && emailCheck.isAvailable === true && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                          {(!isGmailValid || (!emailCheck.isChecking && emailCheck.isAvailable === false)) && (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      </div>
                      {gmailError && (
                        <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {gmailError}
                        </p>
                      )}
                      {!emailCheck.isChecking && emailCheck.message && email.length >= 3 && isGmailValid && (
                        <p className={`mt-2 text-xs ${emailCheck.isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                          {emailCheck.message}
                        </p>
                      )}
                      {isEmailVerified && (
                        <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Email verified — you may proceed to complete the registration.
                        </p>
                      )}
                    </div>

                    {!isEmailVerified && (
                      <button
                        type="button"
                        onClick={() => {
                          if (otpSent) {
                            handleResendOtp();
                          } else {
                            handleSendOtp();
                          }
                        }}
                        disabled={
                          !email ||
                          !isValidGmail(email) ||
                          emailCheck.isAvailable === false ||
                          isSendingOtp ||
                          (otpSent && (isResendingOtp || resendDisabled)) ||
                          isVerifyingOtp
                        }
                        className="w-full bg-red-900 hover:bg-red-800 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl focus:ring-4 focus:ring-red-800/50 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        {otpSent ? (
                          isResendingOtp ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              <span>Resending code...</span>
                            </>
                          ) : resendDisabled ? (
                            <span>Resend code in {resendCountdown}s</span>
                          ) : (
                            <span>Resend verification code</span>
                          )
                        ) : isSendingOtp ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Sending code...</span>
                          </>
                        ) : (
                          <span>Send verification code</span>
                        )}
                      </button>
                    )}
                  </div>

                  {otpSent && !isEmailVerified && (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <div>
                        <label htmlFor="registrationOtp" className="block text-sm font-semibold text-gray-700 mb-2">
                          Enter the 6-digit code
                        </label>
                        <input
                          type="text"
                          id="registrationOtp"
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder=""
                          className="w-full text-center text-2xl tracking-[0.5em] px-4 py-3 border border-gray-300 rounded-lg bg-white focus:border-red-800 focus:ring-2 focus:ring-red-800/20 transition-all duration-200 outline-none"
                        />
                        <p className="mt-2 text-xs text-gray-500 text-center">
                          Code expires in 10 minutes. Check your spam folder if you don't see it.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="submit"
                          disabled={isVerifyingOtp || otp.length !== 6}
                          className="flex-1 bg-red-900 hover:bg-red-800 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl focus:ring-4 focus:ring-red-800/50 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
                        >
                          {isVerifyingOtp ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              <span>Verifying...</span>
                            </>
                          ) : (
                            <span>Verify code</span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={isResendingOtp || resendDisabled}
                          className="flex-1 bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-300 focus:ring-4 focus:ring-gray-200 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300"
                        >
                          {isResendingOtp ? 'Resending...' : resendDisabled ? `Resend in ${resendCountdown}s` : 'Resend code'}
                        </button>
                      </div>
                    </form>
                  )}

                  {isEmailVerified && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <h3 className="text-sm font-semibold text-green-800">Email verified</h3>
                          <p className="text-sm text-green-700">Great! Let's complete your account details.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setSuccess('');
                          setCurrentStep(2);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-lg font-semibold transition-all duration-300 shadow focus:ring-4 focus:ring-green-500/50"
                      >
                        Continue
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <form onSubmit={(e) => { e.preventDefault(); handleContinueToStep3(); }} className="space-y-5">
                    {/* Name Fields */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="firstName"
                          autoComplete="off"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-red-800 focus:ring-2 focus:ring-red-800/20 transition-all duration-200 outline-none"
                          placeholder=""
                        />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="lastName"
                          autoComplete="off"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-red-800 focus:ring-2 focus:ring-red-800/20 transition-all duration-200 outline-none"
                          placeholder=""
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address <span className="text-red-500">*</span>
                        <span className="text-xs font-normal text-gray-500 ml-2">(Gmail only)</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          id="email"
                          autoComplete="off"
                          value={email}
                          onChange={(e) => {
                            const value = e.target.value;
                            setEmail(value);
                            
                            if (value.length > 0) {
                              const emailValidation = validateEmail(value, true);
                              setIsGmailValid(emailValidation.isValid);
                              setGmailError(emailValidation.error);
                            } else {
                              setIsGmailValid(true);
                              setGmailError('');
                            }
                          }}
                          required
                          disabled={isEmailVerified}
                          className={`w-full pl-11 pr-11 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 transition-all duration-200 outline-none ${
                            isEmailVerified ? 'opacity-70 cursor-not-allowed' : ''
                          } ${
                            !isGmailValid
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                              : emailCheck.isChecking
                              ? 'border-gray-300 focus:border-gray-400'
                              : emailCheck.isAvailable === true
                              ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20'
                              : emailCheck.isAvailable === false
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                              : 'border-gray-300 focus:border-red-800 focus:ring-red-800/20'
                          }`}
                          placeholder=""
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {emailCheck.isChecking && (
                            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                          )}
                          {!emailCheck.isChecking && isGmailValid && emailCheck.isAvailable === true && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                          {(!isGmailValid || (!emailCheck.isChecking && emailCheck.isAvailable === false)) && (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      </div>
                      {gmailError && (
                        <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {gmailError}
                        </p>
                      )}
                      {!emailCheck.isChecking && emailCheck.message && email.length >= 3 && isGmailValid && (
                        <p className={`mt-2 text-xs ${emailCheck.isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                          {emailCheck.message}
                        </p>
                      )}
                      {isEmailVerified && (
                        <p className="mt-2 text-xs text-green-600">Email verified — you may proceed to complete the registration.</p>
                      )}
                    </div>

                    {/* Username */}
                    <div>
                      <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
                        Username <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          id="username"
                          autoComplete="off"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          className={`w-full pl-11 pr-11 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 transition-all duration-200 outline-none ${
                            usernameCheck.isChecking
                              ? 'border-gray-300 focus:border-gray-400'
                              : usernameCheck.isAvailable === true
                              ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20'
                              : usernameCheck.isAvailable === false
                              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                              : 'border-gray-300 focus:border-red-800 focus:ring-red-800/20'
                          }`}
                          placeholder=""
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {usernameCheck.isChecking && (
                            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                          )}
                          {!usernameCheck.isChecking && usernameCheck.isAvailable === true && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                          {!usernameCheck.isChecking && usernameCheck.isAvailable === false && (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      </div>
                      {!usernameCheck.isChecking && usernameCheck.message && username.length >= 3 && (
                        <p className={`mt-2 text-xs ${usernameCheck.isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                          {usernameCheck.message}
                        </p>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number
                        <span className="text-xs font-normal text-gray-500 ml-2">(Optional)</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="tel"
                          id="phone"
                          autoComplete="off"
                          value={phone}
                          onChange={(e) => {
                            const rawValue = e.target.value;
                            const digitsOnly = rawValue.replace(/\D/g, '');

                            if (!digitsOnly) {
                              setPhone('');
                              return;
                            }

                            let normalized = digitsOnly;
                            if (normalized.startsWith('63')) {
                              normalized = normalized.slice(2);
                            } else if (normalized.startsWith('0')) {
                              normalized = normalized.slice(1);
                            }

                            normalized = normalized.slice(0, 10);

                            setPhone(normalized ? `+63${normalized}` : '');
                          }}
                          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-red-800 focus:ring-2 focus:ring-red-800/20 transition-all duration-200 outline-none"
                          placeholder=""
                          maxLength={13}
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Philippine mobile format: +63 followed by 10 digits
                      </p>
                    </div>

                    {/* Password */}
                    <div>
                      <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="password"
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="w-full pl-11 pr-11 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-red-800 focus:ring-2 focus:ring-red-800/20 transition-all duration-200 outline-none"
                          placeholder=""
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {password && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-300 ${passwordStrengthColor}`}
                                style={{ width: `${(passwordStrength / 5) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-600">{passwordStrengthLabel}</span>
                          </div>
                          <p className="text-xs text-gray-500">Use 6+ characters with a mix of letters, numbers & symbols</p>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          id="confirmPassword"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="w-full pl-11 pr-11 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-red-800 focus:ring-2 focus:ring-red-800/20 transition-all duration-200 outline-none"
                          placeholder=""
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                          aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          Passwords do not match
                        </p>
                      )}
                      {confirmPassword && password === confirmPassword && (
                        <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Passwords match
                        </p>
                      )}
                    </div>

                    {/* Terms Agreement */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="agreedToTerms"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          onClick={handleCheckboxClick}
                          className="mt-0.5 w-4 h-4 text-red-800 bg-white border-gray-300 rounded focus:ring-red-800 focus:ring-2 cursor-pointer flex-shrink-0"
                          required
                        />
                        <label htmlFor="agreedToTerms" className="text-sm text-gray-700 leading-relaxed cursor-pointer">
                          I agree to the{' '}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setShowPrivacyModal(true);
                            }}
                            className="text-red-800 font-semibold hover:text-red-900 underline underline-offset-2 transition-colors"
                          >
                            Privacy Policy
                          </button>
                          {' '}and{' '}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setShowTermsModal(true);
                            }}
                            className="text-red-800 font-semibold hover:text-red-900 underline underline-offset-2 transition-colors"
                          >
                            Terms of Service
                          </button>
                        </label>
                      </div>
                      {(privacyCompleted || termsCompleted) && (
                        <div className="mt-3 space-y-2 ml-7">
                          <div className="flex items-center gap-2 text-xs">
                            {privacyCompleted ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                            )}
                            <span className={privacyCompleted ? 'text-green-600 font-medium' : 'text-gray-600'}>
                              Privacy Policy read
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {termsCompleted ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                            )}
                            <span className={termsCompleted ? 'text-green-600 font-medium' : 'text-gray-600'}>
                              Terms of Service read
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Error Message */}
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg"
                      >
                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{error}</span>
                      </motion.div>
                    )}

                    {/* Navigation */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setCurrentStep(1);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full sm:flex-1 bg-white border-2 border-gray-300 text-gray-700 py-3.5 px-6 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 focus:ring-4 focus:ring-gray-200 transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <ChevronLeft className="h-5 w-5" />
                        Back
                      </button>
                    <button
                      type="submit"
                        className="w-full sm:flex-1 bg-red-900 hover:bg-red-800 text-white py-3.5 px-6 rounded-lg font-semibold text-base shadow-lg hover:shadow-xl focus:ring-4 focus:ring-red-800/50 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      Continue to ID Verification
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    </div>

                    {/* Divider */}
                    <div className="relative py-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-3 bg-white text-sm text-gray-500">Or continue with</span>
                      </div>
                    </div>

                    {/* Google Sign Up */}
                    <button
                      type="button"
                      onClick={handleGoogleSignUp}
                      className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 focus:ring-4 focus:ring-gray-200 transition-all duration-300 shadow-sm hover:shadow"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>Sign up with Google</span>
                    </button>
                  </form>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Instructions */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Shield className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="text-sm font-semibold text-amber-900 mb-2">ID Verification Required</h3>
                          <ul className="text-sm text-amber-800 space-y-1">
                            <li className="flex items-start gap-2">
                              <span className="text-amber-600 mt-0.5">•</span>
                              <span>Upload clear photos of both sides of your government-issued ID</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-amber-600 mt-0.5">•</span>
                              <span>Ensure all text is readable with good lighting and no glare</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-amber-600 mt-0.5">•</span>
                              <span>Maximum file size: 5MB per image</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Front ID Upload */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Front of ID <span className="text-red-500">*</span>
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-red-800 transition-colors">
                        {!idFrontPreview ? (
                          <label className="flex flex-col items-center justify-center cursor-pointer py-6">
                            <Upload className="h-12 w-12 text-gray-400 mb-3" />
                            <span className="text-sm font-medium text-gray-700 mb-1">Click to upload front of ID</span>
                            <span className="text-xs text-gray-500">PNG, JPG up to 5MB</span>
                            <input
                              ref={frontFileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleIdImageUpload(file, 'front');
                              }}
                              className="hidden"
                            />
                          </label>
                        ) : (
                          <div className="relative">
                            <img
                              src={idFrontPreview}
                              alt="Front ID preview"
                              className="w-full h-48 object-contain rounded-lg bg-gray-100"
                            />
                            <button
                              type="button"
                              onClick={() => removeIdImage('front')}
                              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                            <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span>Front ID uploaded successfully</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Back ID Upload */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Back of ID <span className="text-red-500">*</span>
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-red-800 transition-colors">
                        {!idBackPreview ? (
                          <label className="flex flex-col items-center justify-center cursor-pointer py-6">
                            <Upload className="h-12 w-12 text-gray-400 mb-3" />
                            <span className="text-sm font-medium text-gray-700 mb-1">Click to upload back of ID</span>
                            <span className="text-xs text-gray-500">PNG, JPG up to 5MB</span>
                            <input
                              ref={backFileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleIdImageUpload(file, 'back');
                              }}
                              className="hidden"
                            />
                          </label>
                        ) : (
                          <div className="relative">
                            <img
                              src={idBackPreview}
                              alt="Back ID preview"
                              className="w-full h-48 object-contain rounded-lg bg-gray-100"
                            />
                            <button
                              type="button"
                              onClick={() => removeIdImage('back')}
                              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                            <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span>Back ID uploaded successfully</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg"
                      >
                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{error}</span>
                      </motion.div>
                    )}

                    {/* Success Message */}
                    {success && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2 text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg"
                      >
                        <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{success}</span>
                      </motion.div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep(2);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex-1 bg-white border-2 border-gray-300 text-gray-700 py-3.5 px-6 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 focus:ring-4 focus:ring-gray-200 transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <ChevronLeft className="h-5 w-5" />
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading || !idFrontImage || !idBackImage}
                        className="flex-1 bg-red-900 hover:bg-red-800 text-white py-3.5 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl focus:ring-4 focus:ring-red-800/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>{isUploadingImages ? 'Uploading...' : 'Creating Account...'}</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-5 w-5" />
                            <span>Complete Registration</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 sm:px-8 py-4 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="font-semibold text-red-800 hover:text-red-900 underline underline-offset-2 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" onClick={() => setShowPrivacyModal(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 bg-white border-b border-gray-200 rounded-t-xl">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">Privacy Policy</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-red-800"
                        initial={{ width: 0 }}
                        animate={{ width: `${privacyScrollProgress}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 min-w-[45px]">
                      {Math.round(privacyScrollProgress)}%
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="ml-4 text-gray-600 hover:text-gray-900 transition-colors p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              {!privacyCompleted && (
                <div className="px-6 pb-3">
                  <p className="text-xs text-amber-600 font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Please scroll to the bottom to read the entire Privacy Policy
                  </p>
                </div>
              )}
            </div>

            <div 
              ref={privacyScrollRef}
              onScroll={handlePrivacyScroll}
              className="flex-1 p-6 overflow-y-auto"
            >
              <div className="space-y-6 text-gray-600">
                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h3>
                  <p>
                    Welcome to BANTAY SP. We respect your privacy and are committed to protecting your personal data. 
                    This privacy policy will inform you about how we look after your personal data when you visit our website 
                    and tell you about your privacy rights and how the law protects you.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">2. Data We Collect</h3>
                  <p>We collect and process the following data:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Account information (email, username, profile picture)</li>
                    <li>Location data when submitting reports</li>
                    <li>Report content and images</li>
                    <li>Usage data and analytics</li>
                    <li>Device information and IP address</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">3. How We Use Your Data</h3>
                  <p>We use your data for:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Providing and maintaining our service</li>
                    <li>Processing and managing reports</li>
                    <li>Improving our services</li>
                    <li>Communicating with you about your account</li>
                    <li>Ensuring platform security</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">4. Data Storage and Security</h3>
                  <p>
                    We implement appropriate security measures to protect your personal information. Your data is stored securely 
                    using industry-standard encryption and security protocols.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">5. Your Rights</h3>
                  <p>You have the right to:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Access your personal data</li>
                    <li>Correct inaccurate data</li>
                    <li>Request deletion of your data</li>
                    <li>Object to processing of your data</li>
                    <li>Data portability</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">6. Contact Us</h3>
                  <p>
                    If you have any questions about this Privacy Policy, please contact us at support@cars-g.com
                  </p>
                </section>

                <section className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-700">
                    <strong>Last Updated:</strong> October 14, 2025
                  </p>
                </section>
              </div>
            </div>

            <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
              <div className="flex gap-3">
                {privacyCompleted ? (
                  <>
                    {!termsCompleted ? (
                      <button
                        onClick={goToTerms}
                        className="flex-1 bg-red-800 hover:bg-red-900 text-white py-2.5 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <span>Next: Terms of Service</span>
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={goToTerms}
                          className="flex-1 bg-white hover:bg-gray-100 text-gray-700 border-2 border-gray-300 py-2.5 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          <span>View Terms of Service</span>
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setShowPrivacyModal(false)}
                          className="flex-1 bg-red-800 hover:bg-red-900 text-white py-2.5 px-4 rounded-lg font-semibold transition-colors"
                        >
                          Close
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex-1 bg-gray-300 text-gray-700 py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                    <span>Scroll to continue</span>
                    <ChevronRight className="h-5 w-5" />
                  </div>
                )}
              </div>
              {privacyCompleted && (
                <div className="mt-3 flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Privacy Policy completed</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" onClick={() => setShowTermsModal(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 bg-white border-b border-gray-200 rounded-t-xl">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">Terms of Service</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-red-800"
                        initial={{ width: 0 }}
                        animate={{ width: `${termsScrollProgress}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 min-w-[45px]">
                      {Math.round(termsScrollProgress)}%
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="ml-4 text-gray-600 hover:text-gray-900 transition-colors p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              {!termsCompleted && (
                <div className="px-6 pb-3">
                  <p className="text-xs text-amber-600 font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Please scroll to the bottom to read the entire Terms of Service
                  </p>
                </div>
              )}
            </div>

            <div 
              ref={termsScrollRef}
              onScroll={handleTermsScroll}
              className="flex-1 p-6 overflow-y-auto"
            >
              <div className="space-y-6 text-gray-600">
                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h3>
                  <p>
                    By accessing and using BANTAY SP (Bantay San Pablo), you accept and agree to be bound by the terms 
                    and provision of this agreement.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">2. User Accounts</h3>
                  <p>To use certain features of our platform, you must register for an account. You agree to:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Provide accurate, current, and complete information</li>
                    <li>Maintain and update your account information</li>
                    <li>Maintain the security of your password</li>
                    <li>Notify us of any unauthorized use</li>
                    <li>Accept responsibility for all activities under your account</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">3. User Conduct</h3>
                  <p>You agree not to:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Submit false or misleading reports</li>
                    <li>Use the platform for illegal purposes</li>
                    <li>Harass or harm other users</li>
                    <li>Upload malicious code or viruses</li>
                    <li>Attempt unauthorized access to systems</li>
                    <li>Interfere with or disrupt the service</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">4. Report Submission</h3>
                  <p>When submitting reports:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>You grant us a license to use and display your content</li>
                    <li>You confirm you have the right to submit the content</li>
                    <li>Reports may be shared with local authorities</li>
                    <li>Reports should be factual and accurate</li>
                    <li>Anonymous reporting is available but may be restricted if abused</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">5. Points and Rewards</h3>
                  <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Points have no monetary value</li>
                    <li>Used for gamification purposes only</li>
                    <li>We may modify the points system anytime</li>
                    <li>Points may be revoked for violations</li>
                    <li>Anonymous reports do not earn points</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">6. Privacy</h3>
                  <p>
                    Please review our Privacy Policy to understand how we collect and protect your information.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">7. Termination</h3>
                  <p>
                    We reserve the right to suspend or terminate your account at any time for violation of these terms.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h3>
                  <p>
                    BANTAY SP is provided "as is" without warranties. We are not liable for indirect, incidental, or consequential damages.
                  </p>
                </section>

                <section>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">9. Governing Law</h3>
                  <p>
                    These Terms shall be governed by the laws of the Philippines.
                  </p>
                </section>

                <section className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-700">
                    <strong>Last Updated:</strong> October 14, 2025
                  </p>
                </section>
              </div>
            </div>

            <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
              <div className="flex gap-3">
                {termsCompleted ? (
                  <>
                    {!privacyCompleted ? (
                      <button
                        onClick={goToPrivacy}
                        className="flex-1 bg-red-800 hover:bg-red-900 text-white py-2.5 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <ChevronLeft className="h-5 w-5" />
                        <span>Back: Privacy Policy</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={goToPrivacy}
                          className="flex-1 bg-white hover:bg-gray-100 text-gray-700 border-2 border-gray-300 py-2.5 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          <ChevronLeft className="h-5 w-5" />
                          <span>View Privacy Policy</span>
                        </button>
                        <button
                          onClick={() => setShowTermsModal(false)}
                          className="flex-1 bg-red-800 hover:bg-red-900 text-white py-2.5 px-4 rounded-lg font-semibold transition-colors"
                        >
                          Close
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex-1 bg-gray-300 text-gray-700 py-2.5 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                    <span>Scroll to continue</span>
                    <ChevronRight className="h-5 w-5" />
                  </div>
                )}
              </div>
              {termsCompleted && (
                <div className="mt-3 flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Terms of Service completed</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

