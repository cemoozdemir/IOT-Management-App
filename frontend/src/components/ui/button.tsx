import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "destructive" | "link";
};

export const Button: React.FC<ButtonProps> = ({
  variant = "default",
  className,
  ...props
}) => {
  const base = "px-4 py-2 rounded text-sm font-medium transition";
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-400 text-gray-700 hover:bg-gray-100",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    link: "bg-transparent text-blue-600 underline hover:text-blue-800",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className || ""}`}
      {...props}
    />
  );
};
