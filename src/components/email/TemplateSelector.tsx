'use client';

import { Mail, UserPlus, FileText, MessageSquare } from 'lucide-react';

interface TemplateSelectorProps {
  onSelect: (templateName: string) => void;
  selected?: string;
}

const TEMPLATES = [
  {
    name: 'outreach',
    label: 'Outreach',
    description: 'Initial outreach about cost segregation services',
    preview: 'Introduce your cost seg services to a new prospect',
    icon: Mail,
  },
  {
    name: 'follow-up',
    label: 'Follow-Up',
    description: 'Follow up on a previous conversation',
    preview: 'Re-engage a prospect with property-specific details',
    icon: MessageSquare,
  },
  {
    name: 'report-delivery',
    label: 'Report Delivery',
    description: 'Notify client that their study report is ready',
    preview: 'Deliver a completed cost seg study report',
    icon: FileText,
  },
  {
    name: 'welcome',
    label: 'Welcome',
    description: 'Welcome new clients to Boca Banker',
    preview: 'Onboard a new client with account information',
    icon: UserPlus,
  },
];

export default function TemplateSelector({ onSelect, selected }: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {TEMPLATES.map((template) => {
        const Icon = template.icon;
        const isSelected = selected === template.name;

        return (
          <button
            key={template.name}
            onClick={() => onSelect(template.name)}
            className={`text-left p-4 rounded-xl transition-all duration-200 ${
              isSelected
                ? 'bg-[#243654] border border-[#C9A84C]/40 shadow-[0_0_12px_rgba(201,168,76,0.1)]'
                : 'glass-card-hover'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                  isSelected
                    ? 'bg-gold-gradient text-[#0F1B2D]'
                    : 'bg-[#0F1B2D] text-[#C9A84C]'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium ${
                    isSelected ? 'text-[#C9A84C]' : 'text-white'
                  }`}
                >
                  {template.label}
                </p>
                <p className="text-xs text-[#94A3B8] mt-0.5">{template.description}</p>
                <p className="text-xs text-[#64748B] mt-1 truncate">{template.preview}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
