import logo from "@/assets/logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const sizes = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10",
};

const textSizes = {
  sm: "text-sm",
  md: "text-xl",
  lg: "text-2xl",
};

const Logo = ({ size = "md", showText = true }: LogoProps) => (
  <div className="flex items-center gap-2">
    <img src={logo} alt="EnsinaPay" className={sizes[size]} />
    {showText && (
      <span className={`font-bold text-foreground font-display ${textSizes[size]}`}>EnsinaPay</span>
    )}
  </div>
);

export default Logo;
