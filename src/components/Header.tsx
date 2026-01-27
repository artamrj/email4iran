"use client";

import React from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AddTopicDialog } from '@/components/AddTopicDialog';
import { Link } from 'react-router-dom';

export const Header: React.FC = () => {
  return (
    <header className="w-full bg-card shadow-sm border-b border-border py-4 px-4 sm:px-8 flex items-center justify-between rounded-b-xl">
      <div className="flex items-center gap-4">
        <AddTopicDialog />
      </div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
      </div>
    </header>
  );
};