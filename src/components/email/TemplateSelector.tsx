'use client';

import { Mail, FileText, MessageSquare } from 'lucide-react';

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
                ? 'bg-amber-50 border border-amber-300 shadow-sm'
                : 'bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-amber-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white'
                    : 'bg-gray-50 text-amber-600'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium ${
                    isSelected ? 'text-amber-600' : 'text-gray-900'
                  }`}
                >
                  {template.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                <p className="text-xs text-gray-400 mt-1 truncate">{template.preview}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
