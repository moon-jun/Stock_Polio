import { collection, doc, increment, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export interface TrafficSummary {
  todayViews: number;
  weeklyViews: number;
}

export const seoulDate = (daysFromToday = 0) =>
  new Date(Date.now() + KST_OFFSET_MS + daysFromToday * DAY_MS).toISOString().slice(0, 10);

export function summarizeTraffic(entries: Array<{ date: string; views: number }>, today: string): TrafficSummary {
  const todayEntries = entries.filter(entry => entry.date === today);
  return {
    todayViews: todayEntries.reduce((sum, entry) => sum + entry.views, 0),
    weeklyViews: entries.reduce((sum, entry) => sum + entry.views, 0),
  };
}

export async function recordVisit() {
  const today = seoulDate();
  await setDoc(doc(db, 'traffic', today), {
    date: today,
    views: increment(1),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export function watchWeeklyTraffic(onChange: (summary: TrafficSummary) => void) {
  const today = seoulDate();
  return onSnapshot(
    query(collection(db, 'traffic'), where('date', '>=', seoulDate(-6))),
    snapshot => onChange(summarizeTraffic(snapshot.docs.map(item => ({
      date: String(item.data().date),
      views: Number(item.data().views) || 0,
    })), today)),
  );
}
