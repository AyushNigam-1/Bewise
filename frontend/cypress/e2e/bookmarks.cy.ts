describe("Navbar Navigation & Bookmarks Journey", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/api/auth/get-session", {
      statusCode: 200,
      body: {
        session: { id: "fake-session-id", userId: "user-123" },
        user: {
          id: "user-123",
          name: "Ayush",
          favourite_insights: ["step-999"],
          favourite_books: [99],
        },
      },
    }).as("loggedInSession");

    cy.intercept("GET", "**/bookmarks/insights*", {
      statusCode: 200,
      body: {
        insights: [
          {
            step_id: "step-999",
            title: "The Ultimate Productivity Hack",
            category: "Productivity",
            book_name: "Think Straight",
          },
        ],
        categories: [{ name: "Productivity", icon: "🚀" }],
      },
    }).as("getInsights");

    // Start at the home page for a true navigation test
    cy.visit("/explore");
    cy.wait("@loggedInSession");
  });

  it("should open the user menu, navigate across the app to bookmarks, and load data", () => {
    // 1. Interact with the Navbar
    cy.getByTestId("user-menu-btn").click();
    cy.contains("a", "Bookmarks").should("be.visible").click();

    // 2. Verify Next.js/React Router successfully changed the URL
    cy.url().should("include", "/bookmarks");

    // 3. Verify the page mounts and automatically fetches the default tab data
    cy.wait("@getInsights");
    cy.contains("The Ultimate Productivity Hack").should("be.visible");

    // 4. Verify the UI scaffold is correct
    cy.contains("button", "Insights").should("be.visible");
    cy.contains("button", "Books").should("be.visible");
  });
});