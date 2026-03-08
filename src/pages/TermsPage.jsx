import { Link } from 'react-router-dom'

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <p className="text-sm text-zinc-500 mb-8">Last updated: 8 March 2026</p>

      <div className="space-y-6 text-zinc-300 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
          <p>By accessing and using ToGoGo ("the Platform"), operated by ToGoGo Pty Ltd (ABN pending), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
          <p>ToGoGo is an e-commerce platform that enables users to launch online stores, connect to marketplaces (such as eBay, Etsy, Amazon, and TikTok Shop), source products from suppliers, and manage their online selling business. The Platform provides tools for product listing, order management, price comparison, and storefront creation.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">3. User Accounts</h2>
          <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must be at least 18 years old to use the Platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">4. Seller Obligations</h2>
          <p>If you use the Platform to sell products, you agree to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Comply with all applicable Australian and international laws and regulations</li>
            <li>Provide accurate product descriptions and pricing</li>
            <li>Fulfil orders in a timely manner</li>
            <li>Comply with the terms of any connected marketplace platforms</li>
            <li>Handle customer inquiries and disputes professionally</li>
            <li>Comply with Australian Consumer Law including consumer guarantees</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">5. Prohibited Activities</h2>
          <p>You may not use the Platform to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Sell counterfeit, illegal, or prohibited products</li>
            <li>Engage in fraudulent or deceptive practices</li>
            <li>Violate any third-party intellectual property rights</li>
            <li>Interfere with or disrupt the Platform's operation</li>
            <li>Scrape, harvest, or collect data without authorisation</li>
            <li>Circumvent any security measures or access controls</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">6. Fees and Payments</h2>
          <p>Certain features of the Platform may require a paid subscription. All fees are listed on our pricing page and are charged in Australian Dollars (AUD) unless otherwise stated. Payments are processed securely through Stripe. Subscription fees are non-refundable except as required by Australian Consumer Law.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">7. Third-Party Integrations</h2>
          <p>The Platform connects with third-party services including marketplaces, payment providers, and shipping carriers. Your use of these services is subject to their respective terms and conditions. ToGoGo is not responsible for the availability, accuracy, or policies of third-party services.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">8. Intellectual Property</h2>
          <p>The Platform, including its design, code, and branding, is owned by ToGoGo Pty Ltd. You retain ownership of content you upload to the Platform. By uploading content, you grant us a licence to display and distribute it as necessary to operate the Platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">9. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, ToGoGo shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform. Our total liability shall not exceed the amount you paid to us in the 12 months preceding the claim. Nothing in these terms excludes or limits liability that cannot be excluded under Australian Consumer Law.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">10. Termination</h2>
          <p>We may suspend or terminate your account if you violate these terms. You may close your account at any time by contacting us. Upon termination, your right to use the Platform ceases immediately.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">11. Governing Law</h2>
          <p>These terms are governed by the laws of New South Wales, Australia. Any disputes shall be subject to the exclusive jurisdiction of the courts of New South Wales.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">12. Changes to Terms</h2>
          <p>We may update these terms from time to time. We will notify users of material changes via email or a notice on the Platform. Continued use after changes constitutes acceptance.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">13. Contact</h2>
          <p>For questions about these Terms of Service, contact us at <a href="mailto:support@togogo.com.au" className="text-[#FF6B35] hover:underline">support@togogo.com.au</a>.</p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-zinc-800">
        <Link to="/" className="text-[#FF6B35] hover:underline">&larr; Back to home</Link>
      </div>
    </div>
  )
}
