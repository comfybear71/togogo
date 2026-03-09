import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-sm text-zinc-500 mb-8">Last updated: 8 March 2026</p>

      <div className="space-y-6 text-zinc-300 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-white mb-3">1. Overview</h2>
          <p>ToGoGo Pty Ltd ("we", "us", "our") operates the ToGoGo platform. This Privacy Policy explains how we collect, use, disclose, and protect your personal information in accordance with the Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
          <p>We collect the following types of information:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong className="text-white">Account information:</strong> name, email address, and password when you register</li>
            <li><strong className="text-white">Profile information:</strong> business name, phone number, and address if provided</li>
            <li><strong className="text-white">Payment information:</strong> processed securely through Stripe; we do not store card details</li>
            <li><strong className="text-white">Platform connections:</strong> OAuth tokens for connected marketplaces (eBay, Etsy, Amazon, TikTok Shop)</li>
            <li><strong className="text-white">Usage data:</strong> pages visited, features used, and interactions with the Platform</li>
            <li><strong className="text-white">Device information:</strong> browser type, IP address, and device identifiers</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Provide, maintain, and improve the Platform</li>
            <li>Process transactions and manage subscriptions</li>
            <li>Connect your account to third-party marketplaces</li>
            <li>Synchronise product listings and orders across platforms</li>
            <li>Send important notifications about your account and orders</li>
            <li>Provide customer support</li>
            <li>Analyse usage patterns to improve our services</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">4. Information Sharing</h2>
          <p>We may share your information with:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong className="text-white">Connected platforms:</strong> When you authorise connections to eBay, Etsy, Amazon, TikTok Shop, or other marketplaces</li>
            <li><strong className="text-white">Payment processors:</strong> Stripe, for processing payments</li>
            <li><strong className="text-white">Service providers:</strong> Hosting (Vercel, Neon), email (SendGrid), and analytics providers</li>
            <li><strong className="text-white">Shipping carriers:</strong> Australia Post, EasyPost, and other carriers for order fulfilment</li>
            <li><strong className="text-white">Legal requirements:</strong> When required by law or to protect our rights</li>
          </ul>
          <p className="mt-2">We do not sell your personal information to third parties.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">5. Data Storage and Security</h2>
          <p>Your data is stored securely using Vercel Postgres powered by Neon. We use encryption in transit (HTTPS/TLS) and at rest. OAuth tokens for connected platforms are stored securely and can be revoked at any time by disconnecting the platform from your account. While we take reasonable steps to protect your information, no method of transmission over the Internet is 100% secure.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">6. Cookies and Tracking</h2>
          <p>We use essential cookies and local storage to maintain your session and preferences (such as dark mode). We do not use third-party advertising cookies. Analytics data is collected in aggregate form.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">7. Your Rights</h2>
          <p>Under the Australian Privacy Principles, you have the right to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your account and associated data</li>
            <li>Withdraw consent for data processing</li>
            <li>Disconnect any connected marketplace platform at any time</li>
            <li>Lodge a complaint with the Office of the Australian Information Commissioner (OAIC)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">8. Data Retention</h2>
          <p>We retain your personal information for as long as your account is active or as needed to provide services. When you delete your account, we will delete or anonymise your personal information within 30 days, except where we are required to retain it by law.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">9. International Data Transfers</h2>
          <p>Some of our service providers (such as Vercel and Stripe) may process data outside Australia. We ensure appropriate safeguards are in place in accordance with the APPs when transferring data overseas.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">10. Children's Privacy</h2>
          <p>The Platform is not intended for users under 18 years of age. We do not knowingly collect information from children.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">11. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email or a notice on the Platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">12. Contact Us</h2>
          <p>For privacy-related inquiries or to exercise your rights, contact us at:</p>
          <p className="mt-2">
            <strong className="text-white">Email:</strong>{' '}
            <a href="mailto:privacy@togogo.com.au" className="text-[#FF6B35] hover:underline">privacy@togogo.com.au</a>
          </p>
          <p className="mt-1">
            <strong className="text-white">Privacy complaints:</strong>{' '}
            <a href="https://www.oaic.gov.au/privacy/privacy-complaints" className="text-[#FF6B35] hover:underline" target="_blank" rel="noopener noreferrer">Office of the Australian Information Commissioner</a>
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-zinc-800">
        <Link to="/" className="text-[#FF6B35] hover:underline">&larr; Back to home</Link>
      </div>
    </div>
  )
}
