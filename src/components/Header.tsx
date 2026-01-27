"use client";

import React from 'react';
import { AddTopicDialog } from '@/components/AddTopicDialog';
import { ThemeToggle } from '@/components/ThemeToggle';

const Header: React.FC = () => {
  return (
    <header className="w-full bg-card text-card-foreground p-4 shadow-sm border-b border-border">
      <div className="container mx-auto max-w-6xl flex items-center justify-between">
        <AddTopicDialog />
        <ThemeToggle />
      </div>
    </header>
  );
};

export default Header;