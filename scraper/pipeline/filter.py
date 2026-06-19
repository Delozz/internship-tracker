import re
from typing import Optional

_INCLUDE = re.compile(
    r"\b(software|swe|engineer|developer|quant|quantitative|research|"
    r"data|ml|machine.learning|systems|backend|frontend|fullstack|"
    r"infrastructure|platform|scientist|analytics|devops|sre)\b",
    re.IGNORECASE,
)

_EXCLUDE = re.compile(
    r"\b(marketing|sales|\bhr\b|recruiter|product.manager|\bpm\b|"
    r"designer|ux|graphic|content|copywriter|accountant|finance.analyst)\b",
    re.IGNORECASE,
)

_QUANT = re.compile(
    r"\b(quant|quantitative|trading|algorithmic|algo|hft|derivatives|"
    r"fixed.income|risk.model)\b",
    re.IGNORECASE,
)

_CS_RESEARCH = re.compile(
    r"\b(research|scientist|phd|ml|machine.learning|ai|nlp|computer.vision|"
    r"reinforcement.learning|deep.learning)\b",
    re.IGNORECASE,
)


def classify_role(title: str) -> Optional[str]:
    """Return role_type or None if listing should be excluded."""
    if _EXCLUDE.search(title):
        return None
    if not _INCLUDE.search(title):
        return None
    if _QUANT.search(title):
        return "quant"
    if _CS_RESEARCH.search(title):
        return "cs_research"
    return "swe"


def should_include(title: str) -> bool:
    return classify_role(title) is not None
