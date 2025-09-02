# CARS-G Landing Page

## Overview
A modern, responsive landing page for the CARS-G community safety platform. The landing page showcases the key features of the system and provides clear calls-to-action for visitors.

## Features

### 🎨 Modern Design
- Clean, professional design with the CARS-G brand colors
- Responsive layout that works on all devices
- Smooth animations using Framer Motion
- Modern typography and spacing

### 📱 Mobile-First Responsiveness
- Optimized for mobile devices
- Responsive grid layouts
- Touch-friendly buttons and navigation
- Adaptive text sizes and spacing

### 🚀 Key Sections
1. **Hero Section** - Compelling headline and call-to-action
2. **Statistics** - Key metrics and achievements
3. **Features** - Six main platform features with icons
4. **How It Works** - Simple 3-step process explanation
5. **Testimonials** - Community member feedback
6. **Call-to-Action** - Final conversion section
7. **Footer** - Links and social media

### 🎯 User Experience
- Clear navigation to login/register
- Smooth scrolling between sections
- Engaging animations and transitions
- Professional color scheme (#800000 primary)

## Technical Details

### Dependencies
- React 18+
- Framer Motion (for animations)
- Lucide React (for icons)
- Tailwind CSS (for styling)
- React Router (for navigation)

### File Structure
```
src/pages/LandingPage.tsx    # Main landing page component
src/routes/routes.tsx        # Updated routes configuration
src/App.tsx                  # Updated app with conditional navigation
```

### Routing
- `/` - Landing page (default route)
- `/landing` - Alternative landing page route
- `/login` - Login page
- `/register` - Registration page

## Customization

### Colors
The landing page uses the CARS-G brand color scheme:
- Primary: `#800000` (dark red)
- Secondary: Various grays and whites
- Accent: Hover states and highlights

### Content
- **Features**: Update the `features` array to reflect your platform's capabilities
- **Statistics**: Modify the `stats` array with real metrics
- **Testimonials**: Replace with actual user feedback
- **Navigation**: Update links to match your routing structure

### Images
- Logo: `/images/logo.jpg` (update path as needed)
- Hero background: Currently uses gradient, can be replaced with image
- Social media icons: SVG icons for Facebook/Twitter

## Usage

### Development
```bash
npm run dev
```
Visit `http://localhost:5173` to see the landing page.

### Production
```bash
npm run build
```
The landing page will be included in the production build.

### Navigation Logic
The landing page automatically hides the main navigation bar when:
- User is not authenticated AND
- Current path is `/` (root)

This provides a clean, focused experience for new visitors.

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Progressive Web App (PWA) compatible

## Performance
- Lazy-loaded components
- Optimized images and assets
- Efficient animations
- Responsive design patterns

## Accessibility
- Semantic HTML structure
- Proper heading hierarchy
- Alt text for images
- Keyboard navigation support
- Screen reader friendly

## Future Enhancements
- A/B testing capabilities
- Analytics integration
- Multi-language support
- Dark mode toggle
- Video background options
- Interactive demos

## Support
For questions or issues with the landing page, refer to the main project documentation or contact the development team.
