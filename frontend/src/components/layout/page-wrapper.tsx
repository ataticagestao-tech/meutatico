"use client";

import { Breadcrumb } from "./breadcrumb";

interface PageWrapperProps {
  title: string;
  breadcrumb?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function PageWrapper({ title, breadcrumb, actions, children }: PageWrapperProps) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6">
        {breadcrumb && (
          <div className="mb-4">
            <Breadcrumb items={breadcrumb} />
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground-primary">{title}</h1>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
