import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Privacy Policy — Seesaw",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white text-gray-800">
      {/* Header */}
      <header className="py-6 px-6 border-b">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/seesaw_icon.png" alt="Seesaw" width={28} height={28} className="h-7 w-auto" />
            <span className="font-semibold text-lg">Seesaw</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            ← Back to home
          </Link>
        </div>
      </header>

      {/* Content */}
      <article className="max-w-3xl mx-auto px-6 py-16 prose prose-gray">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy — Seesaw</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: February 9, 2026</p>

        <p>
          This Privacy Policy describes how Seesaw (the &quot;App&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, and shares information when you install or use Seesaw in connection with your Shopify store (the &quot;Services&quot;).
        </p>
        <p>
          <strong>Operator:</strong> stem9 Agency Inc. (British Columbia, Canada)
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-4">1) Information We Collect</h2>

        <h3 className="text-lg font-medium mt-6 mb-3">A) Information from your Shopify store</h3>
        <p>When you install the App, Shopify provides us with information needed to operate Seesaw. Depending on the permissions you approve, we may access and process:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Store information:</strong> store name, store domain, Shopify store ID</li>
          <li><strong>Merchant contact information:</strong> name and email address as provided by Shopify</li>
          <li><strong>Order data:</strong> order number, timestamps, totals, currency, discounts, and line items</li>
          <li><strong>Product data:</strong> titles, variants, SKUs, pricing, and product images</li>
          <li><strong>Customer personal information (PII)</strong> contained in orders: such as customer name and shipping details, to the extent required to display your sales feed and recent activity</li>
        </ul>

        <h3 className="text-lg font-medium mt-6 mb-3">B) App usage and technical data</h3>
        <p>We may collect information about how the App is used, including:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>App events (install/uninstall, configuration actions)</li>
          <li>Diagnostic logs (errors, crash reports)</li>
          <li>Technical information such as IP address and browser/device details (for security and reliability)</li>
        </ul>

        <h3 className="text-lg font-medium mt-6 mb-3">C) Cookies and similar technologies</h3>
        <p>We may use cookies or similar technologies for authentication, security, and basic app functionality.</p>

        <h2 className="text-xl font-semibold mt-10 mb-4">2) How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Provide and operate Seesaw (including showing a live, image-driven sales feed)</li>
          <li>Keep the dashboard updated with recent order and product activity</li>
          <li>Authenticate users and maintain sessions</li>
          <li>Provide customer support and troubleshoot problems</li>
          <li>Improve and maintain the App&apos;s performance and reliability</li>
          <li>Comply with legal obligations and enforce our terms</li>
        </ul>

        <h2 className="text-xl font-semibold mt-10 mb-4">3) Data Retention and Deletion</h2>
        <p>We retain information only as long as necessary to provide the Services and for legitimate business or legal purposes.</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>PII retention limit:</strong> Seesaw stores customer PII (such as names) only for recent activity and deletes those details as records age, retaining PII for approximately the last 100 orders.</li>
          <li>We may retain non-PII (or anonymized/aggregated data) longer to support app functionality, analytics, and debugging.</li>
          <li><strong>Uninstall:</strong> If you uninstall the App, we will delete or anonymize your store&apos;s data within a reasonable period, unless we are required to retain certain information for legal, security, or fraud-prevention purposes.</li>
          <li><strong>Deletion requests:</strong> You can request deletion by contacting us (see Contact section). We may request verification that you own or administer the store.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-10 mb-4">4) How We Share Information</h2>
        <p>We do not sell your personal information.</p>
        <p>We may share information only in these limited circumstances:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Service providers:</strong> We may use third-party service providers to support the App (for example, hosting, databases, monitoring). These providers are permitted to process data only to perform services for us and are required to protect it.</li>
          <li><strong>Legal compliance:</strong> We may disclose information if required to comply with applicable law, regulation, legal process, or enforceable government request.</li>
          <li><strong>Business transfers:</strong> If we&apos;re involved in a merger, acquisition, financing, or sale of assets, information may be transferred as part of that transaction, subject to appropriate confidentiality protections.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-10 mb-4">5) Security</h2>
        <p>We use reasonable administrative, technical, and physical safeguards designed to protect information. However, no method of transmission over the internet or method of electronic storage is completely secure.</p>

        <h2 className="text-xl font-semibold mt-10 mb-4">6) Your Rights and Choices</h2>
        <p>Depending on your location, you may have rights to access, correct, delete, or object to certain processing of personal information. To exercise these rights, contact us using the information below.</p>

        <h2 className="text-xl font-semibold mt-10 mb-4">7) International Data Transfers</h2>
        <p>We are based in Canada (British Columbia). Your information may be processed in jurisdictions outside your province, territory, state, or country. Where required, we take steps to ensure appropriate safeguards for cross-border transfers.</p>

        <h2 className="text-xl font-semibold mt-10 mb-4">8) Children&apos;s Privacy</h2>
        <p>The Services are not intended for children, and we do not knowingly collect personal information from children.</p>

        <h2 className="text-xl font-semibold mt-10 mb-4">9) Changes to This Privacy Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will post the updated version and revise the &quot;Last updated&quot; date above.</p>

        <h2 className="text-xl font-semibold mt-10 mb-4">10) Contact Us</h2>
        <p>If you have questions about this Privacy Policy, or want to request access or deletion, contact:</p>
        <p>
          <strong>stem9 Agency Inc.</strong><br />
          Email: <a href="mailto:mike@goodmove.ai" className="text-orange-600 hover:text-orange-700">mike@goodmove.ai</a><br />
          Location: British Columbia, Canada
        </p>
      </article>

      {/* Footer */}
      <footer className="py-8 px-6 border-t text-center text-sm text-gray-400">
        <p>© 2026 Seesaw. All rights reserved.</p>
      </footer>
    </main>
  );
}
