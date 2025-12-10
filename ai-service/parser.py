import pdfplumber
import re
import hashlib
from datetime import datetime
from io import BytesIO

def clean_amount(value):
    if not value:
        return None
    value = value.replace(",", "").strip()
    try:
        return float(value)
    except:
        return None

def hash_row(date, text, amount):
    """Generate SHA-256 hash for duplicate detection"""
    # Normalize text (remove extra whitespace, lowercase for consistency)
    normalized_text = " ".join(str(text).strip().split()).lower()
    raw = f"{date}-{normalized_text}-{amount}"
    return hashlib.sha256(raw.encode()).hexdigest()

# Detect if a row contains a valid date pattern
DATE_PATTERNS = [
    r"\d{2}-[A-Za-z]{3}-\d{2,4}",
    r"\d{2}/\d{2}/\d{4}",
    r"\d{4}-\d{2}-\d{2}",
]

def extract_date(text):
    """Extract and normalize date from text. Handles formats like '05-Dec-19' or '05-Dec-2019'"""
    if not text:
        return None
    
    # First, try to find date pattern before any parenthesis (value date)
    # Example: "05-Dec-19 (05-Dec-2019)" -> extract "05-Dec-19"
    main_date_match = re.search(r'(\d{1,2}-[A-Za-z]{3}-\d{2,4})', text)
    if main_date_match:
        date_str = main_date_match.group(1)
    else:
        # Try other patterns
        for pattern in DATE_PATTERNS:
            match = re.search(pattern, text)
            if match:
                date_str = match.group(0)
                break
        else:
            return None
    
    try:
        # Try different date formats
        # Format: DD-MMM-YY (e.g., "05-Dec-19")
        try:
            parsed = datetime.strptime(date_str, "%d-%b-%y")
            return parsed.strftime("%Y-%m-%d")
        except:
            pass
        
        # Format: DD-MMM-YYYY (e.g., "05-Dec-2019")
        try:
            parsed = datetime.strptime(date_str, "%d-%b-%Y")
            return parsed.strftime("%Y-%m-%d")
        except:
            pass
        
        # Format: DD/MM/YYYY
        try:
            parsed = datetime.strptime(date_str, "%d/%m/%Y")
            return parsed.strftime("%Y-%m-%d")
        except:
            pass
        
        # Format: YYYY-MM-DD (already normalized)
        try:
            parsed = datetime.strptime(date_str, "%Y-%m-%d")
            return parsed.strftime("%Y-%m-%d")
        except:
            pass
    except:
        pass
    
    return None

def parse_pdf(pdf_bytes):
    rows = []
    print("📄 Parsing PDF with pdfplumber...")

    try:
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                table = None

                # Attempt to extract table if present
                try:
                    table = page.extract_table()
                except:
                    pass

                if table and len(table) > 1:
                    # Clean header row to find column indices
                    header = [str(h).lower().strip() if h else "" for h in table[0]]
                    
                    # Find column indices dynamically
                    date_idx = -1
                    narration_idx = -1
                    debit_idx = -1
                    credit_idx = -1
                    
                    for idx, col in enumerate(header):
                        if 'date' in col:
                            date_idx = idx
                        elif 'narration' in col or 'description' in col or 'particulars' in col:
                            narration_idx = idx
                        elif 'debit' in col:
                            debit_idx = idx
                        elif 'credit' in col:
                            credit_idx = idx
                    
                    # If indices not found, use default positions (SBI format)
                    if date_idx == -1:
                        date_idx = 0
                    if narration_idx == -1:
                        narration_idx = 1
                    if debit_idx == -1:
                        debit_idx = 2
                    if credit_idx == -1:
                        credit_idx = 3
                    
                    # Parse data rows
                    for row in table[1:]:
                        if not row or len(row) < 2:
                            continue

                        # Extract date from first column or search in row
                        date_cell = str(row[date_idx]) if date_idx < len(row) and row[date_idx] else ""
                        date = extract_date(date_cell) if date_cell else extract_date(" ".join(str(x) for x in row if x))
                        
                        if not date:
                            continue

                        # Extract narration
                        narration = str(row[narration_idx]).strip() if narration_idx < len(row) and row[narration_idx] else ""
                        if not narration or len(narration) < 3:
                            # Try to extract from full row text
                            narration = " ".join(str(x) for x in row[narration_idx:debit_idx] if x and str(x).strip())
                        
                        # Extract debit and credit amounts
                        debit = clean_amount(row[debit_idx]) if debit_idx < len(row) and row[debit_idx] else None
                        credit = clean_amount(row[credit_idx]) if credit_idx < len(row) and row[credit_idx] else None

                        amount = debit if debit else credit
                        if not amount or amount <= 0:
                            continue

                        transaction_type = "expense" if debit else "income"
                        row_hash = hash_row(date, narration, amount)

                        rows.append({
                            "hash": row_hash,
                            "date": date,
                            "amount": amount,
                            "text": narration.strip()[:200] if narration else "",
                            "type": transaction_type
                        })
                        print(f"✔ Parsed: {date} | {narration[:50] if narration else 'N/A'} | ₹{amount} | {transaction_type}")

                else:
                    # Fallback text extraction if no table
                    raw_text = page.extract_text() or ""
                    lines = raw_text.split("\n")

                    for line in lines:
                        date = extract_date(line)
                        if not date:
                            continue

                        # Amount extraction
                        amount_match = re.findall(r"[₹Rs\. ]?([\d,]+\.\d{1,2}|[\d,]+)", line)
                        amount = None
                        if amount_match:
                            amount = clean_amount(amount_match[-1])

                        if not amount:
                            continue

                        text_part = re.sub(r"[₹Rs\.,0-9 ]", " ", line).strip()
                        if not text_part:
                            text_part = line.strip()

                        # Guess type
                        if re.search(r"(debited|withdrawal|paid|payment|transfer|atm|pos)", line, re.I):
                            transaction_type = "expense"
                        else:
                            transaction_type = "income"

                        row_hash = hash_row(date, text_part, amount)

                        rows.append({
                            "hash": row_hash,
                            "date": date,
                            "amount": amount,
                            "text": text_part[:200],
                            "type": transaction_type
                        })
                        print(f"✔ Parsed (fallback): {date} | {text_part[:50]} | ₹{amount} | {transaction_type}")

    except Exception as e:
        print(f"❌ PDF parse error: {e}")
        return []

    print(f"✅ Total parsed rows: {len(rows)}")
    return rows
