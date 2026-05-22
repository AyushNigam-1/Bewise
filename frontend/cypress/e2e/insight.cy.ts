describe("Insight Page & Category Filtering", () => {
  beforeEach(() => {
    // 1. Fake the Session for the whole page
    cy.intercept("GET", "**/api/auth/get-session", {
      statusCode: 200,
      body: {
        session: {
          id: "fake-session-id",
          userId: "user-123",
          expiresAt: "2099-01-01",
        },
        user: { id: "user-123", name: "Ayush" },
      },
    }).as("loggedInSession");

    // 2. The Global Intercept for the page load (using the glob pattern!)
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
      // If the "Psychology" category is selected
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

    // 3. Visit the page ONCE per test
    cy.visit("/insights/Think%20Straight");
  });

  it("should trigger a network refetch and filter insights when a category pill is clicked", () => {
    // We just wait for the initial load from the beforeEach
    cy.wait("@contentRequest");
    cy.getByTestId("insight-card").should("have.length", 2);

    cy.getByTestId("open-category-dialog-btn").click();
    cy.getByTestId("category-pill-Psychology").click();

    cy.wait("@contentRequest");
    cy.getByTestId("insight-card").should("have.length", 1);
  });

  it("should trigger the bookmark API when an insight is bookmarked", () => {
    // 1. Intercept the bookmark API
    cy.intercept(
      {
        method: "POST",
        url: /bookmark\/insight/,
      },
      {
        statusCode: 200,
        body: { success: true },
      },
    ).as("bookmarkInsightRequest");

    cy.wait("@contentRequest");

    // Find the first insight card and click its bookmark button
    cy.getByTestId("insight-card")
      .first()
      .within(() => {
        cy.getByTestId("insight-bookmark-btn").click({ force: true });
      });

    cy.wait("@bookmarkInsightRequest")
      .its("response.statusCode")
      .should("eq", 200);
  });

  it("should open the share modal and copy the link from an insight card", () => {
    // 1. Stub the clipboard
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, "writeText")
        .callsFake(() => Promise.resolve())
        .as("copyToClipboard");
    });

    // 2. Wait for page load
    cy.wait("@contentRequest");

    // 3. Find the first insight card and click its share button
    cy.getByTestId("insight-card")
      .first()
      .within(() => {
        cy.getByTestId("insight-share-btn").click({ force: true });
      });

    // 4. Verify the Share Modal opened
    cy.contains("Share Link").should("be.visible");

    // 5. Click the copy button inside the Share Modal
    cy.getByTestId("copy-link-button").click();

    // 6. Assert the clipboard was triggered
    cy.get("@copyToClipboard").should("have.been.called");
    cy.contains("Link Copied!").should("exist");
  });
});
