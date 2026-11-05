from pydantic import BaseModel
from typing import Optional, List


class PersonalDetails(BaseModel):
    full_name: Optional[str]
    contact_number: Optional[str]
    email: Optional[str]
    address: Optional[str]

class EmploymentLawEntities(PersonalDetails):
    employer_name: Optional[str]
    employment_dates: Optional[str]
    violation_type: Optional[str]
    damages: Optional[str]
    witnesses: Optional[List[str]]
    termination: Optional[bool]
    harassment: Optional[bool]


class InsuranceClaimEntities(PersonalDetails):
    incident_date: Optional[str]
    injury_type: Optional[str]
    medical_treatment: Optional[str]
    insurance_details: Optional[str]
    liable_parties: Optional[List[str]]
    medical_costs: Optional[str]
    lost_wages: Optional[str]


class RealEstateEntities(PersonalDetails):
    property_address: Optional[str]
    transaction_type: Optional[str]
    parties_involved: Optional[List[str]]
    timeline: Optional[str]
    contract_terms: Optional[str]
    closing_deadlines: Optional[str]
    eviction: Optional[bool]
