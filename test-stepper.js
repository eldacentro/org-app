const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
let val = 120;
console.log(clamp(val + 1, 30, 730));
