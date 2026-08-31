import { Brain, MessageSquare, ShieldCheck } from "lucide-react";

const POINTS = [
  { icon: MessageSquare, text: "Converse naturally with an agent that keeps context." },
  { icon: Brain, text: "Long-term memory persisted across every session." },
  { icon: ShieldCheck, text: "Your data, access-controlled behind your account." },
];

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      {/* This panel is a fixed dark brand treatment, independent of the
          app's light/dark toggle — not driven by the shared tokens. */}
      <div className="hidden w-[42%] flex-col justify-between bg-[#141715] px-12 py-14 lg:flex">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Mnemos" className="h-11 w-11" />
          <div>
            <p className="text-xl font-semibold tracking-tight text-[#edf1ec]">Mnemos</p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8b938c]">
              Your AI Finance Assistant
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {POINTS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#2a2f2b] text-[#edf1ec]">
                <Icon size={15} strokeWidth={1.8} />
              </div>
              <p className="text-sm leading-relaxed text-[#8b938c]">{text}</p>
            </div>
          ))}
        </div>

        <p className="font-mono text-[11px] text-[#8b938c]">Built on LangGraph &amp; PostgreSQL</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-page px-6 py-14">
        <div className="mb-10 flex items-center gap-3 lg:hidden">
          <img src="/logo.png" alt="Mnemos" className="h-9 w-9" />
          <div>
            <p className="text-lg font-semibold tracking-tight text-primary">Mnemos</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              Your AI Finance Assistant
            </p>
          </div>
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
