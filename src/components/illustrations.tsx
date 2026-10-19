import type { SVGProps } from "react";

const BG = "#120e26";
const GOLD = "#c9a24b";
const GOLD_LIGHT = "#e8cf94";
const LAV = "#a5b4fc";
const LINE = "rgba(255,255,255,0.14)";

type ArtProps = SVGProps<SVGSVGElement>;

function Frame({
  id,
  children,
  ...props
}: { id: string; children: React.ReactNode } & ArtProps) {
  return (
    <svg
      viewBox="0 0 400 260"
      role="img"
      aria-hidden="true"
      className="spot"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a1436" />
          <stop offset="1" stopColor="#0b0818" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={GOLD_LIGHT} />
          <stop offset="1" stopColor={GOLD} />
        </linearGradient>
        <linearGradient id={`${id}-lav`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={LAV} />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.3" r="0.7">
          <stop offset="0" stopColor={GOLD} stopOpacity="0.28" />
          <stop offset="1" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
        <pattern id={`${id}-grid`} width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M26 0H0V26" fill="none" stroke="rgba(232,207,148,0.07)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="400" height="260" rx="20" fill={`url(#${id}-bg)`} />
      <rect width="400" height="260" rx="20" fill={`url(#${id}-grid)`} />
      <rect width="400" height="260" rx="20" fill={`url(#${id}-glow)`} />
      {children}
    </svg>
  );
}

export function ArtInbox(props: ArtProps) {
  return (
    <Frame id="inbox" {...props}>
      <g fill="none" stroke={LINE} strokeWidth="1.4">
        <rect x="116" y="84" width="168" height="112" rx="14" />
        <path d="M116 150h36l10 16h56l10-16h36" />
      </g>
      <rect x="132" y="64" width="136" height="18" rx="9" fill="rgba(255,255,255,0.05)" stroke={LINE} />
      <rect x="148" y="48" width="104" height="12" rx="6" fill="rgba(255,255,255,0.04)" stroke={LINE} />
      <circle cx="200" cy="132" r="17" fill="none" stroke={`url(#inbox-gold)`} strokeWidth="1.8" />
      <path d="M192 132l6 6 12-13" fill="none" stroke={GOLD_LIGHT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <g stroke={LINE} strokeWidth="1.3">
        <circle cx="92" cy="106" r="13" fill="rgba(255,255,255,0.04)" />
        <circle cx="308" cy="150" r="17" fill="rgba(255,255,255,0.04)" />
      </g>
      <circle cx="92" cy="106" r="4" fill={LAV} opacity="0.85" />
      <circle cx="308" cy="150" r="5" fill={GOLD} opacity="0.85" />
      <path d="M76 142l18-10M322 104l-14 10" stroke="rgba(232,207,148,0.35)" strokeWidth="1.2" strokeLinecap="round" />
    </Frame>
  );
}

export function ArtSla(props: ArtProps) {
  const ticks = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <Frame id="sla" {...props}>
      <circle cx="200" cy="138" r="66" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
      <path
        d="M200 72a66 66 0 0 1 51 106"
        fill="none"
        stroke={`url(#sla-gold)`}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <g stroke="rgba(255,255,255,0.16)" strokeWidth="1.2">
        {ticks.map((deg) => {
          const a = (deg * Math.PI) / 180;
          const x1 = 200 + Math.cos(a) * 56;
          const y1 = 138 + Math.sin(a) * 56;
          const x2 = 200 + Math.cos(a) * 61;
          const y2 = 138 + Math.sin(a) * 61;
          return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>
      <line x1="200" y1="138" x2="200" y2="92" stroke={GOLD_LIGHT} strokeWidth="2.4" strokeLinecap="round" />
      <line x1="200" y1="138" x2="238" y2="158" stroke={LAV} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="200" cy="138" r="5" fill={GOLD_LIGHT} />
      <circle cx="200" cy="138" r="11" fill="none" stroke="rgba(232,207,148,0.3)" strokeWidth="1.4" />
      <g stroke={LINE} strokeWidth="1.3">
        <rect x="58" y="86" width="64" height="34" rx="8" fill="rgba(255,255,255,0.04)" />
        <rect x="58" y="132" width="64" height="34" rx="8" fill="rgba(255,255,255,0.04)" />
        <rect x="282" y="112" width="64" height="52" rx="8" fill="rgba(255,255,255,0.04)" />
      </g>
      <path d="M70 103h30M70 149h24" stroke="rgba(232,207,148,0.5)" strokeWidth="2" strokeLinecap="round" />
      <path d="M294 128h30M294 142h18" stroke="rgba(165,180,252,0.55)" strokeWidth="2" strokeLinecap="round" />
    </Frame>
  );
}

export function ArtChat(props: ArtProps) {
  return (
    <Frame id="chat" {...props}>
      <g>
        <rect x="72" y="62" width="150" height="82" rx="16" fill="rgba(255,255,255,0.05)" stroke={LINE} />
        <path d="M104 144l-6 20 24-20" fill="rgba(255,255,255,0.05)" stroke={LINE} />
        <path d="M94 92h86M94 110h58" stroke="rgba(232,207,148,0.55)" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <g>
        <rect x="176" y="120" width="160" height="88" rx="16" fill="rgba(201,162,75,0.1)" stroke="rgba(232,207,148,0.35)" />
        <path d="M300 208l8 22-28-22" fill="rgba(201,162,75,0.1)" stroke="rgba(232,207,148,0.35)" />
        <path d="M198 150h100M198 168h70M198 186h48" stroke="rgba(255,255,255,0.28)" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <g>
        <circle cx="198" cy="82" r="16" fill="none" stroke={`url(#chat-lav)`} strokeWidth="1.8" />
        <circle cx="198" cy="82" r="4.5" fill={LAV} />
        <circle cx="222" cy="104" r="3" fill={GOLD_LIGHT} opacity="0.9" />
        <circle cx="235" cy="96" r="2" fill={GOLD_LIGHT} opacity="0.6" />
      </g>
      <rect x="266" y="48" width="52" height="30" rx="15" fill="rgba(232,207,148,0.12)" stroke="rgba(232,207,148,0.4)" />
      <path d="M280 63h8M294 63h8" stroke={GOLD_LIGHT} strokeWidth="2.4" strokeLinecap="round" />
    </Frame>
  );
}

export function ArtKnowledge(props: ArtProps) {
  return (
    <Frame id="kb" {...props}>
      <g>
        <path
          d="M90 78c26-12 54-12 80 0v112c-26-12-54-12-80 0z"
          fill="rgba(255,255,255,0.05)"
          stroke={LINE}
          strokeLinejoin="round"
        />
        <path
          d="M310 78c-26-12-54-12-80 0v112c26-12 54-12 80 0z"
          fill="rgba(201,162,75,0.08)"
          stroke={LINE}
          strokeLinejoin="round"
        />
        <path d="M170 78v112M230 78v112" stroke="rgba(232,207,148,0.35)" strokeWidth="1.4" />
        <g stroke="rgba(255,255,255,0.22)" strokeWidth="2.2" strokeLinecap="round">
          <path d="M112 108h44M112 126h44M112 144h30M112 162h38" />
          <path d="M244 108h44M244 126h30M244 144h44M244 162h24" />
        </g>
      </g>
      <path d="M200 54l7 14 15 2-11 11 3 15-14-7-14 7 3-15-11-11 15-2z" fill={`url(#kb-gold)`} opacity="0.9" />
      <circle cx="318" cy="78" r="4" fill={LAV} />
      <circle cx="82" cy="186" r="5" fill={GOLD} opacity="0.7" />
    </Frame>
  );
}

export function ArtAutomation(props: ArtProps) {
  return (
    <Frame id="auto" {...props}>
      <g stroke="rgba(232,207,148,0.35)" strokeWidth="1.6" fill="none">
        <path d="M200 130L116 86M200 130l84-44M200 130L116 188M200 130l84 58" />
      </g>
      <g fill="none" stroke={LINE} strokeWidth="1.4">
        <circle cx="104" cy="80" r="18" fill="rgba(255,255,255,0.04)" />
        <circle cx="298" cy="80" r="18" fill="rgba(255,255,255,0.04)" />
        <circle cx="104" cy="194" r="18" fill="rgba(255,255,255,0.04)" />
        <circle cx="298" cy="194" r="18" fill="rgba(255,255,255,0.04)" />
      </g>
      <circle cx="104" cy="80" r="5" fill={LAV} />
      <circle cx="298" cy="80" r="5" fill={GOLD} />
      <circle cx="104" cy="194" r="5" fill={GOLD} />
      <circle cx="298" cy="194" r="5" fill={LAV} />
      <circle cx="200" cy="130" r="30" fill="rgba(201,162,75,0.12)" stroke={`url(#auto-gold)`} strokeWidth="2" />
      <path d="M205 112l-16 20h11l-3 16 16-21h-11z" fill={`url(#auto-gold)`} />
      <circle cx="200" cy="130" r="44" fill="none" stroke="rgba(232,207,148,0.14)" strokeWidth="1" strokeDasharray="3 6" />
    </Frame>
  );
}

export function ArtReports(props: ArtProps) {
  const bars = [
    { x: 116, h: 44 },
    { x: 152, h: 68 },
    { x: 188, h: 56 },
    { x: 224, h: 88 },
    { x: 260, h: 74 },
  ];
  return (
    <Frame id="rep" {...props}>
      <path d="M96 58v146h212" fill="none" stroke={LINE} strokeWidth="1.4" />
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1="96" y1={90 + i * 34} x2="308" y2={90 + i * 34} stroke="rgba(255,255,255,0.06)" />
      ))}
      {bars.map((b, i) => (
        <rect
          key={b.x}
          x={b.x}
          y={204 - b.h}
          width="22"
          height={b.h}
          rx="5"
          fill={i === 3 ? `url(#rep-gold)` : "rgba(255,255,255,0.1)"}
          stroke={i === 3 ? "none" : LINE}
        />
      ))}
      <path
        d="M127 168l36-20 36 8 36-40 36 10"
        fill="none"
        stroke={LAV}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g fill={LAV}>
        <circle cx="127" cy="168" r="3.2" />
        <circle cx="163" cy="148" r="3.2" />
        <circle cx="199" cy="156" r="3.2" />
        <circle cx="235" cy="116" r="3.2" />
        <circle cx="271" cy="126" r="3.2" />
      </g>
      <rect x="252" y="66" width="56" height="26" rx="8" fill="rgba(201,162,75,0.14)" stroke="rgba(232,207,148,0.35)" />
      <path d="M264 79h14l5-7 5 14 5-7h6" fill="none" stroke={GOLD_LIGHT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

export function ArtSecurity(props: ArtProps) {
  return (
    <Frame id="sec" {...props}>
      <circle cx="200" cy="132" r="78" fill="none" stroke="rgba(232,207,148,0.14)" strokeWidth="1" strokeDasharray="4 8" />
      <circle cx="200" cy="132" r="58" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.2" />
      <path
        d="M200 72l46 18v34c0 30-20 50-46 62-26-12-46-32-46-62V90z"
        fill="rgba(201,162,75,0.1)"
        stroke={`url(#sec-gold)`}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="200" cy="124" r="12" fill="none" stroke={GOLD_LIGHT} strokeWidth="2" />
      <path d="M200 136v18" stroke={GOLD_LIGHT} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="278" cy="80" r="4" fill={LAV} />
      <circle cx="118" cy="190" r="4" fill={GOLD} />
      <circle cx="122" cy="74" r="2.5" fill={LAV} opacity="0.7" />
      <circle cx="286" cy="184" r="2.5" fill={GOLD} opacity="0.7" />
    </Frame>
  );
}

export function ArtEmpty(props: ArtProps) {
  return (
    <svg
      viewBox="0 0 200 140"
      role="img"
      aria-hidden="true"
      className="empty-art"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="empty-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={GOLD_LIGHT} />
          <stop offset="1" stopColor={GOLD} />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="120" rx="58" ry="8" fill="rgba(20,15,43,0.06)" />
      <rect x="46" y="52" width="108" height="58" rx="12" fill="none" stroke="#cfc6b5" strokeWidth="1.6" />
      <path d="M46 84h30l8 12h32l8-12h30" fill="none" stroke="#cfc6b5" strokeWidth="1.6" />
      <path d="M76 40h48" stroke="url(#empty-gold)" strokeWidth="2" strokeLinecap="round" />
      <path d="M86 30h28" stroke="#d8cfbf" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="100" cy="84" r="9" fill="none" stroke="url(#empty-gold)" strokeWidth="1.6" />
      <path d="M96 84l3 3 6-7" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M150 44l4-8 4 8 8 4-8 4-4 8-4-8-8-4z" fill="url(#empty-gold)" opacity="0.8" />
    </svg>
  );
}

export function HeroDecor(props: ArtProps) {
  return (
    <svg
      viewBox="0 0 600 600"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="hd-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={GOLD_LIGHT} stopOpacity="0.8" />
          <stop offset="1" stopColor={GOLD} stopOpacity="0" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#hd-gold)" strokeWidth="1">
        <circle cx="300" cy="300" r="120" />
        <circle cx="300" cy="300" r="190" />
        <circle cx="300" cy="300" r="260" />
      </g>
      <g fill={GOLD_LIGHT}>
        <circle cx="300" cy="110" r="2.5" />
        <circle cx="470" cy="300" r="2" />
        <circle cx="180" cy="410" r="2" />
        <circle cx="420" cy="430" r="2.5" />
        <circle cx="130" cy="230" r="1.8" />
      </g>
    </svg>
  );
}
