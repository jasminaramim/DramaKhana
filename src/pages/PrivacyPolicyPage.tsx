import { Shield, Lock, Eye, Cookie, FileText, CheckCircle2 } from 'lucide-react';

interface PrivacyPolicyPageProps {
  onNavigate: (path: string) => void;
}

export function PrivacyPolicyPage({ onNavigate }: PrivacyPolicyPageProps) {
  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-8 py-12">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#087F5B]/20 border border-[#087F5B]/40 text-[#48d597] text-xs font-semibold uppercase tracking-wider mb-4">
          <Shield className="w-3.5 h-3.5" />
          Google Publisher & AdSense Compliant
        </div>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
          Privacy Policy
        </h1>
        <p className="text-sm sm:text-base text-white/65 leading-relaxed">
          Last updated: November 14, 2026. This Privacy Policy outlines how DramaKhana collects, uses, and safeguards your information in compliance with Google AdSense, GDPR, and CCPA standards.
        </p>
      </div>

      {/* Main Content Body */}
      <div className="bg-[#1A211D] border border-white/10 rounded-2xl p-6 sm:p-10 space-y-8 text-white/80 text-sm sm:text-base leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-white font-display text-xl sm:text-2xl font-bold">
            <Lock className="w-5 h-5 text-[#D4AF6A]" />
            <h2>1. Introduction & Overview</h2>
          </div>
          <p>
            Welcome to <strong className="text-white">DramaKhana</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), accessible from{' '}
            <a href="https://drama-khana.vercel.app" className="text-[#D4AF6A] hover:underline">
              https://drama-khana.vercel.app
            </a>. We are committed to honoring and safeguarding the privacy of our visitors. This Privacy Policy document details the types of personal information collected and recorded by DramaKhana and how we utilize it.
          </p>
          <p>
            If you have questions or require further information regarding our Privacy Policy, please reach out via our{' '}
            <button
              type="button"
              onClick={() => onNavigate('/contact')}
              className="text-[#D4AF6A] hover:underline font-medium cursor-pointer"
            >
              Contact Us page
            </button>{' '}
            or email us directly at <a href="mailto:jasminaramim2005@gmail.com" className="text-white hover:underline font-mono text-xs">jasminaramim2005@gmail.com</a>.
          </p>
        </section>

        <div className="h-px bg-white/10" />

        {/* Section 2: Google AdSense & DoubleClick Cookie Disclosure */}
        <section className="space-y-3 bg-[#101512] border border-[#D4AF6A]/30 rounded-xl p-5 sm:p-6">
          <div className="flex items-center gap-2.5 text-white font-display text-xl sm:text-2xl font-bold">
            <Cookie className="w-5 h-5 text-[#D4AF6A]" />
            <h2>2. Google AdSense & Third-Party Advertising Disclosure</h2>
          </div>
          <p className="text-white/90">
            Google is a third-party vendor on our website. It also uses cookies, known as <strong>DART cookies</strong>, to serve targeted advertisements to our site visitors based on their visit to DramaKhana and other destinations on the internet:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-white/75 text-xs sm:text-sm">
            <li>
              Third-party vendors, including <strong className="text-white">Google</strong>, use cookies to serve ads based on a user&apos;s prior visits to your website or other websites.
            </li>
            <li>
              Google&apos;s use of advertising cookies enables it and its partners to serve ads to your users based on their visit to your sites and/or other sites on the Internet.
            </li>
            <li>
              Users may opt out of personalized advertising by visiting{' '}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noreferrer"
                className="text-[#D4AF6A] underline"
              >
                Google Ads Settings
              </a>{' '}
              or by opting out of a third-party vendor&apos;s use of cookies for personalized advertising by visiting{' '}
              <a
                href="http://www.aboutads.info/choices/"
                target="_blank"
                rel="noreferrer"
                className="text-[#D4AF6A] underline"
              >
                www.aboutads.info
              </a>.
            </li>
          </ul>
        </section>

        <div className="h-px bg-white/10" />

        {/* Section 3: YouTube API Services */}
        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-white font-display text-xl sm:text-2xl font-bold">
            <Eye className="w-5 h-5 text-[#087F5B]" />
            <h2>3. YouTube API Services & Embedded Media</h2>
          </div>
          <p>
            DramaKhana indexes and embeds official broadcast Pakistani dramas using YouTube API Services and embedded iframes directly from verified official network channels (including ARY Digital, HUM TV, Har Pal Geo, and Green Entertainment).
          </p>
          <p>
            By using our streaming service, users agree to be bound by the{' '}
            <a
              href="https://www.youtube.com/t/terms"
              target="_blank"
              rel="noreferrer"
              className="text-[#D4AF6A] underline"
            >
              YouTube Terms of Service
            </a>{' '}
            and the{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noreferrer"
              className="text-[#D4AF6A] underline"
            >
              Google Privacy Policy
            </a>. We do not store private YouTube account credentials or access private user channels without authorization.
          </p>
        </section>

        <div className="h-px bg-white/10" />

        {/* Section 4: Log Files */}
        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-white font-display text-xl sm:text-2xl font-bold">
            <FileText className="w-5 h-5 text-[#D4AF6A]" />
            <h2>4. Standard Log Files</h2>
          </div>
          <p>
            DramaKhana follows a standard procedure of utilizing log files. These files log visitors when they navigate the platform. The information collected by log files includes internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and optionally the number of clicks. These are not linked to any information that is personally identifiable. The purpose of the information is for analyzing trends, administering the site, tracking users&apos; movement on the website, and gathering demographic information.
          </p>
        </section>

        <div className="h-px bg-white/10" />

        {/* Section 5: GDPR & CCPA Rights */}
        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-white font-display text-xl sm:text-2xl font-bold">
            <CheckCircle2 className="w-5 h-5 text-[#087F5B]" />
            <h2>5. CCPA & GDPR Privacy Rights</h2>
          </div>
          <p>
            We respect your data sovereignty rights under both the California Consumer Privacy Act (CCPA) and the General Data Protection Regulation (GDPR):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="p-4 rounded-xl bg-[#101512] border border-white/10">
              <h4 className="font-semibold text-white mb-1">Under CCPA (California Residents):</h4>
              <p className="text-xs text-white/70">
                You have the right to request disclosure of categories of personal data collected, request deletion of your personal data, and demand that we do not sell your personal data. <em>(DramaKhana does not sell personal data.)</em>
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#101512] border border-white/10">
              <h4 className="font-semibold text-white mb-1">Under GDPR (European Users):</h4>
              <p className="text-xs text-white/70">
                You are entitled to the right of access, rectification, erasure, restriction of processing, objection to processing, and data portability. We will respond to any statutory request within 30 days.
              </p>
            </div>
          </div>
        </section>

        <div className="h-px bg-white/10" />

        {/* Section 6: Children's Information */}
        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-white font-display text-xl sm:text-2xl font-bold">
            <Shield className="w-5 h-5 text-[#D4AF6A]" />
            <h2>6. Children&apos;s Information (COPPA)</h2>
          </div>
          <p>
            Another part of our priority is adding protection for children while using the internet. We encourage parents and guardians to observe, participate in, and/or monitor and guide their online activity. DramaKhana does not knowingly collect any Personal Identifiable Information from children under the age of 13.
          </p>
        </section>

        <div className="h-px bg-white/10" />

        {/* Section 7: Contact */}
        <section className="space-y-3">
          <h2 className="text-white font-display text-xl sm:text-2xl font-bold">7. Privacy Inquiries & Contact</h2>
          <p>
            If you have questions about this policy or wish to exercise your data rights, contact us at:
          </p>
          <div className="p-4 rounded-xl bg-[#101512] border border-white/10 inline-block font-mono text-xs sm:text-sm text-[#D4AF6A]">
            Email: jasminaramim2005@gmail.com <br />
            Developer: Jasmin (Web Developer) <br />
            Online Portal:{' '}
            <button
              type="button"
              onClick={() => onNavigate('/contact')}
              className="text-[#48d597] underline cursor-pointer"
            >
              https://drama-khana.vercel.app/contact
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

