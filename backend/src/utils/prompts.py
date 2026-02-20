import json

def step_extraction_prompt(text_chunk):
    markdown_example = """\
\
### 📌 Why This Matters
- The deep psychological, emotional, or practical reason this step truly matters in life or decision-making.

### 🔍 Hidden Insight
- A counterintuitive truth or uncommon mental shift that most people overlook but makes a big difference.

### 🚀 How to Apply
- Step-by-step actions with psychological precision. Include real-life framing, cues, or habit triggers.

### ⚠️ Common Trap
- A mental bias, emotional block, or subtle mistake people usually fall into when trying this.

### ⚡ Instant Action
- One thing the reader can do *right now* to experience even 1% benefit from this idea.

### 🧠 Memory Hook
- A unique metaphor, phrase, or visual anchor to lock this idea into long-term memory."""

    prompt = f"""
Extract only the **most rare, psychologically deep, life-changing, and actionable insights** from the following text as **structured JSON**.

Do NOT extract generic tips, surface-level observations, or common knowledge. Only include insights that show **clear thinking**, **original application**, or **behavioral transformation**.

Each step must include:
- **step**: A short, psychologically impactful title (not generic verbs). E.g., “Reframe the Failure Signal”, “Anchor Success to Identity”.
- **description**: A brutally clear explanation of what this means, using simple but powerful words.
- **detailed_breakdown** (as a double-encoded JSON markdown block) including:
    - 📌 **Why This Matters** – Real-world significance, not fluff.
    - 🔍 **Hidden Insight** – A non-obvious truth or insight most people miss.
    - 🚀 **How to Apply** – Step-by-step application, using behavior, cues, or framing.
    - ⚠️ **Common Trap** – Mistakes tied to emotion, bias, or misunderstanding.
    - ⚡ **Instant Action** – A quick action to prove the insight’s value immediately.
    - 🧠 **Memory Hook** – Sticky, symbolic phrase or metaphor to remember this insight. 

    **JSON Output Example:**  

    ```json
    {{
        "steps": [
            {{
                "step": "Clear, Action-Oriented Step Title",
                "description": "A simple yet clear explanation of what this step means.",
                "detailed_breakdown": {repr(json.dumps(markdown_example))}
            }}
        ]
    }}
    ```

    **Text to process:**  
    {json.dumps(text_chunk)}

    **Return only the JSON output. No extra text.**
    """
    
    return prompt



def categorization_prompt(categories,steps_only):
    prompt = (
        f"""
        Categorize the following actionable steps into the predefined categories. 
        🔒 **Rules**:
        - Only use the category names **as they are written** in the list below.
        - ❌ Do not modify, reword, or create new category names.
        - ✅ If a step fits, add it under the exact category name.
        - ❓ If it doesn't clearly belong anywhere, return it under "Uncategorized".

        Categories:
        {categories}

        New Actionable Steps:
        {json.dumps(steps_only, indent=4)}

        Preferred JSON structure:
        ```json
        {{
            "Category 1": [
                "Step 1",
                "Step 2"
            ],
            "Category 2": [
                "Step 3",
                "Step 4"
            ]
        }}
        ```
        """
    )
    return prompt

def hierarchy_prompt(categorized_steps):
    prompt = (
        f"""
    🧠 Goal:
        Order the topics from the most foundational to the most advanced, based on how a learner would best understand them. Topics that require prior knowledge must come later.

        ⚠️ Rules:
        - ❌ Do NOT change, reword, or merge any topic names.
        - ✅ Use only the exact topic names provided.
        - ❌ Do NOT add or remove topics.
        - ✅ Maintain full coverage by reusing all topics in the list exactly once.
        - 📌 If unsure about order, place the more general/basic topic earlier.

    Topics:
    {json.dumps(list(categorized_steps.keys()))}

    Preferred JSON format:
    ["Fundamental Topic", "Intermediate Topic", "Advanced Topic"]
    
    **Return only a JSON array of the correctly ordered topics with no extra text.**
    """
)
    
    return prompt


