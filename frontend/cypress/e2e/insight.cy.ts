describe("Insight Page & Category Filtering", () => {
  it("should trigger a network refetch and filter insights when a category pill is clicked", () => {
    // 1. The Smart Intercept: Changes its response based on the request body
    cy.intercept("POST", /book\/.*\/content/, (req) => {
      // If no categories are selected (Initial page load)
      if (req.body.length === 0) {
        req.reply({
          statusCode: 200,
          body: {
            keys: [{ name: "Psychology" }, { name: "Productivity" }],
            values: [
              { step_id: 1, step: "A deep psychological insight." },
              { step_id: 2, step: "A highly productive workflow tip." },
            ],
          },
        });
      }
      // If the frontend sends an array containing the "Psychology" filter
      else if (req.body.includes("Psychology")) {
        req.reply({
          statusCode: 200,
          body: {
            keys: [{ name: "Psychology" }, { name: "Productivity" }],
            values: [
              { step_id: 1, step: "A deep psychological insight." }, // Only 1 returned!
            ],
          },
        });
      }
    }).as("contentRequest");

    // 2. Visit the actual Insight page (This triggers the first empty request)
    cy.visit("/insights/Think%20Straight");

    // 3. Wait for the initial load and verify both cards are showing
    cy.wait("@contentRequest");
    cy.getByTestId("insight-card").should("have.length", 2);

    // 4. Open the dialog, THEN click the "Psychology" category
    cy.getByTestId('open-category-dialog-btn').click()
    cy.getByTestId('category-pill-Psychology').click()

    // 5. Wait for React Query to automatically fire the SECOND filtered request
    cy.wait("@contentRequest");

    // 6. Assert the UI updated and filtered down to just 1 card!
    cy.getByTestId("insight-card").should("have.length", 1);
    cy.contains("A deep psychological insight.").should("be.visible");
  });
});
