"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-foreground-secondary">
      <Link href="/dashboard" className="hover:text-foreground-primary transition-colors">
        <Home size={16} />
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <ChevronRight size={14} className="text-foreground-tertiary" />
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground-primary transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground-primary font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
