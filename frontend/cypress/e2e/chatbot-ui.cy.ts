describe("AI Chatbot Interface", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("should allow the user to type and send a prompt to the AI agent", () => {
    const testPrompt = "Summarize the key insights of atomic habits.";

    cy.getByTestId("chatbot-button").click();

    cy.getByTestId("chat-input").type(testPrompt);

    cy.getByTestId("chat-input").should("have.value", testPrompt);

    cy.getByTestId("send-button").click();

    cy.getByTestId("chat-input").should("have.value", "");

    cy.getByTestId("user-chat-bubble").last().should("contain", testPrompt);
  });

  it("should allow the user to stop the AI generation mid-stream", () => {
    // 1. Force a 5-second network delay
    // (Ensure "**/chat*" matches the actual route your invokeChatbot function hits)
    cy.intercept("POST", "**/chat*", (req) => {
      req.reply({
        delay: 5000,
        statusCode: 200,
        body: {
          answer: "This should never render because we aborted it.",
          insights: {},
        },
      });
    }).as("delayedChat");

    cy.getByTestId("chatbot-button").click();
    cy.getByTestId("chat-input").type("Tell me a really long story.");

    // 2. Click send
    cy.getByTestId("send-button").click();

    // 3. THE FIX: Wait for the React state to change and the button to swap to "Stop"
    // Cypress will automatically retry until the loading state appears!
    cy.getByTestId("stop-button").should("be.visible").click();

    // 4. Verify your frontend's CanceledError logic actually fired
    cy.getByTestId("ai-chat-bubble")
      .last()
      .should("contain", "Generation stopped by user.");
  });
});
