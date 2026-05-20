// Add the 'options' parameter so we can pass timeouts through
Cypress.Commands.add("getByTestId", (testId, options = {}) => {
  return cy.get(`[data-testid="${testId}"]`, options);
});
