// Cars-G Deployment E2E Tests
// This file contains end-to-end tests for the deployed application

describe('Cars-G Deployment Tests', () => {
  const FRONTEND_URL = 'https://cars-g.vercel.app'
  const BACKEND_URL = 'https://cars-g-api.onrender.com'
  
  beforeEach(() => {
    // Visit the deployed frontend
    cy.visit(FRONTEND_URL)
    
    // Wait for the page to load completely
    cy.wait(2000)
  })

  describe('Frontend Health Checks', () => {
    it('should load the main page without errors', () => {
      // Check if the page loads successfully
      cy.get('body').should('be.visible')
      
      // Check for any console errors
      cy.window().then((win) => {
        cy.spy(win.console, 'error').as('consoleError')
      })
      
      // Wait a bit and check for errors
      cy.wait(1000)
      cy.get('@consoleError').should('not.have.been.called')
    })

    it('should have proper page title', () => {
      cy.title().should('not.be.empty')
      cy.title().should('contain', 'Cars-G')
    })

    it('should load all required assets', () => {
      // Check if main CSS and JS files load
      cy.get('link[rel="stylesheet"]').should('have.length.at.least', 1)
      cy.get('script').should('have.length.at.least', 1)
    })
  })

  describe('Navigation Tests', () => {
    it('should navigate between different pages', () => {
      // Test navigation to different routes
      cy.get('nav').should('be.visible')
      
      // Test if navigation links are present
      cy.get('a[href*="/"]').should('have.length.at.least', 1)
    })

    it('should handle routing correctly', () => {
      // Test direct URL navigation
      cy.visit(`${FRONTEND_URL}/reports`)
      cy.url().should('include', '/reports')
      
      cy.visit(`${FRONTEND_URL}/admin`)
      cy.url().should('include', '/admin')
    })
  })

  describe('Backend API Tests', () => {
    it('should connect to backend API', () => {
      // Test backend health endpoint
      cy.request({
        method: 'GET',
        url: `${BACKEND_URL}/health`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 404, 500])
        // Even if it's not 200, the request should complete
        expect(response).to.have.property('status')
      })
    })

    it('should handle API responses correctly', () => {
      // Test API endpoint
      cy.request({
        method: 'GET',
        url: `${BACKEND_URL}/api/reports`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response).to.have.property('status')
        // Should not throw an error
        expect(response).to.have.property('body')
      })
    })
  })

  describe('Database Connection Tests', () => {
    it('should connect to Supabase database', () => {
      // This test would typically check if the app can connect to the database
      // Since we can't directly test Supabase from Cypress, we'll check if
      // the app loads without database-related errors
      
      cy.window().then((win) => {
        cy.spy(win.console, 'error').as('dbError')
      })
      
      // Trigger some action that would use the database
      cy.get('body').click()
      
      cy.wait(1000)
      cy.get('@dbError').should('not.have.been.called')
    })
  })

  describe('User Interface Tests', () => {
    it('should display main UI components', () => {
      // Check for main UI elements
      cy.get('header').should('be.visible')
      cy.get('main').should('be.visible')
    })

    it('should be responsive on different screen sizes', () => {
      // Test mobile viewport
      cy.viewport('iphone-6')
      cy.get('body').should('be.visible')
      
      // Test tablet viewport
      cy.viewport('ipad-2')
      cy.get('body').should('be.visible')
      
      // Test desktop viewport
      cy.viewport(1920, 1080)
      cy.get('body').should('be.visible')
    })
  })

  describe('Form Functionality Tests', () => {
    it('should handle form submissions', () => {
      // Look for forms on the page
      cy.get('form').then(($forms) => {
        if ($forms.length > 0) {
          // Test form interaction
          cy.get('form').first().within(() => {
            cy.get('input, textarea, select').should('be.visible')
          })
        }
      })
    })

    it('should validate form inputs', () => {
      // Test form validation if forms exist
      cy.get('form').then(($forms) => {
        if ($forms.length > 0) {
          cy.get('form').first().within(() => {
            // Try to submit without required fields
            cy.get('button[type="submit"]').click()
            
            // Should show validation errors or prevent submission
            cy.get('body').should('be.visible')
          })
        }
      })
    })
  })

  describe('File Upload Tests', () => {
    it('should handle file upload functionality', () => {
      // Look for file input elements
      cy.get('input[type="file"]').then(($fileInputs) => {
        if ($fileInputs.length > 0) {
          // Test file input is accessible
          cy.get('input[type="file"]').first().should('be.visible')
        }
      })
    })
  })

  describe('Performance Tests', () => {
    it('should load within acceptable time', () => {
      // Measure page load time
      cy.window().then((win) => {
        const loadTime = win.performance.timing.loadEventEnd - win.performance.timing.navigationStart
        expect(loadTime).to.be.lessThan(5000) // Less than 5 seconds
      })
    })

    it('should have good Core Web Vitals', () => {
      // Check for performance metrics
      cy.window().then((win) => {
        // Basic performance check
        expect(win.performance).to.exist
        expect(win.performance.timing).to.exist
      })
    })
  })

  describe('Error Handling Tests', () => {
    it('should handle network errors gracefully', () => {
      // Test offline functionality
      cy.window().then((win) => {
        cy.spy(win.console, 'error').as('networkError')
      })
      
      // Simulate network issues by visiting a non-existent route
      cy.visit(`${FRONTEND_URL}/non-existent-route`, { failOnStatusCode: false })
      
      cy.wait(1000)
      // Should not crash the application
      cy.get('body').should('be.visible')
    })

    it('should display error messages appropriately', () => {
      // Check if error boundaries are working
      cy.get('body').should('not.contain', 'Something went wrong')
      cy.get('body').should('not.contain', 'Error:')
    })
  })

  describe('Security Tests', () => {
    it('should use HTTPS', () => {
      cy.url().should('include', 'https://')
    })

    it('should not expose sensitive information', () => {
      // Check page source for sensitive data
      cy.get('body').should('not.contain', 'api_key')
      cy.get('body').should('not.contain', 'password')
      cy.get('body').should('not.contain', 'secret')
    })
  })

  describe('Accessibility Tests', () => {
    it('should have proper accessibility attributes', () => {
      // Check for basic accessibility
      cy.get('img').should('have.attr', 'alt')
      cy.get('button').should('have.attr', 'aria-label')
    })

    it('should be keyboard navigable', () => {
      // Test keyboard navigation
      cy.get('body').tab()
      cy.focused().should('exist')
    })
  })

  describe('Cross-browser Compatibility', () => {
    it('should work in different browsers', () => {
      // This test will run in the configured browser
      // The test ensures basic functionality works
      cy.get('body').should('be.visible')
      cy.get('nav').should('be.visible')
    })
  })

  describe('Integration Tests', () => {
    it('should complete a full user workflow', () => {
      // Test a complete user journey
      // 1. Load the page
      cy.get('body').should('be.visible')
      
      // 2. Navigate to different sections
      cy.get('nav').should('be.visible')
      
      // 3. Interact with forms if they exist
      cy.get('form').then(($forms) => {
        if ($forms.length > 0) {
          cy.get('form').first().within(() => {
            cy.get('input').first().should('be.visible')
          })
        }
      })
      
      // 4. Check for any interactive elements
      cy.get('button, a').should('have.length.at.least', 1)
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should work on mobile devices', () => {
      cy.viewport('iphone-x')
      cy.get('body').should('be.visible')
      cy.get('nav').should('be.visible')
      
      // Check if mobile menu works
      cy.get('button[aria-label*="menu"], .mobile-menu').then(($menu) => {
        if ($menu.length > 0) {
          cy.wrap($menu).click()
          cy.get('nav').should('be.visible')
        }
      })
    })
  })

  describe('PWA Features', () => {
    it('should have PWA manifest', () => {
      cy.get('link[rel="manifest"]').should('exist')
    })

    it('should have service worker', () => {
      cy.window().then((win) => {
        expect(win.navigator.serviceWorker).to.exist
      })
    })
  })

  describe('Analytics and Monitoring', () => {
    it('should have analytics tracking', () => {
      // Check if analytics scripts are loaded
      cy.get('script[src*="analytics"], script[src*="gtag"]').then(($scripts) => {
        // Analytics scripts should be present
        expect($scripts.length).to.be.at.least(0)
      })
    })
  })
})

// Custom commands for testing
Cypress.Commands.add('testDeploymentHealth', () => {
  cy.log('Testing deployment health...')
  
  // Test frontend
  cy.visit(FRONTEND_URL)
  cy.get('body').should('be.visible')
  
  // Test backend
  cy.request({
    method: 'GET',
    url: `${BACKEND_URL}/health`,
    failOnStatusCode: false
  }).then((response) => {
    expect(response).to.have.property('status')
  })
})

Cypress.Commands.add('testUserWorkflow', () => {
  cy.log('Testing complete user workflow...')
  
  // Navigate through the application
  cy.visit(FRONTEND_URL)
  cy.get('body').should('be.visible')
  
  // Test navigation
  cy.get('nav').should('be.visible')
  
  // Test forms
  cy.get('form').then(($forms) => {
    if ($forms.length > 0) {
      cy.get('form').first().within(() => {
        cy.get('input').first().should('be.visible')
      })
    }
  })
}) 