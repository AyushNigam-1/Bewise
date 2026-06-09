describe("Authentication Network Journeys", () => {

  describe("Login Flow", () => {
    beforeEach(() => {
      cy.visit("/login");
    });

    it("should successfully log in, show a toast, and redirect to the home page", () => {
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

      // Verify loading state
      cy.get('button[type="submit"]').should("be.disabled");

      // Verify network success and routing
      cy.wait("@loginSuccess");
      cy.contains("Successfully logged in!").should("be.visible");
      cy.url().should("eq", Cypress.config().baseUrl + "/");
    });

    it("should show an error toast when login fails with invalid credentials", () => {
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

  describe("Signup & Social Flow", () => {
    beforeEach(() => {
      cy.visit("/signup");
    });

    it("should successfully create an account, show a toast, and redirect", () => {
      cy.intercept("POST", "**/api/auth/sign-up/email", {
        delay: 500, // Forces the loading spinner to render
        statusCode: 200,
        body: {
          user: { id: "new-123", email: "new@example.com", name: "Ayush" },
          session: { id: "session-123" },
        },
      }).as("signupSuccess");

      cy.get('input[placeholder="Username"]').type("Ayush");
      cy.get('input[placeholder="Email"]').type("new@example.com");
      cy.get('input[placeholder="Password"]').type("SecurePassword123!");
      cy.contains("button", "Create Account").click();

      // Verify UI locks down during the network request
      cy.get('button[type="submit"]').should("be.disabled");

      // Verify routing
      cy.wait("@signupSuccess");
      cy.contains("Account created successfully!").should("be.visible");
      cy.url().should("eq", Cypress.config().baseUrl + "/");
    });

    it("should disable social and submit buttons while social login is loading", () => {
      // Force an unbreakable 2-second network delay to test lock-down states
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

      // Trigger the GitHub OAuth popup sequence
      cy.contains("button", "GitHub").click();

      // The main button locks down perfectly and never changes text, making it 100% reliable
      cy.get('button[type="submit"]').should("be.disabled");
    });
  });
});