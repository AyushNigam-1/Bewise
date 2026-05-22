describe("Insight Details Page Actions", () => {
  beforeEach(() => {
    // 1. Fake the User Session
    cy.intercept("GET", "**/api/auth/get-session", {
      statusCode: 200,
      body: {
        session: { id: "fake-session-id", userId: "user-123" },
        // Notice we set favourite_insights to an empty array so the button defaults to "Bookmark insight"
        user: { id: "user-123", name: "Ayush", favourite_insights: [] },
      },
    }).as("loggedInSession");

    // 2. Intercept the EXACT page load API you provided: /insights/${stepId}
    cy.intercept("GET", "**/insights/*", {
      statusCode: 200,
      body: {
        step_id: "step-123",
        title: "The Power of Habit",
        category: "Psychology",
        description: "This is a mocked description for testing.",
        detailed_breakdown: "Here is the **detailed** breakdown.",
      },
    }).as("getInsightDetails");

    // 3. Intercept the recommendations API so the page doesn't throw a network error
    cy.intercept("GET", "**/session-recommend*", {
      statusCode: 200,
      body: [],
    }).as("getRecommendations");

    // 4. Visit the dynamic route (matching your /[title]/[category]/[stepid] folder structure)
    cy.visit("/insight/Think%20Straight/Psychology/step-123");

    // 5. Wait for the mocked data to load before starting any tests
    cy.wait("@getInsightDetails");
  });

  it("should trigger the bookmark API when the bookmark button is clicked", () => {
    // 1. Intercept the bookmark mutation API
    // (Adjust the URL to match whatever your useBookmarkInsight hook actually calls)
    cy.intercept(
      {
        method: "POST",
        url: /bookmark\/insight/,
      },
      {
        statusCode: 200,
        body: { success: true },
      },
    ).as("bookmarkRequest");

    // 2. Click the Bookmark button using the exact title attribute from your code
    cy.get('[title="Bookmark insight"]').click({ force: true });

    // 3. Verify the network request fired successfully
    cy.wait("@bookmarkRequest").its("response.statusCode").should("eq", 200);
  });

  it("should open the share modal and copy the link to the clipboard", () => {
    // 1. Stub the browser's clipboard
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, "writeText")
        .callsFake(() => Promise.resolve())
        .as("copyToClipboard");
    });

    // 2. Click the Share button using the exact title attribute
    cy.get('[title="Share insight"]').click({ force: true });

    // 3. Verify the Share Modal opened (reusing the component from earlier tests!)
    cy.contains("Share Link").should("be.visible");

    // 4. Click the copy button inside the Share Modal
    cy.getByTestId("copy-link-button").click();

    // 5. Assert the clipboard caught the dynamically generated URL
    cy.get("@copyToClipboard").should("have.been.called");
    cy.contains("Link Copied!").should("exist");
  });

  it("should call the TTS API and play audio when the read aloud button is clicked", () => {
    // 1. Intercept the voice generation API (using the exact path from your previous chatbot test)
    cy.intercept("POST", "**/generate-voice*", {
      statusCode: 200,
      headers: { "content-type": "audio/mpeg" },
      body: new Blob(["dummy audio data"], { type: "audio/mpeg" }),
    }).as("generateVoice");

    // 2. Stub the browser's Audio engine so it doesn't play real sound
    cy.window().then((win) => {
      cy.stub(win.Audio.prototype, "play")
        .callsFake(() => Promise.resolve())
        .as("audioPlay");
    });

    // 3. Click the read aloud button
    cy.get('[title="Read aloud"]').click({ force: true });

    // 4. Verify the frontend requested the audio from the backend
    cy.wait("@generateVoice");

    // 5. Verify the browser's Audio.play() was triggered
    cy.get("@audioPlay").should("have.been.called");

    // 6. Verify your React state updated the button title to "Stop audio"
    cy.get('[title="Stop audio"]').should("be.visible");
  });

  it.only("should complete the full Quiz flow from generation to results", () => {
    // 1. Intercept the Quiz AI API with a mocked 2-question test
    cy.intercept("POST", "**/ai/quiz/invoke*", {
      statusCode: 200,
      delay: 1000,
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
              explanation:
                "The text focuses entirely on how habits compound over time.",
            },
            {
              question:
                "How long does it take to form a habit according to the text?",
              options: ["21 days", "66 days", "It varies", "10 days"],
              correct_answer: "66 days",
              explanation:
                "The latest research cited mentions an average of 66 days.",
            },
          ],
        },
      },
    }).as("generateQuiz");

    // 2. Click the Quiz button
    cy.get('[title="Take a quick quiz"]').click({ force: true });

    // 3. Verify the loading state appears before the API resolves
    cy.contains("AI is crafting your quiz...").should("be.visible");

    // 4. Wait for the mocked API to return our 2 questions
    cy.wait("@generateQuiz").then((interception) => {
      // Verify your frontend sent the source_text properly wrapped!
      expect(interception.request.body.input.source_text).to.not.be.undefined;
    });

    // --- QUESTION 1 (Let's get it right) ---
    cy.contains("Question 1 of 2").should("be.visible");
    cy.contains("What is the primary theme of this insight?").should(
      "be.visible",
    );

    // Click the correct answer
    cy.contains("Habit Building").click();

    // Verify the explanation appears and the Next button is active
    cy.contains("Explanation:").should("be.visible");
    cy.contains(
      "The text focuses entirely on how habits compound over time.",
    ).should("be.visible");
    cy.contains("Next Question").click();

    // --- QUESTION 2 (Let's get it wrong to test scoring) ---
    cy.contains("Question 2 of 2").should("be.visible");
    cy.contains(
      "How long does it take to form a habit according to the text?",
    ).should("be.visible");

    // Click the WRONG answer
    cy.contains("21 days").click();
    cy.contains(
      "The latest research cited mentions an average of 66 days.",
    ).should("be.visible");

    // Because it's the last question, the button should now say "See Results"
    cy.contains("See Results").click();

    // --- RESULTS SCREEN ---
    // We got 1 right and 1 wrong, so the score should be 1/2
    cy.contains("1/2").should("be.visible");
    cy.contains("Great Job!").should("be.visible");

    // Close the modal and verify it unmounts
    cy.contains("Back to Reading").click();
    cy.contains("Knowledge Check").should("not.exist");
  });
});
