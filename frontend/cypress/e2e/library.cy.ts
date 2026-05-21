describe("Book Library Features", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("should filter books when typing in the search bar", () => {
    cy.getByTestId("search-input", { timeout: 10000 }).type("Think Straight");
    cy.getByTestId("book-card").should("have.length.at.least", 1);

    cy.getByTestId("book-card")
      .first()
      .find("img")
      .should("have.attr", "alt")
      .and("include", "Think Straight");
  });

  it("should navigate to the book overview page when a book cover is clicked", () => {
    cy.getByTestId("book-card", { timeout: 10000 }).should(
      "have.length.at.least",
      1,
    );

    cy.getByTestId("book-link")
      .first()
      .then(($link) => {
        const href = $link.attr("href");
        cy.wrap($link).click();
        cy.url().should("include", encodeURI(href!));
      });
  });

  it("should show a login toast when an unauthenticated user clicks bookmark", () => {
    // 1. Ensure the books load
    cy.getByTestId("book-card", { timeout: 10000 }).should(
      "have.length.at.least",
      1,
    );

    // 2. Click the bookmark button as a guest
    cy.getByTestId("bookmark-button").first().click({ force: true });

    // 3. Verify the toast appears on the screen
    // Note: Cypress's cy.contains() is perfect for finding toast notifications!
    cy.contains("please log in to bookmark", { matchCase: false }).should(
      "be.visible",
    );
  });

  it("should open the share modal and copy the link to the clipboard", () => {
    // 1. Stub the clipboard and FORCE it to resolve the Promise successfully!
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, "writeText")
        .callsFake(() => Promise.resolve())
        .as("copyToClipboard");
    });

    // 2. Wait for books to load
    cy.getByTestId("book-card", { timeout: 10000 }).should(
      "have.length.at.least",
      1,
    );

    // 3. Click the share button on the book card (this opens the modal)
    cy.getByTestId("share-button").first().click({ force: true });

    // 4. Verify the modal actually opened
    cy.contains("Share Link").should("be.visible");

    // 5. Click the copy button INSIDE the modal
    cy.getByTestId("copy-link-button").click();

    // 6. Assert that the clipboard API was successfully triggered
    cy.get("@copyToClipboard").should("have.been.called");

    // 7. THE FIX: Use .should('exist') to bypass the fade-in animation trap!
    cy.contains("Link Copied!").should("exist");
  });

  it("should trigger the bookmark API when the user is authenticated", () => {
    // 1. Force the app to think we are logged IN
    cy.intercept("GET", "**/api/auth/get-session", {
      statusCode: 200,
      body: {
        session: {
          id: "fake-session-id",
          userId: "user-123",
          expiresAt: "2099-01-01",
        },
        user: {
          id: "user-123",
          name: "Ayush",
          email: "ayushnigam843@gmail.com",
          emailVerified: true,
        },
      },
    }).as("loggedInSession");

    // 2. THE NUCLEAR INTERCEPT
    // This function looks at every single POST request and hijacks the bookmark one
    cy.intercept(
      {
        method: "POST",
        url: /bookmark\/book/, // Regex: Catches literally anything containing /bookmark/book
      },
      {
        statusCode: 200,
        body: { success: true },
      },
    ).as("bookmarkRequest");

    // 3. Visit the page and wait for our fake session to load
    cy.visit("/");
    cy.wait("@loggedInSession");

    // 4. Click the bookmark button
    cy.getByTestId("book-card", { timeout: 10000 }).should(
      "have.length.at.least",
      1,
    );
    cy.getByTestId("bookmark-button").first().click({ force: true });

    // 5. Verify the frontend actually fired the bookmark API call!
    cy.wait("@bookmarkRequest").its("response.statusCode").should("eq", 200);
  });

  it.only("should filter the book library when a category is selected from the dialog", () => {
    // 1. Intercept with the EXACT object structure your React frontend expects
    cy.intercept("POST", "**/books/find-by-categories*", {
      statusCode: 200,
      body: {
        books: [
          {
            id: 99,
            title: "Psychology 101",
            thumbnail: "https://via.placeholder.com/150",
          },
        ],
        // WE ADDED THE CATEGORIES ARRAY HERE!
        categories: [
          {
            name: "Psychology",
            icon: "🧠",
            description: "Dive into the human mind",
          },
        ],
      },
    }).as("filterBooksRequest");

    // 2. Open the category dialog
    cy.getByTestId("open-category-dialog-btn").click();

    // 3. Verify the dialog actually opened
    cy.contains("Select Categories").should("be.visible");

    // 4. Click a category pill (It will actually be there now!)
    cy.getByTestId("category-pill-Psychology").click();

    // 5. Verify the network request fired with the new filter
    cy.wait("@filterBooksRequest").its("request.body").should("not.be.null");

    // 6. Verify the UI updated to show the filtered book!
    cy.getByTestId("book-card").should("have.length", 1);
  });
});

describe("Mobile Library Experience", () => {
  beforeEach(() => {
    // 1. THE PRO MOVE: Force Cypress to render as an iPhone!
    cy.viewport("iphone-xr");
    cy.visit("/");
  });

  it("should always display interaction buttons without needing to hover on mobile", () => {
    cy.getByTestId("book-card", { timeout: 10000 }).should(
      "have.length.at.least",
      1,
    );

    // 2. We grab the buttons on the first card
    cy.getByTestId("bookmark-button")
      .first()
      .then(($btn) => {
        // 3. Since we are on a mobile viewport, Tailwind's `opacity-100` should be active.
        // The button should be fully visible WITHOUT us having to trigger a hover event!
        cy.wrap($btn).should("be.visible");
        // Let's also assert the CSS opacity is exactly 1 (fully visible)
        expect($btn).to.have.css("opacity", "1");
      });
  });
});
