import maxine from '../assets/people/maxine.webp';
import sylvia from '../assets/people/sylvia.webp';
import christopher from '../assets/people/christopher.webp';
import megan from '../assets/people/megan.webp';
import sammanth from '../assets/people/sammanth.webp';
import andy from '../assets/people/andy.webp';
import emily from '../assets/people/emily.webp';
import pavel from '../assets/people/pavel.webp';
import sarah from '../assets/people/sarah.webp';
import jessica from '../assets/people/jessica.webp';
import type { Person, PersonId } from './types';

// Demo personas from the Figma file (all figures are placeholder data).
export const PEOPLE: Record<PersonId, Person> = {
  maxine: { id: 'maxine', first: 'Maxine', last: 'Schlein', handle: '@maxattack', photo: maxine, mutual: 8, global: 51, base: { w: 0, l: 0 } },
  sylvia: { id: 'sylvia', first: 'Sylvia', last: 'Lam', handle: '@sylvialam', photo: sylvia, mutual: 8, global: 63, base: { w: 0, l: 0 } },
  christopher: { id: 'christopher', first: 'Christopher', last: 'Taylor', handle: '@ctaylor', photo: christopher, mutual: 12, global: 210, base: { w: 11, l: 9 } },
  megan: { id: 'megan', first: 'Megan', last: 'Hasselblad', handle: '@megblad', photo: megan, mutual: 28, global: 97, base: { w: 41, l: 8 } },
  sammanth: { id: 'sammanth', first: 'Sammanth', last: 'Schubert', handle: '@sammanth', photo: sammanth, mutual: 0, global: 340, base: { w: 3, l: 6 } },
  andy: { id: 'andy', first: 'Andy', last: 'Madeline', handle: '@andym', photo: andy, mutual: 1, global: 158, base: { w: 9, l: 7 } },
  emily: { id: 'emily', first: 'Emily', last: 'Johnson', handle: '@emjay', photo: emily, mutual: 15, global: 74, base: { w: 33, l: 6 } },
  pavel: { id: 'pavel', first: 'Pavel', last: 'Dusatko', handle: '@pavel', photo: pavel, mutual: 3, global: 412, base: { w: 5, l: 12 } },
  sarah: { id: 'sarah', first: 'Sarah', last: 'Thompson', handle: '@sarah_t', photo: sarah, mutual: 6, global: 129, base: { w: 14, l: 6 } },
  jessica: { id: 'jessica', first: 'Jessica', last: 'Miller', handle: '@jessm', photo: jessica, mutual: 9, global: 188, base: { w: 8, l: 5 } },
};

export const person = (id: PersonId) => PEOPLE[id];
export const fullName = (id: PersonId) => `${PEOPLE[id].first} ${PEOPLE[id].last}`;
export const firstName = (id: PersonId) => PEOPLE[id].first;

/** Everyone a person can bet with, the other phone's owner first. */
export const friendsOf = (me: PersonId): PersonId[] =>
  (Object.keys(PEOPLE) as PersonId[])
    .filter((id) => id !== me)
    .sort((a, b) => Number(b === 'sylvia' || b === 'maxine') - Number(a === 'sylvia' || a === 'maxine'));
