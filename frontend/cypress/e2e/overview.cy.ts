describe("Book Overview E2E Journey", () => {
  beforeEach(() => {
    // 1. Mock the user session
    cy.intercept("GET", "**/api/auth/get-session", {
      statusCode: 200,
      body: {
        session: { id: "fake-session", userId: "user-123" },
        user: { id: "user-123", name: "Ayush", favourite_books: [] },
      },
    }).as("loggedInSession");

    // 2. CHANGE: Fix the URL path to match your real API (/book/[title]/info)
    cy.intercept("GET", "**/book/*/info", {
      statusCode: 200,
      body: {
        id: 101,
        title: "Think Straight",
        author: "Darius Foroux",
        thumbnail: "https://via.placeholder.com/150",
        categories: "Psychology",
        sub_categories_count: 5,
        total_insights: 10,
        description: "A practical guide to clearing your mind.",
      },
    }).as("getBookInfo");

    // 3. Start the journey
    cy.visit("/overview/Think%20Straight");
    cy.wait("@loggedInSession");
    cy.wait("@getBookInfo");
  });

  it("should navigate to the Insights page when Get Insights is clicked", () => {
    // 1. Verify we are starting on the correct page
    cy.getByTestId("overview-title").should("contain", "Think Straight");

    // 2. Set up the intercept for the page we are ABOUT to navigate to
    cy.intercept("POST", "**/book/*/content", {
      statusCode: 200,
      body: {
        keys: [{ name: "Psychology" }],
        values: [
          {
            step_id: "step-999",
            step: "This is a lightning-fast mocked AI insight for testing!",
          },
        ],
      },
    }).as("getInsightsContent");

    // 3. Click the Next.js <Link> tag!
    cy.getByTestId("get-insights-btn").click();

    // 4. Verify Next.js successfully changed the URL
    cy.url().should("include", "/insights/Think%20Straight");

    // 5. Verify the new page fetched its data and rendered successfully
    cy.wait("@getInsightsContent");
    cy.contains("This is a lightning-fast mocked AI insight for testing!").should("be.visible");
  });

  it("should trigger a real toast notification when bookmarking", () => {
    // We test this in Cypress specifically because toast notifications
    // exist globally outside the component DOM tree, making them hard to test in Vitest
    cy.intercept("POST", "**/bookmark/book/*", {
      statusCode: 200,
      body: { success: true },
    }).as("bookmarkRequest");

    cy.getByTestId("overview-bookmark-btn").click();

    cy.wait("@bookmarkRequest").its("response.statusCode").should("eq", 200);

    // Verify your global Toast component fires on screen
    cy.contains("Bookmark Added").should("be.visible");
  });
});