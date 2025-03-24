import React from "react";

export const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white rounded-xl shadow p-4">{children}</div>
);

export const CardHeader: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div className="mb-2 text-lg font-semibold">{children}</div>;

export const CardTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <h3 className="text-lg font-bold">{children}</h3>;

export const CardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => <div className={className}>{children}</div>;
