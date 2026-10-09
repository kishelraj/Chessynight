import {readFile} from 'node:fs/promises';
export async function renderPublic(){
  return (await readFile('worker/page.html','utf8'))
    .replace('/* TOURNAMENT_STYLES */',await readFile('worker/tournaments.css','utf8'))
    .replace('/* TOURNAMENT_PUBLIC */',await readFile('worker/tournament-public.js','utf8'));
}
export async function renderAdmin(publicPage){
  const theme=publicPage.match(/<style>([\s\S]*?)<\/style>/)[1];
  return (await readFile('worker/admin.html','utf8'))
    .replace(/<style id="club-theme">[\s\S]*?<\/style>/,'<style id="club-theme">'+theme+'</style>')
    .replace('/* TOURNAMENT_ADMIN */',await readFile('worker/tournament-admin.js','utf8'));
}
