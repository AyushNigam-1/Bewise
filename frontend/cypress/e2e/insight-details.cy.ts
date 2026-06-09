describe("Insight Details AI Quiz Flow", () => {
  beforeEach(() => {
    // 1. Fake the Session
    cy.intercept("GET", "**/api/auth/get-session", {
      statusCode: 200,
      body: {
        session: { id: "fake-session-id", userId: "user-123" },
        user: { id: "user-123", name: "Ayush", favourite_insights: [] },
      },
    }).as("loggedInSession");

    // 2. Intercept the page load API
    // (Using wildcards to prevent encoding timeouts!)
    cy.intercept("GET", "**/insights/*", {
      statusCode: 200,
      body: {
        step_id: "step-123",
        title: "The Power of Habit",
        category: "Psychology",
        description: "This is a mocked description for testing.",
        detailed_breakdown: "Here is the detailed breakdown.",
      },
    }).as("getInsightDetails");

    // 3. Intercept recommendations to prevent console noise
    cy.intercept("GET", "**/session-recommend*", {
      statusCode: 200,
      body: [],
    }).as("getRecommendations");

    // 4. Visit the dynamic route
    cy.visit("/insight/Think%20Straight/Psychology/step-123");

    cy.wait("@loggedInSession");
    cy.wait("@getInsightDetails");
  });

  it("should complete the full Quiz flow from generation to results", () => {
    // 1. Intercept the Quiz AI API with a mocked 2-question test
    cy.intercept("POST", "**/ai/quiz/invoke*", {
      statusCode: 200,
      delay: 1000, // Important: Tests your "AI is crafting..." loading state
      body: {
        output: {
          quiz: [
            {
              question: "What is the primary theme of this insight?",
              options: [
                "Habit Building",
                "Time Management",
                "Procrastination",
                "Dieting",
              ],
              correct_answer: "Habit Building",
              explanation: "The text focuses entirely on how habits compound over time.",
            },
            {
              question: "How long does it take to form a habit according to the text?",
              options: ["21 days", "66 days", "It varies", "10 days"],
              correct_answer: "66 days",
              explanation: "The latest research cited mentions an average of 66 days.",
            },
          ],
        },
      },
    }).as("generateQuiz");

    // 2. Click the Quiz button
    cy.get('[title="Take a quick quiz"]').click({ force: true });

    // 3. Verify the loading state appears before the API resolves
    cy.contains("AI is crafting your quiz...").should("be.visible");

    // 4. Wait for the mocked API to return and assert payload mapping
    // 4. Wait for the mocked API to return and assert payload mapping
    cy.wait("@generateQuiz").then((interception) => {
      // Verify your frontend properly attached the source text
      expect(interception.request.body.input.source_text).to.not.be.undefined;
    });

    // --- QUESTION 1 (Let's get it right) ---
    cy.contains("Question 1 of 2").should("be.visible");
    cy.contains("What is the primary theme of this insight?").should("be.visible");

    // Click the correct answer
    cy.contains("Habit Building").click();

    // Verify the explanation appears and the Next button is active
    cy.contains("Explanation:").should("be.visible");
    cy.contains("The text focuses entirely on how habits compound over time.").should("be.visible");
    cy.contains("Next Question").click();

    // --- QUESTION 2 (Let's get it wrong to test scoring) ---
    cy.contains("Question 2 of 2").should("be.visible");
    cy.contains("How long does it take to form a habit according to the text?").should("be.visible");

    // Click the WRONG answer
    cy.contains("21 days").click();

    // Explanation should still show the right reasoning
    cy.contains("The latest research cited mentions an average of 66 days.").should("be.visible");

    // Because it's the last question, the button should now say "See Results"
    cy.contains("See Results").click();

    // --- RESULTS SCREEN ---
    // We got 1 right and 1 wrong, so the score should be 1/2
    cy.contains("1/2").should("be.visible");
    cy.contains("Great Job").should("exist"); // Adjust to whatever your actual success text is!

    // Close the modal and verify it unmounts
    cy.contains("Back to Reading").click();
    cy.contains("Knowledge Check").should("not.exist");
  });
});