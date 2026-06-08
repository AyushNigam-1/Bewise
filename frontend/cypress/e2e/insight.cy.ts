describe("Insight Page Category Filtering Journey", () => {
  beforeEach(() => {
    // 1. Fake the Session
    cy.intercept("GET", "**/api/auth/get-session", {
      statusCode: 200,
      body: {
        session: { id: "fake-session-id", userId: "user-123" },
        user: { id: "user-123", name: "Ayush", favourite_insights: [] },
      },
    }).as("loggedInSession");

    // 2. The Dynamic Content Intercept
    // We use wildcard ** and * to avoid Next.js URL encoding mismatches
    cy.intercept("POST", "**/book/*/content*", (req) => {
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
      // If the "Psychology" category is selected via the Header UI
      else if (req.body.includes("Psychology")) {
        req.reply({
          statusCode: 200,
          body: {
            keys: [{ name: "Psychology" }, { name: "Productivity" }],
            values: [{ step_id: 1, step: "A deep psychological insight." }],
          },
        });
      }
    }).as("contentRequest");

    // 3. Visit the page
    cy.visit("/insights/Think%20Straight");
  });

  it("should trigger a network refetch and filter insights when a category pill is clicked", () => {
    // Wait for initial session and content load
    cy.wait("@loggedInSession");
    cy.wait("@contentRequest");

    // Verify initial state renders both items
    cy.getByTestId("insight-card").should("have.length", 2);
    cy.contains("A deep psychological insight.").should("be.visible");
    cy.contains("A highly productive workflow tip.").should("be.visible");

    // Interact with the real Header component
    cy.getByTestId("open-category-dialog-btn").click();
    cy.getByTestId("category-pill-Psychology").click();

    // Verify a NEW network request was fired with the updated payload
    cy.wait("@contentRequest");

    // Verify the UI correctly re-rendered with the filtered payload
    cy.getByTestId("insight-card").should("have.length", 1);
    cy.contains("A deep psychological insight.").should("be.visible");
    cy.contains("A highly productive workflow tip.").should("not.exist");
  });
});