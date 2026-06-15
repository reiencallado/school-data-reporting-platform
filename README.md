## Repository Structure

The project is organized as a unified monorepo to cleanly separate concerns while maintaining team alignment across sprint tasks:

- **`text reportbuilder-repository/`** - Root directory
- **`backend/`** - Spring Boot Java Engine (REST APIs & JPA Schema)
  - `mvn/`
  - `src/` - Database packages, entities, and controllers
  - `mvnw` - Maven wrapper executable for Unix/macOS
  - `mvnw.cmd` - Maven wrapper executable for Windows
  - `pom.xml` - Backend dependency configurations
- **`frontend/`** - Angular Frontend (Web UI Component Canvas)
  - `src/` - HTML templates, CSS styles, and TypeScript logic
  - `angular.json` - Angular CLI workspace configurations
  - `package.json` - Frontend third-party libraries (e.g., @angular, RxJS)
  - `tsconfig.json` - TypeScript compiler configurations
- **`.gitignore`** - Global workspace ignore boundaries
- **`.prettierrc`** - Shared code-formatting configurations
- **`README.md`** - This file