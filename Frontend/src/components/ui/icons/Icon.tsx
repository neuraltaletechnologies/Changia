import { Icons } from './icons';

type IconProps = {
  name: string;
  className?: string;
};

interface IconDef {
  paths?: { d: string; class?: string }[];
  class?: string;
  width?: number | string;
  height?: number | string;
  viewBox?: string;
  fill?: string;
  clipRule?: 'evenodd' | 'inherit' | 'nonzero' | undefined;
  fillRule?: 'evenodd' | 'inherit' | 'nonzero' | undefined;
  stroke?: string;
  strokeWidth?: number | string;
  strokeLinecap?: 'butt' | 'round' | 'square' | 'inherit' | undefined;
  strokeLinejoin?: 'round' | 'inherit' | 'miter' | 'bevel' | undefined;
  title?: string;
}

export default function Icon({ name, className }: IconProps) {
  const icon = (Icons as Record<string, IconDef>)[name];

  if (!icon) return <span>Icon not found</span>;

  return (
    <svg
      className={className ?? icon.class}
      width={icon.width}
      height={icon.height}
      viewBox={icon.viewBox}
      fill={icon.fill}
      clipRule={icon.clipRule}
      fillRule={icon.fillRule}
      stroke={icon.stroke}
      strokeWidth={icon.strokeWidth}
      strokeLinecap={icon.strokeLinecap}
      strokeLinejoin={icon.strokeLinejoin}
    >
      {icon.title ? <title>{icon.title}</title> : null}
      {icon.paths?.map((p, i) => (
        <path key={i} d={p.d} className={p.class || ''} />
      ))}
    </svg>
  );
}
