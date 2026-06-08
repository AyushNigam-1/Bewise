describe("Explore Page Category Filtering Journey", () => {
  beforeEach(() => {
    // 1. Fake the Session
    cy.intercept("GET", "**/api/auth/get-session", {
      statusCode: 200,
      body: {
        session: { id: "fake-session-id", userId: "user-123" },
        user: { id: "user-123", name: "Ayush", favourite_books: [] },
      },
    }).as("loggedInSession");

    // 2. The Dynamic Content Intercept
    // Adjust the URL regex to match your exact book-fetching endpoint
    // 2. The Dynamic Content Intercept
    cy.intercept("POST", "**/books/find-by-categories*", (req) => {

      // Safely check if the request body contains the category we are clicking
      const isPsychology = Array.isArray(req.body) && req.body.includes("Psychology");

      if (isPsychology) {
        // FILTERED STATE
        req.reply({
          statusCode: 200,
          body: {
            categories: [{ name: "Psychology" }, { name: "Productivity" }],
            books: [
              { id: 101, title: "Think Straight", author: "Darius Foroux", thumbnail: "https://via.placeholder.com/150" },
            ],
          },
        });
      } else {
        // INITIAL PAGE LOAD / FALLBACK
        // By using an 'else' block, we guarantee Cypress ALWAYS returns this data
        // even if the body parsing acts weird on initial load.
        req.reply({
          statusCode: 200,
          body: {
            categories: [{ name: "Psychology" }, { name: "Productivity" }],
            books: [
              { id: 101, title: "Think Straight", author: "Darius Foroux", thumbnail: "https://via.placeholder.com/150" },
              { id: 102, title: "Deep Work", author: "Cal Newport", thumbnail: "https://via.placeholder.com/150" },
            ],
          },
        });
      }
    }).as("booksRequest");

    // 3. Visit the explore page
    cy.visit("/"); // Adjust route if your actual URL is different
  });

  it("should trigger a network refetch and filter books when a category pill is clicked", () => {
    // Wait for initial session and content load
    cy.wait("@loggedInSession");
    cy.wait("@booksRequest");

    // CHANGE: Look for the image alt attributes instead of visible text!
    cy.get('img[alt="Think Straight"]').should("be.visible");
    cy.get('img[alt="Deep Work"]').should("be.visible");

    // Interact with the real Header component
    cy.getByTestId("open-category-dialog-btn").click();
    cy.getByTestId("category-pill-Psychology").click();

    // Verify a NEW network request was fired with the updated payload
    cy.wait("@booksRequest");

    // Verify the UI correctly re-rendered with the filtered payload
    cy.get('img[alt="Think Straight"]').should("be.visible");
    cy.get('img[alt="Deep Work"]').should("not.exist");
  });
});