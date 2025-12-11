"""
PDF Bank Statement parsing route handler
"""

import json
import tempfile
import os
from datetime import datetime
from typing import Any, Dict, List
from pathlib import Path

from tools import store_memory_entry
from node_client import backend_api_request


async def handle_pdf_parse(
    file_content: bytes,
    filename: str,
    user_id: str,
    client,
    model: str
) -> Dict[str, Any]:
    """Parse bank statement PDF and extract transactions"""
    
    try:
        import pdfplumber
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name
        
        try:
            # Extract text from PDF
            text_content = ""
            tables = []
            
            with pdfplumber.open(tmp_path) as pdf:
                for page in pdf.pages:
                    text_content += page.extract_text() or ""
                    text_content += "\n"
                    
                    # Extract tables
                    page_tables = page.extract_tables()
                    if page_tables:
                        tables.extend(page_tables)
            
            if not text_content.strip():
                return {"success": False, "error": "Could not extract text from PDF"}
            
            # Detect bank type
            bank_type = _detect_bank(text_content)
            
            # Parse transactions using AI
            transactions = await _parse_bank_statement(
                client, model, text_content, tables, bank_type
            )
            
            if not transactions:
                return {
                    "success": True,
                    "transactions": [],
                    "message": "No transactions found in statement"
                }
            
            # Store transactions
            stored_count = 0
            for tx in transactions:
                try:
                    tx["userId"] = user_id
                    tx["source"] = "pdf_statement"
                    tx["filename"] = filename
                    
                    result = backend_api_request(
                        "POST",
                        "/transactions/from-statement",
                        {"userId": user_id, "transaction": tx}
                    )
                    if result.get("success"):
                        stored_count += 1
                except Exception as e:
                    print(f"⚠️ Error storing PDF transaction: {e}")
            
            # Store memory
            store_memory_entry(
                user_id,
                f"Parsed bank statement: {filename}, found {len(transactions)} transactions, stored {stored_count}",
                "pdf_parse",
                {
                    "filename": filename,
                    "bank": bank_type,
                    "date": datetime.now().isoformat(),
                    "transactionsFound": len(transactions),
                    "transactionsStored": stored_count
                }
            )
            
            # Calculate summary
            summary = _calculate_statement_summary(transactions)
            
            return {
                "success": True,
                "bank": bank_type,
                "transactions": transactions,
                "transactionCount": len(transactions),
                "storedCount": stored_count,
                "summary": summary,
                "filename": filename
            }
            
        finally:
            # Cleanup temp file
            os.unlink(tmp_path)
        
    except ImportError:
        return {"success": False, "error": "PDF parsing not available. Install pdfplumber."}
    except Exception as e:
        print(f"❌ PDF parse error: {e}")
        import traceback
        print(traceback.format_exc())
        return {"success": False, "error": str(e)}


def _detect_bank(text: str) -> str:
    """Detect bank from statement text"""
    
    text_lower = text.lower()
    
    bank_indicators = {
        "hdfc": ["hdfc bank", "hdfcbank"],
        "icici": ["icici bank", "icicibank"],
        "sbi": ["state bank of india", "sbi"],
        "axis": ["axis bank"],
        "kotak": ["kotak mahindra"],
        "pnb": ["punjab national bank"],
        "bob": ["bank of baroda"],
        "canara": ["canara bank"],
        "union": ["union bank"],
        "idbi": ["idbi bank"],
        "yes": ["yes bank"],
        "indusind": ["indusind bank"],
        "rbl": ["rbl bank"],
        "federal": ["federal bank"],
        "paytm": ["paytm payments bank"],
        "fi": ["fi money", "fi.money"]
    }
    
    for bank, indicators in bank_indicators.items():
        if any(ind in text_lower for ind in indicators):
            return bank
    
    return "unknown"


async def _parse_bank_statement(
    client,
    model: str,
    text: str,
    tables: List,
    bank_type: str
) -> List[dict]:
    """Parse transactions from bank statement using AI"""
    
    # Truncate text if too long
    max_text_len = 15000
    if len(text) > max_text_len:
        text = text[:max_text_len] + "\n... (truncated)"
    
    # Format tables
    table_text = ""
    if tables:
        for i, table in enumerate(tables[:5]):
            table_text += f"\nTable {i+1}:\n"
            for row in table[:20]:
                table_text += " | ".join([str(cell or "") for cell in row]) + "\n"
    
    prompt = f"""Parse this {bank_type.upper()} bank statement and extract ALL transactions.

STATEMENT TEXT:
{text}

{f"TABLES:{table_text}" if table_text else ""}

Return JSON array of transactions:
[
  {{
    "date": "YYYY-MM-DD",
    "type": "income | expense | transfer",
    "amount": number (positive),
    "category": "category name",
    "description": "transaction description",
    "reference": "reference number if available",
    "balance": number or null
  }}
]

Rules:
1. Extract ALL transactions found
2. Credits/deposits = income, Debits/withdrawals = expense
3. UPI, NEFT, IMPS are transfers unless merchant is clear
4. Categorize based on description (Food, Shopping, Bills, Salary, etc.)
5. Use Indian date format awareness (DD/MM/YYYY)
6. Return empty array [] if no transactions found"""

    try:
        result = await client.chat.completions.create(
            model=model,
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are an expert Indian bank statement parser."},
                {"role": "user", "content": prompt}
            ]
        )
        
        response = json.loads(result.choices[0].message.content.strip())
        
        # Handle different response formats
        if isinstance(response, list):
            return response
        elif isinstance(response, dict) and "transactions" in response:
            return response["transactions"]
        elif isinstance(response, dict) and len(response) == 0:
            return []
        else:
            return []
            
    except Exception as e:
        print(f"⚠️ AI parsing error: {e}")
        return []


def _calculate_statement_summary(transactions: List[dict]) -> dict:
    """Calculate summary statistics from transactions"""
    
    total_income = 0
    total_expense = 0
    categories = {}
    
    for tx in transactions:
        amount = abs(tx.get("amount", 0))
        tx_type = tx.get("type", "expense")
        category = tx.get("category", "Other")
        
        if tx_type == "income":
            total_income += amount
        elif tx_type == "expense":
            total_expense += amount
            
            if category not in categories:
                categories[category] = 0
            categories[category] += amount
    
    # Top categories
    top_categories = sorted(categories.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return {
        "totalIncome": total_income,
        "totalExpense": total_expense,
        "netFlow": total_income - total_expense,
        "transactionCount": len(transactions),
        "topExpenseCategories": [
            {"category": cat, "amount": amt} for cat, amt in top_categories
        ]
    }


def get_supported_banks() -> Dict[str, Any]:
    """Return list of supported banks for PDF parsing"""
    
    return {
        "supported": [
            {"code": "hdfc", "name": "HDFC Bank"},
            {"code": "icici", "name": "ICICI Bank"},
            {"code": "sbi", "name": "State Bank of India"},
            {"code": "axis", "name": "Axis Bank"},
            {"code": "kotak", "name": "Kotak Mahindra Bank"},
            {"code": "pnb", "name": "Punjab National Bank"},
            {"code": "bob", "name": "Bank of Baroda"},
            {"code": "canara", "name": "Canara Bank"},
            {"code": "union", "name": "Union Bank"},
            {"code": "idbi", "name": "IDBI Bank"},
            {"code": "yes", "name": "Yes Bank"},
            {"code": "indusind", "name": "IndusInd Bank"},
            {"code": "rbl", "name": "RBL Bank"},
            {"code": "federal", "name": "Federal Bank"},
            {"code": "paytm", "name": "Paytm Payments Bank"},
            {"code": "fi", "name": "Fi Money"}
        ],
        "notes": [
            "Most Indian bank statements are supported",
            "PDF should be text-based (not scanned image)",
            "Password-protected PDFs need to be unlocked first"
        ]
    }
