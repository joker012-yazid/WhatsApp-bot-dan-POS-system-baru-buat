import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Implementation Guide | Codeguide Starter",
  description:
    "Comprehensive implementation guide covering project overview, scope, user flow, core features, tech stack, and requirements for the Codeguide Starter.",
};

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="border-b border-muted/40 bg-white/70 backdrop-blur-sm dark:bg-gray-900/50">
        <div className="container mx-auto px-6 py-12">
          <p className="text-sm uppercase tracking-wide text-blue-600 dark:text-blue-400">Documentation</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Codeguide Starter Implementation Guide
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">
            This page provides the full project requirements document for the Codeguide Starter so you can quickly understand the
            scope, architecture, and expectations for the application.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/"
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Return to Home
            </Link>
            <a
              href="#project-overview"
              className="inline-flex items-center rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-blue-900 dark:bg-transparent dark:text-blue-300 dark:hover:bg-blue-900/40"
            >
              Jump to Overview
            </a>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <article className="prose prose-slate max-w-none dark:prose-invert">
          <section id="project-overview">
            <h2>1. Project Overview</h2>
            <p>
              The <strong>codeguide-starter</strong> project is a boilerplate web application that provides a ready-made foundation
              for any web project requiring secure user authentication and a post-login dashboard. It sets up the common building
              blocks—sign-up and sign-in pages, API routes to handle registration and login, and a simple dashboard interface driven
              by static data. By delivering this skeleton, it accelerates development time and ensures best practices are in place
              from day one.
            </p>
            <p>
              This starter kit is being built to solve the friction developers face when setting up repeated common tasks: credential
              handling, session management, page routing, and theming. Key objectives include: 1) delivering a fully working
              authentication flow (registration &amp; login), 2) providing a gated dashboard area upon successful login, 3) establishing
              a clear, maintainable project structure using Next.js and TypeScript, and 4) demonstrating a clean theming approach
              with global and section-specific CSS. Success is measured by having an end-to-end login journey in under 200 lines of
              code and zero runtime type errors.
            </p>
          </section>

          <section>
            <h2>2. In-Scope vs. Out-of-Scope</h2>
            <h3>In-Scope (Version 1)</h3>
            <ul>
              <li>User registration (sign-up) form with validation</li>
              <li>User login (sign-in) form with validation</li>
              <li>
                Next.js API routes under <code>/api/auth/route.ts</code> handling credential validation, password hashing, and session
                creation or JWT issuance
              </li>
              <li>
                Protected dashboard pages under <code>/dashboard</code> with a layout wrapper and static data rendering from
                <code>data.json</code>
              </li>
              <li>Global application layout in <code>/app/layout.tsx</code></li>
              <li>Basic styling via <code>globals.css</code> and <code>dashboard/theme.css</code></li>
              <li>TypeScript strict mode enabled</li>
            </ul>
            <h3>Out-of-Scope (Later Phases)</h3>
            <ul>
              <li>Integration with a real database (PostgreSQL, MongoDB, etc.)</li>
              <li>Advanced authentication flows (password reset, email verification, MFA)</li>
              <li>Role-based access control (RBAC)</li>
              <li>Multi-tenant or white-label theming</li>
              <li>Unit, integration, or end-to-end testing suites</li>
              <li>CI/CD pipeline and production deployment scripts</li>
            </ul>
          </section>

          <section>
            <h2>3. User Flow</h2>
            <p>
              A new visitor lands on the root URL and sees a welcome page with options to <strong>Sign Up</strong> or
              <strong> Sign In</strong>. If they choose Sign Up, they fill in their email, password, and hit “Create Account.” The
              form submits to <code>/api/auth/route.ts</code>, which hashes the password, creates a new user session or token, and
              redirects them to the dashboard. If any input is invalid, an inline error message explains the issue (e.g., “Password
              too short”).
            </p>
            <p>
              Once authenticated, the user is taken to the <code>/dashboard</code> route. Here they see a sidebar or header defined by
              <code>dashboard/layout.tsx</code>, and the main panel pulls in static data from <code>data.json</code>. They can log out
              (if that control is present), but otherwise their entire session is managed by server-side cookies or tokens.
              Returning users go directly to Sign In, submit credentials, and upon success they land back on <code>/dashboard</code>.
              Any unauthorized access to <code>/dashboard</code> redirects back to Sign In.
            </p>
          </section>

          <section>
            <h2>4. Core Features</h2>
            <ul>
              <li>
                <strong>Sign-Up Page (<code>/app/sign-up/page.tsx</code>)</strong>: Form fields for email &amp; password, client-side
                validation, POST to <code>/api/auth</code>.
              </li>
              <li>
                <strong>Sign-In Page (<code>/app/sign-in/page.tsx</code>)</strong>: Form fields for email &amp; password, client-side
                validation, POST to <code>/api/auth</code>.
              </li>
              <li>
                <strong>Authentication API (<code>/app/api/auth/route.ts</code>)</strong>: Handles both registration and login based on
                HTTP method, integrates password hashing (bcrypt) and session or JWT logic.
              </li>
              <li>
                <strong>Global Layout (<code>/app/layout.tsx</code> + <code>globals.css</code>)</strong>: Shared header, footer, and CSS
                resets across all pages.
              </li>
              <li>
                <strong>Dashboard Layout (<code>/app/dashboard/layout.tsx</code> + <code>dashboard/theme.css</code>)</strong>: Sidebar or
                top nav for authenticated flows, section-specific styling.
              </li>
              <li>
                <strong>Dashboard Page (<code>/app/dashboard/page.tsx</code>)</strong>: Reads <code>data.json</code>, renders it as cards or
                tables.
              </li>
              <li>
                <strong>Static Data Source (<code>/app/dashboard/data.json</code>)</strong>: Example dataset to demo dynamic rendering.
              </li>
              <li>
                <strong>TypeScript Configuration</strong>: <code>tsconfig.json</code> with strict mode and path aliases (if any).
              </li>
            </ul>
          </section>

          <section>
            <h2>5. Tech Stack &amp; Tools</h2>
            <ul>
              <li>
                <strong>Framework</strong>: Next.js (App Router) for file-based routing, SSR/SSG, and API routes.
              </li>
              <li>
                <strong>Language</strong>: TypeScript for type safety.
              </li>
              <li>
                <strong>UI Library</strong>: React 18 for component-based UI.
              </li>
              <li>
                <strong>Styling</strong>: Plain CSS via <code>globals.css</code> (global reset) and <code>theme.css</code> (sectional styling).
                Can easily migrate to CSS Modules or Tailwind in the future.
              </li>
              <li>
                <strong>Backend</strong>: Node.js runtime provided by Next.js API routes.
              </li>
              <li>
                <strong>Password Hashing</strong>: bcrypt (npm package).
              </li>
              <li>
                <strong>Session/JWT</strong>: NextAuth.js or custom JWT logic (to be decided in implementation).
              </li>
              <li>
                <strong>IDE &amp; Dev Tools</strong>: VS Code with ESLint, Prettier extensions. Optionally, Cursor.ai for AI-assisted coding.
              </li>
            </ul>
          </section>

          <section>
            <h2>6. Non-Functional Requirements</h2>
            <ul>
              <li>
                <strong>Performance</strong>: Initial page load under 200 ms on a standard broadband connection. API responses under 300 ms.
              </li>
              <li>
                <strong>Security</strong>:
                <ul>
                  <li>HTTPS only in production.</li>
                  <li>Proper CORS, CSRF protection for API routes.</li>
                  <li>Secure password storage (bcrypt with salt).</li>
                  <li>No credentials or secrets checked into version control.</li>
                </ul>
              </li>
              <li>
                <strong>Scalability</strong>: Structure must support adding database integration, caching layers, and advanced auth flows without rewiring the core app.
              </li>
              <li>
                <strong>Usability</strong>: Forms should give real-time feedback on invalid input. Layout must be responsive (mobile &gt; 320 px).
              </li>
              <li>
                <strong>Maintainability</strong>: Code must adhere to TypeScript strict mode. Linting &amp; formatting enforced by ESLint/Prettier.
              </li>
            </ul>
          </section>

          <section>
            <h2>7. Constraints &amp; Assumptions</h2>
            <ul>
              <li><strong>No Database</strong>: Dashboard uses only <code>data.json</code>; real database integration is deferred.</li>
              <li><strong>Node Version</strong>: Requires Node.js &gt;= 14.</li>
              <li><strong>Next.js Version</strong>: Built on Next.js 13+ App Router.</li>
              <li><strong>Authentication</strong>: Assumes availability of bcrypt or NextAuth.js at implementation time.</li>
              <li><strong>Hosting</strong>: Targets serverless or Node.js-capable hosting (e.g., Vercel, Netlify).</li>
              <li><strong>Browser Support</strong>: Modern evergreen browsers; no IE11 support required.</li>
            </ul>
          </section>

          <section>
            <h2>8. Known Issues &amp; Potential Pitfalls</h2>
            <ul>
              <li>
                <strong>Static Data Limitation</strong>: <code>data.json</code> is only for demo. A real API or database will be needed to avoid stale
                data. <em>Mitigation</em>: Define a clear interface for data fetching so swapping to a live endpoint is trivial.
              </li>
              <li>
                <strong>Global CSS Conflicts</strong>: Using global styles can lead to unintended overrides. <em>Mitigation</em>: Plan to migrate to CSS
                Modules or utility-first CSS in Phase 2.
              </li>
              <li>
                <strong>API Route Ambiguity</strong>: Single <code>/api/auth/route.ts</code> handling both sign-up and sign-in could get complex.
                <em>Mitigation</em>: Clearly branch on HTTP method (<code>POST /register</code> vs. <code>POST /login</code>) or split into separate files.
              </li>
              <li>
                <strong>Lack of Testing</strong>: No test suite means regressions can slip in. <em>Mitigation</em>: Build a minimal Jest + React Testing
                Library setup in an early iteration.
              </li>
              <li>
                <strong>Error Handling Gaps</strong>: Client and server must handle edge cases (network failures, malformed input). <em>Mitigation</em>:
                Define a standard error response schema and show user-friendly messages.
              </li>
            </ul>
          </section>

          <section>
            <p>
              This PRD should serve as the single source of truth for the AI model or any developer generating the next set of
              technical documents: Tech Stack Doc, Frontend Guidelines, Backend Structure, App Flow, File Structure, and IDE Rules.
              It contains all functional and non-functional requirements with no ambiguity, enabling seamless downstream development.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
