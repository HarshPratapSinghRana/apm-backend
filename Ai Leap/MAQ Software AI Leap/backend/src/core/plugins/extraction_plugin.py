from pydantic import BaseModel
from semantic_kernel.agents import ChatCompletionAgent
from semantic_kernel.functions import KernelArguments, kernel_function
from src.models.entity import EmploymentLawEntities, InsuranceClaimEntities, RealEstateEntities
import traceback
import logging
logging.basicConfig(level=logging.INFO)

class ExtractionPlugin:
    """A plugin to extract entities and urgency metrics from user input, with extensible, structured, and validated output."""

    class ExtractionResult(BaseModel):
        entities: dict
        missing_fields: list[str] = []
        confidence: float | None = None
        raw_response: str | None = None
        errors: list[str] = []

    def __init__(self, llm_service, entity_schema: dict | None = None):
        """
        Initialize the Extraction Plugin with the provided LLM service.
        Args:
            llm_service: The LLM service tuple.
            entity_schema (dict, optional): Schema for expected entities (for validation/extensibility).
        """
        self.llm_service = llm_service
        self.entity_schema = entity_schema or {}
        self.logger = logging.getLogger("ExtractionPlugin")
        # Domain-specific schemas for required entities
        self.domain_entity_models = {
            "Employment & Labor Law": EmploymentLawEntities,
            "Insurance Claims": InsuranceClaimEntities,
            "Real Estate & Property": RealEstateEntities
        }
        self.domain_entity_fields = {
            domain: set(model.model_fields.keys()) for domain, model in self.domain_entity_models.items()
        }
        try:
            chat_service, request_settings = self.llm_service
            self.agent = ChatCompletionAgent(
                service=chat_service,
                name="Entity-Extraction-Agent",
                instructions=(
                    "You are an entity extraction assistant. "
                    "For the given legal domain, you must extract all required entities as defined for that domain. "
                    "If any required entity is missing or unclear, ask the user a follow-up question to obtain it. "
                    "Continue asking until all required entities are collected. "
                    "Return the extracted entities in a structured format. "
                    "Always ensure clarity, completeness, and accuracy in your responses."
                ),
                arguments=KernelArguments(request_settings)
            )
        except Exception as e:
            self.logger.error("[ExtractionPlugin Initialization Error]")
            self.logger.error(f"Type: {type(e).__name__}")
            self.logger.error(f"Message: {e}")
            self.logger.error("Traceback:")
            self.logger.error(traceback.format_exc())
            raise

    @kernel_function(description="Sets the entity schema for extraction.")
    def set_entity_schema(self, schema: dict):
        """Update the expected entity schema for extraction."""
        self.entity_schema = schema

    @kernel_function(description="Validates extracted entities against the schema.")
    def validate_entities(self, entities: dict) -> tuple[dict, list[str]]:
        """
        Validate extracted entities against the schema. Returns (valid_entities, missing_fields).
        """
        if not self.entity_schema:
            return entities, []
        missing = []
        valid = {}
        for key, expected_type in self.entity_schema.items():
            value = entities.get(key)
            if value is None:
                missing.append(key)
            else:
                # Optionally, add type checking here
                valid[key] = value
        return valid, missing

    @kernel_function(description="Extracts entities and urgency metrics from user input, recursively asking for missing entities until all are collected.")
    async def extract_entities(
        self,
        user_input: str,
        domain: str,
        context: dict | None = None,
        extra_metadata: dict | None = None
    ) -> ExtractionResult:
        """
        Extract entities and urgency metrics from user input, recursively asking for missing entities until all are collected.
        Args:
            user_input (str): The user's input text.
            domain (str): The legal domain for which to extract entities.
            context (dict, optional): Additional context for extraction (e.g., conversation, user profile).
            extra_metadata (dict, optional): Additional metadata for LLM prompt.
        Returns:
            ExtractionResult: Structured extraction result.
        """
        try:
            self.logger.info(f"Extracting entities from user_input: {user_input} for domain: {domain}")
            self.logger.debug(f"Context: {context}")
            self.logger.debug(f"Extra metadata: {extra_metadata}")
            if domain not in self.domain_entity_fields:
                raise ValueError(f"Unknown domain: {domain}")
            required_fields = self.domain_entity_fields[domain]
            collected_entities = {}
            errors = []
            followup_round = 0
            max_rounds = 5
            current_input = user_input
            while followup_round < max_rounds:
                messages = []
                if context:
                    messages.append({"role": "system", "content": str(context)})
                if extra_metadata:
                    messages.append({"role": "system", "content": f"Metadata: {extra_metadata}"})
                messages.append({"role": "user", "content": current_input})
                # Ask for missing fields only
                missing_fields = [f for f in required_fields if f not in collected_entities or not collected_entities[f]]
                if followup_round > 0 and missing_fields:
                    followup_q = f"Please provide the following missing information for your {domain} case: {', '.join(missing_fields)}."
                    messages.append({"role": "assistant", "content": followup_q})
                response = await self.agent.get_response(
                    messages=messages,
                    thread=None
                )
                import json
                entities = {}
                try:
                    if isinstance(response, dict):
                        entities = response.get("entities", response)
                    else:
                        entities = json.loads(str(response))
                except Exception:
                    errors.append("Could not parse response as structured entities.")
                    self.logger.warning("Could not parse response as structured entities.")
                # Merge newly extracted entities
                for k in required_fields:
                    v = entities.get(k) if isinstance(entities, dict) else None
                    if v:
                        collected_entities[k] = v
                # Check if all required fields are collected
                still_missing = [f for f in required_fields if not collected_entities.get(f)]
                if not still_missing:
                    break
                followup_round += 1
                current_input = ""  # After first round, only use follow-up prompt
            valid_entities, missing_fields = self.validate_entities(collected_entities)
            result = self.ExtractionResult(
                entities=valid_entities,
                missing_fields=missing_fields,
                confidence=None,
                raw_response=str(collected_entities),
                errors=errors
            )
            self.logger.info(f"[ExtractionPlugin] Extracted Entities: {result}")
            return result
        except Exception as e:
            self.logger.error("[ExtractionPlugin extract_entities Error]")
            self.logger.error(f"Type: {type(e).__name__}")
            self.logger.error(f"Message: {e}")
            self.logger.error("Traceback:")
            self.logger.error(traceback.format_exc())
            return self.ExtractionResult(entities={}, missing_fields=[], confidence=None, raw_response=f"[Error] {type(e).__name__}: {e}", errors=[str(e)])