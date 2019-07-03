const area = document.getElementById('debug');

export function debug(text) {
  area.value += `${text}\n\n`;
  area.scrollTop = area.scrollHeight;
}
export function clear() {
  area.value = '';
}