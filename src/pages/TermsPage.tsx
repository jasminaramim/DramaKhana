import { FileText, Shield, AlertCircle, CheckCircle } from 'lucide-react';

interface TermsPageProps {
  onNavigate: (path: string) => void;
}

export function TermsPage({ onNavigate }: TermsPageProps) {
  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-8 py-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF6A]/15 border border-[#D4AF6A]/35 text-[#D4AF6A] text-xs font-semibold uppercase tracking-wider mb-4">
          <FileText className="w-3.5 h-3.5" />
          Terms of Service & Disclaimer
        </div>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
          Terms of Service
        </h1>
        <p className="text-sm sm:text-base text-white/65 leading-relaxed">
          Last modified: November 14, 2026. Please read these terms carefully before accessing or using the DramaKhana streaming platform.
        </p>
      </div>

      {/* Main Container */}
      <div className="bg-[#1A211D] border border-white/10 rounded-2xl p-6 sm:p-10 space-y-8 text-white/80 text-sm sm:text-base leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-white font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#087F5B]" />
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or browsing DramaKhana (&quot;the Platform&quot;), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service, along with our{' '}
            <button
              type="button"
              onClick={() => onNavigate('/privacy')}
              className="text-[#D4AF6A] underline cursor-pointer"
            >
              Privacy Policy
            </button>. If you do not agree to these terms, you must discontinue your use of the platform immediately.
          </p>
        </section>

        <div className="h-px bg-white/10" />

        <section className="space-y-3">
          <h2 className="text-white font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#D4AF6A]" />
            2. Intellectual Property & Embedded Content
          </h2>
          <p>
            DramaKhana is an index and aggregator of publicly available Pakistani television dramas. The majority of serials, episodes, and trailers presented on this platform are embedded directly from official third-party video host servers, primarily the official verified YouTube channels of broadcast networks (e.g. ARY Digital, HUM TV, Har Pal Geo, and Green Entertainment).
          </p>
          <p>
            DramaKhana does not host, re-upload, or claim copyright over third-party broadcast serials. All rights, trademarks, and copyrights remain the exclusive property of their respective owners and television networks.
          </p>
        </section>

        <div className="h-px bg-white/10" />

        <section className="space-y-3">
          <h2 className="text-white font-display text-xl sm:text-2xl font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            3. DMCA & Copyright Takedown Procedure
          </h2>
          <p>
            We take intellectual property matters with the utmost seriousness. In accordance with the Digital Millennium Copyright Act (DMCA), if you believe your copyrighted work has been referenced on DramaKhana in a manner that constitutes infringement, please submit a detailed takedown notice via our{' '}
            <button
              type="button"
              onClick={() => onNavigate('/contact')}
              className="text-[#D4AF6A] underline cursor-pointer"
            >
              Contact Us form
            </button>{' '}
            specifying:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-white/70">
            <li>Identification of the copyrighted work claimed to have been infringed.</li>
            <li>Direct URL link on DramaKhana where the material is referenced.</li>
            <li>Your legal name, organization, email, and phone contact details.</li>
            <li>A statement of good faith belief and authorization under penalty of perjury.</li>
          </ul>
        </section>

        <div className="h-px bg-white/10" />

        <section className="space-y-3">
          <h2 className="text-white font-display text-xl sm:text-2xl font-bold">4. User Conduct</h2>
          <p>
            You agree not to exploit the platform for automated scraping, denial-of-service disruptions, malicious payload injections, or unauthorized commercial resale of our catalog metadata.
          </p>
        </section>

        <div className="h-px bg-white/10" />

        <section className="space-y-3">
          <h2 className="text-white font-display text-xl sm:text-2xl font-bold">5. Advertising & Third-Party Links</h2>
          <p>
            The platform may display advertisements powered by Google AdSense and third-party advertising exchanges. We are not responsible for the contents, products, or services advertised by third parties. Your interactions with advertisers are strictly between you and the respective third party.
          </p>
        </section>
      </div>
    </div>
  );
}
