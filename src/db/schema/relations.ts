import { relations } from 'drizzle-orm';
import { users } from './users';
import { clients } from './clients';
import { properties } from './properties';
import { costSegStudies } from './cost-seg-studies';
import { studyAssets } from './study-assets';
import { chatConversations } from './chat-conversations';
import { chatMessages } from './chat-messages';
import { documents } from './documents';
import { emailLogs } from './email-logs';
import { leads } from './leads';
import { loans } from './loans';
import { userSettings } from './user-settings';

export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  properties: many(properties),
  costSegStudies: many(costSegStudies),
  chatConversations: many(chatConversations),
  documents: many(documents),
  emailLogs: many(emailLogs),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, {
    fields: [clients.userId],
    references: [users.id],
  }),
  properties: many(properties),
  costSegStudies: many(costSegStudies),
  documents: many(documents),
  emailLogs: many(emailLogs),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  client: one(clients, {
    fields: [properties.clientId],
    references: [clients.id],
  }),
  user: one(users, {
    fields: [properties.userId],
    references: [users.id],
  }),
  costSegStudies: many(costSegStudies),
}));

export const costSegStudiesRelations = relations(costSegStudies, ({ one, many }) => ({
  property: one(properties, {
    fields: [costSegStudies.propertyId],
    references: [properties.id],
  }),
  client: one(clients, {
    fields: [costSegStudies.clientId],
    references: [clients.id],
  }),
  user: one(users, {
    fields: [costSegStudies.userId],
    references: [users.id],
  }),
  studyAssets: many(studyAssets),
  documents: many(documents),
}));

export const studyAssetsRelations = relations(studyAssets, ({ one }) => ({
  study: one(costSegStudies, {
    fields: [studyAssets.studyId],
    references: [costSegStudies.id],
  }),
}));

export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [chatConversations.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [documents.clientId],
    references: [clients.id],
  }),
  study: one(costSegStudies, {
    fields: [documents.studyId],
    references: [costSegStudies.id],
  }),
}));

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  user: one(users, {
    fields: [emailLogs.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [emailLogs.clientId],
    references: [clients.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  user: one(users, { fields: [leads.userId], references: [users.id] }),
}));

export const loansRelations = relations(loans, ({ one }) => ({
  user: one(users, { fields: [loans.userId], references: [users.id] }),
  lead: one(leads, { fields: [loans.leadId], references: [leads.id] }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, { fields: [userSettings.userId], references: [users.id] }),
}));
