import { Icon, type IconName } from "@/components/Icon";

// Illustrative, data-free hero artwork: an abstract support conversation that
// resolves through automation and the knowledge base. Deliberately contains no
// metrics, ticket ids or customer names — it is decoration, not a screenshot.

function Chip({
  icon,
  label,
  className,
}: {
  icon: IconName;
  label: string;
  className: string;
}) {
  return (
    <span className={`hv-chip ${className}`}>
      <span className="hv-chip__ic">
        <Icon name={icon} />
      </span>
      {label}
    </span>
  );
}

export function HeroVisual() {
  return (
    <div className="hv reveal delay-2" aria-hidden="true">
      <span className="hv-glow" />

      <svg className="hv-svg" viewBox="0 0 520 420" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="hv-panel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1b1438" />
            <stop offset="1" stopColor="#0b0818" />
          </linearGradient>
          <linearGradient id="hv-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e8cf94" />
            <stop offset="1" stopColor="#c9a24b" />
          </linearGradient>
          <linearGradient id="hv-lav" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a5b4fc" />
            <stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
          <radialGradient id="hv-glowGrad" cx="0.5" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#c9a24b" stopOpacity="0.32" />
            <stop offset="1" stopColor="#c9a24b" stopOpacity="0" />
          </radialGradient>
          <pattern id="hv-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0H0V28" fill="none" stroke="rgba(232,207,148,0.07)" strokeWidth="1" />
          </pattern>
        </defs>

        <rect x="40" y="34" width="440" height="352" rx="24" fill="url(#hv-panel)" />
        <rect x="40" y="34" width="440" height="352" rx="24" fill="url(#hv-grid)" />
        <rect x="40" y="34" width="440" height="352" rx="24" fill="url(#hv-glowGrad)" />
        <rect
          x="40"
          y="34"
          width="440"
          height="352"
          rx="24"
          fill="none"
          stroke="rgba(232,207,148,0.2)"
        />

        {/* window chrome */}
        <g>
          <circle cx="72" cy="66" r="4.5" fill="#e8cf94" />
          <circle cx="90" cy="66" r="4.5" fill="rgba(255,255,255,0.22)" />
          <circle cx="108" cy="66" r="4.5" fill="rgba(255,255,255,0.22)" />
          <rect x="300" y="58" width="148" height="16" rx="8" fill="rgba(255,255,255,0.05)" />
        </g>
        <line x1="40" y1="88" x2="480" y2="88" stroke="rgba(255,255,255,0.08)" />

        {/* conversation bubbles */}
        <g className="hv-bubble hv-bubble--1">
          <rect x="70" y="112" width="156" height="60" rx="14" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)" />
          <path d="M96 130h100M96 148h70" stroke="rgba(232,207,148,0.55)" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="hv-bubble hv-bubble--2">
          <rect x="150" y="186" width="170" height="64" rx="14" fill="rgba(201,162,75,0.12)" stroke="rgba(232,207,148,0.36)" />
          <path d="M176 208h116M176 226h84" stroke="rgba(255,255,255,0.3)" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="hv-bubble hv-bubble--3">
          <rect x="70" y="264" width="140" height="56" rx="14" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)" />
          <path d="M96 282h88M96 300h56" stroke="rgba(165,180,252,0.6)" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* typing indicator */}
        <g className="hv-typing">
          <circle cx="336" cy="278" r="4" fill="#e8cf94" />
          <circle cx="352" cy="278" r="4" fill="#e8cf94" />
          <circle cx="368" cy="278" r="4" fill="#e8cf94" />
        </g>

        {/* automation node */}
        <g className="hv-node hv-node--a">
          <circle cx="392" cy="150" r="30" fill="rgba(201,162,75,0.12)" stroke="url(#hv-gold)" strokeWidth="2" />
          <path d="M397 132l-16 20h11l-3 16 16-21h-11z" fill="url(#hv-gold)" />
        </g>
        {/* knowledge node */}
        <g className="hv-node hv-node--b">
          <circle cx="392" cy="238" r="30" fill="rgba(165,180,252,0.12)" stroke="url(#hv-lav)" strokeWidth="2" />
          <path
            d="M378 226c8-4 20-4 28 0v24c-8-4-20-4-28 0z"
            fill="none"
            stroke="#a5b4fc"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </g>

        {/* flowing connectors */}
        <path
          className="hv-flow"
          d="M230 142C300 142 320 150 362 150"
          fill="none"
          stroke="rgba(232,207,148,0.5)"
          strokeWidth="2"
          strokeDasharray="6 8"
          strokeLinecap="round"
        />
        <path
          className="hv-flow"
          d="M226 212C300 212 320 238 362 238"
          fill="none"
          stroke="rgba(165,180,252,0.5)"
          strokeWidth="2"
          strokeDasharray="6 8"
          strokeLinecap="round"
        />

        {/* pulse rings */}
        <circle className="hv-ring" cx="392" cy="150" r="30" fill="none" stroke="rgba(232,207,148,0.5)" strokeWidth="1.2" />
        <circle className="hv-ring hv-ring--b" cx="392" cy="238" r="30" fill="none" stroke="rgba(165,180,252,0.5)" strokeWidth="1.2" />

        {/* sparkles */}
        <g fill="#e8cf94">
          <circle className="hv-spark hv-spark--1" cx="120" cy="96" r="2.4" />
          <circle className="hv-spark hv-spark--2" cx="452" cy="120" r="2" />
          <circle className="hv-spark hv-spark--3" cx="88" cy="356" r="2.2" />
          <circle className="hv-spark hv-spark--4" cx="436" cy="348" r="2" />
        </g>
      </svg>

      <Chip icon="chat" label="Live chat" className="hv-chip--a" />
      <Chip icon="bolt" label="Automation" className="hv-chip--b" />
      <Chip icon="book" label="Knowledge base" className="hv-chip--c" />
    </div>
  );
}
