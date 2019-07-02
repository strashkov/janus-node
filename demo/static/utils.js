export function throttle(original, delay) {
  let state = true;
  return function () {
    if (state) {
      original.apply(this, arguments);
      state = false;
      setTimeout(function () {
        state = true;
      }, delay);
    }
  };
}