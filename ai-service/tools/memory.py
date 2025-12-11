"""
Memory management tools for ChromaDB operations
"""

import uuid
from typing import Any, Dict, List, Optional
from datetime import datetime
import chromadb
from sentence_transformers import SentenceTransformer

from config import CHROMA_PATH, TYPE_MAPPING

# Initialize ChromaDB
print(f"\n✅ Chroma DB will be stored at:\n{CHROMA_PATH}\n")
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = chroma_client.get_or_create_collection(name="fintastic_memory")

# Embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")


def get_importance(mem_type: str, metadata: Optional[Dict[str, Any]] = None) -> str:
    """Determine importance level based on type and metadata"""
    if not metadata:
        metadata = {}
    
    # High importance: critical alerts, goal completions, major decisions
    if (
        metadata.get("level") == "CRITICAL" or
        metadata.get("progress", 0) >= 100 or
        metadata.get("kind") == "stock" or
        mem_type == "decision_history"
    ):
        return "high"
    
    # Medium importance: high alerts, goal progress, positive behaviors
    if (
        metadata.get("level") in ["HIGH", "POSITIVE"] or
        metadata.get("progress", 0) >= 50 or
        mem_type == "goal_progress"
    ):
        return "medium"
    
    # Low importance: everything else
    return "low"


def store_memory_entry(
    user_id: str,
    content: str,
    mem_type: str = "onboarding_profile",
    metadata: Optional[Dict[str, Any]] = None
):
    """
    Store a single memory in Chroma with standardized format.
    Enforces 5 strict memory types and adds standardized metadata.
    """
    if not content or len(content.strip()) < 10:
        return {"status": "skipped", "reason": "content too small"}

    # Map to standardized type
    standardized_type = TYPE_MAPPING.get(mem_type, "onboarding_profile")
    
    # Get importance
    importance = get_importance(standardized_type, metadata)
    
    # Get source and date
    source = metadata.get("source", "ai") if metadata else "ai"
    date = datetime.now().strftime("%Y-%m-%d")

    vector = model.encode(content).tolist()
    doc_id = f"{user_id}_{standardized_type}_{uuid.uuid4().hex[:8]}"

    # Build standardized metadata
    full_meta = {
        "userId": user_id,
        "type": standardized_type,
        "content": content,
        "source": source,
        "date": date,
        "importance": importance,
        "originalType": mem_type,
    }
    if metadata:
        for key, value in metadata.items():
            if key not in ["source", "date", "importance", "type"]:
                full_meta[key] = value

    collection.upsert(
        ids=[doc_id],
        embeddings=[vector],
        metadatas=[full_meta],
        documents=[content],
    )

    return {"status": "stored", "id": doc_id, "type": standardized_type, "importance": importance}


def query_user_memories(user_id: str, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Semantic memory search helper."""
    query_vector = model.encode(query).tolist()
    results = collection.query(
        query_embeddings=[query_vector],
        n_results=top_k,
        where={"userId": user_id},
    )

    matches: List[Dict[str, Any]] = []
    if results and results.get("ids"):
        for i in range(len(results["ids"][0])):
            matches.append(
                {
                    "id": results["ids"][0][i],
                    "content": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                }
            )
    return matches


def merge_and_clean_memories(records: List[Any]) -> str:
    """Merge pre-fetched memory snippets into a readable block."""
    snippets: List[str] = []
    seen = set()

    for entry in records:
        if isinstance(entry, str):
            content = entry.strip()
        else:
            content = (
                entry.get("content")
                or entry.get("metadata", {}).get("content")
                or ""
            ).strip()

        if not content or content in seen:
            continue

        seen.add(content)
        snippets.append(content)

    return "\n".join(snippets)


def get_latest_alert_context(alert: Optional[Dict[str, Any]]) -> str:
    """Return a clean textual summary for the latest alert."""
    if not alert:
        return (
            "ALERT CONTEXT\n"
            "--------------\n"
            "Level: data_insufficient\n"
            "Scope: data_insufficient\n"
            "Title: data_insufficient\n"
            "Reasons:\ndata_insufficient"
        )

    reasons = alert.get("reasons") or []
    reasons_text = "\n".join([f"- {r}" for r in reasons]) or "data_insufficient"

    return (
        "ALERT CONTEXT\n"
        "--------------\n"
        f"Level: {alert.get('level')}\n"
        f"Scope: {alert.get('scope')}\n"
        f"Title: {alert.get('title')}\n"
        "Reasons:\n"
        f"{reasons_text}"
    )


def build_behavior_context(behavior: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Format behavior profile numbers for prompts."""
    behavior = behavior or {}
    discipline = behavior.get("disciplineScore", 50)
    impulse = behavior.get("impulseScore", 50)
    consistency = behavior.get("consistencyIndex", 50)
    risk_index = behavior.get("riskIndex", 50)

    context = (
        "BEHAVIOR PROFILE\n"
        "--------------\n"
        f"Discipline: {discipline}/100\n"
        f"Impulse: {impulse}/100\n"
        f"Consistency: {consistency}/100\n"
        f"Risk: {risk_index}/100\n"
        "\nGuidelines:\n"
        f"- High discipline ({discipline}): Be analytical and detailed\n"
        f"- High impulse ({impulse}): Add stronger spending warnings\n"
        f"- Low consistency ({consistency}): Motivate habit-building\n"
        f"- Risk index ({risk_index}): Adjust investment tone accordingly\n"
    )

    return {
        "discipline": discipline,
        "impulse": impulse,
        "consistency": consistency,
        "risk": risk_index,
        "text": context,
    }


# Export collection for direct access if needed
def get_collection():
    """Get the ChromaDB collection for direct operations"""
    return collection


def get_model():
    """Get the embedding model"""
    return model
