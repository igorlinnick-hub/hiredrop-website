import Image from "next/image";

export type SceneName = "welcome" | "setup" | "search" | "tailored" | "apply" | "safe";

interface Props {
  name: SceneName;
  size?: number;
  className?: string;
  priority?: boolean;
}

// welcome / setup / tailored are Drop (the HireDrop character) from brand/drop-kit;
// the rest are still the older monoline scenes until they're moved over too.
const DROP_SCENES: Partial<Record<SceneName, string>> = {
  welcome: "/illustrations/drop/welcome.webp",
  setup: "/illustrations/drop/setup.webp",
  tailored: "/illustrations/drop/tailor.webp",
};

/**
 * Scene illustration on a white background so it sits seamlessly on white
 * surfaces/cards. Drop scenes come from brand/drop-kit (white, 720px).
 */
export function Scene({ name, size = 200, className, priority }: Props) {
  return (
    <Image
      src={DROP_SCENES[name] ?? `/illustrations/scenes/${name}.png`}
      alt=""
      width={size}
      height={size}
      className={className}
      priority={priority}
      unoptimized
    />
  );
}
