describe("Navbar Navigation & Bookmarks Page", () => {
  beforeEach(() => {
    // 1. Mock the user session with favorited IDs for BOTH insights and books
    cy.intercept("GET", "**/api/auth/get-session", {
      statusCode: 200,
      body: {
        session: { id: "fake-session-id", userId: "user-123" },
        user: {
          id: "user-123",
          name: "Ayush",
          favourite_insights: ["step-999"],
          favourite_books: [99], // Added this for the books tab!
        },
      },
    }).as("loggedInSession");

    // 2. Intercept YOUR actual Insights API
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
        categories: [
          { name: "Productivity", icon: "🚀", description: "Get more done" },
        ],
      },
    }).as("getInsights");

    // 3. Intercept YOUR actual Books API
    cy.intercept("GET", "**/bookmarks/books*", {
      statusCode: 200,
      body: {
        books: [
          {
            id: 99,
            title: "Think Straight",
            author: "Darius Foroux",
            thumbnail: "https://via.placeholder.com/150",
          },
        ],
        categories: [
          {
            name: "Psychology",
            icon: "🧠",
            description: "Dive into the human mind",
          },
        ],
      },
    }).as("getBooks");

    // 4. Visit a page with the Navbar
    cy.visit("/");
    cy.wait("@loggedInSession");
  });

  it("should open the user menu, navigate to bookmarks, and display saved insights", () => {
    cy.getByTestId("user-menu-btn").click();
    cy.contains("a", "Bookmarks").should("be.visible").click();

    cy.url().should("include", "/bookmarks");

    // Wait for the specific Insights API
    cy.wait("@getInsights");

    cy.contains("The Ultimate Productivity Hack").should("be.visible");

    cy.contains("button", "Insights").should("be.visible");
    cy.contains("button", "Books").should("be.visible");
  });

  it("should switch between Insights and Books tabs and fetch their respective data", () => {
    cy.visit("/bookmarks");
    cy.wait("@loggedInSession");

    // Default tab is Insights
    cy.wait("@getInsights");
    cy.contains("The Ultimate Productivity Hack").should("be.visible");

    // Switch to Books Tab
    cy.contains("button", "Books").click();

    // Wait for the specific Books API to fire!
    cy.wait("@getBooks");

    // Verify the mocked book rendered by checking the image's alt attribute!
    cy.get('img[alt="Think Straight"]').should("be.visible");

    // Switch back to Insights Tab
    cy.contains("button", "Insights").click();
    cy.contains("The Ultimate Productivity Hack").should("be.visible");
  });
  it('should open the share modal and copy the link from a bookmarked insight', () => {
      // 1. Stub the clipboard
      cy.window().then((win) => {
        cy.stub(win.navigator.clipboard, "writeText")
          .callsFake(() => Promise.resolve())
          .as("copyToClipboard");
      });
  
      cy.visit('/bookmarks');
      cy.wait('@loggedInSession');
      cy.wait('@getInsights');
  
      // 2. Click the share button on the first insight card
      cy.getByTestId('insight-card').first().within(() => {
        cy.getByTestId('insight-share-btn').click({ force: true });
      });
  
      // 3. Verify the Share Modal opened and click copy
      cy.contains('Share Link').should('be.visible');
      cy.getByTestId('copy-link-button').click();
  
      // 4. Assert clipboard was triggered successfully
      cy.get('@copyToClipboard').should('have.been.called');
      cy.contains('Link Copied!').should('exist');
    });
  
    it.only('should un-bookmark an insight and remove it from the screen, showing the empty state', () => {
      // 1. Intercept the bookmark mutation API
      cy.intercept({
        method: 'POST',
        url: /bookmark\/insight/ // <-- Adjust to match your exact mutation route
      }, {
        statusCode: 200,
        body: { success: true }
      }).as('removeBookmark');
  
      cy.visit('/bookmarks');
      cy.wait('@loggedInSession');
      cy.wait('@getInsights');
  
      // 2. Verify the insight is currently on the screen
      cy.contains("The Ultimate Productivity Hack").should('be.visible');
  
      // 3. THE PRO MOVE: Override the intercepts! 
      // We set up new mocks so that when React Query refetches after the mutation, 
      // it receives empty arrays instead of the original mocked data.
      cy.intercept('GET', '**/bookmarks/insights*', {
        statusCode: 200,
        body: { insights: [], categories: [] }
      }).as('getEmptyInsights');
  
      cy.intercept('GET', '**/api/auth/get-session', {
        statusCode: 200,
        body: {
          session: { id: "fake-session-id", userId: "user-123" },
          user: { id: "user-123", name: "Ayush", favourite_insights: [] } // <-- Empty array now!
        }
      }).as('getEmptySession');
  
      // 4. Click the bookmark button to remove it
      cy.getByTestId('insight-card').first().within(() => {
        cy.getByTestId('insight-bookmark-btn').click({ force: true });
      });
  
      // 5. Verify the backend mutation was successfully called
      cy.wait('@removeBookmark').its('response.statusCode').should('eq', 200);
  
      // 6. Verify the UI updated and removed the card
      cy.contains("The Ultimate Productivity Hack").should('not.exist');
      
      // 7. Verify your beautiful Empty State component automatically appeared!
      cy.contains("No insights saved").should('be.visible');
      cy.contains("You haven't bookmarked any insights yet.").should('be.visible');
    });
});
