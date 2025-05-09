import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Shield, Award, ArrowRight, Users, BarChart, Globe, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section with Video Background */}
      <section className="relative bg-gradient-to-r from-primary-dark to-primary-color text-white pt-24 md:pt-32 pb-16 md:pb-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-50"></div>
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/videos/community-hero.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <motion.h1 
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 text-white drop-shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Community Assistance and Reporting System
            </motion.h1>
            <motion.p 
              className="text-lg sm:text-xl md:text-2xl lg:text-3xl mb-8 md:mb-10 max-w-3xl mx-auto font-semibold text-white drop-shadow-lg px-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Empowering communities to create safer, more connected neighborhoods through collaborative reporting and real-time insights.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="px-4"
            >
              <Link 
                to="/register" 
                className="inline-flex items-center px-6 py-3 border border-transparent text-base md:text-lg font-medium rounded-md text-primary-color bg-white hover:bg-gray-100 transition-colors duration-200 touch-target"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section with Images */}
      <section className="py-12 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Community Engagement
            </h2>
            <p className="text-base md:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Our platform combines cutting-edge technology with user-friendly design to create a seamless experience for community reporting and management.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <motion.div 
              className="card p-6 md:p-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="relative h-40 md:h-48 mb-6 rounded-lg overflow-hidden">
                <img 
                  src="/images/feature-location.jpg" 
                  alt="Location-based reporting" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex justify-center mb-6">
                <div className="p-3 bg-primary-light bg-opacity-10 rounded-full">
                  <MapPin className="h-8 w-8 md:h-10 md:w-10 text-primary-color" />
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-3 text-center">Location-Based Reporting</h3>
              <p className="text-sm md:text-base text-gray-600 text-center">
                Easily report community issues with precise location tagging and photo uploads for better context and faster resolution.
              </p>
            </motion.div>
            
            <motion.div 
              className="card p-6 md:p-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="relative h-40 md:h-48 mb-6 rounded-lg overflow-hidden">
                <img 
                  src="/images/feature-tracking.jpg" 
                  alt="Real-time tracking" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex justify-center mb-6">
                <div className="p-3 bg-secondary-light bg-opacity-10 rounded-full">
                  <Shield className="h-8 w-8 md:h-10 md:w-10 text-secondary-color" />
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-3 text-center">Real-Time Tracking</h3>
              <p className="text-sm md:text-base text-gray-600 text-center">
                Monitor the status of reported incidents and community responses in real-time with our intuitive dashboard.
              </p>
            </motion.div>
            
            <motion.div 
              className="card p-6 md:p-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <div className="relative h-40 md:h-48 mb-6 rounded-lg overflow-hidden">
                <img 
                  src="/images/feature-gamification.jpg" 
                  alt="Gamification and rewards" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex justify-center mb-6">
                <div className="p-3 bg-warning-color bg-opacity-10 rounded-full">
                  <Award className="h-8 w-8 md:h-10 md:w-10 text-warning-color" />
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-3 text-center">Gamification & Rewards</h3>
              <p className="text-sm md:text-base text-gray-600 text-center">
                Earn points, badges, and recognition for your contributions to the community, making engagement fun and rewarding.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Our Users Say
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join thousands of satisfied users who are making their communities better.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div 
              className="bg-white p-8 rounded-lg shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center mb-4">
                <img 
                  src="/images/testimonial-1.jpg" 
                  alt="User testimonial" 
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <h4 className="font-semibold">Sarah Johnson</h4>
                  <div className="flex text-yellow-400">
                    <Star className="w-4 h-4" />
                    <Star className="w-4 h-4" />
                    <Star className="w-4 h-4" />
                    <Star className="w-4 h-4" />
                    <Star className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                "This platform has transformed how our community handles issues. The response time has improved dramatically!"
              </p>
            </motion.div>
            
            <motion.div 
              className="bg-white p-8 rounded-lg shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center mb-4">
                <img 
                  src="/images/testimonial-2.jpg" 
                  alt="User testimonial" 
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <h4 className="font-semibold">Michael Chen</h4>
                  <div className="flex text-yellow-400">
                    <Star className="w-4 h-4" />
                    <Star className="w-4 h-4" />
                    <Star className="w-4 h-4" />
                    <Star className="w-4 h-4" />
                    <Star className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                "The real-time tracking feature is amazing. I can see exactly what's happening in my neighborhood."
              </p>
            </motion.div>
            
            <motion.div 
              className="bg-white p-8 rounded-lg shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center mb-4">
                <img 
                  src="/images/testimonial-3.jpg" 
                  alt="User testimonial" 
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <h4 className="font-semibold">Emma Rodriguez</h4>
                  <div className="flex text-yellow-400">
                    <Star className="w-4 h-4" />
                    <Star className="w-4 h-4" />
                    <Star className="w-4 h-4" />
                    <Star className="w-4 h-4" />
                    <Star className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                "The gamification aspect makes reporting issues fun and engaging. I love earning badges for helping my community!"
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              See CARS-G in Action
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Take a look at how our platform is being used to create safer communities.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div 
              className="relative h-48 rounded-lg overflow-hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <img 
                src="/images/gallery-1.jpg" 
                alt="Community meeting" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </motion.div>
            
            <motion.div 
              className="relative h-48 rounded-lg overflow-hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <img 
                src="/images/gallery-2.jpg" 
                alt="Mobile app usage" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </motion.div>
            
            <motion.div 
              className="relative h-48 rounded-lg overflow-hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <img 
                src="/images/gallery-3.jpg" 
                alt="Community event" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </motion.div>
            
            <motion.div 
              className="relative h-48 rounded-lg overflow-hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <img 
                src="/images/gallery-4.jpg" 
                alt="Success story" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-color text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Join our community of active citizens and start making your neighborhood safer today.
          </p>
          <Link 
            to="/register" 
            className="inline-flex items-center px-6 py-3 border border-transparent text-lg font-medium rounded-md text-primary-color bg-white hover:bg-gray-100 transition-colors duration-200"
          >
            Get Started Now
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Impacting Communities Every Day
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform is making a real difference in communities across the country.
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="text-4xl font-bold text-primary-color mb-2">10,000+</div>
              <div className="text-gray-600">Active Users</div>
            </motion.div>
            
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <div className="text-4xl font-bold text-secondary-color mb-2">5,000+</div>
              <div className="text-gray-600">Reports Resolved</div>
            </motion.div>
            
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="text-4xl font-bold text-success-color mb-2">50+</div>
              <div className="text-gray-600">Communities Served</div>
            </motion.div>
            
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <div className="text-4xl font-bold text-warning-color mb-2">95%</div>
              <div className="text-gray-600">User Satisfaction</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How CARS-G Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform makes community reporting simple, efficient, and effective.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="flex justify-center mb-6">
                <div className="p-3 bg-primary-light bg-opacity-10 rounded-full">
                  <Users className="h-10 w-10 text-primary-color" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">1. Create an Account</h3>
              <p className="text-gray-600">
                Sign up for free and join our growing community of engaged citizens.
              </p>
            </motion.div>
            
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="flex justify-center mb-6">
                <div className="p-3 bg-secondary-light bg-opacity-10 rounded-full">
                  <MapPin className="h-10 w-10 text-secondary-color" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">2. Report Issues</h3>
              <p className="text-gray-600">
                Use our intuitive interface to report community issues with location data and photos.
              </p>
            </motion.div>
            
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <div className="flex justify-center mb-6">
                <div className="p-3 bg-warning-color bg-opacity-10 rounded-full">
                  <BarChart className="h-10 w-10 text-warning-color" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">3. Track Progress</h3>
              <p className="text-gray-600">
                Monitor the status of your reports and see the impact of your contributions.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">CARS-G</h3>
              <p className="text-gray-400">
                Community Assistance and Reporting System
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Features</h4>
              <ul className="space-y-2">
                <li><Link to="/reports" className="text-gray-400 hover:text-white transition-colors">Reports</Link></li>
                <li><Link to="/leaderboard" className="text-gray-400 hover:text-white transition-colors">Leaderboard</Link></li>
                <li><Link to="/map-test" className="text-gray-400 hover:text-white transition-colors">Map</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Connect</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Twitter</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Facebook</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} CARS-G. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}