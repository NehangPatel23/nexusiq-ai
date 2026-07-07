import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for NexusIQ enterprise decision intelligence platform.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      description="These terms govern your access to and use of NexusIQ, our enterprise decision intelligence platform."
      lastUpdated="July 7, 2026"
    >
      <LegalSection title="1. Agreement">
        <p>
          By creating an account or using NexusIQ (&quot;Service&quot;), you agree to these Terms of
          Service (&quot;Terms&quot;) and our{" "}
          <a href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </a>
          . If you are using the Service on behalf of an organization, you represent that you have
          authority to bind that organization to these Terms.
        </p>
      </LegalSection>

      <LegalSection title="2. The Service">
        <p>
          NexusIQ provides enterprise decision intelligence tools, including data room management,
          multi-agent AI analysis, evidence-backed reporting, and explainable consensus features.
          AI outputs are assistive and must be reviewed by qualified professionals before reliance in
          business, legal, financial, or regulatory decisions.
        </p>
        <p>
          The Service is designed to run local AI models (e.g., via Ollama) where configured. Feature
          availability may vary by deployment and plan.
        </p>
      </LegalSection>

      <LegalSection title="3. Accounts & security">
        <p>
          You are responsible for maintaining the confidentiality of your credentials and for all
          activity under your account. Notify us promptly of any unauthorized access. You must provide
          accurate registration information and keep it current.
        </p>
      </LegalSection>

      <LegalSection title="4. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Upload unlawful, infringing, or malicious content</li>
          <li>Attempt to bypass security, access controls, or rate limits</li>
          <li>Reverse engineer or misuse the Service except as permitted by law</li>
          <li>Use the Service to process data without proper authorization or legal basis</li>
          <li>Resell or sublicense the Service without written permission</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Your data">
        <p>
          You retain ownership of data you upload (&quot;Customer Data&quot;). You grant NexusIQ a
          limited license to host, process, and display Customer Data solely to provide and improve
          the Service. You are responsible for obtaining rights and consents needed to upload and
          analyze Customer Data.
        </p>
      </LegalSection>

      <LegalSection title="6. AI outputs & disclaimers">
        <p>
          AI-generated insights may be incomplete or incorrect. Citations and confidence scores are
          provided to aid review but do not guarantee accuracy. THE SERVICE IS PROVIDED &quot;AS
          IS&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY,
          FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
      </LegalSection>

      <LegalSection title="7. Limitation of liability">
        <p>
          To the maximum extent permitted by law, NexusIQ and its affiliates will not be liable for
          indirect, incidental, special, consequential, or punitive damages, or for loss of profits,
          data, or business opportunities. Our aggregate liability arising from the Service will not
          exceed the greater of (a) amounts paid by you in the twelve months before the claim or (b)
          one hundred U.S. dollars ($100).
        </p>
      </LegalSection>

      <LegalSection title="8. Termination">
        <p>
          You may stop using the Service at any time. We may suspend or terminate access for
          violations of these Terms, security risks, or legal requirements. Upon termination, your
          right to use the Service ends, but provisions that by nature should survive will remain in
          effect.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes">
        <p>
          We may update these Terms from time to time. Material changes will be indicated by updating
          the &quot;Last updated&quot; date. Continued use after changes become effective constitutes
          acceptance of the revised Terms.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          Questions about these Terms:{" "}
          <a href="mailto:nehangal@usc.edu" className="text-primary hover:underline">
            nehangal@usc.edu
          </a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
