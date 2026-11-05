---
name: playbook-analysis-12
title: "Draft an OpenAPI file to document request and response bodies for a specific endpoint."
type: prompt
category: "Prompt Playbook"
subcategory: "Analysis & Planning"
stage: "Analysis"
author: harsh.rana@maqsoftware.com
source: "Azure BI & Data Engineering Playbook"
source_url: "https://aisdlcplaybook.azurewebsites.net/prompt-library"
tags: ["azure-bi", "playbook", "prompt", "analysis", "security"]
description: "openapi: 3.0.3 info:   title: E-Commerce Order API   description: API for managing customer orders   version: 1.0.0  servers:   - url: https://api.example.com/v1     description: Production server  paths:   /orders:     post:       summary: Create a new order       description: Creates an order for a user       security:         - bearerAuth: []       requestBody:         required: true         content:           application/json:             schema:               $ref: '#/components/schemas/OrderRequest'             example:               user_id: \"12345\"               items:                 - product_id: \"P987\"                   quantity: 2               total_amount: 1500        responses:         '201':           description: Order created successfully           content:             application/json:               schema:                 $ref: '#/components/schemas/OrderResponse'               example:                 order_id: \"ORD123\"                 status: \"created\"                 total_amount: 1500          '400':           description: Bad request           content:             application/json:               schema:                 $ref: '#/components/schemas/ErrorResponse'               example:                 error_code: \"400\"                 error_message: \"Invalid input\"          '500':           description: Server error           content:             application/json:               schema:                 $ref: '#/components/schemas/ErrorResponse'  components:   schemas:     OrderRequest:       type: object       required:         - user_id         - items       properties:         user_id:           type: string         items:           type: array           items:             type: object             properties:               product_id:                 type: string               quantity:                 type: integer         total_amount:           type: number      OrderResponse:       type: object       properties:         order_id:           type: string         status:           type: string         total_amount:           type: number      ErrorResponse:       type: object       properties:         error_code:           type: string         error_message:           type: string    securitySchemes:     bearerAuth:       type: http       scheme: bearer       bearerFormat: JWT"
---

# Draft an OpenAPI file to document request and response bodies for a specific endpoint.

You are a senior backend engineer and API architect specializing in RESTful API design and OpenAPI specifications.

Task:
Draft a complete OpenAPI (Swagger) specification file documenting request and response bodies for a given API endpoint.

System Context:
**Provide API name, domain, and purpose of the API**
**Provide base URL / server information (e.g., dev, staging, prod)**

Endpoint Details:
• Endpoint path: **/api/v1/{resource}**
• HTTP method: **GET / POST / PUT / DELETE**
• Description: **Describe what this endpoint does**
• Version: **v1 / v2**

Requirements:

1. **OpenAPI Structure**
• Use OpenAPI version 3.x
• Include info section (title, description, version)
• Define servers (dev, staging, production if applicable)
• Organize paths and components properly

2. **Request Definition**
• Define path parameters:
• **parameter_name (type, required, description)**
• Define query parameters:
• **parameter_name (type, required/optional, description)**
• Define headers (if applicable):
• Authorization, Content-Type, etc.

Request Body:
• Content type: application/json
• Schema definition with:
• **field_name (type, required, description)**
• **nested objects / arrays if applicable**
• Include example payload

3. **Response Definition**
Define multiple response scenarios:

• 200 / 201 Success Response:
• Schema with fields:
• **field_name (type, description)**
• Example response

• 4xx Client Error Response:
• error_code
• error_message
• validation_errors (if applicable)

• 5xx Server Error Response:
• error_code
• error_message

4. **Schema Components (Reusable Models)**
• Define reusable schemas under components:
• Request model
• Response model
• Error model
• Use proper data types (string, integer, boolean, array, object)
• Include format (date-time, email, uuid, etc.)

5. **Validation & Constraints**
• Required vs optional fields
• String length, enum values, patterns
• Numeric ranges
• Default values

6. **Security Definition**
• Authentication type: **Bearer Token / API Key / OAuth2**
• Define security schemes under components
• Apply security at endpoint level

7. **Best Practices**
• Follow RESTful naming conventions
• Keep schema consistent and reusable
• Include meaningful descriptions for all fields
• Avoid ambiguity in request/response structures
• Ensure backward compatibility for future versions

8. **Output Requirements**
• Complete OpenAPI YAML or JSON file
• Well-structured and ready for tools like Swagger UI
• Include at least one fully defined endpoint
• Include request, response, and error schemas
• Include example payloads

9. **Optional Custom Inputs**
• Authentication method: **Provide (e.g., JWT, OAuth2, API Key)**
• Pagination required: **Yes / No**
• Rate limiting details: **Provide limits (e.g., 100 req/min)**
• Versioning strategy: **URI / Header-based**

Constraints:
• Follow OpenAPI 3.x specification strictly
• Ensure schema is production-ready
• Avoid vague or incomplete definitions
• Maintain consistency across request and response models
• Support extensibility for future endpoints
