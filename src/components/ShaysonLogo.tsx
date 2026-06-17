interface LogoProps {
  size?: number;
  className?: string;
}

export default function ShaysonLogo({ size = 32, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* House roof / chevron */}
      <path
        d="M50 8L15 40h15V90h40V40h15L50 8z"
        fill="currentColor"
        opacity="0.08"
      />
      {/* Stylized S */}
      <path
        d="M62 28H42c-7.7 0-14 6.3-14 14 0 7.7 6.3 14 14 14h16c4.4 0 8 3.6 8 8s-3.6 8-8 8H38"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      {/* Top serif / roof peak */}
      <path
        d="M50 12L35 26h30L50 12z"
        fill="currentColor"
      />
    </svg>
  );
}
