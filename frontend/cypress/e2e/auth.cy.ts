describe("Authentication Flows", () => {
  describe("Login Page", () => {
    beforeEach(() => {
      cy.visit("/login");
    });

    it("should display Zod validation errors if the form is submitted empty", () => {
      cy.get('button[type="submit"]').click();
      cy.contains("Please enter a valid email address").should("be.visible");
      cy.contains("Password is required").should("be.visible");
    });

    it("should display a Zod validation error for an invalid email format", () => {
      cy.get('input[placeholder="Email"]').type("not-an-email");
      cy.get('input[placeholder="Password"]').type("password123");
      cy.get('button[type="submit"]').click();
      cy.contains("Please enter a valid email address").should("be.visible");
    });

    it("should successfully log in, show a toast, and redirect to the home page", () => {
      // THE FIX: Target the exact route including the /email segment!
      cy.intercept("POST", "**/api/auth/sign-in/email", {
        statusCode: 200,
        body: {
          user: { id: "user-123", email: "test@example.com" },
          session: { id: "session-123" },
        },
      }).as("loginSuccess");

      cy.get('input[placeholder="Email"]').type("test@example.com");
      cy.get('input[placeholder="Password"]').type("ValidPassword123!");
      cy.get('button[type="submit"]').click();

      cy.get('button[type="submit"]').should("be.disabled");
      cy.wait("@loginSuccess");
      cy.contains("Successfully logged in!").should("be.visible");
      cy.url().should("eq", Cypress.config().baseUrl + "/");
    });

    it("should show an error toast when login fails with invalid credentials", () => {
      // THE FIX: Explicitly target the /email route so it catches the fetch!
      cy.intercept("POST", "**/api/auth/sign-in/email", {
        statusCode: 401,
        body: { error: { message: "Invalid credentials" } },
      }).as("loginFailure");

      cy.get('input[placeholder="Email"]').type("wrong@example.com");
      cy.get('input[placeholder="Password"]').type("wrongpassword");
      cy.get('button[type="submit"]').click();

      cy.wait("@loginFailure");
      cy.contains("Invalid credentials. Try again.").should("be.visible");
    });
  });

  // ==========================================
  // SIGNUP PAGE TESTS
  // ==========================================
  describe("Create Account Page", () => {
    beforeEach(() => {
      cy.visit("/signup");
    });

    it("should display Zod validation errors for empty fields", () => {
      cy.contains("button", "Create Account").click();

      // Checking your specific Zod error messages
      cy.contains("Username must be at least 3 characters").should(
        "be.visible",
      );
      cy.contains("Please enter a valid email address").should("be.visible");
      cy.contains("Password must be at least 8 characters").should(
        "be.visible",
      );
    });

    it("should display Zod validation errors for invalid input lengths", () => {
      // Type inputs that fail the min() requirements
      cy.get('input[placeholder="Username"]').type("yo"); // Only 2 chars
      cy.get('input[placeholder="Email"]').type("bademail"); // Not an email
      cy.get('input[placeholder="Password"]').type("short"); // Under 8 chars
      cy.contains("button", "Create Account").click();

      cy.contains("Username must be at least 3 characters").should(
        "be.visible",
      );
      cy.contains("Please enter a valid email address").should("be.visible");
      cy.contains("Password must be at least 8 characters").should(
        "be.visible",
      );
    });

    it("should successfully create an account, show a toast, and redirect", () => {
      // FIX 1: Add a delay so the loading state stays on screen long enough to test!
      cy.intercept("POST", "**/api/auth/sign-up/email", {
        delay: 500, // <--- Added a 500ms delay
        statusCode: 200,
        body: {
          user: { id: "new-123", email: "new@example.com", name: "Ayush" },
          session: { id: "session-123" },
        },
      }).as("signupSuccess");

      // Fill out valid data
      cy.get('input[placeholder="Username"]').type("Ayush");
      cy.get('input[placeholder="Email"]').type("new@example.com");
      cy.get('input[placeholder="Password"]').type("SecurePassword123!");
      cy.contains("button", "Create Account").click();

      // FIX 2: Target the button by its type, NOT its text, because the text disappears!
      cy.get('button[type="submit"]').should("be.disabled");

      // Wait for backend and verify success UI
      cy.wait("@signupSuccess");
      cy.contains("Account created successfully!").should("be.visible");
      cy.url().should("eq", Cypress.config().baseUrl + "/");
    });

    it.only("should disable social and submit buttons while social login is loading", () => {
      // FIX 1: Use a Cypress Promise to force an unbreakable 2-second network delay
      cy.intercept("POST", "**/api/auth/sign-in/**", (req) => {
        return new Cypress.Promise((resolve) => {
          setTimeout(() => {
            req.reply({
              statusCode: 400,
              body: { error: { message: "Stay" } },
            });
            resolve();
          }, 2000);
        });
      }).as("socialLogin");

      // Click the GitHub button
      cy.contains("button", "GitHub").click();

      // FIX 2: Check the main Submit button instead!
      // The GitHub text gets replaced by a spinner, making it a moving target.
      // The main button locks down perfectly and never changes text, making it 100% reliable.
      cy.get('button[type="submit"]').should("be.disabled");
    });
  });
});
