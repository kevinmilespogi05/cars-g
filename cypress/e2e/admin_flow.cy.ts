/// <reference types="cypress" />

describe('Admin flows', () => {
  it('shows Requests tab and Dispatch controls', () => {
    // Assumes authenticated admin session is handled by app or test harness
    cy.visit('/admin');
    cy.contains('Requests').click();
    cy.contains('New Case Requests');

    // Navigate back to Reports
    cy.contains('Reports').click();
    cy.contains('Reports');

    // Open first report if available
    cy.get('button[title="View"]').first().click({ force: true });

    // Check dispatch controls in modal footer
    cy.contains('Dispatch');
    cy.get('select').contains('Select group');
  });
});
