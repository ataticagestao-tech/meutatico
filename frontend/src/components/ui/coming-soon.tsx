"use client";

import { Construction } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description?: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-4 rounded-full bg-amber-50 dark:bg-amber-900/20 mb-4">
        <Construction size={40} className="text-amber-500" />
      </div>
      <h2 className="text-xl font-semibold text-foreground-primary mb-2">{title}</h2>
      <p className="text-sm text-foreground-tertiary max-w-md">
        {description || "Este módulo está em desenvolvimento e será disponibilizado em breve."}
      </p>
    </div>
  );
}
