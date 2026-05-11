import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Hello, AI — Your Unbiased Guide to the World\'s Smartest AIs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#080A12',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Subtle grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(0,229,160,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,160,0.04) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Glow accent */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '400px',
            background: 'radial-gradient(ellipse, rgba(0,229,160,0.15) 0%, transparent 70%)',
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #00E5A0, #6366F1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
            }}
          >
            🤖
          </div>
          <span style={{ color: '#00E5A0', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            Hello, AI
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            color: '#FFFFFF',
            fontSize: '56px',
            fontWeight: 800,
            textAlign: 'center',
            lineHeight: 1.15,
            maxWidth: '860px',
            letterSpacing: '-1px',
          }}
        >
          Your Unbiased Guide to the{' '}
          <span style={{ color: '#00E5A0' }}>World&apos;s Smartest AIs</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            color: '#8B9CB6',
            fontSize: '22px',
            marginTop: '24px',
            textAlign: 'center',
            maxWidth: '680px',
            lineHeight: 1.5,
          }}
        >
          Honest leaderboards · Weekly analysis · No hype
        </div>

        {/* Model pills */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '48px',
          }}
        >
          {[
            { name: 'Claude', color: '#CC785C' },
            { name: 'Gemini', color: '#4285F4' },
            { name: 'GPT', color: '#10A37F' },
            { name: 'Grok', color: '#E7E7E7' },
          ].map((model) => (
            <div
              key={model.name}
              style={{
                padding: '8px 20px',
                borderRadius: '999px',
                border: `1px solid ${model.color}40`,
                background: `${model.color}12`,
                color: model.color,
                fontSize: '16px',
                fontWeight: 600,
              }}
            >
              {model.name}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            color: '#4A5568',
            fontSize: '16px',
            letterSpacing: '0.5px',
          }}
        >
          helloai.com
        </div>
      </div>
    ),
    { ...size }
  );
}
