import logging
import traceback
import json
import os
from datetime import datetime
from pydantic import BaseModel
from typing import List, Dict, Optional
from semantic_kernel import Kernel
from semantic_kernel.agents import ChatCompletionAgent
from semantic_kernel.agents.strategies import TerminationStrategy
from semantic_kernel.functions import KernelArguments
from src.models.entity import EmploymentLawEntities, InsuranceClaimEntities, RealEstateEntities
logging.basicConfig(level=logging.INFO)

class ExtractionCompletionStrategy(TerminationStrategy):
    """A strategy for determining when entity extraction is complete."""

    async def should_agent_terminate(self, agent, history):
        """Check if all required entities have been extracted."""
        if not history:
            return False
        
        last_message = history[-1].content.lower()
        
        # Check for completion indicators
        completion_indicators = [
            "extraction complete",
            "all required entities extracted",
            "extraction successful",
            "entities collected successfully"
        ]
        
        return any(indicator in last_message for indicator in completion_indicators)


class ClassificationCompletionStrategy(TerminationStrategy):
    """A strategy for determining when classification is complete."""

    async def should_agent_terminate(self, agent, history):
        """Check if classification has been completed."""
        if not history:
            return False
            
        last_message = history[-1].content.lower()
        
        # Check for classification completion
        completion_indicators = [
            "classification complete",
            "domain classified",
            "classification successful",
            "case categorized"
        ]
        
        return any(indicator in last_message for indicator in completion_indicators)


class LegalWorkflowStrategy(TerminationStrategy):
    """A strategy for determining when the entire legal workflow is complete."""

    async def should_agent_terminate(self, agent, history):
        """Check if the entire workflow (extraction + classification + routing) is complete."""
        if not history:
            return False
            
        last_message = history[-1].content.lower()
        
        # Check for workflow completion
        completion_indicators = [
            "workflow complete",
            "case processed successfully", 
            "routing complete",
            "legal intake finished",
            "ready for assignment"
        ]
        
        return any(indicator in last_message for indicator in completion_indicators)


def _create_kernel_with_chat_completion(service_id: str, llm_service) -> Kernel:
    """Create a kernel with chat completion service."""
    kernel = Kernel()
    chat_service, _ = llm_service
    kernel.add_service(chat_service)
    return kernel


class LegalAgent:
    """A class to represent the Legal Agent using conversational orchestration."""

    def __init__(self, llm_service):
        """Initialize the Legal Agent with conversational state management."""
        self.llm_service = llm_service
        self.logger = logging.getLogger("LegalAgent")
        
        # Conversation state tracking
        self.conversation_state = {
            "current_phase": "initial",  # initial, extraction, classification, routing, complete
            "extracted_entities": {},
            "classification_result": {},
            "conversation_history": [],
            "client_data": {},
            "domain_identified": None
        }
        
        # Domain-specific entity models for reference
        self.domain_entity_models = {
            "Employment & Labor Law": EmploymentLawEntities,
            "Insurance Claims": InsuranceClaimEntities,
            "Real Estate & Property": RealEstateEntities
        }
        
        try:
            # Create specialized agents
            self._create_agents()
            self.logger.info("LegalAgent initialized successfully with conversational orchestration")
            
        except Exception as e:
            self.logger.error("[LegalAgent Initialization Error]")
            self.logger.error(f"Type: {type(e).__name__}")
            self.logger.error(f"Message: {e}")
            self.logger.error("Traceback:")
            self.logger.error(traceback.format_exc())
            raise

    def _create_agents(self):
        """Create specialized agents for the legal workflow."""
        # Store the original service and unpack for agent creation
        original_service = self.llm_service
        chat_service, request_settings = self.llm_service
        
        # Extraction Agent - Specialized for legal intake entity extraction
        self.extraction_agent = ChatCompletionAgent(
            kernel=_create_kernel_with_chat_completion("extraction", original_service),
            name="LegalIntakeExtractionAgent",
            instructions=f"""
            You are a legal intake specialist. Extract required entities efficiently through grouped questions.

            ENTITY GROUPS BY DOMAIN:
            
            EMPLOYMENT LAW:
            Group 1 - Personal: full_name, contact_number, email, address
            Group 2 - Employment: employer_name, employment_dates, violation_type
            Group 3 - Incident: termination, harassment, damages, witnesses
            
            INSURANCE CLAIMS:
            Group 1 - Personal: full_name, contact_number, email, address
            Group 2 - Incident: incident_date, injury_type, medical_treatment
            Group 3 - Financial: insurance_details, liable_parties, medical_costs, lost_wages

            REAL ESTATE:
            Group 1 - Personal: full_name, contact_number, email, address
            Group 2 - Property: property_address, transaction_type, parties_involved
            Group 3 - Timeline: timeline, contract_terms, closing_deadlines, eviction

            EXTRACTION PROTOCOL:
            1. Ask for one complete group of related entities at a time
            2. Be direct and specific in your questions
            3. Do not repeat information already provided
            4. When all groups collected, respond: EXTRACTION COMPLETE: followed by JSON object
            5. Keep responses concise and focused
            
            Ask for missing entity groups systematically. Do not ask for individual entities when you can group related ones together.
            """,
            arguments=KernelArguments(request_settings)
        )

        # Classification Agent - Specialized for legal domain classification and severity assessment
        self.classification_agent = ChatCompletionAgent(
            kernel=_create_kernel_with_chat_completion("classification", original_service),
            name="LegalClassificationAgent", 
            instructions="""
            You are a legal case analyst. Classify cases into domains and assess urgency based on extracted entities.

            DOMAINS:
            EMPLOYMENT LAW: employer_name, employment_dates, violation_type, termination, harassment
            INSURANCE CLAIMS: incident_date, injury_type, medical_treatment, insurance_details, liable_parties
            REAL ESTATE: property_address, transaction_type, contract_terms, closing_deadlines, eviction

            URGENCY LEVELS:
            CRITICAL: Immediate deadlines, serious ongoing harm
            HIGH: Time-sensitive, significant damages
            MEDIUM: Standard issues, moderate complexity
            LOW: Non-urgent, minor disputes

            OUTPUT FORMAT:
            CLASSIFICATION COMPLETE
            Domain: [Employment Law/Insurance Claims/Real Estate]
            Confidence: [0.0-1.0]
            Urgency: [Critical/High/Medium/Low]
            Value: [High/Medium/Low]
            Reasoning: [brief factual analysis]
            Team: [specific department]
            Priority: [1-10]

            Base analysis only on provided entities. Be concise and factual.
            """,
            arguments=KernelArguments(request_settings)
        )

        # Orchestration Agent - Coordinates the entire legal intake workflow
        self.orchestration_agent = ChatCompletionAgent(
            kernel=_create_kernel_with_chat_completion("orchestration", original_service),
            name="LegalIntakeCoordinator",
            instructions="""
            You are a legal intake coordinator. Manage client intake efficiently and professionally.

            PHASES:
            1. INITIAL: Welcome client, identify domain, explain process
            2. EXTRACTION: Guide entity collection
            3. CLASSIFICATION: Analyze case
            4. ROUTING: Provide final recommendations

            COMMUNICATION STYLE:
            - Professional and empathetic
            - Clear and concise
            - No legal advice
            - Maintain confidentiality

            FINAL REPORT FORMAT:
            LEGAL INTAKE COMPLETE
            
            CASE SUMMARY: [brief overview]
            CLIENT: [name and contact]
            ENTITIES: [structured data]
            CLASSIFICATION: [domain and urgency]
            ROUTING: [team assignment]
            NEXT STEPS: [immediate actions]
            TIMELINE: [follow-up schedule]

            Keep responses focused and avoid unnecessary elaboration.
            """,
            arguments=KernelArguments(request_settings)
        )

    async def _call_single_agent(self, agent: ChatCompletionAgent, message: str) -> str:
        """Call a single agent with a message and return the response."""
        try:
            # Get response from the agent using invoke_stream
            responses = []
            async for response in agent.invoke_stream(message):
                if hasattr(response, 'content'):
                    responses.append(str(response.content))
                else:
                    responses.append(str(response))
            
            # Join all responses
            return "\n".join(responses) if responses else "No response"
                
        except Exception as e:
            self.logger.error(f"Error calling agent {agent.name}: {e}")
            return f"[Agent Error] {agent.name}: {e}"

    async def call_agent(self, user_input: str) -> str:
        """Main conversational entry point - handles one turn at a time."""
        try:
            self.logger.info(f"Processing conversational input in phase: {self.conversation_state['current_phase']}")
            
            # Add user input to conversation history
            self.conversation_state["conversation_history"].append({
                "role": "user",
                "content": user_input,
                "timestamp": "now"
            })
            
            # Route to appropriate phase handler
            if self.conversation_state["current_phase"] == "initial":
                response = await self._handle_initial_phase(user_input)
            elif self.conversation_state["current_phase"] == "extraction":
                response = await self._handle_extraction_phase(user_input)
            elif self.conversation_state["current_phase"] == "classification":
                response = await self._handle_classification_phase(user_input)
            elif self.conversation_state["current_phase"] == "routing":
                response = await self._handle_routing_phase(user_input)
            elif self.conversation_state["current_phase"] == "complete":
                response = "Thank you! Your legal intake has been completed. Our team will contact you soon with next steps."
            else:
                response = "I apologize, but there seems to be an issue with our intake process. Let me restart your session."
                self._reset_conversation()
            
            # Add agent response to conversation history
            self.conversation_state["conversation_history"].append({
                "role": "assistant", 
                "content": response,
                "timestamp": "now"
            })
            
            return response
            
        except Exception as e:
            self.logger.error("[LegalAgent call_agent Error]")
            self.logger.error(f"Type: {type(e).__name__}")
            self.logger.error(f"Message: {e}")
            self.logger.error("Traceback:")
            self.logger.error(traceback.format_exc())
            return f"I apologize, but I encountered an error. Please let me know if you'd like to restart your intake: {e}"

    async def _handle_initial_phase(self, user_input: str) -> str:
        """Handle the initial client assessment phase."""
        self.logger.info("Handling initial phase - client welcome and domain identification")
        
        # Use orchestration agent for initial assessment
        context = f"""
        This is the start of a legal intake conversation. The client has said: "{user_input}"
        
        You need to:
        1. Welcome them professionally with empathy
        2. Explain confidentiality and the intake process
        3. Identify the likely legal domain from their initial description
        4. Set expectations for the information gathering phase
        5. Ask them if they're ready to proceed with detailed information gathering
        
        Be conversational and supportive. This is just the beginning of the intake process.
        """
        
        response = await self._call_single_agent(self.orchestration_agent, context)
        
        # Try to identify domain from initial input
        domain_indicators = {
            "Employment & Labor Law": ["job", "work", "employer", "fired", "termination", "harassment", "discrimination", "workplace"],
            "Insurance Claims": ["accident", "injury", "medical", "insurance", "crash", "hurt", "hospital", "treatment"],
            "Real Estate & Property": ["landlord", "tenant", "rent", "eviction", "property", "lease", "house", "apartment"]
        }
        
        user_input_lower = user_input.lower()
        for domain, keywords in domain_indicators.items():
            if any(keyword in user_input_lower for keyword in keywords):
                self.conversation_state["domain_identified"] = domain
                break
        
        # Move to extraction phase
        self.conversation_state["current_phase"] = "extraction"
        
        return response

    async def _handle_extraction_phase(self, user_input: str) -> str:
        """Handle the entity extraction phase with grouped collection."""
        self.logger.info("Handling extraction phase - gathering required entities")
        
        domain = self.conversation_state.get("domain_identified", "Unknown")
        current_entities = self.conversation_state.get("extracted_entities", {})
        
        # ALWAYS extract entities from current user input first
        await self._update_entities_from_response(user_input, domain)
        
        # Get updated entities after extraction
        current_entities = self.conversation_state.get("extracted_entities", {})
        
        # Determine which entity groups are still missing
        missing_groups = self._get_missing_entity_groups(domain, current_entities)
        
        context = f"""
        Legal intake for {domain} case.
        
        ENTITIES COLLECTED: {json.dumps(current_entities, indent=2) if current_entities else "None"}
        
        CLIENT RESPONSE: "{user_input}"
        
        MISSING GROUPS: {missing_groups}
        
        TASK:
        1. Extract entities from client response
        2. Ask for next missing group if incomplete
        3. When all groups collected: "EXTRACTION COMPLETE: {{json_object}}"
        
        Ask for complete groups together, not individual entities.
        """
        
        response = await self._call_single_agent(self.extraction_agent, context)
        
        # Check completion criteria - use more sophisticated logic
        required_entities_count = self._get_required_entity_count(domain)
        current_entities_count = len(current_entities)
        
        self.logger.info(f"Current entities: {current_entities_count}, Required: {required_entities_count}")
        self.logger.info(f"Missing groups: {missing_groups}")
        
        # Check if extraction should be complete based on multiple criteria
        extraction_complete = (
            "EXTRACTION COMPLETE" in response or 
            missing_groups == "All groups collected" or
            (current_entities_count >= required_entities_count and 
             self._has_critical_entities_for_domain(domain, current_entities))
        )
        
        if extraction_complete:
            try:
                json_start = response.find("{")
                json_end = response.rfind("}") + 1
                if json_start != -1 and json_end > json_start:
                    entities_json = response[json_start:json_end]
                    # Clean up the JSON string to handle control characters and formatting issues
                    entities_json = entities_json.replace('\n', ' ').replace('\r', ' ')
                    # Remove extra whitespace
                    entities_json = ' '.join(entities_json.split())
                    try:
                        parsed_entities = json.loads(entities_json)
                        # Merge with existing entities
                        self.conversation_state["extracted_entities"].update(parsed_entities)
                    except json.JSONDecodeError:
                        self.logger.warning("JSON parsing failed, using manually extracted entities")
                        
                # Save entities to file
                saved_file = self._save_entities_to_file()
                if saved_file:
                    self.logger.info(f"Extracted entities saved to: {saved_file}")
                
                self.conversation_state["current_phase"] = "classification"
                response += "\n\nAnalyzing your case now..."
                self.logger.info(f"Extraction completed with {len(self.conversation_state['extracted_entities'])} entities")
            except Exception as e:
                self.logger.warning(f"Could not parse extracted entities: {e}")
                # Even if JSON parsing fails, if extraction is complete, move to classification
                # Use the currently collected entities from the conversation
                
                # Save entities to file even if JSON parsing failed
                saved_file = self._save_entities_to_file()
                if saved_file:
                    self.logger.info(f"Extracted entities saved to: {saved_file}")
                
                self.logger.info("Moving to classification phase despite JSON parsing error")
                self.conversation_state["current_phase"] = "classification"
                response += "\n\nAnalyzing your case now..."
        
        return response

    async def _handle_classification_phase(self, user_input: str) -> str:
        """Handle the classification and assessment phase."""
        self.logger.info("Handling classification phase - analyzing case domain and urgency")
        
        # IMPORTANT: Extract entities from this final user input before classification
        domain = self.conversation_state.get("domain_identified", "Unknown")
        await self._update_entities_from_response(user_input, domain)
        
        # Get the updated entities after final extraction
        entities = self.conversation_state.get("extracted_entities", {})
        
        # Re-save entities with any final updates
        saved_file = self._save_entities_to_file()
        if saved_file:
            self.logger.info(f"Final entities saved to: {saved_file}")
        
        context = f"""
        Analyze this completed legal case intake:
        
        EXTRACTED ENTITIES:
        {json.dumps(entities, indent=2)}
        
        CONVERSATION CONTEXT:
        The client has just finished providing all required information for their case.
        
        Your task:
        1. Classify the domain with confidence score
        2. Assess urgency level (Critical/High/Medium/Low)
        3. Evaluate case value and complexity
        4. Provide reasoning for your assessments
        5. When complete, respond with "CLASSIFICATION COMPLETE" followed by your analysis
        
        Be thorough but conversational in explaining your assessment to the client.
        """
        
        response = await self._call_single_agent(self.classification_agent, context)
        
        # Automatically move to routing phase after classification
        self.logger.info("Classification completed, moving to routing phase")
        self.conversation_state["classification_result"] = response
        self.conversation_state["current_phase"] = "routing"
        
        # Add transition message and immediately proceed to final report
        response += "\n\nBased on my analysis, let me now provide you with the next steps and connect you with the right legal team...\n\n"
        
        # Generate the final report immediately
        final_report = await self._generate_final_report()
        
        # Mark conversation as complete
        self.conversation_state["current_phase"] = "complete"
        
        return response + final_report

    async def _handle_routing_phase(self, user_input: str) -> str:
        """Handle the final routing and recommendations phase."""
        self.logger.info("Handling routing phase - providing final recommendations")
        
        # Generate comprehensive final report
        final_report = await self._generate_final_report()
        
        # Mark conversation as complete
        self.conversation_state["current_phase"] = "complete"
        
        return final_report

    async def _generate_final_report(self) -> str:
        """Generate the comprehensive final intake report."""
        self.logger.info("Generating final legal intake report")
        
        conversation_summary = "\n".join([
            f"{msg['role'].title()}: {msg['content'][:100]}..." 
            for msg in self.conversation_state["conversation_history"][:3]
        ])
        
        entities = self.conversation_state.get("extracted_entities", {})
        classification = self.conversation_state.get("classification_result", "No classification completed")
        
        context = f"""
        Generate a comprehensive final legal intake report based on this completed conversation:
        
        CONVERSATION SUMMARY:
        {conversation_summary}
        
        EXTRACTED ENTITIES:
        {json.dumps(entities, indent=2)}
        
        CLASSIFICATION RESULTS:
        {classification}
        
        Create a professional final report with:
        - Executive Summary
        - Client Information
        - Case Details
        - Legal Assessment
        - Recommended Team Assignment
        - Immediate Next Steps
        - Special Considerations
        
        This is the final deliverable that will be sent to the legal team.
        """
        
        return await self._call_single_agent(self.orchestration_agent, context)

    def _get_required_entity_count(self, domain: str) -> int:
        """Get the minimum required entity count for a domain."""
        if domain == "Employment & Labor Law":
            return 7  # Personal (4) + Employment (3) + some incident details
        elif domain == "Insurance Claims":
            return 7  # Personal (4) + Incident (3) + some financial details
        elif domain == "Real Estate & Property":
            return 7  # Personal (4) + Property (3) + some timeline details
        else:
            return 6  # Generic minimum

    def _has_critical_entities_for_domain(self, domain: str, entities: dict) -> bool:
        """Check if we have the critical entities needed for a domain."""
        if domain == "Employment & Labor Law":
            critical_entities = ["full_name", "employer_name", "violation_type"]
            return all(entity in entities for entity in critical_entities)
        elif domain == "Insurance Claims":
            critical_entities = ["full_name", "incident_date", "injury_type"]
            return all(entity in entities for entity in critical_entities)
        elif domain == "Real Estate & Property":
            critical_entities = ["full_name", "property_address", "transaction_type"]
            return all(entity in entities for entity in critical_entities)
        else:
            return len(entities) >= 4  # At least personal info

    def _save_entities_to_file(self) -> Optional[str]:
        """Save extracted entities to a JSON file in the results folder."""
        try:
            # Create results directory if it doesn't exist
            results_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "results")
            os.makedirs(results_dir, exist_ok=True)
            
            # Generate filename with timestamp and client name
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            client_name = self.conversation_state.get("extracted_entities", {}).get("full_name", "unknown_client")
            # Clean client name for filename (remove spaces and special characters)
            client_name = "".join(c for c in client_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
            client_name = client_name.replace(' ', '_')
            
            filename = f"legal_intake_{client_name}_{timestamp}.json"
            filepath = os.path.join(results_dir, filename)
            
            # Prepare data to save
            save_data = {
                "timestamp": datetime.now().isoformat(),
                "case_info": {
                    "domain": self.conversation_state.get("domain_identified"),
                    "phase": self.conversation_state.get("current_phase"),
                    "total_conversation_turns": len(self.conversation_state.get("conversation_history", []))
                },
                "extracted_entities": self.conversation_state.get("extracted_entities", {}),
                "classification_result": self.conversation_state.get("classification_result", ""),
                "conversation_summary": {
                    "total_messages": len(self.conversation_state.get("conversation_history", [])),
                    "entities_count": len(self.conversation_state.get("extracted_entities", {}))
                }
            }
            
            # Save to file
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(save_data, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"Entities saved successfully to: {filepath}")
            return filepath
            
        except Exception as e:
            self.logger.error(f"Failed to save entities to file: {e}")
            return None

    def _get_required_entities_for_domain(self, domain: str) -> str:
        """Get the required entities list for a specific domain."""
        if domain == "Employment & Labor Law":
            return """
            Personal Information: full_name, contact_number, email, address
            Employment Details: employer_name, employment_dates, violation_type, damages, witnesses
            Incident Details: termination (boolean), harassment (boolean)
            """
        elif domain == "Insurance Claims":
            return """
            Personal Information: full_name, contact_number, email, address
            Incident Details: incident_date, injury_type, medical_treatment, insurance_details
            Parties & Costs: liable_parties, medical_costs, lost_wages
            """
        elif domain == "Real Estate & Property":
            return """
            Personal Information: full_name, contact_number, email, address
            Property Details: property_address, transaction_type, parties_involved
            Timeline & Terms: timeline, contract_terms, closing_deadlines, eviction (boolean)
            """
        else:
            return "Unable to determine required entities - domain not identified"

    def _reset_conversation(self):
        """Reset the conversation state for a new intake."""
        self.conversation_state = {
            "current_phase": "initial",
            "extracted_entities": {},
            "classification_result": {},
            "conversation_history": [],
            "client_data": {},
            "domain_identified": None
        }

    def get_conversation_state(self) -> dict:
        """Get the current conversation state (for debugging/monitoring)."""
        return self.conversation_state.copy()

    def reset_intake(self) -> str:
        """Reset the intake process."""
        self._reset_conversation()
        return "Your legal intake has been reset. Please tell me about your legal situation, and I'll help guide you through our intake process."

    def _get_missing_entity_groups(self, domain: str, current_entities: dict) -> str:
        """Determine which entity groups are missing for the domain."""
        if domain == "Employment & Labor Law":
            groups = {
                "Personal": ["full_name", "contact_number", "email", "address"],
                "Employment": ["employer_name", "employment_dates", "violation_type"],
                "Incident": ["termination", "harassment", "damages", "witnesses"]
            }
        elif domain == "Insurance Claims":
            groups = {
                "Personal": ["full_name", "contact_number", "email", "address"],
                "Incident": ["incident_date", "injury_type", "medical_treatment"],
                "Financial": ["insurance_details", "liable_parties", "medical_costs", "lost_wages"]
            }
        elif domain == "Real Estate & Property":
            groups = {
                "Personal": ["full_name", "contact_number", "email", "address"],
                "Property": ["property_address", "transaction_type", "parties_involved"],
                "Timeline": ["timeline", "contract_terms", "closing_deadlines", "eviction"]
            }
        else:
            return "Unknown domain"
        
        missing_groups = []
        for group_name, entities in groups.items():
            if not all(entity in current_entities for entity in entities):
                missing_groups.append(f"{group_name}: {', '.join(entities)}")
        
        return "; ".join(missing_groups) if missing_groups else "All groups collected"

    async def _update_entities_from_response(self, user_input: str, domain: str):
        """Extract and update entities from user response using improved patterns."""
        entities = self.conversation_state.get("extracted_entities", {})
        
        # Use improved regex patterns
        import re
        
        # Email pattern
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', user_input)
        if email_match and "email" not in entities:
            entities["email"] = email_match.group()
        
        # Phone pattern (improved to catch various formats)
        phone_patterns = [
            r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',  # 555-123-4567 or 5551234567
            r'\b\d{3}-\d{4}\b',  # 555-0123
            r'phone.*?(\d{3}[-.]?\d{3}[-.]?\d{4})',  # "phone is 555-123-4567"
            r'phone.*?(\d{3}-\d{4})'  # "phone is 555-0123"
        ]
        if "contact_number" not in entities:
            for pattern in phone_patterns:
                phone_match = re.search(pattern, user_input)
                if phone_match:
                    if phone_match.groups():
                        entities["contact_number"] = phone_match.group(1)
                    else:
                        entities["contact_number"] = phone_match.group()
                    break
        
        # Improved name patterns
        name_patterns = [
            r'my name is ([A-Za-z\s]+)',  # "My name is John Doe"
            r"I'?m ([A-Za-z\s]+),",  # "I'm John Doe,"
            r"I'?m ([A-Za-z\s]+)\.",  # "I'm John Doe."
            r"I'?m ([A-Za-z\s]+)\s+(?:and|[A-Z])",  # "I'm John Doe and..." or "I'm John Doe My email..."
        ]
        if "full_name" not in entities:
            for pattern in name_patterns:
                name_match = re.search(pattern, user_input, re.IGNORECASE)
                if name_match:
                    name = name_match.group(1).strip()
                    # Filter out common words that aren't names
                    if len(name.split()) >= 2 and not any(word.lower() in ['owner', 'of', 'the', 'my', 'email'] for word in name.split()):
                        entities["full_name"] = name
                        break
        
        # Improved address patterns
        address_patterns = [
            r'live at ([^.]+\d{5})',  # "I live at 123 Main St, City, State 12345"
            r'address[^a-zA-Z]+([^.]+\d{5})',  # "My address is 123 Main St..."
            r'located at ([^.]+\d{5})',  # "My business is located at..."
            r'\bat (\d+[^.]+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Way|Boulevard|Blvd)[^.]*\d{5})',
        ]
        if "address" not in entities:
            for pattern in address_patterns:
                address_match = re.search(pattern, user_input, re.IGNORECASE)
                if address_match:
                    entities["address"] = address_match.group(1).strip()
                    break
        
        # Domain-specific entity extraction
        if domain == "Employment & Labor Law":
            self._extract_employment_entities(user_input, entities)
        elif domain == "Insurance Claims":
            self._extract_insurance_entities(user_input, entities)
        elif domain == "Real Estate & Property":
            self._extract_real_estate_entities(user_input, entities)
        
        self.conversation_state["extracted_entities"] = entities
        self.logger.info(f"Updated entities: {list(entities.keys())}")

    def _extract_employment_entities(self, user_input: str, entities: dict):
        """Extract employment-specific entities."""
        import re
        
        # Employer name patterns
        if "employer_name" not in entities:
            employer_patterns = [
                r'(?:at|for|with) ([A-Za-z]+(?:\s[A-Za-z]+)*?)(?:\s+(?:as|for|from|in|\.|,|$))',
                r'(?:work|worked|employed) (?:at|for|with) ([A-Za-z]+(?:\s[A-Za-z]+)*?)(?:\s+(?:as|for|from|in|\.|,|$))',
                r'my employer (?:is|was) ([A-Za-z]+(?:\s[A-Za-z]+)*?)(?:\s|$|\.|,)',
                r'company (?:is|was) ([A-Za-z]+(?:\s[A-Za-z]+)*?)(?:\s|$|\.|,)'
            ]
            for pattern in employer_patterns:
                employer_match = re.search(pattern, user_input, re.IGNORECASE)
                if employer_match:
                    employer_name = employer_match.group(1).strip()
                    if len(employer_name) > 1 and employer_name.lower() not in ["a", "the", "and", "for", "my", "job"]:
                        entities["employer_name"] = employer_name
                        break
        
        # Enhanced employment dates - capture full range
        if "employment_dates" not in entities:
            date_patterns = [
                r'from ([A-Za-z]+ \d{4}) (?:to|until) ([A-Za-z]+ \d{1,2}(?:st|nd|rd|th)?, \d{4})',
                r'from ([A-Za-z]+ \d{4}) (?:to|until) ([A-Za-z]+ \d{4})',
                r'([A-Za-z]+ \d{4}) (?:to|until|-)? ?([A-Za-z]+ \d{1,2}(?:st|nd|rd|th)?, \d{4})',
                r'([A-Za-z]+ \d{4}) (?:to|until|-)? ?([A-Za-z]+ \d{4})',
                r'(?:since|from) ([A-Za-z]+ \d{4})',
                r'for (\d+) years?'
            ]
            for pattern in date_patterns:
                date_match = re.search(pattern, user_input, re.IGNORECASE)
                if date_match:
                    if date_match.groups() and len(date_match.groups()) > 1:
                        entities["employment_dates"] = f"{date_match.group(1)} to {date_match.group(2)}"
                    else:
                        entities["employment_dates"] = date_match.group(1).strip()
                    break
        
        # Violation type
        if "violation_type" not in entities:
            violations = []
            if re.search(r'wrongful\s+termination', user_input, re.IGNORECASE):
                violations.append("wrongful termination")
            if re.search(r'sexual\s+harassment|harassment', user_input, re.IGNORECASE):
                violations.append("harassment")
            if re.search(r'discrimination', user_input, re.IGNORECASE):
                violations.append("discrimination")
            if violations:
                entities["violation_type"] = " and ".join(violations)
        
        # Boolean flags for termination and harassment
        if "termination" not in entities:
            termination_indicators = ['terminated', 'fired', 'wrongful termination', 'let go', 'dismissed']
            if any(indicator in user_input.lower() for indicator in termination_indicators):
                entities["termination"] = True
        
        if "harassment" not in entities:
            harassment_indicators = ['harassment', 'harassed', 'inappropriate comments', 'unwanted touching']
            if any(indicator in user_input.lower() for indicator in harassment_indicators):
                entities["harassment"] = True
        
        # Witnesses extraction
        if "witnesses" not in entities:
            witness_patterns = [
                r'witnesses?[^.]*?([A-Z][a-z]+ [A-Z][a-z]+(?:,? (?:and )?[A-Z][a-z]+ [A-Z][a-z]+)*)',
                r'colleague[s]?[^.]*?([A-Z][a-z]+ [A-Z][a-z]+(?:,? (?:and )?[A-Z][a-z]+ [A-Z][a-z]+)*)',
                r'(?:saw|witnessed)[^.]*?([A-Z][a-z]+ [A-Z][a-z]+(?:,? (?:and )?[A-Z][a-z]+ [A-Z][a-z]+)*)',
                r'([A-Z][a-z]+ [A-Z][a-z]+(?:,? (?:and )?[A-Z][a-z]+ [A-Z][a-z]+)*)[^.]*?(?:saw|witnessed)',
            ]
            for pattern in witness_patterns:
                witness_match = re.search(pattern, user_input, re.IGNORECASE)
                if witness_match:
                    witnesses = witness_match.group(1).strip()
                    # Clean up the witnesses string
                    witnesses = re.sub(r'\s+', ' ', witnesses)
                    entities["witnesses"] = witnesses
                    break
        
        # Damages extraction
        if "damages" not in entities:
            damage_patterns = [
                r'seeking \$?([\d,]+)[^.]*?(?:damages|lost wages|emotional distress)',
                r'\$?([\d,]+)[^.]*?(?:damages|compensation|lost wages)',
                r'(?:damages|compensation)[^.]*?\$?([\d,]+)',
                r'(\$[\d,]+)[^.]*?(?:for|in) (?:damages|lost wages|emotional distress)'
            ]
            damage_context = []
            for pattern in damage_patterns:
                damage_match = re.search(pattern, user_input, re.IGNORECASE)
                if damage_match:
                    amount = damage_match.group(1)
                    if 'lost wages' in user_input.lower():
                        damage_context.append('lost wages')
                    if 'emotional distress' in user_input.lower():
                        damage_context.append('emotional distress')
                    if 'punitive' in user_input.lower():
                        damage_context.append('punitive damages')
                    
                    if not amount.startswith('$'):
                        amount = '$' + amount
                    
                    if damage_context:
                        entities["damages"] = f"{amount} for {', '.join(damage_context)}"
                    else:
                        entities["damages"] = amount
                    break

    def _extract_insurance_entities(self, user_input: str, entities: dict):
        """Extract insurance-specific entities."""
        import re
        
        # Incident date
        if "incident_date" not in entities:
            date_patterns = [
                r'(?:on|happened on) ([A-Za-z]+ \d{1,2}(?:st|nd|rd|th)?, \d{4})',
                r'([A-Za-z]+ \d{1,2}(?:st|nd|rd|th)?, \d{4})',
                r'(\d{1,2}/\d{1,2}/\d{4})',
                r'(\d+ (?:weeks?|days?) ago)'
            ]
            for pattern in date_patterns:
                date_match = re.search(pattern, user_input, re.IGNORECASE)
                if date_match:
                    entities["incident_date"] = date_match.group(1).strip()
                    break
        
        # Enhanced injury type extraction
        if "injury_type" not in entities:
            injury_patterns = [
                r'(?:suffered|sustained|have) (?:a )?([^.]+?)(?:\.|and I|$)',
                r'(?:injuries?|hurt|injured) (?:include )?([^.]+?)(?:\.|$)',
                r'broken ([^.,]+)|concussion|whiplash|fracture|sprain|torn|bleeding'
            ]
            injuries = []
            for pattern in injury_patterns:
                injury_matches = re.finditer(pattern, user_input, re.IGNORECASE)
                for match in injury_matches:
                    injury = match.group(1) if match.groups() else match.group(0)
                    if injury and len(injury.strip()) > 2:
                        injuries.append(injury.strip())
            
            if injuries:
                # Remove duplicates and join
                unique_injuries = list(dict.fromkeys(injuries))
                entities["injury_type"] = ", ".join(unique_injuries)
        
        # Enhanced medical treatment
        if "medical_treatment" not in entities:
            treatment_patterns = [
                r'(?:treatment at|getting treatment at) ([^.]+?)(?:\.|and|$)',
                r'(?:seeing|visited) ([^.]+?)(?:\.|and|for|$)',
                r'(?:hospital|doctor|therapy|physical therapy)[^.]*?([A-Z][^.]+?)(?:\.|and|$)'
            ]
            treatments = []
            for pattern in treatment_patterns:
                treatment_match = re.search(pattern, user_input, re.IGNORECASE)
                if treatment_match:
                    treatment = treatment_match.group(1).strip()
                    if len(treatment) > 3 and treatment.lower() not in ['a', 'the', 'and']:
                        treatments.append(treatment)
            
            if treatments:
                entities["medical_treatment"] = ", ".join(set(treatments))
        
        # Insurance details extraction
        if "insurance_details" not in entities:
            insurance_patterns = [
                r'(?:insurance (?:is )?with|insured (?:by|with)) ([^,]+?)(?:,|\.|\s+policy)',
                r'policy number ([A-Z0-9-]+)',
                r'([A-Z][a-z]+ [A-Z][a-z]+) insurance',
                r'insurance[^.]*?([A-Z][a-z]+ [A-Z][a-z]+)'
            ]
            insurance_info = []
            for pattern in insurance_patterns:
                insurance_match = re.search(pattern, user_input, re.IGNORECASE)
                if insurance_match:
                    info = insurance_match.group(1).strip()
                    if len(info) > 2:
                        insurance_info.append(info)
            
            if insurance_info:
                entities["insurance_details"] = " ".join(set(insurance_info))
        
        # Liable parties extraction
        if "liable_parties" not in entities:
            liable_patterns = [
                r'(?:other driver (?:was|is)) ([A-Z][a-z]+ [A-Z][a-z]+)',
                r'([A-Z][a-z]+ [A-Z][a-z]+)[^.]*?(?:insured by|insurance)',
                r'(?:caused by|fault of) ([A-Z][a-z]+ [A-Z][a-z]+)',
                r'driver ([A-Z][a-z]+ [A-Z][a-z]+)'
            ]
            liable_info = []
            for pattern in liable_patterns:
                liable_match = re.search(pattern, user_input, re.IGNORECASE)
                if liable_match:
                    liable = liable_match.group(1).strip()
                    liable_info.append(liable)
            
            # Also look for insurance company of liable party
            if 'geico' in user_input.lower():
                liable_info.append('(Geico insurance)')
            elif 'state farm' in user_input.lower():
                liable_info.append('(State Farm insurance)')
            
            if liable_info:
                entities["liable_parties"] = " ".join(liable_info)
        
        # Medical costs extraction
        if "medical_costs" not in entities:
            cost_patterns = [
                r'medical bills[^.]*?\$?([\d,]+)',
                r'\$?([\d,]+)[^.]*?(?:medical|bills)',
                r'(?:costs?|bills?)[^.]*?\$?([\d,]+)',
                r'over \$?([\d,]+)'
            ]
            for pattern in cost_patterns:
                cost_match = re.search(pattern, user_input, re.IGNORECASE)
                if cost_match:
                    amount = cost_match.group(1)
                    if not amount.startswith('$'):
                        amount = '$' + amount
                    entities["medical_costs"] = amount
                    break
        
        # Lost wages extraction
        if "lost_wages" not in entities:
            wage_patterns = [
                r'(\d+) weeks[^.]*?work[^.]*?\$?([\d,]+)',
                r'\$?([\d,]+)[^.]*?(?:lost wages|missed work)',
                r'(?:losing|lost)[^.]*?\$?([\d,]+)[^.]*?(?:wages|work)',
                r'missed[^.]*?(\d+)[^.]*?weeks[^.]*?work'
            ]
            for pattern in wage_patterns:
                wage_match = re.search(pattern, user_input, re.IGNORECASE)
                if wage_match:
                    groups = wage_match.groups()
                    if len(groups) >= 2:
                        weeks = groups[0]
                        amount = groups[1]
                        if not amount.startswith('$'):
                            amount = '$' + amount
                        entities["lost_wages"] = f"{amount} ({weeks} weeks missed work)"
                    elif len(groups) >= 1:
                        amount = groups[0]
                        if not amount.startswith('$'):
                            amount = '$' + amount
                        entities["lost_wages"] = amount
                    break

    def _extract_real_estate_entities(self, user_input: str, entities: dict):
        """Extract real estate-specific entities."""
        import re
        
        # Property address
        if "property_address" not in entities:
            property_patterns = [
                r'property (?:is )?(?:at )?([^.]+?)(?:\.|$)',
                r'(?:located at|address is) ([^.]+?)(?:\.|$)',
                r'(?:restaurant|business|space) (?:is )?(?:at )?([^.]+?)(?:\.|$)'
            ]
            for pattern in property_patterns:
                prop_match = re.search(pattern, user_input, re.IGNORECASE)
                if prop_match:
                    address = prop_match.group(1).strip()
                    if any(char.isdigit() for char in address):  # Must contain numbers
                        entities["property_address"] = address
                        break
        
        # Transaction type
        if "transaction_type" not in entities:
            if re.search(r'lease|rent|rental', user_input, re.IGNORECASE):
                if re.search(r'commercial', user_input, re.IGNORECASE):
                    entities["transaction_type"] = "Commercial lease"
                else:
                    entities["transaction_type"] = "Lease"
            elif re.search(r'buy|purchase|sale|sell', user_input, re.IGNORECASE):
                entities["transaction_type"] = "Purchase/Sale"
        
        # Enhanced parties involved extraction
        if "parties_involved" not in entities:
            parties = []
            
            # Extract landlord/property management
            landlord_patterns = [
                r'landlord (?:is )?([^,]+?)(?:,|\.|and|$)',
                r'(?:property management|management) (?:is )?([^,]+?)(?:,|\.|and|$)',
                r'([A-Z][a-z]+ Properties)',
                r'contact[^.]*?([A-Z][a-z]+ [A-Z][a-z]+)'
            ]
            for pattern in landlord_patterns:
                landlord_match = re.search(pattern, user_input, re.IGNORECASE)
                if landlord_match:
                    landlord = landlord_match.group(1).strip()
                    if len(landlord) > 2:
                        parties.append(f"{landlord} (landlord)")
            
            # Extract tenant info from context
            if "full_name" in entities:
                parties.append(f"{entities['full_name']} (tenant)")
            
            # Extract other parties (competitors, etc.)
            other_patterns = [
                r'(?:other party|chain restaurant|competitor)[^.]*?([^.]+?)(?:\.|$)',
                r'trying to get[^.]*?([^.]+?)(?:\.|$)'
            ]
            for pattern in other_patterns:
                other_match = re.search(pattern, user_input, re.IGNORECASE)
                if other_match:
                    other = other_match.group(1).strip()
                    if len(other) > 5:
                        parties.append(other)
            
            if parties:
                entities["parties_involved"] = ", ".join(parties)
        
        # Enhanced timeline extraction
        if "timeline" not in entities:
            timeline_patterns = [
                r'(\d+-year[^.]*?lease)[^.]*?(?:started|from) ([A-Za-z]+ \d{4})',
                r'lease[^.]*?(?:started|from) ([A-Za-z]+ \d{4})[^.]*?(?:to|until) ([A-Za-z]+ \d{4})',
                r'(\d+) (?:more )?years?[^.]*?(?:runs until|to) ([A-Za-z]+ \d{4})',
                r'lease runs until ([A-Za-z]+ \d{4})'
            ]
            for pattern in timeline_patterns:
                timeline_match = re.search(pattern, user_input, re.IGNORECASE)
                if timeline_match:
                    groups = timeline_match.groups()
                    if len(groups) >= 2:
                        entities["timeline"] = f"{groups[0]} to {groups[1]}"
                    elif len(groups) >= 1:
                        entities["timeline"] = groups[0]
                    break
        
        # Contract terms extraction
        if "contract_terms" not in entities:
            terms = []
            
            # Extract permitted use
            if re.search(r'operate (?:a )?restaurant', user_input, re.IGNORECASE):
                terms.append("Restaurant operation permitted")
            
            # Extract disputed clauses
            if re.search(r'no (?:such )?clause|no competing businesses', user_input, re.IGNORECASE):
                terms.append("no competing businesses clause disputed")
            
            # Extract lease violations
            if re.search(r'violated the lease|lease violation', user_input, re.IGNORECASE):
                terms.append("lease violation claimed")
            
            if terms:
                entities["contract_terms"] = ", ".join(terms)
        
        # Closing deadlines / eviction notice extraction
        if "closing_deadlines" not in entities:
            deadline_patterns = [
                r'(\d+ days?)[^.]*?(?:to vacate|eviction|notice)',
                r'eviction notice[^.]*?(\d+ days?)',
                r'giving me (\d+ days?)',
                r'notice[^.]*?(\d+ days?)'
            ]
            for pattern in deadline_patterns:
                deadline_match = re.search(pattern, user_input, re.IGNORECASE)
                if deadline_match:
                    entities["closing_deadlines"] = f"{deadline_match.group(1)} eviction notice"
                    break
        
        # Eviction indicator
        if "eviction" not in entities and re.search(r'evict|eviction', user_input, re.IGNORECASE):
            entities["eviction"] = True