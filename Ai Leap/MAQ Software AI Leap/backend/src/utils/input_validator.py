import re
from typing import Optional, Tuple


MAX_INPUT_LENGTH = 2000


BLOCK_PATTERNS = {
    "sql_injection": [
        r"(?i)\b(select\s+.+\s+from|union\s+select|insert\s+into|update\s+.+\s+set|delete\s+from)\b",
        r"(?i)\b(drop\s+table|alter\s+table|truncate\s+table|create\s+table)\b",
        r"(?i)(?:'\s*or\s*'1'\s*=\s*'1|\b1\s*=\s*1\b)",
        r"(?i)\b(xp_cmdshell|waitfor\s+delay|sleep\s*\(|benchmark\s*\()",
        r"(?i)\b(information_schema|pg_catalog|sys\.tables|sys\.columns)\b",
        r"(?i)(?:;\s*--|/\*.*?\*/)",
    ],
    "prompt_injection": [
        r"(?i)\b(ignore|disregard|forget)\b.{0,40}\b(previous|above|system)\b.{0,40}\b(instruction|prompt|rule)s?\b",
        r"(?i)\b(pretend\s+you\s+are|act\s+as|role\s*play|jailbreak|dan\b)\b",
        r"(?i)\b(reveal|show|print|leak|expose)\b.{0,40}\b(system\s*prompt|hidden\s*prompt|developer\s*message)\b",
        r"(?i)(\[inst\]|<<\s*sys\s*>>|<\s*/?\s*system\s*>)",
    ],
    "sensitive_request": [
        r"(?i)\b(generate|create|give|provide)\b.{0,40}\b(password|credential|api\s*key|secret\s*key|token)s?\b",
        r"(?i)\b(fake|generate|create)\b.{0,40}\b(ssn|social\s*security|credit\s*card|cvv)\b",
        r"(?i)\b(exploit|payload|sqlmap|metasploit|ransomware|malware|phishing)\b",
        r"(?i)\b(run|execute)\b.{0,40}\b(cmd|powershell|bash|shell\s*command)s?\b",
        r"(?i)\b(read|open|cat|type|download)\b.{0,40}\b(/etc/passwd|\.env|id_rsa|secret|token)\b",
    ],
}


def sanitize_input(user_input: str) -> str:
    """Sanitize harmless formatting issues without changing user intent."""
    sanitized = user_input.replace("\x00", "")
    sanitized = re.sub(r"[ \t]{2,}", " ", sanitized)
    return sanitized.strip()


def validate_user_input(user_input: str) -> Tuple[bool, Optional[str], str]:
    """Validate and sanitize chat input.

    Returns: (is_valid, reason, sanitized_input)
    """
    sanitized = sanitize_input(user_input)

    if not sanitized:
        return False, "empty_input", sanitized

    if len(sanitized) > MAX_INPUT_LENGTH:
        return False, "input_too_long", sanitized

    for reason, patterns in BLOCK_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, sanitized):
                return False, reason, sanitized

    return True, None, sanitized


def blocked_input_message(reason: Optional[str]) -> str:
    """User-safe rejection message for blocked content."""
    if reason == "input_too_long":
        return "Your message is too long. Please keep it under 2000 characters and try again."

    if reason == "empty_input":
        return "Please enter a valid message and try again."

    return "I can't help with that request. Please ask a safe, non-sensitive question."