import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  BookOpen, Clock, Award, BarChart3, Shield, Users,
  CheckCircle, ArrowRight, Star, Zap, Target, Globe,
  ChevronRight, Play
} from "lucide-react";

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 pt-20 pb-32">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-cyan-300 text-xs font-semibold px-4 py-2 rounded-full mb-8 backdrop-blur-sm">
          <Zap size={12} className="fill-current" />
          Trusted by 50,000+ students worldwide
        </div>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6">
          The Smarter Way to<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
            Take Exams Online
          </span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-slate-300 mb-10 leading-relaxed">
          Create, manage, and take professional examinations with auto-grading,
          real-time results, and detailed analytics — all in one platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link href="/register" className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-8 py-4 rounded-xl text-base transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5">
            Start Free Today <ArrowRight size={18} />
          </Link>
          <Link href="/exams" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl text-base transition-all backdrop-blur-sm">
            <Play size={16} className="fill-current" /> Browse Exams
          </Link>
        </div>
        <div className="flex flex-wrap justify-center gap-8 sm:gap-16">
          {[["50K+","Students"],["2,000+","Exams"],["98%","Pass Rate"],["150+","Subjects"]].map(([v,l]) => (
            <div key={l} className="text-center">
              <div className="text-3xl font-extrabold text-white">{v}</div>
              <div className="text-sm text-slate-400 mt-1">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Platform Preview</span>
          <h2 className="mt-4 text-4xl font-bold text-slate-900">Everything in one dashboard</h2>
          <p className="mt-3 text-slate-500 text-lg max-w-xl mx-auto">Track progress, manage exams, and view detailed analytics from a clean unified interface.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="h-10 bg-slate-800 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-4 text-slate-400 text-xs">exampro.app/dashboard</span>
          </div>
          <div className="flex">
            <aside className="w-52 bg-slate-900 min-h-[460px] p-4 hidden sm:block">
              <div className="flex items-center gap-2 mb-6 px-2">
                <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center"><BookOpen size={13} className="text-white" /></div>
                <span className="text-white font-bold text-sm">ExamPro</span>
              </div>
              {([["Dashboard",true],[" My Exams",false],["Certificates",false],["Practice",false],["Leaderboard",false]] as [string,boolean][]).map(([label,active]) => (
                <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 text-xs ${active ? "bg-indigo-600 text-white" : "text-slate-400"}`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />{label}
                </div>
              ))}
            </aside>
            <div className="flex-1 p-6 bg-slate-50">
              <p className="font-bold text-slate-800 mb-4 text-sm">Welcome back, Alex 👋</p>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {([["24","Exams Taken","bg-indigo-600"],["87%","Avg. Score","bg-emerald-500"],["6","Certificates","bg-amber-500"]] as [string,string,string][]).map(([v,l,c]) => (
                  <div key={l} className="bg-white rounded-xl p-3 border border-slate-200">
                    <div className={`w-7 h-7 ${c} rounded-lg flex items-center justify-center mb-2`}><BookOpen size={13} className="text-white" /></div>
                    <div className="text-lg font-bold text-slate-800">{v}</div>
                    <div className="text-xs text-slate-400">{l}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <div className="text-xs font-semibold text-slate-700 mb-2">Recent Exams</div>
                {([["Mathematics","92%","Passed","text-emerald-600"],["English B2","78%","Passed","text-emerald-600"],["Physics","55%","Failed","text-red-500"]] as [string,string,string,string][]).map(([n,s,st,c]) => (
                  <div key={n} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                    <span className="text-xs text-slate-700">{n}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-600">{s}</span>
                      <span className={`text-xs font-semibold ${c}`}>{st}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const features = [
  { icon: Clock, title: "Timed Examinations", desc: "Configurable countdowns per question or per exam with auto-submission when time expires.", color: "bg-indigo-50 text-indigo-600" },
  { icon: Shield, title: "Secure & Anti-Cheat", desc: "Full-screen lock, tab-switch detection, and randomised question order for exam integrity.", color: "bg-emerald-50 text-emerald-600" },
  { icon: BarChart3, title: "Instant Analytics", desc: "Auto-graded results with per-question breakdowns, score history, and performance trends.", color: "bg-cyan-50 text-cyan-600" },
  { icon: Award, title: "Digital Certificates", desc: "Auto-generated PDF certificates for passed exams, shareable and verifiable online.", color: "bg-amber-50 text-amber-600" },
  { icon: Globe, title: "Multi-language", desc: "Full support for English, Russian, and Kyrgyz with an easy-to-extend translation system.", color: "bg-violet-50 text-violet-600" },
  { icon: Users, title: "Role-based Access", desc: "Separate portals for students, instructors, and admins with fine-grained permissions.", color: "bg-rose-50 text-rose-600" },
];

function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Features</span>
          <h2 className="mt-4 text-4xl font-bold text-slate-900">Built for serious examinations</h2>
          <p className="mt-3 text-slate-500 text-lg max-w-xl mx-auto">Every feature designed around fairness, clarity, and a great student experience.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="p-6 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all group">
              <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon size={22} />
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Create an Account", desc: "Register as a student or instructor in under 60 seconds. No credit card required." },
    { n: "02", title: "Browse & Enrol", desc: "Find exams by subject, difficulty, or category. Enrol with one click." },
    { n: "03", title: "Take the Exam", desc: "Complete your exam in a secure, timed environment with a clean quiz interface." },
    { n: "04", title: "Get Your Results", desc: "Instant auto-grading with detailed feedback and a downloadable certificate." },
  ];
  return (
    <section className="py-24 bg-gradient-to-br from-indigo-950 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 bg-white/10 px-3 py-1 rounded-full">How it Works</span>
          <h2 className="mt-4 text-4xl font-bold text-white">Four steps to your certificate</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map(({ n, title, desc }) => (
            <div key={n}>
              <div className="text-6xl font-extrabold text-white/5 mb-4 select-none">{n}</div>
              <h3 className="text-white font-bold text-lg mb-2 -mt-8">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const categories = [
  { emoji: "📐", name: "Mathematics", count: 142 },
  { emoji: "🔬", name: "Sciences", count: 98 },
  { emoji: "📝", name: "Languages", count: 115 },
  { emoji: "💻", name: "IT & Programming", count: 87 },
  { emoji: "📊", name: "Business", count: 64 },
  { emoji: "⚖️", name: "Law & Legal", count: 43 },
  { emoji: "🎨", name: "Arts & Design", count: 31 },
  { emoji: "🏥", name: "Medicine", count: 55 },
];

function Categories() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Subjects</span>
          <h2 className="mt-4 text-4xl font-bold text-slate-900">Find your subject</h2>
          <p className="mt-3 text-slate-500 text-lg">Over 150 subjects across 8 major categories</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {categories.map(({ emoji, name, count }) => (
            <Link key={name} href={`/exams?category=${name.toLowerCase()}`}
              className="flex flex-col items-center p-6 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group text-center">
              <span className="text-3xl mb-3 group-hover:scale-110 transition-transform inline-block">{emoji}</span>
              <span className="font-semibold text-slate-800 text-sm">{name}</span>
              <span className="text-xs text-slate-400 mt-1">{count} exams</span>
            </Link>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link href="/exams" className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:gap-3 transition-all">
            View all exams <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

const testimonials = [
  { name: "Asel Nurlanova", role: "University Student", text: "ExamPro helped me prepare for my finals like nothing else. The instant feedback on practice tests is incredible.", avatar: "AN", color: "bg-indigo-500" },
  { name: "Marat Bekov", role: "IT Instructor", text: "I created 20 exams for my students in one afternoon. The question builder is intuitive and the analytics are detailed.", avatar: "MB", color: "bg-emerald-500" },
  { name: "Sarah Ivanova", role: "HR Manager", text: "We use ExamPro for all our employee certifications. The certificate feature and role management are exactly what we needed.", avatar: "SI", color: "bg-violet-500" },
];

function Testimonials() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Testimonials</span>
          <h2 className="mt-4 text-4xl font-bold text-slate-900">Loved by students & teachers</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {testimonials.map(({ name, role, text, avatar, color }) => (
            <div key={name} className="p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} className="fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-5">"{text}"</p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white text-sm font-bold`}>{avatar}</div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{name}</div>
                  <div className="text-xs text-slate-400">{role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const plans = [
  { name: "Free", price: "$0", period: "/forever", features: ["5 exams per month","Basic analytics","Community support","PDF results"], cta: "Start Free", highlight: false },
  { name: "Pro", price: "$12", period: "/month", features: ["Unlimited exams","Advanced analytics","Priority support","Certificates","Anti-cheat mode","Custom branding"], cta: "Start Pro", highlight: true },
  { name: "Institution", price: "$49", period: "/month", features: ["Everything in Pro","Up to 500 students","Instructor portal","API access","Bulk certificates","Dedicated support"], cta: "Contact Sales", highlight: false },
];

function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Pricing</span>
          <h2 className="mt-4 text-4xl font-bold text-slate-900">Simple, transparent pricing</h2>
          <p className="mt-3 text-slate-500 text-lg">Start free. Upgrade when you need more.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto items-center">
          {plans.map(({ name, price, period, features, cta, highlight }) => (
            <div key={name} className={`rounded-2xl p-8 border ${highlight ? "bg-indigo-600 border-indigo-600 shadow-2xl shadow-indigo-500/30 scale-105" : "bg-white border-slate-200 shadow-sm"}`}>
              <div className={`text-sm font-bold mb-2 ${highlight ? "text-indigo-200" : "text-slate-500"}`}>{name}</div>
              <div className="flex items-end gap-1 mb-1">
                <span className={`text-4xl font-extrabold ${highlight ? "text-white" : "text-slate-900"}`}>{price}</span>
                <span className={`text-sm mb-1 ${highlight ? "text-indigo-300" : "text-slate-400"}`}>{period}</span>
              </div>
              <div className={`h-px my-6 ${highlight ? "bg-indigo-500" : "bg-slate-200"}`} />
              <ul className="space-y-3 mb-8">
                {features.map(f => (
                  <li key={f} className="flex items-center gap-2.5">
                    <CheckCircle size={15} className={highlight ? "text-cyan-300" : "text-emerald-500"} />
                    <span className={`text-sm ${highlight ? "text-indigo-100" : "text-slate-600"}`}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register" className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${highlight ? "bg-white text-indigo-600 hover:bg-indigo-50" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>{cta}</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTABanner() {
  return (
    <section className="py-20 bg-gradient-to-r from-indigo-600 to-cyan-600">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-4xl font-extrabold text-white mb-4">Ready to ace your next exam?</h2>
        <p className="text-indigo-100 text-lg mb-8">Join 50,000+ students already using ExamPro to study smarter and get certified.</p>
        <Link href="/register" className="inline-flex items-center gap-2 bg-white text-indigo-600 font-bold px-8 py-4 rounded-xl text-base hover:bg-indigo-50 transition-all shadow-lg">
          Create Free Account <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid sm:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center"><BookOpen size={14} className="text-white" /></div>
            <span className="text-white font-bold">ExamPro</span>
          </div>
          <p className="text-sm leading-relaxed">Professional online examination platform for students, instructors, and institutions.</p>
        </div>
        {[
          { heading: "Platform", links: ["Browse Exams","Dashboard","Certificates","Leaderboard"] },
          { heading: "Company", links: ["About","Blog","Careers","Contact"] },
          { heading: "Legal", links: ["Privacy Policy","Terms of Service","Cookie Policy"] },
        ].map(({ heading, links }) => (
          <div key={heading}>
            <h4 className="text-white font-semibold text-sm mb-4">{heading}</h4>
            <ul className="space-y-2">
              {links.map(l => <li key={l}><a href="#" className="text-sm hover:text-white transition-colors">{l}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-800 py-6 text-center text-xs">© 2024 ExamPro. All rights reserved.</div>
    </footer>
  );
}

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <DashboardPreview />
      <Features />
      <HowItWorks />
      <Categories />
      <Testimonials />
      <Pricing />
      <CTABanner />
      <Footer />
    </main>
  );
}
