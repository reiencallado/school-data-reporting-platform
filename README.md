# School Data Reporting Platform

A full-stack school reporting platform for managing student data, generating documents, and streamlining institutional reporting workflows.

The system combines an Angular frontend, Spring Boot backend, PostgreSQL database, and asynchronous document-processing worker to support student management, reusable report templates, batch PDF generation, and report archiving.

## Overview

The platform is designed for school and academic operations where staff need to manage student and admissions records while generating standardized documents efficiently.

Instead of treating document generation as a simple frontend operation, the system uses a background processing workflow:

```text
Angular Frontend
       ↓
Spring Boot REST API
       ↓
PostgreSQL + Job Queue
       ↓
Node.js Report Worker
       ↓
PDF Generation
       ↓
S3-Compatible Storage
````

LocalStack is used to emulate AWS S3 and SQS services during local development.

## Core Features

* **Student & Admissions Management**

  * Manage student records and admissions data
  * View and organize institutional information

* **Role-Based Access**

  * Support for administrative and regular user roles
  * JWT-based authentication

* **Report Templates**

  * Create and reuse document templates
  * Populate templates with dynamic student and form data

* **PDF Generation**

  * Generate individual reports
  * Process large batches of documents asynchronously

* **Report Archiving**

  * Store generated documents in S3-compatible storage
  * Retrieve completed reports through the platform

* **REST API**

  * Structured API layer connecting the frontend with application services and persistence

## Architecture

The system is divided into three main services.

### Frontend

An Angular application providing the user interface for:

* Student and admissions management
* Report templates
* Document generation
* Report archives
* Dashboard workflows

### Backend

A Spring Boot REST API responsible for:

* Business logic
* Authentication and authorization
* Student and admissions data
* Database persistence
* Report generation requests
* Queueing background processing jobs

### Report Worker

A Node.js service responsible for asynchronous PDF generation.

The worker:

1. Receives report-generation jobs from SQS
2. Retrieves template configurations from S3
3. Generates PDFs using PDFMe
4. Uploads completed documents back to S3

For local development, these AWS services are simulated using LocalStack.

## Example Workflow

A typical batch report-generation workflow looks like:

```text
Staff selects students
        ↓
Report template is selected
        ↓
Frontend sends generation request
        ↓
Spring Boot API creates processing jobs
        ↓
Jobs are placed into SQS
        ↓
Node.js worker processes queued jobs
        ↓
PDF documents are generated
        ↓
Documents are stored in S3
        ↓
Generated reports become available in the archive
```

## Tech Stack

### Frontend

* Angular 21
* TypeScript
* RxJS
* HTML
* SCSS

### Backend

* Java 25
* Spring Boot 4
* Spring Web
* Spring Data JPA
* Spring Security
* JWT authentication
* PostgreSQL

### Document Processing

* Node.js
* Express
* PDFMe

### Infrastructure

* Docker
* PostgreSQL
* LocalStack
* AWS S3
* AWS SQS

## Project Structure

```text
school-data-reporting-platform/
├── backend/                     # Spring Boot API and database layer
│   ├── src/
│   ├── pom.xml
│   ├── docker-compose.yml
│   ├── init.sql
│   ├── mvnw
│   └── mvnw.cmd
│
├── frontend/                    # Angular application
│   ├── src/
│   ├── angular.json
│   ├── package.json
│   └── ...
│
├── report-worker/               # Asynchronous PDF processing service
│   ├── index.js
│   └── package.json
│
├── .gitignore
├── .prettierrc
├── README.md
└── ...
```

## Example Use Cases

The platform can support workflows such as:

* An admissions staff member records and manages applicants.
* A school administrator creates a reusable report template.
* Staff select multiple students for document generation.
* The system queues PDF generation jobs for background processing.
* Generated documents are stored and made available through the report archive.
* Authorized users retrieve completed documents through the platform.

## Getting Started

### Prerequisites

* Java 21+
* Node.js 18+
* npm
* Docker Desktop or Docker Engine
* PostgreSQL, or the provided Docker configuration

### 1. Start Infrastructure Services

```bash
cd backend
docker compose up -d
```

This starts the PostgreSQL database and LocalStack services used for S3 and SQS emulation.

### 2. Run the Backend

```bash
cd backend
./mvnw spring-boot:run
```

The Spring Boot API will start using the configured local services.

### 3. Run the Frontend

```bash
cd frontend
npm install
npm start
```

The Angular application is typically available at:

```text
http://localhost:4200
```

### 4. Run the Report Worker

```bash
cd report-worker
npm install
node index.js
```

The worker listens for queued report-generation jobs and processes them into PDF documents.

## Local Infrastructure

The default development environment uses:

| Service    | Purpose                    | Local Endpoint          |
| ---------- | -------------------------- | ----------------------- |
| PostgreSQL | Application database       | `localhost:5432`        |
| LocalStack | AWS service emulation      | `http://localhost:4566` |
| S3         | Generated document storage | LocalStack              |
| SQS        | Background job queue       | LocalStack              |

These services are intended for local development and testing.

## Technical Focus

This project demonstrates experience with:

* Full-stack application architecture
* REST API design
* Frontend/backend integration
* Relational database persistence
* Authentication and authorization
* Asynchronous job processing
* Queue-based architectures
* PDF document generation
* Object storage workflows
* Local cloud-service emulation
* Multi-service application structure
