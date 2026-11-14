import { useState } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2, Clock, ShieldAlert, MapPin } from 'lucide-react';

interface ContactUsPageProps {
  onNavigate: (path: string) => void;
}

export function ContactUsPage({ onNavigate }: ContactUsPageProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'General Inquiry',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate submission or api dispatch
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setFormData({
        name: '',
        email: '',
        category: 'General Inquiry',
        subject: '',
        message: '',
      });
    }, 600);
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-8 py-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#087F5B]/20 border border-[#087F5B]/40 text-[#48d597] text-xs font-semibold uppercase tracking-wider mb-4">
          <MessageSquare className="w-3.5 h-3.5" />
          Direct Support & Partnerships
        </div>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
          Contact Drama<span className="text-[#D4AF6A]">Khana</span>
        </h1>
        <p className="text-sm sm:text-base text-white/65 leading-relaxed">
          Have feedback, partnership inquiries, or copyright questions? We value transparent communication and typically reply within 24–48 hours.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Form Column */}
        <div className="lg:col-span-7 bg-[#1A211D] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white mb-2">
            Send Us a Message
          </h2>
          <p className="text-xs text-white/60 mb-6">
            Fill in the details below and our team will get back to you promptly.
          </p>

          {submitted && (
            <div className="mb-6 p-4 rounded-xl bg-[#087F5B]/20 border border-[#087F5B]/60 text-emerald-200 text-xs sm:text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#48d597] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white font-semibold">Thank you for reaching out!</strong>
                Your inquiry has been received. Our administration team will review your message and reply via email within 24–48 hours.
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Your Full Name <span className="text-[#D4AF6A]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fatima Ali"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#101512] border border-white/15 text-white placeholder-white/35 text-xs sm:text-sm focus:border-[#D4AF6A] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Your Email Address <span className="text-[#D4AF6A]">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#101512] border border-white/15 text-white placeholder-white/35 text-xs sm:text-sm focus:border-[#D4AF6A] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Inquiry Topic <span className="text-[#D4AF6A]">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#101512] border border-white/15 text-white text-xs sm:text-sm focus:border-[#D4AF6A] focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Advertising / Google Ads">Advertising & Partnerships</option>
                  <option value="Content Request">Serial / Episode Request</option>
                  <option value="DMCA / Copyright">Copyright / DMCA Takedown</option>
                  <option value="Bug Report">Technical Bug Report</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Subject Line <span className="text-[#D4AF6A]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary of request"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#101512] border border-white/15 text-white placeholder-white/35 text-xs sm:text-sm focus:border-[#D4AF6A] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                Message Details <span className="text-[#D4AF6A]">*</span>
              </label>
              <textarea
                required
                rows={5}
                placeholder="Please describe your question or message in detail..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full p-3.5 rounded-xl bg-[#101512] border border-white/15 text-white placeholder-white/35 text-xs sm:text-sm focus:border-[#D4AF6A] focus:outline-none transition-colors resize-y"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#087F5B] hover:bg-[#099268] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Submitting...' : 'Send Message'}</span>
            </button>
          </form>
        </div>

        {/* Sidebar Info Column */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quick Channels */}
          <div className="bg-[#1A211D] border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="font-display text-lg font-bold text-white">Direct Communication</h3>
            
            <div className="flex items-start gap-3 text-xs sm:text-sm">
              <div className="w-8 h-8 rounded-lg bg-[#087F5B]/30 border border-[#087F5B]/50 flex items-center justify-center text-[#48d597] shrink-0 mt-0.5">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="text-white/60 block text-[11px]">Official Editorial Email</span>
                <a href="mailto:contact@dramakhana.com" className="text-[#D4AF6A] font-semibold hover:underline">
                  contact@dramakhana.com
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs sm:text-sm">
              <div className="w-8 h-8 rounded-lg bg-[#D4AF6A]/20 border border-[#D4AF6A]/50 flex items-center justify-center text-[#D4AF6A] shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-white/60 block text-[11px]">Response Turnaround</span>
                <span className="text-white font-medium">Within 24 to 48 hours</span>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs sm:text-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300 shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-white/60 block text-[11px]">Developer Inquiries</span>
                <a
                  href="https://jasmin-v01.vercel.app/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/90 hover:underline"
                >
                  Jasmin Portfolio Profile
                </a>
              </div>
            </div>
          </div>

          {/* DMCA & Copyright Safe Harbor Box (Crucial for AdSense) */}
          <div className="bg-[#101512] border border-[#D4AF6A]/30 rounded-2xl p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              DMCA & Copyright Notice
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              DramaKhana respects the intellectual property rights of others. All YouTube videos embedded on this site are hosted on YouTube servers under public broadcaster embeds.
            </p>
            <p className="text-xs text-white/70 leading-relaxed">
              If you are a copyright owner or an agent thereof and believe that any content infringes your rights, please submit a notice with topic &quot;DMCA / Copyright&quot; or review our{' '}
              <button
                type="button"
                onClick={() => onNavigate('/terms')}
                className="text-[#D4AF6A] underline cursor-pointer"
              >
                Terms of Service
              </button>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

