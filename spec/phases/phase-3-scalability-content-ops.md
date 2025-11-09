# Phase 3 – Scalability & Content Ops

## Objectives
- Prepare the platform for higher concurrency and operational visibility.
- Equip internal teams with admin tools to manage conversation packs and monitor usage.
- Localize UI and documentation for multi-language rollout.

## Technical Tasks
1. **Infrastructure Hardening**
   - Containerize services (Dockerfiles for server/client) and define production-ready docker-compose or Kubernetes manifests.
   - Implement horizontal scaling via stateless API pods + shared Redis/Postgres; add connection pooling (pgBouncer) and caching for template lookups.
   - Introduce rate limiting (e.g., Redis-based sliding window) on messaging endpoints.
2. **Performance Optimization**
   - Add streaming support for OpenAI responses to reduce perceived latency; implement partial rendering on client.
   - Cache conversation templates + persona prompts in-memory with invalidation via admin console updates.
   - Profile and optimize DB queries; add indexes for session/mistake retrieval patterns.
3. **Admin Console**
   - Build `/admin` app (simple React/Bootstrap or server-rendered) with auth guard + role-based permissions.
   - Features: list/add/edit conversation templates, manage vocabulary packs, view session stats, trigger re-seeding.
   - Provide upload capability for template files residing in language-specific directories.
4. **Localization**
   - Externalize UI strings into locale files; implement i18n switcher for interface languages (start with English + Japanese instructions).
   - Ensure server-generated emails/notifications support localization tokens.
5. **Advanced Telemetry**
   - Integrate metrics stack (Prometheus + Grafana or hosted alternative). Emit KPIs: active sessions, OpenAI usage, template popularity, retention cohorts.
   - Implement tracing (OpenTelemetry) covering API requests, OpenAI calls, DB queries; export to collector.
6. **Accessibility & QA Automation**
   - Run accessibility audits (axe) as part of CI; fix issues for WCAG AA compliance.
   - Add automated UI tests (Playwright/Cypress) for critical flows: login, start session, send message, review mistakes, admin template edit.

## Validation & Exit Criteria
- Load test (e.g., k6) demonstrates system sustaining target concurrency (5k active users) with acceptable latency.
- Admin console can CRUD templates and push updates that propagate to clients without restart.
- Localization toggles update UI strings + emails for supported languages.
- Metrics + tracing dashboards show live data from staging environment.
- Automated UI + accessibility tests run in CI and pass consistently.
