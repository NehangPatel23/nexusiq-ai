import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for NexusIQ enterprise decision intelligence platform.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="How NexusIQ collects, uses, and protects information when you use our platform."
      lastUpdated="July 7, 2026"
    >
      <LegalSection title="1. Overview">
        <p>
          NexusIQ (&quot;we&quot;, &quot;us&quot;) respects your privacy. This policy explains what
          information we process when you use our enterprise decision intelligence platform
          (&quot;Service&quot;) and the choices available to you.
        </p>
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <p>
          <strong className="text-foreground">Account information:</strong> name, email address, and
          authentication credentials (stored as a secure password hash).
        </p>
        <p>
          <strong className="text-foreground">Workspace data:</strong> documents, metadata, analysis
          results, agent outputs, citations, and activity logs you create or upload while using the
          Service.
        </p>
        <p>
          <strong className="text-foreground">Technical data:</strong> IP address, browser type,
          device information, and usage diagnostics needed to operate and secure the Service.
        </p>
      </LegalSection>

      <LegalSection title="3. How we use information">
        <p>We use information to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide, maintain, and secure the Service</li>
          <li>Authenticate users and enforce access controls</li>
          <li>Process documents and generate AI-assisted insights you request</li>
          <li>Improve reliability, performance, and user experience</li>
          <li>Comply with legal obligations and respond to lawful requests</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Local-first AI">
        <p>
          NexusIQ is designed for local AI processing via Ollama or on-premises deployment. When
          configured locally, document content and model inference remain within your environment.
          We do not sell Customer Data or use it to train third-party foundation models unless you
          explicitly enable such a feature.
        </p>
      </LegalSection>

      <LegalSection title="5. Sharing">
        <p>
          We do not sell personal information. We may share information with service providers who
          assist in hosting, monitoring, or support under contractual confidentiality obligations, or
          when required by law, to protect rights and safety, or in connection with a merger or
          acquisition with appropriate safeguards.
        </p>
      </LegalSection>

      <LegalSection title="6. Retention">
        <p>
          We retain account and workspace data while your account is active and as needed to provide
          the Service. You may request deletion of your account subject to legal retention
          requirements and backup cycles.
        </p>
      </LegalSection>

      <LegalSection title="7. Security">
        <p>
          We implement administrative, technical, and organizational measures appropriate to the
          nature of the data, including encryption in transit, access controls, and audit logging.
          No method of transmission or storage is completely secure.
        </p>
      </LegalSection>

      <LegalSection title="8. Your rights">
        <p>
          Depending on your location, you may have rights to access, correct, delete, or export
          personal information, or to object to or restrict certain processing. Contact us to
          exercise these rights.
        </p>
      </LegalSection>

      <LegalSection title="9. International transfers">
        <p>
          If you access the Service from outside the country where our infrastructure is located, your
          information may be transferred and processed in other jurisdictions with different data
          protection laws. We take steps to ensure appropriate safeguards where required.
        </p>
      </LegalSection>

      <LegalSection title="10. Children">
        <p>
          The Service is not directed to individuals under 18. We do not knowingly collect personal
          information from children.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes">
        <p>
          We may update this Privacy Policy periodically. The &quot;Last updated&quot; date reflects
          the latest revision. Material changes will be communicated through the Service or by email
          where appropriate.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>
          Privacy questions or requests:{" "}
          <a href="mailto:nehangal@usc.edu" className="text-primary hover:underline">
            nehangal@usc.edu
          </a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
