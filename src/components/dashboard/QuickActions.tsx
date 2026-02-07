'use client';

import Link from 'next/link';
import {
  UserPlus,
  Building2,
  FileText,
  Mail,
  Calculator,
  MessageSquare,
} from 'lucide-react';

const ACTIONS = [
  {
    label: 'New Client',
    icon: UserPlus,
    href: '/clients?action=new',
    description: 'Add a new client',
  },
  {
    label: 'New Property',
    icon: Building2,
    href: '/properties?action=new',
    description: 'Add a property',
  },
  {
    label: 'New Study',
    icon: FileText,
    href: '/studies?action=new',
    description: 'Start a cost seg study',
  },
  {
    label: 'Send Email',
    icon: Mail,
    href: '/email',
    description: 'Compose an email',
  },
  {
    label: 'Open Calculator',
    icon: Calculator,
    href: '/calculators',
    description: 'Run calculations',
  },
  {
    label: 'Chat with Banker',
    icon: MessageSquare,
    href: '/chat',
    description: 'AI-powered advisor',
  },
];

export default function QuickActions() {
  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} href={action.href}>
              <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-amber-200 transition-all p-4 text-center group cursor-pointer h-full">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 mx-auto mb-3 group-hover:bg-amber-100 transition-colors">
                  <Icon className="h-5 w-5 text-amber-600" />
                </div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-amber-600 transition-colors">
                  {action.label}
                </p>
                <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                  {action.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
