describe("Book Overview & AI Insights Page", () => {
  // We visit the page before EVERY test in this block
  beforeEach(() => {
    cy.visit("/overview/Think%20Straight");
  });

  it("should display the correct book details on initial load", () => {
    // 1. Verify the dynamic routing pulled the right book data
    cy.getByTestId("overview-title").should("contain", "Think Straight");

    // 2. Verify the description rendered
    cy.getByTestId("overview-description").should("not.be.empty");

    // 3. Verify the AI button is sitting there waiting to be clicked
    cy.getByTestId("get-insights-btn").should("be.visible");
  });

  it("should fetch and display AI insights ONLY AFTER the button is clicked", () => {
    // 1. Set up the intercept proxy BEFORE we click
    cy.intercept(
      {
        method: "POST",
        url: /book\/.*\/content/,
      },
      {
        statusCode: 200,
        body: {
          keys: [{ name: "Psychology" }, { name: "Productivity" }],
          values: [
            {
              step_id: 1,
              step: "This is a lightning-fast mocked AI insight for testing!",
            },
          ],
        },
      },
    ).as("getInsights");

    // 2. Now we click the button!
    cy.getByTestId("get-insights-btn").click();

    // 3. Wait for the API call to fire
    cy.wait("@getInsights");

    // 4. NOW we assert that the UI updated and rendered the cards
    cy.getByTestId("insight-card").should("have.length", 1);
    cy.contains(
      "This is a lightning-fast mocked AI insight for testing!",
    ).should("be.visible");
  });

  it("should trigger the bookmark API from the overview page when authenticated", () => {
    // 1. Fake the Session
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

    // 2. The Regex Intercept for the bookmark API
    cy.intercept(
      {
        method: "POST",
        url: /bookmark\/book/,
      },
      {
        statusCode: 200,
        body: { success: true },
      },
    ).as("bookmarkOverviewRequest");

    // 3. Visit the overview page
    cy.wait("@loggedInSession");

    // 4. Click the overview bookmark button
    cy.getByTestId("overview-bookmark-btn").click({ force: true });

    // 5. Verify the network request was caught
    cy.wait("@bookmarkOverviewRequest")
      .its("response.statusCode")
      .should("eq", 200);

    // 6. Verify the toast!
    cy.contains("Bookmark Added").should("be.visible");
  });

  it.only("should open the share modal and copy the link from the overview page", () => {
    // 1. Stub the clipboard on the window that beforeEach just loaded
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, "writeText")
        .callsFake(() => Promise.resolve())
        .as("copyToClipboard");
    });

    // 2. Click the share button to open the modal
    cy.getByTestId("overview-share-btn").click({ force: true });
    cy.contains("Share Link").should("be.visible");

    // 3. Click the copy button inside the modal
    cy.getByTestId("copy-link-button").click();

    // 4. Assert the clipboard was triggered
    cy.get("@copyToClipboard").should("have.been.called");
    cy.contains("Link Copied!").should("exist");
  });
});
