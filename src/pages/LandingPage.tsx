import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  Shield, 
  MapPin, 
  Award, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  ArrowRight,
  FileText,
  Eye,
  Star,
  Zap,
  Menu,
  X,
  Smartphone,
  Clock,
  Heart,
  Globe,
  ChevronDown,
  Play,
  Download
} from 'lucide-react';

export function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 300], [0, -50]);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const fullText = 'Make Your Community Safer';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Typing animation effect
  useEffect(() => {
    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 80);
    return () => clearInterval(typingInterval);
  }, []);

  useEffect(() => {
    const onBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall as EventListener);

    // Detect if already running as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window as any).navigator.standalone;
    setIsStandalone(!!standalone);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isStandalone) {
      // Already installed; do nothing or provide feedback
      alert('App is already installed. You can open it from your home screen.');
      return;
    }
    if (installPrompt) {
      installPrompt.prompt();
      try {
        await installPrompt.userChoice;
      } catch {}
      setInstallPrompt(null);
    } else {
      alert('To install, open your browser menu and choose "Add to Home screen".');
    }
  };

  const features = [
    {
      icon: Shield,
      title: "Report Issues",
      description: "Quickly report community problems and track their resolution with real-time updates.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: MapPin,
      title: "Patrol Coordination",
      description: "Coordinate with patrol teams for faster response times and better coverage.",
      color: "from-green-500 to-green-600"
    },
    {
      icon: Award,
      title: "Earn Rewards",
      description: "Get points and recognition for helping your community stay safe.",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: Smartphone,
      title: "Mobile First",
      description: "Designed for mobile devices with offline capabilities and push notifications.",
      color: "from-pink-500 to-pink-600"
    },
    {
      icon: Globe,
      title: "Community Focus",
      description: "Build stronger communities through collaborative safety initiatives.",
      color: "from-indigo-500 to-indigo-600"
    }
  ];

  const stats = [
    { number: "2,500+", label: "Active Users", icon: Users },
    { number: "1,200+", label: "Issues Resolved", icon: CheckCircle },
    { number: "24/7", label: "Support Available", icon: Clock },
    { number: "98%", label: "User Satisfaction", icon: Heart }
  ];

  const steps = [
    {
      number: "01",
      title: "Report an Issue",
      description: "See something that needs attention? Report it with just a few taps on your mobile device.",
      icon: FileText
    },
    {
      number: "02", 
      title: "Patrol Responds",
      description: "Our patrol teams get notified instantly and respond quickly to resolve the issue.",
      icon: MapPin
    },
    {
      number: "03",
      title: "Stay Updated",
      description: "Track progress in real-time and get notified when your issue is resolved.",
      icon: TrendingUp
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <motion.nav 
        className="fixed w-full z-50 transition-all duration-300 shadow-lg"
        style={{ backgroundColor: '#800000' }}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105" style={{backgroundColor: '#800000'}}>
                  <img src="/images/logo.jpg" alt="CARS-G Logo" className="h-6 w-6 rounded object-cover" loading="lazy" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div>
                <span className="text-xl lg:text-2xl font-bold text-white">
                  CARS-G
                </span>
                <p className="text-xs text-gray-200 -mt-1">Community Safety</p>
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              <a href="#features" className="text-white hover:text-gray-200 transition-colors font-medium">
                Features
              </a>
              <a href="#how-it-works" className="text-white hover:text-gray-200 transition-colors font-medium">
                How It Works
              </a>
              <a href="#stats" className="text-white hover:text-gray-200 transition-colors font-medium">
                Stats
              </a>
            </div>
            
            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center space-x-4">
              <Link
                to="/login"
                className="text-white hover:text-gray-200 transition-colors font-medium px-4 py-2 rounded-lg hover:bg-white/10"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center space-x-2"
                style={{backgroundColor: '#800000'}}
                onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#660000'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#800000'}
              >
                <Zap className="h-4 w-4" />
                <span>Get Started</span>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <motion.div
          className={`lg:hidden ${isMenuOpen ? 'block' : 'hidden'}`}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: isMenuOpen ? 1 : 0, height: isMenuOpen ? 'auto' : 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="px-4 py-6 space-y-4" style={{backgroundColor: '#800000'}}>
            <a href="#features" className="block text-white hover:text-gray-200 transition-colors font-medium py-2">
              Features
            </a>
            <a href="#how-it-works" className="block text-white hover:text-gray-200 transition-colors font-medium py-2">
              How It Works
            </a>
            <a href="#stats" className="block text-white hover:text-gray-200 transition-colors font-medium py-2">
              Stats
            </a>
            <div className="pt-4 space-y-3">
              <Link
                to="/login"
                className="block text-center text-white hover:text-gray-200 transition-colors font-medium py-3 px-4 rounded-lg hover:bg-white/10"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="block text-center text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 shadow-lg"
                style={{backgroundColor: '#800000'}}
                onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#660000'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#800000'}
              >
                Get Started
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.nav>

      {/* Hero Section - Redesigned */}
      <section className="relative pt-24 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden min-h-screen flex items-center">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 -z-10">
          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50"></div>
          
          {/* Animated blob elements */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
              x: [0, 50, 0],
              y: [0, 30, 0],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-full blur-3xl"
          ></motion.div>
          
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, -90, 0],
              x: [0, -50, 0],
              y: [0, -30, 0],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-pink-400/30 to-red-400/30 rounded-full blur-3xl"
          ></motion.div>
          
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              x: [0, 30, 0],
              y: [0, -40, 0],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-3xl"
          ></motion.div>

          {/* Floating particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/40 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        <div className="max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column - Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center lg:text-left z-10"
            >
              {/* Animated Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center px-5 py-2.5 mb-8 rounded-full text-sm font-semibold shadow-lg backdrop-blur-xl border border-white/20"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                }}
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Star className="h-4 w-4 mr-2 text-yellow-500" fill="currentColor" />
                </motion.div>
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Trusted by 2,500+ Community Members
                </span>
              </motion.div>

              {/* Animated Headline with Typing Effect */}
              <motion.h1 
                className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black mb-8 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <motion.span 
                  className="block bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent"
                  animate={{ 
                    backgroundPosition: ['0% center', '100% center', '0% center'],
                  }}
                  transition={{ duration: 5, repeat: Infinity }}
                  style={{ backgroundSize: '200% auto' }}
                >
                  {displayedText}
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="inline-block w-1 h-16 ml-2 bg-gradient-to-r from-red-600 to-red-800"
                    style={{ verticalAlign: 'middle' }}
                  />
                </motion.span>
              </motion.h1>

              {/* Description */}
              <motion.p 
                className="text-lg sm:text-xl lg:text-2xl text-gray-700 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                Report issues, coordinate with patrols, and build a safer neighborhood together. 
                <span className="block mt-2 text-gray-600">Simple, fast, and effective community safety at your fingertips.</span>
              </motion.p>

              {/* CTA Buttons with Advanced Animations */}
              <motion.div 
                className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start mb-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
              >
                {/* Primary CTA */}
                <Link to="/register">
                  <motion.button
                    className="group relative px-8 py-5 rounded-2xl text-lg font-bold text-white overflow-hidden shadow-2xl"
                    style={{
                      background: 'linear-gradient(135deg, #800000 0%, #a00000 100%)',
                    }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    {/* Animated gradient overlay */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-red-600 via-red-700 to-red-600"
                      style={{ backgroundSize: '200% 100%' }}
                      animate={{ backgroundPosition: ['0% center', '100% center', '0% center'] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                    
                    {/* Ripple effect on hover */}
                    <motion.div
                      className="absolute inset-0 bg-white"
                      initial={{ scale: 0, opacity: 0.5 }}
                      whileHover={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 0.6 }}
                    />
                    
                    <span className="relative z-10 flex items-center justify-center space-x-2">
                      <Zap className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                      <span>Start Protecting Your Community</span>
                      <motion.span
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ArrowRight className="h-5 w-5" />
                      </motion.span>
                    </span>
                  </motion.button>
                </Link>

                {/* Secondary CTA with Glassmorphism */}
                <Link to="/login">
                  <motion.button
                    className="group px-8 py-5 rounded-2xl text-lg font-bold backdrop-blur-xl border-2 shadow-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                      borderColor: 'rgba(128, 0, 0, 0.3)',
                      color: '#800000',
                    }}
                    whileHover={{ 
                      scale: 1.05, 
                      y: -2,
                      borderColor: 'rgba(128, 0, 0, 0.6)',
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <Play className="h-5 w-5 group-hover:scale-110 transition-transform" />
                      <span>Watch Demo</span>
                    </span>
                  </motion.button>
                </Link>
              </motion.div>

              {/* Trust Indicators with Glassmorphism */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-6"
              >
                {[
                  { icon: CheckCircle, text: 'Free to use', color: 'from-green-500 to-emerald-600' },
                  { icon: CheckCircle, text: 'No setup required', color: 'from-blue-500 to-cyan-600' },
                  { icon: CheckCircle, text: '24/7 support', color: 'from-purple-500 to-pink-600' },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center space-x-2 px-4 py-2 rounded-full backdrop-blur-xl border border-white/20 shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                    }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + index * 0.1 }}
                  >
                    <div className={`bg-gradient-to-r ${item.color} p-1 rounded-full`}>
                      <item.icon className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{item.text}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right Column - 3D Phone Mockup with Floating Cards */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <motion.div 
                className="relative"
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                {/* Glassmorphic Phone Mockup */}
                <div className="relative mx-auto w-80 h-[600px] rounded-[3rem] p-3 shadow-2xl backdrop-blur-xl border border-white/20"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%)',
                  }}
                >
                  <div className="w-full h-full bg-white/90 backdrop-blur-xl rounded-[2.5rem] overflow-hidden relative shadow-inner">
                    {/* Status Bar */}
                    <div className="flex justify-between items-center px-6 py-3 bg-gradient-to-r from-gray-50 to-gray-100">
                      <span className="text-sm font-bold text-gray-900">9:41</span>
                      <div className="flex space-x-1">
                        <motion.div 
                          className="w-1 h-1 bg-gray-400 rounded-full"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                        />
                        <motion.div 
                          className="w-1 h-1 bg-gray-400 rounded-full"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.div 
                          className="w-1 h-1 bg-gray-400 rounded-full"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
                        />
                      </div>
                    </div>
                    
                    {/* App Content */}
                    <div className="p-6 space-y-4">
                      <motion.div 
                        className="flex items-center space-x-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1 }}
                      >
                        <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-lg"
                          style={{
                            background: 'linear-gradient(135deg, #800000 0%, #a00000 100%)',
                          }}
                        >
                          <Shield className="h-7 w-7 text-white" />
                        </div>
                        <div>
                          <h3 className="font-black text-gray-900 text-lg">CARS-G</h3>
                          <p className="text-xs text-gray-600 font-medium">Community Safety</p>
                        </div>
                      </motion.div>
                      
                      <div className="space-y-3">
                        {[
                          { icon: FileText, title: 'New Report', desc: 'Street light out on Main St', bg: 'from-blue-500 to-blue-600', delay: 1.2 },
                          { icon: MapPin, title: 'Patrol Assigned', desc: 'Officer Johnson en route', bg: 'from-green-500 to-green-600', delay: 1.4 },
                          { icon: Award, title: 'Reward Earned', desc: '+50 points for reporting', bg: 'from-purple-500 to-purple-600', delay: 1.6 },
                        ].map((item, idx) => (
                          <motion.div
                            key={idx}
                            className="backdrop-blur-xl p-4 rounded-2xl border border-white/20 shadow-lg"
                            style={{
                              background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
                            }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: item.delay }}
                            whileHover={{ scale: 1.02, y: -2 }}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`h-10 w-10 bg-gradient-to-br ${item.bg} rounded-xl flex items-center justify-center shadow-lg`}>
                                <item.icon className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-gray-900">{item.title}</p>
                                <p className="text-xs text-gray-600 font-medium">{item.desc}</p>
                              </div>
                              <motion.div 
                                className={`h-2.5 w-2.5 rounded-full shadow-lg`}
                                style={{
                                  background: idx === 0 ? '#10b981' : idx === 1 ? '#3b82f6' : '#eab308',
                                }}
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Glassmorphic Cards */}
                <motion.div
                  animate={{ 
                    y: [0, -15, 0],
                    rotate: [0, 3, 0],
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-8 -right-8 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/20"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Issue Resolved</p>
                      <p className="text-xs text-gray-600 font-medium">2 min ago</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ 
                    y: [0, 15, 0],
                    rotate: [0, -3, 0],
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-8 -left-8 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/20"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Active Users</p>
                      <p className="text-xs text-gray-600 font-medium">2,500+ online</p>
                    </div>
                  </div>
                </motion.div>

                {/* Additional floating badge */}
                <motion.div
                  animate={{ 
                    rotate: [0, 360],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute top-1/2 -left-12 backdrop-blur-xl rounded-full p-3 shadow-2xl border border-white/20"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                  }}
                >
                  <div className="h-12 w-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <Star className="h-6 w-6 text-white" fill="currentColor" />
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Animated Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2 }}
          className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-20"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center"
          >
            <span className="text-sm font-semibold text-gray-600 mb-2">Scroll to explore</span>
            <motion.div
              className="p-2 rounded-full backdrop-blur-xl border border-white/20 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
              }}
              whileHover={{ scale: 1.1 }}
            >
              <ChevronDown className="h-6 w-6 text-gray-700" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Communities Everywhere
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join thousands of community members who are already making their neighborhoods safer.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center group"
              >
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:-translate-y-2 border border-gray-100">
                  <div className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" style={{backgroundColor: '#800000'}}>
                    <stat.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold mb-2" style={{color: '#800000'}}>
                    {stat.number}
                  </div>
                  <div className="text-gray-600 font-medium">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Everything You Need to
              <span style={{color: '#800000'}}>
                {" "}Stay Safe
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Powerful tools designed to keep your community safe, connected, and informed. 
              All in one simple, mobile-first platform.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative"
              >
                <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 group-hover:-translate-y-2 border border-gray-100 h-full">
                  <div className={`h-16 w-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  
                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-blue-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Additional CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-center mt-16"
          >
            <div className="bg-blue-50 rounded-2xl p-8 border border-blue-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to Get Started?
              </h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Join thousands of community members who are already using CARS-G to make their neighborhoods safer.
              </p>
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex items-center space-x-2 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                style={{backgroundColor: '#800000'}}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = '#660000'}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = '#800000'}
              >
                <Download className="h-5 w-5" />
                <span>Download App</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              How It
              <span style={{color: '#800000'}}>
                {" "}Works
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Three simple steps to transform your community safety. 
              Get started in minutes and see results immediately.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {steps.map((step, index) => (
            <motion.div
                key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="relative group"
              >
                {/* Connection Line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-blue-200 transform translate-x-6 -translate-y-8 z-0"></div>
                )}
                
                <div className="relative z-10 bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 group-hover:-translate-y-2 border border-gray-100 h-full">
                  {/* Step Number */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="h-16 w-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300" style={{backgroundColor: '#800000'}}>
                      <span className="text-2xl font-bold text-white">{step.number}</span>
                    </div>
                    <div className="h-12 w-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-red-50 transition-colors duration-300">
                      <step.icon className="h-6 w-6 text-gray-600 group-hover:text-red-600 transition-colors duration-300" />
                    </div>
              </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                  
                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-blue-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
              </div>
            </motion.div>
            ))}
          </div>
            
          {/* Process Flow Visualization */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-20 text-center"
          >
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Real-Time Process Flow
              </h3>
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8">
                <div className="flex items-center space-x-3">
                  <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-600 font-medium">Issue Reported</span>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 hidden sm:block" />
                <div className="flex items-center space-x-3">
                  <div className="h-3 w-3 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-600 font-medium">Patrol Assigned</span>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 hidden sm:block" />
                <div className="flex items-center space-x-3">
                  <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-600 font-medium">Issue Resolved</span>
                </div>
              </div>
            </div>
            </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden" style={{backgroundColor: '#800000'}}>
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full" style={{backgroundColor: 'rgba(128, 0, 0, 0.9)'}}></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-6xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Ready to Make a
              <span className="block text-yellow-300">
                Real Difference?
              </span>
            </h2>
            <p className="text-xl text-red-100 mb-12 max-w-3xl mx-auto leading-relaxed">
              Join thousands of community members who are already using CARS-G to make their neighborhoods safer, 
              more connected, and better places to live.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link
              to="/register"
                className="group text-white px-10 py-5 rounded-2xl text-lg font-bold transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:scale-105 inline-flex items-center space-x-3"
                style={{backgroundColor: '#800000'}}
                onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#660000'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#800000'}
              >
                <Zap className="h-6 w-6 group-hover:rotate-12 transition-transform duration-300" />
                <span>Get Started Free</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              
              <Link
                to="/login"
                className="group border-2 border-white/30 text-white px-10 py-5 rounded-2xl text-lg font-semibold hover:bg-white/10 hover:border-white/50 transition-all duration-300 inline-flex items-center space-x-3"
              >
                <Play className="h-5 w-5" />
                <span>Watch Demo</span>
              </Link>
            </div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-16 flex flex-wrap items-center justify-center gap-8 text-blue-100"
            >
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-300" />
                <span className="font-medium">No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-300" />
                <span className="font-medium">Setup in 2 minutes</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-300" />
                <span className="font-medium">24/7 support</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <div className="flex items-center space-x-3 mb-6">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{backgroundColor: '#800000'}}>
                  <img src="/images/logo.jpg" alt="CARS-G Logo" className="h-7 w-7 rounded object-cover" loading="lazy" />
                </div>
            <div>
                  <span className="text-2xl font-bold">CARS-G</span>
                  <p className="text-sm text-gray-400">Community Safety</p>
                </div>
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Making communities safer, more connected, and better places to live. 
                Join thousands of members who trust CARS-G for their safety needs.
              </p>
              <div className="flex space-x-4">
                <div className="h-10 w-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors cursor-pointer">
                  <Globe className="h-5 w-5" />
                </div>
                <div className="h-10 w-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors cursor-pointer">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-bold mb-6">Quick Links</h3>
              <ul className="space-y-4">
                <li>
                  <Link to="/login" className="text-gray-400 hover:text-white transition-colors flex items-center space-x-2">
                    <ArrowRight className="h-4 w-4" />
                    <span>Sign In</span>
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="text-gray-400 hover:text-white transition-colors flex items-center space-x-2">
                    <ArrowRight className="h-4 w-4" />
                    <span>Get Started</span>
                  </Link>
                </li>
                <li>
                  <Link to="/privacy-policy" className="text-gray-400 hover:text-white transition-colors flex items-center space-x-2">
                    <ArrowRight className="h-4 w-4" />
                    <span>Privacy Policy</span>
                  </Link>
                </li>
                <li>
                  <a href="#features" className="text-gray-400 hover:text-white transition-colors flex items-center space-x-2">
                    <ArrowRight className="h-4 w-4" />
                    <span>Features</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Features */}
            <div>
              <h3 className="text-lg font-bold mb-6">Features</h3>
              <ul className="space-y-4">
                <li className="text-gray-400 flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span>Issue Reporting</span>
                </li>
                <li className="text-gray-400 flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span>Patrol Coordination</span>
                </li>
                <li className="text-gray-400 flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span>Progress Tracking</span>
                </li>
                <li className="text-gray-400 flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span>Mobile App</span>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-lg font-bold mb-6">Support</h3>
              <ul className="space-y-4">
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center space-x-2">
                    <ArrowRight className="h-4 w-4" />
                    <span>Help Center</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center space-x-2">
                    <ArrowRight className="h-4 w-4" />
                    <span>Contact Us</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center space-x-2">
                    <ArrowRight className="h-4 w-4" />
                    <span>Community Guidelines</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center space-x-2">
                    <ArrowRight className="h-4 w-4" />
                    <span>API Documentation</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-gray-400 text-center md:text-left">
            <p>&copy; 2024 CARS-G. All rights reserved.</p>
                <p className="text-sm mt-1">Making communities safer, one report at a time.</p>
              </div>
              <div className="flex items-center space-x-6 text-sm text-gray-400">
                <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
