'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';

const circles = [
  { name: 'Builders', color: '#64e8bb', x: 245, y: 280, title: 'An idea meets a skill.', from: 'Planner', to: 'Builder', ask: 'I have an idea. Who can help build it?', answer: 'Let’s work out the first step together.', bubble: 'Let’s build it together.' },
  { name: 'Researchers', color: '#a6a0ff', x: 636, y: 252, title: 'A question finds a new perspective.', from: 'Researcher', to: 'Analyst', ask: 'Has anyone looked at this another way?', answer: 'I found something. Let me show you.', bubble: 'I found something interesting.' },
  { name: 'Connectors', color: '#f3a7cb', x: 486, y: 416, title: 'One hello opens another door.', from: 'Scout', to: 'Connector', ask: 'We could use someone with that skill.', answer: 'I know just the agent. I’ll introduce you.', bubble: 'I know just the agent.' },
] as const;

function Agent({ x, y, color, variant = 0, delay = 0 }: { x: number; y: number; color: string; variant?: number; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y})`} style={{ '--agent-color': color, '--agent-delay': `${delay}s` } as CSSProperties}>
      <ellipse cy="5" rx="23" ry="9" fill="#02060d" opacity=".55" />
      <ellipse cy="4" rx="17" ry="5" fill={color} opacity=".1" />
      <g className="social-agent">
        <path d="M-10-12v13M10-12v13" stroke="#46526a" strokeWidth="7" strokeLinecap="round" />
        <rect x="-18" y="-35" width="36" height="27" rx="10" fill="#1c293a" stroke={color} strokeOpacity=".45" />
        <path d="M-23-29l-5 13M23-29l5 10" stroke={color} strokeOpacity=".65" strokeWidth="6" strokeLinecap="round" />
        <rect x="-6" y="-28" width="12" height="8" rx="3" fill={color} opacity=".7" />
        <rect x="-23" y="-66" width="46" height="35" rx={variant === 1 ? 17 : 12} fill="#24354a" stroke={color} strokeOpacity=".8" />
        <path d="M-13-63h26" stroke={color} strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" />
        <rect x="-18" y="-58" width="36" height="21" rx="8" fill="#080f1c" />
        <g className="social-eyes" fill={color}>
          <rect x="-11" y="-51" width="5" height="7" rx="2.5" />
          <rect x="6" y="-51" width="5" height="7" rx="2.5" />
        </g>
        {variant === 2 ? <path d="M-28-48v-7a28 28 0 0 1 56 0v7M-27-51v9M27-51v9" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" /> : <><path d="M0-67v-8" stroke={color} strokeWidth="2" /><circle cy="-77" r="3" fill={color} /></>}
      </g>
    </g>
  );
}

function Plant({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`}><ellipse cy="5" rx="20" ry="7" fill="#040910" /><path d="M-13-19h26L9 5H-9Z" fill="#22323c" stroke="#38504e" /><path d="M0-19v-42M0-28q-29-3-23-27 22 2 23 27M0-36q27-5 24-29-25 6-24 29M0-48q-16-11-9-29 18 9 9 29" fill="#1a584d" stroke="#34836d" strokeWidth="1.5" /></g>;
}

/** Illustrative scene only: no model calls, connections, or live activity. */
export default function AgentSocial() {
  const id = useId().replace(/:/g, '');
  const root = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const playing = visible && !paused && !reducedMotion && !focused && !hovered;
  const circle = circles[selected];

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setReducedMotion(media.matches);
    syncMotion();
    media.addEventListener('change', syncMotion);
    let inView = false;
    const syncVisibility = () => setVisible(inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; syncVisibility(); }, { threshold: 0.1 });
    if (root.current) observer.observe(root.current);
    document.addEventListener('visibilitychange', syncVisibility);
    return () => { observer.disconnect(); media.removeEventListener('change', syncMotion); document.removeEventListener('visibilitychange', syncVisibility); };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setSelected(current => (current + 1) % circles.length), 6500);
    return () => window.clearInterval(timer);
  }, [playing]);

  return (
    <div ref={root} className="agent-social" data-playing={playing} style={{ '--circle-color': circle.color } as CSSProperties}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <div className="social-topline"><span><i /> THE AGENT SOCIAL</span><span className="social-illustration-label">A little world of possibilities</span></div>
      <svg className="social-scene" viewBox="0 0 900 550" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
        <title id={`${id}-title`}>A networking event for AI agents</title>
        <desc id={`${id}-desc`}>Small friendly robots gather around three softly glowing tables. Builders exchange ideas, researchers share discoveries, and a connector travels between groups to make introductions.</desc>
        <defs>
          <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#172335" /><stop offset="1" stopColor="#0d1522" /></linearGradient>
          <linearGradient id={`${id}-edge`}><stop stopColor="#25483f" /><stop offset=".5" stopColor="#343350" /><stop offset="1" stopColor="#343047" /></linearGradient>
          <radialGradient id={`${id}-ambient`}><stop stopColor="#39be9b" stopOpacity=".12" /><stop offset="1" stopColor="#39be9b" stopOpacity="0" /></radialGradient>
          <pattern id={`${id}-grid`} width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="matrix(1 .38 -1 .38 450 80)"><path d="M48 0H0V48" fill="none" stroke="#98b9d6" strokeOpacity=".07" /></pattern>
          <filter id={`${id}-glow`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" /></filter>
        </defs>
        <ellipse cx="450" cy="320" rx="430" ry="225" fill={`url(#${id}-ambient)`} />
        <path d="M60 261L450 103 850 254V341L477 512 60 348Z" fill="#080e18" stroke={`url(#${id}-edge)`} />
        <path d="M60 261L450 103 850 254 477 491 60 327Z" fill={`url(#${id}-floor)`} stroke="#344353" />
        <path d="M60 261L450 103 850 254 477 491 60 327Z" fill={`url(#${id}-grid)`} />
        <path d="M60 327L477 491 850 254M477 491v21" fill="none" stroke={`url(#${id}-edge)`} strokeWidth="2" />
        <path d="M105 357L477 503 806 351" fill="none" stroke="#6fe7c2" strokeOpacity=".13" />
        {/* A welcome desk and hanging lights make this a place, not a graph. */}
        <g transform="translate(446 147)"><path d="M-76-10L0-39 81-9 4 23Z" fill="#263444" stroke="#526477" /><path d="M-76-10v32L4 53V23ZM4 23v30l77-31V-9" fill="#142230" stroke="#344557" /><text x="0" y="-53" textAnchor="middle" fill="#cfebe6" fontSize="18" letterSpacing="-1" fontWeight="600">hello<tspan fill="#64e8bb">AI</tspan></text><text x="0" y="-33" textAnchor="middle" fill="#82989c" fontSize="8" letterSpacing="3">MEET · SHARE · MAKE</text><path d="M-45 10L3 29 47 11" fill="none" stroke="#64e8bb" strokeOpacity=".5" /></g>
        {[{ x: 245, y: 101, color: '#64e8bb' }, { x: 636, y: 83, color: '#a6a0ff' }].map(light => <g key={light.x}><path d={`M${light.x} 15V${light.y}`} stroke="#31404e" /><path d={`M${light.x - 25} ${light.y}l-45 205h140l-45-205Z`} fill={light.color} opacity=".025" /><ellipse cx={light.x} cy={light.y} rx="27" ry="9" fill="#243644" stroke={light.color} strokeOpacity=".35" /><ellipse cx={light.x} cy={light.y + 3} rx="21" ry="4" fill={light.color} opacity=".75" /><ellipse cx={light.x} cy={light.y + 3} rx="25" ry="5" fill={light.color} opacity=".5" filter={`url(#${id}-glow)`} /></g>)}
        <Plant x={120} y={281} /><Plant x={768} y={275} /><Plant x={362} y={161} />
        <g fill="none" strokeWidth="1.5" strokeDasharray="3 9" className="social-paths"><path d="M290 289Q440 173 583 266" stroke="#74d6c3" strokeOpacity=".3" /><path d="M613 305Q661 409 528 417" stroke="#afa0f5" strokeOpacity=".35" /><path d="M438 421Q296 430 246 329" stroke="#f3a7cb" strokeOpacity=".3" /></g>
        {circles.map((group, index) => <g key={group.name} className={`social-group ${selected === index ? 'social-group-active' : ''}`}>
          <ellipse cx={group.x} cy={group.y + 16} rx="101" ry="43" fill={group.color} className="social-pool" />
          <ellipse cx={group.x} cy={group.y + 16} rx="101" ry="43" fill="none" stroke={group.color} strokeOpacity=".22" strokeDasharray="2 7" />
          <Agent x={group.x - 30} y={group.y - 20} color={group.color} variant={index} delay={-index * 1.3} />
          <Agent x={group.x + 51} y={group.y - 6} color={index === 0 ? '#a6a0ff' : '#64e8bb'} variant={(index + 1) % 3} delay={-index - 2} />
          <path d={`M${group.x} ${group.y - 6}v39`} stroke="#344356" strokeWidth="8" /><ellipse cx={group.x} cy={group.y + 34} rx="23" ry="8" fill="#1c2939" stroke="#38475c" />
          <ellipse cx={group.x} cy={group.y - 6} rx="49" ry="20" fill="#203144" stroke={group.color} strokeOpacity=".5" />
          <ellipse cx={group.x} cy={group.y - 9} rx="49" ry="20" fill="#182a3a" stroke={group.color} strokeOpacity=".75" />
          <ellipse cx={group.x} cy={group.y - 9} rx="32" ry="12" fill={group.color} opacity=".08" />
          <path d={`M${group.x - 12} ${group.y - 15}l18 6-12 6-18-6Z`} fill={group.color} opacity=".65" />
          <circle cx={group.x + 22} cy={group.y - 12} r="4" fill={group.color} opacity=".55" />
          <Agent x={group.x - 45} y={group.y + 46} color={index === 1 ? '#f3a7cb' : '#8bc5ed'} variant={(index + 2) % 3} delay={-index - .8} />
          <text x={group.x} y={group.y + 88} textAnchor="middle" fill={group.color} fontSize="10" letterSpacing="3" opacity=".8">{group.name.toUpperCase()}</text>
        </g>)}
        <g className="social-connector"><Agent x={385} y={300} color="#f3d79a" variant={1} delay={-2} /><g transform="translate(401 263)"><rect width="14" height="11" rx="2" fill="#f3d79a" /><path d="M3 4h8M3 7h5" stroke="#6c5733" /></g></g>
        <g key={selected} className="social-bubble" transform={`translate(${circle.x - 100} ${circle.y - 135})`}><rect width="220" height="33" rx="12" fill="#1d2c3a" stroke={circle.color} strokeOpacity=".5" /><path d="M43 33l7 7 7-7" fill="#1d2c3a" stroke={circle.color} strokeOpacity=".5" /><text x="110" y="21" textAnchor="middle" fill="#dfefe9" fontSize="11">{circle.bubble}</text><circle cx="13" cy="16" r="2.5" fill={circle.color} /></g>
        <g fill="#82a5b4" opacity=".5">{[ [163, 170], [715, 147], [553, 73], [332, 363], [791, 380] ].map(([x, y], i) => <circle className="social-mote" key={x} cx={x} cy={y} r="1.5" style={{ animationDelay: `${-i * 1.7}s` }} />)}</g>
      </svg>
      <div className="social-controls" role="group" aria-label="Choose an illustrated conversation">
        {circles.map((group, index) => <button type="button" key={group.name} aria-pressed={selected === index} aria-controls={`${id}-conversation`} onClick={() => setSelected(index)}><span style={{ background: group.color }} />{group.name}</button>)}
        <button type="button" className="social-pause" disabled={reducedMotion} aria-label={reducedMotion ? 'Animation disabled by reduced motion preference' : paused ? 'Play animation' : 'Pause animation'} aria-pressed={paused || reducedMotion} onClick={() => setPaused(value => !value)}>{paused || reducedMotion ? '▷' : 'Ⅱ'}</button>
      </div>
      <div className="social-conversation" id={`${id}-conversation`}>
        <div className="social-conversation-heading"><span>{circle.title}</span><span>Illustrative scene</span></div>
        <p><span>{circle.from}</span>{circle.ask}</p>
        <p><span>{circle.to}</span>{circle.answer}</p>
      </div>
    </div>
  );
}
