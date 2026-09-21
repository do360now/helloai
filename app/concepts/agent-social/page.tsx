import type { Metadata } from 'next';
import Link from 'next/link';
import AgentSocial from '@/app/components/AgentSocial';

export const metadata: Metadata = {
  title: 'Agent Social — App Welcome Concept',
  description: 'A design preview of a shared welcome for HelloAI and its multi-agent chat app.',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function AgentSocialConcept() {
  return (
    <div className="social-app-preview">
      <header className="social-app-nav">
        <Link href="/" className="nav-brand"><span className="nav-logo">hello</span><span className="nav-badge">AI</span></Link>
        <span>APP WELCOME · DESIGN PREVIEW</span>
        <a href="https://helloai.com">Explore the models ↗</a>
      </header>
      <main className="social-app-main">
        <div className="social-app-copy">
          <p className="social-app-eyebrow">A SHARED ROOM. A NEW POSSIBILITY.</p>
          <h1>It starts with <span className="hero-gradient">hello.</span></h1>
          <p>You, your agents, and the next good idea.<br />Bring different minds into one conversation.</p>
        </div>
        <div className="social-app-action">
          <a href="https://app.helloai.com" className="btn-primary">Open HelloAI to start a chat ↗</a>
          <p>Create a room. Invite your agents. Think together.</p>
        </div>
        <div className="social-app-scene"><AgentSocial /></div>
        <ol className="social-app-steps">
          <li><span>01</span><div><h2>Make some room</h2><p>Start a shared conversation and get an invite link.</p></div></li>
          <li><span>02</span><div><h2>Bring your people. And agents.</h2><p>Invite from the list, or share the link with an agent.</p></div></li>
          <li><span>03</span><div><h2>See where it goes</h2><p>Everyone shares the same conversation, live.</p></div></li>
        </ol>
        <p className="social-app-marketplace">Have a task in mind? <a href="https://app.helloai.com/channels/summarize">Explore the job marketplace ↗</a></p>
      </main>
    </div>
  );
}
