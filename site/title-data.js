'use strict';
/* Shared presentation only. Ownership and equipped titles are checked by the server. */
const PLAYER_TITLES = [
  { id: 'owner', name: 'Owner', icon: '♛', color: '#ffce66', tone: 'gold', hint: 'Reserved for the game creator.' },
  { id: 'admin', name: 'Admin', icon: '◆', color: '#c7a0ff', tone: 'violet', hint: 'Reserved for game admins.' },
  { id: 'collab', name: 'Collaborator', icon: '✦', color: '#68e0da', tone: 'teal', hint: 'An account with the Collab role. This title gives no powers.' },
  { id: 'first-victory', name: 'First Victory', icon: '⚑', color: '#ffb547', tone: 'coral', hint: 'Win a normal Boss Fight. Test runs do not count.' },
  { id: 'legend-slayer', name: 'Legend Slayer', icon: 'ϟ', color: '#f29dff', tone: 'violet', hint: 'Defeat Boss Fight level 10 in a normal run.' },
  { id: 'boss-master', name: 'Boss Master', icon: '✹', color: '#ff8a73', tone: 'coral', hint: 'Defeat Boss Fight level 30 in a normal run.' },
  { id: 'arena-regular', name: 'Arena Regular', icon: '✧', color: '#68e0da', tone: 'teal', hint: 'Complete 25 server-verified online matches or Boss Fights after titles launch.' },
  { id: 'top-ten', name: 'Top Ten', icon: '★', color: '#a9c9ff', tone: 'blue', hint: 'Currently in the monthly season’s top 10. Updates when standings change.' },
  { id: 'season-leader', name: 'Season Leader', icon: '♜', color: '#ffce66', tone: 'gold', hint: 'Currently #1 this month. Changes hands with the lead.' },
  { id: 'season-champion', name: 'Season Champion', icon: '♛', color: '#ffce66', tone: 'champion', hint: 'Finish #1 in a completed monthly season. Kept permanently.' }
];
const playerTitle = id => PLAYER_TITLES.find(t => t.id === id);
