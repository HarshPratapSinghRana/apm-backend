from pydantic import BaseModel
from typing import Optional
from semantic_kernel.functions import kernel_function
from src.models.entity import EmploymentLawEntities, InsuranceClaimEntities, RealEstateEntities

class ClassificationResult(BaseModel):
    domain: str
    confidence: float
    reasoning: str

import traceback
import logging
logging.basicConfig(level=logging.INFO)
class ClassificationPlugin:
    """
    Classifies a legal case into a domain based on extracted entities.
    Domains: Employment & Labor Law, Insurance Claims, Real Estate & Property
    """
    def __init__(self):
        # Define domain heuristics (entity keys for each domain)
        self.domain_heuristics = {
            "Employment & Labor Law": [
                "employer name", "employment dates", "violation type", "damages", "witnesses", "termination", "harassment"
            ],
            "Insurance Claims": [
                "incident date", "injury type", "medical treatment", "insurance details", "liable parties", "medical costs", "lost wages"
            ],
            "Real Estate & Property": [
                "property address", "transaction type", "parties involved", "timeline", "contract terms", "closing deadlines", "eviction"
            ]
        }
        self.logger = logging.getLogger("ClassificationPlugin")

    def classify(self, entities: dict, domain: Optional[str] = None) -> ClassificationResult:
        """
        Classify the case domain based on extracted entities. Only classify if all required entities are present.
        Args:
            entities (dict): Extracted entities from the intake process.
            domain (str, optional): The expected domain (if known).
        Returns:
            ClassificationResult: domain, confidence, and reasoning.
        """
        try:
            self.logger.info(f"Classifying entities: {entities}")
            # If domain is provided, check completeness for that domain
            domain_models = {
                "Employment & Labor Law": EmploymentLawEntities,
                "Insurance Claims": InsuranceClaimEntities,
                "Real Estate & Property": RealEstateEntities
            }
            if domain and domain in domain_models:
                model = domain_models[domain]
                missing = [f for f in model.model_fields.keys() if not entities.get(f)]
                if missing:
                    reasoning = f"Missing required entities for {domain}: {missing}"
                    self.logger.warning(reasoning)
                    return ClassificationResult(domain="Unknown", confidence=0.0, reasoning=reasoning)
            scores = {}
            reasoning = {}
            entity_keys = set(k.lower() for k in entities.keys())
            for d, keywords in self.domain_heuristics.items():
                matched = [k for k in keywords if any(k in ek for ek in entity_keys)]
                scores[d] = len(matched)
                reasoning[d] = f"Matched: {matched}" if matched else "No strong matches."
            # Pick the domain with the highest score
            best_domain = max(scores, key=lambda d: scores[d])
            total = sum(scores.values())
            confidence = (scores[best_domain] / (total or 1)) if total else 0.0
            result = ClassificationResult(
                domain=best_domain,
                confidence=round(confidence, 2),
                reasoning=reasoning[best_domain]
            )
            self.logger.info(f"Classification result: {result}")
            return result
        except Exception as e:
            self.logger.error("[ClassificationPlugin classify Error]")
            self.logger.error(f"Type: {type(e).__name__}")
            self.logger.error(f"Message: {e}")
            self.logger.error("Traceback:")
            self.logger.error(traceback.format_exc())
            # Return a default result on error
            return ClassificationResult(domain="Unknown", confidence=0.0, reasoning=f"Error: {type(e).__name__}: {e}")