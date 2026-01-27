"use client";

import React from 'react';
import { AddTopicDialog } from '@/components/AddTopicDialog';
import { ThemeToggle } from '@/components/ThemeToggle';

export const Header: React.FC = () => {
  return (
    <header className="w-full py-4 px-4 sm:px-8 bg-background border-b border-border shadow-sm flex items-center justify-between sticky top-0 z-40">
      <AddTopicDialog />
      <ThemeToggle />
    </header>
  );
};