const x = 48;
try {
  [...x];
} catch (e) {
  console.log("SPREAD ERROR:", e.message);
}
try {
  for (const a of x) {}
} catch (e) {
  console.log("FOR OF ERROR:", e.message);
}
try {
  new Set(x);
} catch (e) {
  console.log("SET ERROR:", e.message);
}
