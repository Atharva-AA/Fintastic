import json
import os
from groq import AsyncGroq
from prompts.system_prompt import classifier_prompt
from dotenv import load_dotenv

load_dotenv()

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
GROQ_MODEL = "llama-3.3-70b-versatile"

async def classify_text(text):
    try:
        result = await client.chat.completions.create(
            model=GROQ_MODEL,
            temperature=0.2,
            messages=[
                {"role": "system", "content": classifier_prompt},
                {"role": "user", "content": text}
            ]
        )

        response = result.choices[0].message.content.strip()

        # Clean up potential markdown formatting
        if response.startswith("```json"):
            response = response[7:]
        if response.endswith("```"):
            response = response[:-3]
        
        response = response.strip()
        data = json.loads(response)

        # Ensure required keys exist and are within expected enums
        type_ = data.get("type", "expense")
        subtype = data.get("subtype", "one-time")
        category = data.get("category", "Other")
        note = data.get("note", text)

        # Normalize some common values / typos
        valid_types = {"income", "expense", "saving", "investment"}
        if type_ not in valid_types:
            type_ = "expense"

        valid_subtypes = {"fixed", "variable", "one-time", "debit", "allocation", "lumpsum"}
        if subtype not in valid_subtypes:
            subtype = "one-time"


        return {
            "type": type_,
            "subtype": subtype,
            "category": category,
            "note": note,
        }
    except Exception as e:
        # Fallback for any error (JSON or API)
        print(f"Classification error: {e}")
        return {
            "type": "expense",
            "subtype": "variable",
            "category": "Other",
            "note": text
        }
