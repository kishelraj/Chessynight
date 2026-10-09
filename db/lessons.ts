import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const lessons = sqliteTable('lessons', {
  id:text('id').primaryKey(), title:text('title').notNull(), startAt:integer('start_at').notNull(),
  venue:text('venue').notNull(), capacity:integer('capacity').notNull(),
  published:integer('published').notNull().default(0), registrationOpen:integer('registration_open').notNull().default(0),
  details:text('details').notNull(), updated:integer('updated').notNull(),
},t=>[index('idx_lessons_published_start').on(t.published,t.startAt)]);
export const lessonEntries = sqliteTable('lesson_entries', {
  id:text('id').primaryKey(), lessonId:text('lesson_id').notNull().references(()=>lessons.id),
  name:text('name').notNull(), email:text('email').notNull(), phone:text('phone'), experience:text('experience').notNull(),
  checkedIn:integer('checked_in'), created:integer('created').notNull(),
},t=>[uniqueIndex('idx_lesson_entries_email').on(t.lessonId,t.email)]);
