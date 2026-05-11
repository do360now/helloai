const PATHS: Record<string, string> = {
  trophy: 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6m12 5h1.5a2.5 2.5 0 0 0 0-5H18M9 21h6m-3-3v3M7 4h10l-1 8a4 4 0 0 1-8 0L7 4z',
  code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  science: 'M9 3v7.4A4 4 0 0 0 7 14a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4 4 4 0 0 0-2-3.6V3M9 3h6M12 14v.01',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z',
};

export default function CategoryIcon({ icon, color }: { icon: string; color: string }) {
  return (
    <div
      className="category-icon"
      style={{ background: `${color}12`, borderColor: `${color}25` }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={PATHS[icon] || PATHS.chat} />
      </svg>
    </div>
  );
}
