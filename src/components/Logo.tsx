/**
 * Green Square logo — official mark downloaded from green-square.eu.
 * The artwork has a solid green (#07642c) background that matches the header,
 * so the square blends into the green nav bar seamlessly.
 */
export function Logo({ className = '' }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/greensquare-logo.png"
      alt="Green Square — Food Stuff Trading"
      className={`h-12 w-auto object-contain ${className}`}
    />
  );
}
