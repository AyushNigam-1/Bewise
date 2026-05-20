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
});
