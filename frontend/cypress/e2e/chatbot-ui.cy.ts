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

  it("should attach selected context to the network payload and clear it after sending", () => {
    cy.intercept("POST", "**/ai/rag/invoke*", {
      statusCode: 200,
      body: {
        output: { answer: "Here is your contextual answer!", insights: {} },
      },
    }).as("contextChat");

    cy.getByTestId("chatbot-button").click();

    // 1. Open the context menu
    cy.getByTestId("context-menu-btn").click();
    cy.contains("Select Books").should("be.visible");

    // 2. THE FIX: Scroll the item into view like a real human, then click it!
    cy.getByTestId("context-item-Think Straight")
      .scrollIntoView()
      .should("be.visible")
      .click();

    // 3. THE FIX: Close the menu BEFORE checking if the pill was added
    cy.getByTestId("context-menu-btn").click();
    cy.contains("Select Books").should("not.exist");

    // 4. NOW verify the pill is visible!
    // Since the menu is closed, Cypress won't get confused by the hidden list item.
    cy.contains("Think Straight").should("be.visible");

    // 5. Send the message
    cy.getByTestId("chat-input").type("What does the book say about this?");
    cy.getByTestId("send-button").click();

    // 6. Check the raw network payload
    cy.wait("@contextChat").then((interception) => {
      expect(interception.request.body.input.books_ids).to.include(
        "Think Straight",
      );
    });

    // 7. Verify your clearContexts() function worked
    cy.contains("Think Straight").should("not.exist");
  });

  it("should copy the user's own message to the clipboard", () => {
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, "writeText")
        .callsFake(() => Promise.resolve())
        .as("copyToClipboard");
    });

    cy.getByTestId("chatbot-button").click();

    // 1. Send a test message
    cy.getByTestId("chat-input").type("This is my custom prompt.");
    cy.getByTestId("send-button").click();

    // 2. Find the user bubble, and click ITS specific copy button
    cy.getByTestId("copy-human-message").first().click({ force: true });

    // 3. Verify the clipboard caught the user's exact text
    cy.get("@copyToClipboard").should(
      "have.been.calledWith",
      "This is my custom prompt.",
    );
    cy.contains("Copied to clipboard").should("exist");
  });

  it("should copy the AI message to the clipboard", () => {
    // 1. Stub the clipboard
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, "writeText")
        .callsFake(() => Promise.resolve())
        .as("copyToClipboard");
    });

    cy.getByTestId("chatbot-button").click();

    // 2. Target the copy button on the very first AI message (the greeting)
    // We use the 'title' attribute you smartly added to the component!
    cy.getByTestId("copy-ai-message").first().click({ force: true });

    // 3. Assert the exact markdown-stripped string was passed to the clipboard
    cy.get("@copyToClipboard").should(
      "have.been.calledWith",
      "Hello! I'm Wiser. Ask me about any book, author, or insight.",
    );

    // 4. Verify your Toastify success notification appeared
    cy.contains("Copied to clipboard").should("exist");
  });

  it("should allow the user to edit a sent message and resend it", () => {
    cy.intercept("POST", "**/ai/rag/invoke*", {
      statusCode: 200,
      body: {
        output: {
          answer: "This is the answer to the edited prompt!",
          insights: {},
        },
      },
    }).as("editChat");

    cy.getByTestId("chatbot-button").click();

    // 1. Send the initial mistake message
    cy.getByTestId("chat-input").type("Oops, I made a typo.");
    cy.getByTestId("send-button").click();

    // 2. THE FIX: Wait for the FIRST request to finish to clear it from the queue!
    cy.wait("@editChat");

    cy.getByTestId("user-chat-bubble")
      .last()
      .should("contain", "Oops, I made a typo.");

    // 3. Click the Pencil icon to edit
    cy.get('[title="Edit message"]').last().click({ force: true });

    // 4. Highlight all and type the new message
    cy.getByTestId("user-chat-bubble")
      .last()
      .find('[contenteditable="true"]')
      .focus()
      .type("{selectall}{backspace}This is the corrected message.");

    // 5. Click Save & Send
    cy.get('[title="Save & Send"]').click({ force: true });

    // 6. NOW this wait will catch the SECOND request (the edited one!)
    cy.wait("@editChat").then((interception) => {
      expect(interception.request.body.input.message).to.equal(
        "This is the corrected message.",
      );
    });

    // 7. Verify the UI updated
    cy.getByTestId("user-chat-bubble")
      .last()
      .should("contain", "This is the corrected message.");
    cy.getByTestId("user-chat-bubble")
      .last()
      .should("not.contain", "Oops, I made a typo.");
  });

  it.only("should call the TTS API and play audio when the read aloud button is clicked", () => {
    // 1. Intercept the voice generation API and return a fake audio Blob
    // (Adjust '**/voice*' to match the actual route your generateVoice service calls)
    cy.intercept("POST", "**/generate-voice*", {
      statusCode: 200,
      headers: { "content-type": "audio/mpeg" },
      body: new Blob(["dummy audio data"], { type: "audio/mpeg" }),
    }).as("voiceChat");

    // 2. THE PRO MOVE: Stub the browser's Audio engine so it doesn't actually play sound!
    cy.window().then((win) => {
      cy.stub(win.Audio.prototype, "play")
        .callsFake(() => Promise.resolve())
        .as("audioPlay");
    });

    cy.getByTestId("chatbot-button").click();

    // 3. Click the read aloud button on the initial AI greeting
    cy.getByTestId("read-message-aloud").first().click({ force: true });

    // 4. Verify the frontend requested the audio from the backend
    cy.wait("@voiceChat").then((interception) => {
      // It sends the first 200 characters of the text based on your handleReadAloud logic
      expect(interception.request.body).to.exist;
    });

    // 5. Verify the browser's Audio.play() was successfully triggered!
    cy.get("@audioPlay").should("have.been.called");
  });
});
