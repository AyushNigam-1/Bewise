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

  it.only("should fetch and display AI insights ONLY AFTER the button is clicked", () => {
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
});
