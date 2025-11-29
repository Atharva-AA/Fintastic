from classifier import classify_text

# Use same expected structure as before (since Transaction & schema are gone)
transaction_template = {
    "type": None,
    "subtype": None,
    "category": None,
    "note": None,
}

async def create_transaction(amount: int, description: str):
    ai_result = await classify_text(description)

    transaction = transaction_template.copy()
    transaction.update({

        "type": ai_result.get("type"),
        "subtype": ai_result.get("subtype"),
        "category": ai_result.get("category"),
        # Use classifier's note (which may be enriched), or the raw description
        "note": ai_result.get("note", description),
    })

    return transaction
