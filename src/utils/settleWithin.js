// Bound optional platform lookups so a result screen can still be displayed.
export function settleWithin(promise, milliseconds, fallback = null) {
 return new Promise(resolve => {
  const timer = setTimeout(() => resolve(fallback), milliseconds);
  Promise.resolve(promise).then(value => {clearTimeout(timer);resolve(value);}, () => {clearTimeout(timer);resolve(fallback);});
 });
}
