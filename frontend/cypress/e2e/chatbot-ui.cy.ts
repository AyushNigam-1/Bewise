describe("AI Chatbot E2E Journeys", () => {
  beforeEach(() => {
    cy.on('window:before:load', (win) => {
      const style = win.document.createElement('style');
      style.innerHTML = '*, *::before, *::after { transition-duration: 0ms !important; animation-duration: 0ms !important; }';
      win.document.head.appendChild(style);
    });

    cy.intercept("GET", "**/api/auth/get-session", {
      statusCode: 200,
      body: {
        session: { id: "fake-session-id", userId: "user-123" },
        user: { id: "user-123", name: "Ayush", favourite_books: [] },
      },
    }).as("loggedInSession");

    cy.intercept("POST", "**/books/find-by-categories*", {
      statusCode: 200,
      body: { categories: [], books: [] },
    }).as("homeBooks");

    cy.intercept("POST", /\/ai\/rag\/invoke/, {
      statusCode: 200,
      body: { output: { answer: "Atomic Habits is about small changes.", insights: {} } },
    }).as("chatRequest");

    cy.visit("/");
    cy.wait("@loggedInSession");
    cy.wait("@homeBooks");
    cy.getByTestId("chatbot-button").click();
  });

  it("should allow the user to type and send a prompt to the AI agent", () => {
    const testPrompt = "Summarize the key insights of atomic habits.";

    cy.getByTestId("chat-input").type(testPrompt);
    cy.getByTestId("chat-input").should("have.value", testPrompt);

    cy.getByTestId("send-button").click();

    cy.getByTestId("chat-input").should("have.value", "");
    cy.getByTestId("user-chat-bubble").last().should("contain", testPrompt);

    cy.wait("@chatRequest");
    cy.getByTestId("ai-chat-bubble")
      .last()
      .should("contain", "Atomic Habits is about small changes.");
  });

  it.only("should attach selected context to the network payload and clear it after sending", () => {
    // Register intercepts BEFORE reload so they catch the new fetch
    cy.intercept("POST", "**/books/find-by-categories*", {
      statusCode: 200,
      body: {
        categories: [{ name: "Psychology" }],
        books: [
          { id: 101, title: "Think Straight", author: "Darius Foroux", thumbnail: "" },
        ],
      },
    }).as("homeBooksWithData");

    cy.intercept("POST", /\/ai\/rag\/invoke/, {
      statusCode: 200,
      body: { output: { answer: "Contextual answer!", insights: {} } },
    }).as("contextChat");

    // Reload so the page re-fetches books and picks up Think Straight
    cy.reload();
    cy.wait("@homeBooksWithData");

    // Re-open the chatbot (beforeEach opened it on the old page)
    cy.getByTestId("chatbot-button").click();

    // Open the context menu
    cy.getByTestId("context-menu-btn").click();
    cy.get('[data-headlessui-state="open"]', { timeout: 3000 }).should("exist");
    cy.contains("Select").should("be.visible");

    cy.getByTestId("context-item-Think Straight")
      .scrollIntoView()
      .should("be.visible")
      .click();

    // cy.get('button').find('.lucide-x').first().click({ force: true });
    cy.get("body").type("{esc}");

    cy.contains("Think Straight").should("be.visible");

    cy.getByTestId("chat-input").type("What does the book say about this?");
    cy.getByTestId("send-button").click();

    cy.wait("@contextChat").then((interception) => {
      const payload = interception.request.body.input;
      expect(
        payload.books_ids.includes("Think Straight") ||
        payload.insights_ids.length > 0
      ).to.be.true;
    });

    cy.contains("Think Straight").should("not.exist");
  });

  it("should allow the user to edit a sent message and resend it", () => {
    cy.intercept("POST", /\/ai\/rag\/invoke/, {
      statusCode: 200,
      body: { output: { answer: "Edited answer!", insights: {} } },
    }).as("editChat");

    cy.getByTestId("chat-input").type("Oops, I made a typo.");
    cy.getByTestId("send-button").click();

    cy.wait("@editChat");

    cy.get('[title="Edit message"]').last().click({ force: true });

    cy.getByTestId("user-chat-bubble")
      .last()
      .find('[contenteditable="true"]')
      .focus()
      .type("{selectall}{backspace}This is the corrected message.");

    cy.get('[title="Save & Send"]').click({ force: true });

    cy.wait("@editChat").then((interception) => {
      expect(interception.request.body.input.message).to.equal(
        "This is the corrected message."
      );
    });

    cy.getByTestId("user-chat-bubble")
      .last()
      .should("contain", "This is the corrected message.");
    cy.getByTestId("user-chat-bubble")
      .last()
      .should("not.contain", "Oops, I made a typo.");
  });
});