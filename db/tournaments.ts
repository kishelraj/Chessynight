import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const tournaments = sqliteTable('tournaments', {
  id:text('id').primaryKey(), title:text('title').notNull(), startAt:integer('start_at').notNull(),
  venue:text('venue').notNull(), capacity:integer('capacity').notNull(),
  published:integer('published').notNull().default(0), registrationOpen:integer('registration_open').notNull().default(0),
  details:text('details').notNull(), updated:integer('updated').notNull(),
},t=>[index('idx_tournaments_published_start').on(t.published,t.startAt)]);
export const tournamentEntries = sqliteTable('tournament_entries', {
  id:text('id').primaryKey(), tournamentId:text('tournament_id').notNull().references(()=>tournaments.id),
  name:text('name').notNull(), email:text('email').notNull(), phone:text('phone'), rating:integer('rating'),
  checkedIn:integer('checked_in'), created:integer('created').notNull(),
},t=>[uniqueIndex('idx_tournament_entries_email').on(t.tournamentId,t.email)]);
