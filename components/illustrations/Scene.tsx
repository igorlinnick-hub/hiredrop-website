import Image from "next/image";

export type SceneName = "welcome" | "setup" | "search" | "tailored" | "apply" | "safe";

interface Props {
  name: SceneName;
  size?: number;
  className?: string;
  priority?: boolean;
}

/**
 * Human scene illustration (generated via Replicate/Recraft — see
 * scripts/gen_illustrations.py). Monoline, brand purple, white background so it
 * sits seamlessly on white surfaces/cards.
 */
export function Scene({ name, size = 200, className, priority }: Props) {
  return (
    <Image
      src={`/illustrations/scenes/${name}.png`}
      alt=""
      width={size}
      height={size}
      className={className}
      priority={priority}
      unoptimized
    />
  );
}
