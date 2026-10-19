function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export function Avatar({
  name,
  size = "md",
  title,
}: {
  name: string;
  size?: "md" | "lg";
  title?: string;
}) {
  const h = hue(name || "?");
  return (
    <span
      className={`avatar${size === "lg" ? " lg" : ""}`}
      title={title ?? name}
      style={{
        background: `linear-gradient(135deg, hsl(${h} 70% 52%), hsl(${(h + 40) % 360} 72% 42%))`,
      }}
    >
      {initials(name)}
    </span>
  );
}
